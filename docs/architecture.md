---
title: Architecture
description: Internal architecture of Core IDE — runtime composition, MCP server, transport selection, Conclave parity layer, frontend, hardening.
---

# Architecture

Core IDE is a single Go binary at `dappco.re/go/ide` that composes a Core ecosystem runtime, an embedded MCP server, an optional Wails GUI shell, and a transport layer that exposes everything through stdio MCP, HTTP MCP, or the GUI's in-process chat surface.

> **Identity:** This binary IS Lethean Desktop's IDE component. The plan that defines what Lethean Desktop is + how the Vi Control Panel chrome wraps the IDE surface lives at `plans/project/lthn/desktop/RFC.md`. Sections of the design (Vi Control Panel chrome, Lethean-3 token adoption) are designed but not yet integrated into the Angular frontend — the RFC §9 evolution-path table tracks what's shipped vs. planned.

## 1. Entry point

`cmd/core-ide/main.go` parses CLI flags, loads config, applies CLI overrides, composes a server, and runs it under a context that traps `SIGINT` + `SIGTERM`.

```go
func main() {
    flags, err := parseRuntimeFlags(core.Args()[1:])
    cfg, err := config.Load(config.DefaultPaths(flags.ConfigPath)...)
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

    ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
    defer stop()
    srv.Run(ctx)
}
```

### Flags

| Flag | Type | Purpose |
|------|------|---------|
| `--mcp` | bool | Run the MCP server on stdio (no GUI, no HTTP) |
| `--no-gui` | bool | Disable the GUI shell (keep MCP) |
| `--http <addr>` | string | Run MCP on HTTP at the given loopback address |
| `--token <token>` | string | Bearer token for HTTP transport |
| `--config <path>` | string | Override the default config path |

`transportMode(flags)` derives the effective transport: `http` if `--http` is set, `stdio` if `--mcp` is set, else config default.

## 2. Server composition

`pkg/server/server.go` defines `Server` + `NewServer(Options)`. Composition flow:

```
NewServer(Options)
  └─ composeRuntime(options)
        ├─ build *core.Core with the canonical Service.Register() pattern
        ├─ register MCP service (newMCPService)
        ├─ register WebSocket hub (ws)
        ├─ register process supervisor (process)
        ├─ select transport (SelectTransport — stdio / http)
        ├─ optionally enable relay listener
        └─ optionally compose GUIShell
```

`Options` shape (`pkg/server/options.go`):

```go
type Options struct {
    Config                    config.IDEConfig
    GUI                       bool
    Medium                    coreio.Medium  // pluggable storage backend
    MCP                       bool           // stdio MCP only mode
    PreferConfiguredTransport bool           // honour config-supplied transport
    extraCoreOptions          []core.CoreOption
}
```

