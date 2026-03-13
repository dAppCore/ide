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

**Dual-mode application**: a single Go binary that operates as either a GUI desktop app (Wails 3 + Angular) or a headless CI/CD daemon, determined at startup by the `--headless` flag or display availability.

### GUI Mode (default)
`main()` → Wails application with embedded Angular frontend, system tray (macOS: accessory app, no Dock icon), and an MCP HTTP server on **port 9877**. The `MCPBridge` service orchestrates `WebviewService` (window/DOM automation), `BrainService` (vector knowledge store via OpenBrain), and a WebSocket hub.

### Headless Mode (`--headless` or no display)
`startHeadless()` → Daemon with PID file at `~/.core/core-ide.pid`, health check on **port 9878**, and a minimal MCP server on **port 9877**. Polls Forgejo repos (configured via `CORE_REPOS` env var) every 60 seconds and runs jobs through an ordered handler pipeline: PublishDraft → SendFix → DismissReviews → EnableAutoMerge → TickParent → Dispatch.

### Key Services
- **`MCPBridge`** (`mcp_bridge.go`) — Central GUI service. Registers 29 webview tools + 4 brain tools via HTTP MCP protocol. Routes: `/health`, `/mcp`, `/mcp/tools`, `/mcp/call`, `/ws`.
- **`WebviewService`** (`webview_svc.go`) — Wails v3 window management and DOM interaction. Many tools are stubbed pending CDP integration.
- **`BrainService`** (`brain_mcp.go`) — Wraps `lifecycle.Client` for OpenBrain vector store (remember/recall/forget). Shared by both modes.
- **`ClaudeBridge`** (`claude_bridge.go`) — WebSocket relay to upstream MCP at `ws://localhost:9876/ws`. Currently disabled.

### Frontend
Angular 20+ app embedded via `//go:embed`. Two routes: `/tray` (system tray panel, 380x480 frameless) and `/ide` (full IDE layout). Wails bindings auto-generated in `frontend/bindings/`.

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `CORE_REPOS` | `host-uk/core,host-uk/core-php,host-uk/core-tenant,host-uk/core-admin` | Repos to poll in headless mode |
| `CORE_API_URL` | `http://localhost:8000` | OpenBrain API endpoint |
| `CORE_API_TOKEN` | (required) | OpenBrain auth token |

## Workspace Dependencies

This module uses a Go workspace (`~/Code/go.work`) with `replace` directives for sibling modules. Ensure these exist alongside `ide/`:
- `../go` → `forge.lthn.ai/core/go`
- `../go-process` → `forge.lthn.ai/core/go-process`
- `../gui` → `forge.lthn.ai/core/gui`

## Conventions

- **UK English** in documentation and user-facing strings (colour, organisation, centre).
- **Conventional commits**: `type(scope): description` with co-author line `Co-Authored-By: Virgil <virgil@lethean.io>`.
- **Licence**: EUPL-1.2.
- All Go code is in `package main` (single-package application).
- New Wails services: create struct in a Go file, register in `main.go`'s `Services` slice, then `wails3 dev` to regenerate TS bindings.
- New MCP tools: add metadata to `handleMCPTools` and a case to `executeWebviewTool` in `mcp_bridge.go`.
