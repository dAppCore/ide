package subagent

import (
	"context"
	"testing"

	core "dappco.re/go/core"

	"dappco.re/go/core/ide/pkg/config"
)

func TestActions_Subagent_Good(t *testing.T) {
	c := core.New()
	New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "").registerActions(c)
	if !c.Action("ide.subagent.guide").Exists() {
		t.Fatal("expected guide action")
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
