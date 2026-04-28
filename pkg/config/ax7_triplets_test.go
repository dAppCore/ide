package config

import core "dappco.re/go"

func TestAX7_Transport_WithDefaults_Good(t *core.T) {
	cfg := Transport{}.WithDefaults()
	core.AssertEqual(t, "stdio", cfg.Mode)
	core.AssertEqual(t, "127.0.0.1:9880", cfg.HTTPAddr)
}

func TestAX7_Transport_WithDefaults_Bad(t *core.T) {
	cfg := Transport{Mode: "http", HTTPAddr: "127.0.0.1:9999"}.WithDefaults()
	core.AssertEqual(t, "http", cfg.Mode)
	core.AssertEqual(t, "127.0.0.1:9999", cfg.HTTPAddr)
}

func TestAX7_Transport_WithDefaults_Ugly(t *core.T) {
	cfg := Transport{UnixSocket: "/tmp/custom.sock"}.WithDefaults()
	core.AssertEqual(t, "/tmp/custom.sock", cfg.UnixSocket)
	core.AssertEqual(t, "127.0.0.1:9100", cfg.TCPAddr)
}

func TestAX7_Brain_WithDefaults_Good(t *core.T) {
	cfg := Brain{}.WithDefaults()
	core.AssertEqual(t, "https://api.lthn.sh", cfg.Endpoint)
	core.AssertEqual(t, "cladius", cfg.AgentID)
}

func TestAX7_Brain_WithDefaults_Bad(t *core.T) {
	cfg := Brain{Endpoint: "https://brain.local", AgentID: "codex"}.WithDefaults()
	core.AssertEqual(t, "https://brain.local", cfg.Endpoint)
	core.AssertEqual(t, "codex", cfg.AgentID)
}

func TestAX7_Brain_WithDefaults_Ugly(t *core.T) {
	cfg := Brain{Cache: Cache{Namespace: "custom"}}.WithDefaults()
	core.AssertEqual(t, "custom", cfg.Cache.Namespace)
	core.AssertEqual(t, 30*core.Second, cfg.HTTP.Timeout)
}

func TestAX7_Cache_WithDefaults_Good(t *core.T) {
	cfg := Cache{}.WithDefaults()
	core.AssertNotNil(t, cfg.Enabled)
	core.AssertTrue(t, *cfg.Enabled)
}

func TestAX7_Cache_WithDefaults_Bad(t *core.T) {
	disabled := false
	cfg := Cache{Enabled: &disabled}.WithDefaults()
	core.AssertNotNil(t, cfg.Enabled)
	core.AssertFalse(t, *cfg.Enabled)
}

func TestAX7_Cache_WithDefaults_Ugly(t *core.T) {
	cfg := Cache{TTL: -1 * core.Second, Namespace: "already-set"}.WithDefaults()
	core.AssertEqual(t, -1*core.Second, cfg.TTL)
	core.AssertEqual(t, "already-set", cfg.Namespace)
}

func TestAX7_BrainHTTP_WithDefaults_Good(t *core.T) {
	cfg := BrainHTTP{}.WithDefaults()
	core.AssertEqual(t, 30*core.Second, cfg.Timeout)
	core.AssertEqual(t, 3, cfg.Retry.Attempts)
}

func TestAX7_BrainHTTP_WithDefaults_Bad(t *core.T) {
	cfg := BrainHTTP{Timeout: 2 * core.Second}.WithDefaults()
	core.AssertEqual(t, 2*core.Second, cfg.Timeout)
	core.AssertEqual(t, 3, cfg.Retry.Attempts)
}

func TestAX7_BrainHTTP_WithDefaults_Ugly(t *core.T) {
	cfg := BrainHTTP{Retry: BrainRetry{Attempts: 99}}.WithDefaults()
	core.AssertEqual(t, 5, cfg.Retry.Attempts)
	core.AssertEqual(t, 30*core.Second, cfg.Timeout)
}

func TestAX7_BrainRetry_WithDefaults_Good(t *core.T) {
	cfg := BrainRetry{}.WithDefaults()
	core.AssertEqual(t, 3, cfg.Attempts)
	core.AssertEqual(t, 100*core.Millisecond, cfg.Backoff)
}

