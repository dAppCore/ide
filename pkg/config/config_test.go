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

func TestConfig_TransportURL_Good(t *testing.T) {
	cases := []struct {
		name     string
		relay    SubagentRelay
		expected string
	}{
		{name: "default ws", relay: SubagentRelay{Addr: "127.0.0.1:9882"}, expected: "ws://127.0.0.1:9882/subagent"},
		{name: "http becomes ws", relay: SubagentRelay{Addr: "http://127.0.0.1:9882", Path: "relay"}, expected: "ws://127.0.0.1:9882/relay"},
		{name: "https becomes wss", relay: SubagentRelay{Addr: "https://example.com", Path: "/subagent"}, expected: "wss://example.com/subagent"},
		{name: "blank addr", relay: SubagentRelay{}, expected: ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.relay.URL(); got != tc.expected {
				t.Fatalf("expected %q, got %q", tc.expected, got)
			}
		})
	}
}

func TestConfig_DefaultPaths_Good(t *testing.T) {
	paths := DefaultPaths("/custom/ide.yaml")
	if len(paths) != 1 || paths[0] != "/custom/ide.yaml" {
		t.Fatalf("expected explicit config path to win, got %#v", paths)
	}
}

func TestConfig_Merge_Ugly(t *testing.T) {
	base := IDEConfig{}.WithDefaults()
	override := IDEConfig{
		Ide: Ide{
			Transport: Transport{Mode: "tcp", TCPAddr: "127.0.0.1:9200"},
			Brain:     Brain{Endpoint: "https://brain.example", AgentID: "override"},
			Workspace: Workspace{Root: "/workspace", ScanDepth: 7},
			Chat:      Chat{Enabled: BoolPtr(false), APIURL: "http://localhost:3000"},
		},
	}
	merged := base.Merge(override)
	if merged.Ide.Transport.Mode != "tcp" || merged.Ide.Transport.TCPAddr != "127.0.0.1:9200" {
		t.Fatalf("expected transport override, got %#v", merged.Ide.Transport)
	}
	if merged.Ide.Brain.Endpoint != "https://brain.example" || merged.Ide.Brain.AgentID != "override" {
		t.Fatalf("expected brain override, got %#v", merged.Ide.Brain)
	}
	if merged.Ide.Workspace.Root != "/workspace" || merged.Ide.Workspace.ScanDepth != 7 {
		t.Fatalf("expected workspace override, got %#v", merged.Ide.Workspace)
	}
	if BoolValue(merged.Ide.Chat.Enabled, true) {
		t.Fatalf("expected chat disable override, got %#v", merged.Ide.Chat)
	}
}

func TestConfig_ApplyEnv_Good(t *testing.T) {
	t.Setenv("CORE_BRAIN_URL", "https://brain.example")
	t.Setenv("CORE_BRAIN_KEY", "secret")
	t.Setenv("CORE_BRAIN_AGENT_ID", "agent-7")
	t.Setenv("MCP_HTTP_ADDR", "127.0.0.1:9880")
	t.Setenv("CORE_IDE_TOKEN", "token")

	cfg := IDEConfig{}
	ApplyEnv(&cfg)

	if cfg.Ide.Brain.Endpoint != "https://brain.example" || cfg.Ide.Brain.Key != "secret" || cfg.Ide.Brain.AgentID != "agent-7" {
		t.Fatalf("expected brain env overrides, got %#v", cfg.Ide.Brain)
	}
	if cfg.Ide.Transport.Mode != "http" || cfg.Ide.Transport.HTTPAddr != "127.0.0.1:9880" || cfg.Ide.Transport.Token != "token" {
		t.Fatalf("expected transport env overrides, got %#v", cfg.Ide.Transport)
	}
}

func TestConfig_BoolValue_Good(t *testing.T) {
	if got := BoolValue(nil, true); !got {
		t.Fatal("expected fallback bool value")
	}
	value := false
	if got := BoolValue(&value, true); got {
		t.Fatal("expected explicit bool value to win")
	}
}
