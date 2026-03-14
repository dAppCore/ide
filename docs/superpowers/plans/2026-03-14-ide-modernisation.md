# core/ide Modernisation — Implementation Plan

**Date:** 2026-03-14
**Spec:** [2026-03-14-ide-modernisation-design.md](../specs/2026-03-14-ide-modernisation-design.md)

---

## Task 1 — Delete the 7 obsolete files

Remove all hand-rolled services that are now provided by ecosystem packages.

```bash
cd /Users/snider/Code/core/ide

rm mcp_bridge.go      # Replaced by core/mcp Service + transports
rm webview_svc.go     # Replaced by core/gui/pkg/display + webview
rm brain_mcp.go       # Replaced by core/mcp/pkg/mcp/brain
rm claude_bridge.go   # Replaced by core/mcp/pkg/mcp/ide Bridge
rm headless_mcp.go    # Not needed — core/mcp runs in-process
rm headless.go        # config gui.enabled flag; jobrunner belongs in core/agent
rm greetservice.go    # Scaffold placeholder
```

**Verification:** `ls *.go` should show only `main.go`.

---

## Task 2 — Rewrite main.go

Replace the current main.go with a thin Wails shell that wires `core.Core` with
ecosystem services. The full file contents:

```go
package main

import (
	"context"
	"embed"
	"io/fs"
	"log"
	"os"
	"os/signal"
	"runtime"
	"syscall"

	"forge.lthn.ai/core/config"
	"forge.lthn.ai/core/go-ws"
	"forge.lthn.ai/core/go/pkg/core"
	guiMCP "forge.lthn.ai/core/gui/pkg/mcp"
	"forge.lthn.ai/core/gui/pkg/display"
	"forge.lthn.ai/core/ide/icons"
	"forge.lthn.ai/core/mcp/pkg/mcp"
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
				mcp.WithSubsystem(brain.New(bridge)),
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

		// Start Core lifecycle manually
		if err := c.ServiceStartup(ctx, nil); err != nil {
			log.Fatalf("core startup failed: %v", err)
		}
		bridge.Start(ctx)

		if err := mcpSvc.ServeStdio(ctx); err != nil {
			log.Printf("MCP stdio error: %v", err)
		}

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

		go func() {
			if err := mcpSvc.Run(ctx); err != nil {
				log.Printf("MCP error: %v", err)
			}
		}()

		<-ctx.Done()
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

	// Tray menu
	trayMenu := app.Menu.New()
	trayMenu.Add("Quit").OnClick(func(ctx *application.Context) {
		app.Quit()
	})
	systray.SetMenu(trayMenu)

	// Start MCP transport alongside Wails
	go func() {
		ctx := context.Background()
		bridge.Start(ctx)
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
```

### Key changes from the old main.go

1. **Three modes**: `--mcp` (stdio for Claude Code), no-GUI (headless with MCP_ADDR), GUI (Wails systray).
2. **`core.Core` is the Wails service** — its `ServiceStartup`/`ServiceShutdown` drive all sub-service lifecycles.
3. **Ecosystem wiring**: `display.Register(nil)` for GUI tools, `brain.New(bridge)` for OpenBrain, `guiMCP.New(c)` for 74 GUI MCP tools, `mcp.WithWSHub(hub)` for WS streaming.
4. **No hand-rolled HTTP server** — `mcp.Service` owns the MCP protocol (stdio/TCP/Unix). The WS hub is injected via option.
5. **IDE bridge** uses `ide.DefaultConfig()` from `core/mcp/pkg/mcp/ide` with env var overrides.

---

## Task 3 — Update go.mod

### 3a. Replace go.mod with updated dependencies

```
module forge.lthn.ai/core/ide

go 1.26.0

require (
	forge.lthn.ai/core/go v0.2.2
	forge.lthn.ai/core/config v0.1.2
	forge.lthn.ai/core/go-ws v0.1.3
	forge.lthn.ai/core/gui v0.1.0
	forge.lthn.ai/core/mcp v0.1.0
	github.com/wailsapp/wails/v3 v3.0.0-alpha.74
)
```

**Removed** (no longer directly imported):
- `forge.lthn.ai/core/agent` — brain tools now via `core/mcp/pkg/mcp/brain`
- `forge.lthn.ai/core/go-process` — daemon/PID logic was in headless.go
- `forge.lthn.ai/core/go-scm` — Forgejo client was in headless.go
- `github.com/gorilla/websocket` — replaced by `core/mcp/pkg/mcp/ide` (uses it internally)

**Added**:
- `forge.lthn.ai/core/gui` — display service + 74 MCP tools
- `forge.lthn.ai/core/mcp` — MCP server, brain subsystem, IDE bridge

