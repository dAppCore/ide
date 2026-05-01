// SPDX-License-Identifier: EUPL-1.2

package subagent

import (
	"context"
	"net"
	"net/http"
	"net/url"
	"time"

	core "dappco.re/go"
	mcpagentic "dappco.re/go/mcp/pkg/mcp/agentic"
	"dappco.re/go/ws"
	"github.com/gorilla/websocket"
)

var agenticWatchCall = func(context.Context, string, int, int) (mcpagentic.WatchOutput, error) {
	return mcpagentic.WatchOutput{}, nil
}

func normalizeWorkspaceID(
	value string,
) (string, error) {
	workspaceID := core.Trim(value)
	if len(workspaceID) > maxWorkspaceIDLength {
		return "", core.E("ide.subagent.workspace", "workspaceId is too long", nil)
	}
	if core.Contains(workspaceID, "/") || core.Contains(workspaceID, "\\") || core.Contains(workspaceID, "..") {
		return "", core.E("ide.subagent.workspace", "workspaceId is invalid", nil)
	}
	return workspaceID, nil
}

func newWorkspaceID() (
	string,
	error,
) {
	return newRandomID("ws")
}

func newQuestionID() (
	string,
	error,
) {
	return newRandomID("q")
}

func clampInt(value int, fallback int, max int) int {
	if value <= 0 {
		value = fallback
	}
	if max > 0 && value > max {
		return max
	}
	return value
}

func normalizeCursor(value int) int {
	if value < 0 {
		return 0
	}
	return value
}

func (s *Subsystem) relayAvailable() bool {
	if s == nil {
		return false
	}
	return s.relayAvailableForURL(s.cfg.Relay.URL())
}

func (s *Subsystem) relayAvailableForURL(relayURL string) bool {
	if s == nil || s.hub == nil || core.Trim(s.relayToken) == "" {
		return false
	}
	_, err := canonicalRelayURL(relayURL)
	return err == nil
}

func canonicalRelayURL(
	value string,
) (string, error) {
	parsed, err := parseRelayURL(value)
	if err != nil {
		return "", err
	}
	switch parsed.Scheme {
	case "http":
		parsed.Scheme = "ws"
	case "https":
		parsed.Scheme = "wss"
	}
	return parsed.String(), nil
}

func validateRelayURL(
	value string,
) error {
	_, err := parseRelayURL(value)
	return err
}

func parseRelayURL(
	value string,
) (*url.URL, error) {
	raw := core.Trim(value)
	if raw == "" {
		return nil, core.E("ide.subagent.relay", "relay URL is required", nil)
	}
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return nil, core.E("ide.subagent.relay", "invalid relay URL", err)
	}
	switch parsed.Scheme {
	case "http", "https", "ws", "wss":
	default:
		return nil, core.E("ide.subagent.relay", "unsupported relay URL scheme", nil)
	}
	if parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" {
		return nil, core.E("ide.subagent.relay", "relay URL must not include credentials, query, or fragment", nil)
	}
	host := parsed.Hostname()
	if !isRelayLoopbackHost(host) {
		return nil, core.E("ide.subagent.relay", "relay URL must use localhost or loopback", nil)
	}
	return parsed, nil
}

