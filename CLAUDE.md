# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
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
```

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
```json
{
    "mcpServers": {
        "core-ide": {
            "type": "stdio",
            "command": "core-ide",
            "args": ["--mcp"]
        }
    }
}
```

### Headless Mode (no display or `gui.enabled: false`)
Core framework runs all services without Wails. MCP transport determined by `MCP_ADDR` env var (TCP if set, stdio otherwise).

### Frontend
Angular 20+ app embedded via `//go:embed`. Two routes: `/tray` (system tray panel, 380x480 frameless) and `/ide` (full IDE layout).

## Configuration

```yaml
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
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `CORE_API_URL` | `http://localhost:8000` | Laravel backend WebSocket URL |
| `CORE_API_TOKEN` | (empty) | Bearer token for Laravel backend auth |
| `MCP_ADDR` | (empty) | TCP address for MCP server (headless mode) |

## Go Module Layout (new)

Go sources now live under `go/` and keep the module path unchanged:
`dappco.re/go/ide`. From repo root:
- `go/` is the module root (contains `go.mod`, `go.sum`, `cmd/`, `pkg/`, `tests/`, `third_party/`)
- `frontend/`, `icons/`, `build/`, `dist/`, `bin/`, and `workspace/` remain at root
- `go/README.md`, `go/CLAUDE.md`, `go/AGENTS.md`, and `go/docs` are symlinks back to root `README.md`, `CLAUDE.md`, `AGENTS.md`, `docs`

Go commands should be run from the module directory:
- `cd go && core go test` (or `go test ./...` via module tools)

## Conventions

- **UK English** in documentation and user-facing strings (colour, organisation, centre).
- **Conventional commits**: `type(scope): description` with co-author line `Co-Authored-By: Virgil <virgil@lethean.io>`.
- **Licence**: EUPL-1.2.
- All Go code is in `package main` (single-package application).
- Services are registered via `core.WithService` or `core.WithName` factory functions.
- MCP subsystems implement `mcp.Subsystem` interface from `core/mcp`.
