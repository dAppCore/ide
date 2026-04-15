package config

import (
	"os"
	"time"

	core "dappco.re/go/core"
	coreio "dappco.re/go/core/io"
	"gopkg.in/yaml.v3"
)

type IDEConfig struct {
	Ide Ide `yaml:"ide"`
}

type Ide struct {
	Transport   Transport   `yaml:"transport"`
	Brain       Brain       `yaml:"brain"`
	Workspace   Workspace   `yaml:"workspace"`
	Subagent    Subagent    `yaml:"subagent"`
	Navigate    Navigate    `yaml:"navigate"`
	Marketplace Marketplace `yaml:"marketplace"`
	Chat        Chat        `yaml:"chat"`
}

type Transport struct {
	Mode       string `yaml:"mode"`
	HTTPAddr   string `yaml:"http_addr"`
	TCPAddr    string `yaml:"tcp_addr"`
	UnixSocket string `yaml:"unix_socket"`
	Token      string `yaml:"token"`
}

func (cfg Transport) WithDefaults() Transport {
	if cfg.Mode == "" {
		cfg.Mode = "stdio"
	}
	if cfg.HTTPAddr == "" {
		cfg.HTTPAddr = "127.0.0.1:9880"
	}
	if cfg.TCPAddr == "" {
		cfg.TCPAddr = "127.0.0.1:9100"
	}
	if cfg.UnixSocket == "" {
		cfg.UnixSocket = "/tmp/core-ide.sock"
	}
	return cfg
}

type Brain struct {
	Endpoint string `yaml:"endpoint"`
	Key      string `yaml:"key"`
	AgentID  string `yaml:"agent_id"`
	Cache    Cache  `yaml:"cache"`
}

func (cfg Brain) WithDefaults() Brain {
	if cfg.Endpoint == "" {
		cfg.Endpoint = "https://api.lthn.sh"
	}
	if cfg.AgentID == "" {
		cfg.AgentID = "cladius"
	}
	cfg.Cache = cfg.Cache.WithDefaults()
	return cfg
}

type Cache struct {
	Enabled   *bool         `yaml:"enabled"`
	TTL       time.Duration `yaml:"ttl"`
	Namespace string        `yaml:"namespace"`
}

func (cfg Cache) WithDefaults() Cache {
	if cfg.Enabled == nil {
		cfg.Enabled = BoolPtr(true)
	}
	if cfg.TTL == 0 {
		cfg.TTL = 5 * time.Minute
	}
	if cfg.Namespace == "" {
		cfg.Namespace = "ide.brain.cache"
	}
	return cfg
}

type Workspace struct {
	Root            string   `yaml:"root"`
	ScanDepth       int      `yaml:"scan_depth"`
	Ignore          []string `yaml:"ignore"`
	ConventionPacks []string `yaml:"convention_packs"`
}

func (cfg Workspace) WithDefaults() Workspace {
	if cfg.Root == "" {
		cfg.Root = "."
	}
	if cfg.ScanDepth == 0 {
		cfg.ScanDepth = 3
	}
	if len(cfg.Ignore) == 0 {
		cfg.Ignore = []string{"node_modules/", "vendor/", ".git/"}
	}
	if len(cfg.ConventionPacks) == 0 {
		cfg.ConventionPacks = []string{"go", "php", "typescript", "python"}
	}
	return cfg
}

type Subagent struct {
	Enabled  *bool            `yaml:"enabled"`
	Relay    SubagentRelay    `yaml:"relay"`
	Dispatch SubagentDispatch `yaml:"dispatch"`
	Timeouts SubagentTimeouts `yaml:"timeouts"`
}

func (cfg Subagent) WithDefaults() Subagent {
	if cfg.Enabled == nil {
		cfg.Enabled = BoolPtr(true)
	}
	cfg.Relay = cfg.Relay.WithDefaults()
	cfg.Dispatch = cfg.Dispatch.WithDefaults()
	cfg.Timeouts = cfg.Timeouts.WithDefaults()
	return cfg
}

type SubagentRelay struct {
	Addr string `yaml:"addr"`
	Path string `yaml:"path"`
}

func (cfg SubagentRelay) WithDefaults() SubagentRelay {
	if cfg.Addr == "" {
		cfg.Addr = "127.0.0.1:9882"
	}
	if cfg.Path == "" {
		cfg.Path = "/subagent"
	}
	return cfg
}

