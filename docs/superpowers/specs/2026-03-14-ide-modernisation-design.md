# core/ide Modernisation — Lego Rewire

**Date:** 2026-03-14
**Status:** Approved

## Problem

core/ide was built before the ecosystem packages existed. It hand-rolls an MCP bridge, webview service, brain tools, and WebSocket relay that are now properly implemented in dedicated packages. The codebase is ~1,200 lines of duplicated logic.

## Solution

Replace all hand-rolled services with imports from the existing ecosystem. The IDE becomes a thin Wails shell that wires up `core.Core` with registered services.

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Wails 3                     │
│  ┌──────────┐  ┌──────────────────────────┐ │
│  │ Systray  │  │ Angular Frontend         │ │
│  │ (lifecycle)│  │ /tray (control pane)   │ │
│  │          │  │ /ide  (full IDE)         │ │
│  └────┬─────┘  └──────────┬───────────────┘ │
│       │                   │ WS              │
└───────┼───────────────────┼─────────────────┘
        │                   │
┌───────┼───────────────────┼─────────────────┐
│       │        core.Core  │                  │
│  ┌────┴─────┐  ┌─────────┴───────┐         │
│  │ display  │  │ go-ws Hub       │         │
│  │ Service  │  │ (Angular comms) │         │
│  │(core/gui)│  └─────────────────┘         │
│  └──────────┘                               │
│  ┌──────────────────────────────────────┐   │
│  │ core/mcp Service                     │   │
│  │  ├─ brain subsystem (OpenBrain)      │   │
│  │  ├─ gui subsystem (74 tools)         │   │
│  │  ├─ file ops (go-io sandboxed)       │   │
│  │  └─ transports: stdio, TCP, Unix     │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │go-config │  │go-process│  │ go-log   │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────┘
        │
        │ stdio (--mcp flag)
        │
┌───────┴─────────────────────────────────────┐
│  Claude Code / other MCP clients            │
└─────────────────────────────────────────────┘
```

## Application Lifecycle

- **Systray** is the app lifecycle. Quit from tray menu = shutdown Core.
- **Tray panel** is a 380x480 frameless Angular window attached to the tray icon. Renders a control pane (MCP status, connected agents, brain stats).
- **Windows** are disposable views — closing a window does not terminate the app.
- **macOS**: Accessory app (no Dock icon). Template tray icon.
- **go-config** reads `.core/config.yaml`. If `gui.enabled: false` (or no display), Wails is skipped entirely. Core still runs all services — MCP server, brain, etc.

## Service Wiring

Services are registered as factory functions via `core.WithService`. Each factory
receives the `*core.Core` instance and returns the service. Construction order
matters — the WS hub and IDE bridge must be built before the MCP service that
depends on them.

```go
func main() {
    cfg, _ := config.New()

    // Shared resources built before Core
    hub := ws.NewHub()
    bridgeCfg := ide.ConfigFromEnv()
    bridge := ide.NewBridge(hub, bridgeCfg)

    // Core framework — services run regardless of GUI
    c, _ := core.New(
        core.WithService(func(c *core.Core) (any, error) {
            return hub, nil  // go-ws hub for Angular + bridge
        }),
        core.WithService(display.Register(nil)),  // core/gui — nil platform until Wails starts
        core.WithService(func(c *core.Core) (any, error) {
            // MCP service with subsystems
            return mcp.New(
                mcp.WithWorkspaceRoot(cwd),
                mcp.WithSubsystem(brain.New(bridge)),
                mcp.WithSubsystem(guiMCP.New(c)),
            )
        }),
    )

    if guiEnabled(cfg) {
        startWailsApp(c, hub, bridge)
    } else {
        // No GUI — start Core lifecycle manually
        ctx, cancel := signal.NotifyContext(context.Background(),
            syscall.SIGINT, syscall.SIGTERM)
        defer cancel()
        startMCP(ctx, c)  // goroutine: mcpSvc.ServeStdio or ServeTCP
        bridge.Start(ctx)
        <-ctx.Done()
    }
}
```

### MCP Lifecycle

`mcp.Service` does not implement `core.Startable`/`core.Stoppable`. The MCP
transport must be started explicitly:

- **GUI mode**: `startWailsApp` starts `mcpSvc.ServeStdio(ctx)` or
  `mcpSvc.ServeTCP(ctx, addr)` in a goroutine alongside the Wails event loop.
  Wails quit triggers `mcpSvc.Shutdown(ctx)`.
- **No-GUI mode**: `startMCP(ctx, c)` starts the transport in a goroutine.
  Context cancellation (SIGINT/SIGTERM) triggers shutdown.

### Version Alignment

After updating `go.mod` to import `core/mcp`, `core/gui`, etc., run
`go work sync` to align indirect dependency versions across the workspace.

## MCP Server

The `core/mcp` package provides the standard MCP protocol server with three transports:

- **stdio** — for Claude Code integration via `.claude/.mcp.json`
- **TCP** — for network MCP clients (port from config, default 9877)
- **Unix socket** — for local IPC

Claude Code connects via stdio:

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

## Brain Subsystem

Already implemented in `core/mcp/pkg/mcp/brain`. Proxies to Laravel OpenBrain API via the IDE bridge (`core/mcp/pkg/mcp/ide`). Tools:

- `brain_remember` — store a memory (content, type, project, agent_id, tags)
- `brain_recall` — semantic search (query, top_k, project, type, agent_id)
- `brain_forget` — remove a memory by ID
- `brain_ensure_collection` — ensure Qdrant collection exists

Environment: `CORE_API_URL` (default `http://localhost:8000`), `CORE_API_TOKEN`.

