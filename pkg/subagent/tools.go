package subagent

import (
	"context"
	"time"

	core "dappco.re/go/core"
	"dappco.re/go/core/ws"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func (s *Subsystem) handleGuide(ctx context.Context, _ *mcp.CallToolRequest, input GuideInput) (*mcp.CallToolResult, GuideOutput, error) {
	out, err := s.guide(ctx, input)
	return nil, out, err
}

func (s *Subsystem) guide(ctx context.Context, input GuideInput) (GuideOutput, error) {
	_ = ctx
	if core.Trim(input.WorkspaceID) == "" {
		return GuideOutput{Delivered: false, Reason: "workspaceId is required"}, nil
	}
	s.append(input.WorkspaceID, Event{Type: "guidance", Channel: core.Concat("subagent:", input.WorkspaceID, ":guide"), Message: input.Message, CreatedAt: time.Now().UTC()})
	if s.hub == nil {
		return GuideOutput{Delivered: false, Reason: "no relay"}, nil
	}
	_ = s.hub.SendToChannel(core.Concat("subagent:", input.WorkspaceID, ":guide"), ws.Message{Type: ws.TypeEvent, Data: map[string]any{"message": input.Message}})
	return GuideOutput{Delivered: true}, nil
}

func (s *Subsystem) handleAsk(ctx context.Context, _ *mcp.CallToolRequest, input AskInput) (*mcp.CallToolResult, AskOutput, error) {
	out, err := s.ask(ctx, input)
	return nil, out, err
}

func (s *Subsystem) ask(ctx context.Context, input AskInput) (AskOutput, error) {
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
	s.answers[questionID] = answerChannel
	s.append(input.WorkspaceID, Event{Type: "question", Channel: core.Concat("subagent:", input.WorkspaceID, ":question"), Message: input.Question, QuestionID: questionID, CreatedAt: time.Now().UTC()})
	_ = s.hub.SendToChannel(core.Concat("subagent:", input.WorkspaceID, ":question"), ws.Message{Type: ws.TypeEvent, Data: map[string]any{"question_id": questionID, "message": input.Question}})
	timer := time.NewTimer(time.Duration(waitSeconds) * time.Second)
	defer timer.Stop()
	select {
	case answer := <-answerChannel:
		delete(s.answers, questionID)
		return AskOutput{Answer: answer}, nil
	case <-timer.C:
		delete(s.answers, questionID)
		return AskOutput{TimedOut: true}, nil
	case <-ctx.Done():
		delete(s.answers, questionID)
		return AskOutput{TimedOut: true, Reason: ctx.Err().Error()}, ctx.Err()
	}
}

func (s *Subsystem) handleProgress(ctx context.Context, _ *mcp.CallToolRequest, input ProgressInput) (*mcp.CallToolResult, ProgressOutput, error) {
	out, err := s.progress(ctx, input)
	return nil, out, err
}

func (s *Subsystem) progress(ctx context.Context, input ProgressInput) (ProgressOutput, error) {
	_ = ctx
	if core.Trim(input.WorkspaceID) == "" {
		return ProgressOutput{}, core.E("ide.subagent.progress", "workspaceId is required", nil)
	}
	s.append(input.WorkspaceID, Event{Type: "progress", Channel: core.Concat("subagent:", input.WorkspaceID, ":progress"), Message: input.Message, CreatedAt: time.Now().UTC()})
	if s.hub == nil {
		return ProgressOutput{Delivered: false, Reason: "no relay"}, nil
	}
	_ = s.hub.SendToChannel(core.Concat("subagent:", input.WorkspaceID, ":progress"), ws.Message{Type: ws.TypeEvent, Data: map[string]any{"progress": input.Progress, "total": input.Total, "message": input.Message}})
	return ProgressOutput{Delivered: true}, nil
}

func (s *Subsystem) handleWatch(ctx context.Context, _ *mcp.CallToolRequest, input WatchInput) (*mcp.CallToolResult, WatchOutput, error) {
	out, err := s.watch(ctx, input)
	return nil, out, err
}

func (s *Subsystem) watch(ctx context.Context, input WatchInput) (WatchOutput, error) {
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
		events := s.events[input.WorkspaceID]
		if len(events) > seen {
			collected = append(collected, events[seen:]...)
			seen = len(events)
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
	if core.Trim(input.WorkspaceID) == "" {
		return AnswerOutput{}, core.E("ide.subagent.answer", "workspaceId is required", nil)
	}
	if channel, ok := s.answers[input.QuestionID]; ok {
		select {
		case channel <- input.Answer:
		default:
		}
	}
	s.append(input.WorkspaceID, Event{Type: "answer", Channel: core.Concat("subagent:", input.WorkspaceID, ":answer"), Message: input.Answer, QuestionID: input.QuestionID, CreatedAt: time.Now().UTC()})
	if s.hub == nil {
		return AnswerOutput{Delivered: false, Reason: "no relay"}, nil
	}
	_ = s.hub.SendToChannel(core.Concat("subagent:", input.WorkspaceID, ":answer"), ws.Message{Type: ws.TypeEvent, Data: map[string]any{"question_id": input.QuestionID, "message": input.Answer}})
	return AnswerOutput{Delivered: true}, nil
}

func (s *Subsystem) handleDispatchGuided(ctx context.Context, _ *mcp.CallToolRequest, input DispatchGuidedInput) (*mcp.CallToolResult, DispatchGuidedOutput, error) {
	out, err := s.DispatchGuided(ctx, input)
	return nil, out, err
}

func (s *Subsystem) DispatchGuided(ctx context.Context, input DispatchGuidedInput) (DispatchGuidedOutput, error) {
	_ = ctx
	if core.Trim(input.Repo) == "" {
		return DispatchGuidedOutput{Success: false, Reason: "repo is required"}, core.E("ide.subagent.dispatch_guided", "repo is required", nil)
	}
	if core.Trim(input.Task) == "" {
		return DispatchGuidedOutput{Success: false, Reason: "task is required"}, core.E("ide.subagent.dispatch_guided", "task is required", nil)
	}
	workspaceID := core.Trim(input.WorkspaceID)
	if workspaceID == "" {
		workspaceID = core.Sprintf("%s-%d", core.Replace(core.Lower(input.Repo), "/", "-"), time.Now().UTC().UnixNano())
	}
	prompt := core.Sprintf("Relay URL: %s\nRelay Token: %s\nWorkspace ID: %s\n\nBefore each prompt cycle, read channel subagent:%s:guide.\nWhen stuck, call subagent_ask and wait for an answer (up to 60s).\nEmit progress updates when non-trivial milestones complete.\n\nTask: %s", core.Trim(input.RelayURL), core.Trim(input.RelayToken), workspaceID, workspaceID, core.Trim(input.Task))
	if s.hub == nil {
		return DispatchGuidedOutput{Success: true, Delivered: false, WorkspaceID: workspaceID, Agent: input.Agent, Prompt: prompt, Reason: "no relay"}, nil
	}
	s.append(workspaceID, Event{Type: "status", Channel: core.Concat("subagent:", workspaceID, ":status"), Message: "running", CreatedAt: time.Now().UTC()})
	_ = s.hub.SendToChannel(core.Concat("subagent:", workspaceID, ":status"), ws.Message{Type: ws.TypeEvent, Data: map[string]any{"state": "running", "workspace": workspaceID, "repo": input.Repo, "agent": input.Agent}})
	_ = s.hub.SendToChannel(core.Concat("subagent:", workspaceID, ":guide"), ws.Message{Type: ws.TypeEvent, Data: map[string]any{"message": prompt}})
	return DispatchGuidedOutput{Success: true, Delivered: true, WorkspaceID: workspaceID, Agent: input.Agent, Prompt: prompt}, nil
}

func (s *Subsystem) append(workspaceID string, event Event) {
	s.events[workspaceID] = append(s.events[workspaceID], event)
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