### 3b. Sync workspace and tidy

```bash
cd /Users/snider/Code/core/ide
go mod tidy
cd /Users/snider/Code
go work sync
```

The `go mod tidy` will pull indirect dependencies and populate the `require`
block. The `go work sync` aligns versions across the workspace.

---

## Task 4 — Update CLAUDE.md

Replace the existing CLAUDE.md with content reflecting the new architecture:

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

\`\`\`bash
# Development (hot-reload GUI + Go rebuild)
wails3 dev

# Production build (preferred)
core build

# Frontend-only development
cd frontend && npm install && npm run dev

# Go tests
core go test                    # All tests
core go test --run TestName     # Single test
core go cov                     # Coverage report
core go cov --open              # Coverage in browser

# Quality assurance
core go qa                      # Format + vet + lint + test
core go qa full                 # + race detector, vuln scan, security audit
core go fmt                     # Format only
core go lint                    # Lint only

# Frontend tests
cd frontend && npm run test
\`\`\`

## Architecture

**Thin Wails shell** wiring ecosystem packages via `core.Core` dependency injection. Three operating modes:

### GUI Mode (default)
`main()` → Wails 3 application with embedded Angular frontend, system tray (macOS: accessory app, no Dock icon). Core framework manages all services:
- **display** (`core/gui`) — window management, webview automation, 74 MCP tools across 14 categories
- **MCP** (`core/mcp`) — Model Context Protocol server with file ops, brain subsystem, GUI subsystem
- **IDE bridge** (`core/mcp/pkg/mcp/ide`) — WebSocket bridge to Laravel core-agentic backend
- **WS hub** (`core/go-ws`) — WebSocket hub for Angular frontend communication

### MCP Mode (`--mcp`)
`core-ide --mcp` → stdio MCP server for Claude Code integration. No GUI, no HTTP. Configure in `.claude/.mcp.json`:
\`\`\`json
{
    "mcpServers": {
        "core-ide": {
            "type": "stdio",
            "command": "core-ide",
            "args": ["--mcp"]
        }
    }
}
\`\`\`

### Headless Mode (no display or `gui.enabled: false`)
Core framework runs all services without Wails. MCP transport determined by `MCP_ADDR` env var (TCP if set, stdio otherwise).

### Frontend
Angular 20+ app embedded via `//go:embed`. Two routes: `/tray` (system tray panel, 380x480 frameless) and `/ide` (full IDE layout).

## Configuration

\`\`\`yaml
# .core/config.yaml
gui:
  enabled: true          # false = no Wails, Core still runs
mcp:
  transport: stdio       # stdio | tcp | unix
  tcp:
    port: 9877
brain:
  api_url: http://localhost:8000
  api_token: ""          # or CORE_API_TOKEN env var
\`\`\`

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `CORE_API_URL` | `http://localhost:8000` | Laravel backend WebSocket URL |
| `CORE_API_TOKEN` | (empty) | Bearer token for Laravel backend auth |
| `MCP_ADDR` | (empty) | TCP address for MCP server (headless mode) |

## Workspace Dependencies

This module uses a Go workspace (`~/Code/go.work`) with `replace` directives for sibling modules:
- `../go` → `forge.lthn.ai/core/go`
- `../gui` → `forge.lthn.ai/core/gui`
- `../mcp` → `forge.lthn.ai/core/mcp`
- `../config` → `forge.lthn.ai/core/config`
- `../go-ws` → `forge.lthn.ai/core/go-ws`

## Conventions

- **UK English** in documentation and user-facing strings (colour, organisation, centre).
- **Conventional commits**: `type(scope): description` with co-author line `Co-Authored-By: Virgil <virgil@lethean.io>`.
- **Licence**: EUPL-1.2.
- All Go code is in `package main` (single-package application).
- Services are registered via `core.WithService` or `core.WithName` factory functions.
- MCP subsystems implement `mcp.Subsystem` interface from `core/mcp`.
```

---

## Task 5 — Build verification

```bash
cd /Users/snider/Code/core/ide
go build ./...
```

If the build fails, the likely causes are:

1. **Missing workspace entries** — ensure `go.work` includes `./core/mcp` and `./core/gui`:
   ```bash
   cd /Users/snider/Code
   go work use ./core/mcp ./core/gui
   go work sync
   ```

2. **Stale go.sum** — clear and regenerate:
   ```bash
   cd /Users/snider/Code/core/ide
   rm go.sum
   go mod tidy
   ```

3. **Version mismatches** — check that indirect dependency versions align:
   ```bash
   go mod graph | grep -i conflict
   ```

Once `go build ./...` succeeds, run the quality check:

```bash
core go qa
```

This confirms formatting, vetting, linting, and tests all pass.