`Options.Register()` returns a `func(*core.Core) core.Result` so the Server is itself a canonical Service that any container can register — same pattern as every other Core ecosystem package (per Mantis #1336).

## 3. The Conclave parity layer

`pkg/server/conclave.go` ensures the **same tool catalogue** is reachable through every transport. This is what makes "tool results match across stdio, HTTP, and GUI" a structural guarantee, not a hope.

When the runtime is composed in non-conclave mode, the MCP service is wrapped:

```go
if !mode.conclave {
    wrapConclaveTools(svc, groups, func() (*runtimeParts, error) {
        return composeRuntimeMode(options, runtimeMode{conclave: true})
    })
}
```

The wrapper recomposes a parallel runtime in conclave mode for tool execution, so HTTP-driven tool calls produce the same result as stdio-driven calls and as in-process chat-driven calls. The 19-tool MCP/action parity is enforced by [`pkg/server/integration_action_parity_test.go`](https://forge.lthn.sh/core/ide/src/branch/dev/go/pkg/server/integration_action_parity_test.go).

## 4. MCP service composition

`newMCPService(c)` builds a `coremcp.Service` from a list of subsystems. Subsystems contributing the editor-facing core (parity-tested across stdio / HTTP / GUI):

- `pkg/brain/` → `brain_*` (5 tools)
- `pkg/workspace/` → `workspace_*` (4 tools)
- `pkg/subagent/` → `subagent_*` (6 tools)
- `pkg/navigate/` → `core_navigate` (1 tool)
- `pkg/marketplace/` → `pkg_*` (3 tools)

Each subsystem implements the `mcp.Subsystem` interface from `core/mcp` and is registered via `core.WithService` or `core.WithName` factory functions.

The `pkg/chat/` package is not an MCP subsystem itself — it's a `ToolExecutor` consumer that calls the same MCP catalogue from inside the GUI shell.

### Orchestration-cockpit bridges (`pkg/server/*_bridge.go`)

Beyond the editor-facing core, `pkg/server/` exposes 80+ additional MCP tools wrapping canonical `core/*` packages and filesystem surfaces. These power the Developer-group panels (sessions, memory, tickets, forge, ts, php, etc.).

The bridges share one HTTP entry point at `:9877/mcp/call` (handled by `MCPBridge.handleCall`) and dispatch through a single switch in `mcp_bridge.go::dispatchTool()`. Each panel area lives in its own `<area>_bridge.go` file. Convention:

- Tool names: `<area>_<verb>` (e.g. `memory_list`, `forge_repos`, `session_inspect`)
- Handlers: `func (b *MCPBridge) tool<Area><Verb>(ctx, params) map[string]any`
- Per-area Service registration (where needed) lives in `<area>_init.go`

Cross-cutting infrastructure:

- **Auto-publish to Stream Hub** — `publishBridgeEvent()` after every dispatch publishes a JSON frame to `bridge.<tool>` + a wildcard `bridge` channel on the in-process Stream Hub. `/stream` becomes a live activity feed of every IDE action.
- **App-state cache** — heavy scanners route through `pkg/server/cache_bridge.go` which writes to `~/.core/ide-cache.db` (DuckDB). See [cache-architecture.md](cache-architecture.md).

See [panels.md](panels.md) for the full panel inventory and bridge mapping.

## 5. Transport selection

`pkg/server/transport.go` selects the active MCP transport from `Options` + config:

```go
func SelectTransport(cfg config.IDEConfig, mcpOnly bool, preferConfigured bool) (Transport, error) {
    if mcpOnly {
        return Transport{Mode: "stdio"}, nil
    }
    if preferConfigured {
        return selectConfiguredTransport(cfg, false)
    }
    // ... GUI default
}
```

Three transport modes:

| Mode | Trigger | Surface |
|------|---------|---------|
| `stdio` | `--mcp` flag | stdin/stdout MCP framing |
| `http` | `--http <addr>` flag (or `mcp.transport: tcp` in config) | HTTP server on loopback, bearer-token gated |
| `unix` | `mcp.transport: unix` in config | Unix domain socket |

### HTTP transport hardening

Defined as constants in `pkg/server/transport.go`:

```go
const (
    httpReadHeaderTimeout = 5 * time.Second
    httpReadTimeout       = 10 * time.Second
    httpWriteTimeout      = 10 * time.Second
    httpIdleTimeout       = 60 * time.Second
    httpMaxHeaderBytes    = 1 << 20    // 1 MiB
    httpMaxBodyBytes      = 10 << 20   // 10 MiB
)
```

Plus:

- Wildcard binds (`:9880`, `0.0.0.0:9880`) rejected at config-validation time
- HTTP server refuses to start without a bearer token
- All `/mcp/*` and REST endpoints check `Authorization: Bearer <token>`; bad tokens return `401`
- Relay listener is only enabled when path + loopback bind + bearer token are all configured

## 6. GUI shell

`pkg/server/gui.go` (when `Options.GUI = true`) composes a Wails 3 application + the Angular frontend embedded via `//go:embed`.

### Wails service registration

The Server itself is registered as a Wails service via the canonical `Service.Register()` pattern. The MCP service is reachable from inside the GUI through the same in-process executor as the chat surface — tool results are identical regardless of whether the call came from chat, stdio MCP, or HTTP MCP.

### System tray

Currently configured as a macOS "accessory" application (no Dock icon) with a system tray icon. On macOS, a template icon (`icons/apptray.png`) adapts to light/dark mode automatically.

The tray panel is a 380x480 frameless window pointing at the Angular `/tray` route.

### Frontend pages

Angular 20+ standalone components (no NgModules):

| Route | Component | Purpose |
|-------|-----------|---------|
| `/ide` | `IdeComponent` (`frontend/src/app/pages/ide/`) | Main IDE layout — currently a base layout that the Lethean-3 Vi Control Panel chrome will be adopted onto (designed, not yet integrated) |
| `/tray` | `TrayComponent` (`frontend/src/app/pages/tray/`) | Compact tray panel |

Shared components in `frontend/src/app/components/sidebar/` — sidebar component family.

### Wails runtime bridge

Frontend ↔ Go via `@wailsio/runtime`:

- **Generated bindings** in `frontend/bindings/` — auto-generated TypeScript functions calling Go methods by ID (direct goroutine calls, not HTTP).
- **Events.On** — subscribe to events emitted by Go.
- **Events.Emit** — send events to Go.

Lazily imported to avoid SSR issues:

```typescript
import('@wailsio/runtime').then(({ Events }) => {
    // ...
});
```

## 7. Persistence (`pkg/store/`)

Backed by `dappco.re/go/store` — SQLite KV + DuckDB workspace buffer. Workspace state, navigation history, subagent event log all persist through this layer.

Storage backend is pluggable via `coreio.Medium` injected on `Options` — Local, S3, Cube, in-memory all valid (per `dappco.re/go/io` Medium pattern). Default: Local Medium under XDG paths.

### App-state cache (`~/.core/ide-cache.db`)

Separate from `pkg/store/`, the orchestration-cockpit bridges share a DuckDB-backed cache that turns scanning panels into single-SELECT reads. Generic kv schema, per-collection TTLs, write-through on miss. Real-world wins: `ts_detect` 770→43ms (~18×), `forge_repos:core` 410→43ms (~10×).

See [cache-architecture.md](cache-architecture.md) for the schema, driver gotchas (DuckDB v1.8.5 TIMESTAMP/JSON quirks), and the cache-aware bridge pattern.

## 8. Configuration

Loaded via `pkg/config/Load(paths...)`. Defaults at XDG locations (`~/.config/core-ide/config.yaml` etc.). CLI flags applied as overrides via `config.ApplyCLIOverrides`.

```yaml
gui:
  enabled: true
mcp:
  transport: stdio       # stdio | tcp | unix
  tcp:
    port: 9877
brain:
  api_url: http://localhost:8000
  api_token: ""
ide:
  chat:
    enabled: true        # forced false when --no-gui set
```

## 9. Lifecycle + signals

`Server.Run(ctx)` blocks until the context is cancelled. The main entry point cancels the context on `SIGINT` or `SIGTERM`:

```go
ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
defer stop()
srv.Run(ctx)
```

Server shutdown drains:
1. Stop accepting new transport connections
2. Flush in-flight MCP calls (bounded by HTTP write timeout)
3. Quit the Wails app (if GUI mode)
4. Close store handles via `core.Result`-discipline `Close()` calls

## 10. Data flow — tool call across modes

The structural guarantee that `subagent_dispatch_guided` (or any tool) returns the same result via stdio, HTTP, and GUI:

```
─── stdio MCP ──────────────────────────┐
                                        ↓
─── HTTP MCP (bearer-gated) ──────→ Conclave wrapper
                                        ↓
─── GUI chat (chat.ToolExecutor) ──→ MCP service (newMCPService)
                                        ↓
                                    Subsystem dispatch
                                    (brain / workspace / subagent /
                                     navigate / marketplace)
                                        ↓
                                    Result — same shape across all transports
```

The Conclave wrapper is what enforces this — without it, each transport would compose its own runtime with its own state.

## 11. Cross-references

| Concern | Where |
|---------|-------|
| Lethean Desktop product framing | `plans/project/lthn/desktop/RFC.md` |
| Visual system + brand variants + native platform profiles | `plans/ops/hostuk/website/_design/lethean-3/` |
| Vi Control Panel chrome adoption (planned) | RFC §9 evolution-path table — designed, not yet integrated |
| `core/agent` (consumed for subagent dispatch) | `dappco.re/go/agent` |
| `core/mcp` (MCP service framework) | `dappco.re/go/mcp` |
| `core/gui` (Wails wrapper) | `dappco.re/go/gui` |
| `core/store` (persistence) | `dappco.re/go/store` |
| `core/io` (Medium pattern) | `dappco.re/go/io` |
| Pre-AI prototyping repo (`forge.lthn.ai/Snider/desktop`) | NOT a source of truth — see "if not in plans, not real" rule |

## 12. Port summary

| Port | Service | Mode | Default |
|------|---------|------|---------|
| 9877 | MCP TCP transport | When `mcp.transport: tcp` configured | Yes |
| 9880 | MCP HTTP transport | When `--http 127.0.0.1:9880` set | No (CLI-driven) |

Both must bind to loopback. External / wildcard binds are rejected.

## 13. Testing

Local verification contract per [`AGENTS.md`](../AGENTS.md):

```sh
GOWORK=off go mod tidy
GOWORK=off go vet ./...
GOWORK=off go test -count=1 ./...
gofmt -l .
bash /Users/snider/Code/core/go/tests/cli/v090-upgrade/audit.sh .
```

Test discipline:
- File-local — symbol exported in `foo.go` → tests in `foo_test.go` + runnable example in `foo_example_test.go`
- Good / Bad / Ugly triplet per exported symbol
- Examples print through `core.Println`, not `fmt.Println`
- No AX7 catch-all test files, no versioned test files, no stdlib-shaped compatibility packages

End-to-end smoke at `tests/smoke/run-end-to-end.sh` builds `/tmp/core-ide`, verifies the 19-tool catalogue across stdio + HTTP, exercises auth failures, confirms HTTP without token exits non-zero.

## 14. Build pipeline state (2026-05-04)

Per `plans/CLAUDE.md` §"Recent ide work":

- Workspace mode (`go vet ./...`) — CLEAN
- CI mode (`GOWORK=off go vet ./...`) — blocked on tag bumps for `dappco.re/go/store` (needs tag at SHA `d17ad7b` or later) and `dappco.re/go/gui` (needs tag at SHA `68f33e0` for wails3 alpha.83 `WebviewWindow` API parity)
- Recent commits: `0fcd4c6` wails3 alpha.83 + dev-mode working window; `7e0a698` finish core.Result cascade (Mantis #1341); `709c1e0` result-discards 9→0 (Mantis #1336); `94ab118` ax7 triplets + Example* gaps for service.go (Mantis #1336); `dc2e554` add canonical Service for Core registration (Mantis #1336)

## 15. Out of scope here

- **Vi Control Panel chrome adoption in the Angular frontend** — designed per Lethean-3, not yet integrated. Tracked in the desktop RFC §9 evolution-path table as ⏳.
- **Migration to CoreTS Web Components (Phase 4c)** — Angular continues until then.
- **Native iOS / iPadOS shells** — separate App Store sprint per Apple distribution pipeline at `RFC.xcode-pipeline.md` in the desktop plan.
- **Capability implementations** (blockchain, mining, encryption, filesystem) — composed from canonical specs in `plans/`, not implemented here.
