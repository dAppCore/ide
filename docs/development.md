---
title: Development
description: How to build, test, and contribute to Core IDE — Lethean Desktop's IDE component.
---

# Development

This is the developer guide for `core/ide` — the binary that ships as **Lethean Desktop's IDE component**. The product-level plan lives in the canonical plans tree at `plans/project/lthn/desktop/RFC.md`. This document covers the local-build mechanics; for what the binary IS, see [`index.md`](index.md) and the linked plan.

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Go | 1.26+ | Backend compilation |
| Node.js | 22+ | Angular frontend build |
| npm | (bundled with Node) | Frontend dependency management |
| Wails 3 CLI | alpha.83+ | Desktop application framework (`wails3`) |
| `core` CLI | latest | Build system (`core build`) |
| Task | 3+ | Build orchestration (`Taskfile.yml`) |

The module path is `dappco.re/go/ide`. Dependencies are sourced from the `dappco.re/go/*` namespace via the workspace at `~/Code/go.work`. External submodule pins live under `external/` (one submodule per dependency — `external/{config,go,gui,io,log,mcp,process,rag,scm,store,webview,ws}`). Workspace mode pulls fresh from `external/`; CI mode (`GOWORK=off`) falls back to tagged versions in `go/go.mod`.

```sh
# First-time setup on a fresh clone
git submodule update --init --recursive
cd go && GOWORK=off go mod tidy
```

## Building

### Development mode (hot-reload)

```bash
wails3 dev
```

Starts the Angular dev server, watches Go files for changes, rebuilds, and re-launches the application automatically. Wails dev mode configuration is in `build/config.yml` under the `dev_mode` key.

### Production build

```bash
core build              # Preferred — uses .core/build.yaml
wails3 build            # Alternative
task build              # Via Taskfile (auto-routes to current OS)
task darwin:build       # Explicit per-OS targets
task darwin:package     # Package as .app bundle
task linux:build
task windows:build
```

`.core/build.yaml` enables CGO (required by Wails), strips debug symbols (`-s -w`), and uses `-trimpath`.

### Cross-compilation targets

Defined in `.core/build.yaml`:

| OS | Architecture |
|----|-------------|
| darwin | arm64 |
| linux | amd64 |
| windows | amd64 |

### Frontend-only build

```bash
cd frontend
npm install
npm run dev       # Vite dev server, hot-reload
npm run build     # Production build to frontend/dist/
npm run test      # Angular test suite
```

## Testing

### Local verification contract

Per [`AGENTS.md`](../AGENTS.md):

```sh
GOWORK=off go mod tidy
GOWORK=off go vet ./...
GOWORK=off go test -count=1 ./...
gofmt -l .
bash /Users/snider/Code/core/go/tests/cli/v090-upgrade/audit.sh .
```

The audit script is the compliance source of truth. A change is not ready while any audit dimension reports a non-zero counter.

### Per-test commands

```bash
core go test                      # All tests (workspace mode)
core go test --run TestName       # Single test
core go cov                       # Coverage report
core go cov --open                # Coverage HTML in browser
core go qa                        # Format + vet + lint + test
core go qa full                   # + race detector, vuln scan, security audit
```

### End-to-end smoke

```sh
tests/smoke/run-end-to-end.sh
```

Builds `/tmp/core-ide`, verifies stdio MCP exposes 19 tools, verifies HTTP bearer auth exposes the same 19 tools, calls `workspace_status` through the HTTP tool bridge, checks malformed tool input + schema validation failures, checks unauthenticated HTTP returns `401`, and confirms HTTP mode without a token exits with status `1`.

### Live OpenBrain (build-tagged, opt-in)

```sh
CORE_BRAIN_INTEGRATION=1 CORE_BRAIN_KEY=$CORE_BRAIN_KEY \
  go test -tags integration -run TestLive ./pkg/brain/...
```

### Frontend tests

```sh
cd frontend && npm run test
```

### Test-file conventions

Per [`AGENTS.md`](../AGENTS.md):

- File-local — symbol exported in `foo.go` → tests in `foo_test.go` + runnable example in `foo_example_test.go`.
- Good / Bad / Ugly triplet per exported symbol — test bodies must reference the symbol token directly.
- Examples print through `core.Println`, not `fmt.Println`. `// Output:` blocks must match real output.
- No AX7 catch-all test files. No versioned test files. No stdlib-shaped compatibility packages.
- Shared helpers stay small and live in the package's normal test file.

### CI pipelines

| Pipeline | Location | Trigger |
|----------|----------|---------|
| Forgejo `test.yml` | `.forgejo/workflows/test.yml` | Push to `main`/`dev`, PRs to `main` |
| Forgejo `security-scan.yml` | `.forgejo/workflows/security-scan.yml` | Push to `main`/`dev`/`feat/*`, PRs |
| GitHub `ci.yml` | `.github/workflows/ci.yml` | Push (mirror) |

