---
title: Architecture
description: Internal architecture of Core IDE -- Go backend, Angular frontend, MCP bridge, headless job runner, and data flow between components.
---

# Architecture

Core IDE is a single binary that operates in two distinct modes, selected at startup.

## Mode selection

In `main.go`, the entry point inspects the command-line arguments and the display environment:

```go
if headless || !hasDisplay() {
    startHeadless()
    return
}
```

`hasDisplay()` returns `true` on Windows unconditionally, and on Linux/macOS only when `DISPLAY` or `WAYLAND_DISPLAY` is set. This means the binary automatically falls back to headless mode on servers.

## GUI mode

### Wails application

The GUI is a Wails 3 application. The Angular frontend is embedded into the binary at compile time via `//go:embed`:

```go
//go:embed all:frontend/dist/wails-angular-template/browser
var assets embed.FS
```

Two Wails services are registered:

- `GreetService` -- a minimal service demonstrating Wails method bindings.
- `MCPBridge` -- the main service that wires up the MCP HTTP server, WebSocket hub, and webview automation.

### System tray

The application runs as a macOS "accessory" (no Dock icon) with a system tray icon. Clicking the tray icon reveals a 380x480 frameless window at `/tray` that shows quick stats, recent projects, and action buttons.

On macOS, a template icon (`icons/apptray.png`) is used so it adapts to light/dark mode automatically. On other platforms, the same icon is set as both light and dark variants.

### Angular frontend

The frontend is an Angular 20+ application using standalone components (no NgModules). It has two routes:

| Route | Component | Purpose |
|-------|-----------|---------|
| `/tray` | `TrayComponent` | Compact system tray panel -- status, quick actions, recent projects |
| `/ide` | `IdeComponent` | Full IDE layout with sidebar navigation |

The root route (`/`) redirects to `/tray` because the tray panel is the default window.

#### Wails runtime bridge

Components communicate with the Go backend through the `@wailsio/runtime` package:

- **Events.On** -- subscribes to events emitted by Go (e.g. `time` events for the clock display).
- **Events.Emit** -- sends events to Go (e.g. `action` events for quick actions like `new-project`, `run-dev`).
- **Generated bindings** -- `frontend/bindings/` contains auto-generated TypeScript functions that call Go methods by ID (e.g. `GreetService.Greet`).

The `IdeComponent` lazily imports `@wailsio/runtime` to avoid SSR issues:

```typescript
import('@wailsio/runtime').then(({ Events }) => {
    this.timeEventCleanup = Events.On('time', (time: { data: string }) => {
        this.currentTime.set(time.data);
    });
});
```

### MCPBridge

`MCPBridge` is the central orchestrator in GUI mode. It is registered as a Wails service and receives the `ServiceStartup` lifecycle callback once the application initialises.

#### Initialisation sequence

1. Obtain the Wails `application.App` reference.
2. Wire the `webview.Service` with the app so it can access windows.
3. Set up a console message listener on all windows.
4. Inject console capture JavaScript into existing windows (with a polling delay to wait for window creation).
5. Start the HTTP server on `127.0.0.1:9877`.

#### HTTP endpoints (GUI mode)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Returns `{"status":"ok","mcp":true,"webview":true}` |
| `/mcp` | GET | Server metadata (name, version, capabilities, WebSocket URL) |
| `/mcp/tools` | GET | Lists all 27 available webview tools |
| `/mcp/call` | POST | Executes a tool -- accepts `{"tool":"...","params":{...}}` |
| `/ws` | GET | WebSocket endpoint for GUI clients |

#### Webview tools

The MCP bridge exposes 27 tools for programmatic interaction with the application's webview windows. These are grouped by function:

**Window management:**
- `webview_list` -- enumerate all windows (name, title, URL)

**JavaScript execution:**
- `webview_eval` -- execute arbitrary JavaScript in a named window

**Console and errors:**
- `webview_console` -- retrieve captured console messages (filterable by level)
- `webview_console_clear` -- clear the console buffer
- `webview_errors` -- retrieve captured error messages

**DOM interaction:**
- `webview_click` -- click an element by CSS selector
- `webview_type` -- type text into an element
- `webview_query` -- query DOM elements by selector
- `webview_hover` -- hover over an element
- `webview_select` -- select an option in a dropdown
- `webview_check` -- check/uncheck a checkbox or radio button
- `webview_scroll` -- scroll to an element or position

**DOM inspection:**
- `webview_element_info` -- get detailed information about an element
- `webview_computed_style` -- get computed CSS styles for an element
- `webview_highlight` -- visually highlight an element with a coloured overlay
- `webview_dom_tree` -- get the DOM tree structure (configurable depth)

**Navigation:**
- `webview_navigate` -- navigate to a URL (http/https only)
- `webview_url` -- get the current page URL
- `webview_title` -- get the current page title
- `webview_source` -- get the full page HTML source

