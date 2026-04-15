package marketplace

import (
	"context"
	goio "io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	core "dappco.re/go/core"
	coreio "dappco.re/go/core/io"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	scmmarketplace "dappco.re/go/scm/marketplace"
	"github.com/modelcontextprotocol/go-sdk/mcp"

	"dappco.re/go/core/ide/pkg/ai"
	"dappco.re/go/core/ide/pkg/config"
)

type Subsystem struct {
	cfg    config.Marketplace
	client *http.Client
	medium coreio.Medium
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
	return &Subsystem{cfg: cfg, client: &http.Client{Timeout: 15 * time.Second}}
}

func (s *Subsystem) AttachMedium(medium coreio.Medium) {
	s.medium = medium
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
	path := s.cfg.APIPath
	query := url.Values{}
	if input.Query != "" {
		query.Set("q", input.Query)
	}
	if input.Category != "" {
		query.Set("category", input.Category)
	}
	if len(query) > 0 {
		path = core.Concat(path, "?", query.Encode())
	}
	var packages []scmmarketplace.Module
	if err := s.get(ctx, path, &packages); err != nil {
		return SearchOutput{}, err
	}
	return SearchOutput{Query: input.Query, Category: input.Category, Packages: packages}, nil
}

func (s *Subsystem) info(ctx context.Context, input InfoInput) (InfoOutput, error) {
	if core.Trim(input.Code) == "" {
		return InfoOutput{}, core.E("ide.marketplace.info", "code is required", nil)
	}
	var pkg scmmarketplace.Module
	if err := s.get(ctx, core.Concat(s.cfg.APIPath, "/", url.PathEscape(input.Code)), &pkg); err != nil {
		return InfoOutput{}, err
	}
	return InfoOutput{Package: pkg}, nil
}

func (s *Subsystem) install(ctx context.Context, input InstallInput) (InstallOutput, error) {
	if core.Trim(input.Code) == "" {
		return InstallOutput{}, core.E("ide.marketplace.install", "code is required", nil)
	}
	switch strings.ToLower(strings.TrimSpace(s.cfg.InstallVia)) {
	case "", "go-scm":
		return s.installViaGoSCM(ctx, input)
	case "api":
		return s.installViaAPI(ctx, input)
	default:
		return s.installViaGoSCM(ctx, input)
	}
}

func (s *Subsystem) installViaAPI(ctx context.Context, input InstallInput) (InstallOutput, error) {
	if err := s.post(ctx, core.Concat(s.cfg.APIPath, "/", url.PathEscape(input.Code), "/install"), nil, nil); err != nil {
		return InstallOutput{}, err
	}
	_ = ai.Record(ai.Event{Type: "ide.pkg.install", Repo: input.Code})
	return InstallOutput{Installed: true, Code: input.Code}, nil
}

func (s *Subsystem) installViaGoSCM(ctx context.Context, input InstallInput) (InstallOutput, error) {
	info, err := s.info(ctx, InfoInput{Code: input.Code})
	if err != nil {
		return InstallOutput{}, err
	}
	medium := s.medium
	if medium == nil {
		medium = defaultInstallMedium()
	}
	installer := scmmarketplace.NewInstaller(medium, "modules", nil)
	if err := installer.Install(ctx, info.Package); err != nil {
		return InstallOutput{}, core.E("ide.marketplace.install", "install module", err)
	}
	_ = ai.Record(ai.Event{Type: "ide.pkg.install", Repo: input.Code})
	return InstallOutput{Installed: true, Code: input.Code}, nil
}

func (s *Subsystem) get(ctx context.Context, path string, target any) error {
	return s.request(ctx, http.MethodGet, path, nil, target)
}

func (s *Subsystem) post(ctx context.Context, path string, body any, target any) error {
	return s.request(ctx, http.MethodPost, path, body, target)
}

func (s *Subsystem) request(ctx context.Context, method, path string, body any, target any) error {
	var reader goio.Reader
	if body != nil {
		reader = core.NewReader(core.JSONMarshalString(body))
	}
	request, err := http.NewRequestWithContext(ctx, method, core.Concat(s.cfg.Endpoint, path), reader)
	if err != nil {
		return core.E("ide.marketplace.request", "build request", err)
	}
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	response, err := s.client.Do(request)
	if err != nil {
		return core.E("ide.marketplace.request", "request failed", err)
	}
	defer response.Body.Close()
	if response.StatusCode >= http.StatusBadRequest {
		return core.E("ide.marketplace.request", core.Concat("upstream returned ", response.Status), nil)
	}
	if target == nil {
		return nil
	}
	raw, err := goio.ReadAll(response.Body)
	if err != nil {
		return core.E("ide.marketplace.request", "read response", err)
	}
	if result := core.JSONUnmarshal(raw, target); !result.OK {
		if decodeErr, ok := result.Value.(error); ok {
			return core.E("ide.marketplace.request", "decode response", decodeErr)
		}
		return core.E("ide.marketplace.request", "decode response", nil)
	}
	return nil
}

func defaultInstallMedium() coreio.Medium {
	home := os.Getenv("DIR_HOME")
	if home == "" {
		resolved, err := os.UserHomeDir()
		if err == nil {
			home = resolved
		}
	}
	sandboxRoot := core.JoinPath(home, ".core", "ide", "marketplace")
	medium, err := coreio.NewSandboxed(sandboxRoot)
	if err != nil {
		return coreio.Local
	}
	return medium
}
