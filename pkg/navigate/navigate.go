package navigate

import (
	"context"

	core "dappco.re/go/core"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	"github.com/modelcontextprotocol/go-sdk/mcp"

	"dappco.re/go/core/ide/pkg/config"
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
	_ = ctx
	route := core.Trim(input.Route)
	if route == "" {
		return Output{Available: false, Reason: "route is required"}, nil
	}
	switch {
	case route == "core://store":
		return s.query("store.get_all")
	case core.HasPrefix(route, "core://store/"):
		return s.query(core.Concat("store.get_namespace:", core.TrimPrefix(route, "core://store/")))
	case route == "core://models":
		return s.query("ai.models.list")
	case route == "core://agent":
		return s.query("agent.workspaces.status")
	case route == "core://network":
		return s.query("network.status")
	case route == "core://settings":
		return s.query("config.dump")
	case route == "core://identity":
		return s.query("identity.status")
	case route == "core://wallet":
		return s.query("wallet.status")
	default:
		return Output{Available: false, Reason: core.Concat("unknown route ", route)}, nil
	}
}

func (s *Subsystem) query(action string) (Output, error) {
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
