package marketplace

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"dappco.re/go/core/ide/pkg/config"
	coreio "dappco.re/go/core/io"
)

func TestClient_Info_Good(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != "/v1/marketplace/go-io" {
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		_, _ = w.Write([]byte(`{"code":"go-io","name":"go-io"}`))
	}))
	defer server.Close()

	client := NewClient(config.Marketplace{Endpoint: server.URL, APIPath: "/v1/marketplace"})
	out, err := client.Info(context.Background(), InfoInput{Code: "go-io"})
	if err != nil {
		t.Fatalf("info: %v", err)
	}
	if out.Package.Code != "go-io" {
		t.Fatalf("expected package code, got %#v", out)
	}
}

func TestClient_Info_Bad(t *testing.T) {
	client := NewClient(config.Marketplace{Endpoint: "https://example.com", APIPath: "/v1/marketplace"})
	if _, err := client.Info(context.Background(), InfoInput{}); err == nil {
		t.Fatal("expected code validation error")
	}
}

func TestClient_Install_Good(t *testing.T) {
	t.Setenv("DIR_HOME", t.TempDir())
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/v1/marketplace/go-io/install" {
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		_, _ = w.Write([]byte(`null`))
	}))
	defer server.Close()

	client := NewClient(config.Marketplace{Endpoint: server.URL, APIPath: "/v1/marketplace", InstallVia: "api"})
	out, err := client.Install(context.Background(), InstallInput{Code: "go-io"})
	if err != nil {
		t.Fatalf("install: %v", err)
	}
	if !out.Installed || out.Code != "go-io" {
		t.Fatalf("expected install success, got %#v", out)
	}
}

func TestClient_Install_Bad(t *testing.T) {
	client := NewClient(config.Marketplace{Endpoint: "https://example.com", APIPath: "/v1/marketplace", InstallVia: "api"})
	if _, err := client.Install(context.Background(), InstallInput{}); err == nil {
		t.Fatal("expected code validation error")
	}
}

func TestClient_Install_Good_GoSCM(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != "/v1/marketplace/go-io" {
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		_, _ = w.Write([]byte(`{"code":"go-io","name":"go-io"}`))
	}))
	defer server.Close()

	client := NewClient(config.Marketplace{Endpoint: server.URL, APIPath: "/v1/marketplace"})
	client.AttachMedium(coreio.NewMemoryMedium())

	out, err := client.Install(context.Background(), InstallInput{Code: "go-io"})
	if err != nil {
		t.Fatalf("install via go-scm: %v", err)
	}
	if !out.Installed || out.Code != "go-io" {
		t.Fatalf("expected go-scm install success, got %#v", out)
	}
}

func TestClient_Request_Ugly(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("{"))
	}))
	defer server.Close()

	client := NewClient(config.Marketplace{Endpoint: server.URL, APIPath: "/v1/marketplace"})
	var out map[string]any
	if err := client.request(context.Background(), http.MethodGet, "/v1/marketplace", nil, &out); err == nil || !strings.Contains(err.Error(), "decode response") {
		t.Fatalf("expected decode error, got %v", err)
	}
}

func TestClient_DefaultInstallMedium_Good(t *testing.T) {
	home := t.TempDir()
	t.Setenv("DIR_HOME", home)
	medium, err := defaultInstallMedium()
	if err != nil {
		t.Fatalf("default install medium: %v", err)
	}
	if medium == nil {
		t.Fatal("expected install medium")
	}
	if _, err := os.Stat(home); err != nil {
		t.Fatalf("expected temp home to exist: %v", err)
	}
}

func TestClient_Search_Good(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/marketplace" {
			t.Fatalf("unexpected path %s", r.URL.Path)
		}
		if got := r.URL.Query().Get("category"); got != "language" {
			t.Fatalf("expected category query parameter, got %q", got)
		}
		_, _ = w.Write([]byte(`[{"code":"go-io","name":"go-io"}]`))
	}))
	defer server.Close()
	client := NewClient(config.Marketplace{Endpoint: server.URL, APIPath: "/v1/marketplace"})
	out, err := client.Search(context.Background(), SearchInput{Query: "go", Category: "language"})
	if err != nil || len(out.Packages) != 1 {
		t.Fatalf("unexpected search output %#v err=%v", out, err)
	}
}

func TestClient_Search_Bad(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadGateway)
	}))
	defer server.Close()
	client := NewClient(config.Marketplace{Endpoint: server.URL, APIPath: "/v1/marketplace"})
	if _, err := client.Search(context.Background(), SearchInput{Query: "go"}); err == nil || !strings.Contains(err.Error(), "502") {
		t.Fatalf("expected 502 error, got %v", err)
	}
}

func TestClient_Search_Ugly(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()
	client := NewClient(config.Marketplace{Endpoint: server.URL, APIPath: "/v1/marketplace"})
	out, err := client.Search(context.Background(), SearchInput{Query: "go"})
	if err != nil {
		t.Fatalf("expected empty-body success, got %#v err=%v", out, err)
	}
	if len(out.Packages) != 0 {
		t.Fatalf("expected empty search result, got %#v", out)
	}
}
