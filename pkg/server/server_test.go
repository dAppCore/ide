package server

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	core "dappco.re/go/core"
	coreio "dappco.re/go/core/io"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	guimcp "forge.lthn.ai/core/gui/pkg/mcp"

	chatpkg "dappco.re/go/core/ide/pkg/chat"
	"dappco.re/go/core/ide/pkg/config"
)

func TestServer_Compose_Good(t *testing.T) {
	srv, err := Compose(Options{
		Config: config.IDEConfig{}.WithDefaults(),
		MCP:    true,
		Medium: coreio.NewMemoryMedium(),
	})
	if err != nil {
		t.Fatalf("compose server: %v", err)
	}
	if srv.Core() == nil || srv.MCP() == nil {
		t.Fatal("expected core and mcp services")
	}
}

func TestServer_Compose_Bad(t *testing.T) {
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Brain.Key = ""
	srv, err := Compose(Options{Config: cfg, MCP: true, Medium: coreio.NewMemoryMedium()})
	if err != nil {
		t.Fatalf("compose server: %v", err)
	}
	var found bool
	for _, tool := range srv.MCP().Tools() {
		if tool.Name != "brain_recall" {
			continue
		}
		found = true
		_, callErr := tool.RESTHandler(context.Background(), []byte(`{"query":"alpha"}`))
		if callErr == nil {
			t.Fatal("expected missing API key error")
		}
	}
	if !found {
		t.Fatal("brain_recall tool not registered")
	}
}

func TestServer_Compose_Ugly(t *testing.T) {
	srv, err := Compose(Options{Config: config.IDEConfig{}.WithDefaults(), MCP: true, Medium: coreio.NewMemoryMedium()})
	if err != nil {
		t.Fatalf("compose server: %v", err)
	}
	counts := map[string]int{}
	for _, tool := range srv.MCP().Tools() {
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
	srv, err := Compose(Options{
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

func TestServer_Run_Good(t *testing.T) {
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Transport.Mode = "http"
	cfg.Ide.Transport.HTTPAddr = "127.0.0.1:0"
	cfg.Ide.Transport.Token = "test-token"
	srv, err := Compose(Options{
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
	srv, err := Compose(Options{
		Config: cfg,
		MCP:    false,
		Medium: coreio.NewMemoryMedium(),
	})
	if err != nil {
		t.Fatalf("compose server: %v", err)
	}

	if err := srv.Run(context.Background()); err == nil || !strings.Contains(err.Error(), "http transport requires a bearer token") {
		t.Fatalf("expected missing token error, got %v", err)
	}
}

func TestServer_Run_Ugly(t *testing.T) {
	srv, err := Compose(Options{
		Config: config.IDEConfig{}.WithDefaults(),
		MCP:    true,
		Medium: coreio.NewMemoryMedium(),
	})
	if err != nil {
		t.Fatalf("compose server: %v", err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := srv.Run(ctx); !errors.Is(err, context.Canceled) {
		t.Fatalf("expected context cancelled error, got %v", err)
	}
}
