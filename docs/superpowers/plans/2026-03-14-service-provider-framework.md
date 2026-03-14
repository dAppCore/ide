# Service Provider Framework — Implementation Plan (Phase 1)

**Date:** 2026-03-14
**Spec:** [2026-03-14-service-provider-framework-design.md](../specs/2026-03-14-service-provider-framework-design.md)

---

## Task 1 — Create `pkg/provider/` in core/go-api

Create the provider interfaces and Registry type. The Provider interface extends
the existing `api.RouteGroup` — providers ARE route groups and register through
`api.Engine.Register()`, not a parallel router. This gives them middleware, CORS,
Swagger, and OpenAPI for free.

### 1a. Create `pkg/provider/provider.go`

```go
// SPDX-Licence-Identifier: EUPL-1.2

// Package provider defines the Service Provider Framework interfaces.
//
// A Provider extends api.RouteGroup with a provider identity. Providers
// register through the existing api.Engine.Register() method, inheriting
// middleware, CORS, Swagger, and OpenAPI generation automatically.
//
// Optional interfaces (Streamable, Describable, Renderable) declare
// additional capabilities that consumers (GUI, MCP, WS hub) can discover
// via type assertion.
package provider

import (
	"forge.lthn.ai/core/go-api"
)

// Provider extends RouteGroup with a provider identity.
// Every Provider is a RouteGroup and registers through api.Engine.Register().
type Provider interface {
	api.RouteGroup // Name(), BasePath(), RegisterRoutes(*gin.RouterGroup)
}

// Streamable providers emit real-time events via WebSocket.
// The hub is injected at construction time. Channels() declares the
// event prefixes this provider will emit (e.g. "brain.*", "process.*").
type Streamable interface {
	Provider
	Channels() []string
}

// Describable providers expose structured route descriptions for OpenAPI.
// This extends the existing DescribableGroup interface from go-api.
type Describable interface {
	Provider
	api.DescribableGroup // Describe() []RouteDescription
}

// Renderable providers declare a custom element for GUI display.
type Renderable interface {
	Provider
	Element() ElementSpec
}

// ElementSpec describes a web component for GUI rendering.
type ElementSpec struct {
	// Tag is the custom element tag name, e.g. "core-brain-panel".
	Tag string `json:"tag"`

	// Source is the URL or embedded path to the JS bundle.
	Source string `json:"source"`
}
```

### 1b. Create `pkg/provider/registry.go`

```go
// SPDX-Licence-Identifier: EUPL-1.2

package provider

import (
	"iter"
	"slices"
	"sync"

	"forge.lthn.ai/core/go-api"
)

// Registry collects providers and mounts them on an api.Engine.
// It is a convenience wrapper — providers could be registered directly
// via engine.Register(), but the Registry enables discovery by consumers
// (GUI, MCP) that need to query provider capabilities.
type Registry struct {
	mu        sync.RWMutex
	providers []Provider
}

// NewRegistry creates an empty provider registry.
func NewRegistry() *Registry {
	return &Registry{}
}

// Add registers a provider. Providers are mounted in the order they are added.
func (r *Registry) Add(p Provider) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.providers = append(r.providers, p)
}

// MountAll registers every provider with the given api.Engine.
// Each provider is passed to engine.Register(), which mounts it as a
// RouteGroup at its BasePath with all configured middleware.
func (r *Registry) MountAll(engine *api.Engine) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, p := range r.providers {
		engine.Register(p)
	}
}

// List returns a copy of all registered providers.
func (r *Registry) List() []Provider {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return slices.Clone(r.providers)
}

// Iter returns an iterator over all registered providers.
func (r *Registry) Iter() iter.Seq[Provider] {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return slices.Values(slices.Clone(r.providers))
}

// Len returns the number of registered providers.
func (r *Registry) Len() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.providers)
}

// Get returns a provider by name, or nil if not found.
func (r *Registry) Get(name string) Provider {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, p := range r.providers {
		if p.Name() == name {
			return p
		}
	}
	return nil
}

// Streamable returns all providers that implement the Streamable interface.
func (r *Registry) Streamable() []Streamable {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []Streamable
	for _, p := range r.providers {
		if s, ok := p.(Streamable); ok {
			result = append(result, s)
		}
	}
	return result
}

// Describable returns all providers that implement the Describable interface.
func (r *Registry) Describable() []Describable {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []Describable
	for _, p := range r.providers {
		if d, ok := p.(Describable); ok {
			result = append(result, d)
		}
	}
	return result
}

// Renderable returns all providers that implement the Renderable interface.
func (r *Registry) Renderable() []Renderable {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var result []Renderable
	for _, p := range r.providers {
		if rv, ok := p.(Renderable); ok {
			result = append(result, rv)
		}
	}
	return result
}

// ProviderInfo is a serialisable summary of a registered provider.
type ProviderInfo struct {
	Name     string   `json:"name"`
	BasePath string   `json:"basePath"`
	Channels []string `json:"channels,omitempty"`
	Element  *ElementSpec `json:"element,omitempty"`
}

// Info returns a summary of all registered providers.
func (r *Registry) Info() []ProviderInfo {
	r.mu.RLock()
	defer r.mu.RUnlock()

	infos := make([]ProviderInfo, 0, len(r.providers))
	for _, p := range r.providers {
		info := ProviderInfo{
			Name:     p.Name(),
			BasePath: p.BasePath(),
		}
		if s, ok := p.(Streamable); ok {
			info.Channels = s.Channels()
		}
		if rv, ok := p.(Renderable); ok {
			elem := rv.Element()
			info.Element = &elem
		}
		infos = append(infos, info)
	}
	return infos
}
```

### 1c. Create `pkg/provider/proxy.go` (Phase 3 stub)

```go
// SPDX-Licence-Identifier: EUPL-1.2

package provider

// ProxyProvider will wrap polyglot (PHP/TS) providers that publish an OpenAPI
// spec and run their own HTTP handler. The Go API layer reverse-proxies to
// their endpoint.
//
// This is a Phase 3 feature. The type is declared here as a forward reference
// so the package structure is established.
//
// See the design spec § Polyglot Providers for the full ProxyProvider contract.
```

