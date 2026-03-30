// SPDX-Licence-Identifier: EUPL-1.2

package main

import (
	"fmt"
	"net/http"

	"forge.lthn.ai/core/api/pkg/provider"
	"github.com/gin-gonic/gin"
)

// ProvidersAPI exposes registered provider information via GET /api/v1/providers.
// The Angular frontend uses this endpoint to discover providers and load their
// custom elements dynamically.
type ProvidersAPI struct {
	registry *provider.Registry
	runtime  *RuntimeManager
}

func NewProvidersAPI(reg *provider.Registry, rm *RuntimeManager) *ProvidersAPI {
	return &ProvidersAPI{registry: reg, runtime: rm}
}

func (p *ProvidersAPI) Name() string     { return "providers-api" }
func (p *ProvidersAPI) BasePath() string { return "/api/v1/providers" }

func (p *ProvidersAPI) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("", p.list)
}

// list godoc
//
//	@Summary		List registered providers
//	@Description	Returns all registered providers with their capabilities
//	@Tags			providers
//	@Produce		json
//	@Success		200	{object}	providersResponse
//	@Router			/api/v1/providers [get]
func (p *ProvidersAPI) list(c *gin.Context) {
	registryInfo := p.registry.Info()
	runtimeInfo := p.runtime.List()

	// Merge registry and runtime provider data without duplication.
	providers := make([]providerDTO, 0, len(registryInfo)+len(runtimeInfo))
	seen := make(map[string]struct{}, len(registryInfo)+len(runtimeInfo))

	providerKey := func(name, namespace string) string {
		return fmt.Sprintf("%s|%s", name, namespace)
	}

	for _, info := range registryInfo {
		key := providerKey(info.Name, info.BasePath)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}

		dto := providerDTO{
			Name:     info.Name,
			BasePath: info.BasePath,
			Status:   "active",
			Channels: info.Channels,
		}
		if info.Element != nil {
			dto.Element = &elementDTO{
				Tag:    info.Element.Tag,
				Source: info.Element.Source,
			}
		}
		providers = append(providers, dto)
	}

	// Add runtime providers not already in registry
	for _, ri := range runtimeInfo {
		key := providerKey(ri.Code, ri.Namespace)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}

		providers = append(providers, providerDTO{
			Name:      ri.Code,
			BasePath:  ri.Namespace,
			Status:    ri.Status,
			Code:      ri.Code,
			Version:   ri.Version,
			Namespace: ri.Namespace,
		})
	}

	c.JSON(http.StatusOK, providersResponse{Providers: providers})
}

type providersResponse struct {
	Providers []providerDTO `json:"providers"`
}

type providerDTO struct {
	Name      string      `json:"name"`
	BasePath  string      `json:"basePath"`
	Status    string      `json:"status,omitempty"`
	Code      string      `json:"code,omitempty"`
	Version   string      `json:"version,omitempty"`
	Namespace string      `json:"namespace,omitempty"`
	Element   *elementDTO `json:"element,omitempty"`
	Channels  []string    `json:"channels,omitempty"`
}

type elementDTO struct {
	Tag    string `json:"tag"`
	Source string `json:"source"`
}
