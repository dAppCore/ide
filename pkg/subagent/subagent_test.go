package subagent

import (
	"context"
	"strings"
	"testing"

	core "dappco.re/go/core"
	coremcp "dappco.re/go/mcp/pkg/mcp"

	"dappco.re/go/core/ide/pkg/config"
)

func TestSubagent_Name_Good(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	if subsystem.Name() != "subagent" {
		t.Fatalf("expected subagent name, got %q", subsystem.Name())
	}
}

func TestSubagent_RegisterActions_Good(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	c := core.New()
	subsystem.RegisterActions(c)
	for _, name := range []string{
		"ide.subagent.guide",
		"ide.subagent.ask",
		"ide.subagent.progress",
		"ide.subagent.watch",
		"ide.subagent.answer",
		"ide.subagent.dispatch_guided",
	} {
		if !c.Action(name).Exists() {
			t.Fatalf("expected action %s", name)
		}
	}
}

func TestSubagent_RegisterTools_Good(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	svc, err := coremcp.New(coremcp.Options{})
	if err != nil {
		t.Fatalf("mcp: %v", err)
	}
	subsystem.RegisterTools(svc)
	names := map[string]bool{}
	for _, tool := range svc.Tools() {
		names[tool.Name] = true
	}
	for _, name := range []string{"subagent_guide", "subagent_ask", "subagent_progress", "subagent_watch", "subagent_answer", "subagent_dispatch_guided"} {
		if !names[name] {
			t.Fatalf("expected tool %s", name)
		}
	}
}

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

func TestSubagent_DispatchGuided_BadWorkspaceID(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	if _, err := subsystem.DispatchGuided(context.Background(), DispatchGuidedInput{Repo: "core/ide", Task: "investigate", WorkspaceID: "../escape"}); err == nil {
		t.Fatal("expected invalid workspace id to fail")
	}
}

func TestSubagent_DispatchGuided_Good_NoSecretLeak(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "relay-secret")
	out, err := subsystem.DispatchGuided(context.Background(), DispatchGuidedInput{Repo: "core/ide", Task: "investigate", RelayToken: "prompt-secret"})
	if err != nil {
		t.Fatalf("dispatch guided: %v", err)
	}
	if strings.Contains(out.Prompt, "relay-secret") || strings.Contains(out.Prompt, "prompt-secret") {
		t.Fatal("expected relay secrets to stay out of prompt text")
	}
}
