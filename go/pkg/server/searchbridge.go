// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"

	core "dappco.re/go"
)

// searchBridge — typed wails wrapper over the existing MCPBridge
// workspace_search tool. Hot path for the IDE; every keystroke in
// /dev/search runs the ripgrep dispatcher.
type searchBridge struct {
	core *core.Core
}

type SearchInput struct {
	Query      string `json:"query"`
	Path       string `json:"path"`
	MaxResults int    `json:"max_results,omitempty"`
}

type SearchMatch struct {
	Path string `json:"path"`
	Line int    `json:"line"`
	Text string `json:"text"`
}

type SearchOutput struct {
	OK        bool          `json:"ok"`
	Matches   []SearchMatch `json:"matches,omitempty"`
	Truncated bool          `json:"truncated,omitempty"`
	Error     string        `json:"error,omitempty"`
}

func (b *searchBridge) mcp() *MCPBridge {
	if b == nil || b.core == nil {
		return nil
	}
	s, _ := core.ServiceFor[*MCPBridge](b.core, "mcp_bridge")
	return s
}

// Search runs ripgrep across the workspace and returns matches. Empty
// matches with OK=true is the canonical "found nothing" signal.
func (b *searchBridge) Search(ctx context.Context, input SearchInput) (SearchOutput, error) {
	m := b.mcp()
	if m == nil {
		return SearchOutput{}, core.E("ide.server.Search.Search", "mcp bridge unavailable", nil)
	}
	maxResults := input.MaxResults
	if maxResults == 0 {
		maxResults = 200
	}
	raw := m.toolWorkspaceSearch(ctx, map[string]any{
		"query":       input.Query,
		"path":        input.Path,
		"max_results": maxResults,
	})
	out := SearchOutput{}
	if ok, _ := raw["ok"].(bool); ok {
		out.OK = true
	}
	if errStr, _ := raw["error"].(string); errStr != "" {
		out.Error = errStr
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		// Some tool wrappers put matches at the top level rather than
		// under "value" — accept either shape.
		value = raw
	}
	if t, ok := value["truncated"].(bool); ok {
		out.Truncated = t
	}
	if list, ok := value["matches"].([]any); ok {
		for _, m := range list {
			mm, ok := m.(map[string]any)
			if !ok {
				continue
			}
			match := SearchMatch{}
			if s, ok := mm["path"].(string); ok {
				match.Path = s
			}
			if n, ok := mm["line"].(float64); ok {
				match.Line = int(n)
			}
			if n, ok := mm["line"].(int); ok {
				match.Line = n
			}
			if s, ok := mm["text"].(string); ok {
				match.Text = s
			}
			out.Matches = append(out.Matches, match)
		}
	}
	return out, nil
}
