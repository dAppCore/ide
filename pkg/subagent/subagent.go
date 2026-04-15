package subagent

import (
	"context"
	"time"

	core "dappco.re/go/core"
	"dappco.re/go/core/ws"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	"github.com/modelcontextprotocol/go-sdk/mcp"

	"dappco.re/go/core/ide/pkg/config"
)

type Subsystem struct {
	cfg     config.Subagent
	hub     *ws.Hub
	answers map[string]chan string
	events  map[string][]Event
}

type GuideInput struct {
	WorkspaceID string `json:"workspaceId"`
	Message     string `json:"message"`
}

type GuideOutput struct {
	Delivered bool   `json:"delivered"`
	Reason    string `json:"reason,omitempty"`
}

type AskInput struct {
	WorkspaceID string `json:"workspaceId"`
	Question    string `json:"question"`
	WaitSeconds int    `json:"waitSeconds,omitempty"`
}

type AskOutput struct {
	Answer   string `json:"answer,omitempty"`
	TimedOut bool   `json:"timedOut"`
	Reason   string `json:"reason,omitempty"`
}

type ProgressInput struct {
	WorkspaceID string  `json:"workspaceId"`
	Progress    float64 `json:"progress"`
	Total       float64 `json:"total"`
	Message     string  `json:"message"`
}

type ProgressOutput struct {
	Delivered bool   `json:"delivered"`
	Reason    string `json:"reason,omitempty"`
}

type WatchInput struct {
	WorkspaceID  string `json:"workspaceId"`
	PollInterval int    `json:"pollInterval,omitempty"`
	Timeout      int    `json:"timeout,omitempty"`
}

type Event struct {
	Type       string    `json:"type"`
	Channel    string    `json:"channel,omitempty"`
	Message    string    `json:"message,omitempty"`
	QuestionID string    `json:"questionId,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
}

type WatchOutput struct {
	Completed bool    `json:"completed"`
	Failed    bool    `json:"failed"`
	Events    []Event `json:"events"`
	Reason    string  `json:"reason,omitempty"`
}

type AnswerInput struct {
	WorkspaceID string `json:"workspaceId"`
	QuestionID  string `json:"questionId"`
	Answer      string `json:"answer"`
}

type AnswerOutput struct {
	Delivered bool   `json:"delivered"`
	Reason    string `json:"reason,omitempty"`
}

type DispatchGuidedInput struct {
	Repo        string `json:"repo"`
	Task        string `json:"task"`
	Agent       string `json:"agent,omitempty"`
	Template    string `json:"template,omitempty"`
	Persona     string `json:"persona,omitempty"`
	WorkspaceID string `json:"workspaceId,omitempty"`
	RelayURL    string `json:"relayUrl,omitempty"`
	RelayToken  string `json:"relayToken,omitempty"`
}

type DispatchGuidedOutput struct {
	Success     bool   `json:"success"`
	Delivered   bool   `json:"delivered"`
	WorkspaceID string `json:"workspaceId,omitempty"`
	Agent       string `json:"agent,omitempty"`
	Prompt      string `json:"prompt,omitempty"`
	Reason      string `json:"reason,omitempty"`
}

func New(cfg config.Subagent, hub *ws.Hub) *Subsystem {
	return &Subsystem{cfg: cfg, hub: hub, answers: map[string]chan string{}, events: map[string][]Event{}}
}

func (s *Subsystem) Name() string { return "subagent" }

func (s *Subsystem) RegisterTools(svc *coremcp.Service) {
	server := svc.Server()
	coremcp.AddToolRecorded(svc, server, "subagent", &mcp.Tool{Name: "subagent_guide", Description: "Send guidance to a subagent workspace."}, s.handleGuide)
	coremcp.AddToolRecorded(svc, server, "subagent", &mcp.Tool{Name: "subagent_ask", Description: "Ask the orchestrator a question and wait for an answer."}, s.handleAsk)
	coremcp.AddToolRecorded(svc, server, "subagent", &mcp.Tool{Name: "subagent_progress", Description: "Record progress for a subagent workspace."}, s.handleProgress)
	coremcp.AddToolRecorded(svc, server, "subagent", &mcp.Tool{Name: "subagent_watch", Description: "Watch recent subagent events for a workspace."}, s.handleWatch)
	coremcp.AddToolRecorded(svc, server, "subagent", &mcp.Tool{Name: "subagent_answer", Description: "Answer a pending subagent question."}, s.handleAnswer)
	coremcp.AddToolRecorded(svc, server, "subagent", &mcp.Tool{Name: "subagent_dispatch_guided", Description: "Dispatch a guided subagent session."}, s.handleDispatchGuided)
}

func (s *Subsystem) RegisterActions(c *core.Core) {
	register := func(name string, run func(context.Context, core.Options) core.Result) {
		c.Action(name, run)
	}
	register("ide.subagent.guide", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[GuideInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.guide(ctx, input)
		return core.Result{}.New(out, err)
	})
	register("ide.subagent.ask", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[AskInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.ask(ctx, input)
		return core.Result{}.New(out, err)
	})
	register("ide.subagent.progress", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[ProgressInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.progress(ctx, input)
		return core.Result{}.New(out, err)
	})
	register("ide.subagent.watch", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[WatchInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.watch(ctx, input)
		return core.Result{}.New(out, err)
	})
	register("ide.subagent.answer", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[AnswerInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.answer(ctx, input)
		return core.Result{}.New(out, err)
	})
}
