// SPDX-License-Identifier: EUPL-1.2

package server

import (
	core "dappco.re/go"
)

// localesBridge — typed wails wrapper over MCPBridge i18n_* tools
// (translation coverage matrix over core/go-i18n).
type localesBridge struct {
	core *core.Core
}

type LocaleEntry struct {
	Name         string `json:"name"`
	Path         string `json:"path"`
	Keys         int    `json:"keys"`
	MissingVsEN  int    `json:"missing_vs_en"`
}

type I18nPackage struct {
	Code         string        `json:"code"`
	Path         string        `json:"path"`
	HasEnglish   bool          `json:"has_english"`
	BaselineKeys int           `json:"baseline_keys"`
	Locales      []LocaleEntry `json:"locales,omitempty"`
}

type I18nScanOutput struct {
	OK            bool          `json:"ok"`
	Packages      []I18nPackage `json:"packages,omitempty"`
	UniqueLocales []string      `json:"unique_locales,omitempty"`
	Roots         []string      `json:"roots,omitempty"`
	Total         int           `json:"total,omitempty"`
	CacheHit      bool          `json:"cache_hit,omitempty"`
	CacheAgeS     int           `json:"cache_age_s,omitempty"`
	Error         string        `json:"error,omitempty"`
}

type I18nViewInput struct {
	Path string `json:"path"`
}

type I18nViewOutput struct {
	OK      bool           `json:"ok"`
	Path    string         `json:"path,omitempty"`
	Content map[string]any `json:"content,omitempty"`
	Keys    int            `json:"keys,omitempty"`
	Error   string         `json:"error,omitempty"`
}

func (b *localesBridge) mcp() *MCPBridge {
	if b == nil || b.core == nil {
		return nil
	}
	s, _ := core.ServiceFor[*MCPBridge](b.core, "mcp_bridge")
	return s
}

func decodeLocaleEntries(raw any) []LocaleEntry {
	list, ok := raw.([]any)
	if !ok {
		return nil
	}
	out := make([]LocaleEntry, 0, len(list))
	for _, item := range list {
		lm, ok := item.(map[string]any)
		if !ok {
			continue
		}
		l := LocaleEntry{}
		if s, ok := lm["name"].(string); ok {
			l.Name = s
		}
		if s, ok := lm["path"].(string); ok {
			l.Path = s
		}
		if n, ok := lm["keys"].(float64); ok {
			l.Keys = int(n)
		}
		if n, ok := lm["missing_vs_en"].(float64); ok {
			l.MissingVsEN = int(n)
		}
		out = append(out, l)
	}
	return out
}

func decodeI18nPackages(raw any) []I18nPackage {
	list, ok := raw.([]any)
	if !ok {
		return nil
	}
	out := make([]I18nPackage, 0, len(list))
	for _, item := range list {
		pm, ok := item.(map[string]any)
		if !ok {
			continue
		}
		p := I18nPackage{}
		if s, ok := pm["code"].(string); ok {
			p.Code = s
		}
		if s, ok := pm["path"].(string); ok {
			p.Path = s
		}
		if v, ok := pm["has_english"].(bool); ok {
			p.HasEnglish = v
		}
		if n, ok := pm["baseline_keys"].(float64); ok {
			p.BaselineKeys = int(n)
		}
		p.Locales = decodeLocaleEntries(pm["locales"])
		out = append(out, p)
	}
	return out
}

func (b *localesBridge) Scan() (I18nScanOutput, error) {
	m := b.mcp()
	if m == nil {
		return I18nScanOutput{}, core.E("ide.server.Locales.Scan", "mcp bridge unavailable", nil)
	}
	raw := m.toolI18nScan(nil, map[string]any{})
	out := I18nScanOutput{}
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
	if n, ok := value["total"].(float64); ok {
		out.Total = int(n)
	}
	if list, ok := value["roots"].([]any); ok {
		for _, r := range list {
			if s, ok := r.(string); ok {
				out.Roots = append(out.Roots, s)
			}
		}
	}
	if list, ok := value["unique_locales"].([]any); ok {
		for _, r := range list {
			if s, ok := r.(string); ok {
				out.UniqueLocales = append(out.UniqueLocales, s)
			}
		}
	}
	out.Packages = decodeI18nPackages(value["packages"])
	return out, nil
}

func (b *localesBridge) View(input I18nViewInput) (I18nViewOutput, error) {
	m := b.mcp()
	if m == nil {
		return I18nViewOutput{}, core.E("ide.server.Locales.View", "mcp bridge unavailable", nil)
	}
	raw := m.toolI18nView(nil, map[string]any{"path": input.Path})
	out := I18nViewOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		return out, nil
	}
	if s, ok := value["path"].(string); ok {
		out.Path = s
	}
	if n, ok := value["keys"].(float64); ok {
		out.Keys = int(n)
	}
	if c, ok := value["content"].(map[string]any); ok {
		out.Content = c
	}
	return out, nil
}
