# Service Provider Framework — Polyglot API + UI

**Date:** 2026-03-14
**Status:** Approved
**Depends on:** IDE Modernisation (2026-03-14)

## Problem

Each package in the ecosystem (Go, PHP, TypeScript) builds its own API endpoints,
WebSocket events, and UI components independently. There's no standard way for a
package to say "I provide these capabilities" and have them automatically
assembled into an API router, MCP server, or GUI.

The Mining repo proves the pattern works — Gin routes + WS events + Angular
custom element = full process management UI. But it's hand-wired for one use case.

## Vision

Any package in any language can register as a service provider. The contract is
OpenAPI. Go packages implement a Go interface directly. PHP and TypeScript
packages publish an OpenAPI spec and run their own HTTP handler — the API layer
reverse-proxies or aggregates. The result:

- Every provider automatically gets a REST API
- Every provider with a custom element automatically gets a GUI panel
- Every provider with tool descriptions automatically gets MCP tools
- The language the provider is written in is irrelevant

## Architecture

```
.core/config.yaml
    │
    ├─→ core/go-api (Service Registry)
    │     ├─ Go providers: implement Provider interface directly
    │     ├─ PHP providers: OpenAPI spec + reverse proxy to FrankenPHP
    │     ├─ TS providers: OpenAPI spec + reverse proxy to CoreDeno
    │     ├─ Assembled Gin router (all routes merged)
    │     └─ WS hub (all events merged)
    │
    ├─→ core/gui (Display Layer)
    │     ├─ Discovers Renderable providers
    │     ├─ Loads custom elements into Angular shell
    │     └─ HLCRF layout from .core/ config
    │
    ├─→ core/mcp (Tool Layer)
    │     ├─ Discovers Describable providers
    │     ├─ Registers as MCP tools
    │     └─ stdio/TCP/Unix transports
    │
    └─→ core/ide (Application Shell)
          ├─ Wails systray + Angular frontend
          ├─ Hosts go-api router
          └─ Hosts core/mcp server
```

## The Provider Interface (Go)

Lives in `core/go-api/pkg/provider/`. Built on top of the existing `RouteGroup`
and `DescribableGroup` interfaces — providers ARE route groups, not a parallel
system.

```go
// Provider extends RouteGroup with a provider identity.
// Every Provider is a RouteGroup and registers through api.Engine.Register().
type Provider interface {
    api.RouteGroup  // Name(), BasePath(), RegisterRoutes(*gin.RouterGroup)
}

// Streamable providers emit real-time events via WebSocket.
// The hub is injected at construction time. Channels() declares the
// event prefixes this provider will emit (e.g. "brain.*").
type Streamable interface {
    Provider
    Channels() []string  // Event prefixes emitted by this provider
}

// Describable providers expose structured route descriptions for OpenAPI.
// This extends the existing DescribableGroup interface.
type Describable interface {
    Provider
    api.DescribableGroup  // Describe() []RouteDescription
}

// Renderable providers declare a custom element for GUI display.
type Renderable interface {
    Provider
    Element() ElementSpec
}

type ElementSpec struct {
    Tag    string // e.g. "core-brain-panel"
    Source string // URL or embedded path to the JS bundle
}
```

Note: `Manageable` (Start/Stop/Status) is deferred to Phase 2. In Phase 1,
provider lifecycle is handled by `core.Core`'s existing `Startable`/`Stoppable`
interfaces — providers that need lifecycle management implement those directly
when registered as Core services.

### Registration

Providers register through the existing `api.Engine`, not a parallel router.
This gives them middleware, CORS, Swagger, health checks, and OpenAPI for free.

```go
engine, _ := api.New(
    api.WithCORS(),
    api.WithSwagger(),
    api.WithWSHub(hub),
)

// Register providers as route groups — they get middleware, OpenAPI, etc.
engine.Register(brain.NewProvider(bridge, hub))
engine.Register(daemon.NewProvider(registry))
engine.Register(build.NewProvider())

// Providers that are Streamable have the hub injected at construction.
// They call hub.SendToChannel("brain.recall.complete", event) internally.
```

The `Registry` type is a convenience wrapper that collects providers and
calls `engine.Register()` for each:

```go
reg := provider.NewRegistry()
reg.Add(brain.NewProvider(bridge, hub))
reg.Add(build.NewProvider())
reg.MountAll(engine)  // calls engine.Register() for each
```

## Polyglot Providers (PHP, TypeScript)

Non-Go providers don't implement the Go interface. They:

1. Publish an OpenAPI spec in `.core/providers/{name}.yaml`
2. Run their own HTTP server (FrankenPHP, CoreDeno, or any process)
3. The Go API layer discovers the spec and creates a reverse proxy route group

```yaml
# .core/providers/studio.yaml
name: studio
language: php
spec: openapi-3.json              # Path to OpenAPI spec
endpoint: http://localhost:8000    # Where the PHP handler listens
element:
  tag: core-studio-panel
  source: /assets/studio-panel.js
events:
  - studio.render.started
  - studio.render.complete
```

