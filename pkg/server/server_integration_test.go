package server

import (
	"context"
	"testing"

	coreio "dappco.re/go/io"

	"dappco.re/go/ide/pkg/config"
)

func TestServerIntegration_Run_Good(t *testing.T) {
	medium := coreio.NewMemoryMedium()
	_ = medium.Write("/workspace/.core/manifest.yaml", "name: demo\n")
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Workspace.Root = "/workspace"
	srv, err := NewServer(Options{Config: cfg, MCP: true, Medium: medium})
	if err != nil {
		t.Fatalf("compose server: %v", err)
	}
	names := map[string]bool{}
	for _, tool := range srv.MCP().Tools() {
		names[tool.Name] = true
	}
	for _, name := range []string{"workspace_scan", "workspace_status", "core_navigate", "pkg_search", "subagent_watch"} {
		if !names[name] {
			t.Fatalf("expected tool %s to be registered", name)
		}
	}
}

func TestServerIntegration_Run_Bad(t *testing.T) {
	srv, err := NewServer(Options{Config: config.IDEConfig{}.WithDefaults(), MCP: true, Medium: coreio.NewMemoryMedium()})
	if err != nil {
		t.Fatalf("compose server: %v", err)
	}
	var found bool
	for _, tool := range srv.MCP().Tools() {
		if tool.Name != "subagent_ask" {
			continue
		}
		found = true
		_, callErr := tool.RESTHandler(context.Background(), []byte(`{"workspaceId":"","question":"why?"}`))
		if callErr == nil {
			t.Fatal("expected ask validation error")
		}
	}
	if !found {
		t.Fatal("subagent_ask not registered")
	}
}

func TestServerIntegration_Run_Ugly(t *testing.T) {
	srv, err := NewServer(Options{Config: config.IDEConfig{}.WithDefaults(), MCP: true, Medium: coreio.NewMemoryMedium()})
	if err != nil {
		t.Fatalf("compose server: %v", err)
	}
	for _, tool := range srv.MCP().Tools() {
		if tool.Name != "core_navigate" {
			continue
		}
		out, callErr := tool.RESTHandler(context.Background(), []byte(`{"route":"core://settings"}`))
		if callErr != nil {
			t.Fatalf("navigate tool call: %v", callErr)
		}
		if out == nil {
			t.Fatal("expected navigate payload")
		}
	}
}
