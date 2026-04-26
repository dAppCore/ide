package subagent

import (
	"context"
	"strings"
	"testing"
	"time"

	core "dappco.re/go/core"

	"dappco.re/go/ide/pkg/config"
)

func TestTools_State_Good(t *testing.T) {
	if completed, failed := state([]Event{{Type: "status", Message: "completed"}}); !completed || failed {
		t.Fatalf("expected completed state, got completed=%v failed=%v", completed, failed)
	}
	if completed, failed := state([]Event{{Type: "status", Message: "failed"}}); completed || !failed {
		t.Fatalf("expected failed state, got completed=%v failed=%v", completed, failed)
	}
}

func TestTools_DedupeEvents_Good(t *testing.T) {
	now := time.Unix(123, 0).UTC()
	events := []Event{
		{Type: "status", Channel: "subagent:ws-1:status", Message: "running", CreatedAt: now},
		{Type: "question", Channel: "subagent:ws-1:question", Message: "why", QuestionID: "q1", CreatedAt: now},
	}
	if got := dedupeEvents(events); len(got) != len(events) {
		t.Fatalf("expected unique events to pass through, got %#v", got)
	}
}

func TestTools_DedupeEvents_Bad(t *testing.T) {
	if got := dedupeEvents(nil); got != nil {
		t.Fatalf("expected nil input to stay nil, got %#v", got)
	}
}

func TestTools_DedupeEvents_Ugly(t *testing.T) {
	now := time.Unix(123, 0).UTC()
	dup := Event{Type: "status", Channel: "subagent:ws-1:status", Message: "running", CreatedAt: now}
	got := dedupeEvents([]Event{dup, dup})
	if len(got) != 1 {
		t.Fatalf("expected duplicate events to collapse, got %#v", got)
	}
}

func TestTools_TerminalState_Good(t *testing.T) {
	cases := []string{
		"completed",
		"merged",
		"ready-for-review",
	}
	for _, tc := range cases {
		t.Run(tc, func(t *testing.T) {
			completed, failed := terminalState(tc)
			if !completed || failed {
				t.Fatalf("expected completed terminal state for %q, got completed=%v failed=%v", tc, completed, failed)
			}
		})
	}
}

func TestTools_TerminalState_Bad(t *testing.T) {
	if completed, failed := terminalState("unknown"); completed || failed {
		t.Fatalf("expected unknown state to be non-terminal, got completed=%v failed=%v", completed, failed)
	}
}

func TestTools_TerminalState_Ugly(t *testing.T) {
	if completed, failed := terminalState(" blocked "); completed || !failed {
		t.Fatalf("expected trimmed blocked state to fail, got completed=%v failed=%v", completed, failed)
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
	out, err := subsystem.DispatchGuided(context.Background(), DispatchGuidedInput{Repo: "core/ide", Task: "investigate"})
	if err != nil {
		t.Fatalf("DispatchGuided: %v", err)
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
