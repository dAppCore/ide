package server

import (
	"context"
	// Note: test-only — error chain inspection needs errors.Is for cancellation propagation.
	"errors"
	// Note: test-only — MCP_AUTH_TOKEN env-var lookup/setup uses os.LookupEnv/Setenv directly.
	"os"
	"testing"
	"time"

	core "dappco.re/go"
	gui_chat "dappco.re/go/gui/pkg/chat"
	guimcp "dappco.re/go/gui/pkg/mcp"
	coreio "dappco.re/go/io"
	coremcp "dappco.re/go/mcp/pkg/mcp"

	chatpkg "dappco.re/go/ide/pkg/chat"
	"dappco.re/go/ide/pkg/config"
)

func TestServer_Compose_Good(t *testing.T) {
	coreInstance, err := Compose(Options{
		Config: config.IDEConfig{}.WithDefaults(),
		GUI:    true,
		MCP:    false,
		Medium: coreio.NewMemoryMedium(),
	})
	if err != nil {
		t.Fatalf("compose server: %v", err)
	}
	for _, name := range []string{
		"ide.brain.recall",
		"ide.brain.remember",
		"ide.brain.forget",
		"ide.brain.list",
		"ide.brain.context",
		"ide.workspace.scan",
		"ide.workspace.status",
		"ide.workspace.conventions",
		"ide.workspace.impact",
		"ide.subagent.guide",
		"ide.subagent.ask",
		"ide.subagent.answer",
		"ide.subagent.progress",
		"ide.subagent.watch",
		"ide.navigate",
		"ide.pkg.search",
		"ide.pkg.info",
		"ide.pkg.install",
	} {
		if !coreInstance.Action(name).Exists() {
			t.Fatalf("expected action %s to exist", name)
		}
	}
	if _, ok := core.ServiceFor[*coremcp.Service](coreInstance, "mcp"); !ok {
		t.Fatal("expected mcp service to be registered")
	}
	for _, name := range []string{"store", "ai", "workspace", "brain", "subagent", "navigate", "marketplace", "mcp"} {
		if !coreInstance.Service(name).OK {
			t.Fatalf("expected service %s to be registered", name)
		}
	}
	if _, ok := core.ServiceFor[*guimcp.Subsystem](coreInstance, "gui_mcp"); !ok {
		t.Fatal("expected gui_mcp service to be registered in GUI mode")
	}
	if _, ok := core.ServiceFor[*gui_chat.Service](coreInstance, "chat"); !ok {
		t.Fatal("expected chat service to be registered in GUI mode")
	}
}

func TestServer_Compose_Bad(t *testing.T) {
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Brain.Key = ""
	coreInstance, err := Compose(Options{Config: cfg, MCP: true, Medium: coreio.NewMemoryMedium()})
	if err != nil {
		t.Fatalf("compose server: %v", err)
	}
	result := coreInstance.Action("ide.brain.recall").Run(context.Background(), core.NewOptions(core.Option{Key: "query", Value: "alpha"}))
	if result.OK {
		t.Fatalf("expected missing API key error, got %#v", result.Value)
	}
	if result.Value == nil {
		t.Fatal("expected error value from recall action")
	}
}

func TestServer_Compose_Ugly(t *testing.T) {
	coreInstance, err := Compose(Options{Config: config.IDEConfig{}.WithDefaults(), MCP: true, Medium: coreio.NewMemoryMedium()})
	if err != nil {
		t.Fatalf("compose server: %v", err)
	}
	counts := map[string]int{}
	mcpService, ok := core.ServiceFor[*coremcp.Service](coreInstance, "mcp")
	if !ok || mcpService == nil {
		t.Fatal("expected mcp service")
	}
	for _, tool := range mcpService.Tools() {
		counts[tool.Name]++
	}
	for name, count := range counts {
		if count != 1 {
			t.Fatalf("tool %s registered %d times", name, count)
		}
	}
}

func TestServer_Compose_Good_MCPForcesStdioAndDisablesGUI(t *testing.T) {
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Transport.Mode = "http"
	cfg.Ide.Transport.HTTPAddr = "127.0.0.1:9880"
	srv, err := NewServer(Options{
		Config: cfg,
		GUI:    true,
		MCP:    true,
		Medium: coreio.NewMemoryMedium(),
	})
	if err != nil {
		t.Fatalf("compose server: %v", err)
	}
	if srv.transport.Mode != "stdio" {
		t.Fatalf("expected stdio transport for --mcp, got %#v", srv.transport)
	}
	if _, ok := core.ServiceFor[*guimcp.Subsystem](srv.Core(), "gui_mcp"); ok {
		t.Fatal("expected GUI subsystem to stay disabled for --mcp")
	}
}