GitHub is the public mirror; forge.lthn.sh is the homelab; forge.lthn.ai is the public Forgejo.

**CI mode caveat (2026-05-04):** `GOWORK=off go vet ./...` currently blocks on tag bumps for `dappco.re/go/store` (needs SHA `d17ad7b` or later) and `dappco.re/go/gui` (needs SHA `68f33e0` for wails3 alpha.83 `WebviewWindow` API parity). Workspace-mode `go vet ./...` is CLEAN. Tag-bump tickets pending.

## Project structure

```
ide/
├── go/                            # Go module root (module: dappco.re/go/ide)
│   ├── cmd/
│   │   └── core-ide/              # Entry point
│   │       ├── main.go            # Main — flag parse, config load, server compose
│   │       └── flags.go           # CLI flag definitions
│   ├── pkg/
│   │   ├── ai/                    # Agent dispatch surface
│   │   ├── brain/                 # OpenBrain memory (5 tools)
│   │   ├── chat/                  # Chat surface — ToolExecutor consumer
│   │   ├── config/                # IDEConfig + XDG paths + CLI overrides
│   │   ├── marketplace/           # Package marketplace (3 tools)
│   │   ├── navigate/              # Cross-surface navigation (1 tool)
│   │   ├── server/                # Server lifecycle, transports, Conclave parity
│   │   ├── store/                 # go-store backed persistence
│   │   ├── subagent/              # Subagent relay (6 tools)
│   │   └── workspace/             # Workspace inspection (4 tools)
│   ├── tests/
│   │   └── smoke/                 # End-to-end smoke scripts
│   ├── third_party/               # Third-party Go code (excluded from audit)
│   ├── go.mod
│   └── go.sum
├── frontend/                      # Angular 20+ (embedded via //go:embed)
│   ├── src/app/
│   │   ├── app.ts                 # Root component (router outlet)
│   │   ├── app.routes.ts          # Routes (/ide, /tray)
│   │   ├── app.config.ts          # Angular providers
│   │   ├── pages/
│   │   │   ├── ide/               # Main IDE layout (target for Lethean-3 chrome)
│   │   │   └── tray/              # System tray panel (380x480 frameless)
│   │   └── components/
│   │       └── sidebar/           # Navigation sidebar
│   ├── bindings/                  # Auto-generated TypeScript bindings
│   ├── package.json
│   └── angular.json
├── external/                      # Submodule pins for dappco.re/go/* deps
│   ├── config/  go/  gui/  io/  log/  mcp/  process/
│   ├── rag/  scm/  store/  webview/  ws/
├── build/                         # Platform build configs
│   ├── config.yml                 # Wails 3 project config
│   ├── appicon.png
│   ├── darwin/                    # macOS Info.plist, .icns, Taskfile
│   ├── linux/                     # systemd, AppImage, nfpm
│   ├── windows/                   # NSIS, MSIX
│   └── Taskfile.yml               # Cross-platform build tasks
├── icons/                         # Tray icons
├── .core/
│   └── build.yaml                 # core build configuration
├── .forgejo/workflows/            # Forgejo CI
├── .github/workflows/             # GitHub mirror CI
├── Taskfile.yml                   # Top-level build orchestration
├── go.work                        # Workspace mode (consumes external/*)
├── README.md
├── CLAUDE.md
├── AGENTS.md
├── docs/                          # This documentation
└── LICENCE                        # EUPL-1.2
```

The `go/README.md`, `go/CLAUDE.md`, `go/AGENTS.md`, and `go/docs` paths are symlinks back to the root copies.

## Adding a new MCP tool / Action

The MCP service is composed from subsystems in `pkg/server/conclave.go` via `newMCPService(c)`. To add a new tool, add it to a subsystem (don't reach for a top-level switch — that's the old shape).

1. Pick the subsystem the tool belongs to (`pkg/brain/`, `pkg/workspace/`, `pkg/subagent/`, `pkg/navigate/`, `pkg/marketplace/`) — or create a new subsystem if it's its own concern.

2. Add the tool definition + handler in the subsystem's `register.go`. Each tool implements the `mcp.Subsystem` interface from `dappco.re/go/mcp`.