func isRelayLoopbackHost(host string) bool {
	host = core.Trim(host)
	if host == "localhost" {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}

func (s *Subsystem) watchRelay(ctx context.Context, workspaceID string, timeout int) ([]Event, bool, bool, bool) {
	if s == nil || core.Trim(s.relayToken) == "" {
		return nil, false, false, false
	}
	relayURL, err := canonicalRelayURL(s.cfg.Relay.URL())
	if err != nil {
		return nil, false, false, false
	}
	header := http.Header{}
	header.Set("Authorization", core.Concat("Bearer ", s.relayToken))
	conn, _, err := websocket.DefaultDialer.DialContext(ctx, relayURL, header)
	if err != nil {
		return nil, false, false, false
	}
	defer func() {
		if cerr := conn.Close(); cerr != nil { _ = cerr }
	}()

	for _, channel := range []string{statusChannel(workspaceID), progressChannel(workspaceID), questionChannel(workspaceID), answerChannel(workspaceID)} {
		if err := conn.WriteJSON(ws.Message{Type: ws.TypeSubscribe, Channel: channel, Timestamp: time.Now().UTC()}); err != nil {
			return nil, false, false, false
		}
	}

	deadline := time.Now().Add(time.Duration(timeout) * time.Second)
	events := []Event{}
	for {
		if err := conn.SetReadDeadline(deadline); err != nil {
			return events, false, false, len(events) > 0
		}
		var message ws.Message
		if err := conn.ReadJSON(&message); err != nil {
			return events, false, false, len(events) > 0
		}
		event, ok := eventFromRelayMessage(message)
		if !ok {
			continue
		}
		event = s.appendEvent(workspaceID, event)
		events = append(events, event)
		completed, failed := state(events)
		if completed || failed {
			return events, completed, failed, true
		}
	}
}

func (s *Subsystem) watchAgentic(ctx context.Context, workspaceID string, pollInterval int, timeout int) (WatchOutput, bool) {
	ref := s.agenticWorkspace(workspaceID)
	if core.Trim(ref.Name) == "" {
		return WatchOutput{}, false
	}
	out, err := agenticWatchCall(ctx, ref.Name, pollInterval, timeout)
	if err != nil || !out.Success {
		return WatchOutput{}, false
	}
	return s.watchOutputFromAgentic(workspaceID, out), true
}

func (s *Subsystem) syncAgenticEvents(ctx context.Context, workspaceID string) (bool, bool, bool) {
	ref := s.agenticWorkspace(workspaceID)
	if core.Trim(ref.Name) == "" {
		return false, false, false
	}
	out, err := agenticWatchCall(ctx, ref.Name, 1, 1)
	if err != nil || !out.Success {
		return false, false, false
	}
	output := s.watchOutputFromAgentic(workspaceID, out)
	return len(output.Events) > 0, output.Completed, output.Failed
}

func (s *Subsystem) watchOutputFromAgentic(workspaceID string, out mcpagentic.WatchOutput) WatchOutput {
	completed := false
	failed := false
	for _, result := range out.Completed {
		message := terminalAgenticStatus(result.Status, "completed")
		s.syncAgenticState(workspaceID, message, "")
		completed = true
	}
	for _, result := range out.Failed {
		message := terminalAgenticStatus(result.Status, "failed")
		s.syncAgenticState(workspaceID, message, "")
		failed = true
	}
	snapshot := s.watchSnapshot(workspaceID, 0, defaultWatchEventLimit, "")
	snapshot.Completed = snapshot.Completed || completed
	snapshot.Failed = snapshot.Failed || failed
	return snapshot
}

func terminalAgenticStatus(value string, fallback string) string {
	value = core.Trim(value)
	if value == "" {
		return fallback
	}
	return value
}

func eventFromRelayMessage(message ws.Message) (Event, bool) {
	data, ok := message.Data.(map[string]any)
	if !ok {
		return Event{}, false
	}
	eventType, _ := data["type"].(string)
	text, _ := data["message"].(string)
	if text == "" {
		text, _ = data["state"].(string)
	}
	questionID, _ := data["question_id"].(string)
	if questionID == "" {
		questionID, _ = data["questionId"].(string)
	}
	eventType = core.Trim(eventType)
	text = core.Trim(text)
	if eventType == "" || text == "" {
		return Event{}, false
	}
	createdAt := message.Timestamp
	if createdAt.IsZero() {
		createdAt = time.Now().UTC()
	}
	return Event{Type: eventType, Channel: message.Channel, Message: text, QuestionID: questionID, CreatedAt: createdAt}, true
}

func dedupeEvents(events []Event) []Event {
	if events == nil {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]Event, 0, len(events))
	for _, event := range events {
		key := core.JSONMarshalString(event)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, event)
	}
	return out
}

func state(events []Event) (bool, bool) {
	for _, event := range events {
		completed, failed := terminalState(event.Message)
		if completed || failed {
			return completed, failed
		}
	}
	return false, false
}

func terminalState(value string) (bool, bool) {
	switch core.Trim(value) {
	case "completed", "merged", "ready-for-review":
		return true, false
	case "failed", "blocked", "timeout":
		return false, true
	default:
		return false, false
	}
}

var _ = validateRelayURL
var _ = (*Subsystem).collectEvents
var _ = dedupeEvents