func (relay SubagentRelay) URL() string {
	addr := core.Trim(relay.Addr)
	if addr == "" {
		return ""
	}
	path := core.Trim(relay.Path)
	if path == "" {
		path = "/subagent"
	}
	if !core.HasPrefix(path, "/") {
		path = core.Concat("/", path)
	}
	switch {
	case core.HasPrefix(addr, "ws://"), core.HasPrefix(addr, "wss://"):
		return core.Concat(addr, path)
	case core.HasPrefix(addr, "http://"):
		return core.Concat("ws://", core.TrimPrefix(addr, "http://"), path)
	case core.HasPrefix(addr, "https://"):
		return core.Concat("wss://", core.TrimPrefix(addr, "https://"), path)
	default:
		return core.Concat("ws://", addr, path)
	}
}

type SubagentDispatch struct {
	DefaultAgent    string `yaml:"default_agent"`
	DefaultTemplate string `yaml:"default_template"`
}

func (cfg SubagentDispatch) WithDefaults() SubagentDispatch {
	if cfg.DefaultAgent == "" {
		cfg.DefaultAgent = "codex"
	}
	if cfg.DefaultTemplate == "" {
		cfg.DefaultTemplate = "coding"
	}
	return cfg
}

type SubagentTimeouts struct {
	GuideAck            time.Duration `yaml:"guide_ack"`
	QuestionWaitDefault time.Duration `yaml:"question_wait_default"`
}

func (cfg SubagentTimeouts) WithDefaults() SubagentTimeouts {
	if cfg.GuideAck == 0 {
		cfg.GuideAck = 10 * time.Second
	}
	if cfg.QuestionWaitDefault == 0 {
		cfg.QuestionWaitDefault = 60 * time.Second
	}
	return cfg
}

type Navigate struct {
	Routes []string `yaml:"routes"`
}

func (cfg Navigate) WithDefaults() Navigate {
	if len(cfg.Routes) == 0 {
		cfg.Routes = []string{
			"core://store",
			"core://models",
			"core://agent",
			"core://network",
			"core://settings",
			"core://identity",
			"core://wallet",
		}
	}
	return cfg
}

type Marketplace struct {
	Endpoint   string `yaml:"endpoint"`
	APIPath    string `yaml:"api_path"`
	InstallVia string `yaml:"install_via"`
}

func (cfg Marketplace) WithDefaults() Marketplace {
	if cfg.Endpoint == "" {
		cfg.Endpoint = "https://api.lthn.sh"
	}
	if cfg.APIPath == "" {
		cfg.APIPath = "/v1/marketplace"
	}
	if cfg.InstallVia == "" {
		cfg.InstallVia = "go-scm"
	}
	return cfg
}

type Chat struct {
	Enabled      *bool  `yaml:"enabled"`
	APIURL       string `yaml:"api_url"`
	StorePath    string `yaml:"store_path"`
	ToolExecutor string `yaml:"tool_executor"`
}

func (cfg Chat) WithDefaults() Chat {
	if cfg.Enabled == nil {
		cfg.Enabled = BoolPtr(true)
	}
	if cfg.APIURL == "" {
		cfg.APIURL = "http://localhost:8090"
	}
	if cfg.StorePath == "" {
		cfg.StorePath = core.JoinPath(homeDir(), ".core", "ide", "chat.db")
	}
	if cfg.ToolExecutor == "" {
		cfg.ToolExecutor = "gui_mcp"
	}
	return cfg
}

type LoaderOptions struct {
	Medium coreio.Medium
	Paths  []string
}

type CLIOverrides struct {
	TransportMode string
	HTTPAddr      string
	TCPAddr       string
	UnixSocket    string
	Token         string
	BrainEndpoint string
	BrainKey      string
	BrainAgentID  string
}

func Load(paths ...string) (IDEConfig, error) {
	return LoadWithOptions(LoaderOptions{Paths: paths})
}

func LoadWithOptions(options LoaderOptions) (IDEConfig, error) {
	cfg := IDEConfig{}
	medium := options.Medium
	if medium == nil {
		medium = coreio.Local
	}
	paths := options.Paths
	if len(paths) == 0 {
		paths = DefaultPaths("")
	}
	for index := len(paths) - 1; index >= 0; index-- {
		path := paths[index]
		if core.Trim(path) == "" || !medium.Exists(path) {
			continue
		}
		raw, err := medium.Read(path)
		if err != nil {
			return IDEConfig{}, core.E("ide.config.Load", core.Concat("read ", path), err)
		}
		if err := yaml.Unmarshal([]byte(raw), &cfg); err != nil {
			return IDEConfig{}, core.E("ide.config.Load", core.Concat("parse ", path), err)
		}
	}
	ApplyEnv(&cfg)
	return cfg.WithDefaults(), nil
}

