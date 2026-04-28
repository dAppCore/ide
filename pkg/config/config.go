package config

import (
	"time"

	core "dappco.re/go"
	coreio "dappco.re/go/io"
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
	Endpoint string    `yaml:"endpoint"`
	Key      string    `yaml:"key"`
	AgentID  string    `yaml:"agent_id"`
	Cache    Cache     `yaml:"cache"`
	HTTP     BrainHTTP `yaml:"http"`
}

func (cfg Brain) WithDefaults() Brain {
	if cfg.Endpoint == "" {
		cfg.Endpoint = "https://api.lthn.sh"
	}
	if cfg.AgentID == "" {
		cfg.AgentID = "cladius"
	}
	cfg.Cache = cfg.Cache.WithDefaults()
	cfg.HTTP = cfg.HTTP.WithDefaults()
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

type BrainHTTP struct {
	Timeout        time.Duration       `yaml:"timeout"`
	Retry          BrainRetry          `yaml:"retry"`
	CircuitBreaker BrainCircuitBreaker `yaml:"circuit_breaker"`
}

func (cfg BrainHTTP) WithDefaults() BrainHTTP {
	if cfg.Timeout == 0 {
		cfg.Timeout = 30 * time.Second
	}
	cfg.Retry = cfg.Retry.WithDefaults()
	cfg.CircuitBreaker = cfg.CircuitBreaker.WithDefaults()
	return cfg
}

type BrainRetry struct {
	Attempts   int           `yaml:"attempts"`
	Backoff    time.Duration `yaml:"backoff"`
	MaxBackoff time.Duration `yaml:"max_backoff"`
}

func (cfg BrainRetry) WithDefaults() BrainRetry {
	if cfg.Attempts == 0 {
		cfg.Attempts = 3
	}
	if cfg.Attempts < 1 {
		cfg.Attempts = 1
	}
	if cfg.Attempts > 5 {
		cfg.Attempts = 5
	}
	if cfg.Backoff == 0 {
		cfg.Backoff = 100 * time.Millisecond
	}
	if cfg.MaxBackoff == 0 {
		cfg.MaxBackoff = time.Second
	}
	if cfg.MaxBackoff < cfg.Backoff {
		cfg.MaxBackoff = cfg.Backoff
	}
	return cfg
}

type BrainCircuitBreaker struct {
	Enabled          *bool         `yaml:"enabled"`
	FailureThreshold int           `yaml:"failure_threshold"`
	Cooldown         time.Duration `yaml:"cooldown"`
}

func (cfg BrainCircuitBreaker) WithDefaults() BrainCircuitBreaker {
	if cfg.Enabled == nil {
		cfg.Enabled = BoolPtr(true)
	}
	if cfg.FailureThreshold == 0 {
		cfg.FailureThreshold = 3
	}
	if cfg.FailureThreshold < 1 {
		cfg.FailureThreshold = 1
	}
	if cfg.Cooldown == 0 {
		cfg.Cooldown = 30 * time.Second
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

// cfg, err := Load(DefaultPaths("")...)
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
	for _, path := range paths {
		if core.Trim(path) == "" {
			continue
		}
		safe, err := safeLocalConfigPath(path)
		if err != nil {
			return IDEConfig{}, err
		}
		if !safe {
			continue
		}
		if !medium.Exists(path) {
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
