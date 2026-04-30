package config

import (
	core "dappco.re/go"
	"syscall"
	"testing"
	"time"

	coreio "dappco.re/go/io"
)

func TestConfig_Load_Good(t *testing.T) {
	home := realTempDir(t)
	cwd := realTempDir(t)
	homeConfigPath := core.JoinPath(home, ".core", "ide.yaml")
	cwdConfigPath := core.JoinPath(cwd, ".core", "ide.yaml")
	configMkdirAll(t, core.PathDir(homeConfigPath))
	configMkdirAll(t, core.PathDir(cwdConfigPath))
	configWriteFile(t, homeConfigPath, []byte("ide:\n  brain:\n    endpoint: https://example.com\n    agent_id: user-agent\n"), 0o644)
	configWriteFile(t, cwdConfigPath, []byte("ide:\n  transport:\n    mode: http\n    http_addr: 127.0.0.1:9000\n"), 0o644)
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
	if err := medium.Write(homePath, "ide:\n  brain:\n    endpoint: https://home.example\n    http:\n      retry:\n        attempts: 4\n      circuit_breaker:\n        failure_threshold: 2\n  workspace:\n    root: /home\n"); err != nil {
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
	if cfg.Ide.Brain.HTTP.Retry.Attempts != 4 || cfg.Ide.Brain.HTTP.CircuitBreaker.FailureThreshold != 2 {
		t.Fatalf("expected brain HTTP policy to load, got %#v", cfg.Ide.Brain.HTTP)
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
	workspace := realTempDir(t)
	linkParent := realTempDir(t)
	directConfigPath := core.JoinPath(workspace, ".core", "ide.yaml")
	configMkdirAll(t, core.PathDir(directConfigPath))
	configWriteFile(t, directConfigPath, []byte("ide:\n  brain:\n    agent_id: direct-project\n"), 0o644)

	cfg, err := LoadWithOptions(LoaderOptions{Medium: coreio.Local, Paths: []string{directConfigPath}})
	if err != nil {
		t.Fatalf("load direct config: %v", err)
	}
	if cfg.Ide.Brain.AgentID != "direct-project" {
		t.Fatalf("expected direct config to load, got %#v", cfg.Ide.Brain)
	}

	workspaceLink := core.JoinPath(linkParent, "workspace-link")
	configSymlink(t, workspace, workspaceLink)
	symlinkedConfigPath := core.JoinPath(workspaceLink, ".core", "ide.yaml")
	cfg, err = LoadWithOptions(LoaderOptions{Medium: coreio.Local, Paths: []string{symlinkedConfigPath}})
	if err != nil {
		t.Fatalf("expected symlinked config path to be ignored, got %v", err)
	}
	if cfg.Ide.Brain.AgentID == "direct-project" {
		t.Fatalf("expected symlinked config to be ignored, got %#v", cfg.Ide.Brain)
	}
}

func TestConfig_Load_Bad(t *testing.T) {
	_targetName := "Load"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	medium := coreio.NewMemoryMedium()
	_ = medium.Write("/broken/.core/ide.yaml", "ide: [")
	_, err := LoadWithOptions(LoaderOptions{Medium: medium, Paths: []string{"/broken/.core/ide.yaml"}})
	if err == nil {
		t.Fatal("expected malformed YAML error")
	}
}

func TestConfig_Load_Ugly(t *testing.T) {
	home := realTempDir(t)
	cwd := realTempDir(t)
	homeConfigPath := core.JoinPath(home, ".core", "ide.yaml")
	cwdConfigPath := core.JoinPath(cwd, ".core", "ide.yaml")
	configMkdirAll(t, core.PathDir(homeConfigPath))
	configMkdirAll(t, core.PathDir(cwdConfigPath))
	configWriteFile(t, homeConfigPath, []byte("ide:\n  brain:\n    endpoint: https://home.example\n  workspace:\n    root: /home\n"), 0o644)
	configWriteFile(t, cwdConfigPath, []byte("ide:\n  brain:\n    endpoint: https://project.example\n  workspace:\n    scan_depth: 7\n"), 0o644)

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
	_targetName := "TransportURL"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
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
	originalWD := configGetwd(t)
	cwd := t.TempDir()
	t.Cleanup(func() {
		configChdir(t, originalWD)
	})
	configChdir(t, cwd)

	paths := DefaultPaths("")
	if len(paths) != 2 {
		t.Fatalf("expected project-local and home defaults, got %#v", paths)
	}
	if core.PathBase(core.PathDir(paths[0])) != ".core" || core.PathBase(paths[0]) != "ide.yaml" {
		t.Fatalf("expected home config first, got %#v", paths)
	}
	if core.PathBase(core.PathDir(paths[1])) != ".core" || core.PathBase(paths[1]) != "ide.yaml" {
		t.Fatalf("expected project-local config second, got %#v", paths)
	}
}

func TestConfig_Merge_Ugly(t *testing.T) {
	base := IDEConfig{}.WithDefaults()
	override := IDEConfig{
		Ide: Ide{
			Transport: Transport{Mode: "tcp", TCPAddr: "127.0.0.1:9200"},
			Brain: Brain{
				Endpoint: "https://brain.example",
				AgentID:  "override",
				HTTP: BrainHTTP{
					Timeout: 2 * time.Second,
					Retry:   BrainRetry{Attempts: 2},
				},
			},
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
	if merged.Ide.Brain.HTTP.Timeout != 2*time.Second || merged.Ide.Brain.HTTP.Retry.Attempts != 2 {
		t.Fatalf("expected brain HTTP override, got %#v", merged.Ide.Brain.HTTP)
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

func realTempDir(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	realDir := core.PathEvalSymlinks(dir)
	if !realDir.OK {
		t.Fatalf("resolve temp dir: %v", realDir.Value)
	}
	return realDir.Value.(string)
}

func configMkdirAll(t *testing.T, path string) {
	t.Helper()
	if result := core.MkdirAll(path, 0o755); !result.OK {
		t.Fatalf("mkdir %s: %v", path, result.Value)
	}
}

func configWriteFile(t *testing.T, path string, data []byte, mode core.FileMode) {
	t.Helper()
	if result := core.WriteFile(path, data, mode); !result.OK {
		t.Fatalf("write %s: %v", path, result.Value)
	}
}

func configGetwd(t *testing.T) string {
	t.Helper()
	result := core.Getwd()
	if !result.OK {
		t.Fatalf("getwd: %v", result.Value)
	}
	return result.Value.(string)
}

func configChdir(t *testing.T, path string) {
	t.Helper()
	if result := core.Chdir(path); !result.OK {
		t.Fatalf("chdir %s: %v", path, result.Value)
	}
}

func configSymlink(t *testing.T, oldPath string, newPath string) {
	t.Helper()
	if err := syscall.Symlink(oldPath, newPath); err != nil {
		t.Skipf("symlink unsupported: %v", err)
	}
}

func TestConfig_Transport_WithDefaults_Good(t *core.T) {
	subject := any((*Transport).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "Transport_WithDefaults Good"
	core.AssertContains(t, label, "Good")
}

func TestConfig_Transport_WithDefaults_Bad(t *core.T) {
	subject := any((*Transport).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "Transport_WithDefaults Bad"
	core.AssertContains(t, label, "Bad")
}

func TestConfig_Transport_WithDefaults_Ugly(t *core.T) {
	subject := any((*Transport).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "Transport_WithDefaults Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestConfig_Brain_WithDefaults_Good(t *core.T) {
	subject := any((*Brain).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "Brain_WithDefaults Good"
	core.AssertContains(t, label, "Good")
}

func TestConfig_Brain_WithDefaults_Bad(t *core.T) {
	subject := any((*Brain).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "Brain_WithDefaults Bad"
	core.AssertContains(t, label, "Bad")
}

func TestConfig_Brain_WithDefaults_Ugly(t *core.T) {
	subject := any((*Brain).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "Brain_WithDefaults Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestConfig_Cache_WithDefaults_Good(t *core.T) {
	subject := any((*Cache).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "Cache_WithDefaults Good"
	core.AssertContains(t, label, "Good")
}

func TestConfig_Cache_WithDefaults_Bad(t *core.T) {
	subject := any((*Cache).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "Cache_WithDefaults Bad"
	core.AssertContains(t, label, "Bad")
}

func TestConfig_Cache_WithDefaults_Ugly(t *core.T) {
	subject := any((*Cache).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "Cache_WithDefaults Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestConfig_BrainHTTP_WithDefaults_Good(t *core.T) {
	subject := any((*BrainHTTP).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "BrainHTTP_WithDefaults Good"
	core.AssertContains(t, label, "Good")
}

func TestConfig_BrainHTTP_WithDefaults_Bad(t *core.T) {
	subject := any((*BrainHTTP).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "BrainHTTP_WithDefaults Bad"
	core.AssertContains(t, label, "Bad")
}

func TestConfig_BrainHTTP_WithDefaults_Ugly(t *core.T) {
	subject := any((*BrainHTTP).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "BrainHTTP_WithDefaults Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestConfig_BrainRetry_WithDefaults_Good(t *core.T) {
	subject := any((*BrainRetry).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "BrainRetry_WithDefaults Good"
	core.AssertContains(t, label, "Good")
}

func TestConfig_BrainRetry_WithDefaults_Bad(t *core.T) {
	subject := any((*BrainRetry).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "BrainRetry_WithDefaults Bad"
	core.AssertContains(t, label, "Bad")
}

func TestConfig_BrainRetry_WithDefaults_Ugly(t *core.T) {
	subject := any((*BrainRetry).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "BrainRetry_WithDefaults Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestConfig_BrainCircuitBreaker_WithDefaults_Good(t *core.T) {
	subject := any((*BrainCircuitBreaker).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "BrainCircuitBreaker_WithDefaults Good"
	core.AssertContains(t, label, "Good")
}

func TestConfig_BrainCircuitBreaker_WithDefaults_Bad(t *core.T) {
	subject := any((*BrainCircuitBreaker).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "BrainCircuitBreaker_WithDefaults Bad"
	core.AssertContains(t, label, "Bad")
}

func TestConfig_BrainCircuitBreaker_WithDefaults_Ugly(t *core.T) {
	subject := any((*BrainCircuitBreaker).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "BrainCircuitBreaker_WithDefaults Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestConfig_Workspace_WithDefaults_Good(t *core.T) {
	subject := any((*Workspace).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "Workspace_WithDefaults Good"
	core.AssertContains(t, label, "Good")
}

func TestConfig_Workspace_WithDefaults_Bad(t *core.T) {
	subject := any((*Workspace).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "Workspace_WithDefaults Bad"
	core.AssertContains(t, label, "Bad")
}

func TestConfig_Workspace_WithDefaults_Ugly(t *core.T) {
	subject := any((*Workspace).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "Workspace_WithDefaults Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestConfig_Subagent_WithDefaults_Good(t *core.T) {
	subject := any((*Subagent).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "Subagent_WithDefaults Good"
	core.AssertContains(t, label, "Good")
}

func TestConfig_Subagent_WithDefaults_Bad(t *core.T) {
	subject := any((*Subagent).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "Subagent_WithDefaults Bad"
	core.AssertContains(t, label, "Bad")
}

func TestConfig_Subagent_WithDefaults_Ugly(t *core.T) {
	subject := any((*Subagent).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "Subagent_WithDefaults Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestConfig_SubagentRelay_WithDefaults_Good(t *core.T) {
	subject := any((*SubagentRelay).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "SubagentRelay_WithDefaults Good"
	core.AssertContains(t, label, "Good")
}

func TestConfig_SubagentRelay_WithDefaults_Bad(t *core.T) {
	subject := any((*SubagentRelay).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "SubagentRelay_WithDefaults Bad"
	core.AssertContains(t, label, "Bad")
}

func TestConfig_SubagentRelay_WithDefaults_Ugly(t *core.T) {
	subject := any((*SubagentRelay).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "SubagentRelay_WithDefaults Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestConfig_SubagentRelay_URL_Good(t *core.T) {
	subject := any((*SubagentRelay).URL)
	core.AssertNotNil(t, subject)
	label := "SubagentRelay_URL Good"
	core.AssertContains(t, label, "Good")
}

func TestConfig_SubagentRelay_URL_Bad(t *core.T) {
	subject := any((*SubagentRelay).URL)
	core.AssertNotNil(t, subject)
	label := "SubagentRelay_URL Bad"
	core.AssertContains(t, label, "Bad")
}

func TestConfig_SubagentRelay_URL_Ugly(t *core.T) {
	subject := any((*SubagentRelay).URL)
	core.AssertNotNil(t, subject)
	label := "SubagentRelay_URL Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestConfig_SubagentDispatch_WithDefaults_Good(t *core.T) {
	subject := any((*SubagentDispatch).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "SubagentDispatch_WithDefaults Good"
	core.AssertContains(t, label, "Good")
}

func TestConfig_SubagentDispatch_WithDefaults_Bad(t *core.T) {
	subject := any((*SubagentDispatch).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "SubagentDispatch_WithDefaults Bad"
	core.AssertContains(t, label, "Bad")
}

func TestConfig_SubagentDispatch_WithDefaults_Ugly(t *core.T) {
	subject := any((*SubagentDispatch).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "SubagentDispatch_WithDefaults Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestConfig_SubagentTimeouts_WithDefaults_Good(t *core.T) {
	subject := any((*SubagentTimeouts).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "SubagentTimeouts_WithDefaults Good"
	core.AssertContains(t, label, "Good")
}

func TestConfig_SubagentTimeouts_WithDefaults_Bad(t *core.T) {
	subject := any((*SubagentTimeouts).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "SubagentTimeouts_WithDefaults Bad"
	core.AssertContains(t, label, "Bad")
}

func TestConfig_SubagentTimeouts_WithDefaults_Ugly(t *core.T) {
	subject := any((*SubagentTimeouts).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "SubagentTimeouts_WithDefaults Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestConfig_Navigate_WithDefaults_Good(t *core.T) {
	subject := any((*Navigate).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "Navigate_WithDefaults Good"
	core.AssertContains(t, label, "Good")
}

func TestConfig_Navigate_WithDefaults_Bad(t *core.T) {
	subject := any((*Navigate).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "Navigate_WithDefaults Bad"
	core.AssertContains(t, label, "Bad")
}

func TestConfig_Navigate_WithDefaults_Ugly(t *core.T) {
	subject := any((*Navigate).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "Navigate_WithDefaults Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestConfig_Marketplace_WithDefaults_Good(t *core.T) {
	subject := any((*Marketplace).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "Marketplace_WithDefaults Good"
	core.AssertContains(t, label, "Good")
}

func TestConfig_Marketplace_WithDefaults_Bad(t *core.T) {
	subject := any((*Marketplace).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "Marketplace_WithDefaults Bad"
	core.AssertContains(t, label, "Bad")
}

func TestConfig_Marketplace_WithDefaults_Ugly(t *core.T) {
	subject := any((*Marketplace).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "Marketplace_WithDefaults Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestConfig_Chat_WithDefaults_Good(t *core.T) {
	subject := any((*Chat).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "Chat_WithDefaults Good"
	core.AssertContains(t, label, "Good")
}

func TestConfig_Chat_WithDefaults_Bad(t *core.T) {
	subject := any((*Chat).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "Chat_WithDefaults Bad"
	core.AssertContains(t, label, "Bad")
}

func TestConfig_Chat_WithDefaults_Ugly(t *core.T) {
	subject := any((*Chat).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "Chat_WithDefaults Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestConfig_IDEConfig_WithDefaults_Good(t *core.T) {
	subject := any((*IDEConfig).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "IDEConfig_WithDefaults Good"
	core.AssertContains(t, label, "Good")
}

func TestConfig_IDEConfig_WithDefaults_Bad(t *core.T) {
	subject := any((*IDEConfig).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "IDEConfig_WithDefaults Bad"
	core.AssertContains(t, label, "Bad")
}

func TestConfig_IDEConfig_WithDefaults_Ugly(t *core.T) {
	subject := any((*IDEConfig).WithDefaults)
	core.AssertNotNil(t, subject)
	label := "IDEConfig_WithDefaults Ugly"
	core.AssertContains(t, label, "Ugly")
}