## GUI Subsystem

The `core/gui/pkg/mcp.Subsystem` provides 74 MCP tools across 14 categories (webview, window, layout, screen, clipboard, dialog, notification, tray, environment, browser, contextmenu, keybinding, dock, lifecycle). These are only active when a display platform is registered.

The `core/gui/pkg/display.Service` bridges Core IPC to the Wails platform — window management, DOM interaction, event forwarding, WS event bridging for Angular.

## Files

### Delete (7 files)

| File | Replaced by |
|------|-------------|
| `mcp_bridge.go` | `core/mcp` Service + transports |
| `webview_svc.go` | `core/gui/pkg/webview` + `core/gui/pkg/display` |
| `brain_mcp.go` | `core/mcp/pkg/mcp/brain` |
| `claude_bridge.go` | `core/mcp/pkg/mcp/ide` Bridge |
| `headless_mcp.go` | Not needed — core/mcp runs in-process |
| `headless.go` | go-config `gui.enabled` flag. Jobrunner/poller extracted to core/agent (not in scope). |
| `greetservice.go` | Scaffold placeholder, not needed |

### Rewrite (1 file)

| File | Changes |
|------|---------|
| `main.go` | Thin shell: go-config, core.New with services, Wails systray, `--mcp` flag for stdio |

### Keep (unchanged)

| File/Dir | Reason |
|----------|--------|
| `frontend/` | Angular app — tray panel + IDE routes |
| `icons/` | Tray icons |
| `.core/build.yaml` | Build configuration |
| `CLAUDE.md` | Update after implementation |
| `go.mod` | Update dependencies |

## Dependencies

### Add

- `forge.lthn.ai/core/go` — DI framework, core.Core
- `forge.lthn.ai/core/mcp` — MCP server, brain subsystem, IDE bridge
- `forge.lthn.ai/core/gui` — display service, 74 MCP tools
- `forge.lthn.ai/core/go-io` — sandboxed filesystem
- `forge.lthn.ai/core/go-log` — structured logging + errors
- `forge.lthn.ai/core/go-config` — configuration

### Remove (indirect cleanup)

- `forge.lthn.ai/core/agent` — no longer imported directly (brain tools via core/mcp)
- Direct `gorilla/websocket` — replaced by go-ws

## Configuration

`.core/config.yaml`:

```yaml
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

## Testing

- Core framework tests live in their respective packages (core/mcp, core/gui)
- IDE-specific tests: Wails service startup, config loading, systray lifecycle
- Integration: `core-ide --mcp` stdio round-trip with a test MCP client

## Not In Scope

- Angular frontend changes (existing routes work as-is)
- New MCP tool categories beyond what core/mcp and core/gui already provide
- Jobrunner/Forgejo poller (was in headless.go — separate concern, belongs in core/agent)
- CoreDeno/TypeScript runtime integration (future phase)