func TestAX7_BrainRetry_WithDefaults_Bad(t *core.T) {
	cfg := BrainRetry{Attempts: -3}.WithDefaults()
	core.AssertEqual(t, 1, cfg.Attempts)
	core.AssertEqual(t, core.Second, cfg.MaxBackoff)
}

func TestAX7_BrainRetry_WithDefaults_Ugly(t *core.T) {
	cfg := BrainRetry{Attempts: 9, Backoff: 3 * core.Second, MaxBackoff: core.Second}.WithDefaults()
	core.AssertEqual(t, 5, cfg.Attempts)
	core.AssertEqual(t, 3*core.Second, cfg.MaxBackoff)
}

func TestAX7_BrainCircuitBreaker_WithDefaults_Good(t *core.T) {
	cfg := BrainCircuitBreaker{}.WithDefaults()
	core.AssertNotNil(t, cfg.Enabled)
	core.AssertEqual(t, 3, cfg.FailureThreshold)
}

func TestAX7_BrainCircuitBreaker_WithDefaults_Bad(t *core.T) {
	cfg := BrainCircuitBreaker{FailureThreshold: -4}.WithDefaults()
	core.AssertEqual(t, 1, cfg.FailureThreshold)
	core.AssertEqual(t, 30*core.Second, cfg.Cooldown)
}

func TestAX7_BrainCircuitBreaker_WithDefaults_Ugly(t *core.T) {
	disabled := false
	cfg := BrainCircuitBreaker{Enabled: &disabled, Cooldown: core.Second}.WithDefaults()
	core.AssertFalse(t, *cfg.Enabled)
	core.AssertEqual(t, core.Second, cfg.Cooldown)
}

func TestAX7_Workspace_WithDefaults_Good(t *core.T) {
	cfg := Workspace{}.WithDefaults()
	core.AssertEqual(t, ".", cfg.Root)
	core.AssertEqual(t, 3, cfg.ScanDepth)
}

func TestAX7_Workspace_WithDefaults_Bad(t *core.T) {
	cfg := Workspace{Root: "/repo", ScanDepth: 7, Ignore: []string{"tmp/"}}.WithDefaults()
	core.AssertEqual(t, "/repo", cfg.Root)
	core.AssertEqual(t, []string{"tmp/"}, cfg.Ignore)
}

func TestAX7_Workspace_WithDefaults_Ugly(t *core.T) {
	cfg := Workspace{ConventionPacks: []string{"go"}}.WithDefaults()
	core.AssertEqual(t, []string{"go"}, cfg.ConventionPacks)
	core.AssertNotEmpty(t, cfg.Ignore)
}

func TestAX7_Subagent_WithDefaults_Good(t *core.T) {
	cfg := Subagent{}.WithDefaults()
	core.AssertNotNil(t, cfg.Enabled)
	core.AssertEqual(t, "127.0.0.1:9882", cfg.Relay.Addr)
}

func TestAX7_Subagent_WithDefaults_Bad(t *core.T) {
	disabled := false
	cfg := Subagent{Enabled: &disabled}.WithDefaults()
	core.AssertFalse(t, *cfg.Enabled)
	core.AssertEqual(t, "codex", cfg.Dispatch.DefaultAgent)
}

func TestAX7_Subagent_WithDefaults_Ugly(t *core.T) {
	cfg := Subagent{Relay: SubagentRelay{Path: "custom"}}.WithDefaults()
	core.AssertEqual(t, "custom", cfg.Relay.Path)
	core.AssertEqual(t, 10*core.Second, cfg.Timeouts.GuideAck)
}

func TestAX7_SubagentRelay_WithDefaults_Good(t *core.T) {
	cfg := SubagentRelay{}.WithDefaults()
	core.AssertEqual(t, "127.0.0.1:9882", cfg.Addr)
	core.AssertEqual(t, "/subagent", cfg.Path)
}

func TestAX7_SubagentRelay_WithDefaults_Bad(t *core.T) {
	cfg := SubagentRelay{Addr: "localhost:1", Path: "/x"}.WithDefaults()
	core.AssertEqual(t, "localhost:1", cfg.Addr)
	core.AssertEqual(t, "/x", cfg.Path)
}

func TestAX7_SubagentRelay_WithDefaults_Ugly(t *core.T) {
	cfg := SubagentRelay{Path: "relative"}.WithDefaults()
	core.AssertEqual(t, "127.0.0.1:9882", cfg.Addr)
	core.AssertEqual(t, "relative", cfg.Path)
}

