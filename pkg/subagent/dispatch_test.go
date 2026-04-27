package subagent

import (
	"context"
	"os"
	"strings"
	"testing"

	coremcp "dappco.re/go/mcp/pkg/mcp"
	mcpagentic "dappco.re/go/mcp/pkg/mcp/agentic"
	"dappco.re/go/ws"

	"dappco.re/go/ide/pkg/config"
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

func TestDispatch_DefaultAgenticDispatchNoRelayEnv_Good(t *testing.T) {
	t.Setenv("CORE_IDE_RELAY_URL", "")
	t.Setenv("CORE_IDE_RELAY_TOKEN", "")
	service, err := coremcp.New(coremcp.Options{Unrestricted: true})
	if err != nil {
		t.Fatalf("mcp service: %v", err)
	}
	mcpagentic.NewPrep().RegisterTools(service)
	var handler coremcp.RESTHandler
	for _, tool := range service.Tools() {
		if tool.Name == "agentic_dispatch" {
			handler = tool.RESTHandler
			break
		}
	}
	if handler == nil {
		t.Fatal("expected default agentic_dispatch tool")
	}
	_, _ = handler(context.Background(), []byte(`{}`))
	if got := os.Getenv("CORE_IDE_RELAY_URL"); got != "" {
		t.Fatalf("expected default dispatch to leave relay URL unset, got %q", got)
	}
	if got := os.Getenv("CORE_IDE_RELAY_TOKEN"); got != "" {
		t.Fatalf("expected default dispatch to leave relay token unset, got %q", got)
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
	previous := agenticDispatchCall
	var gotRelayToken string
	agenticDispatchCall = func(_ context.Context, _ DispatchGuidedInput, agent, _ string, _, _, relayToken, prompt string) (mcpagentic.DispatchOutput, error) {
		gotRelayToken = relayToken
		if strings.Contains(prompt, "prompt-secret") || strings.Contains(prompt, "relay-secret") {
			t.Fatalf("expected secret-free prompt, got %q", prompt)
		}
		return mcpagentic.DispatchOutput{Success: true, Agent: agent, WorkspaceDir: "/tmp/agentic-ws"}, nil
	}
	t.Cleanup(func() { agenticDispatchCall = previous })

	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, ws.NewHub(), "relay-secret")
	out, err := subsystem.DispatchGuided(context.Background(), DispatchGuidedInput{Repo: "core/ide", Task: "investigate", RelayToken: "prompt-secret"})
	if err != nil {
		t.Fatalf("dispatch guided: %v", err)
	}
	if !out.Success || !out.Delivered || gotRelayToken != "relay-secret" {
		t.Fatalf("expected configured relay token to drive dispatch, out=%#v token=%q", out, gotRelayToken)
	}
	if got := subsystem.agenticWorkspace(out.WorkspaceID).Name; got != "agentic-ws" {
		t.Fatalf("expected agentic workspace binding, got %q", got)
	}
}

func TestDispatch_Guided_UglyCallerTokenDoesNotEnableRelay(t *testing.T) {
	previous := agenticDispatchCall
	called := false
	agenticDispatchCall = func(context.Context, DispatchGuidedInput, string, string, string, string, string, string) (mcpagentic.DispatchOutput, error) {
		called = true
		return mcpagentic.DispatchOutput{Success: true}, nil
	}
	t.Cleanup(func() { agenticDispatchCall = previous })

	subsystem := New(config.IDEConfig{}.WithDefaults().Ide.Subagent, ws.NewHub(), "")
	out, err := subsystem.DispatchGuided(context.Background(), DispatchGuidedInput{Repo: "core/ide", Task: "investigate", RelayToken: "caller-token"})
	if err != nil {
		t.Fatalf("dispatch guided: %v", err)
	}
	if out.Delivered || out.Reason != "no relay" {
		t.Fatalf("expected caller token alone to leave relay disabled, got %#v", out)
	}
	if called {
		t.Fatal("expected configured-token gate to prevent agentic dispatch")
	}
}