func TestServer_ChatExecutor_Good(t *testing.T) {
	shared := chatpkg.NewExecutor(nil, nil)
	executor := chatExecutor(config.Chat{ToolExecutor: "gui_mcp"}, shared, nil)
	if executor != shared {
		t.Fatalf("expected shared executor, got %#v", executor)
	}
}

func TestServer_ChatExecutor_Bad(t *testing.T) {
	shared := chatpkg.NewExecutor(nil, nil)
	mcpService, err := coremcp.New(coremcp.Options{})
	if err != nil {
		t.Fatalf("mcp: %v", err)
	}
	executor := chatExecutor(config.Chat{ToolExecutor: "mcp_self"}, shared, mcpService)
	if executor == shared {
		t.Fatal("expected dedicated MCP executor when tool_executor=mcp_self")
	}
}

func TestServer_ChatExecutor_Ugly(t *testing.T) {
	shared := chatpkg.NewExecutor(nil, nil)
	executor := chatExecutor(config.Chat{ToolExecutor: " unknown "}, shared, nil)
	if executor != shared {
		t.Fatalf("expected unknown mode to fall back to shared executor, got %#v", executor)
	}
}

func TestServer_MCPAuthToken_Good(t *testing.T) {
	t.Setenv("MCP_AUTH_TOKEN", "old-token")
	err := withMCPAuthToken("new-token", func() error {
		if got := core.Env("MCP_AUTH_TOKEN"); got != "new-token" {
			t.Fatalf("expected runtime token, got %q", got)
		}
		return nil
	})
	if err != nil {
		t.Fatalf("withMCPAuthToken: %v", err)
	}
	if got := core.Env("MCP_AUTH_TOKEN"); got != "old-token" {
		t.Fatalf("expected token restore, got %q", got)
	}
}

func TestServer_MCPAuthToken_Bad(t *testing.T) {
	if err := withMCPAuthToken("token", nil); err == nil {
		t.Fatal("expected nil runner error")
	}
}

func TestServer_MCPAuthToken_Ugly(t *testing.T) {
	previous, hadPrevious := os.LookupEnv("MCP_AUTH_TOKEN")
	_ = os.Unsetenv("MCP_AUTH_TOKEN")
	t.Cleanup(func() {
		if hadPrevious {
			_ = os.Setenv("MCP_AUTH_TOKEN", previous)
			return
		}
		_ = os.Unsetenv("MCP_AUTH_TOKEN")
	})
	expected := errors.New("stop")
	err := withMCPAuthToken("new-token", func() error {
		if got := core.Env("MCP_AUTH_TOKEN"); got != "new-token" {
			t.Fatalf("expected runtime token, got %q", got)
		}
		return expected
	})
	if !errors.Is(err, expected) {
		t.Fatalf("expected runner error, got %v", err)
	}
	if _, ok := os.LookupEnv("MCP_AUTH_TOKEN"); ok {
		t.Fatal("expected token to be unset after restore")
	}
}

func TestServer_Run_Good(t *testing.T) {
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Transport.Mode = "http"
	cfg.Ide.Transport.HTTPAddr = "127.0.0.1:0"
	cfg.Ide.Transport.Token = "test-token"
	srv, err := NewServer(Options{
		Config: cfg,
		MCP:    false,
		Medium: coreio.NewMemoryMedium(),
	})
	if err != nil {
		t.Fatalf("compose server: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	errCh := make(chan error, 1)
	go func() {
		errCh <- srv.Run(ctx)
	}()
	time.Sleep(100 * time.Millisecond)
	cancel()
	select {
	case runErr := <-errCh:
		if runErr != nil {
			t.Fatalf("run should stop cleanly after cancel, got %v", runErr)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("run did not return after cancel")
	}
}

func TestServer_Run_Bad(t *testing.T) {
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Transport.Mode = "http"
	cfg.Ide.Transport.HTTPAddr = "127.0.0.1:0"
	t.Setenv("MCP_AUTH_TOKEN", "")
	srv, err := NewServer(Options{
		Config: cfg,
		MCP:    false,
		Medium: coreio.NewMemoryMedium(),
	})
	if err != nil {
		t.Fatalf("compose server: %v", err)
	}

	if err := srv.Run(context.Background()); err == nil || !core.Contains(err.Error(), "bearer token required for HTTP mode") {
		t.Fatalf("expected missing token error, got %v", err)
	}
}

func TestServer_Run_Ugly(t *testing.T) {
	srv, err := NewServer(Options{
		Config: config.IDEConfig{}.WithDefaults(),
		MCP:    true,
		Medium: coreio.NewMemoryMedium(),
	})
	if err != nil {
		t.Fatalf("compose server: %v", err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	// Note: errors.Is — context.Canceled is stdlib typed error; core has no equivalent chain walker.
	if err := srv.Run(ctx); !errors.Is(err, context.Canceled) {
		t.Fatalf("expected context cancelled error, got %v", err)
	}
}