func TestAX7_SubagentRelay_URL_Good(t *core.T) {
	url := (SubagentRelay{Addr: "127.0.0.1:9882", Path: "/subagent"}).URL()
	core.AssertEqual(t, "ws://127.0.0.1:9882/subagent", url)
	core.AssertContains(t, url, "/subagent")
}

func TestAX7_SubagentRelay_URL_Bad(t *core.T) {
	url := (SubagentRelay{}).URL()
	core.AssertEqual(t, "", url)
	core.AssertEmpty(t, url)
}

func TestAX7_SubagentRelay_URL_Ugly(t *core.T) {
	url := (SubagentRelay{Addr: "https://example.test", Path: "subagent"}).URL()
	core.AssertEqual(t, "wss://example.test/subagent", url)
	core.AssertContains(t, url, "wss://")
}

func TestAX7_SubagentDispatch_WithDefaults_Good(t *core.T) {
	cfg := SubagentDispatch{}.WithDefaults()
	core.AssertEqual(t, "codex", cfg.DefaultAgent)
	core.AssertEqual(t, "coding", cfg.DefaultTemplate)
}

func TestAX7_SubagentDispatch_WithDefaults_Bad(t *core.T) {
	cfg := SubagentDispatch{DefaultAgent: "cladius"}.WithDefaults()
	core.AssertEqual(t, "cladius", cfg.DefaultAgent)
	core.AssertEqual(t, "coding", cfg.DefaultTemplate)
}

func TestAX7_SubagentDispatch_WithDefaults_Ugly(t *core.T) {
	cfg := SubagentDispatch{DefaultTemplate: "review"}.WithDefaults()
	core.AssertEqual(t, "codex", cfg.DefaultAgent)
	core.AssertEqual(t, "review", cfg.DefaultTemplate)
}

func TestAX7_SubagentTimeouts_WithDefaults_Good(t *core.T) {
	cfg := SubagentTimeouts{}.WithDefaults()
	core.AssertEqual(t, 10*core.Second, cfg.GuideAck)
	core.AssertEqual(t, 60*core.Second, cfg.QuestionWaitDefault)
}

func TestAX7_SubagentTimeouts_WithDefaults_Bad(t *core.T) {
	cfg := SubagentTimeouts{GuideAck: core.Second}.WithDefaults()
	core.AssertEqual(t, core.Second, cfg.GuideAck)
	core.AssertEqual(t, 60*core.Second, cfg.QuestionWaitDefault)
}

func TestAX7_SubagentTimeouts_WithDefaults_Ugly(t *core.T) {
	cfg := SubagentTimeouts{QuestionWaitDefault: -1 * core.Second}.WithDefaults()
	core.AssertEqual(t, 10*core.Second, cfg.GuideAck)
	core.AssertEqual(t, -1*core.Second, cfg.QuestionWaitDefault)
}

func TestAX7_Navigate_WithDefaults_Good(t *core.T) {
	cfg := Navigate{}.WithDefaults()
	core.AssertContains(t, core.Join(",", cfg.Routes...), "core://store")
	core.AssertContains(t, core.Join(",", cfg.Routes...), "core://models")
}

func TestAX7_Navigate_WithDefaults_Bad(t *core.T) {
	cfg := Navigate{Routes: []string{"core://custom"}}.WithDefaults()
	core.AssertEqual(t, []string{"core://custom"}, cfg.Routes)
	core.AssertLen(t, cfg.Routes, 1)
}

func TestAX7_Navigate_WithDefaults_Ugly(t *core.T) {
	cfg := Navigate{Routes: []string{""}}.WithDefaults()
	core.AssertEqual(t, []string{""}, cfg.Routes)
	core.AssertLen(t, cfg.Routes, 1)
}

func TestAX7_Marketplace_WithDefaults_Good(t *core.T) {
	cfg := Marketplace{}.WithDefaults()
	core.AssertEqual(t, "https://api.lthn.sh", cfg.Endpoint)
	core.AssertEqual(t, "/v1/marketplace", cfg.APIPath)
}

func TestAX7_Marketplace_WithDefaults_Bad(t *core.T) {
	cfg := Marketplace{Endpoint: "http://market.local", InstallVia: "api"}.WithDefaults()
	core.AssertEqual(t, "http://market.local", cfg.Endpoint)
	core.AssertEqual(t, "api", cfg.InstallVia)
}

