# Architecture

Core GUI uses a service-per-capability layout. Packages such as `browser`,
`clipboard`, `dock`, `environment`, `events`, `keybinding`, `menu`,
`notification`, `screen`, `systray`, `webview`, and `window` expose platform
interfaces plus service registration functions. This keeps native desktop
bindings behind small adapters and leaves the service logic testable with mocks.

`pkg/display` is the coordinating layer. It owns higher-level display APIs,
window orchestration, local `core://` scheme resolution, network and storage
views, preload composition, marketplace integration, and websocket event
delivery. It depends on lower-level packages but keeps their state transitions
behind explicit service methods and Core actions.

`pkg/mcp` maps GUI capabilities into MCP tools. Tool files stay narrow: each one
adapts MCP payloads to the corresponding service request and returns structured
Core results. `pkg/chat` provides conversation state, stream rendering, model
discovery, and tool-call handling for chat workflows.

The repository includes a local Wails replacement under `stubs/wails`. That stub
module gives tests stable application, window, event, menu, tray, screen,
dialog, and browser-window types. The source snapshot under `docs/ref/wails-v3`
is retained as reference material for compatibility work and is audited for the
same file-aware test/example shape as the rest of the tree.

Standard-library wrapper discipline is enforced through `dappco.re/go` and the
local `compat/*` packages. Product code should use Core helpers for formatting,
errors, strings, paths, environment, JSON, bytes, and process-adjacent APIs
instead of importing the banned packages directly.