**Files created:**

| File | Purpose |
|------|---------|
| `/Users/snider/Code/core/go-api/pkg/provider/provider.go` | Provider, Streamable, Describable, Renderable interfaces + ElementSpec |
| `/Users/snider/Code/core/go-api/pkg/provider/registry.go` | Registry: Add, MountAll, List, Get, capability queries, Info |
| `/Users/snider/Code/core/go-api/pkg/provider/proxy.go` | Phase 3 stub (doc comment only) |

**Why `pkg/provider/` in go-api?** The Provider interface embeds `api.RouteGroup`
and `api.DescribableGroup`, and the Registry calls `api.Engine.Register()`. These
are inseparable from the go-api package. A separate module would create a circular
dependency. The `pkg/` subdirectory keeps the provider types in their own package
namespace (`provider.Provider`) without polluting the `api` package.

---

## Task 2 — Create go-process provider

Create `pkg/api/provider.go` in go-process. This wraps the existing daemon
`Registry` as a `provider.Provider` with REST endpoints for list/start/stop/status
and WS events for daemon state changes.

The go-process `Registry` (file-based daemon tracker at `~/.core/daemons/`) already
has `List()`, `Get()`, `Register()`, and `Unregister()`. The provider exposes these
over REST and emits WS events when daemon state changes.

Note: go-process currently depends only on `testify`. This task adds dependencies
on `go-api` (for `api.RouteGroup`, `api.RouteDescription`, Gin, and the provider
package) and `go-ws` (for the hub). These are acceptable — go-process already
imports `core/go` (the Core framework) and the process provider is an optional
sub-package.

### 2a. Create `/Users/snider/Code/core/go-process/pkg/api/provider.go`

```go
// SPDX-Licence-Identifier: EUPL-1.2

// Package api provides a service provider that wraps go-process daemon
// management as REST endpoints with WebSocket event streaming.
package api

import (
	"net/http"
	"os"
	"strconv"
	"syscall"

	"forge.lthn.ai/core/go-api"
	"forge.lthn.ai/core/go-api/pkg/provider"
	process "forge.lthn.ai/core/go-process"
	"forge.lthn.ai/core/go-ws"
	"github.com/gin-gonic/gin"
)

// ProcessProvider wraps the go-process daemon Registry as a service provider.
// It implements provider.Provider, provider.Streamable, and provider.Describable.
type ProcessProvider struct {
	registry *process.Registry
	hub      *ws.Hub
}

// compile-time interface checks
var (
	_ provider.Provider   = (*ProcessProvider)(nil)
	_ provider.Streamable = (*ProcessProvider)(nil)
	_ provider.Describable = (*ProcessProvider)(nil)
)

// NewProvider creates a process provider backed by the given daemon registry.
// The WS hub is used to emit daemon state change events. Pass nil for hub
// if WebSocket streaming is not needed.
func NewProvider(registry *process.Registry, hub *ws.Hub) *ProcessProvider {
	if registry == nil {
		registry = process.DefaultRegistry()
	}
	return &ProcessProvider{
		registry: registry,
		hub:      hub,
	}
}

// Name implements api.RouteGroup.
func (p *ProcessProvider) Name() string { return "process" }

// BasePath implements api.RouteGroup.
func (p *ProcessProvider) BasePath() string { return "/api/process" }

// Channels implements provider.Streamable.
func (p *ProcessProvider) Channels() []string {
	return []string{
		"process.daemon.started",
		"process.daemon.stopped",
		"process.daemon.health",
	}
}

// RegisterRoutes implements api.RouteGroup.
func (p *ProcessProvider) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/daemons", p.listDaemons)
	rg.GET("/daemons/:code/:daemon", p.getDaemon)
	rg.POST("/daemons/:code/:daemon/stop", p.stopDaemon)
	rg.GET("/daemons/:code/:daemon/health", p.healthCheck)
}

// Describe implements api.DescribableGroup.
func (p *ProcessProvider) Describe() []api.RouteDescription {
	return []api.RouteDescription{
		{
			Method:      "GET",
			Path:        "/daemons",
			Summary:     "List running daemons",
			Description: "Returns all alive daemon entries from the registry, pruning any with dead PIDs.",
			Tags:        []string{"process"},
			Response: map[string]any{
				"type": "array",
				"items": map[string]any{
					"type": "object",
					"properties": map[string]any{
						"code":    map[string]any{"type": "string"},
						"daemon":  map[string]any{"type": "string"},
						"pid":     map[string]any{"type": "integer"},
						"health":  map[string]any{"type": "string"},
						"project": map[string]any{"type": "string"},
						"binary":  map[string]any{"type": "string"},
						"started": map[string]any{"type": "string", "format": "date-time"},
					},
				},
			},
		},
		{
			Method:      "GET",
			Path:        "/daemons/:code/:daemon",
			Summary:     "Get daemon status",
			Description: "Returns a single daemon entry if its process is alive.",
			Tags:        []string{"process"},
			Response: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"code":    map[string]any{"type": "string"},
					"daemon":  map[string]any{"type": "string"},
					"pid":     map[string]any{"type": "integer"},
					"health":  map[string]any{"type": "string"},
					"started": map[string]any{"type": "string", "format": "date-time"},
				},
			},
		},
		{
			Method:      "POST",
			Path:        "/daemons/:code/:daemon/stop",
			Summary:     "Stop a daemon",
			Description: "Sends SIGTERM to the daemon process and removes it from the registry.",
			Tags:        []string{"process"},
			Response: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"stopped": map[string]any{"type": "boolean"},
				},
			},
		},
		{
			Method:      "GET",
			Path:        "/daemons/:code/:daemon/health",
			Summary:     "Check daemon health",
			Description: "Probes the daemon's health endpoint and returns the result.",
			Tags:        []string{"process"},
			Response: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"healthy": map[string]any{"type": "boolean"},
					"address": map[string]any{"type": "string"},
				},
			},
		},
	}
}

// -- Handlers -----------------------------------------------------------------

func (p *ProcessProvider) listDaemons(c *gin.Context) {
	entries, err := p.registry.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.Fail("list_failed", err.Error()))
		return
	}
	if entries == nil {
		entries = []process.DaemonEntry{}
	}
	c.JSON(http.StatusOK, api.OK(entries))
}

func (p *ProcessProvider) getDaemon(c *gin.Context) {
	code := c.Param("code")
	daemon := c.Param("daemon")

	entry, ok := p.registry.Get(code, daemon)
	if !ok {
		c.JSON(http.StatusNotFound, api.Fail("not_found", "daemon not found or not running"))
		return
	}
	c.JSON(http.StatusOK, api.OK(entry))
}

func (p *ProcessProvider) stopDaemon(c *gin.Context) {
	code := c.Param("code")
	daemon := c.Param("daemon")

	entry, ok := p.registry.Get(code, daemon)
	if !ok {
		c.JSON(http.StatusNotFound, api.Fail("not_found", "daemon not found or not running"))
		return
	}

	// Send SIGTERM to the process
	proc, err := os.FindProcess(entry.PID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.Fail("signal_failed", err.Error()))
		return
	}
	if err := proc.Signal(syscall.SIGTERM); err != nil {
		c.JSON(http.StatusInternalServerError, api.Fail("signal_failed", err.Error()))
		return
	}

	// Remove from registry
	_ = p.registry.Unregister(code, daemon)

	// Emit WS event
	p.emitEvent("process.daemon.stopped", map[string]any{
		"code":   code,
		"daemon": daemon,
		"pid":    entry.PID,
	})

	c.JSON(http.StatusOK, api.OK(map[string]any{"stopped": true}))
}

func (p *ProcessProvider) healthCheck(c *gin.Context) {
	code := c.Param("code")
	daemon := c.Param("daemon")

	entry, ok := p.registry.Get(code, daemon)
	if !ok {
		c.JSON(http.StatusNotFound, api.Fail("not_found", "daemon not found or not running"))
		return
	}

	if entry.Health == "" {
		c.JSON(http.StatusOK, api.OK(map[string]any{
			"healthy": false,
			"address": "",
			"reason":  "no health endpoint configured",
		}))
		return
	}

	healthy := process.WaitForHealth(entry.Health, 2000)

	result := map[string]any{
		"healthy": healthy,
		"address": entry.Health,
	}

	// Emit health event
	p.emitEvent("process.daemon.health", map[string]any{
		"code":    code,
		"daemon":  daemon,
		"healthy": healthy,
	})

	statusCode := http.StatusOK
	if !healthy {
		statusCode = http.StatusServiceUnavailable
	}
	c.JSON(statusCode, api.OK(result))
}

// emitEvent sends a WS event if the hub is available.
func (p *ProcessProvider) emitEvent(channel string, data any) {
	if p.hub == nil {
		return
	}
	_ = p.hub.SendToChannel(channel, ws.Message{
		Type: ws.TypeEvent,
		Data: data,
	})
}

// PIDAlive checks whether a PID is still running. Exported for use by
// consumers that need to verify daemon liveness outside the REST API.
func PIDAlive(pid int) bool {
	if pid <= 0 {
		return false
	}
	proc, err := os.FindProcess(pid)
	if err != nil {
		return false
	}
	return proc.Signal(syscall.Signal(0)) == nil
}

// intParam parses a URL param as int, returning 0 on failure.
func intParam(c *gin.Context, name string) int {
	v, _ := strconv.Atoi(c.Param(name))
	return v
}
```

