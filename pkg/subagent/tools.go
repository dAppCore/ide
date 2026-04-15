package subagent

import (
	"context"
	"net/http"
	"net/url"
	"regexp"
	"time"

	core "dappco.re/go/core"
	"dappco.re/go/core/ws"
	"github.com/gorilla/websocket"
	"github.com/modelcontextprotocol/go-sdk/mcp"

	"dappco.re/go/core/ide/pkg/config"
)

const (
	maxQuestionWaitSeconds = 300
	maxWatchTimeoutSeconds = 300
	maxWatchPollInterval   = 30
	maxWorkspaceIDLength   = 128
)

var workspaceIDPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$`)

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
	questionID := core.Sprintf("q-%d", time.Now().UTC().UnixNano())
	answerChannel := make(chan string, 1)
	s.appendQuestionChannel(questionID, answerChannel)
	defer s.deleteQuestionChannel(questionID)
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
	if events, completed, failed, ok := s.watchRelay(ctx, workspaceID, timeout); ok {
		return WatchOutput{Completed: completed, Failed: failed, Events: events}, nil
	}
	deadline := time.After(time.Duration(timeout) * time.Second)
	ticker := time.NewTicker(time.Duration(clampInt(input.PollInterval, 2, maxWatchPollInterval)) * time.Second)
	defer ticker.Stop()
	seen := 0
	collected := []Event{}
	for {
		events := s.collectEvents(workspaceID, seen)
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
	if channel := s.takeQuestionChannel(input.QuestionID); channel != nil {
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

func (s *Subsystem) handleDispatchGuided(ctx context.Context, _ *mcp.CallToolRequest, input DispatchGuidedInput) (*mcp.CallToolResult, DispatchGuidedOutput, error) {
	out, err := s.DispatchGuided(ctx, input)
	return nil, out, err
}

func (s *Subsystem) DispatchGuided(ctx context.Context, input DispatchGuidedInput) (DispatchGuidedOutput, error) {
	_ = ctx
	if !config.BoolValue(s.cfg.Enabled, true) {
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
	workspaceID, err := normalizeWorkspaceID(input.WorkspaceID)
	if err != nil {
		return DispatchGuidedOutput{Success: false, Reason: err.Error()}, err
	}
	if workspaceID == "" {
		workspaceID = core.Sprintf("workspace-%d", time.Now().UTC().UnixNano())
	}
	relayURL := core.Trim(input.RelayURL)
	if relayURL == "" {
		relayURL = s.cfg.Relay.URL()
	} else if err := validateRelayURL(relayURL); err != nil {
		return DispatchGuidedOutput{Success: false, Reason: err.Error()}, err
	}
	prompt := core.Sprintf("CORE_IDE_RELAY_URL=%s\nCORE_IDE_RELAY_TOKEN is injected by the launcher and must not be echoed.\nWORKSPACE_ID=%s\nDEFAULT_TEMPLATE=%s\nDEFAULT_AGENT=%s\n\nBefore each prompt cycle, read channel %s.\nWhen stuck, call subagent_ask and wait for an answer (up to %d seconds).\nEmit progress updates when non-trivial milestones complete.\n\nTask: %s", relayURL, workspaceID, template, agent, guideChannel(workspaceID), int(s.cfg.Timeouts.QuestionWaitDefault.Seconds()), core.Trim(input.Task))
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

func clampInt(value, fallback, max int) int {
	if value <= 0 {
		value = fallback
	}
	if value > max {
		return max
	}
	if value < 1 {
		return 1
	}
	return value
}

func (s *Subsystem) watchRelay(ctx context.Context, workspaceID string, timeout int) ([]Event, bool, bool, bool) {
	relayURL := core.Trim(s.cfg.Relay.URL())
	if relayURL == "" {
		return nil, false, false, false
	}
	headers := http.Header{}
	if token := core.Trim(s.relayToken); token != "" {
		headers.Set("Authorization", core.Concat("Bearer ", token))
	}
	conn, _, err := websocket.DefaultDialer.DialContext(ctx, relayURL, headers)
	if err != nil {
		return nil, false, false, false
	}
	defer conn.Close()

	for _, channel := range []string{
		progressChannel(workspaceID),
		questionChannel(workspaceID),
		statusChannel(workspaceID),
	} {
		if writeErr := conn.WriteJSON(ws.Message{Type: ws.TypeSubscribe, Data: channel, Timestamp: time.Now().UTC()}); writeErr != nil {
			return nil, false, false, false
		}
	}

	if timeout > 0 {
		_ = conn.SetReadDeadline(time.Now().Add(time.Duration(timeout) * time.Second))
	}
	events := []Event{}
	for {
		select {
		case <-ctx.Done():
			return events, false, true, true
		default:
		}
		var message ws.Message
		if err := conn.ReadJSON(&message); err != nil {
			if len(events) == 0 {
				return nil, false, false, false
			}
			return events, false, false, true
		}
		event, ok := eventFromRelayMessage(message)
		if !ok {
			continue
		}
		events = append(events, event)
		if event.Type != "status" {
			continue
		}
		switch core.Trim(event.Message) {
		case "completed":
			return events, true, false, true
		case "failed":
			return events, false, true, true
		}
	}
}

func eventFromRelayMessage(message ws.Message) (Event, bool) {
	rawType, ok := message.Data.(map[string]any)
	if !ok {
		return Event{}, false
	}
	eventType, _ := rawType["type"].(string)
	if core.Trim(eventType) == "" {
		return Event{}, false
	}
	event := Event{
		Type:      core.Trim(eventType),
		Channel:   core.Trim(message.Channel),
		CreatedAt: message.Timestamp.UTC(),
	}
	if messageText, ok := rawType["message"].(string); ok {
		event.Message = messageText
	}
	if event.Message == "" {
		if state, ok := rawType["state"].(string); ok {
			event.Message = state
		}
	}
	if questionID, ok := rawType["question_id"].(string); ok {
		event.QuestionID = questionID
	}
	return event, true
}

func normalizeWorkspaceID(value string) (string, error) {
	trimmed := core.Trim(value)
	if trimmed == "" {
		return "", nil
	}
	if len(trimmed) > maxWorkspaceIDLength || !workspaceIDPattern.MatchString(trimmed) {
		return "", core.E("ide.subagent.workspaceID", "invalid workspaceId", nil)
	}
	return trimmed, nil
}

func validateRelayURL(value string) error {
	parsed, err := url.Parse(core.Trim(value))
	if err != nil {
		return core.E("ide.subagent.relayURL", "invalid relay URL", err)
	}
	switch parsed.Scheme {
	case "ws", "wss", "http", "https":
	default:
		return core.E("ide.subagent.relayURL", "unsupported relay URL scheme", nil)
	}
	if parsed.Host == "" {
		return core.E("ide.subagent.relayURL", "relay URL host is required", nil)
	}
	return nil
}
