package brain

import (
	"context"
	"net/http"
	"time"

	core "dappco.re/go/core"
	coreio "dappco.re/go/core/io"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	"github.com/modelcontextprotocol/go-sdk/mcp"

	"dappco.re/go/core/ide/pkg/config"
	"dappco.re/go/core/ide/pkg/workspace"
	storelib "dappco.re/go/store"
)

type Subsystem struct {
	cfg       config.Brain
	medium    coreio.Medium
	client    *http.Client
	cache     *Cache
	workspace *workspace.Subsystem
}

func New(cfg config.Brain, medium coreio.Medium, storeInstance *storelib.Store, workspaceSubsystem *workspace.Subsystem) *Subsystem {
	if medium == nil {
		medium = coreio.Local
	}
	return &Subsystem{
		cfg:       cfg,
		medium:    medium,
		client:    &http.Client{Timeout: 30 * time.Second},
		cache:     NewCache(storeInstance, cfg.Cache.Namespace, cfg.Cache.TTL, config.BoolValue(cfg.Cache.Enabled, true)),
		workspace: workspaceSubsystem,
	}
}

func (s *Subsystem) Name() string { return "brain" }

func (s *Subsystem) RegisterTools(svc *coremcp.Service) {
	server := svc.Server()
	coremcp.AddToolRecorded(svc, server, "brain", &mcp.Tool{Name: "brain_recall", Description: "Semantic search across OpenBrain memories."}, s.handleRecall)
	coremcp.AddToolRecorded(svc, server, "brain", &mcp.Tool{Name: "brain_remember", Description: "Store a memory in OpenBrain."}, s.handleRemember)
	coremcp.AddToolRecorded(svc, server, "brain", &mcp.Tool{Name: "brain_forget", Description: "Remove a memory from OpenBrain by ID."}, s.handleForget)
	coremcp.AddToolRecorded(svc, server, "brain", &mcp.Tool{Name: "brain_list", Description: "List memories in OpenBrain."}, s.handleList)
	coremcp.AddToolRecorded(svc, server, "brain", &mcp.Tool{Name: "brain_context", Description: "Combine recent OpenBrain memories with workspace conventions."}, s.handleContext)
}

func (s *Subsystem) RegisterActions(c *core.Core) {
	c.Action("ide.brain.recall", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[RecallInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.recall(ctx, input)
		return core.Result{}.New(out, err)
	})
	c.Action("ide.brain.remember", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[RememberInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.remember(ctx, input)
		return core.Result{}.New(out, err)
	})
	c.Action("ide.brain.forget", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[ForgetInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.forget(ctx, input)
		return core.Result{}.New(out, err)
	})
	c.Action("ide.brain.list", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[ListInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.list(ctx, input)
		return core.Result{}.New(out, err)
	})
	c.Action("ide.brain.context", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[ContextInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.context(ctx, input)
		return core.Result{}.New(out, err)
	})
}

func (s *Subsystem) handleRecall(ctx context.Context, _ *mcp.CallToolRequest, input RecallInput) (*mcp.CallToolResult, RecallOutput, error) {
	out, err := s.recall(ctx, input)
	return nil, out, err
}

func (s *Subsystem) handleRemember(ctx context.Context, _ *mcp.CallToolRequest, input RememberInput) (*mcp.CallToolResult, RememberOutput, error) {
	out, err := s.remember(ctx, input)
	return nil, out, err
}

func (s *Subsystem) handleForget(ctx context.Context, _ *mcp.CallToolRequest, input ForgetInput) (*mcp.CallToolResult, ForgetOutput, error) {
	out, err := s.forget(ctx, input)
	return nil, out, err
}

func (s *Subsystem) handleList(ctx context.Context, _ *mcp.CallToolRequest, input ListInput) (*mcp.CallToolResult, ListOutput, error) {
	out, err := s.list(ctx, input)
	return nil, out, err
}

func (s *Subsystem) handleContext(ctx context.Context, _ *mcp.CallToolRequest, input ContextInput) (*mcp.CallToolResult, ContextOutput, error) {
	out, err := s.context(ctx, input)
	return nil, out, err
}