func TestAX7_Marketplace_WithDefaults_Ugly(t *core.T) {
	cfg := Marketplace{APIPath: "relative"}.WithDefaults()
	core.AssertEqual(t, "relative", cfg.APIPath)
	core.AssertEqual(t, "go-scm", cfg.InstallVia)
}

func TestAX7_Chat_WithDefaults_Good(t *core.T) {
	cfg := Chat{}.WithDefaults()
	core.AssertNotNil(t, cfg.Enabled)
	core.AssertEqual(t, "http://localhost:8090", cfg.APIURL)
}

func TestAX7_Chat_WithDefaults_Bad(t *core.T) {
	disabled := false
	cfg := Chat{Enabled: &disabled, APIURL: "http://chat.local"}.WithDefaults()
	core.AssertFalse(t, *cfg.Enabled)
	core.AssertEqual(t, "http://chat.local", cfg.APIURL)
}

func TestAX7_Chat_WithDefaults_Ugly(t *core.T) {
	cfg := Chat{StorePath: "/tmp/chat.db", ToolExecutor: "custom"}.WithDefaults()
	core.AssertEqual(t, "/tmp/chat.db", cfg.StorePath)
	core.AssertEqual(t, "custom", cfg.ToolExecutor)
}

func TestAX7_IDEConfig_WithDefaults_Good(t *core.T) {
	cfg := IDEConfig{}.WithDefaults()
	core.AssertEqual(t, "stdio", cfg.Ide.Transport.Mode)
	core.AssertEqual(t, "cladius", cfg.Ide.Brain.AgentID)
}

func TestAX7_IDEConfig_WithDefaults_Bad(t *core.T) {
	cfg := IDEConfig{Ide: Ide{Transport: Transport{Mode: "http"}}}.WithDefaults()
	core.AssertEqual(t, "http", cfg.Ide.Transport.Mode)
	core.AssertEqual(t, "127.0.0.1:9880", cfg.Ide.Transport.HTTPAddr)
}

func TestAX7_IDEConfig_WithDefaults_Ugly(t *core.T) {
	cfg := IDEConfig{Ide: Ide{Navigate: Navigate{Routes: []string{"core://custom"}}}}.WithDefaults()
	core.AssertEqual(t, []string{"core://custom"}, cfg.Ide.Navigate.Routes)
	core.AssertEqual(t, "https://api.lthn.sh", cfg.Ide.Marketplace.Endpoint)
}

func TestAX7_IDEConfig_Merge_Good(t *core.T) {
	base := IDEConfig{}.WithDefaults()
	got := base.Merge(IDEConfig{Ide: Ide{Transport: Transport{Mode: "http"}}})
	core.AssertEqual(t, "http", got.Ide.Transport.Mode)
}

func TestAX7_IDEConfig_Merge_Bad(t *core.T) {
	base := IDEConfig{}.WithDefaults()
	got := base.Merge(IDEConfig{})
	core.AssertEqual(t, base.Ide.Transport.Mode, got.Ide.Transport.Mode)
}

func TestAX7_IDEConfig_Merge_Ugly(t *core.T) {
	base := IDEConfig{}.WithDefaults()
	got := base.Merge(IDEConfig{Ide: Ide{Workspace: Workspace{Ignore: []string{"dist/"}}}})
	core.AssertEqual(t, []string{"dist/"}, got.Ide.Workspace.Ignore)
}

func TestAX7_IDEConfig_ApplyFlags_Good(t *core.T) {
	cfg := IDEConfig{}.WithDefaults().ApplyFlags(CLIOverrides{TransportMode: "http"})
	core.AssertEqual(t, "http", cfg.Ide.Transport.Mode)
	core.AssertEqual(t, "127.0.0.1:9880", cfg.Ide.Transport.HTTPAddr)
}

func TestAX7_IDEConfig_ApplyFlags_Bad(t *core.T) {
	cfg := IDEConfig{}.WithDefaults().ApplyFlags(CLIOverrides{})
	core.AssertEqual(t, "stdio", cfg.Ide.Transport.Mode)
	core.AssertEqual(t, "127.0.0.1:9100", cfg.Ide.Transport.TCPAddr)
}