func (cfg IDEConfig) WithDefaults() IDEConfig {
	cfg.Ide.Transport = cfg.Ide.Transport.WithDefaults()
	cfg.Ide.Brain = cfg.Ide.Brain.WithDefaults()
	cfg.Ide.Workspace = cfg.Ide.Workspace.WithDefaults()
	cfg.Ide.Subagent = cfg.Ide.Subagent.WithDefaults()
	cfg.Ide.Navigate = cfg.Ide.Navigate.WithDefaults()
	cfg.Ide.Marketplace = cfg.Ide.Marketplace.WithDefaults()
	cfg.Ide.Chat = cfg.Ide.Chat.WithDefaults()
	return cfg
}

func (cfg IDEConfig) Merge(override IDEConfig) IDEConfig {
	if override.Ide.Transport.Mode != "" || override.Ide.Transport.HTTPAddr != "" || override.Ide.Transport.TCPAddr != "" || override.Ide.Transport.UnixSocket != "" || override.Ide.Transport.Token != "" {
		if override.Ide.Transport.Mode != "" {
			cfg.Ide.Transport.Mode = override.Ide.Transport.Mode
		}
		if override.Ide.Transport.HTTPAddr != "" {
			cfg.Ide.Transport.HTTPAddr = override.Ide.Transport.HTTPAddr
		}
		if override.Ide.Transport.TCPAddr != "" {
			cfg.Ide.Transport.TCPAddr = override.Ide.Transport.TCPAddr
		}
		if override.Ide.Transport.UnixSocket != "" {
			cfg.Ide.Transport.UnixSocket = override.Ide.Transport.UnixSocket
		}
		if override.Ide.Transport.Token != "" {
			cfg.Ide.Transport.Token = override.Ide.Transport.Token
		}
	}
	if override.Ide.Brain.Endpoint != "" {
		cfg.Ide.Brain.Endpoint = override.Ide.Brain.Endpoint
	}
	if override.Ide.Brain.Key != "" {
		cfg.Ide.Brain.Key = override.Ide.Brain.Key
	}
	if override.Ide.Brain.AgentID != "" {
		cfg.Ide.Brain.AgentID = override.Ide.Brain.AgentID
	}
	if override.Ide.Brain.Cache.Enabled != nil {
		cfg.Ide.Brain.Cache.Enabled = override.Ide.Brain.Cache.Enabled
	}
	if override.Ide.Brain.Cache.TTL != 0 {
		cfg.Ide.Brain.Cache.TTL = override.Ide.Brain.Cache.TTL
	}
	if override.Ide.Brain.Cache.Namespace != "" {
		cfg.Ide.Brain.Cache.Namespace = override.Ide.Brain.Cache.Namespace
	}
	if override.Ide.Workspace.Root != "" {
		cfg.Ide.Workspace.Root = override.Ide.Workspace.Root
	}
	if override.Ide.Workspace.ScanDepth != 0 {
		cfg.Ide.Workspace.ScanDepth = override.Ide.Workspace.ScanDepth
	}
	if len(override.Ide.Workspace.Ignore) != 0 {
		cfg.Ide.Workspace.Ignore = append([]string{}, override.Ide.Workspace.Ignore...)
	}
	if len(override.Ide.Workspace.ConventionPacks) != 0 {
		cfg.Ide.Workspace.ConventionPacks = append([]string{}, override.Ide.Workspace.ConventionPacks...)
	}
	if override.Ide.Subagent.Enabled != nil {
		cfg.Ide.Subagent.Enabled = override.Ide.Subagent.Enabled
	}
	if override.Ide.Subagent.Relay.Addr != "" {
		cfg.Ide.Subagent.Relay.Addr = override.Ide.Subagent.Relay.Addr
	}
	if override.Ide.Subagent.Relay.Path != "" {
		cfg.Ide.Subagent.Relay.Path = override.Ide.Subagent.Relay.Path
	}
	if override.Ide.Subagent.Dispatch.DefaultAgent != "" {
		cfg.Ide.Subagent.Dispatch.DefaultAgent = override.Ide.Subagent.Dispatch.DefaultAgent
	}
	if override.Ide.Subagent.Dispatch.DefaultTemplate != "" {
		cfg.Ide.Subagent.Dispatch.DefaultTemplate = override.Ide.Subagent.Dispatch.DefaultTemplate
	}
	if override.Ide.Subagent.Timeouts.GuideAck != 0 {
		cfg.Ide.Subagent.Timeouts.GuideAck = override.Ide.Subagent.Timeouts.GuideAck
	}
	if override.Ide.Subagent.Timeouts.QuestionWaitDefault != 0 {
		cfg.Ide.Subagent.Timeouts.QuestionWaitDefault = override.Ide.Subagent.Timeouts.QuestionWaitDefault
	}
	if len(override.Ide.Navigate.Routes) != 0 {
		cfg.Ide.Navigate.Routes = append([]string{}, override.Ide.Navigate.Routes...)
	}
	if override.Ide.Marketplace.Endpoint != "" {
		cfg.Ide.Marketplace.Endpoint = override.Ide.Marketplace.Endpoint
	}
	if override.Ide.Marketplace.APIPath != "" {
		cfg.Ide.Marketplace.APIPath = override.Ide.Marketplace.APIPath
	}
	if override.Ide.Marketplace.InstallVia != "" {
		cfg.Ide.Marketplace.InstallVia = override.Ide.Marketplace.InstallVia
	}
	if override.Ide.Chat.Enabled != nil {
		cfg.Ide.Chat.Enabled = override.Ide.Chat.Enabled
	}
	if override.Ide.Chat.APIURL != "" {
		cfg.Ide.Chat.APIURL = override.Ide.Chat.APIURL
	}
	if override.Ide.Chat.StorePath != "" {
		cfg.Ide.Chat.StorePath = override.Ide.Chat.StorePath
	}
	if override.Ide.Chat.ToolExecutor != "" {
		cfg.Ide.Chat.ToolExecutor = override.Ide.Chat.ToolExecutor
	}
	return cfg
}

