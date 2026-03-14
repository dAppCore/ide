# Runtime Provider Loading — Plugin Ecosystem

**Date:** 2026-03-14
**Status:** Approved
**Depends on:** Service Provider Framework, SCM Provider

## Problem

All providers are currently compiled into the binary. Users cannot install,
remove, or update providers without rebuilding core-ide. There's no plugin
ecosystem — every provider is a Go import in main.go.

## Solution

Runtime provider discovery using the Mining namespace pattern. Installed
providers run as managed processes with `--namespace` flags. The IDE's Gin
router proxies to them. JS bundles load dynamically in Angular. No recompile.

## Architecture

```
~/.core/providers/
├── cool-widget/
│   ├── manifest.yaml         # Name, namespace, element, permissions
│   ├── cool-widget            # Binary (or path to system binary)
│   ├── openapi.json          # OpenAPI spec
│   └── assets/
│       └── core-cool-widget.js  # Custom element bundle
├── data-viz/
│   ├── manifest.yaml
│   ├── data-viz
│   └── assets/
│       └── core-data-viz.js
└── registry.yaml             # Installed providers list
```

### Runtime Flow

```
                    core-ide (main process)
                    ┌─────────────────────────────────┐
                    │ Gin Router                       │
                    │  /api/v1/scm/*    → compiled in  │
                    │  /api/v1/brain/*  → compiled in  │
                    │  /api/v1/cool-widget/* → proxy ──┼──→ :9901 (cool-widget binary)
                    │  /api/v1/data-viz/*    → proxy ──┼──→ :9902 (data-viz binary)
                    │                                  │
                    │ Angular Shell                    │
                    │  <core-scm-panel>     → compiled │
                    │  <core-cool-widget>   → dynamic  │
                    │  <core-data-viz>      → dynamic  │
                    └─────────────────────────────────┘
```

## Manifest Format

