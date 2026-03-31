// SPDX-Licence-Identifier: EUPL-1.2

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"dappco.re/go/core/scm/marketplace"
	"forge.lthn.ai/core/api"
	"github.com/gin-gonic/gin"
)

const defaultMarketplaceAPIURL = "http://127.0.0.1:9880/api/v1/scm"

// PackageToolsAPI proxies package marketplace lookups and installs to the
// upstream go-scm SCM provider.
type PackageToolsAPI struct {
	client *MarketplaceClient
}

// MarketplaceClient talks to the upstream SCM provider marketplace API.
type MarketplaceClient struct {
	baseURL *url.URL
	client  *http.Client
}

// PackageInstallResult summarises a successful install.
type PackageInstallResult struct {
	Installed bool   `json:"installed"`
	Code      string `json:"code"`
}

// PackageSearchResponse groups query metadata with search results.
type PackageSearchResponse struct {
	Query    string               `json:"query,omitempty"`
	Category string               `json:"category,omitempty"`
	Packages []marketplace.Module `json:"packages"`
}

// PackageInfoResponse returns details for a single marketplace package.
type PackageInfoResponse struct {
	Package marketplace.Module `json:"package"`
}

type marketplaceAPIError struct {
	Code    string
	Message string
	Details any
}

func (e *marketplaceAPIError) Error() string {
	if e == nil {
		return "marketplace request failed"
	}
	if e.Details != nil {
		return fmt.Sprintf("%s: %s (%v)", e.Code, e.Message, e.Details)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func NewMarketplaceClient(baseURL string) *MarketplaceClient {
	if baseURL == "" {
		baseURL = os.Getenv("CORE_SCM_API_URL")
	}
	if baseURL == "" {
		baseURL = defaultMarketplaceAPIURL
	}

	parsed, err := url.Parse(baseURL)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		parsed, _ = url.Parse(defaultMarketplaceAPIURL)
	}

	return &MarketplaceClient{
		baseURL: parsed,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func NewPackageToolsAPI(client *MarketplaceClient) *PackageToolsAPI {
	if client == nil {
		client = NewMarketplaceClient("")
	}
	return &PackageToolsAPI{client: client}
}

func (p *PackageToolsAPI) Name() string     { return "pkg-tools-api" }
func (p *PackageToolsAPI) BasePath() string { return "/api/v1/pkg" }

func (p *PackageToolsAPI) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/search", p.search)
	rg.GET("/info/:code", p.info)
	rg.POST("/install/:code", p.install)
}

func (p *PackageToolsAPI) search(c *gin.Context) {
	query := strings.TrimSpace(c.Query("q"))
	category := strings.TrimSpace(c.Query("category"))

	results, err := p.client.Search(c.Request.Context(), query, category)
	if err != nil {
		c.JSON(http.StatusBadGateway, api.Fail("marketplace_unavailable", err.Error()))
		return
	}

	c.JSON(http.StatusOK, api.OK(PackageSearchResponse{
		Query:    query,
		Category: category,
		Packages: results,
	}))
}

func (p *PackageToolsAPI) info(c *gin.Context) {
	code := strings.TrimSpace(c.Param("code"))
	if code == "" {
		c.JSON(http.StatusBadRequest, api.Fail("invalid_request", "code is required"))
		return
	}

	pkg, err := p.client.Info(c.Request.Context(), code)
	if err != nil {
		c.JSON(marketplaceErrorStatus(err), api.Fail(marketplaceErrorCode(err, "marketplace_lookup_failed"), marketplaceErrorMessage(err)))
		return
	}

	c.JSON(http.StatusOK, api.OK(PackageInfoResponse{Package: pkg}))
}

func (p *PackageToolsAPI) install(c *gin.Context) {
	code := strings.TrimSpace(c.Param("code"))
	if code == "" {
		c.JSON(http.StatusBadRequest, api.Fail("invalid_request", "code is required"))
		return
	}

	result, err := p.client.Install(c.Request.Context(), code)
	if err != nil {
		c.JSON(marketplaceErrorStatus(err), api.Fail(marketplaceErrorCode(err, "marketplace_install_failed"), marketplaceErrorMessage(err)))
		return
	}

	c.JSON(http.StatusOK, api.OK(result))
}

func (c *MarketplaceClient) Search(ctx context.Context, query, category string) ([]marketplace.Module, error) {
	var resp api.Response[[]marketplace.Module]
	if err := c.get(ctx, "/marketplace", map[string]string{
		"q":        query,
		"category": category,
	}, &resp); err != nil {
		return nil, err
	}
	return resp.Data, nil
}

func (c *MarketplaceClient) Info(ctx context.Context, code string) (marketplace.Module, error) {
	var resp api.Response[marketplace.Module]
	if err := c.get(ctx, "/marketplace/"+url.PathEscape(code), nil, &resp); err != nil {
		return marketplace.Module{}, err
	}
	return resp.Data, nil
}

func (c *MarketplaceClient) Install(ctx context.Context, code string) (PackageInstallResult, error) {
	var resp api.Response[PackageInstallResult]
	if err := c.post(ctx, "/marketplace/"+url.PathEscape(code)+"/install", nil, &resp); err != nil {
		return PackageInstallResult{}, err
	}
	if resp.Data.Code == "" {
		resp.Data.Code = code
	}
	return resp.Data, nil
}

func (c *MarketplaceClient) get(ctx context.Context, path string, query map[string]string, out any) error {
	return c.request(ctx, http.MethodGet, path, query, nil, out)
}

func (c *MarketplaceClient) post(ctx context.Context, path string, query map[string]string, out any) error {
	return c.request(ctx, http.MethodPost, path, query, nil, out)
}

func (c *MarketplaceClient) request(ctx context.Context, method, path string, query map[string]string, body any, out any) error {
	if c == nil || c.baseURL == nil {
		return fmt.Errorf("marketplace client is not configured")
	}

	u := *c.baseURL
	u.Path = strings.TrimRight(u.Path, "/") + path
	q := u.Query()
	for key, value := range query {
		if strings.TrimSpace(value) == "" {
			continue
		}
		q.Set(key, value)
	}
	u.RawQuery = q.Encode()

	var reqBody *strings.Reader
	if body == nil {
		reqBody = strings.NewReader("")
	} else {
		encoded, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("encode request body: %w", err)
		}
		reqBody = strings.NewReader(string(encoded))
	}

	req, err := http.NewRequestWithContext(ctx, method, u.String(), reqBody)
	if err != nil {
		return err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	res, err := c.client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	raw, err := io.ReadAll(res.Body)
	if err != nil {
		return err
	}

	if out == nil {
		if res.StatusCode != http.StatusOK {
			return fmt.Errorf("marketplace API returned %s", res.Status)
		}
		return nil
	}

	if err := json.Unmarshal(raw, out); err != nil {
		return err
	}

	if res.StatusCode != http.StatusOK {
		if err := responseEnvelopeError(out); err != nil {
			return err
		}
		return fmt.Errorf("marketplace API returned %s", res.Status)
	}

	return responseEnvelopeError(out)
}

func responseEnvelopeError(out any) error {
	if resp, ok := out.(*api.Response[[]marketplace.Module]); ok && !resp.Success {
		return responseError(resp.Error)
	}
	if resp, ok := out.(*api.Response[marketplace.Module]); ok && !resp.Success {
		return responseError(resp.Error)
	}
	if resp, ok := out.(*api.Response[PackageInstallResult]); ok && !resp.Success {
		return responseError(resp.Error)
	}
	return nil
}

func responseError(errObj *api.Error) error {
	if errObj == nil {
		return fmt.Errorf("marketplace request failed")
	}
	return &marketplaceAPIError{
		Code:    errObj.Code,
		Message: errObj.Message,
		Details: errObj.Details,
	}
}

func marketplaceErrorCode(err error, fallback string) string {
	if err == nil {
		return fallback
	}
	if apiErr, ok := err.(*marketplaceAPIError); ok && apiErr.Code != "" {
		return apiErr.Code
	}
	return fallback
}

func marketplaceErrorMessage(err error) string {
	if err == nil {
		return "marketplace request failed"
	}
	if apiErr, ok := err.(*marketplaceAPIError); ok {
		if apiErr.Details != nil {
			return fmt.Sprintf("%s (%v)", apiErr.Message, apiErr.Details)
		}
		return apiErr.Message
	}
	return err.Error()
}

func marketplaceErrorStatus(err error) int {
	if apiErr, ok := err.(*marketplaceAPIError); ok {
		if apiErr.Code == "not_found" {
			return http.StatusNotFound
		}
	}
	msg := strings.ToLower(err.Error())
	if strings.Contains(msg, "not found") || strings.Contains(msg, "404") {
		return http.StatusNotFound
	}
	return http.StatusBadGateway
}
