package server

import (
	"net/http"
	"testing"

	"dappco.re/go/core/ide/pkg/config"
)

func TestTransport_Select_Good(t *testing.T) {
	t.Setenv("MCP_HTTP_ADDR", "127.0.0.1:9880")
	transport, err := SelectTransport(config.IDEConfig{}.WithDefaults(), false, false)
	if err != nil {
		t.Fatalf("select transport: %v", err)
	}
	if transport.Mode != "http" || transport.Addr != "127.0.0.1:9880" {
		t.Fatalf("expected http env to win, got %#v", transport)
	}
}

func TestTransport_Select_Bad(t *testing.T) {
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Transport.Mode = "http"
	cfg.Ide.Transport.HTTPAddr = "invalid:addr:port"
	if _, err := SelectTransport(cfg, false, true); err == nil {
		t.Fatal("expected invalid transport address error")
	}
}

func TestTransport_Select_Ugly(t *testing.T) {
	t.Setenv("MCP_HTTP_ADDR", "127.0.0.1:9880")
	t.Setenv("MCP_ADDR", "127.0.0.1:9100")
	transport, err := SelectTransport(config.IDEConfig{}.WithDefaults(), false, false)
	if err != nil {
		t.Fatalf("select transport: %v", err)
	}
	if transport.Mode != "http" {
		t.Fatalf("expected HTTP precedence, got %#v", transport)
	}
}

func TestTransport_Select_ConfigWinsWhenPreferred_Good(t *testing.T) {
	t.Setenv("MCP_HTTP_ADDR", "127.0.0.1:9880")
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Transport.Mode = "http"
	cfg.Ide.Transport.HTTPAddr = "127.0.0.1:9999"
	transport, err := SelectTransport(cfg, false, true)
	if err != nil {
		t.Fatalf("select transport: %v", err)
	}
	if transport.Mode != "http" || transport.Addr != "127.0.0.1:9999" {
		t.Fatalf("expected configured transport to win, got %#v", transport)
	}
}

func TestTransport_SelectRelay_Good(t *testing.T) {
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Subagent.Relay.Addr = "127.0.0.1:9882"
	relay := SelectRelayTransport(cfg, "token", http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	if !relay.Enabled || relay.Addr != "127.0.0.1:9882" || relay.Path != "/subagent" {
		t.Fatalf("expected enabled relay transport, got %#v", relay)
	}
}

func TestTransport_SelectRelay_Bad(t *testing.T) {
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Subagent.Relay.Addr = "127.0.0.1:9882"
	relay := SelectRelayTransport(cfg, "", http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	if relay.Enabled {
		t.Fatalf("expected relay to stay disabled without token, got %#v", relay)
	}
}
