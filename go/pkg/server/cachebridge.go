// SPDX-License-Identifier: EUPL-1.2

package server

import (
	core "dappco.re/go"
)

// cacheBridge — typed wails wrapper over MCPBridge cache_* tools
// (DuckDB-backed app state at ~/.core/ide-cache.db).
type cacheBridge struct {
	core *core.Core
}

type CacheCollectionEntry struct {
	Collection   string `json:"collection"`
	LastFullScan string `json:"last_full_scan,omitempty"`
	ItemCount    int    `json:"item_count"`
	AgeSeconds   int    `json:"age_seconds"`
}

type CacheStatusOutput struct {
	OK          bool                   `json:"ok"`
	Collections []CacheCollectionEntry `json:"collections,omitempty"`
	Count       int                    `json:"count,omitempty"`
	Error       string                 `json:"error,omitempty"`
}

type CacheClearInput struct {
	Collection string `json:"collection"`
}

type CacheClearOutput struct {
	OK      bool   `json:"ok"`
	Cleared string `json:"cleared,omitempty"`
	Error   string `json:"error,omitempty"`
}

func (b *cacheBridge) mcp() *MCPBridge {
	if b == nil || b.core == nil {
		return nil
	}
	s, _ := core.ServiceFor[*MCPBridge](b.core, "mcp_bridge")
	return s
}

func (b *cacheBridge) Status() (CacheStatusOutput, error) {
	m := b.mcp()
	if m == nil {
		return CacheStatusOutput{}, core.E("ide.server.Cache.Status", "mcp bridge unavailable", nil)
	}
	raw := m.toolCacheStatus(nil, nil)
	out := CacheStatusOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		return out, nil
	}
	if n, ok := value["count"].(float64); ok {
		out.Count = int(n)
	}
	if list, ok := value["collections"].([]any); ok {
		for _, item := range list {
			cm, ok := item.(map[string]any)
			if !ok {
				continue
			}
			entry := CacheCollectionEntry{}
			if s, ok := cm["collection"].(string); ok {
				entry.Collection = s
			}
			if s, ok := cm["last_full_scan"].(string); ok {
				entry.LastFullScan = s
			}
			if n, ok := cm["item_count"].(float64); ok {
				entry.ItemCount = int(n)
			}
			if n, ok := cm["age_seconds"].(float64); ok {
				entry.AgeSeconds = int(n)
			}
			out.Collections = append(out.Collections, entry)
		}
	}
	return out, nil
}

func (b *cacheBridge) Clear(input CacheClearInput) (CacheClearOutput, error) {
	m := b.mcp()
	if m == nil {
		return CacheClearOutput{}, core.E("ide.server.Cache.Clear", "mcp bridge unavailable", nil)
	}
	raw := m.toolCacheClear(nil, map[string]any{"collection": input.Collection})
	out := CacheClearOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value != nil {
		if s, ok := value["cleared"].(string); ok {
			out.Cleared = s
		}
	}
	return out, nil
}
