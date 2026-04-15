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

type Brain struct {
	Endpoint string `yaml:"endpoint"`
	Key      string `yaml:"key"`
	AgentID  string `yaml:"agent_id"`
	Cache    Cache  `yaml:"cache"`
}

type Cache struct {
	Enabled   bool          `yaml:"enabled"`
	TTL       time.Duration `yaml:"ttl"`
	Namespace string        `yaml:"namespace"`
}

type Workspace struct {
	Root            string   `yaml:"root"`
	ScanDepth       int      `yaml:"scan_depth"`
	Ignore          []string `yaml:"ignore"`
	ConventionPacks []string `yaml:"convention_packs"`
}

type Subagent struct {
	Enabled  bool             `yaml:"enabled"`
	Relay    SubagentRelay    `yaml:"relay"`
	Dispatch SubagentDispatch `yaml:"dispatch"`
	Timeouts SubagentTimeouts `yaml:"timeouts"`
}

type SubagentRelay struct {
	Addr string `yaml:"addr"`
	Path string `yaml:"path"`
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

type SubagentTimeouts struct {
	GuideAck            time.Duration `yaml:"guide_ack"`
	QuestionWaitDefault time.Duration `yaml:"question_wait_default"`
}

type Navigate struct {
	Routes []string `yaml:"routes"`
}

type Marketplace struct {
	Endpoint   string `yaml:"endpoint"`
	APIPath    string `yaml:"api_path"`
	InstallVia string `yaml:"install_via"`
}

type Chat struct {
	Enabled      bool   `yaml:"enabled"`
	APIURL       string `yaml:"api_url"`
	StorePath    string `yaml:"store_path"`
	ToolExecutor string `yaml:"tool_executor"`
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

func DefaultPaths(configPath string) []string {
	paths := make([]string, 0, 2)
	if core.Trim(configPath) != "" {
		return []string{configPath}
	}
	home := homeDir()
	if home != "" {
		paths = append(paths, core.JoinPath(home, ".core", "ide.yaml"))
	}
	cwd, err := os.Getwd()
	if err == nil && cwd != "" {
		paths = append(paths, core.JoinPath(cwd, ".core", "ide.yaml"))
	}
	return paths
}

func Load(paths ...string) (IDEConfig, error) {
	return LoadWithOptions(LoaderOptions{Paths: paths})
}

func LoadWithOptions(options LoaderOptions) (IDEConfig, error) {
	cfg := IDEConfig{}.WithDefaults()
	medium := options.Medium
	if medium == nil {
		medium = coreio.Local
	}
	paths := options.Paths
	if len(paths) == 0 {
		paths = DefaultPaths("")
	}
	for _, path := range paths {
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
	if cfg.Ide.Transport.Mode == "" {
		cfg.Ide.Transport.Mode = "stdio"
	}
	if cfg.Ide.Transport.HTTPAddr == "" {
		cfg.Ide.Transport.HTTPAddr = "127.0.0.1:9880"
	}
	if cfg.Ide.Transport.TCPAddr == "" {
		cfg.Ide.Transport.TCPAddr = "127.0.0.1:9100"
	}
	if cfg.Ide.Transport.UnixSocket == "" {
		cfg.Ide.Transport.UnixSocket = "/tmp/core-ide.sock"
	}
	if cfg.Ide.Brain.Endpoint == "" {
		cfg.Ide.Brain.Endpoint = "https://api.lthn.sh"
	}
	if cfg.Ide.Brain.AgentID == "" {
		cfg.Ide.Brain.AgentID = "cladius"
	}
	if !cfg.Ide.Brain.Cache.Enabled {
		cfg.Ide.Brain.Cache.Enabled = true
	}
	if cfg.Ide.Brain.Cache.TTL == 0 {
		cfg.Ide.Brain.Cache.TTL = 5 * time.Minute
	}
	if cfg.Ide.Brain.Cache.Namespace == "" {
		cfg.Ide.Brain.Cache.Namespace = "ide.brain.cache"
	}
	if cfg.Ide.Workspace.Root == "" {
		cfg.Ide.Workspace.Root = "."
	}
	if cfg.Ide.Workspace.ScanDepth == 0 {
		cfg.Ide.Workspace.ScanDepth = 3
	}
	if len(cfg.Ide.Workspace.Ignore) == 0 {
		cfg.Ide.Workspace.Ignore = []string{"node_modules/", "vendor/", ".git/"}
	}
	if len(cfg.Ide.Workspace.ConventionPacks) == 0 {
		cfg.Ide.Workspace.ConventionPacks = []string{"go", "php", "typescript", "python"}
	}
	if !cfg.Ide.Subagent.Enabled {
		cfg.Ide.Subagent.Enabled = true
	}
	if cfg.Ide.Subagent.Relay.Addr == "" {
		cfg.Ide.Subagent.Relay.Addr = "127.0.0.1:9882"
	}
	if cfg.Ide.Subagent.Relay.Path == "" {
		cfg.Ide.Subagent.Relay.Path = "/subagent"
	}
	if cfg.Ide.Subagent.Dispatch.DefaultAgent == "" {
		cfg.Ide.Subagent.Dispatch.DefaultAgent = "codex"
	}
	if cfg.Ide.Subagent.Dispatch.DefaultTemplate == "" {
		cfg.Ide.Subagent.Dispatch.DefaultTemplate = "coding"
	}
	if cfg.Ide.Subagent.Timeouts.GuideAck == 0 {
		cfg.Ide.Subagent.Timeouts.GuideAck = 10 * time.Second
	}
	if cfg.Ide.Subagent.Timeouts.QuestionWaitDefault == 0 {
		cfg.Ide.Subagent.Timeouts.QuestionWaitDefault = 60 * time.Second
	}
	if len(cfg.Ide.Navigate.Routes) == 0 {
		cfg.Ide.Navigate.Routes = []string{
			"core://store",
			"core://models",
			"core://agent",
			"core://network",
			"core://settings",
			"core://identity",
			"core://wallet",
		}
	}
	if cfg.Ide.Marketplace.Endpoint == "" {
		cfg.Ide.Marketplace.Endpoint = "https://api.lthn.sh"
	}
	if cfg.Ide.Marketplace.APIPath == "" {
		cfg.Ide.Marketplace.APIPath = "/v1/marketplace"
	}
	if cfg.Ide.Marketplace.InstallVia == "" {
		cfg.Ide.Marketplace.InstallVia = "go-scm"
	}
	if !cfg.Ide.Chat.Enabled {
		cfg.Ide.Chat.Enabled = true
	}
	if cfg.Ide.Chat.APIURL == "" {
		cfg.Ide.Chat.APIURL = "http://localhost:8090"
	}
	if cfg.Ide.Chat.StorePath == "" {
		cfg.Ide.Chat.StorePath = core.JoinPath(homeDir(), ".core", "ide", "chat.db")
	}
	if cfg.Ide.Chat.ToolExecutor == "" {
		cfg.Ide.Chat.ToolExecutor = "gui_mcp"
	}
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
	if value := core.Trim(core.Env("MCP_HTTP_ADDR")); value != "" {
		cfg.Ide.Transport.Mode = "http"
		cfg.Ide.Transport.HTTPAddr = value
	}
	if value := core.Trim(core.Env("MCP_ADDR")); value != "" {
		cfg.Ide.Transport.Mode = "tcp"
		cfg.Ide.Transport.TCPAddr = value
	}
	if value := core.Trim(core.Env("MCP_UNIX_SOCKET")); value != "" {
		cfg.Ide.Transport.Mode = "unix"
		cfg.Ide.Transport.UnixSocket = value
	}
	if value := core.Trim(core.Env("CORE_IDE_TOKEN")); value != "" {
		cfg.Ide.Transport.Token = value
	}
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