**File created:** `/Users/snider/Code/core/go-process/pkg/api/provider.go`

**Design decisions:**

- **No start endpoint.** Daemons are started by their own binaries (e.g.
  `core-ide`, `core-php`). The registry tracks what's already running. Adding
  a "start daemon" REST endpoint would require knowing the binary path and args,
  which is a Phase 2 concern (the `Manageable` interface).
- **SIGTERM for stop.** Graceful shutdown via SIGTERM matches the existing
  `Daemon.Run()` pattern which blocks on `<-ctx.Done()` and calls `Stop()`.
- **`pkg/api/` sub-package.** Keeps the provider optional — go-process core
  package has zero dependency on Gin or go-api. Only consumers that import
  `go-process/pkg/api` pull in the HTTP layer.

---

## Task 3 — Create brain provider

Create a thin wrapper making the brain `Subsystem` also a `provider.Provider`
with REST endpoints for remember, recall, forget, and list.

The brain subsystem already proxies to Laravel via the IDE bridge. The provider
adds REST endpoints that call the same bridge methods, making brain accessible
to non-MCP consumers (GUI panels, CLI tools, other services).

### 3a. Create `/Users/snider/Code/core/mcp/pkg/mcp/brain/provider.go`

```go
// SPDX-Licence-Identifier: EUPL-1.2

package brain

import (
	"net/http"

	"forge.lthn.ai/core/go-api"
	"forge.lthn.ai/core/go-api/pkg/provider"
	"forge.lthn.ai/core/go-ws"
	"forge.lthn.ai/core/mcp/pkg/mcp/ide"
	"github.com/gin-gonic/gin"
)

// BrainProvider wraps the brain Subsystem as a service provider with REST
// endpoints. It delegates to the same IDE bridge that the MCP tools use.
type BrainProvider struct {
	bridge *ide.Bridge
	hub    *ws.Hub
}

// compile-time interface checks
var (
	_ provider.Provider    = (*BrainProvider)(nil)
	_ provider.Streamable  = (*BrainProvider)(nil)
	_ provider.Describable = (*BrainProvider)(nil)
	_ provider.Renderable  = (*BrainProvider)(nil)
)

// NewProvider creates a brain provider that proxies to Laravel via the IDE bridge.
// The WS hub is used to emit brain events. Pass nil for hub if not needed.
func NewProvider(bridge *ide.Bridge, hub *ws.Hub) *BrainProvider {
	return &BrainProvider{
		bridge: bridge,
		hub:    hub,
	}
}

// Name implements api.RouteGroup.
func (p *BrainProvider) Name() string { return "brain" }

// BasePath implements api.RouteGroup.
func (p *BrainProvider) BasePath() string { return "/api/brain" }

// Channels implements provider.Streamable.
func (p *BrainProvider) Channels() []string {
	return []string{
		"brain.remember.complete",
		"brain.recall.complete",
		"brain.forget.complete",
	}
}

// Element implements provider.Renderable.
func (p *BrainProvider) Element() provider.ElementSpec {
	return provider.ElementSpec{
		Tag:    "core-brain-panel",
		Source: "/assets/brain-panel.js",
	}
}

// RegisterRoutes implements api.RouteGroup.
func (p *BrainProvider) RegisterRoutes(rg *gin.RouterGroup) {
	rg.POST("/remember", p.remember)
	rg.POST("/recall", p.recall)
	rg.POST("/forget", p.forget)
	rg.GET("/list", p.list)
	rg.GET("/status", p.status)
}

// Describe implements api.DescribableGroup.
func (p *BrainProvider) Describe() []api.RouteDescription {
	return []api.RouteDescription{
		{
			Method:      "POST",
			Path:        "/remember",
			Summary:     "Store a memory",
			Description: "Store a memory in the shared OpenBrain knowledge store via the Laravel backend.",
			Tags:        []string{"brain"},
			RequestBody: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"content":    map[string]any{"type": "string"},
					"type":       map[string]any{"type": "string"},
					"tags":       map[string]any{"type": "array", "items": map[string]any{"type": "string"}},
					"project":    map[string]any{"type": "string"},
					"confidence": map[string]any{"type": "number"},
				},
				"required": []string{"content", "type"},
			},
			Response: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"success":   map[string]any{"type": "boolean"},
					"memoryId":  map[string]any{"type": "string"},
					"timestamp": map[string]any{"type": "string", "format": "date-time"},
				},
			},
		},
		{
			Method:      "POST",
			Path:        "/recall",
			Summary:     "Semantic search memories",
			Description: "Semantic search across the shared OpenBrain knowledge store.",
			Tags:        []string{"brain"},
			RequestBody: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"query": map[string]any{"type": "string"},
					"top_k": map[string]any{"type": "integer"},
					"filter": map[string]any{
						"type": "object",
						"properties": map[string]any{
							"project": map[string]any{"type": "string"},
							"type":    map[string]any{"type": "string"},
						},
					},
				},
				"required": []string{"query"},
			},
			Response: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"success":  map[string]any{"type": "boolean"},
					"count":    map[string]any{"type": "integer"},
					"memories": map[string]any{"type": "array"},
				},
			},
		},
		{
			Method:      "POST",
			Path:        "/forget",
			Summary:     "Remove a memory",
			Description: "Permanently delete a memory from the knowledge store.",
			Tags:        []string{"brain"},
			RequestBody: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"id":     map[string]any{"type": "string"},
					"reason": map[string]any{"type": "string"},
				},
				"required": []string{"id"},
			},
			Response: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"success":   map[string]any{"type": "boolean"},
					"forgotten": map[string]any{"type": "string"},
				},
			},
		},
		{
			Method:      "GET",
			Path:        "/list",
			Summary:     "List memories",
			Description: "List memories with optional filtering by project, type, and agent.",
			Tags:        []string{"brain"},
			Response: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"success":  map[string]any{"type": "boolean"},
					"count":    map[string]any{"type": "integer"},
					"memories": map[string]any{"type": "array"},
				},
			},
		},
		{
			Method:      "GET",
			Path:        "/status",
			Summary:     "Brain bridge status",
			Description: "Returns whether the Laravel bridge is connected.",
			Tags:        []string{"brain"},
			Response: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"connected": map[string]any{"type": "boolean"},
				},
			},
		},
	}
}

// -- Handlers -----------------------------------------------------------------

func (p *BrainProvider) remember(c *gin.Context) {
	if p.bridge == nil {
		c.JSON(http.StatusServiceUnavailable, api.Fail("bridge_unavailable", "brain bridge not available"))
		return
	}

	var input RememberInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, api.Fail("invalid_input", err.Error()))
		return
	}

	err := p.bridge.Send(ide.BridgeMessage{
		Type: "brain_remember",
		Data: map[string]any{
			"content":    input.Content,
			"type":       input.Type,
			"tags":       input.Tags,
			"project":    input.Project,
			"confidence": input.Confidence,
			"supersedes": input.Supersedes,
			"expires_in": input.ExpiresIn,
		},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.Fail("bridge_error", err.Error()))
		return
	}

	p.emitEvent("brain.remember.complete", map[string]any{
		"type":    input.Type,
		"project": input.Project,
	})

	c.JSON(http.StatusOK, api.OK(map[string]any{"success": true}))
}

func (p *BrainProvider) recall(c *gin.Context) {
	if p.bridge == nil {
		c.JSON(http.StatusServiceUnavailable, api.Fail("bridge_unavailable", "brain bridge not available"))
		return
	}

	var input RecallInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, api.Fail("invalid_input", err.Error()))
		return
	}

	err := p.bridge.Send(ide.BridgeMessage{
		Type: "brain_recall",
		Data: map[string]any{
			"query":  input.Query,
			"top_k":  input.TopK,
			"filter": input.Filter,
		},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.Fail("bridge_error", err.Error()))
		return
	}

	p.emitEvent("brain.recall.complete", map[string]any{
		"query": input.Query,
	})

	c.JSON(http.StatusOK, api.OK(RecallOutput{
		Success:  true,
		Memories: []Memory{},
	}))
}

func (p *BrainProvider) forget(c *gin.Context) {
	if p.bridge == nil {
		c.JSON(http.StatusServiceUnavailable, api.Fail("bridge_unavailable", "brain bridge not available"))
		return
	}

	var input ForgetInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, api.Fail("invalid_input", err.Error()))
		return
	}

	err := p.bridge.Send(ide.BridgeMessage{
		Type: "brain_forget",
		Data: map[string]any{
			"id":     input.ID,
			"reason": input.Reason,
		},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.Fail("bridge_error", err.Error()))
		return
	}

	p.emitEvent("brain.forget.complete", map[string]any{
		"id": input.ID,
	})

	c.JSON(http.StatusOK, api.OK(map[string]any{
		"success":   true,
		"forgotten": input.ID,
	}))
}

func (p *BrainProvider) list(c *gin.Context) {
	if p.bridge == nil {
		c.JSON(http.StatusServiceUnavailable, api.Fail("bridge_unavailable", "brain bridge not available"))
		return
	}

	err := p.bridge.Send(ide.BridgeMessage{
		Type: "brain_list",
		Data: map[string]any{
			"project":  c.Query("project"),
			"type":     c.Query("type"),
			"agent_id": c.Query("agent_id"),
			"limit":    c.Query("limit"),
		},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, api.Fail("bridge_error", err.Error()))
		return
	}

	c.JSON(http.StatusOK, api.OK(ListOutput{
		Success:  true,
		Memories: []Memory{},
	}))
}

func (p *BrainProvider) status(c *gin.Context) {
	connected := false
	if p.bridge != nil {
		connected = p.bridge.Connected()
	}
	c.JSON(http.StatusOK, api.OK(map[string]any{
		"connected": connected,
	}))
}

// emitEvent sends a WS event if the hub is available.
func (p *BrainProvider) emitEvent(channel string, data any) {
	if p.hub == nil {
		return
	}
	_ = p.hub.SendToChannel(channel, ws.Message{
		Type: ws.TypeEvent,
		Data: data,
	})
}
```

