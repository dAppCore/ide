package marketplace

import (
	"context"

	core "dappco.re/go/core"
	coreio "dappco.re/go/core/io"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	scmmarketplace "dappco.re/go/scm/marketplace"
	"github.com/modelcontextprotocol/go-sdk/mcp"

	"dappco.re/go/core/ide/pkg/config"
)

type Subsystem struct {
	cfg    config.Marketplace
	client *Client
}

type SearchInput struct {
	Query    string `json:"query,omitempty"`
	Category string `json:"category,omitempty"`
}

type SearchOutput struct {
	Query    string                  `json:"query,omitempty"`
	Category string                  `json:"category,omitempty"`
	Packages []scmmarketplace.Module `json:"packages"`
}

type InfoInput struct {
	Code string `json:"code"`
}

type InfoOutput struct {
	Package scmmarketplace.Module `json:"package"`
}

type InstallInput struct {
	Code string `json:"code"`
}

type InstallOutput struct {
	Installed bool   `json:"installed"`
	Code      string `json:"code"`
}

func New(cfg config.Marketplace) *Subsystem {
	return &Subsystem{cfg: cfg, client: NewClient(cfg)}
}

func (s *Subsystem) AttachMedium(medium coreio.Medium) {
	if s.client == nil {
		s.client = NewClient(s.cfg)
	}
	s.client.AttachMedium(medium)
}

func (s *Subsystem) Name() string { return "marketplace" }

func (s *Subsystem) RegisterTools(svc *coremcp.Service) {
	server := svc.Server()
	coremcp.AddToolRecorded(svc, server, "pkg", &mcp.Tool{Name: "pkg_search", Description: "Search the marketplace for packages."}, s.handleSearch)
	coremcp.AddToolRecorded(svc, server, "pkg", &mcp.Tool{Name: "pkg_info", Description: "Load package details from the marketplace."}, s.handleInfo)
	coremcp.AddToolRecorded(svc, server, "pkg", &mcp.Tool{Name: "pkg_install", Description: "Install a package from the marketplace."}, s.handleInstall)
}

func (s *Subsystem) RegisterActions(c *core.Core) {
	c.Action("ide.pkg.search", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[SearchInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.search(ctx, input)
		return core.Result{}.New(out, err)
	})
	c.Action("ide.pkg.info", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[InfoInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.info(ctx, input)
		return core.Result{}.New(out, err)
	})
	c.Action("ide.pkg.install", func(ctx context.Context, opts core.Options) core.Result {
		input, err := decode[InstallInput](opts)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		out, err := s.install(ctx, input)
		return core.Result{}.New(out, err)
	})
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

func (s *Subsystem) search(ctx context.Context, input SearchInput) (SearchOutput, error) {
	if s.client == nil {
		s.client = NewClient(s.cfg)
	}
	return s.client.Search(ctx, input)
}

func (s *Subsystem) info(ctx context.Context, input InfoInput) (InfoOutput, error) {
	if s.client == nil {
		s.client = NewClient(s.cfg)
	}
	return s.client.Info(ctx, input)
}

func (s *Subsystem) install(ctx context.Context, input InstallInput) (InstallOutput, error) {
	if s.client == nil {
		s.client = NewClient(s.cfg)
	}
	return s.client.Install(ctx, input)
}
