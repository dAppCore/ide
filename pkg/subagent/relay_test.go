package subagent

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"dappco.re/go/core/ide/pkg/config"
	"dappco.re/go/core/ws"
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
	event, ok := eventFromRelayMessage(ws.Message{
		Channel:   "subagent:ws-1:guide",
		Timestamp: time.Unix(0, 0).UTC(),
		Data: map[string]any{
			"type":        "guidance",
			"message":     "focus",
			"question_id": "q1",
		},
	})
	if !ok || event.Type != "guidance" || event.QuestionID != "q1" {
		t.Fatalf("unexpected event %#v ok=%v", event, ok)
	}
}
