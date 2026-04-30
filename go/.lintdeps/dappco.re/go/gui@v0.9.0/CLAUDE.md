# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is `dappco.re/go/gui` — a display/windowing module for the Core web3 desktop framework. It provides window management, dialogs, system tray, clipboard, notifications, theming, layouts, and real-time WebSocket events. Built on **Wails v3** (Go backend) with an **Angular 20** custom element frontend.

## Build & Development Commands

### Go backend
```bash
go build ./...              # Build all packages
go test ./...               # Run all tests
go test ./pkg/display/...   # Run display package tests
go test -race ./...         # Run tests with race detection
go test -cover ./...        # Run tests with coverage
go test -run TestNew ./pkg/display/  # Run a single test
```

### Angular frontend (pkg/display/ui/)
```bash
cd pkg/display/ui
npm install                 # Install dependencies
npm run build               # Production build
npm run watch               # Dev watch mode
npm run start               # Dev server (localhost:4200)
npm test                    # Unit tests (Karma/Jasmine)
```

## Architecture

### Service-based design with Core DI

The display `Service` registers with `dappco.re/go/core`'s service container via `Register(c *core.Core)`. It embeds `core.ServiceRuntime[Options]` for lifecycle management and access to sibling services.

### Interface abstraction for testability

All Wails application APIs are abstracted behind interfaces in `interfaces.go` (`App`, `WindowManager`, `MenuManager`, `DialogManager`, etc.). The `wailsApp` adapter wraps the real Wails app. Tests inject a `mockApp` instead — see `mocks_test.go` and the `newServiceWithMockApp(t)` helper.

### Package structure (pkg/)

| Package | Responsibility |
|---------|---------------|
| `display` | Orchestrator service — bridges sub-service IPC to WebSocket events, menu/tray setup, config persistence |
| `window` | Window lifecycle, `Manager`, `StateManager` (position persistence), `LayoutManager` (named arrangements), tiling/snapping |
| `menu` | Application menu construction via platform abstraction |
| `systray` | System tray icon, tooltip, menu via platform abstraction |
| `dialog` | File open/save, message, confirm, and prompt dialogs |
| `clipboard` | Clipboard read/write/clear |
| `notification` | System notifications with permission management |
| `screen` | Screen/monitor queries (list, primary, at-point, work areas) |
| `environment` | Theme detection (dark/light) and OS environment info |
| `keybinding` | Global keyboard shortcut registration |
| `contextmenu` | Named context menu registration and lifecycle |
| `browser` | Open URLs and files in the default browser |
| `dock` | macOS dock icon visibility and badge |
| `lifecycle` | Application lifecycle events (start, terminate, suspend, resume) |
| `webview` | Webview automation (eval, click, type, screenshot, DOM queries) |
| `mcp` | MCP tool subsystem — exposes all services as Model Context Protocol tools |

### Patterns used throughout

- **Platform abstraction**: Each sub-service defines a `Platform` interface and `PlatformWindow`/`PlatformTray`/etc. types; tests inject mocks
- **Functional options**: `WindowOption` functions (`WithName()`, `WithTitle()`, `WithSize()`, etc.) configure `window.Window` descriptors
- **IPC message bus**: Sub-services communicate via `core.QUERY`, `core.PERFORM`, and `core.ACTION` — display orchestrates and bridges to WebSocket events
- **Event broadcasting**: `WSEventManager` uses gorilla/websocket with a buffered channel (`eventBuffer`) and per-client subscription filtering (supports `"*"` wildcard)
- **Error handling**: All errors use `coreerr.E(op, msg, err)` from `dappco.re/go/log` (aliased as `coreerr`), never `fmt.Errorf`
- **File I/O**: Use `dappco.re/go/io` (`coreio.Local`) for filesystem operations, never `os.ReadFile`/`os.WriteFile`

## Testing

- Tests use the core test wrappers from `dappco.re/go`: `*core.T`, `core.AssertX`, and `core.RequireX`.
- Keep AX7 triplets in the source-matching file: public symbols in `service.go` are covered in `service_test.go`, not in generated monoliths.
- Examples live beside their source as `<file>_example_test.go` and print with `core.Println`, not standard formatting imports.
- Each sub-package has focused `*_test.go` files with mock platform implementations.
- `pkg/window`: `NewManagerWithDir` / `NewStateManagerWithDir` / `NewLayoutManagerWithDir` accept custom config dirs for isolated tests.
- `pkg/display`: `newTestCore(t)` creates a real `core.Core` instance for integration-style tests.
- Sub-services use `mock_platform.go` or `mock_test.go` for platform mocks.

## CI/CD

Forgejo Actions (`.forgejo/workflows/`):
- **test.yml**: Runs `go test` with race detection and coverage on push to main/dev and PRs to main
- **security-scan.yml**: Security scanning on push to main/dev/feat/* and PRs to main

Both use reusable workflows from `core/go-devops`.

## Dependencies

- `dappco.re/go` — Core framework with service container, Result, assertion, formatting, path, JSON, and OS wrappers
- `dappco.re/go/log` — Structured errors (`coreerr.E()`)
- `dappco.re/go/io` — Filesystem abstraction (`coreio.Local`)
- `dappco.re/go/config` — Configuration file management
- `github.com/wailsapp/wails/v3` — Desktop app framework (alpha.74)
- `github.com/gorilla/websocket` — WebSocket for real-time events
- `github.com/modelcontextprotocol/go-sdk` — MCP tool registration

## Repository migration note

Import paths were recently migrated to `dappco.re/go/*` from earlier GitHub and forge namespaces. The `cmd/` directories visible in git status are deleted artifacts from this migration and prior app scaffolds.
