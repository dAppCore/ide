package subagent

import (
	"context"
	"time"

	core "dappco.re/go/core"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func (s *Subsystem) handleGuide(ctx context.Context, _ *mcp.CallToolRequest, input GuideInput) (*mcp.CallToolResult, GuideOutput, error) {
	out, err := s.guide(ctx, input)
	return nil, out, err
}

func (s *Subsystem) guide(ctx context.Context, input GuideInput) (GuideOutput, error) {
	_ = ctx
	if !s.cfg.Enabled {
		return GuideOutput{Delivered: false, Reason: "subagent is disabled"}, nil
	}
	if core.Trim(input.WorkspaceID) == "" {
		return GuideOutput{Delivered: false, Reason: "workspaceId is required"}, nil
	}
	message := GuidanceMessage{Type: "guidance", Role: "orchestrator", Message: input.Message, CreatedAt: time.Now().UTC()}
	channel := guideChannel(input.WorkspaceID)
	s.appendEvent(input.WorkspaceID, Event{Type: message.Type, Channel: channel, Message: message.Message, CreatedAt: message.CreatedAt})
	if s.hub == nil {
		return GuideOutput{Delivered: false, Reason: "no relay"}, nil
	}
	s.publish(channel, message)
	return GuideOutput{Delivered: true}, nil
}

func (s *Subsystem) handleAsk(ctx context.Context, _ *mcp.CallToolRequest, input AskInput) (*mcp.CallToolResult, AskOutput, error) {
	out, err := s.ask(ctx, input)
	return nil, out, err
}

func (s *Subsystem) ask(ctx context.Context, input AskInput) (AskOutput, error) {
	if !s.cfg.Enabled {
		return AskOutput{Reason: "subagent is disabled"}, nil
	}
	if core.Trim(input.WorkspaceID) == "" {
		return AskOutput{}, core.E("ide.subagent.ask", "workspaceId is required", nil)
	}
	if s.hub == nil {
		return AskOutput{Reason: "no relay"}, nil
	}
	waitSeconds := input.WaitSeconds
	if waitSeconds <= 0 {
		waitSeconds = int(s.cfg.Timeouts.QuestionWaitDefault.Seconds())
	}
	questionID := core.Sprintf("q-%d", time.Now().UTC().UnixNano())
	answerChannel := make(chan string, 1)
	s.appendQuestionChannel(questionID, answerChannel)
	message := QuestionMessage{Type: "question", Role: "subagent", QuestionID: questionID, Message: input.Question, CreatedAt: time.Now().UTC()}
	channel := questionChannel(input.WorkspaceID)
	s.appendEvent(input.WorkspaceID, Event{Type: message.Type, Channel: channel, Message: message.Message, QuestionID: questionID, CreatedAt: message.CreatedAt})
	s.publish(channel, message)
	timer := time.NewTimer(time.Duration(waitSeconds) * time.Second)
	defer timer.Stop()
	select {
	case answer := <-answerChannel:
		return AskOutput{Answer: answer}, nil
	case <-timer.C:
		return AskOutput{TimedOut: true}, nil
	case <-ctx.Done():
		return AskOutput{TimedOut: true, Reason: ctx.Err().Error()}, ctx.Err()
	}
}

func (s *Subsystem) handleProgress(ctx context.Context, _ *mcp.CallToolRequest, input ProgressInput) (*mcp.CallToolResult, ProgressOutput, error) {
	out, err := s.progress(ctx, input)
	return nil, out, err
}

func (s *Subsystem) progress(ctx context.Context, input ProgressInput) (ProgressOutput, error) {
	_ = ctx
	if !s.cfg.Enabled {
		return ProgressOutput{Delivered: false, Reason: "subagent is disabled"}, nil
	}
	if core.Trim(input.WorkspaceID) == "" {
		return ProgressOutput{}, core.E("ide.subagent.progress", "workspaceId is required", nil)
	}
	message := ProgressMessage{Type: "progress", Role: "subagent", Progress: input.Progress, Total: input.Total, Message: input.Message, CreatedAt: time.Now().UTC()}
	channel := progressChannel(input.WorkspaceID)
	s.appendEvent(input.WorkspaceID, Event{Type: message.Type, Channel: channel, Message: message.Message, CreatedAt: message.CreatedAt})
	if s.hub == nil {
		return ProgressOutput{Delivered: false, Reason: "no relay"}, nil
	}
	s.publish(channel, message)
	return ProgressOutput{Delivered: true}, nil
}

func (s *Subsystem) handleWatch(ctx context.Context, _ *mcp.CallToolRequest, input WatchInput) (*mcp.CallToolResult, WatchOutput, error) {
	out, err := s.watch(ctx, input)
	return nil, out, err
}

func (s *Subsystem) watch(ctx context.Context, input WatchInput) (WatchOutput, error) {
	if !s.cfg.Enabled {
		return WatchOutput{Reason: "subagent is disabled"}, nil
	}
	if core.Trim(input.WorkspaceID) == "" {
		return WatchOutput{Reason: "workspaceId is required"}, nil
	}
	timeout := input.Timeout
	if timeout <= 0 {
		timeout = 60
	}
	deadline := time.After(time.Duration(timeout) * time.Second)
	ticker := time.NewTicker(time.Duration(maxInt(input.PollInterval, 2)) * time.Second)
	defer ticker.Stop()
	seen := 0
	collected := []Event{}
	for {
		events := s.collectEvents(input.WorkspaceID, seen)
		if len(events) > 0 {
			collected = append(collected, events...)
			seen += len(events)
		}
		completed, failed := state(collected)
		if completed || failed {
			return WatchOutput{Completed: completed, Failed: failed, Events: collected}, nil
		}
		select {
		case <-ctx.Done():
			return WatchOutput{Failed: true, Events: collected, Reason: ctx.Err().Error()}, ctx.Err()
		case <-deadline:
			return WatchOutput{Events: collected, Reason: "timed out waiting for subagent events"}, nil
		case <-ticker.C:
		}
	}
}

func (s *Subsystem) handleAnswer(ctx context.Context, _ *mcp.CallToolRequest, input AnswerInput) (*mcp.CallToolResult, AnswerOutput, error) {
	out, err := s.answer(ctx, input)
	return nil, out, err
}

func (s *Subsystem) answer(ctx context.Context, input AnswerInput) (AnswerOutput, error) {
	_ = ctx
	if !s.cfg.Enabled {
		return AnswerOutput{Delivered: false, Reason: "subagent is disabled"}, nil
	}
	if core.Trim(input.WorkspaceID) == "" {
		return AnswerOutput{}, core.E("ide.subagent.answer", "workspaceId is required", nil)
	}
	if channel := s.takeQuestionChannel(input.QuestionID); channel != nil {
		select {
		case channel <- input.Answer:
		default:
		}
	}
	message := AnswerMessage{Type: "answer", Role: "orchestrator", QuestionID: input.QuestionID, Message: input.Answer, CreatedAt: time.Now().UTC()}
	channelName := answerChannel(input.WorkspaceID)
	s.appendEvent(input.WorkspaceID, Event{Type: message.Type, Channel: channelName, Message: message.Message, QuestionID: input.QuestionID, CreatedAt: message.CreatedAt})
	if s.hub == nil {
		return AnswerOutput{Delivered: false, Reason: "no relay"}, nil
	}
	s.publish(channelName, message)
	return AnswerOutput{Delivered: true}, nil
}

func (s *Subsystem) handleDispatchGuided(ctx context.Context, _ *mcp.CallToolRequest, input DispatchGuidedInput) (*mcp.CallToolResult, DispatchGuidedOutput, error) {
	out, err := s.DispatchGuided(ctx, input)
	return nil, out, err
}

func (s *Subsystem) DispatchGuided(ctx context.Context, input DispatchGuidedInput) (DispatchGuidedOutput, error) {
	_ = ctx
	if !s.cfg.Enabled {
		return DispatchGuidedOutput{Success: false, Reason: "subagent is disabled"}, nil
	}
	if core.Trim(input.Repo) == "" {
		return DispatchGuidedOutput{Success: false, Reason: "repo is required"}, core.E("ide.subagent.dispatch_guided", "repo is required", nil)
	}
	if core.Trim(input.Task) == "" {
		return DispatchGuidedOutput{Success: false, Reason: "task is required"}, core.E("ide.subagent.dispatch_guided", "task is required", nil)
	}
	agent := core.Trim(input.Agent)
	if agent == "" {
		agent = s.cfg.Dispatch.DefaultAgent
	}
	template := core.Trim(input.Template)
	if template == "" {
		template = s.cfg.Dispatch.DefaultTemplate
	}
	workspaceID := core.Trim(input.WorkspaceID)
	if workspaceID == "" {
		workspaceID = core.Sprintf("%s-%d", core.Replace(core.Lower(input.Repo), "/", "-"), time.Now().UTC().UnixNano())
	}
	relayURL := core.Trim(input.RelayURL)
	if relayURL == "" {
		relayURL = s.cfg.Relay.URL()
	}
	prompt := core.Sprintf("CORE_IDE_RELAY_URL=%s\nCORE_IDE_RELAY_TOKEN=%s\nWORKSPACE_ID=%s\nDEFAULT_TEMPLATE=%s\nDEFAULT_AGENT=%s\n\nBefore each prompt cycle, read channel %s.\nWhen stuck, call subagent_ask and wait for an answer (up to %d seconds).\nEmit progress updates when non-trivial milestones complete.\n\nTask: %s", relayURL, core.Trim(input.RelayToken), workspaceID, template, agent, guideChannel(workspaceID), int(s.cfg.Timeouts.QuestionWaitDefault.Seconds()), core.Trim(input.Task))
	if s.hub == nil {
		return DispatchGuidedOutput{Success: true, Delivered: false, WorkspaceID: workspaceID, Agent: agent, Prompt: prompt, Reason: "no relay"}, nil
	}
	status := StatusMessage{Type: "status", State: "running", CreatedAt: time.Now().UTC()}
	statusChannel := statusChannel(workspaceID)
	s.appendEvent(workspaceID, Event{Type: status.Type, Channel: statusChannel, Message: status.State, CreatedAt: status.CreatedAt})
	s.publish(statusChannel, status)
	s.publish(guideChannel(workspaceID), GuidanceMessage{Type: "guidance", Role: "orchestrator", Message: prompt, CreatedAt: time.Now().UTC()})
	return DispatchGuidedOutput{Success: true, Delivered: true, WorkspaceID: workspaceID, Agent: agent, Prompt: prompt}, nil
}

func state(events []Event) (bool, bool) {
	for index := len(events) - 1; index >= 0; index-- {
		if events[index].Type != "status" {
			continue
		}
		switch core.Trim(events[index].Message) {
		case "completed":
			return true, false
		case "failed":
			return false, true
		}
	}
	return false, false
}

func maxInt(value int, floor int) int {
	if value < floor {
		return floor
	}
	return value
}
