package subagent

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"

	"dappco.re/go/ide/pkg/config"
	"dappco.re/go/ws"
)

type testAuthenticator struct{}

func (testAuthenticator) Authenticate(r *http.Request) ws.AuthResult {
	if r.Header.Get("Authorization") != "Bearer good-token" {
		return ws.AuthResult{Error: errors.New("expired token")}
	}
	return ws.AuthResult{Valid: true}
}

func TestRelay_Route_Good(t *testing.T) {
	cases := map[string]func(string) string{
		"guide":    guideChannel,
		"question": questionChannel,
		"answer":   answerChannel,
		"progress": progressChannel,
		"status":   statusChannel,
	}
	for label, fn := range cases {
		if got := fn("ws-1"); !strings.HasPrefix(got, "subagent:ws-1:") || !strings.Contains(got, label) {
			t.Fatalf("unexpected channel for %s: %q", label, got)
		}
	}
}

func TestRelay_Route_Bad(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	if channel := subsystem.takeQuestionChannel("missing", "q1"); channel != nil {
		t.Fatalf("expected missing question channel to be nil, got %#v", channel)
	}
}

func TestRelay_Route_Ugly(t *testing.T) {
	hub := ws.NewHubWithConfig(ws.HubConfig{
		Authenticator: testAuthenticator{},
	})
	server := httptest.NewServer(http.HandlerFunc(hub.HandleWebSocket))
	defer server.Close()
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Subagent.Relay.Addr = server.URL
	cfg.Ide.Subagent.Relay.Path = "/"
	subsystem := New(cfg.Ide.Subagent, hub, "expired-token")
	if _, _, _, ok := subsystem.watchRelay(context.Background(), "ws-1", 1); ok {
		t.Fatal("expected relay watch to reject expired token")
	}
}

func TestRelay_QuestionChannel_Ugly(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	channel := make(chan string, 1)
	subsystem.appendQuestionChannel("ws-1", "q1", channel)
	if got := subsystem.takeQuestionChannel("ws-2", "q1"); got != nil {
		t.Fatalf("expected workspace isolation, got %#v", got)
	}
	if got := subsystem.takeQuestionChannel("ws-1", "q1"); got == nil {
		t.Fatal("expected matching workspace question channel")
	}
}

func TestRelay_DeleteQuestionChannel_Good(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	channel := make(chan string, 1)
	subsystem.appendQuestionChannel("ws-1", "q1", channel)
	subsystem.deleteQuestionChannel("ws-1", "q1")
	if got := subsystem.takeQuestionChannel("ws-1", "q1"); got != nil {
		t.Fatalf("expected deleted question channel, got %#v", got)
	}
}

func TestRelay_Publish_Good(t *testing.T) {
	subsystem := &Subsystem{}
	subsystem.publish("subagent:ws-1:guide", GuidanceMessage{Type: "guidance", Message: "focus"})
}

func TestRelay_EventFromRelayMessage_Good(t *testing.T) {
	cases := []struct {
		name     string
		message  ws.Message
		expected Event
	}{
		{
			name: "message field",
			message: ws.Message{
				Channel:   "subagent:ws-1:guide",
				Timestamp: time.Unix(0, 0).UTC(),
				Data: map[string]any{
					"type":        "guidance",
					"message":     "focus",
					"question_id": "q1",
				},
			},
			expected: Event{Type: "guidance", Channel: "subagent:ws-1:guide", Message: "focus", QuestionID: "q1", CreatedAt: time.Unix(0, 0).UTC()},
		},
		{
			name: "state fallback",
			message: ws.Message{
				Channel:   "subagent:ws-1:status",
				Timestamp: time.Unix(1, 0).UTC(),
				Data: map[string]any{
					"type":  "status",
					"state": "blocked",
				},
			},
			expected: Event{Type: "status", Channel: "subagent:ws-1:status", Message: "blocked", CreatedAt: time.Unix(1, 0).UTC()},
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			event, ok := eventFromRelayMessage(tc.message)
			if !ok {
				t.Fatal("expected relay message to decode")
			}
			if event.Type != tc.expected.Type || event.Channel != tc.expected.Channel || event.Message != tc.expected.Message || event.QuestionID != tc.expected.QuestionID || !event.CreatedAt.Equal(tc.expected.CreatedAt) {
				t.Fatalf("unexpected event %#v", event)
			}
		})
	}
}

func TestRelay_EventFromRelayMessage_Bad(t *testing.T) {
	if _, ok := eventFromRelayMessage(ws.Message{Data: "not-a-map"}); ok {
		t.Fatal("expected malformed relay message to be ignored")
	}
}

func TestRelay_WatchRelay_Good(t *testing.T) {
	upgrader := websocket.Upgrader{CheckOrigin: func(*http.Request) bool { return true }}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}
		defer conn.Close()
		for i := 0; i < 3; i++ {
			var msg ws.Message
			if err := conn.ReadJSON(&msg); err != nil {
				return
			}
		}
		_ = conn.WriteJSON(ws.Message{
			Channel:   statusChannel("ws-1"),
			Timestamp: time.Unix(2, 0).UTC(),
			Data: map[string]any{
				"type":  "status",
				"state": "completed",
			},
		})
	}))
	defer server.Close()

	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Subagent.Relay.Addr = server.URL
	cfg.Ide.Subagent.Relay.Path = "/"
	subsystem := New(cfg.Ide.Subagent, nil, "relay-token")

	events, completed, failed, ok := subsystem.watchRelay(context.Background(), "ws-1", 1)
	if !ok || !completed || failed {
		t.Fatalf("expected completed relay watch, got events=%#v completed=%v failed=%v ok=%v", events, completed, failed, ok)
	}
	if len(events) == 0 || events[len(events)-1].Type != "status" || events[len(events)-1].Message != "completed" {
		t.Fatalf("expected completed status event, got %#v", events)
	}
}

func TestRelay_SyncAgenticState_Good(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	if !subsystem.syncAgenticState("ws-1", "running", "why") {
		t.Fatal("expected first state transition to report change")
	}
	events := subsystem.collectEvents("ws-1", 0)
	if len(events) != 2 || events[0].Type != "status" || events[1].Type != "question" {
		t.Fatalf("expected status/question events, got %#v", events)
	}
	if events[0].Cursor != 1 || events[1].Cursor != 2 {
		t.Fatalf("expected sequential event cursors, got %#v", events)
	}
	if subsystem.syncAgenticState("ws-1", "running", "why") {
		t.Fatal("expected repeated state to be ignored")
	}
}

func TestRelay_SyncAgenticState_Bad(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	if subsystem.syncAgenticState("", "running", "why") {
		t.Fatal("expected empty workspace id to be ignored")
	}
}
