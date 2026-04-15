package marketplace

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

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