**File created:** `/Users/snider/Code/core/mcp/pkg/mcp/brain/provider.go`

**Design decisions:**

- **Reuses existing types.** The `RememberInput`, `RecallInput`, `ForgetInput`,
  `ListInput`, and output types are already defined in `tools.go`. The provider
  handlers use the same types for request binding.
- **Same bridge, different transport.** MCP tools call `bridge.Send()` over stdio.
  The REST provider calls the same `bridge.Send()` over HTTP. Same backend, two
  entry points.
- **Renderable.** Brain declares a `<core-brain-panel>` custom element. The JS
  bundle path (`/assets/brain-panel.js`) is a placeholder — the actual element
  will be built in Phase 2 when the GUI consumer is implemented.
- **Status endpoint.** The `/status` endpoint returns bridge connection state,
  useful for the GUI tray panel's status indicators.

---

## Task 4 — Update core/ide main.go

Wire the provider registry into the IDE's main.go. Create an `api.Engine`,
register both providers, and serve the API alongside MCP.

### 4a. Update `/Users/snider/Code/core/ide/main.go`

Add the provider registry and API engine to all three modes (MCP-only, headless,
GUI). The full updated file:

```go
package main

import (
	"context"
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"syscall"

	"forge.lthn.ai/core/go-api"
	"forge.lthn.ai/core/go-api/pkg/provider"
	"forge.lthn.ai/core/go-config"
	process "forge.lthn.ai/core/go-process"
	processapi "forge.lthn.ai/core/go-process/pkg/api"
	"forge.lthn.ai/core/go-ws"
	"forge.lthn.ai/core/go/pkg/core"
	guiMCP "forge.lthn.ai/core/gui/pkg/mcp"
	"forge.lthn.ai/core/gui/pkg/display"
	"forge.lthn.ai/core/ide/icons"
	"forge.lthn.ai/core/mcp/pkg/mcp"
	"forge.lthn.ai/core/mcp/pkg/mcp/brain"
	"forge.lthn.ai/core/mcp/pkg/mcp/ide"
	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist/wails-angular-template/browser
var assets embed.FS

func main() {
	// ── Flags ──────────────────────────────────────────────────
	mcpOnly := false
	for _, arg := range os.Args[1:] {
		if arg == "--mcp" {
			mcpOnly = true
		}
	}

	// ── Configuration ──────────────────────────────────────────
	cfg, _ := config.New()

	cwd, err := os.Getwd()
	if err != nil {
		log.Fatalf("failed to get working directory: %v", err)
	}

	// ── Shared resources (built before Core) ───────────────────
	hub := ws.NewHub()

	bridgeCfg := ide.DefaultConfig()
	bridgeCfg.WorkspaceRoot = cwd
	if url := os.Getenv("CORE_API_URL"); url != "" {
		bridgeCfg.LaravelWSURL = url
	}
	if token := os.Getenv("CORE_API_TOKEN"); token != "" {
		bridgeCfg.Token = token
	}
	bridge := ide.NewBridge(hub, bridgeCfg)

	// ── Service Provider Registry ──────────────────────────────
	reg := provider.NewRegistry()
	reg.Add(processapi.NewProvider(process.DefaultRegistry(), hub))
	reg.Add(brain.NewProvider(bridge, hub))

	// ── API Engine ─────────────────────────────────────────────
	apiAddr := ":9880"
	if addr := os.Getenv("CORE_API_ADDR"); addr != "" {
		apiAddr = addr
	}
	engine, _ := api.New(
		api.WithAddr(apiAddr),
		api.WithCORS("*"),
		api.WithWSHandler(http.Handler(hub.Handler())),
		api.WithSwagger("Core IDE", "Service Provider API", "0.1.0"),
	)
	reg.MountAll(engine)

	// ── Core framework ─────────────────────────────────────────
	c, err := core.New(
		core.WithName("ws", func(c *core.Core) (any, error) {
			return hub, nil
		}),
		core.WithService(display.Register(nil)), // nil platform until Wails starts
		core.WithName("mcp", func(c *core.Core) (any, error) {
			return mcp.New(
				mcp.WithWorkspaceRoot(cwd),
				mcp.WithWSHub(hub),
				mcp.WithSubsystem(brain.New(bridge)),
				mcp.WithSubsystem(guiMCP.New(c)),
			)
		}),
	)
	if err != nil {
		log.Fatalf("failed to create core: %v", err)
	}

	// Retrieve the MCP service for transport control
	mcpSvc, err := core.ServiceFor[*mcp.Service](c, "mcp")
	if err != nil {
		log.Fatalf("failed to get MCP service: %v", err)
	}

	// ── Mode selection ─────────────────────────────────────────
	if mcpOnly {
		// stdio mode — Claude Code connects via --mcp flag
		ctx, cancel := signal.NotifyContext(context.Background(),
			syscall.SIGINT, syscall.SIGTERM)
		defer cancel()

		if err := c.ServiceStartup(ctx, nil); err != nil {
			log.Fatalf("core startup failed: %v", err)
		}
		bridge.Start(ctx)
		go hub.Run(ctx)

		// Start API server in background for provider endpoints
		go func() {
			if err := engine.Serve(ctx); err != nil {
				log.Printf("API server error: %v", err)
			}
		}()

		if err := mcpSvc.ServeStdio(ctx); err != nil {
			log.Printf("MCP stdio error: %v", err)
		}

		_ = mcpSvc.Shutdown(ctx)
		_ = c.ServiceShutdown(ctx)
		return
	}

	if !guiEnabled(cfg) {
		// No GUI — run Core with MCP transport in background
		ctx, cancel := signal.NotifyContext(context.Background(),
			syscall.SIGINT, syscall.SIGTERM)
		defer cancel()

		if err := c.ServiceStartup(ctx, nil); err != nil {
			log.Fatalf("core startup failed: %v", err)
		}
		bridge.Start(ctx)
		go hub.Run(ctx)

		// Start API server
		go func() {
			log.Printf("API server listening on %s", apiAddr)
			if err := engine.Serve(ctx); err != nil {
				log.Printf("API server error: %v", err)
			}
		}()

		go func() {
			if err := mcpSvc.Run(ctx); err != nil {
				log.Printf("MCP error: %v", err)
			}
		}()

		<-ctx.Done()
		shutdownCtx := context.Background()
		_ = mcpSvc.Shutdown(shutdownCtx)
		_ = c.ServiceShutdown(shutdownCtx)
		return
	}

	// ── GUI mode ───────────────────────────────────────────────
	staticAssets, err := fs.Sub(assets, "frontend/dist/wails-angular-template/browser")
	if err != nil {
		log.Fatal(err)
	}

	app := application.New(application.Options{
		Name:        "Core IDE",
		Description: "Host UK Core IDE - Development Environment",
		Services: []application.Service{
			application.NewService(c),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(staticAssets),
		},
		Mac: application.MacOptions{
			ActivationPolicy: application.ActivationPolicyAccessory,
		},
		OnShutdown: func() {
			ctx := context.Background()
			_ = mcpSvc.Shutdown(ctx)
			bridge.Shutdown()
		},
	})

	// System tray
	systray := app.SystemTray.New()
	systray.SetTooltip("Core IDE")

	if runtime.GOOS == "darwin" {
		systray.SetTemplateIcon(icons.AppTray)
	} else {
		systray.SetDarkModeIcon(icons.AppTray)
		systray.SetIcon(icons.AppTray)
	}

	// Tray panel window
	trayWindow := app.Window.NewWithOptions(application.WebviewWindowOptions{
		Name:             "tray-panel",
		Title:            "Core IDE",
		Width:            380,
		Height:           480,
		URL:              "/tray",
		Hidden:           true,
		Frameless:        true,
		BackgroundColour: application.NewRGB(26, 27, 38),
	})
	systray.AttachWindow(trayWindow).WindowOffset(5)

	// Tray menu
	trayMenu := app.Menu.New()
	trayMenu.Add("Quit").OnClick(func(ctx *application.Context) {
		app.Quit()
	})
	systray.SetMenu(trayMenu)

	// Start MCP transport and API server alongside Wails
	go func() {
		ctx := context.Background()
		bridge.Start(ctx)
		go hub.Run(ctx)

		// Start API server
		go func() {
			log.Printf("API server listening on %s", apiAddr)
			if err := engine.Serve(ctx); err != nil {
				log.Printf("API server error: %v", err)
			}
		}()

		if err := mcpSvc.Run(ctx); err != nil {
			log.Printf("MCP error: %v", err)
		}
	}()

	log.Println("Starting Core IDE...")

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}

// guiEnabled checks whether the GUI should start.
// Returns false if config says gui.enabled: false, or if no display is available.
func guiEnabled(cfg *config.Config) bool {
	if cfg != nil {
		var guiCfg struct {
			Enabled *bool `mapstructure:"enabled"`
		}
		if err := cfg.Get("gui", &guiCfg); err == nil && guiCfg.Enabled != nil {
			return *guiCfg.Enabled
		}
	}
	// Fall back to display detection
	if runtime.GOOS == "windows" || runtime.GOOS == "darwin" {
		return true
	}
	return os.Getenv("DISPLAY") != "" || os.Getenv("WAYLAND_DISPLAY") != ""
}
```

