package main

import (
	"flag"
	"fmt"
	"io"
	"os"
	"strings"

	ideconfig "dappco.re/go/core/ide/config"
)

type runtimeFlags struct {
	MCPOnly  bool
	NoGUI    bool
	HTTPAddr string
	Token    string
}

func parseRuntimeFlags(args []string) (runtimeFlags, error) {
	var flags runtimeFlags

	set := flag.NewFlagSet("core-ide", flag.ContinueOnError)
	set.SetOutput(io.Discard)
	set.BoolVar(&flags.MCPOnly, "mcp", false, "run the MCP server on stdio")
	set.BoolVar(&flags.NoGUI, "no-gui", false, "disable the GUI shell")
	set.StringVar(&flags.HTTPAddr, "http", "", "run the MCP server on the given HTTP address")
	set.StringVar(&flags.Token, "token", "", "bearer token for HTTP transport")

	if err := set.Parse(args); err != nil {
		return runtimeFlags{}, err
	}

	flags.HTTPAddr = strings.TrimSpace(flags.HTTPAddr)
	flags.Token = strings.TrimSpace(flags.Token)
	return flags, nil
}

func loadIDEConfig(args []string) (ideconfig.IDEConfig, runtimeFlags, error) {
	flags, err := parseRuntimeFlags(args)
	if err != nil {
		return ideconfig.IDEConfig{}, runtimeFlags{}, fmt.Errorf("parse flags: %w", err)
	}

	cfg, err := ideconfig.Load()
	if err != nil {
		return ideconfig.IDEConfig{}, runtimeFlags{}, err
	}

	transportMode := ""
	if flags.HTTPAddr != "" {
		transportMode = "http"
	} else if flags.MCPOnly {
		transportMode = "stdio"
	}

	ideconfig.ApplyCLIOverrides(&cfg, ideconfig.CLIOverrides{
		TransportMode: transportMode,
		HTTPAddr:      flags.HTTPAddr,
		Token:         flags.Token,
	})
	if flags.NoGUI {
		cfg.Ide.Chat.Enabled = false
	}

	return cfg, flags, nil
}

func applyIDEEnvironment(cfg ideconfig.IDEConfig) {
	if cfg.Ide.Brain.Endpoint != "" {
		_ = os.Setenv("CORE_BRAIN_URL", cfg.Ide.Brain.Endpoint)
	}
	if cfg.Ide.Brain.Key != "" {
		_ = os.Setenv("CORE_BRAIN_KEY", cfg.Ide.Brain.Key)
	}
	if cfg.Ide.Brain.AgentID != "" {
		_ = os.Setenv("CORE_BRAIN_AGENT_ID", cfg.Ide.Brain.AgentID)
	}
	if cfg.Ide.Brain.Cache.TTL > 0 {
		_ = os.Setenv("CORE_BRAIN_RECALL_CACHE_TTL", cfg.Ide.Brain.Cache.TTL.String())
	}
	switch cfg.Ide.Transport.Mode {
	case "http":
		if cfg.Ide.Transport.HTTPAddr != "" {
			_ = os.Setenv("MCP_HTTP_ADDR", cfg.Ide.Transport.HTTPAddr)
		}
	case "tcp":
		if cfg.Ide.Transport.TCPAddr != "" {
			_ = os.Setenv("MCP_ADDR", cfg.Ide.Transport.TCPAddr)
		}
	case "unix":
		if cfg.Ide.Transport.UnixSocket != "" {
			_ = os.Setenv("MCP_UNIX_SOCKET", cfg.Ide.Transport.UnixSocket)
		}
	}
	if cfg.Ide.Transport.Token != "" {
		_ = os.Setenv("CORE_IDE_TOKEN", cfg.Ide.Transport.Token)
	}
}
