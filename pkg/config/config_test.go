package config

import (
	"os"
	"path/filepath"
	"testing"

	coreio "dappco.re/go/io"
)

func TestConfig_Load_Good(t *testing.T) {
	home := t.TempDir()
	cwd := t.TempDir()
	homeConfigPath := filepath.Join(home, ".core", "ide.yaml")
	cwdConfigPath := filepath.Join(cwd, ".core", "ide.yaml")
	if err := os.MkdirAll(filepath.Dir(homeConfigPath), 0o755); err != nil {
		t.Fatalf("mkdir home config: %v", err)
	}
	if err := os.MkdirAll(filepath.Dir(cwdConfigPath), 0o755); err != nil {
		t.Fatalf("mkdir cwd config: %v", err)
	}
	if err := os.WriteFile(homeConfigPath, []byte("ide:\n  brain:\n    endpoint: https://example.com\n    agent_id: user-agent\n"), 0o644); err != nil {
		t.Fatalf("write home config: %v", err)
	}
	if err := os.WriteFile(cwdConfigPath, []byte("ide:\n  transport:\n    mode: http\n    http_addr: 127.0.0.1:9000\n"), 0o644); err != nil {
		t.Fatalf("write cwd config: %v", err)
	}
	cfg, err := Load(homeConfigPath, cwdConfigPath)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Ide.Brain.Endpoint != "https://example.com" {
		t.Fatalf("expected merged brain endpoint, got %q", cfg.Ide.Brain.Endpoint)
	}
	if cfg.Ide.Brain.AgentID != "user-agent" {
		t.Fatalf("expected merged user brain agent id, got %q", cfg.Ide.Brain.AgentID)
	}
	if cfg.Ide.Transport.HTTPAddr != "127.0.0.1:9000" {
		t.Fatalf("expected project override http addr, got %q", cfg.Ide.Transport.HTTPAddr)
	}
}

func TestConfig_LoadWithOptions_Good(t *testing.T) {
	medium := coreio.NewMemoryMedium()
	homePath := "/home/.core/ide.yaml"
	projectPath := "/workspace/.core/ide.yaml"
	if err := medium.Write(homePath, "ide:\n  brain:\n    endpoint: https://home.example\n  workspace:\n    root: /home\n"); err != nil {
		t.Fatalf("write home config: %v", err)
	}
	if err := medium.Write(projectPath, "ide:\n  brain:\n    agent_id: project-agent\n  workspace:\n    scan_depth: 7\n"); err != nil {
		t.Fatalf("write project config: %v", err)
	}
	t.Setenv("CORE_BRAIN_URL", "https://env.example")
	t.Setenv("MCP_HTTP_ADDR", "127.0.0.1:9777")
	t.Setenv("CORE_IDE_TOKEN", "env-token")

	cfg, err := LoadWithOptions(LoaderOptions{Medium: medium, Paths: []string{homePath, projectPath}})
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Ide.Brain.Endpoint != "https://env.example" {
		t.Fatalf("expected env override to win, got %q", cfg.Ide.Brain.Endpoint)
	}
	if cfg.Ide.Brain.AgentID != "project-agent" {
		t.Fatalf("expected project override to win, got %q", cfg.Ide.Brain.AgentID)
	}
	if cfg.Ide.Transport.Mode != "http" || cfg.Ide.Transport.HTTPAddr != "127.0.0.1:9777" || cfg.Ide.Transport.Token != "env-token" {
		t.Fatalf("expected env transport overrides, got %#v", cfg.Ide.Transport)
	}
	if cfg.Ide.Workspace.Root != "/home" || cfg.Ide.Workspace.ScanDepth != 7 {
		t.Fatalf("expected file merge to preserve unrelated fields, got %#v", cfg.Ide.Workspace)
	}
}

func TestConfig_LoadWithOptions_Bad(t *testing.T) {
	medium := coreio.NewMemoryMedium()
	_ = medium.Write("/broken/.core/ide.yaml", "ide: [")
	_, err := LoadWithOptions(LoaderOptions{Medium: medium, Paths: []string{"/broken/.core/ide.yaml"}})
	if err == nil {
		t.Fatal("expected malformed YAML error")
	}
}

func TestConfig_LoadWithOptions_Ugly(t *testing.T) {
	medium := coreio.NewMemoryMedium()
	_ = medium.Write("/home/.core/ide.yaml", "ide:\n  workspace:\n    root: /home\n")
	_ = medium.Write("/workspace/.core/ide.yaml", "ide:\n  workspace:\n    scan_depth: 9\n")

	cfg, err := LoadWithOptions(LoaderOptions{
		Medium: medium,
		Paths:  []string{"", "/missing/.core/ide.yaml", "/home/.core/ide.yaml", "/workspace/.core/ide.yaml"},
	})
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Ide.Workspace.Root != "/home" || cfg.Ide.Workspace.ScanDepth != 9 {
		t.Fatalf("expected missing paths to be skipped and later files to win, got %#v", cfg.Ide.Workspace)
	}
}

