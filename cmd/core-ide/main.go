package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	core "dappco.re/go/core"

	"dappco.re/go/core/ide/pkg/config"
	"dappco.re/go/core/ide/pkg/server"
)

type runtimeFlags struct {
	MCPOnly    bool
	NoGUI      bool
	HTTPAddr   string
	Token      string
	ConfigPath string
}

func main() {
	flags, err := parseRuntimeFlags(os.Args[1:])
	if err != nil {
		core.Error("ide.main", "flags", err)
		os.Exit(1)
	}

	cfg, err := config.Load(config.DefaultPaths(flags.ConfigPath)...)
	if err != nil {
		core.Error("ide.main", "config", err)
		os.Exit(1)
	}
	config.ApplyCLIOverrides(&cfg, config.CLIOverrides{
		TransportMode: transportMode(flags),
		HTTPAddr:      flags.HTTPAddr,
		Token:         flags.Token,
	})
	if flags.NoGUI {
		cfg.Ide.Chat.Enabled = config.BoolPtr(false)
	}

	srv, err := server.NewServer(server.Options{
		Config:                    cfg,
		GUI:                       !flags.NoGUI,
		MCP:                       flags.MCPOnly,
		PreferConfiguredTransport: flags.MCPOnly || flags.HTTPAddr != "",
	})
	if err != nil {
		core.Error("ide.main", "compose", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := srv.Run(ctx); err != nil {
		core.Error("ide.main", "run", err)
		os.Exit(1)
	}
}
