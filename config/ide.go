package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

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
	Cache    struct {
		Enabled   bool          `yaml:"enabled"`
		TTL       time.Duration `yaml:"ttl"`
		Namespace string        `yaml:"namespace"`
	} `yaml:"cache"`
}

type Workspace struct {
	Root            string   `yaml:"root"`
	ScanDepth       int      `yaml:"scan_depth"`
	Ignore          []string `yaml:"ignore"`
	ConventionPacks []string `yaml:"convention_packs"`
}

type Subagent struct {
	Enabled bool `yaml:"enabled"`
	Relay   struct {
		Addr string `yaml:"addr"`
		Path string `yaml:"path"`
	} `yaml:"relay"`
	Dispatch struct {
		DefaultAgent    string `yaml:"default_agent"`
		DefaultTemplate string `yaml:"default_template"`
	} `yaml:"dispatch"`
	Timeouts struct {
		GuideAck            time.Duration `yaml:"guide_ack"`
		QuestionWaitDefault time.Duration `yaml:"question_wait_default"`
	} `yaml:"timeouts"`
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

func (c IDEConfig) WithDefaults() IDEConfig {
	if c.Ide.Transport.Mode == "" {
		c.Ide.Transport.Mode = "stdio"
	}
	if c.Ide.Transport.HTTPAddr == "" {
		c.Ide.Transport.HTTPAddr = "127.0.0.1:9880"
	}
	if c.Ide.Transport.TCPAddr == "" {
		c.Ide.Transport.TCPAddr = "127.0.0.1:9100"
	}
	if c.Ide.Transport.UnixSocket == "" {
		c.Ide.Transport.UnixSocket = filepath.Join(os.TempDir(), "core-ide.sock")
	}
	if c.Ide.Brain.Endpoint == "" {
		c.Ide.Brain.Endpoint = "https://api.lthn.sh"
	}
	if c.Ide.Brain.AgentID == "" {
		c.Ide.Brain.AgentID = "cladius"
	}
	if !c.Ide.Brain.Cache.Enabled {
		c.Ide.Brain.Cache.Enabled = true
	}
	if c.Ide.Brain.Cache.TTL == 0 {
		c.Ide.Brain.Cache.TTL = 5 * time.Minute
	}
	if c.Ide.Brain.Cache.Namespace == "" {
		c.Ide.Brain.Cache.Namespace = "ide.brain.cache"
	}
	if c.Ide.Workspace.Root == "" {
		c.Ide.Workspace.Root = "."
	}
	if c.Ide.Workspace.ScanDepth == 0 {
		c.Ide.Workspace.ScanDepth = 3
	}
	if len(c.Ide.Workspace.Ignore) == 0 {
		c.Ide.Workspace.Ignore = []string{"node_modules/", "vendor/", ".git/"}
	}
	if len(c.Ide.Workspace.ConventionPacks) == 0 {
		c.Ide.Workspace.ConventionPacks = []string{"go", "php", "typescript", "python"}
	}
	if !c.Ide.Subagent.Enabled {
		c.Ide.Subagent.Enabled = true
	}
	if c.Ide.Subagent.Relay.Addr == "" {
		c.Ide.Subagent.Relay.Addr = "127.0.0.1:9882"
	}
	if c.Ide.Subagent.Relay.Path == "" {
		c.Ide.Subagent.Relay.Path = "/subagent"
	}
	if c.Ide.Subagent.Dispatch.DefaultAgent == "" {
		c.Ide.Subagent.Dispatch.DefaultAgent = "codex"
	}
	if c.Ide.Subagent.Dispatch.DefaultTemplate == "" {
		c.Ide.Subagent.Dispatch.DefaultTemplate = "coding"
	}
	if c.Ide.Subagent.Timeouts.GuideAck == 0 {
		c.Ide.Subagent.Timeouts.GuideAck = 10 * time.Second
	}
	if c.Ide.Subagent.Timeouts.QuestionWaitDefault == 0 {
		c.Ide.Subagent.Timeouts.QuestionWaitDefault = 60 * time.Second
	}
	if len(c.Ide.Navigate.Routes) == 0 {
		c.Ide.Navigate.Routes = []string{
			"core://store",
			"core://models",
			"core://agent",
			"core://network",
			"core://settings",
			"core://identity",
			"core://wallet",
		}
	}
	if c.Ide.Marketplace.Endpoint == "" {
		c.Ide.Marketplace.Endpoint = "https://api.lthn.sh"
	}
	if c.Ide.Marketplace.APIPath == "" {
		c.Ide.Marketplace.APIPath = "/v1/marketplace"
	}
	if c.Ide.Marketplace.InstallVia == "" {
		c.Ide.Marketplace.InstallVia = "go-scm"
	}
	if !c.Ide.Chat.Enabled {
		c.Ide.Chat.Enabled = true
	}
	if c.Ide.Chat.APIURL == "" {
		c.Ide.Chat.APIURL = "http://localhost:8090"
	}
	if c.Ide.Chat.StorePath == "" {
		c.Ide.Chat.StorePath = filepath.Join(os.TempDir(), "core-ide-chat.db")
	}
	if c.Ide.Chat.ToolExecutor == "" {
		c.Ide.Chat.ToolExecutor = "gui_mcp"
	}
	return c
}

func Load(paths ...string) (IDEConfig, error) {
	cfg := IDEConfig{}.WithDefaults()
	if len(paths) == 0 {
		if home, err := os.UserHomeDir(); err == nil && home != "" {
			paths = append(paths, filepath.Join(home, ".core", "ide.yaml"))
		}
		if cwd, err := os.Getwd(); err == nil && cwd != "" {
			paths = append(paths, filepath.Join(cwd, ".core", "ide.yaml"))
		}
	}
	for _, path := range paths {
		if strings.TrimSpace(path) == "" {
			continue
		}
		data, err := os.ReadFile(path)
		if err != nil {
			if os.IsNotExist(err) {
				continue
			}
			return IDEConfig{}, fmt.Errorf("read config %s: %w", path, err)
		}
		if err := yaml.Unmarshal(data, &cfg); err != nil {
			return IDEConfig{}, fmt.Errorf("parse config %s: %w", path, err)
		}
	}
	applyEnv(&cfg)
	return cfg, nil
}

func ApplyCLIOverrides(cfg *IDEConfig, overrides CLIOverrides) {
	if cfg == nil {
		return
	}
	if v := strings.TrimSpace(overrides.TransportMode); v != "" {
		cfg.Ide.Transport.Mode = v
	}
	if v := strings.TrimSpace(overrides.HTTPAddr); v != "" {
		cfg.Ide.Transport.HTTPAddr = v
	}
	if v := strings.TrimSpace(overrides.TCPAddr); v != "" {
		cfg.Ide.Transport.TCPAddr = v
	}
	if v := strings.TrimSpace(overrides.UnixSocket); v != "" {
		cfg.Ide.Transport.UnixSocket = v
	}
	if v := strings.TrimSpace(overrides.Token); v != "" {
		cfg.Ide.Transport.Token = v
	}
	if v := strings.TrimSpace(overrides.BrainEndpoint); v != "" {
		cfg.Ide.Brain.Endpoint = v
	}
	if v := strings.TrimSpace(overrides.BrainKey); v != "" {
		cfg.Ide.Brain.Key = v
	}
	if v := strings.TrimSpace(overrides.BrainAgentID); v != "" {
		cfg.Ide.Brain.AgentID = v
	}
}

func applyEnv(cfg *IDEConfig) {
	if cfg == nil {
		return
	}
	if v := strings.TrimSpace(os.Getenv("CORE_BRAIN_URL")); v != "" {
		cfg.Ide.Brain.Endpoint = v
	}
	if v := strings.TrimSpace(os.Getenv("CORE_BRAIN_KEY")); v != "" {
		cfg.Ide.Brain.Key = v
	}
	if v := strings.TrimSpace(os.Getenv("CORE_BRAIN_AGENT_ID")); v != "" {
		cfg.Ide.Brain.AgentID = v
	}
	if v := strings.TrimSpace(os.Getenv("MCP_UNIX_SOCKET")); v != "" {
		cfg.Ide.Transport.Mode = "unix"
		cfg.Ide.Transport.UnixSocket = v
	}
	if v := strings.TrimSpace(os.Getenv("MCP_ADDR")); v != "" {
		cfg.Ide.Transport.Mode = "tcp"
		cfg.Ide.Transport.TCPAddr = v
	}
	if v := strings.TrimSpace(os.Getenv("MCP_HTTP_ADDR")); v != "" {
		cfg.Ide.Transport.Mode = "http"
		cfg.Ide.Transport.HTTPAddr = v
	}
	if v := strings.TrimSpace(os.Getenv("CORE_IDE_TOKEN")); v != "" {
		cfg.Ide.Transport.Token = v
	}
}
