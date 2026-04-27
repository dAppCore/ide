package marketplace

import (
	"context"

	core "dappco.re/go/core"
	coreio "dappco.re/go/io"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	scmmarketplace "dappco.re/go/scm/marketplace"

	aipkg "dappco.re/go/ide/pkg/ai"
	"dappco.re/go/ide/pkg/config"
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

func (s *Subsystem) AttachAI(service *aipkg.Service) {
	if s.client == nil {
		s.client = NewClient(s.cfg)
	}
	s.client.AttachAI(service)
}

func (s *Subsystem) AttachMedium(medium coreio.Medium) {
	if s.client == nil {
		s.client = NewClient(s.cfg)
	}
	s.client.AttachMedium(medium)
}

func (s *Subsystem) Name() string { return "marketplace" }

func (s *Subsystem) RegisterTools(svc *coremcp.Service) {
	s.registerTools(svc)
}

func (s *Subsystem) RegisterActions(c *core.Core) {
	s.registerActions(c)
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
