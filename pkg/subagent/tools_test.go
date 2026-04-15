package subagent

import (
	"context"
	"strings"
	"testing"
	"time"

	core "dappco.re/go/core"
	"dappco.re/go/core/ide/pkg/config"
	"dappco.re/go/core/ws"
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

func TestTools_State_Good(t *testing.T) {
	if completed, failed := state([]Event{{Type: "status", Message: "completed"}}); !completed || failed {
		t.Fatalf("expected completed state, got completed=%v failed=%v", completed, failed)
	}
	if completed, failed := state([]Event{{Type: "status", Message: "failed"}}); completed || !failed {
		t.Fatalf("expected failed state, got completed=%v failed=%v", completed, failed)
	}
}

func TestTools_ClampInt_Ugly(t *testing.T) {
	cases := []struct {
		value    int
		fallback int
		max      int
		expected int
	}{
		{value: 0, fallback: 3, max: 10, expected: 3},
		{value: 20, fallback: 3, max: 10, expected: 10},
		{value: -1, fallback: 3, max: 10, expected: 3},
	}
	for _, tc := range cases {
		if got := clampInt(tc.value, tc.fallback, tc.max); got != tc.expected {
			t.Fatalf("clampInt(%d,%d,%d) expected %d, got %d", tc.value, tc.fallback, tc.max, tc.expected, got)
		}
	}
}

func TestTools_HandleGuide_Good(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	_, out, err := subsystem.handleGuide(context.Background(), nil, GuideInput{WorkspaceID: "ws-1", Message: "focus"})
	if err != nil {
		t.Fatalf("handleGuide: %v", err)
	}
	if out.Delivered {
		t.Fatalf("expected no-relay fallback, got %#v", out)
	}
}

func TestTools_HandleAsk_Good(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	_, out, err := subsystem.handleAsk(context.Background(), nil, AskInput{WorkspaceID: "ws-1", Question: "why?"})
	if err != nil {
		t.Fatalf("handleAsk: %v", err)
	}
	if out.Reason != "no relay" {
		t.Fatalf("expected no-relay fallback, got %#v", out)
	}
}

func TestTools_HandleProgress_Good(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	_, out, err := subsystem.handleProgress(context.Background(), nil, ProgressInput{WorkspaceID: "ws-1", Progress: 1, Total: 3, Message: "step"})
	if err != nil {
		t.Fatalf("handleProgress: %v", err)
	}
	if out.Delivered {
		t.Fatalf("expected no-relay fallback, got %#v", out)
	}
}

func TestTools_HandleWatch_Good(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	subsystem.appendEvent("ws-1", Event{Type: "status", Message: "completed", CreatedAt: time.Now()})
	_, out, err := subsystem.handleWatch(context.Background(), nil, WatchInput{WorkspaceID: "ws-1", Timeout: 1})
	if err != nil {
		t.Fatalf("handleWatch: %v", err)
	}
	if !out.Completed || out.Failed {
		t.Fatalf("expected completed watch, got %#v", out)
	}
}

func TestTools_HandleAnswer_Good(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	channel := make(chan string, 1)
	subsystem.appendQuestionChannel("ws-1", "q1", channel)
	_, out, err := subsystem.handleAnswer(context.Background(), nil, AnswerInput{WorkspaceID: "ws-1", QuestionID: "q1", Answer: "because"})
	if err != nil {
		t.Fatalf("handleAnswer: %v", err)
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

func TestTools_HandleDispatchGuided_Good(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	_, out, err := subsystem.handleDispatchGuidedTool(context.Background(), nil, DispatchGuidedInput{Repo: "core/ide", Task: "investigate"})
	if err != nil {
		t.Fatalf("handleDispatchGuidedTool: %v", err)
	}
	if out.WorkspaceID == "" || !out.Success {
		t.Fatalf("unexpected dispatch output %#v", out)
	}
}

func TestTools_NewQuestionID_Good(t *testing.T) {
	got, err := newQuestionID()
	if err != nil {
		t.Fatalf("newQuestionID: %v", err)
	}
	if !strings.HasPrefix(got, "q-") {
		t.Fatalf("expected question id prefix, got %q", got)
	}
}

func TestSubagent_Decode_Good(t *testing.T) {
	input, err := decode[GuideInput](core.NewOptions(
		core.Option{Key: "workspaceId", Value: "ws-1"},
		core.Option{Key: "message", Value: "focus"},
	))
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	if input.WorkspaceID != "ws-1" || input.Message != "focus" {
		t.Fatalf("unexpected decoded input %#v", input)
	}
}

func TestSubagent_Decode_Bad(t *testing.T) {
	if _, err := decode[struct {
		WorkspaceID string `json:"workspaceId"`
	}](core.NewOptions(core.Option{Key: "workspaceId", Value: 123})); err == nil {
		t.Fatal("expected type mismatch error")
	}
}
