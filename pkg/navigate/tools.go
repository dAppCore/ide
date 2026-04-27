package navigate

import (
	"context"

	coremcp "dappco.re/go/mcp/pkg/mcp"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func (s *Subsystem) registerTools(svc *coremcp.Service) {
	coremcp.AddToolRecorded(svc, svc.Server(), "navigate", &mcp.Tool{
		Name:        "core_navigate",
		Description: "Inspect a core:// route and return structured JSON.",
	}, s.handle)
}

func (s *Subsystem) handle(ctx context.Context, _ *mcp.CallToolRequest, input Input) (*mcp.CallToolResult, Output, error) {
	out, err := s.resolve(ctx, input)
	return nil, out, err
}
