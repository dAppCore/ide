package config

import (
	"testing"

	core "dappco.re/go/core"
	coreio "dappco.re/go/core/io"
)

func TestConfig_Load_Good(t *testing.T) {
	medium := coreio.NewMemoryMedium()
	_ = medium.Write("/home/test/.core/ide.yaml", "ide:\n  brain:\n    endpoint: https://example.com\n")
	_ = medium.Write("/workspace/.core/ide.yaml", "ide:\n  transport:\n    mode: http\n    http_addr: 127.0.0.1:9000\n")
	t.Setenv("DIR_HOME", "/home/test")

	cfg, err := LoadWithOptions(LoaderOptions{
		Medium: medium,
		Paths:  []string{"/home/test/.core/ide.yaml", "/workspace/.core/ide.yaml"},
	})
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Ide.Brain.Endpoint != "https://example.com" {
		t.Fatalf("expected merged brain endpoint, got %q", cfg.Ide.Brain.Endpoint)
	}
	if cfg.Ide.Transport.HTTPAddr != "127.0.0.1:9000" {
		t.Fatalf("expected project override http addr, got %q", cfg.Ide.Transport.HTTPAddr)
	}
}

func TestConfig_Load_Bad(t *testing.T) {
	medium := coreio.NewMemoryMedium()
	_ = medium.Write("/broken/.core/ide.yaml", "ide: [")
	_, err := LoadWithOptions(LoaderOptions{Medium: medium, Paths: []string{"/broken/.core/ide.yaml"}})
	if err == nil {
		t.Fatal("expected malformed YAML error")
	}
}

func TestConfig_Load_Ugly(t *testing.T) {
	cfg := IDEConfig{}.WithDefaults()
	ApplyCLIOverrides(&cfg, CLIOverrides{TransportMode: "http", HTTPAddr: "127.0.0.1:9888", Token: "abc"})
	if cfg.Ide.Transport.Mode != "http" || cfg.Ide.Transport.HTTPAddr != "127.0.0.1:9888" {
		t.Fatalf("expected CLI override to win, got %s %s", cfg.Ide.Transport.Mode, cfg.Ide.Transport.HTTPAddr)
	}
	if cfg.Ide.Chat.StorePath != core.JoinPath(core.Env("DIR_HOME"), ".core", "ide", "chat.db") && cfg.Ide.Chat.StorePath == "" {
		t.Fatal("expected default chat store path")
	}
}
