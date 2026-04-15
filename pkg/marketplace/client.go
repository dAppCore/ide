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
	scmmarketplace "dappco.re/go/scm/marketplace"

	"dappco.re/go/core/ide/pkg/ai"
	"dappco.re/go/core/ide/pkg/config"
)

type Client struct {
	cfg        config.Marketplace
	httpClient *http.Client
	medium     coreio.Medium
}

func NewClient(cfg config.Marketplace) *Client {
	return &Client{cfg: cfg, httpClient: &http.Client{Timeout: 15 * time.Second}}
}

func (c *Client) AttachMedium(medium coreio.Medium) {
	c.medium = medium
}

func (c *Client) Search(ctx context.Context, input SearchInput) (SearchOutput, error) {
	path := c.cfg.APIPath
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
	if err := c.get(ctx, path, &packages); err != nil {
		return SearchOutput{}, err
	}
	return SearchOutput{Query: input.Query, Category: input.Category, Packages: packages}, nil
}

func (c *Client) Info(ctx context.Context, input InfoInput) (InfoOutput, error) {
	if core.Trim(input.Code) == "" {
		return InfoOutput{}, core.E("ide.marketplace.info", "code is required", nil)
	}
	var pkg scmmarketplace.Module
	if err := c.get(ctx, core.Concat(c.cfg.APIPath, "/", url.PathEscape(input.Code)), &pkg); err != nil {
		return InfoOutput{}, err
	}
	return InfoOutput{Package: pkg}, nil
}

func (c *Client) Install(ctx context.Context, input InstallInput) (InstallOutput, error) {
	if core.Trim(input.Code) == "" {
		return InstallOutput{}, core.E("ide.marketplace.install", "code is required", nil)
	}
	switch strings.ToLower(strings.TrimSpace(c.cfg.InstallVia)) {
	case "", "go-scm":
		return c.installViaGoSCM(ctx, input)
	case "api":
		return c.installViaAPI(ctx, input)
	default:
		return c.installViaGoSCM(ctx, input)
	}
}

func (c *Client) installViaAPI(ctx context.Context, input InstallInput) (InstallOutput, error) {
	if err := c.post(ctx, core.Concat(c.cfg.APIPath, "/", url.PathEscape(input.Code), "/install"), nil, nil); err != nil {
		return InstallOutput{}, err
	}
	_ = ai.Record(ai.Event{Type: "ide.pkg.install", Repo: input.Code})
	return InstallOutput{Installed: true, Code: input.Code}, nil
}

func (c *Client) installViaGoSCM(ctx context.Context, input InstallInput) (InstallOutput, error) {
	info, err := c.Info(ctx, InfoInput{Code: input.Code})
	if err != nil {
		return InstallOutput{}, err
	}
	medium := c.medium
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

func (c *Client) get(ctx context.Context, path string, target any) error {
	return c.request(ctx, http.MethodGet, path, nil, target)
}

func (c *Client) post(ctx context.Context, path string, body any, target any) error {
	return c.request(ctx, http.MethodPost, path, body, target)
}

func (c *Client) request(ctx context.Context, method, path string, body any, target any) error {
	var reader goio.Reader
	if body != nil {
		reader = core.NewReader(core.JSONMarshalString(body))
	}
	request, err := http.NewRequestWithContext(ctx, method, core.Concat(c.cfg.Endpoint, path), reader)
	if err != nil {
		return core.E("ide.marketplace.request", "build request", err)
	}
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}
	response, err := c.httpClient.Do(request)
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
