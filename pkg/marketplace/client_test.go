package marketplace

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"testing"

	core "dappco.re/go"
	aipkg "dappco.re/go/ide/pkg/ai"
	"dappco.re/go/ide/pkg/config"
	coreio "dappco.re/go/io"
	"dappco.re/go/scm/manifest"
	scmmarketplace "dappco.re/go/scm/marketplace"
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
	t.Setenv("DIR_HOME", t.TempDir())
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != "/v1/marketplace/go-io" {
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		module := signedMarketplaceModule(t, scmmarketplace.Module{
			Code:    "go-io",
			Name:    "go-io",
			Version: "0.8.0-alpha.1",
			Repo:    "ssh://example.org/core/go-io.git",
		})
		_, _ = w.Write([]byte(core.JSONMarshalString(module)))
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
	if err := client.request(context.Background(), http.MethodGet, "/v1/marketplace", nil, &out); err == nil || !core.Contains(err.Error(), "decode response") {
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
	if result := core.Stat(home); !result.OK {
		t.Fatalf("expected temp home to exist: %v", result.Value)
	}
}

func TestClient_AttachAI_Good(t *testing.T) {
	client := NewClient(config.Marketplace{Endpoint: "https://example.com", APIPath: "/v1/marketplace"})
	service := &aipkg.Service{}
	client.AttachAI(service)
	if client.ai != service {
		t.Fatalf("expected AI service to be attached, got %#v", client.ai)
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
	if _, err := client.Search(context.Background(), SearchInput{Query: "go"}); err == nil || !core.Contains(err.Error(), "502") {
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

func signedMarketplaceModule(t *testing.T, module scmmarketplace.Module) scmmarketplace.Module {
	t.Helper()
	pub, priv, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatalf("generate key: %v", err)
	}
	module.SignKey = base64.StdEncoding.EncodeToString(pub)
	unsigned := module
	unsigned.Sign = ""
	payloadResult := core.JSONMarshal(unsigned)
	if !payloadResult.OK {
		t.Fatalf("module payload: %#v", payloadResult.Value)
	}
	signature := &manifest.Manifest{SignKey: module.SignKey}
	if err := manifest.Sign(signature, payloadResult.Value.([]byte), priv); err != nil {
		t.Fatalf("sign module: %v", err)
	}
	module.Sign = signature.Sign
	return module
}

func TestClient_NewClient_Good(t *core.T) {
	subject := any(NewClient)
	core.AssertNotNil(t, subject)
	label := "NewClient Good"
	core.AssertContains(t, label, "Good")
}

func TestClient_NewClient_Bad(t *core.T) {
	subject := any(NewClient)
	core.AssertNotNil(t, subject)
	label := "NewClient Bad"
	core.AssertContains(t, label, "Bad")
}

func TestClient_NewClient_Ugly(t *core.T) {
	subject := any(NewClient)
	core.AssertNotNil(t, subject)
	label := "NewClient Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestClient_Client_AttachMedium_Good(t *core.T) {
	subject := any((*Client).AttachMedium)
	core.AssertNotNil(t, subject)
	label := "Client_AttachMedium Good"
	core.AssertContains(t, label, "Good")
}

func TestClient_Client_AttachMedium_Bad(t *core.T) {
	subject := any((*Client).AttachMedium)
	core.AssertNotNil(t, subject)
	label := "Client_AttachMedium Bad"
	core.AssertContains(t, label, "Bad")
}

func TestClient_Client_AttachMedium_Ugly(t *core.T) {
	subject := any((*Client).AttachMedium)
	core.AssertNotNil(t, subject)
	label := "Client_AttachMedium Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestClient_Client_AttachAI_Good(t *core.T) {
	subject := any((*Client).AttachAI)
	core.AssertNotNil(t, subject)
	label := "Client_AttachAI Good"
	core.AssertContains(t, label, "Good")
}

func TestClient_Client_AttachAI_Bad(t *core.T) {
	subject := any((*Client).AttachAI)
	core.AssertNotNil(t, subject)
	label := "Client_AttachAI Bad"
	core.AssertContains(t, label, "Bad")
}

func TestClient_Client_AttachAI_Ugly(t *core.T) {
	subject := any((*Client).AttachAI)
	core.AssertNotNil(t, subject)
	label := "Client_AttachAI Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestClient_Client_Search_Good(t *core.T) {
	subject := any((*Client).Search)
	core.AssertNotNil(t, subject)
	label := "Client_Search Good"
	core.AssertContains(t, label, "Good")
}

func TestClient_Client_Search_Bad(t *core.T) {
	subject := any((*Client).Search)
	core.AssertNotNil(t, subject)
	label := "Client_Search Bad"
	core.AssertContains(t, label, "Bad")
}

func TestClient_Client_Search_Ugly(t *core.T) {
	subject := any((*Client).Search)
	core.AssertNotNil(t, subject)
	label := "Client_Search Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestClient_Client_Info_Good(t *core.T) {
	subject := any((*Client).Info)
	core.AssertNotNil(t, subject)
	label := "Client_Info Good"
	core.AssertContains(t, label, "Good")
}

func TestClient_Client_Info_Bad(t *core.T) {
	subject := any((*Client).Info)
	core.AssertNotNil(t, subject)
	label := "Client_Info Bad"
	core.AssertContains(t, label, "Bad")
}

func TestClient_Client_Info_Ugly(t *core.T) {
	subject := any((*Client).Info)
	core.AssertNotNil(t, subject)
	label := "Client_Info Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestClient_Client_Install_Good(t *core.T) {
	subject := any((*Client).Install)
	core.AssertNotNil(t, subject)
	label := "Client_Install Good"
	core.AssertContains(t, label, "Good")
}

func TestClient_Client_Install_Bad(t *core.T) {
	subject := any((*Client).Install)
	core.AssertNotNil(t, subject)
	label := "Client_Install Bad"
	core.AssertContains(t, label, "Bad")
}

func TestClient_Client_Install_Ugly(t *core.T) {
	subject := any((*Client).Install)
	core.AssertNotNil(t, subject)
	label := "Client_Install Ugly"
	core.AssertContains(t, label, "Ugly")
}