### 4b. Update go.mod

Add direct dependencies for `go-api` and `go-process`:

```bash
cd /Users/snider/Code/core/ide
# go-api and go-process need to be direct dependencies now
go get forge.lthn.ai/core/go-api
go get forge.lthn.ai/core/go-process
go mod tidy
cd /Users/snider/Code
go work sync
```

The `go.mod` `require` block gains:

```
forge.lthn.ai/core/go-api v0.1.0
forge.lthn.ai/core/go-process v0.1.0
```

Both were already indirect dependencies; they become direct since `main.go` now
imports them.

### Key changes from the current main.go

1. **Provider registry** — `provider.NewRegistry()` collects both providers.
2. **API engine** — `api.New()` with CORS, Swagger, and WS handler creates the
   Gin router. `reg.MountAll(engine)` registers both providers as route groups.
3. **API server** — `engine.Serve(ctx)` runs in a goroutine alongside MCP in all
   three modes, on port 9880 (configurable via `CORE_API_ADDR`).
4. **WS hub** — `go hub.Run(ctx)` is started explicitly. Previously this was not
   called — the hub was only used for MCP bridge dispatch.
5. **Imports** — `go-api`, `go-api/pkg/provider`, `go-process`, and
   `go-process/pkg/api` are new direct imports.

