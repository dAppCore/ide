# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Identity — what this binary IS

`core/ide` is the **Lethean Desktop** compile target. The umbrella native product across Darwin / Linux / Windows / iOS / iPadOS ships as the binary built from this repo. The plan that defines what Lethean Desktop composes, how its Vi Control Panel shell wraps the IDE surface, and how the design system flows in lives in the canonical plans tree at `plans/project/lthn/desktop/RFC.md`.

Default brand: **Lethean** (cool indigo, hue 270). Host UK customers can flip via `[data-brand="hostuk"]` at runtime — the design system supports both.

## Where the truth lives

If a capability isn't defined in the plans tree (`forge.lthn.sh/core/plans`), it isn't real. This binary owns *composition* — which packages get pulled in, how they wire at boot, how Vi surfaces them — not the *implementation* of each capability. Capabilities are spec'd in their canonical homes:

| Capability | Canonical spec |
|------------|----------------|
| Lethean Desktop convergence + product framing | `plans/project/lthn/desktop/RFC.md` |
| Visual system + native profiles + Vi Control Panel | `plans/ops/hostuk/website/_design/lethean-3/` (canonical) + `plans/ops/lthn/website/lthn.ai/design/` (Lethean subset) |
| Native chrome rules (Wails Darwin / iOS / iPadOS) | `plans/ops/hostuk/website/_design/lethean-3/design_handoff_native_profiles/README.md` |
| Vi (Violet) mascot canon | `plans/ops/hostuk/website/_design/lethean-3/uploads/mascot-raven.md` + `mascot-voice-samples.md` |
| Brand voice | `plans/ops/hostuk/website/_design/lethean-3/uploads/BRAND-VOICE.md` |
| Blockchain / Mining / Encryption / Filesystem | `plans/project/lthn/{blockchain,mining}/RFC.md` + `plans/code/snider/enchantrix/` + `plans/code/core/go/io/` |
| CoreGUI / CoreTS / CoreApp / core/agent / core/mcp | `plans/code/core/{gui,ts,app,agent,mcp}/` |

When in doubt about how something should look / behave / compose, **read the plan first**.

## Vi (Violet) — character canon

Vi is the spine of the Control Panel (not a chat widget). Created by a Lethean community member; Host UK is the Lethean community company so Vi belongs to both naturally.

> *The chill chick — a raven watching the tower for people, letting them know when the weather is changing or trouble is at the gates.*

Calm presence, not interruption. Surfaces what matters; doesn't perform. Italic Instrument Serif "*Quiet night.*" style is the conversational moment, used **sparingly** (one phrase per surface max). Don't write Vi copy that fights the chill-chick-raven character.

## Display modes — runtime-switchable, fully customisable

ClientHub (default) / ServerHub / GatewayHub / DeveloperHub / AdminHub. Same binary, runtime-switchable, fully customisable. Modes are surface compositions over the same underlying services. Users can flip without restart, enable/disable surfaces, reorder, define custom modes (`[data-mode="custom-foo"]`). State persists per-user via `core/config`.

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
