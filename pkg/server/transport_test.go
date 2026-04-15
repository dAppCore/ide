package server

import (
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
	cfg.Ide.Transport.Mode = "unix"
	cfg.Ide.Transport.UnixSocket = ""
	transport, err := SelectTransport(cfg, false, false)
	if err != nil {
		t.Fatalf("select transport: %v", err)
	}
	if transport.Mode != "unix" {
		t.Fatalf("expected configured unix mode, got %#v", transport)
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