`.core/manifest.yaml` (same as go-scm's manifest loader):

```yaml
code: cool-widget
name: Cool Widget Dashboard
version: 1.0.0
author: someone
licence: EUPL-1.2

# Provider configuration
namespace: /api/v1/cool-widget
port: 0                          # 0 = auto-assign
binary: ./cool-widget            # Relative to provider dir
args: []                         # Additional CLI args

# UI
element:
  tag: core-cool-widget
  source: ./assets/core-cool-widget.js

# Layout
layout: HCF
slots:
  H: toolbar
  C: dashboard
  F: status

# OpenAPI spec
spec: ./openapi.json

# Permissions (for TIM sandbox — future)
permissions:
  network: ["api.example.com"]
  filesystem: ["~/.core/providers/cool-widget/data/"]

# Signature
sign: <ed25519 signature>
```

## Provider Lifecycle

### Discovery

On startup, the IDE scans `~/.core/providers/*/manifest.yaml`:

```go
func DiscoverProviders(dir string) ([]RuntimeProvider, error) {
    entries, _ := os.ReadDir(dir)
    var providers []RuntimeProvider
    for _, e := range entries {
        if !e.IsDir() { continue }
        m, err := manifest.Load(filepath.Join(dir, e.Name()))
        if err != nil { continue }
        providers = append(providers, RuntimeProvider{
            Dir:      filepath.Join(dir, e.Name()),
            Manifest: m,
        })
    }
    return providers, nil
}
```

### Start

For each discovered provider:

1. Assign a free port (if `port: 0` in manifest)
2. Start the binary via go-process: `./cool-widget --namespace /api/v1/cool-widget --port 9901`
3. Wait for health check: `GET http://localhost:9901/health`
4. Register a `ProxyProvider` in the API engine that reverse-proxies to that port
5. Serve the JS bundle as a static asset at `/assets/{code}.js`

```go
type RuntimeProvider struct {
    Dir      string
    Manifest *manifest.Manifest
    Process  *process.Daemon
    Port     int
}

func (rp *RuntimeProvider) Start(engine *api.Engine, hub *ws.Hub) error {
    // Start binary
    rp.Port = findFreePort()
    rp.Process = process.NewDaemon(process.DaemonOptions{
        Command: filepath.Join(rp.Dir, rp.Manifest.Binary),
        Args:    append(rp.Manifest.Args, "--namespace", rp.Manifest.Namespace, "--port", strconv.Itoa(rp.Port)),
        PIDFile: filepath.Join(rp.Dir, "provider.pid"),
    })
    rp.Process.Start()

    // Wait for health
    waitForHealth(rp.Port)

    // Register proxy provider
    proxy := provider.NewProxy(provider.ProxyConfig{
        Name:      rp.Manifest.Code,
        BasePath:  rp.Manifest.Namespace,
        Upstream:  fmt.Sprintf("http://127.0.0.1:%d", rp.Port),
        Element:   rp.Manifest.Element,
        SpecFile:  filepath.Join(rp.Dir, rp.Manifest.Spec),
    })
    engine.Register(proxy)

    // Serve JS assets
    engine.Router().Static("/assets/"+rp.Manifest.Code, filepath.Join(rp.Dir, "assets"))

    return nil
}
```

### Stop

On IDE quit or provider removal:
1. Send SIGTERM to provider process
2. Remove proxy routes from Gin
3. Unload JS bundle from Angular

### Hot Reload (Development)

During development (`core dev` in a provider dir):
1. Watch for binary changes → restart process
2. Watch for JS changes → reload in Angular
3. Watch for manifest changes → re-register proxy

## Install / Remove

### Install

```bash
core install forge.lthn.ai/someone/cool-widget
```

1. Clone or download the provider repo
2. Verify Ed25519 signature in manifest
3. If Go source: `go build -o cool-widget .` in the provider dir
4. Copy to `~/.core/providers/cool-widget/`
5. Update `~/.core/providers/registry.yaml`
6. If IDE is running: hot-load the provider (no restart needed)

### Remove

```bash
core remove cool-widget
```

1. Stop the provider process
2. Remove from `~/.core/providers/cool-widget/`
3. Update `~/.core/providers/registry.yaml`
4. If IDE is running: unload the proxy + UI

### Update

```bash
core update cool-widget
```

1. Pull latest from git
2. Verify new signature
3. Rebuild if source-based
4. Stop old process, start new
5. Reload JS bundle

## Registry

`~/.core/providers/registry.yaml`:

```yaml
version: 1
providers:
  cool-widget:
    installed: "2026-03-14T12:00:00Z"
    version: 1.0.0
    source: forge.lthn.ai/someone/cool-widget
    auto_start: true
  data-viz:
    installed: "2026-03-14T13:00:00Z"
    version: 0.2.0
    source: github.com/user/data-viz
    auto_start: true
```

## Custom Binary Build

```bash
core build --brand "My Product" --include cool-widget,data-viz
```

Instead of runtime proxy, this compiles the selected providers directly
into the binary:

1. Read each provider's Go source
2. Import as compiled providers (not proxied)
3. Embed JS bundles via `//go:embed`
4. Set binary name, icon, and metadata from brand config
5. Output: single binary with everything compiled in

Same providers, two modes: proxied (plugin) or compiled (product).

## Provider Binary Contract

A provider binary must:

1. Accept `--namespace` flag (API route prefix)
2. Accept `--port` flag (HTTP listen port)
3. Serve `GET /health` → `{"status": "ok"}`
4. Serve its API under the namespace path
5. Optionally accept `--ws-url` flag to connect to IDE's WS hub for events

The element-template already scaffolds this pattern.

## Swagger Aggregation

The IDE's `SpecBuilder` aggregates OpenAPI specs from:
1. Compiled providers (via `DescribableGroup.Describe()`)
2. Runtime providers (via their `openapi.json` files)

Merged into one spec at `/swagger/doc.json`. The Swagger UI shows all
providers' endpoints in one place.

## Angular Dynamic Loading

Custom elements load at runtime without Angular knowing about them at
build time:

```typescript
// In the IDE's Angular shell
async function loadProviderElement(tag: string, scriptUrl: string) {
    if (customElements.get(tag)) return; // Already loaded

    const script = document.createElement('script');
    script.type = 'module';
    script.src = scriptUrl;
    document.head.appendChild(script);

    // Wait for registration
    await customElements.whenDefined(tag);
}
```

The tray panel and IDE layout call this for each Renderable provider
discovered at startup. Angular wraps the custom element in a host component
for the HLCRF slot assignment.

## Security

### Signature Verification

All manifests must be signed (Ed25519). Unsigned providers are rejected
unless `--allow-unsigned` is passed (development only).

### Process Isolation

Provider processes run as the current user with no special privileges.
Future: TIM containers for full sandbox (filesystem + network isolation
per the manifest's permissions declaration).

### Network

Providers listen on `127.0.0.1` only. No external network exposure.
The IDE's Gin router is the only entry point.

## Implementation Location

| Component | Package | New/Existing |
|-----------|---------|-------------|
| Provider discovery | go-scm/marketplace | Extend existing |
| Process management | go-process | Existing daemon API |
| Proxy provider | core/api/pkg/provider | New: proxy.go |
| Install/remove CLI | core/cli cmd/ | New commands |
| Runtime loader | core/ide | New: runtime.go |
| JS dynamic loading | core/ide frontend/ | New: provider-loader service |
| Registry file | go-scm/marketplace | Extend existing |

## Not In Scope

- TIM container sandbox (future — Phase 4 from provider framework spec)
- Provider marketplace server (git-based discovery is sufficient)
- Revenue sharing / paid providers (future — SMSG licensing)
- Angular module federation (future — current pattern is custom elements)
- Multi-language provider SDKs (future — element-template is Go-first)
