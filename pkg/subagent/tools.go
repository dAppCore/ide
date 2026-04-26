package subagent

import (
	"context"
	"time"

	core "dappco.re/go/core"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	"github.com/modelcontextprotocol/go-sdk/mcp"

	"dappco.re/go/ide/pkg/config"
)

const (
	maxQuestionWaitSeconds = 300
	maxWatchTimeoutSeconds = 300
	maxWatchPollInterval   = 30
	maxWorkspaceIDLength   = 128
	maxRelayMessageBytes   = 1 << 20
)

func (s *Subsystem) registerTools(svc *coremcp.Service) {
	server := svc.Server()
	coremcp.AddToolRecorded(svc, server, "subagent", &mcp.Tool{Name: "subagent_guide", Description: "Send guidance to a subagent workspace."}, s.handleGuide)
	coremcp.AddToolRecorded(svc, server, "subagent", &mcp.Tool{Name: "subagent_ask", Description: "Ask the orchestrator a question and wait for an answer."}, s.handleAsk)
	coremcp.AddToolRecorded(svc, server, "subagent", &mcp.Tool{Name: "subagent_progress", Description: "Record progress for a subagent workspace."}, s.handleProgress)
	coremcp.AddToolRecorded(svc, server, "subagent", &mcp.Tool{Name: "subagent_watch", Description: "Watch recent subagent events for a workspace."}, s.handleWatch)
	coremcp.AddToolRecorded(svc, server, "subagent", &mcp.Tool{Name: "subagent_answer", Description: "Answer a pending subagent question."}, s.handleAnswer)
	coremcp.AddToolRecorded(svc, server, "subagent", &mcp.Tool{Name: "subagent_dispatch_guided", Description: "Dispatch a guided subagent workspace with relay wiring."}, s.handleDispatchGuided)
}

func (s *Subsystem) handleGuide(ctx context.Context, _ *mcp.CallToolRequest, input GuideInput) (*mcp.CallToolResult, GuideOutput, error) {
	out, err := s.guide(ctx, input)
	return nil, out, err
}

