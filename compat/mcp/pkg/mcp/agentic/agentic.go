package agentic

import (
	"context"

	core "dappco.re/go"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type DispatchInput struct {
	Repo     string `json:"repo,omitempty"`
	Task     string `json:"task,omitempty"`
	Agent    string `json:"agent,omitempty"`
	Template string `json:"template,omitempty"`
	Persona  string `json:"persona,omitempty"`
}

type DispatchOutput struct {
	Success      bool   `json:"success"`
	Agent        string `json:"agent,omitempty"`
	WorkspaceDir string `json:"workspaceDir,omitempty"`
	Reason       string `json:"reason,omitempty"`
}

type WatchResult struct {
	Workspace string `json:"workspace,omitempty"`
	Status    string `json:"status,omitempty"`
}

type WatchOutput struct {
	Success   bool          `json:"success"`
	Completed []WatchResult `json:"completed,omitempty"`
	Failed    []WatchResult `json:"failed,omitempty"`
}

type Prep struct{}

func NewPrep() *Prep {
	return &Prep{}
}

func (p *Prep) RegisterTools(svc *coremcp.Service) {
	if svc == nil {
		return
	}
	coremcp.AddToolRecorded(svc, svc.Server(), "agentic", &sdkmcp.Tool{
		Name:        "agentic_dispatch",
		Description: "Dispatch an agentic workspace.",
	}, p.dispatch)
}

func (p *Prep) dispatch(
	ctx context.Context,
	_ *sdkmcp.CallToolRequest,
	input DispatchInput,
) (*sdkmcp.CallToolResult, DispatchOutput, error) {
	_ = ctx
	agent := core.Trim(input.Agent)
	if agent == "" {
		agent = "codex"
	}
	workspace := core.Trim(input.Repo)
	if workspace == "" {
		workspace = "agentic-workspace"
	}
	return nil, DispatchOutput{Success: true, Agent: agent, WorkspaceDir: workspace}, nil
}
