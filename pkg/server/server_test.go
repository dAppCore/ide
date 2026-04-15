package server

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	coreio "dappco.re/go/core/io"

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

func TestServer_Run_Good(t *testing.T) {
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Transport.Mode = "http"
	cfg.Ide.Transport.HTTPAddr = "127.0.0.1:0"
	cfg.Ide.Transport.Token = "test-token"
	srv, err := Compose(Options{
		Config: cfg,
		MCP:    true,
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
		MCP:    true,
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