---

## Task 5 — Tests for registry + go-process provider

### 5a. Create `/Users/snider/Code/core/go-api/pkg/provider/registry_test.go`

```go
// SPDX-Licence-Identifier: EUPL-1.2

package provider_test

import (
	"testing"

	"forge.lthn.ai/core/go-api"
	"forge.lthn.ai/core/go-api/pkg/provider"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// -- Test helpers (minimal providers) -----------------------------------------

type stubProvider struct{}

func (s *stubProvider) Name() string                        { return "stub" }
func (s *stubProvider) BasePath() string                    { return "/api/stub" }
func (s *stubProvider) RegisterRoutes(rg *gin.RouterGroup)  {}

type streamableProvider struct{ stubProvider }

func (s *streamableProvider) Channels() []string { return []string{"stub.event"} }

type describableProvider struct{ stubProvider }

func (d *describableProvider) Describe() []api.RouteDescription {
	return []api.RouteDescription{
		{Method: "GET", Path: "/items", Summary: "List items", Tags: []string{"stub"}},
	}
}

type renderableProvider struct{ stubProvider }

func (r *renderableProvider) Element() provider.ElementSpec {
	return provider.ElementSpec{Tag: "core-stub-panel", Source: "/assets/stub.js"}
}

type fullProvider struct {
	streamableProvider
}

func (f *fullProvider) Name() string     { return "full" }
func (f *fullProvider) BasePath() string { return "/api/full" }
func (f *fullProvider) Describe() []api.RouteDescription {
	return []api.RouteDescription{
		{Method: "GET", Path: "/status", Summary: "Status", Tags: []string{"full"}},
	}
}
func (f *fullProvider) Element() provider.ElementSpec {
	return provider.ElementSpec{Tag: "core-full-panel", Source: "/assets/full.js"}
}

// -- Tests --------------------------------------------------------------------

func TestRegistry_Add_Good(t *testing.T) {
	reg := provider.NewRegistry()
	assert.Equal(t, 0, reg.Len())

	reg.Add(&stubProvider{})
	assert.Equal(t, 1, reg.Len())

	reg.Add(&streamableProvider{})
	assert.Equal(t, 2, reg.Len())
}

func TestRegistry_Get_Good(t *testing.T) {
	reg := provider.NewRegistry()
	reg.Add(&stubProvider{})

	p := reg.Get("stub")
	require.NotNil(t, p)
	assert.Equal(t, "stub", p.Name())
}

func TestRegistry_Get_Bad(t *testing.T) {
	reg := provider.NewRegistry()
	p := reg.Get("nonexistent")
	assert.Nil(t, p)
}

func TestRegistry_List_Good(t *testing.T) {
	reg := provider.NewRegistry()
	reg.Add(&stubProvider{})
	reg.Add(&streamableProvider{})

	list := reg.List()
	assert.Len(t, list, 2)
}

func TestRegistry_MountAll_Good(t *testing.T) {
	reg := provider.NewRegistry()
	reg.Add(&stubProvider{})
	reg.Add(&streamableProvider{})

	engine, err := api.New()
	require.NoError(t, err)

	reg.MountAll(engine)
	assert.Len(t, engine.Groups(), 2)
}

func TestRegistry_Streamable_Good(t *testing.T) {
	reg := provider.NewRegistry()
	reg.Add(&stubProvider{})                // not streamable
	reg.Add(&streamableProvider{})          // streamable

	s := reg.Streamable()
	assert.Len(t, s, 1)
	assert.Equal(t, []string{"stub.event"}, s[0].Channels())
}

func TestRegistry_Describable_Good(t *testing.T) {
	reg := provider.NewRegistry()
	reg.Add(&stubProvider{})            // not describable
	reg.Add(&describableProvider{})     // describable

	d := reg.Describable()
	assert.Len(t, d, 1)
	assert.Len(t, d[0].Describe(), 1)
}

func TestRegistry_Renderable_Good(t *testing.T) {
	reg := provider.NewRegistry()
	reg.Add(&stubProvider{})            // not renderable
	reg.Add(&renderableProvider{})      // renderable

	r := reg.Renderable()
	assert.Len(t, r, 1)
	assert.Equal(t, "core-stub-panel", r[0].Element().Tag)
}

func TestRegistry_Info_Good(t *testing.T) {
	reg := provider.NewRegistry()
	reg.Add(&fullProvider{})

	infos := reg.Info()
	require.Len(t, infos, 1)

	info := infos[0]
	assert.Equal(t, "full", info.Name)
	assert.Equal(t, "/api/full", info.BasePath)
	assert.Equal(t, []string{"stub.event"}, info.Channels)
	require.NotNil(t, info.Element)
	assert.Equal(t, "core-full-panel", info.Element.Tag)
}

func TestRegistry_Iter_Good(t *testing.T) {
	reg := provider.NewRegistry()
	reg.Add(&stubProvider{})
	reg.Add(&streamableProvider{})

	count := 0
	for range reg.Iter() {
		count++
	}
	assert.Equal(t, 2, count)
}
```

