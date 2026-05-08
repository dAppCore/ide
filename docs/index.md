---
title: Core IDE — Lethean Desktop's IDE component
description: Wails 3 + Angular IDE binary with embedded MCP server. Runs as stdio MCP, HTTP MCP, or GUI shell. Compile target for Lethean Desktop.
---

# Core IDE

This binary is **Lethean Desktop's IDE component** — the compile target for the umbrella native product across Darwin / Linux / Windows / iOS / iPadOS. The plan that defines what Lethean Desktop is, how the Vi Control Panel wraps the IDE surface, and where the design system flows in lives in the canonical plans tree at [`plans/project/lthn/desktop/RFC.md`](https://forge.lthn.sh/core/plans/src/branch/main/project/lthn/desktop/RFC.md).

> **If a capability isn't defined in the plans tree, it isn't real.** This binary owns *composition* — which packages get pulled in, how they wire at boot, how Vi surfaces them — not the *implementation* of each capability.

## What it does

`core-ide` exposes the Core IDE runtime as MCP tools, named Core actions, and a local chat shell. It composes workspace inspection, OpenBrain memory, subagent relay, navigation, package marketplace helpers, and chat into one process.

The Conclave layer wraps the MCP service so the same tool catalogue is reachable through three transports without surface drift.

## Three running modes

| Mode | Command | Use case |
|------|---------|----------|
| **stdio MCP** | `core-ide --mcp` | Editor clients — Claude Code, Cursor, Continue |
| **HTTP MCP** | `core-ide --no-gui --http 127.0.0.1:9880 --token $TOK` | Local agents — JetBrains, remote agents, anything wanting MCP-over-HTTP |
| **GUI shell** | `core-ide` (default) | Native desktop application, embedded Angular frontend |

GUI mode mounts chat and MCP against the same in-process executor — tool results are identical across modes.

Wildcard binds (`:9880`, `0.0.0.0:9880`) are rejected; HTTP transport requires an explicit loopback address and a bearer token.

## Quick start

### Prerequisites

