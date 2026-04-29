package brain

import (
	"context"

	coremcp "dappco.re/go/mcp/pkg/mcp"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func (s *Subsystem) registerTools(svc *coremcp.Service) {
	server := svc.Server()
	coremcp.AddToolRecorded(svc, server, "brain", &mcp.Tool{Name: "brain_recall", Description: "Semantic search across OpenBrain memories."}, s.handleRecall)
	coremcp.AddToolRecorded(svc, server, "brain", &mcp.Tool{Name: "brain_remember", Description: "Store a memory in OpenBrain."}, s.handleRemember)
	coremcp.AddToolRecorded(svc, server, "brain", &mcp.Tool{Name: "brain_forget", Description: "Remove a memory from OpenBrain by ID."}, s.handleForget)
	coremcp.AddToolRecorded(svc, server, "brain", &mcp.Tool{Name: "brain_list", Description: "List memories in OpenBrain."}, s.handleList)
	coremcp.AddToolRecorded(svc, server, "brain", &mcp.Tool{Name: "brain_context", Description: "Combine recent OpenBrain memories with workspace conventions."}, s.handleContext)
}

func (s *Subsystem) handleRecall(
	ctx context.Context,
	_ *mcp.CallToolRequest,
	input RecallInput,
) (*mcp.CallToolResult, RecallOutput, error) {
	out, err := s.recall(ctx, input)
	return nil, out, err
}

func (s *Subsystem) handleRemember(
	ctx context.Context,
	_ *mcp.CallToolRequest,
	input RememberInput,
) (*mcp.CallToolResult, RememberOutput, error) {
	out, err := s.remember(ctx, input)
	return nil, out, err
}

func (s *Subsystem) handleForget(
	ctx context.Context,
	_ *mcp.CallToolRequest,
	input ForgetInput,
) (*mcp.CallToolResult, ForgetOutput, error) {
	out, err := s.forget(ctx, input)
	return nil, out, err
}

func (s *Subsystem) handleList(
	ctx context.Context,
	_ *mcp.CallToolRequest,
	input ListInput,
) (*mcp.CallToolResult, ListOutput, error) {
	out, err := s.list(ctx, input)
	return nil, out, err
}

func (s *Subsystem) handleContext(
	ctx context.Context,
	_ *mcp.CallToolRequest,
	input ContextInput,
) (*mcp.CallToolResult, ContextOutput, error) {
	out, err := s.context(ctx, input)
	return nil, out, err
}
