package subagent

import (
	"context"
	"testing"

	"dappco.re/go/core/ide/pkg/config"
)

func TestSubagent_DispatchGuided_Good(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	out, err := subsystem.DispatchGuided(context.Background(), DispatchGuidedInput{Repo: "core/ide", Task: "investigate"})
	if err != nil {
		t.Fatalf("dispatch guided: %v", err)
	}
	if !out.Success || out.WorkspaceID == "" {
		t.Fatalf("expected guided dispatch output, got %#v", out)
	}
}

func TestSubagent_DispatchGuided_Bad(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	if _, err := subsystem.DispatchGuided(context.Background(), DispatchGuidedInput{}); err == nil {
		t.Fatal("expected validation error")
	}
}

func TestSubagent_DispatchGuided_Ugly(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	out, err := subsystem.DispatchGuided(context.Background(), DispatchGuidedInput{Repo: "core/ide", Task: "investigate", WorkspaceID: "fixed"})
	if err != nil {
		t.Fatalf("dispatch guided: %v", err)
	}
	if out.WorkspaceID != "fixed" {
		t.Fatalf("expected provided workspace id, got %#v", out)
	}
}