- Go 1.26+
- Node.js 22+ and npm
- [Wails 3 CLI](https://v3alpha.wails.io/) (`wails3`) — currently tracking alpha.83
- The dappcore Go workspace (the module consumes `dappco.re/go/*` packages via workspace mode)

### Development

```bash
cd /path/to/core/ide

# Hot-reload GUI + Go rebuild
wails3 dev

# Production build (preferred — uses .core/build.yaml)
core build

# Frontend-only
cd frontend && npm install && npm run dev
```

### Connect to an editor (stdio MCP)

```json
{
  "mcpServers": {
    "core-ide": {
      "command": "core-ide",
      "args": ["--mcp"]
    }
  }
}
```

### Run as a local HTTP MCP server

```bash
core-ide --no-gui --http 127.0.0.1:9880 --token $(uuidgen)
```

The HTTP server requires both a loopback address and a bearer token; without them it refuses to start.

## Tool catalogue

The 19-tool MCP-action parity-tested core (Brain / Workspace / Subagent / Navigation / Marketplace) remains the editor-facing contract:

| Group | Tools |
|-------|-------|
| Brain | `brain_recall`, `brain_remember`, `brain_forget`, `brain_list`, `brain_context` |
| Workspace | `workspace_status`, `workspace_conventions`, `workspace_impact`, `workspace_scan` |
| Subagent | `subagent_guide`, `subagent_ask`, `subagent_progress`, `subagent_watch`, `subagent_answer`, `subagent_dispatch_guided` |
| Navigation | `core_navigate` |
| Marketplace | `pkg_search`, `pkg_info`, `pkg_install` |

Parity enforced by [`pkg/server/integration_action_parity_test.go`](https://forge.lthn.sh/core/ide/src/branch/dev/go/pkg/server/integration_action_parity_test.go). `subagent_watch` supports `cursor`, `limit`, `nextCursor`, and `hasMore` for paged event history.

### Orchestration cockpit bridges

Beyond the editor-facing core, the binary now exposes 80+ additional MCP bridge tools that compose the canonical `core/*` packages into a Developer-group panel surface (filesystem inspection, ticket browsers, transcript inspectors, container/process supervision, application-state cache, etc.).

See **[panels.md](panels.md)** for the full panel inventory and **[cache-architecture.md](cache-architecture.md)** for the DuckDB-backed app-state cache that ties them together (`ts_detect 770→43ms`, `forge_repos 410→43ms`).

## Package layout (`go/pkg/`)

| Package | Purpose |
|---------|---------|
| `pkg/ai/` | AI / agent integration (Claude / Codex dispatch surface) |
| `pkg/brain/` | Persistent memory (OpenBrain integration) |
| `pkg/chat/` | Local chat surface — mounts a `ToolExecutor` interface against the in-process MCP catalogue |
| `pkg/config/` | Configuration management — XDG paths + `.core/` convention |
| `pkg/marketplace/` | Package marketplace helpers (`pkg_search` / `pkg_info` / `pkg_install`) |
| `pkg/navigate/` | Navigation between IDE surfaces (`core_navigate`) |
| `pkg/server/` | HTTP / stdio / Wails server boot + the orchestration-cockpit bridge layer (`*_bridge.go` files — one per panel area) |
| `pkg/store/` | go-store backed persistence — workspace state, history, navigation breadcrumbs |
| `pkg/subagent/` | Subagent relay (history, dispatch, paged event watch) |
| `pkg/workspace/` | Workspace inspection + management |

The Go module root is `go/`. Module path: `dappco.re/go/ide`. From the repo root, `go/README.md`, `go/CLAUDE.md`, `go/AGENTS.md`, and `go/docs` are symlinks back to the root copies.

`pkg/server/` has grown a set of `<area>_bridge.go` files (one per Developer panel) — see **[panels.md](panels.md)** for the full list and the bridge-naming convention.

## Frontend layout

Angular 20+ application embedded into the binary at compile time via `//go:embed`. Two top-level pages:

| Page | Component | Purpose |
|------|-----------|---------|
| `/ide` | `IdeComponent` (`frontend/src/app/pages/ide/`) | Main IDE layout — orchestration-cockpit shell with sidebar + panel switcher (see [panels.md](panels.md)). The Lethean-3 Vi Control Panel chrome adoption is tracked in the desktop RFC §9. |
| `/tray` | `TrayComponent` (`frontend/src/app/pages/tray/`) | System tray panel (compact, frameless) |

`IdeComponent` is a single big Angular component with one `@case` per Developer-group route — file explorer, Monaco editor, source control, sessions, memory, tickets, etc. Each panel reaches Go through a corresponding `<area>_bridge.go` file.

Shared components live under `frontend/src/app/components/` (sidebar with grouped routes, plus the inline Lit Vi-panel primitives).

The frontend communicates with Go services through:

- `bridgeCall(tool, params)` — POST to `http://127.0.0.1:9877/mcp/call` (the in-process MCP HTTP bridge) for the orchestration-cockpit tools.
- `@wailsio/runtime` — direct goroutine calls via auto-generated TypeScript bindings in `frontend/bindings/`, plus event subscriptions for streaming surfaces (Vi presence, time tick).

UI state (open tabs, current route, workspace root, chat panel visibility) persists to `~/.core/config.yaml` so the IDE re-opens to the exact panel + files the user left.

## Configuration

```yaml
# .core/config.yaml
gui:
  enabled: true          # false = headless, MCP only
mcp:
  transport: stdio       # stdio | tcp | unix
  tcp:
    port: 9877
brain:
  api_url: http://localhost:8000
  api_token: ""          # or CORE_API_TOKEN env var
```

CLI flags (`--mcp`, `--no-gui`, `--http`, `--token`, `--config`) override config values.

### Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `CORE_API_URL` | `http://localhost:8000` | Laravel backend WebSocket URL |
| `CORE_API_TOKEN` | (empty) | Bearer token for Laravel backend auth |
| `MCP_ADDR` | (empty) | TCP address for MCP server (headless mode) |
| `CORE_BRAIN_INTEGRATION` | (empty) | Set to `1` to enable build-tagged live OpenBrain test |
| `CORE_BRAIN_KEY` | (empty) | API key for live OpenBrain test |

## HTTP hardening

The HTTP transport is built defensively from the ground up:

- HTTP mode refuses to start without a bearer token.
- REST and MCP-over-HTTP requests require `Authorization: Bearer <token>`; missing or wrong tokens return `401`.
- Listeners must bind to `localhost` or a loopback IP. Wildcards and externally routable addresses are rejected at config-validation time.
- Read-header / read / write / idle timeouts are bounded.
- Headers capped at 1 MiB. Bodies capped at 10 MiB.
- The relay listener is only enabled when a relay path, loopback bind, and bearer token are all configured.

## Testing

```sh
# Local verification contract (per AGENTS.md)
GOWORK=off go mod tidy
GOWORK=off go vet ./...
GOWORK=off go test -count=1 ./...
gofmt -l .
bash /Users/snider/Code/core/go/tests/cli/v090-upgrade/audit.sh .

# End-to-end smoke
tests/smoke/run-end-to-end.sh

# Live OpenBrain (build-tagged, opt-in)
CORE_BRAIN_INTEGRATION=1 CORE_BRAIN_KEY=$CORE_BRAIN_KEY \
  go test -tags integration -run TestLive ./pkg/brain/...
```

The end-to-end smoke script builds `/tmp/core-ide`, verifies stdio MCP exposes 19 tools, verifies HTTP bearer auth exposes the same 19 tools, calls `workspace_status` through the HTTP tool bridge, checks malformed tool input + schema validation failures, checks unauthenticated HTTP returns `401`, and confirms HTTP mode without a token exits with status `1`.

## More documentation

| Topic | Doc |
|-------|-----|
| Internal runtime + transport selection + Conclave parity layer | [architecture.md](architecture.md) |
| Build, test, contribute, hot-reload | [development.md](development.md) |
| Every Developer-group panel + cross-surface drill-down + bridge naming | [panels.md](panels.md) |
| DuckDB-backed app-state cache + driver gotchas + cache pill UX | [cache-architecture.md](cache-architecture.md) |

## Where the truth lives

| Concern | Canonical home |
|---------|----------------|
| Lethean Desktop product framing + service composition + Vi Control Panel | [`plans/project/lthn/desktop/RFC.md`](https://forge.lthn.sh/core/plans/src/branch/main/project/lthn/desktop/RFC.md) |
| Visual system + brand variants + native platform profiles | [`plans/ops/hostuk/website/_design/lethean-3/`](https://forge.lthn.sh/core/plans/src/branch/main/ops/hostuk/website/_design/lethean-3/) |
| Native chrome rules (Wails Darwin / iOS / iPadOS) | [`plans/ops/hostuk/website/_design/lethean-3/design_handoff_native_profiles/README.md`](https://forge.lthn.sh/core/plans/src/branch/main/ops/hostuk/website/_design/lethean-3/design_handoff_native_profiles/README.md) |
| Vi (Violet) mascot canon | [`plans/ops/hostuk/website/_design/lethean-3/uploads/mascot-raven.md`](https://forge.lthn.sh/core/plans/src/branch/main/ops/hostuk/website/_design/lethean-3/uploads/mascot-raven.md) |

## Licence

EUPL-1.2. See `LICENCE` at the repo root.
