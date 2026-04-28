package marketplace

import (
	"context"
	goio "io"
	"net/http"
	"net/url"
	"os"
	"time"

	core "dappco.re/go"
	coreio "dappco.re/go/io"
	scmmarketplace "dappco.re/go/scm/marketplace"

	"dappco.re/go/ide/pkg/ai"
	"dappco.re/go/ide/pkg/config"
)

type Client struct {
	cfg        config.Marketplace
	httpClient *http.Client
	medium     coreio.Medium
	ai         *ai.Service
}

const maxResponseBytes = 1 << 20

func NewClient(cfg config.Marketplace) *Client {
	return &Client{cfg: cfg, httpClient: &http.Client{Timeout: 15 * time.Second}}
}

func (c *Client) AttachMedium(medium coreio.Medium) {
	c.medium = medium
}

func (c *Client) AttachAI(service *ai.Service) {
	c.ai = service
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
	switch core.Lower(core.Trim(c.cfg.InstallVia)) {
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
	c.recordInstall(input.Code)
	return InstallOutput{Installed: true, Code: input.Code}, nil
}

func (c *Client) installViaGoSCM(ctx context.Context, input InstallInput) (InstallOutput, error) {
	info, err := c.Info(ctx, InfoInput{Code: input.Code})
	if err != nil {
		return InstallOutput{}, err
	}
	medium := c.medium
	if medium == nil {
		var mediumErr error
		medium, mediumErr = defaultInstallMedium()
		if mediumErr != nil {
			return InstallOutput{}, mediumErr
		}
	}
	installer := scmmarketplace.NewInstaller(medium, "modules", nil)
	if err := installer.Install(ctx, info.Package); err != nil {
		return InstallOutput{}, core.E("ide.marketplace.install", "install module", err)
	}
	c.recordInstall(input.Code)
	return InstallOutput{Installed: true, Code: input.Code}, nil
}

func (c *Client) recordInstall(code string) {
	event := ai.Event{Type: "ide.pkg.install", Repo: code}
	if c.ai != nil {
		if err := c.ai.Record(event); err != nil {
			core.Warn("ide.marketplace.record_install", "err", err)
		}
		return
	}
	if err := ai.Record(event); err != nil {
		core.Warn("ide.marketplace.record_install", "err", err)
	}
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
	raw, err := goio.ReadAll(goio.LimitReader(response.Body, maxResponseBytes+1))
	if err != nil {
		return core.E("ide.marketplace.request", "read response", err)
	}
	if len(raw) > maxResponseBytes {
		return core.E("ide.marketplace.request", "response too large", nil)
	}
	if len(core.Trim(string(raw))) == 0 {
		return nil
	}
	if result := core.JSONUnmarshal(raw, target); !result.OK {
		if decodeErr, ok := result.Value.(error); ok {
			return core.E("ide.marketplace.request", "decode response", decodeErr)
		}
		return core.E("ide.marketplace.request", "decode response", nil)
	}
	return nil
}

func defaultInstallMedium() (coreio.Medium, error) {
	home := os.Getenv("DIR_HOME")
	if home == "" {
		resolved, err := os.UserHomeDir()
		if err == nil {
			home = resolved
		}
	}
	if home == "" {
		return nil, core.E("ide.marketplace.install", "home directory unavailable", nil)
	}
	sandboxRoot := core.JoinPath(home, ".core", "ide", "marketplace")
	medium, err := coreio.NewSandboxed(sandboxRoot)
	if err != nil {
		return nil, core.E("ide.marketplace.install", "create sandboxed install medium", err)
	}
	return medium, nil
}