**Capture:**
- `webview_screenshot` -- capture the full page as a base64 PNG
- `webview_screenshot_element` -- capture a specific element as a base64 PNG
- `webview_pdf` -- export the page as a PDF (base64 data URI)
- `webview_print` -- open the native print dialogue

**Performance and network:**
- `webview_performance` -- get performance timing metrics
- `webview_resources` -- list loaded resources (scripts, stylesheets, images)
- `webview_network` -- get logged network requests
- `webview_network_clear` -- clear the network request log
- `webview_network_inject` -- inject a network interceptor for detailed logging

All tools accept parameters as JSON. Most require a `window` parameter (the window name, e.g. `"tray-panel"`) and a `selector` parameter (a CSS selector).

### ClaudeBridge

The `ClaudeBridge` is a WebSocket relay designed to forward messages between GUI WebSocket clients and an upstream MCP core server at `ws://localhost:9876/ws`. It maintains:

- A persistent connection to the upstream server with automatic reconnection (5-second backoff).
- A set of client connections (GUI browsers connecting via `/ws`).
- A broadcast channel that fans out messages from the upstream server to all connected clients.
- Message filtering -- only `claude_message` type messages from clients are forwarded upstream.

The Claude bridge is currently disabled in the code (`b.claudeBridge.Start()` is commented out) because port 9876 does not host an MCP WebSocket server at present.

## Headless mode

### Overview

Headless mode turns the binary into a CI/CD daemon. It polls Forgejo repositories for actionable events and dispatches work to AI agents.

### Components

```
startHeadless()
  |
  +-- Journal (filesystem, ~/.core/journal/)
  |
  +-- Forge client (Forgejo API)
  |
  +-- Forgejo source (repo list from CORE_REPOS env or defaults)
  |
  +-- Job handlers (ordered, first-match-wins):
  |     1. PublishDraftHandler
  |     2. SendFixCommandHandler
  |     3. DismissReviewsHandler
  |     4. EnableAutoMergeHandler
  |     5. TickParentHandler
  |     6. DispatchHandler (agent dispatch via Clotho spinner)
  |
  +-- Poller (60-second interval)
  |
  +-- Daemon (PID file at ~/.core/core-ide.pid, health at 127.0.0.1:9878)
  |
  +-- Headless MCP server (127.0.0.1:9877)
```

### Job handler pipeline

The poller queries the Forgejo source for jobs, then passes each job through the handler list. The first handler that matches claims the job. The handlers are ordered so that lightweight operations (publishing drafts, dismissing stale reviews) run before the heavy-weight agent dispatch.

The `DispatchHandler` uses the Clotho spinner to allocate work to configured AI agents. Agent targets and the Clotho configuration are loaded from the Core config system.

### Journal

The journal persists job state to `~/.core/journal/` on the filesystem. This prevents the same job from being processed twice across daemon restarts.

### HTTP endpoints (headless mode)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Returns `{"status":"ok","mode":"headless","cycle":<n>}` |
| `/mcp` | GET | Server metadata with `"mode":"headless"` |
| `/mcp/tools` | GET | Lists 3 tools: `job_status`, `job_set_dry_run`, `job_run_once` |
| `/mcp/call` | POST | Executes a headless tool |

### Headless tools

| Tool | Description |
|------|-------------|
| `job_status` | Returns current poll cycle count and dry-run state |
| `job_set_dry_run` | Enable or disable dry-run mode at runtime (`{"enabled": true}`) |
| `job_run_once` | Trigger a single poll-dispatch cycle immediately |

### Health check

The daemon exposes a separate health endpoint on port 9878 via the `go-process` package. This is distinct from the MCP health on port 9877 and is intended for process supervisors (systemd, launchd).

## Port summary

| Port | Service | Mode |
|------|---------|------|
| 9877 | MCP HTTP server (tools, WebSocket) | Both |
| 9878 | Daemon health check | Headless only |
| 9876 | Upstream MCP core (external, not started by this binary) | N/A |

## Data flow diagrams

### GUI mode

```
System Tray Click
  --> Tray Panel Window (/tray)
        --> Angular TrayComponent
              --> Events.Emit('action', ...)
                    --> Go event handler

MCP Client (e.g. Claude Code)
  --> POST /mcp/call {"tool":"webview_eval","params":{"window":"tray-panel","code":"..."}}
        --> MCPBridge.handleMCPCall()
              --> MCPBridge.executeWebviewTool()
                    --> webview.Service.ExecJS()
                          --> Wails webview
```

### Headless mode

```
Poller (every 60s)
  --> Forgejo Source (API query)
        --> Job list
              --> Handler pipeline
                    --> PublishDraft / SendFix / DismissReviews / ...
                    --> DispatchHandler
                          --> Clotho Spinner
                                --> Agent target
```
