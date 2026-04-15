package marketplace

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	core "dappco.re/go/core"
	coremcp "dappco.re/go/mcp/pkg/mcp"

	"dappco.re/go/core/ide/pkg/config"
)

func TestMarketplace_Search_Good(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`[{"code":"go-io","name":"go-io"}]`))
	}))
	defer server.Close()
	subsystem := New(config.Marketplace{Endpoint: server.URL, APIPath: ""})
	out, err := subsystem.search(context.Background(), SearchInput{Query: "go"})
	if err != nil {
		t.Fatalf("search: %v", err)
	}
	if len(out.Packages) != 1 {
		t.Fatalf("expected one package, got %#v", out)
	}
}

func TestMarketplace_Search_Bad(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "bad gateway", http.StatusBadGateway)
	}))
	defer server.Close()
	subsystem := New(config.Marketplace{Endpoint: server.URL, APIPath: ""})
	if _, err := subsystem.search(context.Background(), SearchInput{}); err == nil {
		t.Fatal("expected upstream error")
	}
}

func TestMarketplace_Search_Ugly(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()
	subsystem := New(config.Marketplace{Endpoint: server.URL, APIPath: ""})
	if _, err := subsystem.search(context.Background(), SearchInput{}); err == nil {
		t.Fatal("expected decode error for empty body")
	}
}

func TestMarketplace_Name_Good(t *testing.T) {
	if got := New(config.Marketplace{}).Name(); got != "marketplace" {
		t.Fatalf("expected marketplace name, got %q", got)
	}
}

func TestMarketplace_RegisterActions_Good(t *testing.T) {
	subsystem := New(config.Marketplace{})
	c := core.New()
	subsystem.RegisterActions(c)
	for _, name := range []string{"ide.pkg.search", "ide.pkg.info", "ide.pkg.install"} {
		if !c.Action(name).Exists() {
			t.Fatalf("expected action %s", name)
		}
	}
}

func TestMarketplace_RegisterTools_Good(t *testing.T) {
	subsystem := New(config.Marketplace{})
	svc, err := coremcp.New(coremcp.Options{})
	if err != nil {
		t.Fatalf("mcp: %v", err)
	}
	subsystem.RegisterTools(svc)
	names := map[string]bool{}
	for _, tool := range svc.Tools() {
		names[tool.Name] = true
	}
	for _, name := range []string{"pkg_search", "pkg_info", "pkg_install"} {
		if !names[name] {
			t.Fatalf("expected tool %s", name)
		}
	}
}

func TestMarketplace_Decode_Good(t *testing.T) {
	input, err := decode[SearchInput](core.NewOptions(
		core.Option{Key: "query", Value: "go"},
		core.Option{Key: "category", Value: "language"},
	))
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	if input.Query != "go" || input.Category != "language" {
		t.Fatalf("unexpected decoded input %#v", input)
	}
}

func TestMarketplace_Decode_Bad(t *testing.T) {
	if _, err := decode[struct {
		Query string `json:"query"`
	}](core.NewOptions(core.Option{Key: "query", Value: 123})); err == nil {
		t.Fatal("expected type mismatch error")
	}
}