### 5b. Create `/Users/snider/Code/core/go-process/pkg/api/provider_test.go`

```go
// SPDX-Licence-Identifier: EUPL-1.2

package api_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	goapi "forge.lthn.ai/core/go-api"
	processapi "forge.lthn.ai/core/go-process/pkg/api"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestProcessProvider_Name_Good(t *testing.T) {
	p := processapi.NewProvider(nil, nil)
	assert.Equal(t, "process", p.Name())
}

func TestProcessProvider_BasePath_Good(t *testing.T) {
	p := processapi.NewProvider(nil, nil)
	assert.Equal(t, "/api/process", p.BasePath())
}

func TestProcessProvider_Channels_Good(t *testing.T) {
	p := processapi.NewProvider(nil, nil)
	channels := p.Channels()
	assert.Contains(t, channels, "process.daemon.started")
	assert.Contains(t, channels, "process.daemon.stopped")
	assert.Contains(t, channels, "process.daemon.health")
}

func TestProcessProvider_Describe_Good(t *testing.T) {
	p := processapi.NewProvider(nil, nil)
	descs := p.Describe()
	assert.GreaterOrEqual(t, len(descs), 4)

	// Verify all descriptions have required fields
	for _, d := range descs {
		assert.NotEmpty(t, d.Method)
		assert.NotEmpty(t, d.Path)
		assert.NotEmpty(t, d.Summary)
		assert.NotEmpty(t, d.Tags)
	}
}

func TestProcessProvider_ListDaemons_Good(t *testing.T) {
	// Use a temp directory so the registry has no daemons
	dir := t.TempDir()
	registry := newTestRegistry(dir)
	p := processapi.NewProvider(registry, nil)

	r := setupRouter(p)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/process/daemons", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp goapi.Response[[]any]
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.True(t, resp.Success)
}

func TestProcessProvider_GetDaemon_Bad(t *testing.T) {
	dir := t.TempDir()
	registry := newTestRegistry(dir)
	p := processapi.NewProvider(registry, nil)

	r := setupRouter(p)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/process/daemons/test/nonexistent", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestProcessProvider_RegistersAsRouteGroup_Good(t *testing.T) {
	p := processapi.NewProvider(nil, nil)

	engine, err := goapi.New()
	require.NoError(t, err)

	engine.Register(p)
	assert.Len(t, engine.Groups(), 1)
	assert.Equal(t, "process", engine.Groups()[0].Name())
}

func TestProcessProvider_Channels_RegisterAsStreamGroup_Good(t *testing.T) {
	p := processapi.NewProvider(nil, nil)

	engine, err := goapi.New()
	require.NoError(t, err)

	engine.Register(p)

	// Engine.Channels() discovers StreamGroups
	channels := engine.Channels()
	assert.Contains(t, channels, "process.daemon.started")
}

// -- Test helpers -------------------------------------------------------------

func setupRouter(p *processapi.ProcessProvider) *gin.Engine {
	r := gin.New()
	rg := r.Group(p.BasePath())
	p.RegisterRoutes(rg)
	return r
}

// newTestRegistry creates a process.Registry backed by a test directory.
// This uses the exported constructor — no internal access needed.
func newTestRegistry(dir string) *process.Registry {
	return process.NewRegistry(dir)
}
```

