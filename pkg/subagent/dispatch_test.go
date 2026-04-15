package subagent

import (
	"context"
	"os"
	"strings"
	"testing"

	"dappco.re/go/core/ide/pkg/config"
)

func TestDispatch_Guided_Good(t *testing.T) {
	out, err := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "").DispatchGuided(context.Background(), DispatchGuidedInput{Repo: "core/ide", Task: "investigate"})
	if err != nil || !out.Success || out.WorkspaceID == "" {
		t.Fatalf("unexpected dispatch output %#v err=%v", out, err)
	}
}

func TestDispatch_Guided_Bad(t *testing.T) {
	if _, err := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "").DispatchGuided(context.Background(), DispatchGuidedInput{}); err == nil {
		t.Fatal("expected validation error")
	}
}

func TestDispatch_Guided_Ugly(t *testing.T) {
	out, err := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "relay-secret").DispatchGuided(context.Background(), DispatchGuidedInput{Repo: "core/ide", Task: "investigate", RelayToken: "prompt-secret"})
	if err != nil || strings.Contains(out.Prompt, "secret") {
		t.Fatalf("expected secret-free prompt, got %#v err=%v", out, err)
	}
}

func TestDispatch_Guided_BadRelayURL(t *testing.T) {
	_, err := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "").DispatchGuided(context.Background(), DispatchGuidedInput{Repo: "core/ide", Task: "investigate", RelayURL: "https://example.com/subagent"})
	if err == nil {
		t.Fatal("expected relay URL host validation error")
	}
}

func TestDispatch_WithDispatchEnv_Ugly(t *testing.T) {
	t.Setenv("CORE_IDE_RELAY_URL", "original")
	restore := withDispatchEnv(map[string]string{
		"CORE_IDE_RELAY_URL":   "ws://127.0.0.1:9882/subagent",
		"CORE_IDE_RELAY_TOKEN": "relay-secret",
	})
	if got := os.Getenv("CORE_IDE_RELAY_URL"); got != "ws://127.0.0.1:9882/subagent" {
		t.Fatalf("expected temporary env override, got %q", got)
	}
	restore()
	if got := os.Getenv("CORE_IDE_RELAY_URL"); got != "original" {
		t.Fatalf("expected env restore, got %q", got)
	}
	if got := os.Getenv("CORE_IDE_RELAY_TOKEN"); got != "" {
		t.Fatalf("expected relay token to be removed, got %q", got)
	}
}

func TestDispatch_HandleDispatchGuided_Good(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	_, out, err := subsystem.handleDispatchGuided(context.Background(), nil, DispatchGuidedInput{Repo: "core/ide", Task: "investigate"})
	if err != nil {
		t.Fatalf("handleDispatchGuided: %v", err)
	}
	if !out.Success || out.Delivered {
		t.Fatalf("expected no-relay guided dispatch, got %#v", out)
	}
}

func TestDispatch_BindAgenticWorkspace_Good(t *testing.T) {
	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "")
	subsystem.bindAgenticWorkspace("ws-1", "workspace-name")
	if got := subsystem.agenticWorkspace("ws-1"); got.Name != "workspace-name" {
		t.Fatalf("expected agentic workspace binding, got %#v", got)
	}
}

func TestDispatch_DispatchViaAgentic_Ugly(t *testing.T) {
	// Missing seam: dispatchViaAgentic requires an injectable agentic MCP dispatcher to unit test safely.
	t.Skip("dispatchViaAgentic is exercised indirectly by integration coverage only")
}
