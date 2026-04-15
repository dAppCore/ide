package server

import (
	"context"
	"testing"

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