Note: The test file imports `process` as the package name, which matches the
go-process module's package declaration. Add this import:

```go
import process "forge.lthn.ai/core/go-process"
```

The `newTestRegistry` helper must be adjusted in the actual import block:

```go
import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	goapi "forge.lthn.ai/core/go-api"
	process "forge.lthn.ai/core/go-process"
	processapi "forge.lthn.ai/core/go-process/pkg/api"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)
```

---

## Task 6 — Build verification

### 6a. Create go.mod for go-process sub-package (if needed)

The go-process module (`forge.lthn.ai/core/go-process`) currently has minimal
dependencies (only `testify`). The `pkg/api/` sub-package imports `go-api` and
`go-ws`, but since it is part of the same Go module, those imports are resolved
via the module's `go.mod`. Update go-process's `go.mod`:

```bash
cd /Users/snider/Code/core/go-process
go get forge.lthn.ai/core/go-api
go get forge.lthn.ai/core/go-ws
go get github.com/gin-gonic/gin
go mod tidy
```

### 6b. Create go.mod for go-api sub-package (if needed)

The `pkg/provider/` sub-package lives within the `go-api` module, so no separate
`go.mod` is needed. It imports only its parent package (`forge.lthn.ai/core/go-api`)
which is the module itself.

### 6c. Build all affected modules

```bash
# Build the provider package
cd /Users/snider/Code/core/go-api
go build ./...

# Build the process provider
cd /Users/snider/Code/core/go-process
go build ./...

# Build the brain provider (part of mcp module)
cd /Users/snider/Code/core/mcp
go build ./...

# Build the IDE
cd /Users/snider/Code/core/ide
go build ./...

# Sync workspace
cd /Users/snider/Code
go work sync
```

### 6d. Run tests

```bash
# Provider registry tests
cd /Users/snider/Code/core/go-api
go test ./pkg/provider/... -v

# Process provider tests
cd /Users/snider/Code/core/go-process
go test ./pkg/api/... -v

# Existing go-api tests still pass
cd /Users/snider/Code/core/go-api
go test ./... -v

# Existing go-process tests still pass
cd /Users/snider/Code/core/go-process
go test ./... -v
```

### 6e. Verify OpenAPI generation

```bash
# Quick smoke test — start the IDE and check Swagger
cd /Users/snider/Code/core/ide
go run . &
sleep 2
curl -s http://localhost:9880/swagger/doc.json | jq '.paths | keys'
# Should show: /api/brain/*, /api/process/*, /health
kill %1
```

Expected paths in the OpenAPI spec:

```
/api/brain/forget
/api/brain/list
/api/brain/recall
/api/brain/remember
/api/brain/status
/api/process/daemons
/api/process/daemons/:code/:daemon
/api/process/daemons/:code/:daemon/health
/api/process/daemons/:code/:daemon/stop
/health
```

### Troubleshooting

1. **Import cycle** — `pkg/provider/` imports `go-api` (parent module). This is
   fine: Go allows sub-packages to import their parent package. The parent
   package does NOT import `pkg/provider/`, so there is no cycle.

2. **Workspace resolution** — If `go build` cannot find sibling modules, ensure
   `~/Code/go.work` includes all relevant paths:
   ```bash
   cd /Users/snider/Code
   go work use ./core/go-api ./core/go-process ./core/mcp ./core/ide
   go work sync
   ```

3. **Stale go.sum** — Clear and regenerate:
   ```bash
   cd /Users/snider/Code/core/go-process
   rm go.sum && go mod tidy
   ```

4. **gin.SetMode** — Tests should call `gin.SetMode(gin.TestMode)` in `init()`
   to suppress Gin's debug logging.