func TestConfig_LoadWithOptions_UglySymlinkedPath(t *testing.T) {
	home := t.TempDir()
	workspace := t.TempDir()
	realCore := t.TempDir()
	homeConfigPath := filepath.Join(home, ".core", "ide.yaml")
	projectConfigPath := filepath.Join(workspace, ".core", "ide.yaml")

	if err := os.MkdirAll(filepath.Dir(homeConfigPath), 0o755); err != nil {
		t.Fatalf("mkdir home config: %v", err)
	}
	if err := os.MkdirAll(realCore, 0o755); err != nil {
		t.Fatalf("mkdir real core: %v", err)
	}
	if err := os.WriteFile(homeConfigPath, []byte("ide:\n  brain:\n    endpoint: https://home.example\n"), 0o644); err != nil {
		t.Fatalf("write home config: %v", err)
	}
	if err := os.WriteFile(filepath.Join(realCore, "ide.yaml"), []byte("ide:\n  brain:\n    agent_id: symlinked-project\n"), 0o644); err != nil {
		t.Fatalf("write project config: %v", err)
	}
	if err := os.Symlink(realCore, filepath.Join(workspace, ".core")); err != nil {
		t.Skipf("symlink unsupported: %v", err)
	}

	cfg, err := LoadWithOptions(LoaderOptions{Medium: coreio.Local, Paths: []string{homeConfigPath, projectConfigPath}})
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Ide.Brain.Endpoint != "https://home.example" {
		t.Fatalf("expected regular config to load, got %#v", cfg.Ide.Brain)
	}
	if cfg.Ide.Brain.AgentID == "symlinked-project" {
		t.Fatalf("expected symlinked project config to be ignored, got %#v", cfg.Ide.Brain)
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
	home := t.TempDir()
	cwd := t.TempDir()
	homeConfigPath := filepath.Join(home, ".core", "ide.yaml")
	cwdConfigPath := filepath.Join(cwd, ".core", "ide.yaml")
	if err := os.MkdirAll(filepath.Dir(homeConfigPath), 0o755); err != nil {
		t.Fatalf("mkdir home config: %v", err)
	}
	if err := os.MkdirAll(filepath.Dir(cwdConfigPath), 0o755); err != nil {
		t.Fatalf("mkdir cwd config: %v", err)
	}
	if err := os.WriteFile(homeConfigPath, []byte("ide:\n  brain:\n    endpoint: https://home.example\n  workspace:\n    root: /home\n"), 0o644); err != nil {
		t.Fatalf("write home config: %v", err)
	}
	if err := os.WriteFile(cwdConfigPath, []byte("ide:\n  brain:\n    endpoint: https://project.example\n  workspace:\n    scan_depth: 7\n"), 0o644); err != nil {
		t.Fatalf("write cwd config: %v", err)
	}

	t.Setenv("CORE_BRAIN_URL", "https://env.example")
	t.Setenv("MCP_HTTP_ADDR", "127.0.0.1:9777")
	t.Setenv("CORE_IDE_TOKEN", "env-token")

	cfg, err := Load(homeConfigPath, cwdConfigPath)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if cfg.Ide.Brain.Endpoint != "https://env.example" {
		t.Fatalf("expected env override to win over file values, got %q", cfg.Ide.Brain.Endpoint)
	}
	if cfg.Ide.Transport.Mode != "http" || cfg.Ide.Transport.HTTPAddr != "127.0.0.1:9777" || cfg.Ide.Transport.Token != "env-token" {
		t.Fatalf("expected env transport overrides, got %#v", cfg.Ide.Transport)
	}
	if cfg.Ide.Workspace.Root != "/home" || cfg.Ide.Workspace.ScanDepth != 7 {
		t.Fatalf("expected merged file values to survive env overrides, got %#v", cfg.Ide.Workspace)
	}

	cfg = cfg.ApplyFlags(CLIOverrides{
		TransportMode: "tcp",
		TCPAddr:       "127.0.0.1:9555",
		Token:         "cli-token",
		BrainEndpoint: "https://flag.example",
		BrainAgentID:  "flag-agent",
	})
	if cfg.Ide.Brain.Endpoint != "https://flag.example" || cfg.Ide.Brain.AgentID != "flag-agent" {
		t.Fatalf("expected CLI overrides to win last, got %#v", cfg.Ide.Brain)
	}
	if cfg.Ide.Transport.Mode != "tcp" || cfg.Ide.Transport.TCPAddr != "127.0.0.1:9555" || cfg.Ide.Transport.Token != "cli-token" {
		t.Fatalf("expected CLI transport overrides to win last, got %#v", cfg.Ide.Transport)
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

func TestConfig_DefaultPaths_Ugly(t *testing.T) {
	originalWD, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	cwd := t.TempDir()
	t.Cleanup(func() {
		_ = os.Chdir(originalWD)
	})
	if err := os.Chdir(cwd); err != nil {
		t.Fatalf("chdir: %v", err)
	}

	paths := DefaultPaths("")
	if len(paths) != 2 {
		t.Fatalf("expected project-local and home defaults, got %#v", paths)
	}
	if filepath.Base(filepath.Dir(paths[0])) != ".core" || filepath.Base(paths[0]) != "ide.yaml" {
		t.Fatalf("expected home config first, got %#v", paths)
	}
	if filepath.Base(filepath.Dir(paths[1])) != ".core" || filepath.Base(paths[1]) != "ide.yaml" {
		t.Fatalf("expected project-local config second, got %#v", paths)
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

func TestConfig_ApplyFlags_Good(t *testing.T) {
	cfg := IDEConfig{}.WithDefaults()
	updated := cfg.ApplyFlags(CLIOverrides{
		TransportMode: "http",
		HTTPAddr:      "127.0.0.1:9999",
		Token:         "token",
		BrainEndpoint: "https://brain.example",
		BrainKey:      "secret",
		BrainAgentID:  "agent-7",
	})
	if updated.Ide.Transport.Mode != "http" || updated.Ide.Transport.HTTPAddr != "127.0.0.1:9999" || updated.Ide.Transport.Token != "token" {
		t.Fatalf("expected transport flags to apply, got %#v", updated.Ide.Transport)
	}
	if updated.Ide.Brain.Endpoint != "https://brain.example" || updated.Ide.Brain.Key != "secret" || updated.Ide.Brain.AgentID != "agent-7" {
		t.Fatalf("expected brain flags to apply, got %#v", updated.Ide.Brain)
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