func (cfg IDEConfig) ApplyFlags(overrides CLIOverrides) IDEConfig {
	ApplyCLIOverrides(&cfg, overrides)
	return cfg
}

func ApplyCLIOverrides(cfg *IDEConfig, overrides CLIOverrides) {
	if cfg == nil {
		return
	}
	if core.Trim(overrides.TransportMode) != "" {
		cfg.Ide.Transport.Mode = core.Trim(overrides.TransportMode)
	}
	if core.Trim(overrides.HTTPAddr) != "" {
		cfg.Ide.Transport.HTTPAddr = core.Trim(overrides.HTTPAddr)
	}
	if core.Trim(overrides.TCPAddr) != "" {
		cfg.Ide.Transport.TCPAddr = core.Trim(overrides.TCPAddr)
	}
	if core.Trim(overrides.UnixSocket) != "" {
		cfg.Ide.Transport.UnixSocket = core.Trim(overrides.UnixSocket)
	}
	if core.Trim(overrides.Token) != "" {
		cfg.Ide.Transport.Token = core.Trim(overrides.Token)
	}
	if core.Trim(overrides.BrainEndpoint) != "" {
		cfg.Ide.Brain.Endpoint = core.Trim(overrides.BrainEndpoint)
	}
	if core.Trim(overrides.BrainKey) != "" {
		cfg.Ide.Brain.Key = core.Trim(overrides.BrainKey)
	}
	if core.Trim(overrides.BrainAgentID) != "" {
		cfg.Ide.Brain.AgentID = core.Trim(overrides.BrainAgentID)
	}
}

func ApplyEnv(cfg *IDEConfig) {
	if cfg == nil {
		return
	}
	if value := core.Trim(core.Env("CORE_BRAIN_URL")); value != "" {
		cfg.Ide.Brain.Endpoint = value
	}
	if value := core.Trim(core.Env("CORE_BRAIN_KEY")); value != "" {
		cfg.Ide.Brain.Key = value
	}
	if value := core.Trim(core.Env("CORE_BRAIN_AGENT_ID")); value != "" {
		cfg.Ide.Brain.AgentID = value
	}
	switch {
	case core.Trim(core.Env("MCP_HTTP_ADDR")) != "":
		cfg.Ide.Transport.Mode = "http"
		cfg.Ide.Transport.HTTPAddr = core.Trim(core.Env("MCP_HTTP_ADDR"))
	case core.Trim(core.Env("MCP_ADDR")) != "":
		cfg.Ide.Transport.Mode = "tcp"
		cfg.Ide.Transport.TCPAddr = core.Trim(core.Env("MCP_ADDR"))
	case core.Trim(core.Env("MCP_UNIX_SOCKET")) != "":
		cfg.Ide.Transport.Mode = "unix"
		cfg.Ide.Transport.UnixSocket = core.Trim(core.Env("MCP_UNIX_SOCKET"))
	}
	if value := core.Trim(core.Env("CORE_IDE_TOKEN")); value != "" {
		cfg.Ide.Transport.Token = value
	}
}

func BoolPtr(value bool) *bool {
	return &value
}

func BoolValue(value *bool, fallback bool) bool {
	if value == nil {
		return fallback
	}
	return *value
}

func homeDir() string {
	home := core.Env("DIR_HOME")
	if home != "" {
		return home
	}
	if resolved, err := os.UserHomeDir(); err == nil {
		return resolved
	}
	return "."
}
