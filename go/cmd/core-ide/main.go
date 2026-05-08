package main

import (
	"context"
	"os/signal"
	"syscall"

	core "dappco.re/go"
	gui "dappco.re/go/gui"
	"github.com/wailsapp/wails/v3/pkg/application"

	"dappco.re/go/ide/pkg/config"
	"dappco.re/go/ide/pkg/server"
)

type runtimeFlags struct {
	MCPOnly    bool
	NoGUI      bool
	HTTPAddr   string
	Token      string
	ConfigPath string
}

func main() {
	flags, err := parseRuntimeFlags(core.Args()[1:])
	if err != nil {
		core.Error("ide.main", "flags", err)
		core.Exit(1)
	}

	cfg, err := config.Load(config.DefaultPaths(flags.ConfigPath)...)
	if err != nil {
		core.Error("ide.main", "config", err)
		core.Exit(1)
	}
	config.ApplyCLIOverrides(&cfg, config.CLIOverrides{
		TransportMode: transportMode(flags),
		HTTPAddr:      flags.HTTPAddr,
		Token:         flags.Token,
	})
	if flags.NoGUI {
		cfg.Ide.Chat.Enabled = config.BoolPtr(false)
	}

	// cmd/core-ide is the single boundary in core/ide that imports wails.
	// We construct the application here, then hand the reference + the
	// canonical core/gui service registration plan through to NewServer.
	// pkg/server stays wails-free at the public surface (gui.go does the
	// lone internal type assertion via shell.SetWailsApp).
	var app *application.App
	var guiServices []core.CoreOption
	if !flags.NoGUI {
		// core.Env("DIR_CONFIG") is set to the native config dir per OS by
		// core's runtime info layer (macOS: ~/Library/Application Support).
		// window.Service's StateManager + LayoutManager pick that up
		// automatically — window position/size + named layouts persist to
		// $DIR_CONFIG/Core/{window_state.json,layouts.json}.
		app = newWailsApp(FrontendFS())
		guiServices = gui.Bootstrap(app)
	}

	srv, err := server.NewServer(server.Options{
		Config:                    cfg,
		GUI:                       !flags.NoGUI,
		MCP:                       flags.MCPOnly,
		PreferConfiguredTransport: flags.MCPOnly || flags.HTTPAddr != "",
		Frontend:                  FrontendFS(),
		WailsApp:                  app,
		GUIServices:               guiServices,
	})
	if err != nil {
		core.Error("ide.main", "compose", err)
		core.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if err := srv.Run(ctx); err != nil {
		core.Error("ide.main", "run", err)
		core.Exit(1)
	}
}
