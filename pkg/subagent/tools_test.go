package subagent

import (
	"context"
	"strings"
	"testing"
	"time"

	"dappco.re/go/ide/pkg/config"
	mcpagentic "dappco.re/go/mcp/pkg/mcp/agentic"
	"dappco.re/go/ws"
)

func TestTools_Guide_Good(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	out, err := subsystem.guide(context.Background(), GuideInput{WorkspaceID: "ws-1", Message: "focus"})
	if err != nil {
		t.Fatalf("guide: %v", err)
	}
	if out.Delivered {
		t.Fatalf("expected no-relay fallback, got %#v", out)
	}
}

func TestTools_Guide_Bad(t *testing.T) {
	cfg := config.IDEConfig{}.WithDefaults().Ide.Subagent
	disabled := false
	cfg.Enabled = &disabled
	subsystem := New(cfg, nil, "")
	out, err := subsystem.guide(context.Background(), GuideInput{WorkspaceID: "ws-1", Message: "focus"})
	if err != nil {
		t.Fatalf("guide: %v", err)
	}
	if out.Reason != "subagent is disabled" {
		t.Fatalf("expected disabled fallback, got %#v", out)
	}
}

func TestTools_Guide_Ugly(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	if _, err := subsystem.guide(context.Background(), GuideInput{WorkspaceID: "../escape"}); err == nil {
		t.Fatal("expected invalid workspace id")
	}
}

func TestTools_Ask_Good(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	out, err := subsystem.ask(context.Background(), AskInput{WorkspaceID: "ws-1", Question: "why?"})
	if err != nil {
		t.Fatalf("ask: %v", err)
	}
	if out.Reason != "no relay" {
		t.Fatalf("expected no relay fallback, got %#v", out)
	}
}

func TestTools_Ask_Bad(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	if _, err := subsystem.ask(context.Background(), AskInput{}); err == nil {
		t.Fatal("expected missing workspace id")
	}
}

func TestTools_Ask_Ugly(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	if _, err := subsystem.ask(context.Background(), AskInput{WorkspaceID: "../escape", Question: "why?"}); err == nil {
		t.Fatal("expected invalid workspace id")
	}
}

func TestTools_Progress_Good(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	out, err := subsystem.progress(context.Background(), ProgressInput{WorkspaceID: "ws-1", Progress: 1, Total: 3, Message: "step"})
	if err != nil {
		t.Fatalf("progress: %v", err)
	}
	if out.Delivered {
		t.Fatalf("expected no-relay fallback, got %#v", out)
	}
}

func TestTools_Progress_Bad(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	if _, err := subsystem.progress(context.Background(), ProgressInput{}); err == nil {
		t.Fatal("expected missing workspace id")
	}
}

func TestTools_Progress_Ugly(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	if _, err := subsystem.progress(context.Background(), ProgressInput{WorkspaceID: "../escape"}); err == nil {
		t.Fatal("expected invalid workspace id")
	}
}

func TestTools_Answer_Good(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	channel := make(chan string, 1)
	subsystem.appendQuestionChannel("ws-1", "q1", channel)
	out, err := subsystem.answer(context.Background(), AnswerInput{WorkspaceID: "ws-1", QuestionID: "q1", Answer: "because"})
	if err != nil {
		t.Fatalf("answer: %v", err)
	}
	if out.Delivered {
		t.Fatalf("expected no-relay fallback, got %#v", out)
	}
	select {
	case got := <-channel:
		if got != "because" {
			t.Fatalf("expected answer delivered to question channel, got %q", got)
		}
	default:
		t.Fatal("expected question channel to receive answer")
	}
}

func TestTools_Answer_UglyWorkspaceIsolation(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, ws.NewHub(), "")
	channel := make(chan string, 1)
	subsystem.appendQuestionChannel("ws-1", "q1", channel)
	out, err := subsystem.answer(context.Background(), AnswerInput{WorkspaceID: "ws-2", QuestionID: "q1", Answer: "nope"})
	if err != nil {
		t.Fatalf("answer: %v", err)
	}
	if !out.Delivered {
		t.Fatalf("expected answer call to publish on its own workspace, got %#v", out)
	}
	select {
	case got := <-channel:
		t.Fatalf("expected cross-workspace channel to remain untouched, got %q", got)
	default:
	}
}

func TestTools_Answer_Bad(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	if _, err := subsystem.answer(context.Background(), AnswerInput{WorkspaceID: "ws-1"}); err == nil {
		t.Fatal("expected missing question id")
	}
}

func TestTools_Answer_Ugly(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	if _, err := subsystem.answer(context.Background(), AnswerInput{WorkspaceID: "../escape", QuestionID: "q1"}); err == nil {
		t.Fatal("expected invalid workspace id")
	}
}

func TestTools_Watch_Good(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	subsystem.appendEvent("ws-1", Event{Type: "status", Message: "completed", CreatedAt: time.Now()})
	out, err := subsystem.watch(context.Background(), WatchInput{WorkspaceID: "ws-1", Timeout: 1})
	if err != nil {
		t.Fatalf("watch: %v", err)
	}
	if !out.Completed || out.Failed {
		t.Fatalf("expected completed watch, got %#v", out)
	}
}