func (s *Subsystem) guide(ctx context.Context, input GuideInput) (GuideOutput, error) {
	_ = ctx
	if !config.BoolValue(s.cfg.Enabled, true) {
		return GuideOutput{Delivered: false, Reason: "subagent is disabled"}, nil
	}
	workspaceID, err := normalizeWorkspaceID(input.WorkspaceID)
	if err != nil {
		return GuideOutput{}, err
	}
	if workspaceID == "" {
		return GuideOutput{Delivered: false, Reason: "workspaceId is required"}, nil
	}
	message := GuidanceMessage{Type: "guidance", Role: "orchestrator", Message: input.Message, CreatedAt: time.Now().UTC()}
	channel := guideChannel(workspaceID)
	s.appendEvent(workspaceID, Event{Type: message.Type, Channel: channel, Message: message.Message, CreatedAt: message.CreatedAt})
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
	if !config.BoolValue(s.cfg.Enabled, true) {
		return AskOutput{Reason: "subagent is disabled"}, nil
	}
	workspaceID, err := normalizeWorkspaceID(input.WorkspaceID)
	if err != nil {
		return AskOutput{}, err
	}
	if workspaceID == "" {
		return AskOutput{}, core.E("ide.subagent.ask", "workspaceId is required", nil)
	}
	if s.hub == nil {
		return AskOutput{Reason: "no relay"}, nil
	}
	waitSeconds := clampInt(input.WaitSeconds, int(s.cfg.Timeouts.QuestionWaitDefault.Seconds()), maxQuestionWaitSeconds)
	questionID, err := newQuestionID()
	if err != nil {
		return AskOutput{}, err
	}
	answerChannel := make(chan string, 1)
	s.appendQuestionChannel(workspaceID, questionID, answerChannel)
	defer s.deleteQuestionChannel(workspaceID, questionID)
	message := QuestionMessage{Type: "question", Role: "subagent", QuestionID: questionID, Message: input.Question, CreatedAt: time.Now().UTC()}
	channel := questionChannel(workspaceID)
	s.appendEvent(workspaceID, Event{Type: message.Type, Channel: channel, Message: message.Message, QuestionID: questionID, CreatedAt: message.CreatedAt})
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

func (s *Subsystem) handleProgress(ctx context.Context, req *mcp.CallToolRequest, input ProgressInput) (*mcp.CallToolResult, ProgressOutput, error) {
	if req != nil && req.Session != nil && req.Params != nil {
		if token := req.Params.GetProgressToken(); token != nil {
			_ = req.Session.NotifyProgress(ctx, &mcp.ProgressNotificationParams{
				ProgressToken: token,
				Progress:      input.Progress,
				Total:         input.Total,
				Message:       input.Message,
			})
		}
	}
	out, err := s.progress(ctx, input)
	return nil, out, err
}

func (s *Subsystem) progress(ctx context.Context, input ProgressInput) (ProgressOutput, error) {
	_ = ctx
	if !config.BoolValue(s.cfg.Enabled, true) {
		return ProgressOutput{Delivered: false, Reason: "subagent is disabled"}, nil
	}
	workspaceID, err := normalizeWorkspaceID(input.WorkspaceID)
	if err != nil {
		return ProgressOutput{}, err
	}
	if workspaceID == "" {
		return ProgressOutput{}, core.E("ide.subagent.progress", "workspaceId is required", nil)
	}
	message := ProgressMessage{Type: "progress", Role: "subagent", Progress: input.Progress, Total: input.Total, Message: input.Message, CreatedAt: time.Now().UTC()}
	channel := progressChannel(workspaceID)
	s.appendEvent(workspaceID, Event{Type: message.Type, Channel: channel, Message: message.Message, CreatedAt: message.CreatedAt})
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
	if !config.BoolValue(s.cfg.Enabled, true) {
		return WatchOutput{Reason: "subagent is disabled"}, nil
	}
	workspaceID, err := normalizeWorkspaceID(input.WorkspaceID)
	if err != nil {
		return WatchOutput{}, err
	}
	if workspaceID == "" {
		return WatchOutput{Reason: "workspaceId is required"}, nil
	}
	timeout := clampInt(input.Timeout, int(s.cfg.Timeouts.QuestionWaitDefault.Seconds()), maxWatchTimeoutSeconds)
	pollInterval := clampInt(input.PollInterval, 2, maxWatchPollInterval)
	if events, completed, failed, ok := s.watchRelay(ctx, workspaceID, timeout); ok {
		if completed || failed {
			return WatchOutput{Completed: completed, Failed: failed, Events: events}, nil
		}
		if changed, agenticCompleted, agenticFailed := s.syncAgenticEvents(ctx, workspaceID); changed || agenticCompleted || agenticFailed {
			events = append(events, s.collectEvents(workspaceID, 0)...)
			return WatchOutput{Completed: agenticCompleted, Failed: agenticFailed, Events: dedupeEvents(events)}, nil
		}
	}
	if output, ok := s.watchAgentic(ctx, workspaceID, pollInterval, timeout); ok {
		return output, nil
	}
	deadline := time.After(time.Duration(timeout) * time.Second)
	ticker := time.NewTicker(time.Duration(pollInterval) * time.Second)
	defer ticker.Stop()
	seen := 0
	collected := []Event{}
	for {
		events := s.collectEvents(workspaceID, seen)
		if len(events) > 0 {
			collected = append(collected, events...)
			seen += len(events)
		}
		if synced, completed, failed := s.syncAgenticEvents(ctx, workspaceID); synced {
			events = s.collectEvents(workspaceID, seen)
			if len(events) > 0 {
				collected = append(collected, events...)
				seen += len(events)
			}
			if completed || failed {
				return WatchOutput{Completed: completed, Failed: failed, Events: collected}, nil
			}
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
	if !config.BoolValue(s.cfg.Enabled, true) {
		return AnswerOutput{Delivered: false, Reason: "subagent is disabled"}, nil
	}
	workspaceID, err := normalizeWorkspaceID(input.WorkspaceID)
	if err != nil {
		return AnswerOutput{}, err
	}
	if workspaceID == "" {
		return AnswerOutput{}, core.E("ide.subagent.answer", "workspaceId is required", nil)
	}
	if core.Trim(input.QuestionID) == "" {
		return AnswerOutput{}, core.E("ide.subagent.answer", "questionId is required", nil)
	}
	if channel := s.takeQuestionChannel(workspaceID, input.QuestionID); channel != nil {
		select {
		case channel <- input.Answer:
		default:
		}
	}
	message := AnswerMessage{Type: "answer", Role: "orchestrator", QuestionID: input.QuestionID, Message: input.Answer, CreatedAt: time.Now().UTC()}
	channelName := answerChannel(workspaceID)
	s.appendEvent(workspaceID, Event{Type: message.Type, Channel: channelName, Message: message.Message, QuestionID: input.QuestionID, CreatedAt: message.CreatedAt})
	if s.hub == nil {
		return AnswerOutput{Delivered: false, Reason: "no relay"}, nil
	}
	s.publish(channelName, message)
	return AnswerOutput{Delivered: true}, nil
}
