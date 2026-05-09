// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"

	core "dappco.re/go"
)

// reposBridge — typed wails wrapper over MCPBridge repos_status tool.
// /dev/repos is the multi-repo dashboard; cache TTL 30s server-side
// because git status across N roots is the slowest scan in the IDE.
type reposBridge struct {
	core *core.Core
}

type ReposStatusInput struct {
	Roots []string `json:"roots,omitempty"`
	Force bool     `json:"force,omitempty"`
}

type RepoEntry struct {
	Name      string `json:"name"`
	Path      string `json:"path"`
	Branch    string `json:"branch,omitempty"`
	Modified  int    `json:"modified,omitempty"`
	Untracked int    `json:"untracked,omitempty"`
	Staged    int    `json:"staged,omitempty"`
	Ahead     int    `json:"ahead,omitempty"`
	Behind    int    `json:"behind,omitempty"`
	Dirty     bool   `json:"dirty,omitempty"`
	Error     string `json:"error,omitempty"`
}

type ReposStatusOutput struct {
	OK        bool        `json:"ok"`
	Repos     []RepoEntry `json:"repos,omitempty"`
	Scanned   int         `json:"scanned,omitempty"`
	CacheHit  bool        `json:"cache_hit,omitempty"`
	CacheAgeS int         `json:"cache_age_s,omitempty"`
	Error     string      `json:"error,omitempty"`
}

func (b *reposBridge) mcp() *MCPBridge {
	if b == nil || b.core == nil {
		return nil
	}
	s, _ := core.ServiceFor[*MCPBridge](b.core, "mcp_bridge")
	return s
}

// Status scans every configured root for git state. Empty Roots →
// the bridge falls back to the canonical Lethean roots baked into
// the server.
func (b *reposBridge) Status(ctx context.Context, input ReposStatusInput) (ReposStatusOutput, error) {
	m := b.mcp()
	if m == nil {
		return ReposStatusOutput{}, core.E("ide.server.Repos.Status", "mcp bridge unavailable", nil)
	}
	params := map[string]any{
		"force": input.Force,
	}
	if len(input.Roots) > 0 {
		// Convert []string → []any so the existing param decoder picks it up.
		raw := make([]any, 0, len(input.Roots))
		for _, r := range input.Roots {
			raw = append(raw, r)
		}
		params["roots"] = raw
	}
	rawResp := m.toolReposStatus(ctx, params)
	out := ReposStatusOutput{}
	if ok, _ := rawResp["ok"].(bool); ok {
		out.OK = true
	}
	if e, _ := rawResp["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := rawResp["value"].(map[string]any)
	if value == nil {
		value = rawResp
	}
	if v, ok := value["cache_hit"].(bool); ok {
		out.CacheHit = v
	}
	if n, ok := value["cache_age_s"].(float64); ok {
		out.CacheAgeS = int(n)
	}
	if n, ok := value["cache_age_s"].(int); ok {
		out.CacheAgeS = n
	}
	if n, ok := value["scanned"].(float64); ok {
		out.Scanned = int(n)
	}
	if n, ok := value["scanned"].(int); ok {
		out.Scanned = n
	}
	if list, ok := value["repos"].([]any); ok {
		for _, r := range list {
			rm, ok := r.(map[string]any)
			if !ok {
				continue
			}
			entry := RepoEntry{}
			if s, ok := rm["name"].(string); ok {
				entry.Name = s
			}
			if s, ok := rm["path"].(string); ok {
				entry.Path = s
			}
			if s, ok := rm["branch"].(string); ok {
				entry.Branch = s
			}
			if n, ok := rm["modified"].(float64); ok {
				entry.Modified = int(n)
			}
			if n, ok := rm["untracked"].(float64); ok {
				entry.Untracked = int(n)
			}
			if n, ok := rm["staged"].(float64); ok {
				entry.Staged = int(n)
			}
			if n, ok := rm["ahead"].(float64); ok {
				entry.Ahead = int(n)
			}
			if n, ok := rm["behind"].(float64); ok {
				entry.Behind = int(n)
			}
			if v, ok := rm["dirty"].(bool); ok {
				entry.Dirty = v
			}
			if e, ok := rm["error"].(string); ok {
				entry.Error = e
			}
			out.Repos = append(out.Repos, entry)
		}
	}
	return out, nil
}