func TestTools_Watch_Good_PagedCursor(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	subsystem.appendEvent("ws-1", Event{Type: "progress", Message: "one", CreatedAt: time.Now()})
	subsystem.appendEvent("ws-1", Event{Type: "progress", Message: "two", CreatedAt: time.Now()})

	first, err := subsystem.watch(context.Background(), WatchInput{WorkspaceID: "ws-1", Limit: 1, Timeout: 1})
	if err != nil {
		t.Fatalf("first watch: %v", err)
	}
	if len(first.Events) != 1 || first.Events[0].Message != "one" || !first.HasMore {
		t.Fatalf("expected first event page with more results, got %#v", first)
	}
	if first.NextCursor != first.Events[0].Cursor+1 {
		t.Fatalf("expected next cursor after first event, got %#v", first)
	}

	second, err := subsystem.watch(context.Background(), WatchInput{WorkspaceID: "ws-1", Cursor: first.NextCursor, Limit: 1, Timeout: 1})
	if err != nil {
		t.Fatalf("second watch: %v", err)
	}
	if len(second.Events) != 1 || second.Events[0].Message != "two" || second.HasMore {
		t.Fatalf("expected second event page without more results, got %#v", second)
	}
	if second.NextCursor != second.Events[0].Cursor+1 {
		t.Fatalf("expected second next cursor to advance, got %#v", second)
	}
}

func TestTools_Watch_Bad(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	out, err := subsystem.watch(context.Background(), WatchInput{})
	if err != nil {
		t.Fatalf("watch: %v", err)
	}
	if out.Reason != "workspaceId is required" {
		t.Fatalf("expected missing workspace id fallback, got %#v", out)
	}
}

func TestTools_Watch_Ugly(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := subsystem.watch(ctx, WatchInput{WorkspaceID: "ws-1"}); err == nil {
		t.Fatal("expected canceled context")
	}
}

func TestTools_Watch_Good_AgenticFallback(t *testing.T) {
	previous := agenticWatchCall
	agenticWatchCall = func(context.Context, string, int, int) (mcpagentic.WatchOutput, error) {
		return mcpagentic.WatchOutput{
			Success: true,
			Completed: []mcpagentic.WatchResult{{
				Workspace: "agentic-ws",
				Status:    "completed",
			}},
		}, nil
	}
	t.Cleanup(func() { agenticWatchCall = previous })

	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	subsystem.bindAgenticWorkspace("ws-1", "agentic-ws")
	out, err := subsystem.watch(context.Background(), WatchInput{WorkspaceID: "ws-1", Timeout: 1})
	if err != nil {
		t.Fatalf("watch: %v", err)
	}
	if !out.Completed || out.Failed {
		t.Fatalf("expected completed agentic fallback, got %#v", out)
	}
	if len(out.Events) == 0 || out.Events[len(out.Events)-1].Message != "completed" {
		t.Fatalf("expected completed status event, got %#v", out.Events)
	}
}

func TestTools_NormalizeWorkspaceID_Good(t *testing.T) {
	got, err := normalizeWorkspaceID("ws-1")
	if err != nil || got != "ws-1" {
		t.Fatalf("expected workspace id to pass, got %q err=%v", got, err)
	}
}

func TestTools_NormalizeWorkspaceID_Bad(t *testing.T) {
	if _, err := normalizeWorkspaceID(strings.Repeat("a", maxWorkspaceIDLength+1)); err == nil {
		t.Fatal("expected workspace id length validation")
	}
}

func TestTools_ValidateRelayURL_Good(t *testing.T) {
	if err := validateRelayURL("http://127.0.0.1:9882/subagent"); err != nil {
		t.Fatalf("validate relay url: %v", err)
	}
}

func TestTools_ValidateRelayURL_Bad(t *testing.T) {
	if err := validateRelayURL("ftp://example.com"); err == nil {
		t.Fatal("expected unsupported scheme error")
	}
}

func TestTools_ValidateRelayURL_BadRemote(t *testing.T) {
	if err := validateRelayURL("https://example.com/subagent"); err == nil {
		t.Fatal("expected relay URL host restriction")
	}
}

func TestTools_ValidateRelayURL_BadCredentials(t *testing.T) {
	if err := validateRelayURL("ws://token@127.0.0.1:9882/subagent?debug=1#frag"); err == nil {
		t.Fatal("expected relay URL credential and query rejection")
	}
}

func TestTools_ValidateRelayURL_Ugly(t *testing.T) {
	if err := validateRelayURL("://bad"); err == nil {
		t.Fatal("expected malformed URL error")
	}
}

func TestTools_CanonicalRelayURL_Good(t *testing.T) {
	cases := []struct {
		name     string
		value    string
		expected string
	}{
		{name: "http becomes ws", value: "http://127.0.0.1:9882/subagent", expected: "ws://127.0.0.1:9882/subagent"},
		{name: "https becomes wss", value: "https://localhost:9882/subagent", expected: "wss://localhost:9882/subagent"},
		{name: "ws stays ws", value: "ws://127.0.0.1:9882/subagent", expected: "ws://127.0.0.1:9882/subagent"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := canonicalRelayURL(tc.value)
			if err != nil {
				t.Fatalf("canonicalRelayURL: %v", err)
			}
			if got != tc.expected {
				t.Fatalf("expected %q, got %q", tc.expected, got)
			}
		})
	}
}

func TestTools_CanonicalRelayURL_Bad(t *testing.T) {
	if _, err := canonicalRelayURL("ftp://127.0.0.1:9882/subagent"); err == nil {
		t.Fatal("expected unsupported scheme error")
	}
}

func TestTools_CanonicalRelayURL_Ugly(t *testing.T) {
	if _, err := canonicalRelayURL("ws://user:pass@127.0.0.1:9882/subagent?debug=1#frag"); err == nil {
		t.Fatal("expected relay URL credential and query rejection")
	}
}
