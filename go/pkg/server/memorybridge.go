// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"

	core "dappco.re/go"
)

// memoryBridge — typed wails wrapper over MCPBridge memory_list /
// memory_search. /dev/memory inspects Cladius's persistent memory.
type memoryBridge struct {
	core *core.Core
}

type MemoryEntry struct {
	Name        string `json:"name"`
	Type        string `json:"type,omitempty"`
	Description string `json:"description,omitempty"`
	Path        string `json:"path,omitempty"`
	SizeBytes   int    `json:"size_bytes,omitempty"`
	Modified    string `json:"modified,omitempty"`
}

type MemoryListInput struct {
	Sort  string `json:"sort,omitempty"`
	Force bool   `json:"force,omitempty"`
}

type MemoryListOutput struct {
	OK        bool          `json:"ok"`
	Entries   []MemoryEntry `json:"entries,omitempty"`
	CacheHit  bool          `json:"cache_hit,omitempty"`
	CacheAgeS int           `json:"cache_age_s,omitempty"`
	Error     string        `json:"error,omitempty"`
}

type MemorySearchInput struct {
	Query string `json:"query"`
}

type MemorySearchHit struct {
	Name    string `json:"name"`
	Path    string `json:"path,omitempty"`
	Snippet string `json:"snippet,omitempty"`
	Score   int    `json:"score,omitempty"`
}

type MemorySearchOutput struct {
	OK    bool              `json:"ok"`
	Hits  []MemorySearchHit `json:"hits,omitempty"`
	Error string            `json:"error,omitempty"`
}

func (b *memoryBridge) mcp() *MCPBridge {
	if b == nil || b.core == nil {
		return nil
	}
	s, _ := core.ServiceFor[*MCPBridge](b.core, "mcp_bridge")
	return s
}

func (b *memoryBridge) List(ctx context.Context, input MemoryListInput) (MemoryListOutput, error) {
	m := b.mcp()
	if m == nil {
		return MemoryListOutput{}, core.E("ide.server.Memory.List", "mcp bridge unavailable", nil)
	}
	raw := m.toolMemoryList(ctx, map[string]any{
		"sort":  input.Sort,
		"force": input.Force,
	})
	out := MemoryListOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		value = raw
	}
	if v, ok := value["cache_hit"].(bool); ok {
		out.CacheHit = v
	}
	if n, ok := value["cache_age_s"].(float64); ok {
		out.CacheAgeS = int(n)
	}
	if list, ok := value["entries"].([]any); ok {
		for _, e := range list {
			em, ok := e.(map[string]any)
			if !ok {
				continue
			}
			entry := MemoryEntry{}
			if s, ok := em["name"].(string); ok {
				entry.Name = s
			}
			if s, ok := em["type"].(string); ok {
				entry.Type = s
			}
			if s, ok := em["description"].(string); ok {
				entry.Description = s
			}
			if s, ok := em["path"].(string); ok {
				entry.Path = s
			}
			if n, ok := em["size_bytes"].(float64); ok {
				entry.SizeBytes = int(n)
			}
			if s, ok := em["modified"].(string); ok {
				entry.Modified = s
			}
			out.Entries = append(out.Entries, entry)
		}
	}
	return out, nil
}

func (b *memoryBridge) Search(ctx context.Context, input MemorySearchInput) (MemorySearchOutput, error) {
	m := b.mcp()
	if m == nil {
		return MemorySearchOutput{}, core.E("ide.server.Memory.Search", "mcp bridge unavailable", nil)
	}
	raw := m.toolMemorySearch(ctx, map[string]any{"query": input.Query})
	out := MemorySearchOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		value = raw
	}
	if list, ok := value["hits"].([]any); ok {
		for _, h := range list {
			hm, ok := h.(map[string]any)
			if !ok {
				continue
			}
			hit := MemorySearchHit{}
			if s, ok := hm["name"].(string); ok {
				hit.Name = s
			}
			if s, ok := hm["path"].(string); ok {
				hit.Path = s
			}
			if s, ok := hm["snippet"].(string); ok {
				hit.Snippet = s
			}
			if n, ok := hm["score"].(float64); ok {
				hit.Score = int(n)
			}
			out.Hits = append(out.Hits, hit)
		}
	}
	return out, nil
}
