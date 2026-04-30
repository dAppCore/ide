package workspace

import (
	"context"

	coremcp "dappco.re/go/mcp/pkg/mcp"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func (s *Subsystem) registerTools(svc *coremcp.Service) {
	server := svc.Server()
	coremcp.AddToolRecorded(svc, server, "workspace", &mcp.Tool{
		Name:        "workspace_status",
		Description: "Inspect the current workspace root, git status, and .core files.",
	}, s.handleStatus)
	coremcp.AddToolRecorded(svc, server, "workspace", &mcp.Tool{
		Name:        "workspace_conventions",
		Description: "Load workspace conventions from .core/build.yaml and repository context.",
	}, s.handleConventions)
	coremcp.AddToolRecorded(svc, server, "workspace", &mcp.Tool{
		Name:        "workspace_impact",
		Description: "Estimate the impact of the current git diff on the workspace.",
	}, s.handleImpact)
	coremcp.AddToolRecorded(svc, server, "workspace", &mcp.Tool{
		Name:        "workspace_scan",
		Description: "Scan upward from the workspace root for projects with .core metadata.",
	}, s.handleScan)
}

func (s *Subsystem) handleStatus(
	ctx context.Context,
	_ *mcp.CallToolRequest,
	input StatusInput,
) (*mcp.CallToolResult, StatusOutput, error) {
	out, err := s.status(ctx, input)
	return nil, out, err
}

func (s *Subsystem) handleConventions(
	ctx context.Context,
	_ *mcp.CallToolRequest,
	input ConventionsInput,
) (*mcp.CallToolResult, ConventionsOutput, error) {
	out, err := s.conventions(ctx, input)
	return nil, out, err
}

func (s *Subsystem) handleImpact(
	ctx context.Context,
	_ *mcp.CallToolRequest,
	input ImpactInput,
) (*mcp.CallToolResult, ImpactOutput, error) {
	out, err := s.impact(ctx, input)
	return nil, out, err
}

func (s *Subsystem) handleScan(
	ctx context.Context,
	_ *mcp.CallToolRequest,
	input ScanInput,
) (*mcp.CallToolResult, ScanOutput, error) {
	out, err := s.scan(ctx, input)
	return nil, out, err
}