func TestAX7_IDEConfig_ApplyFlags_Ugly(t *core.T) {
	cfg := IDEConfig{}.WithDefaults().ApplyFlags(CLIOverrides{TransportMode: "  tcp  ", TCPAddr: "  :9101  "})
	core.AssertEqual(t, "tcp", cfg.Ide.Transport.Mode)
	core.AssertEqual(t, ":9101", cfg.Ide.Transport.TCPAddr)
}

func TestAX7_ApplyCLIOverrides_Good(t *core.T) {
	cfg := IDEConfig{}.WithDefaults()
	ApplyCLIOverrides(&cfg, CLIOverrides{BrainEndpoint: "https://brain.local"})
	core.AssertEqual(t, "https://brain.local", cfg.Ide.Brain.Endpoint)
}

func TestAX7_ApplyCLIOverrides_Bad(t *core.T) {
	var cfg *IDEConfig
	ApplyCLIOverrides(cfg, CLIOverrides{TransportMode: "http"})
	core.AssertNil(t, cfg)
}

func TestAX7_ApplyCLIOverrides_Ugly(t *core.T) {
	cfg := IDEConfig{}.WithDefaults()
	ApplyCLIOverrides(&cfg, CLIOverrides{BrainKey: "  secret  ", BrainAgentID: " codex "})
	core.AssertEqual(t, "secret", cfg.Ide.Brain.Key)
	core.AssertEqual(t, "codex", cfg.Ide.Brain.AgentID)
}

func TestAX7_ApplyEnv_Good(t *core.T) {
	t.Setenv("CORE_BRAIN_URL", "https://env-brain.local")
	cfg := IDEConfig{}.WithDefaults()
	ApplyEnv(&cfg)
	core.AssertEqual(t, "https://env-brain.local", cfg.Ide.Brain.Endpoint)
}

func TestAX7_ApplyEnv_Bad(t *core.T) {
	var cfg *IDEConfig
	ApplyEnv(cfg)
	core.AssertNil(t, cfg)
}

func TestAX7_ApplyEnv_Ugly(t *core.T) {
	t.Setenv("MCP_UNIX_SOCKET", "/tmp/env.sock")
	cfg := IDEConfig{}.WithDefaults()
	ApplyEnv(&cfg)
	core.AssertEqual(t, "unix", cfg.Ide.Transport.Mode)
	core.AssertEqual(t, "/tmp/env.sock", cfg.Ide.Transport.UnixSocket)
}

func TestAX7_BoolPtr_Good(t *core.T) {
	value := BoolPtr(true)
	core.AssertNotNil(t, value)
	core.AssertTrue(t, *value)
}

func TestAX7_BoolPtr_Bad(t *core.T) {
	value := BoolPtr(false)
	core.AssertNotNil(t, value)
	core.AssertFalse(t, *value)
}

func TestAX7_BoolPtr_Ugly(t *core.T) {
	value := BoolPtr(true)
	*value = false
	core.AssertFalse(t, *value)
}

func TestAX7_BoolValue_Good(t *core.T) {
	value := true
	got := BoolValue(&value, false)
	core.AssertTrue(t, got)
}

func TestAX7_BoolValue_Bad(t *core.T) {
	got := BoolValue(nil, true)
	core.AssertTrue(t, got)
	core.AssertFalse(t, BoolValue(nil, false))
}

func TestAX7_BoolValue_Ugly(t *core.T) {
	value := false
	got := BoolValue(&value, true)
	core.AssertFalse(t, got)
}

func TestAX7_DefaultPaths_Good(t *core.T) {
	paths := DefaultPaths("/tmp/ide.yaml")
	core.AssertEqual(t, []string{"/tmp/ide.yaml"}, paths)
	core.AssertLen(t, paths, 1)
}

func TestAX7_DefaultPaths_Bad(t *core.T) {
	t.Setenv("DIR_HOME", "")
	paths := DefaultPaths("")
	core.AssertNotEmpty(t, paths)
	core.AssertContains(t, paths[len(paths)-1], ".core/ide.yaml")
}

func TestAX7_DefaultPaths_Ugly(t *core.T) {
	paths := DefaultPaths("  /tmp/spaced.yaml  ")
	core.AssertEqual(t, []string{"  /tmp/spaced.yaml  "}, paths)
	core.AssertLen(t, paths, 1)
}
