# Core GUI

Core GUI is the Go backend surface for a desktop GUI built around Core services
and Wails-style application primitives. It provides service packages for browser
control, chat, clipboard, container/TIM lifecycle, context menus, dialogs,
display orchestration, dock integration, environment state, events, keybindings,
menus, notifications, peer-to-peer messaging, preload injection, screens,
system tray integration, webview automation, and window management.

The module is `dappco.re/go/gui`. It depends on `dappco.re/go` for Core
primitives and wraps Wails through `stubs/wails` so ordinary Go tests can run
without native desktop bindings. The packages expose small registration
functions and service objects that can be mounted into a Core runtime.

Typical local verification:

```sh
GOWORK=off go mod tidy
GOWORK=off go vet ./...
GOWORK=off go test -count=1 ./...
bash /Users/snider/Code/core/go/tests/cli/v090-upgrade/audit.sh .
```

Use `pkg/display` when wiring the full GUI experience. Use individual packages
when testing or embedding a narrow capability, such as `pkg/window` for window
state/layout, `pkg/preload` for trusted preload policy, or `pkg/mcp` for MCP tool
surfaces over the GUI services.
