package main

import (
	"context"
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"syscall"

	"forge.lthn.ai/core/api"
	"forge.lthn.ai/core/api/pkg/provider"
	"forge.lthn.ai/core/config"
	process "forge.lthn.ai/core/go-process"
	processapi "forge.lthn.ai/core/go-process/pkg/api"
	"forge.lthn.ai/core/go-ws"
	"forge.lthn.ai/core/go/pkg/core"
	guiMCP "forge.lthn.ai/core/gui/pkg/mcp"
	"forge.lthn.ai/core/gui/pkg/display"
	"forge.lthn.ai/core/ide/icons"
	"forge.lthn.ai/core/mcp/pkg/mcp"
	"forge.lthn.ai/core/mcp/pkg/mcp/agentic"
	"forge.lthn.ai/core/mcp/pkg/mcp/brain"
	"forge.lthn.ai/core/mcp/pkg/mcp/ide"
	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist/wails-angular-template/browser
var assets embed.FS

func main() {
	// ── Flags ──────────────────────────────────────────────────
	mcpOnly := false
	for _, arg := range os.Args[1:] {
		if arg == "--mcp" {
			mcpOnly = true
		}
	}

	// ── Configuration ──────────────────────────────────────────
	cfg, _ := config.New()

	cwd, err := os.Getwd()
	if err != nil {
		log.Fatalf("failed to get working directory: %v", err)
	}

	// ── Shared resources (built before Core) ───────────────────
	hub := ws.NewHub()

	bridgeCfg := ide.DefaultConfig()
	bridgeCfg.WorkspaceRoot = cwd
	if url := os.Getenv("CORE_API_URL"); url != "" {
		bridgeCfg.LaravelWSURL = url
	}
	if token := os.Getenv("CORE_API_TOKEN"); token != "" {
		bridgeCfg.Token = token
	}
	bridge := ide.NewBridge(hub, bridgeCfg)

	// ── Service Provider Registry ──────────────────────────────
	reg := provider.NewRegistry()
	reg.Add(processapi.NewProvider(process.DefaultRegistry(), hub))
	reg.Add(brain.NewProvider(bridge, hub))

	// ── API Engine ─────────────────────────────────────────────
	apiAddr := ":9880"
	if addr := os.Getenv("CORE_API_ADDR"); addr != "" {
		apiAddr = addr
	}
	engine, _ := api.New(
		api.WithAddr(apiAddr),
		api.WithCORS("*"),
		api.WithWSHandler(http.Handler(hub.Handler())),
		api.WithSwagger("Core IDE", "Service Provider API", "0.1.0"),
	)
	reg.MountAll(engine)

	// ── Runtime Provider Manager ──────────────────────────────
	rm := NewRuntimeManager(engine)

	// ── Providers API ─────────────────────────────────────────
	// Exposes GET /api/v1/providers for the Angular frontend
	engine.Register(NewProvidersAPI(reg, rm))

	// ── Core framework ─────────────────────────────────────────
	c, err := core.New(
		core.WithName("ws", func(c *core.Core) (any, error) {
			return hub, nil
		}),
		core.WithService(display.Register(nil)), // nil platform until Wails starts
		core.WithName("mcp", func(c *core.Core) (any, error) {
			return mcp.New(
				mcp.WithWorkspaceRoot(cwd),
				mcp.WithWSHub(hub),
				mcp.WithSubsystem(brain.NewDirect()),
				mcp.WithSubsystem(agentic.NewPrep()),
				mcp.WithSubsystem(guiMCP.New(c)),
			)
		}),
	)
	if err != nil {
		log.Fatalf("failed to create core: %v", err)
	}

	// Retrieve the MCP service for transport control
	mcpSvc, err := core.ServiceFor[*mcp.Service](c, "mcp")
	if err != nil {
		log.Fatalf("failed to get MCP service: %v", err)
	}

	// ── Mode selection ─────────────────────────────────────────
	if mcpOnly {
		// stdio mode — Claude Code connects via --mcp flag
		ctx, cancel := signal.NotifyContext(context.Background(),
			syscall.SIGINT, syscall.SIGTERM)
		defer cancel()

		if err := c.ServiceStartup(ctx, nil); err != nil {
			log.Fatalf("core startup failed: %v", err)
		}
		bridge.Start(ctx)
		go hub.Run(ctx)

		// Start runtime providers
		if err := rm.StartAll(ctx); err != nil {
			log.Printf("runtime provider error: %v", err)
		}

		// Start API server in background for provider endpoints
		go func() {
			if err := engine.Serve(ctx); err != nil {
				log.Printf("API server error: %v", err)
			}
		}()

		if err := mcpSvc.ServeStdio(ctx); err != nil {
			log.Printf("MCP stdio error: %v", err)
		}

		rm.StopAll()
		_ = mcpSvc.Shutdown(ctx)
		_ = c.ServiceShutdown(ctx)
		return
	}

	if !guiEnabled(cfg) {
		// No GUI — run Core with MCP transport in background
		ctx, cancel := signal.NotifyContext(context.Background(),
			syscall.SIGINT, syscall.SIGTERM)
		defer cancel()

		if err := c.ServiceStartup(ctx, nil); err != nil {
			log.Fatalf("core startup failed: %v", err)
		}
		bridge.Start(ctx)
		go hub.Run(ctx)

		// Start runtime providers
		if err := rm.StartAll(ctx); err != nil {
			log.Printf("runtime provider error: %v", err)
		}

		// Start API server
		go func() {
			log.Printf("API server listening on %s", apiAddr)
			if err := engine.Serve(ctx); err != nil {
				log.Printf("API server error: %v", err)
			}
		}()

		go func() {
			if err := mcpSvc.Run(ctx); err != nil {
				log.Printf("MCP error: %v", err)
			}
		}()

		<-ctx.Done()
		rm.StopAll()
		shutdownCtx := context.Background()
		_ = mcpSvc.Shutdown(shutdownCtx)
		_ = c.ServiceShutdown(shutdownCtx)
		return
	}

	// ── GUI mode ───────────────────────────────────────────────
	staticAssets, err := fs.Sub(assets, "frontend/dist/wails-angular-template/browser")
	if err != nil {
		log.Fatal(err)
	}

	app := application.New(application.Options{
		Name:        "Core IDE",
		Description: "Host UK Core IDE - Development Environment",
		Services: []application.Service{
			application.NewService(c),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(staticAssets),
		},
		Mac: application.MacOptions{
			ActivationPolicy: application.ActivationPolicyAccessory,
		},
		OnShutdown: func() {
			rm.StopAll()
			ctx := context.Background()
			_ = mcpSvc.Shutdown(ctx)
			bridge.Shutdown()
		},
	})

	// System tray
	systray := app.SystemTray.New()
	systray.SetTooltip("Core IDE")

	if runtime.GOOS == "darwin" {
		systray.SetTemplateIcon(icons.AppTray)
	} else {
		systray.SetDarkModeIcon(icons.AppTray)
		systray.SetIcon(icons.AppTray)
	}

	// Tray panel window
	trayWindow := app.Window.NewWithOptions(application.WebviewWindowOptions{
		Name:             "tray-panel",
		Title:            "Core IDE",
		Width:            380,
		Height:           480,
		URL:              "/tray",
		Hidden:           true,
		Frameless:        true,
		BackgroundColour: application.NewRGB(26, 27, 38),
	})
	systray.AttachWindow(trayWindow).WindowOffset(5)

	// Main IDE window (hidden initially, opened via tray menu)
	ideWindow := app.Window.NewWithOptions(application.WebviewWindowOptions{
		Name:             "ide",
		Title:            "Core IDE",
		Width:            1280,
		Height:           800,
		URL:              "/",
		Hidden:           true,
		BackgroundColour: application.NewRGB(26, 27, 38),
	})

	// Tray menu
	trayMenu := app.Menu.New()
	trayMenu.Add("Open IDE").OnClick(func(ctx *application.Context) {
		ideWindow.Show()
		ideWindow.Focus()
	})
	trayMenu.Add("API Swagger").OnClick(func(ctx *application.Context) {
		app.Window.NewWithOptions(application.WebviewWindowOptions{
			Name:   "swagger",
			Title:  "Core IDE — API",
			Width:  1024,
			Height: 768,
			URL:    "http://localhost" + apiAddr + "/swagger/index.html",
		})
	})
	trayMenu.AddSeparator()
	trayMenu.Add("Quit").OnClick(func(ctx *application.Context) {
		app.Quit()
	})
	systray.SetMenu(trayMenu)

	// Start MCP transport, runtime providers, and API server alongside Wails
	go func() {
		ctx := context.Background()
		bridge.Start(ctx)
		go hub.Run(ctx)

		// Start runtime providers
		if err := rm.StartAll(ctx); err != nil {
			log.Printf("runtime provider error: %v", err)
		}

		// Start API server
		go func() {
			log.Printf("API server listening on %s", apiAddr)
			if err := engine.Serve(ctx); err != nil {
				log.Printf("API server error: %v", err)
			}
		}()

		if err := mcpSvc.Run(ctx); err != nil {
			log.Printf("MCP error: %v", err)
		}
	}()

	log.Println("Starting Core IDE...")

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}

// guiEnabled checks whether the GUI should start.
// Returns false if config says gui.enabled: false, or if no display is available.
func guiEnabled(cfg *config.Config) bool {
	if cfg != nil {
		var guiCfg struct {
			Enabled *bool `mapstructure:"enabled"`
		}
		if err := cfg.Get("gui", &guiCfg); err == nil && guiCfg.Enabled != nil {
			return *guiCfg.Enabled
		}
	}
	// Fall back to display detection
	if runtime.GOOS == "windows" || runtime.GOOS == "darwin" {
		return true
	}
	return os.Getenv("DISPLAY") != "" || os.Getenv("WAYLAND_DISPLAY") != ""
}
