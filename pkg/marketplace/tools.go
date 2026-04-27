package marketplace

import (
	"context"

	coremcp "dappco.re/go/mcp/pkg/mcp"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func (s *Subsystem) registerTools(svc *coremcp.Service) {
	server := svc.Server()
	coremcp.AddToolRecorded(svc, server, "pkg", &mcp.Tool{Name: "pkg_search", Description: "Search the marketplace for packages."}, s.handleSearch)
	coremcp.AddToolRecorded(svc, server, "pkg", &mcp.Tool{Name: "pkg_info", Description: "Load package details from the marketplace."}, s.handleInfo)
	coremcp.AddToolRecorded(svc, server, "pkg", &mcp.Tool{Name: "pkg_install", Description: "Install a package from the marketplace."}, s.handleInstall)
}

func (s *Subsystem) handleSearch(ctx context.Context, _ *mcp.CallToolRequest, input SearchInput) (*mcp.CallToolResult, SearchOutput, error) {
	out, err := s.search(ctx, input)
	return nil, out, err
}

func (s *Subsystem) handleInfo(ctx context.Context, _ *mcp.CallToolRequest, input InfoInput) (*mcp.CallToolResult, InfoOutput, error) {
	out, err := s.info(ctx, input)
	return nil, out, err
}

func (s *Subsystem) handleInstall(ctx context.Context, _ *mcp.CallToolRequest, input InstallInput) (*mcp.CallToolResult, InstallOutput, error) {
	out, err := s.install(ctx, input)
	return nil, out, err
}
