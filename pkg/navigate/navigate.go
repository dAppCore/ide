package navigate

import (
	"context"
	"sort"

	core "dappco.re/go/core"
	coremcp "dappco.re/go/mcp/pkg/mcp"

	"dappco.re/go/ide/pkg/config"
	storepkg "dappco.re/go/ide/pkg/store"
)

type Subsystem struct {
	cfg    config.Navigate
	core   *core.Core
	router *Router
}

type Input struct {
	Route  string         `json:"route"`
	Filter map[string]any `json:"filter,omitempty"`
}

type Output struct {
	Available bool     `json:"available"`
	Reason    string   `json:"reason,omitempty"`
	Data      any      `json:"data,omitempty"`
	Schema    any      `json:"schema,omitempty"`
	Sources   []string `json:"sources,omitempty"`
}

func New(cfg config.Navigate, coreInstance *core.Core) *Subsystem {
	subsystem := &Subsystem{cfg: cfg, core: coreInstance}
	subsystem.registerRoutes()
	return subsystem
}

func (s *Subsystem) AttachCore(coreInstance *core.Core) {
	s.core = coreInstance
}

func (s *Subsystem) Name() string { return "navigate" }

func (s *Subsystem) RegisterTools(svc *coremcp.Service) {
	s.registerTools(svc)
}

func (s *Subsystem) RegisterActions(c *core.Core) {
	s.registerActions(c)
}

func (s *Subsystem) resolve(ctx context.Context, input Input) (Output, error) {
	route := core.Trim(input.Route)
	if route == "" {
		return Output{Available: false, Reason: "route is required"}, nil
	}
	if s.routeEnabled("core://store") && core.HasPrefix(route, "core://store/") {
		return s.storeNamespace(core.TrimPrefix(route, "core://store/"))
	}
	if s.router != nil {
		if data, schema, err := s.router.Resolve(ctx, route, Filter{Values: input.Filter}); err == nil {
			out, ok := data.(Output)
			if ok {
				return out, nil
			}
			return Output{
				Available: true,
				Data:      data,
				Schema:    schema,
				Sources:   []string{route},
			}, nil
		}
	}
	return Output{Available: false, Reason: core.Concat("unknown route ", route)}, nil
}

func (s *Subsystem) query(ctx context.Context, action string) (Output, error) {
	_ = ctx
	if s.core == nil {
		return Output{Available: false, Reason: "core runtime not attached"}, nil
	}
	result := s.core.Query(action)
	if !result.OK {
		displayAction := routeNameFromAction(action)
		return Output{
			Available: false,
			Reason:    core.Concat("action ide.navigate.", displayAction, " not registered"),
			Data:      map[string]any{"available": false, "reason": core.Concat("action ide.navigate.", displayAction, " not registered")},
			Schema:    map[string]any{"type": "object"},
			Sources:   []string{action},
		}, nil
	}
	return Output{
		Available: true,
		Data:      result.Value,
		Schema:    map[string]any{"type": "object"},
		Sources:   []string{action},
	}, nil
}

func routeNameFromAction(action string) string {
	switch {
	case core.HasPrefix(action, "ai.models."):
		return "models"
	case core.HasPrefix(action, "agent."):
		return "agent"
	case core.HasPrefix(action, "network."):
		return "network"
	case core.HasPrefix(action, "config."):
		return "settings"
	case core.HasPrefix(action, "identity."):
		return "identity"
	case core.HasPrefix(action, "wallet."):
		return "wallet"
	default:
		return core.TrimPrefix(action, "ai.")
	}
}

func (s *Subsystem) storeSnapshot() (Output, error) {
	service, ok := core.ServiceFor[*storepkg.Service](s.core, "store")
	if !ok || service == nil || service.Store == nil {
		return Output{Available: false, Reason: "store service not attached"}, nil
	}
	namespaces, err := service.Store.Groups()
	if err != nil {
		return Output{Available: false, Reason: core.Concat("load namespaces: ", err.Error())}, nil
	}
	items := make([]map[string]any, 0, len(namespaces))
	for _, namespace := range namespaces {
		entries, entryErr := service.Store.GetAll(namespace)
		if entryErr != nil {
			continue
		}
		recentKeys := make([]string, 0, len(entries))
		for key := range entries {
			recentKeys = append(recentKeys, key)
		}
		sort.Strings(recentKeys)
		items = append(items, map[string]any{
			"name":       namespace,
			"count":      len(entries),
			"recentKeys": recentKeys,
		})
	}
	return Output{
		Available: true,
		Data:      map[string]any{"namespaces": items},
		Schema: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"namespaces": map[string]any{"type": "array"},
			},
		},
		Sources: []string{"store"},
	}, nil
}

func (s *Subsystem) storeNamespace(namespace string) (Output, error) {
	namespace = core.TrimPrefix(core.Trim(namespace), "/")
	if namespace == "" {
		return Output{Available: false, Reason: "namespace is required"}, nil
	}
	service, ok := core.ServiceFor[*storepkg.Service](s.core, "store")
	if !ok || service == nil || service.Store == nil {
		return Output{Available: false, Reason: "store service not attached"}, nil
	}
	entries, err := service.Store.GetAll(namespace)
	if err != nil {
		return Output{Available: false, Reason: core.Concat("load namespace ", namespace, ": ", err.Error())}, nil
	}
	keys := make([]string, 0, len(entries))
	for key := range entries {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	items := make([]map[string]any, 0, len(keys))
	for _, key := range keys {
		value := entries[key]
		items = append(items, map[string]any{
			"key":       key,
			"valueType": "string",
			"size":      len(value),
		})
	}
	return Output{
		Available: true,
		Data:      map[string]any{"namespace": namespace, "entries": items},
		Schema: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"namespace": map[string]any{"type": "string"},
				"entries":   map[string]any{"type": "array"},
			},
		},
		Sources: []string{"store:" + namespace},
	}, nil
}
