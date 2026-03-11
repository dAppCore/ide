---
title: Development
description: How to build, test, and contribute to Core IDE.
---

# Development

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Go | 1.26+ | Backend compilation |
| Node.js | 22+ | Angular frontend build |
| npm | (bundled with Node) | Frontend dependency management |
| Wails 3 CLI | alpha.64+ | Desktop application framework (`wails3`) |
| `core` CLI | latest | Build system (`core build`) |

The module lives inside a Go workspace (`~/Code/go.work`) and depends on three sibling modules via `replace` directives in `go.mod`:

```
replace (
    forge.lthn.ai/core/go         => ../go
    forge.lthn.ai/core/go-process => ../go-process
    forge.lthn.ai/core/gui        => ../gui
)
```

Ensure these directories exist alongside the `ide/` directory before building.

## Building

### Development mode (hot-reload)

```bash
wails3 dev
```

This starts the Angular dev server, watches Go files for changes, rebuilds, and re-launches the application automatically. The Wails dev mode configuration is in `build/config.yml` under the `dev_mode` key.

### Production build

Using the Core CLI (preferred):

```bash
core build
```

This reads `.core/build.yaml` and produces a platform-native binary. The build configuration enables CGO (required by Wails), strips debug symbols (`-s -w`), and uses `-trimpath`.

Using Wails directly:

```bash
wails3 build
```

### Cross-compilation targets

The `.core/build.yaml` defines three targets:

| OS | Architecture |
|----|-------------|
| darwin | arm64 |
| linux | amd64 |
| windows | amd64 |

### Frontend-only build

To build or serve the Angular frontend independently (useful for UI-only development):

```bash
cd frontend
npm install
npm run dev       # Development server with hot-reload
npm run build     # Production build to frontend/dist/
npm run test      # Run Jasmine/Karma tests
```

## Testing

### Go tests

```bash
core go test                    # Run all tests
core go test --run TestName     # Run a specific test
core go cov                     # Generate coverage report
core go cov --open              # Open coverage HTML in browser
```

### Frontend tests

```bash
cd frontend
npm run test
```

This runs the Angular test suite via Karma with Chrome.

### Quality assurance

```bash
core go qa          # Format + vet + lint + test
core go qa full     # + race detector, vulnerability scan, security audit
```

### CI pipelines

Two Forgejo workflows are configured in `.forgejo/workflows/`:

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `test.yml` | Push to `main`/`dev`, PRs to `main` | Runs Go tests with race detection and coverage |
| `security-scan.yml` | Push to `main`/`dev`/`feat/*`, PRs to `main` | Runs security scanning |

Both workflows are reusable, imported from `core/go-devops`.

## Project structure

```
ide/
  main.go                 # Entry point
  mcp_bridge.go           # MCPBridge Wails service (GUI mode)
  claude_bridge.go        # WebSocket relay to upstream MCP
  headless.go             # Headless daemon (job runner)
  headless_mcp.go         # Headless MCP HTTP server
  greetservice.go         # Sample Wails service
  icons/
    icons.go              # Embedded icon assets
    apptray.png           # System tray icon
    systray-mac-template.png
    systray-default.png
  frontend/
    src/
      app/
        app.ts            # Root component (router outlet)
        app.routes.ts     # Route definitions (/tray, /ide)
        app.config.ts     # Angular providers
        pages/
          tray/           # System tray panel component
          ide/            # Full IDE layout component
        components/
          sidebar/        # Navigation sidebar component
    bindings/             # Auto-generated Go method bindings
    package.json          # npm dependencies
    angular.json          # Angular CLI configuration
  build/
    config.yml            # Wails 3 project configuration
    appicon.png           # Application icon
    darwin/               # macOS-specific (Info.plist, .icns)
    linux/                # Linux-specific (systemd, AppImage, nfpm)
    windows/              # Windows-specific (NSIS, MSIX, manifest)
  .core/
    build.yaml            # core build configuration
  .forgejo/
    workflows/            # CI pipeline definitions
  go.mod
  go.sum
```

## Adding a new Wails service

1. Create a new Go file with a struct and methods you want to expose to the frontend:

```go
// myservice.go
package main

type MyService struct{}

func (s *MyService) DoSomething(input string) (string, error) {
    return "result: " + input, nil
}
```

2. Register the service in `main.go`:

```go
Services: []application.Service{
    application.NewService(&GreetService{}),
    application.NewService(mcpBridge),
    application.NewService(&MyService{}),  // add here
},
```

3. Run `wails3 dev` or `wails3 build` to regenerate TypeScript bindings in `frontend/bindings/`.

4. Import and call the generated function from Angular:

```typescript
import { DoSomething } from '../bindings/changeme/myservice';

const result = await DoSomething('hello');
```

## Adding a new MCP tool

To add a new webview tool to the MCP bridge:

1. Add the tool metadata to the `handleMCPTools` method in `mcp_bridge.go`:

```go
{"name": "webview_my_tool", "description": "What it does"},
```

2. Add a case to the `executeWebviewTool` switch in `mcp_bridge.go`:

```go
case "webview_my_tool":
    windowName := getStringParam(params, "window")
    // Call webview.Service methods...
    result, err := b.webview.SomeMethod(windowName)
    if err != nil {
        return map[string]any{"error": err.Error()}
    }
    return map[string]any{"result": result}
```

3. The tool is immediately available via `POST /mcp/call`.

## Adding a new Angular page

1. Create a new component:

```bash
cd frontend
npx ng generate component pages/my-page --standalone
```

2. Add a route in `frontend/src/app/app.routes.ts`:

```typescript
import { MyPageComponent } from './pages/my-page/my-page.component';

export const routes: Routes = [
    { path: 'my-page', component: MyPageComponent },
    // ... existing routes
];
```

3. If the page needs to communicate with Go, use the Wails runtime:

```typescript
import { Events } from '@wailsio/runtime';

// Listen for Go events
Events.On('my-event', (data) => { ... });

// Send events to Go
Events.Emit('my-action', payload);
```

## Platform-specific notes

### macOS

- The application runs as an "accessory" (`ActivationPolicyAccessory`), meaning it has no Dock icon and only appears in the system tray.
- Bundle identifier: `com.lethean.core-ide`
- Minimum macOS version: 10.15 (Catalina)
- The `Info.plist` is at `build/darwin/Info.plist`.

### Linux

- A systemd service file is provided at `build/linux/core-ide.service` for running in headless mode.
- A user-scoped service file is also available at `build/linux/core-ide.user.service`.
- nfpm packaging configuration is at `build/linux/nfpm/nfpm.yaml`.
- AppImage build script is at `build/linux/appimage/build.sh`.
- Display detection uses `DISPLAY` or `WAYLAND_DISPLAY` environment variables.

### Windows

- NSIS installer configuration: `build/windows/nsis/project.nsi`
- MSIX package template: `build/windows/msix/template.xml`
- `hasDisplay()` always returns `true` on Windows.

## Coding standards

- **UK English** in all documentation and user-facing strings (colour, organisation, centre).
- **Strict typing** -- all Go functions have explicit parameter and return types.
- **Formatting** -- run `core go fmt` before committing.
- **Linting** -- run `core go lint` to catch issues.
- **Licence** -- EUPL-1.2. Include the copyright header where appropriate.

## Commit conventions

Use conventional commits:

```
type(scope): description
```

Include the co-author line:

```
Co-Authored-By: Virgil <virgil@lethean.io>
```