3. Add the tool to the parity test list at [`pkg/server/integration_action_parity_test.go`](https://forge.lthn.sh/core/ide/src/branch/dev/go/pkg/server/integration_action_parity_test.go) so the count + parity remains enforced.

4. Add Good / Bad / Ugly triplet tests in `<file>_test.go` + a runnable `<file>_example_test.go`.

5. The Conclave wrapper (`pkg/server/conclave.go`) ensures the new tool is reachable identically across stdio MCP, HTTP MCP, and the GUI's chat surface — no per-transport plumbing required.

## Adding a new Angular page

1. Create the standalone component:

```sh
cd frontend
npx ng generate component pages/my-page --standalone
```

2. Register the route in `frontend/src/app/app.routes.ts`:

```typescript
import { MyPageComponent } from './pages/my-page/my-page.component';

export const routes: Routes = [
    { path: 'my-page', component: MyPageComponent },
    // existing routes
];
```

3. If the page needs Go data, use the Wails runtime (lazy-import to avoid SSR issues):

```typescript
import('@wailsio/runtime').then(({ Events }) => {
    // Subscribe
    Events.On('my-event', (data) => { ... });
    // Emit
    Events.Emit('my-action', payload);
});
```

Or call generated bindings directly:

```typescript
import { SomeService } from '../bindings';
const result = await SomeService.SomeMethod(args);
```

4. **Adopt the Lethean-3 design tokens** when building new surfaces. Pull from `plans/ops/hostuk/website/_design/lethean-3/tokens.css` (canonical) — oklch colour math, brand variants via `[data-brand="hostuk|lethean"]`, platform overrides via `[data-platform="darwin|ios|ipad"]`. Default brand for the IDE is Lethean (cool indigo, hue 270).

## Adding a new Go service / package

1. Pick or create a `pkg/<name>/` directory under `go/pkg/`.

2. Provide a `service.go` with:
   - A `Service` struct + `New()` constructor
   - A `Register(*core.Core) core.Result` function (canonical Service registration pattern per Mantis #1336)

3. Wire the service into `pkg/server/server.go` `composeRuntime()` so it boots with the rest of the runtime.

4. Add Good / Bad / Ugly triplet tests + runnable example.

5. If the service exposes MCP tools, register a subsystem (see "Adding a new MCP tool / Action" above).

## Coding standards

Per the canonical Core ecosystem rules (also enforced by the audit script):

- **Use `dappco.re/go` primitives** in new Go code. Direct imports of `fmt`, `errors`, `strings`, `path/filepath`, `os`, `log`, `encoding/json`, and `bytes` are not part of this repo's style — the Core wrapper package provides the formatting, error wrapping, string, path, filesystem, JSON, and buffer APIs the audit expects.
- **All errors carry `core.Result`** — no naked Go `error` returns post-Mantis #1341. Errors propagate via structured `OK`/`Cause`/`Scope` fields.
- **UK English** in documentation and user-facing strings (colour, organisation, centre).
- **Strict typing** — explicit parameter and return types on every function.
- **EUPL-1.2 licence** — copyright header where appropriate.

## Commit conventions

```
type(scope): description
```

Co-author trailer:

```
Co-Authored-By: Virgil <virgil@lethean.io>
```

The `dev` branch is the working branch (default); `main` is PR-only and protected on forge.lthn.sh.

## Platform notes

### macOS

- Application runs as an **accessory** (`ActivationPolicyAccessory`) — no Dock icon, system tray only
- Bundle identifier: `com.lethean.core-ide`
- Minimum macOS version: 10.15 (Catalina)
- `Info.plist` at `build/darwin/Info.plist`
- Tray icon `icons/apptray.png` is a template image — adapts to light/dark mode automatically

### Linux

- systemd service file: `build/linux/core-ide.service`
- User-scoped systemd: `build/linux/core-ide.user.service`
- nfpm packaging: `build/linux/nfpm/nfpm.yaml`
- AppImage build script: `build/linux/appimage/build.sh`
- Display detection uses `DISPLAY` or `WAYLAND_DISPLAY`

### Windows

- NSIS installer: `build/windows/nsis/project.nsi`
- MSIX template: `build/windows/msix/template.xml`
- `hasDisplay()` always returns `true`

### iOS / iPadOS

Native shells are designed (Lethean-3 N2 / N3) but not yet built. Distribution mechanics for the App Store sprint live in the desktop plan at [`plans/project/lthn/desktop/RFC.xcode-pipeline.md`](https://forge.lthn.sh/core/plans/src/branch/main/project/lthn/desktop/RFC.xcode-pipeline.md). iOS/iPad surfaces consume the same Vi data model as Wails desktop via local JSON RPC (Wails bindings aren't an option on Apple touch platforms).

## Where to ask if you get stuck

- **What does Lethean Desktop look like / compose / ship as?** → `plans/project/lthn/desktop/RFC.md`
- **What does the design system say?** → `plans/ops/hostuk/website/_design/lethean-3/`
- **Who is Vi and how should she sound?** → `plans/ops/hostuk/website/_design/lethean-3/uploads/mascot-raven.md` + `BRAND-VOICE.md`
- **What's the canonical pattern for X package in the Core ecosystem?** → check the equivalent package's `service.go` — they all follow the canonical Service registration pattern post-Mantis #1336
- **What's the audit complaining about?** → run the audit script (`bash /Users/snider/Code/core/go/tests/cli/v090-upgrade/audit.sh .`) and fix until counters are zero

If a capability isn't defined in the plans tree, **it isn't real** — flag the gap to Snider or Cladius rather than improvising.