The Go registry wraps this as a `ProxyProvider` — it implements `Provider` by
reverse-proxying to the endpoint, `Describable` by reading the spec file,
and `Renderable` by reading the element config.

For real-time events, the upstream process connects to the Go WS hub as a
client (using `ws.ReconnectingClient`) or pushes events via the go-ws Redis
pub/sub backend. The `ProxyProvider` declares the expected channels from the
YAML config. The mechanism choice depends on deployment: Redis for multi-host,
direct WS for single-binary.

### OpenAPI as Contract

The OpenAPI spec is the single source of truth for:
- **go-api**: Route mounting and request validation
- **core/mcp**: Automatic MCP tool generation from endpoints
- **core/gui**: Form generation for Manageable providers
- **SDK codegen**: TypeScript/Python/PHP client generation (already in go-api)

A PHP package that publishes a valid OpenAPI spec gets all four for free.

## Discovery

Provider discovery follows the `.core/` convention:

1. **Static config** — `.core/config.yaml` lists enabled providers
2. **Directory scan** — `.core/providers/*.yaml` for polyglot provider specs
3. **Go registration** — `core.WithService(provider.Register(registry))` in main.go

```yaml
# .core/config.yaml
providers:
  brain:
    enabled: true
  studio:
    enabled: true
    endpoint: http://localhost:8000
  gallery:
    enabled: false
```

## GUI Integration

`core/gui`'s display service queries the registry for `Renderable` providers.
For each one, it:

1. Loads the custom element JS bundle (from `ElementSpec.Source`)
2. Creates an Angular wrapper component that hosts the custom element
3. Registers it in the available panels list
4. Layout is configured via `.core/config.yaml` or defaults to auto-arrangement

The Angular shell doesn't know about providers at build time. Custom elements
are loaded dynamically at runtime. This is the same pattern as Mining's
`<mbe-mining-dashboard>` — a self-contained web component that talks to the
Gin API via fetch/WS.

### Tray Panel

The systray control pane shows:
- List of registered providers with status indicators
- Start/Stop controls for Manageable providers
- Quick stats for Streamable providers
- Click to open full panel in a new window

## WS Event Protocol

All providers share a single WS hub. Events are namespaced by provider:

```json
{
    "type": "brain.recall.complete",
    "timestamp": "2026-03-14T10:30:00Z",
    "data": { "query": "...", "results": 5 }
}
```

Angular services filter by prefix (`brain.*`, `studio.*`, etc.).
This is identical to Mining's `WebSocketService` pattern but generalised.

## Implementation Phases

### Phase 1: Go Provider Framework (this spec)
- `Provider` interface (extends `RouteGroup`) + `Registry` in `core/go-api/pkg/provider/`
- Providers register through existing `api.Engine` — get middleware, OpenAPI, Swagger for free
- Streamable providers receive WS hub at construction, declare channel prefixes
- **go-process as first provider** — daemon registry, PID files, health checks → `<core-process-panel>`
- Brain as second provider
- core/ide consumes the registry
- Element template: [core-element-template](https://github.com/Snider/core-element-template) — Go CLI + Lit custom element scaffold for new providers

### Phase 2: GUI Consumer
- core/gui discovers Renderable providers
- Dynamic custom element loading in Angular shell
- Tray panel with provider status
- HLCRF layout configuration

### Phase 3: Polyglot Providers
- `ProxyProvider` for PHP/TS providers
- `.core/providers/*.yaml` discovery
- OpenAPI spec → MCP tool auto-generation
- PHP packages (core/php-*) expose providers via FrankenPHP
- TS packages (core/ts) expose providers via CoreDeno

### Phase 4: SDK + Marketplace
- Auto-generate client SDKs from assembled OpenAPI spec
- Provider marketplace (git-based, same pattern as dAppServer)
- Signed provider manifests (ed25519, from `.core/view.yml` spec)

## Files (Phase 1)

### Create in core/go-api

| File | Purpose |
|------|---------|
| `pkg/provider/provider.go` | Provider (extends RouteGroup), Streamable, Describable, Renderable interfaces |
| `pkg/provider/registry.go` | Registry: Add, MountAll(engine), List |
| `pkg/provider/proxy.go` | ProxyProvider for polyglot (Phase 3, stub for now) |
| `pkg/provider/registry_test.go` | Unit tests |

### Update in core/ide

| File | Change |
|------|--------|
| `main.go` | Create registry, register providers, mount router |

## Dependencies

- `core/go-api` — Gin, route groups, OpenAPI (already there)
- `core/go-ws` — WS hub (already there)
- No new external dependencies

## Not In Scope

- Angular component library (Phase 2)
- PHP/TS provider runtime (Phase 3)
- Provider marketplace (Phase 4)
- Authentication/authorisation per provider (future — Authentik integration)
