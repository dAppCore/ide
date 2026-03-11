---
title: Core IDE
description: A native desktop development environment and headless CI job runner built with Wails 3 and Angular, providing MCP-driven webview automation and Forgejo-integrated agent dispatch.
---

# Core IDE

Core IDE is a native desktop application that serves two roles:

1. **GUI mode** -- a Wails 3 desktop application with an Angular frontend, system tray panel, and an embedded MCP HTTP server that exposes webview automation tools (DOM inspection, JavaScript execution, screenshots, network monitoring, and more).

2. **Headless mode** -- a daemon that polls Forgejo repositories for actionable signals (draft PRs, review state, fix commands) and dispatches work to AI agents via the Clotho spinner, with a minimal MCP HTTP interface for remote control.

Both modes listen on `127.0.0.1:9877` and expose `/health`, `/mcp`, `/mcp/tools`, and `/mcp/call` endpoints.

## Quick start

### Prerequisites

- Go 1.26+
- Node.js 22+ and npm
- Wails 3 CLI (`wails3`)
- Access to the Go workspace at `~/Code/go.work` (the module uses `replace` directives for local siblings)

### Development

```bash
cd /path/to/core/ide

# Install frontend dependencies and start dev mode (hot-reload)
wails3 dev

# Or build a production binary
core build          # uses .core/build.yaml
wails3 build        # alternative, uses build/config.yml
```

### Headless mode

```bash
# Run as a headless daemon (no GUI required)
./bin/core-ide --headless

# Dry-run mode -- logs what would happen without side-effects
./bin/core-ide --headless --dry-run

# Specify which repos to poll (comma-separated)
CORE_REPOS=host-uk/core,host-uk/core-php ./bin/core-ide --headless
```

A systemd unit is provided at `build/linux/core-ide.service` for running headless mode as a system service.

## Package layout

| Path | Purpose |
|------|---------|
| `main.go` | Entry point -- decides GUI or headless based on `--headless` flag / display availability |
| `mcp_bridge.go` | `MCPBridge` -- Wails service that starts the MCP HTTP server, WebSocket hub, and webview tool dispatcher (GUI mode) |
| `claude_bridge.go` | `ClaudeBridge` -- WebSocket relay between GUI clients and an upstream MCP core server |
| `headless.go` | `startHeadless()` -- daemon with Forgejo poller, job handlers, agent dispatch, PID file, and health endpoint |
| `headless_mcp.go` | `startHeadlessMCP()` -- minimal MCP HTTP server for headless mode (job status, dry-run toggle, manual poll trigger) |
| `greetservice.go` | `GreetService` -- sample Wails-bound service |
| `icons/` | Embedded PNG assets for system tray (macOS template icon, default icon) |
| `frontend/` | Angular 20 application (standalone components, SCSS, Wails runtime bindings) |
| `frontend/src/app/pages/tray/` | `TrayComponent` -- compact system tray panel (380x480 frameless window) |
| `frontend/src/app/pages/ide/` | `IdeComponent` -- full IDE layout with sidebar, dashboard, file explorer, terminal placeholders |
| `frontend/src/app/components/sidebar/` | `SidebarComponent` -- icon-based navigation rail |
| `frontend/bindings/` | Auto-generated TypeScript bindings for Go services |
| `build/` | Platform-specific build configuration (macOS plist, Windows NSIS/MSIX, Linux systemd/AppImage/nfpm) |
| `.core/build.yaml` | `core build` configuration (Wails type, CGO enabled, cross-compilation targets) |
| `build/config.yml` | Wails 3 project configuration (app metadata, dev mode settings, file associations) |

## Dependencies

### Go modules

| Module | Role |
|--------|------|
| `forge.lthn.ai/core/go` | Core framework -- config, forge client, job runner, agent CI |
| `forge.lthn.ai/core/go-process` | Daemon utilities (PID file, health check endpoint) |
| `forge.lthn.ai/core/gui` | WebView service (`pkg/webview`) and WebSocket hub (`pkg/ws`) |
| `github.com/wailsapp/wails/v3` | Native desktop application framework |
| `github.com/gorilla/websocket` | WebSocket client for the Claude bridge |

All three `forge.lthn.ai` dependencies are resolved via `replace` directives pointing to sibling directories (`../go`, `../go-process`, `../gui`).

### Frontend

| Package | Role |
|---------|------|
| `@angular/core` ^21 | Component framework |
| `@wailsio/runtime` 3.0.0-alpha.72 | Go/JS bridge (events, method calls) |
| `rxjs` ~7.8 | Reactive extensions |

## Licence

EUPL-1.2. See the copyright notice in `build/config.yml` and `build/darwin/Info.plist`.
