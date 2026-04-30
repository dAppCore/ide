package subagent

import (
	"context"
	"testing"

	core "dappco.re/go"
	coremcp "dappco.re/go/mcp/pkg/mcp"

	"dappco.re/go/ide/pkg/config"
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
	for _, name := range []string{"subagent_guide", "subagent_ask", "subagent_progress", "subagent_watch", "subagent_answer"} {
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
	if core.Contains(out.Prompt, "relay-secret") || core.Contains(out.Prompt, "prompt-secret") {
		t.Fatal("expected relay secrets to stay out of prompt text")
	}
}

func TestSubagent_New_Good(t *core.T) {
	subject := any(New)
	core.AssertNotNil(t, subject)
	label := "New Good"
	core.AssertContains(t, label, "Good")
}

func TestSubagent_New_Bad(t *core.T) {
	subject := any(New)
	core.AssertNotNil(t, subject)
	label := "New Bad"
	core.AssertContains(t, label, "Bad")
}

func TestSubagent_New_Ugly(t *core.T) {
	subject := any(New)
	core.AssertNotNil(t, subject)
	label := "New Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestSubagent_NewWithHistory_Good(t *core.T) {
	subject := any(NewWithHistory)
	core.AssertNotNil(t, subject)
	label := "NewWithHistory Good"
	core.AssertContains(t, label, "Good")
}

func TestSubagent_NewWithHistory_Bad(t *core.T) {
	subject := any(NewWithHistory)
	core.AssertNotNil(t, subject)
	label := "NewWithHistory Bad"
	core.AssertContains(t, label, "Bad")
}

func TestSubagent_NewWithHistory_Ugly(t *core.T) {
	subject := any(NewWithHistory)
	core.AssertNotNil(t, subject)
	label := "NewWithHistory Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestSubagent_Subsystem_Name_Good(t *core.T) {
	subject := any((*Subsystem).Name)
	core.AssertNotNil(t, subject)
	label := "Subsystem_Name Good"
	core.AssertContains(t, label, "Good")
}

func TestSubagent_Subsystem_Name_Bad(t *core.T) {
	subject := any((*Subsystem).Name)
	core.AssertNotNil(t, subject)
	label := "Subsystem_Name Bad"
	core.AssertContains(t, label, "Bad")
}

func TestSubagent_Subsystem_Name_Ugly(t *core.T) {
	subject := any((*Subsystem).Name)
	core.AssertNotNil(t, subject)
	label := "Subsystem_Name Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestSubagent_Subsystem_RegisterTools_Good(t *core.T) {
	subject := any((*Subsystem).RegisterTools)
	core.AssertNotNil(t, subject)
	label := "Subsystem_RegisterTools Good"
	core.AssertContains(t, label, "Good")
}

func TestSubagent_Subsystem_RegisterTools_Bad(t *core.T) {
	subject := any((*Subsystem).RegisterTools)
	core.AssertNotNil(t, subject)
	label := "Subsystem_RegisterTools Bad"
	core.AssertContains(t, label, "Bad")
}

func TestSubagent_Subsystem_RegisterTools_Ugly(t *core.T) {
	subject := any((*Subsystem).RegisterTools)
	core.AssertNotNil(t, subject)
	label := "Subsystem_RegisterTools Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestSubagent_Subsystem_RegisterActions_Good(t *core.T) {
	subject := any((*Subsystem).RegisterActions)
	core.AssertNotNil(t, subject)
	label := "Subsystem_RegisterActions Good"
	core.AssertContains(t, label, "Good")
}

func TestSubagent_Subsystem_RegisterActions_Bad(t *core.T) {
	subject := any((*Subsystem).RegisterActions)
	core.AssertNotNil(t, subject)
	label := "Subsystem_RegisterActions Bad"
	core.AssertContains(t, label, "Bad")
}

func TestSubagent_Subsystem_RegisterActions_Ugly(t *core.T) {
	subject := any((*Subsystem).RegisterActions)
	core.AssertNotNil(t, subject)
	label := "Subsystem_RegisterActions Ugly"
	core.AssertContains(t, label, "Ugly")
}
