package subagent

import (
	"context"
	"testing"
	"time"

	core "dappco.re/go/core"

	"dappco.re/go/core/ide/pkg/config"
)

func TestActions_Subagent_Good(t *testing.T) {
	c := core.New()
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	subsystem.registerActions(c)
	for _, name := range []string{
		"ide.subagent.guide",
		"ide.subagent.ask",
		"ide.subagent.progress",
		"ide.subagent.watch",
		"ide.subagent.answer",
		"ide.subagent.dispatch_guided",
	} {
		if !c.Action(name).Exists() {
			t.Fatalf("expected %s action", name)
		}
	}
	if result := c.Action("ide.subagent.guide").Run(context.Background(), core.NewOptions(core.Option{Key: "workspaceId", Value: "ws-1"}, core.Option{Key: "message", Value: "focus"})); !result.OK {
		t.Fatalf("expected guide action success, got %#v", result.Value)
	}
	if result := c.Action("ide.subagent.ask").Run(context.Background(), core.NewOptions(core.Option{Key: "workspaceId", Value: "ws-1"}, core.Option{Key: "question", Value: "why?"})); !result.OK {
		t.Fatalf("expected ask action success, got %#v", result.Value)
	}
	if result := c.Action("ide.subagent.progress").Run(context.Background(), core.NewOptions(core.Option{Key: "workspaceId", Value: "ws-1"}, core.Option{Key: "progress", Value: 1}, core.Option{Key: "total", Value: 2}, core.Option{Key: "message", Value: "step"})); !result.OK {
		t.Fatalf("expected progress action success, got %#v", result.Value)
	}
	subsystem.appendEvent("ws-1", Event{Type: "status", Message: "completed", CreatedAt: time.Now()})
	if result := c.Action("ide.subagent.watch").Run(context.Background(), core.NewOptions(core.Option{Key: "workspaceId", Value: "ws-1"})); !result.OK {
		t.Fatalf("expected watch action success, got %#v", result.Value)
	}
	channel := make(chan string, 1)
	subsystem.appendQuestionChannel("ws-1", "q1", channel)
	if result := c.Action("ide.subagent.answer").Run(context.Background(), core.NewOptions(core.Option{Key: "workspaceId", Value: "ws-1"}, core.Option{Key: "questionId", Value: "q1"}, core.Option{Key: "answer", Value: "because"})); !result.OK {
		t.Fatalf("expected answer action success, got %#v", result.Value)
	}
	if result := c.Action("ide.subagent.dispatch_guided").Run(context.Background(), core.NewOptions(core.Option{Key: "repo", Value: "core/ide"}, core.Option{Key: "task", Value: "investigate"})); !result.OK {
		t.Fatalf("expected dispatch action success, got %#v", result.Value)
	}
}

func TestActions_Subagent_Bad(t *testing.T) {
	c := core.New()
	New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "").registerActions(c)
	result := c.Action("ide.subagent.ask").Run(context.Background(), core.NewOptions(core.Option{Key: "waitSeconds", Value: "bad"}))
	if result.OK {
		t.Fatalf("expected decode failure, got %#v", result.Value)
	}
}

func TestActions_Subagent_Ugly(t *testing.T) {
	c := core.New()
	New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "").registerActions(c)
	result := c.Action("ide.subagent.guide").Run(context.Background(), core.NewOptions(core.Option{Key: "workspaceId", Value: "ws-1"}))
	if !result.OK {
		t.Fatalf("expected no-relay guide to remain successful, got %#v", result.Value)
	}
}
