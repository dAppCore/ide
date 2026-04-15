package navigate

import (
	"context"
	"sort"

	core "dappco.re/go/core"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	"github.com/modelcontextprotocol/go-sdk/mcp"

	"dappco.re/go/core/ide/pkg/config"
	storepkg "dappco.re/go/core/ide/pkg/store"
)

type Subsystem struct {
	cfg  config.Navigate
	core *core.Core
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
	return &Subsystem{cfg: cfg, core: coreInstance}
}

func (s *Subsystem) AttachCore(coreInstance *core.Core) {
	s.core = coreInstance
}

func (s *Subsystem) Name() string { return "navigate" }

func (s *Subsystem) RegisterTools(svc *coremcp.Service) {
	coremcp.AddToolRecorded(svc, svc.Server(), "navigate", &mcp.Tool{
		Name:        "core_navigate",
		Description: "Inspect a core:// route and return structured JSON.",
	}, s.handle)
}

func (s *Subsystem) RegisterActions(c *core.Core) {
	c.Action("ide.navigate", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[Input](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.resolve(ctx, input)
		return core.Result{}.New(out, err)
	})
}

func (s *Subsystem) handle(ctx context.Context, _ *mcp.CallToolRequest, input Input) (*mcp.CallToolResult, Output, error) {
	out, err := s.resolve(ctx, input)
	return nil, out, err
}

func (s *Subsystem) resolve(ctx context.Context, input Input) (Output, error) {
	route := core.Trim(input.Route)
	if route == "" {
		return Output{Available: false, Reason: "route is required"}, nil
	}
	switch {
	case route == "core://store":
		return s.storeSnapshot()
	case core.HasPrefix(route, "core://store/"):
		return s.storeNamespace(core.TrimPrefix(route, "core://store/"))
	case route == "core://models":
		return s.query(ctx, "ai.models.list")
	case route == "core://agent":
		return s.query(ctx, "agent.workspaces.status")
	case route == "core://network":
		return s.query(ctx, "network.status")
	case route == "core://settings":
		return s.query(ctx, "config.dump")
	case route == "core://identity":
		return s.query(ctx, "identity.status")
	case route == "core://wallet":
		return s.query(ctx, "wallet.status")
	default:
		return Output{Available: false, Reason: core.Concat("unknown route ", route)}, nil
	}
}

func (s *Subsystem) query(ctx context.Context, action string) (Output, error) {
	_ = ctx
	if s.core == nil {
		return Output{Available: false, Reason: "core runtime not attached"}, nil
	}
	result := s.core.Query(action)
	if !result.OK {
		return Output{
			Available: false,
			Reason:    core.Concat("action ", action, " not registered"),
			Data:      map[string]any{"available": false, "reason": core.Concat("action ", action, " not registered")},
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
