package marketplace

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	coremcp "dappco.re/go/mcp/pkg/mcp"

	"dappco.re/go/core/ide/pkg/config"
)

func TestTools_Marketplace_Good(t *testing.T) {
	svc, err := coremcp.New(coremcp.Options{})
	if err != nil {
		t.Fatalf("mcp: %v", err)
	}
	New(config.Marketplace{}.WithDefaults()).registerTools(svc)
	if len(svc.Tools()) < 3 {
		t.Fatalf("expected marketplace tools, got %d", len(svc.Tools()))
	}
}

func TestTools_Marketplace_Bad(t *testing.T) {
	subsystem := New(config.Marketplace{}.WithDefaults())
	if _, _, err := subsystem.handleInfo(context.Background(), nil, InfoInput{}); err == nil {
		t.Fatal("expected missing code error")
	}
}

func TestTools_Marketplace_Ugly(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`[]`))
	}))
	defer server.Close()
	subsystem := New(config.Marketplace{Endpoint: server.URL, APIPath: "/v1/marketplace"}.WithDefaults())
	if _, out, err := subsystem.handleSearch(context.Background(), nil, SearchInput{Query: "go"}); err != nil || len(out.Packages) != 0 {
		t.Fatalf("unexpected search output %#v err=%v", out, err)
	}
}

func TestTools_MarketplaceHandleInfo_Good(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/marketplace/go-io" {
			t.Fatalf("unexpected path %s", r.URL.Path)
		}
		_, _ = w.Write([]byte(`{"code":"go-io","name":"go-io"}`))
	}))
	defer server.Close()
	subsystem := New(config.Marketplace{Endpoint: server.URL, APIPath: "/v1/marketplace"}.WithDefaults())
	_, out, err := subsystem.handleInfo(context.Background(), nil, InfoInput{Code: "go-io"})
	if err != nil {
		t.Fatalf("handleInfo: %v", err)
	}
	if out.Package.Code != "go-io" {
		t.Fatalf("unexpected info output %#v", out)
	}
}

func TestTools_MarketplaceHandleInstall_Good(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/v1/marketplace/go-io/install" {
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		_, _ = w.Write([]byte(`null`))
	}))
	defer server.Close()
	subsystem := New(config.Marketplace{Endpoint: server.URL, APIPath: "/v1/marketplace", InstallVia: "api"}.WithDefaults())
	_, out, err := subsystem.handleInstall(context.Background(), nil, InstallInput{Code: "go-io"})
	if err != nil {
		t.Fatalf("handleInstall: %v", err)
	}
	if !out.Installed || out.Code != "go-io" {
		t.Fatalf("unexpected install output %#v", out)
	}
}
