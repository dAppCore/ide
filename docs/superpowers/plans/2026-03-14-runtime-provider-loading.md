# Runtime Provider Loading — Implementation Plan

**Date:** 2026-03-14
**Spec:** ../specs/2026-03-14-runtime-provider-loading-design.md
**Status:** Complete

## Task 1: ProxyProvider in core/api (`pkg/provider/proxy.go`)

**File:** `/Users/snider/Code/core/api/pkg/provider/proxy.go`

Replace the Phase 3 stub with a working ProxyProvider that:

- Takes a `ProxyConfig` struct: Name, BasePath, Upstream URL, ElementSpec, SpecFile path
- Implements `Provider` (Name, BasePath, RegisterRoutes)
- Implements `Renderable` (Element)
- `RegisterRoutes` creates a catch-all `/*path` handler using `net/http/httputil.ReverseProxy`
- Strips the base path before proxying so the upstream sees clean paths
- Upstream is always `127.0.0.1` (local process)

**Test file:** `pkg/provider/proxy_test.go`
- Proxy routes requests to a test upstream server
- Health check passthrough
- Element() returns configured ElementSpec
- Name/BasePath return configured values

## Task 2: Manifest Extensions in go-scm (`manifest/manifest.go`)

**File:** `/Users/snider/Code/core/go-scm/manifest/manifest.go`

Extend the Manifest struct with provider-specific fields:

- `Namespace` — API route prefix (e.g. `/api/v1/cool-widget`)
- `Port` — listen port (0 = auto-assign)
- `Binary` — path to binary relative to provider dir
- `Args` — additional CLI args
- `Element` — UI element spec (tag + source)
- `Spec` — path to OpenAPI spec file

These fields are optional — existing manifests without them remain valid.

**Test:** Add parse test with provider fields.

## Task 3: Provider Discovery in go-scm (`marketplace/discovery.go`)

**File:** `/Users/snider/Code/core/go-scm/marketplace/discovery.go`

- `DiscoverProviders(dir string)` — scans `dir/*/manifest.yaml` (using `os` directly, not Medium, since this is filesystem discovery)
- Returns `[]DiscoveredProvider` with Dir + Manifest
- Skips directories without manifests (logs warning, continues)

**File:** `/Users/snider/Code/core/go-scm/marketplace/registry_file.go`

- `ProviderRegistry` — read/write `registry.yaml` tracking installed providers
- `LoadRegistry(path)`, `SaveRegistry(path)`, `Add()`, `Remove()`, `Get()`, `List()`

**Test file:** `marketplace/discovery_test.go`
- Discover finds providers in temp dirs with manifests
- Discover skips dirs without manifests
- Registry CRUD operations

## Task 4: RuntimeManager in core/ide (`runtime.go`)

**File:** `/Users/snider/Code/core/ide/runtime.go`

- `RuntimeManager` struct holding discovered providers, engine reference, process registry
- `NewRuntimeManager(engine, processRegistry)` constructor
- `StartAll(ctx)` — discover providers in `~/.core/providers/`, start each binary via `os/exec.Cmd`, wait for health, register ProxyProvider
- `StopAll()` — SIGTERM each provider process, clean up
- `List()` — return running providers
- Free port allocation via `net.Listen(":0")`
- Health check polling with timeout

## Task 5: Wire into core/ide main.go

**File:** `/Users/snider/Code/core/ide/main.go`

- After creating the api.Engine (`engine, _ := api.New(...)`), create a RuntimeManager
- In each mode (mcpOnly, headless, GUI), call `rm.StartAll(ctx)` before serving
- In shutdown paths, call `rm.StopAll()`
- Import `forge.lthn.ai/core/go-scm/marketplace` (add dependency)

## Task 6: Build Verification

- `cd core/api && go build ./...`
- `cd go-scm && go build ./...`
- `cd ide && go build ./...` (may need go.mod updates)

## Task 7: Tests

- `cd core/api && go test ./pkg/provider/...`
- `cd go-scm && go test ./marketplace/... ./manifest/...`

## Repos Affected

| Repo | Changes |
|------|---------|
| core/api | `pkg/provider/proxy.go` (implement), `pkg/provider/proxy_test.go` (new) |
| go-scm | `manifest/manifest.go` (extend), `manifest/manifest_test.go` (extend), `marketplace/discovery.go` (new), `marketplace/registry_file.go` (new), `marketplace/discovery_test.go` (new) |
| core/ide | `runtime.go` (new), `main.go` (wire), `go.mod` (add go-scm dep) |

## Commit Strategy

1. core/api — `feat(provider): implement ProxyProvider reverse proxy`
2. go-scm — `feat(marketplace): add provider discovery and registry`
3. core/ide — `feat(runtime): add RuntimeManager for provider loading`
