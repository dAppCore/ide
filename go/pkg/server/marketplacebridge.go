// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"

	core "dappco.re/go"
)

// marketplaceBridge — typed wails wrapper over MCPBridge pkg_* tools
// (marketplace browse / install / remove via core/scm).
type marketplaceBridge struct {
	core *core.Core
}

type MarketplaceSearchInput struct {
	Query    string `json:"query,omitempty"`
	Category string `json:"category,omitempty"`
}

type MarketplacePackage struct {
	Code        string `json:"code"`
	Name        string `json:"name"`
	Version     string `json:"version,omitempty"`
	Repo        string `json:"repo,omitempty"`
	Category    string `json:"category,omitempty"`
	Entrypoint  string `json:"entrypoint,omitempty"`
	Description string `json:"description,omitempty"`
}

type MarketplaceSearchOutput struct {
	OK       bool                 `json:"ok"`
	Packages []MarketplacePackage `json:"packages,omitempty"`
	Error    string               `json:"error,omitempty"`
}

type MarketplaceInstalledPlugin struct {
	Code       string `json:"code"`
	Name       string `json:"name"`
	Version    string `json:"version"`
	EntryPoint string `json:"entry_point,omitempty"`
}

type MarketplaceInstalledOutput struct {
	OK        bool                         `json:"ok"`
	Packages  []MarketplaceInstalledPlugin `json:"packages,omitempty"`
	CacheHit  bool                         `json:"cache_hit,omitempty"`
	CacheAgeS int                          `json:"cache_age_s,omitempty"`
	Error     string                       `json:"error,omitempty"`
}

type MarketplaceCodeInput struct {
	Code string `json:"code"`
}

type MarketplaceMutationOutput struct {
	OK    bool   `json:"ok"`
	Error string `json:"error,omitempty"`
}

func (b *marketplaceBridge) mcp() *MCPBridge {
	if b == nil || b.core == nil {
		return nil
	}
	s, _ := core.ServiceFor[*MCPBridge](b.core, "mcp_bridge")
	return s
}

func decodeMarketPackages(raw any) []MarketplacePackage {
	list, ok := raw.([]any)
	if !ok {
		return nil
	}
	out := make([]MarketplacePackage, 0, len(list))
	for _, item := range list {
		pm, ok := item.(map[string]any)
		if !ok {
			continue
		}
		p := MarketplacePackage{}
		if s, ok := pm["code"].(string); ok {
			p.Code = s
		}
		if s, ok := pm["name"].(string); ok {
			p.Name = s
		}
		if s, ok := pm["version"].(string); ok {
			p.Version = s
		}
		if s, ok := pm["repo"].(string); ok {
			p.Repo = s
		}
		if s, ok := pm["category"].(string); ok {
			p.Category = s
		}
		if s, ok := pm["entrypoint"].(string); ok {
			p.Entrypoint = s
		}
		if s, ok := pm["description"].(string); ok {
			p.Description = s
		}
		out = append(out, p)
	}
	return out
}

func (b *marketplaceBridge) Search(ctx context.Context, input MarketplaceSearchInput) (MarketplaceSearchOutput, error) {
	m := b.mcp()
	if m == nil {
		return MarketplaceSearchOutput{}, core.E("ide.server.Marketplace.Search", "mcp bridge unavailable", nil)
	}
	raw := m.toolPkgSearch(ctx, map[string]any{
		"query":    input.Query,
		"category": input.Category,
	})
	out := MarketplaceSearchOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value != nil {
		out.Packages = decodeMarketPackages(value["packages"])
	}
	return out, nil
}

func (b *marketplaceBridge) Installed(ctx context.Context) (MarketplaceInstalledOutput, error) {
	m := b.mcp()
	if m == nil {
		return MarketplaceInstalledOutput{}, core.E("ide.server.Marketplace.Installed", "mcp bridge unavailable", nil)
	}
	raw := m.toolPkgInstalled(ctx, map[string]any{})
	out := MarketplaceInstalledOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		return out, nil
	}
	if v, ok := value["cache_hit"].(bool); ok {
		out.CacheHit = v
	}
	if n, ok := value["cache_age_s"].(float64); ok {
		out.CacheAgeS = int(n)
	}
	if list, ok := value["packages"].([]any); ok {
		for _, item := range list {
			pm, ok := item.(map[string]any)
			if !ok {
				continue
			}
			p := MarketplaceInstalledPlugin{}
			if s, ok := pm["code"].(string); ok {
				p.Code = s
			}
			if s, ok := pm["name"].(string); ok {
				p.Name = s
			}
			if s, ok := pm["version"].(string); ok {
				p.Version = s
			}
			if s, ok := pm["entry_point"].(string); ok {
				p.EntryPoint = s
			}
			out.Packages = append(out.Packages, p)
		}
	}
	return out, nil
}

func (b *marketplaceBridge) Install(ctx context.Context, input MarketplaceCodeInput) (MarketplaceMutationOutput, error) {
	m := b.mcp()
	if m == nil {
		return MarketplaceMutationOutput{}, core.E("ide.server.Marketplace.Install", "mcp bridge unavailable", nil)
	}
	raw := m.toolPkgInstall(ctx, map[string]any{"code": input.Code})
	out := MarketplaceMutationOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	return out, nil
}

func (b *marketplaceBridge) Remove(ctx context.Context, input MarketplaceCodeInput) (MarketplaceMutationOutput, error) {
	m := b.mcp()
	if m == nil {
		return MarketplaceMutationOutput{}, core.E("ide.server.Marketplace.Remove", "mcp bridge unavailable", nil)
	}
	raw := m.toolPkgRemove(ctx, map[string]any{"code": input.Code})
	out := MarketplaceMutationOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	return out, nil
}
