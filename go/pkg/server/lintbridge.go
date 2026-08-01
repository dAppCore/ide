// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"

	core "dappco.re/go"
)

// lintBridge — typed wails wrapper over MCPBridge lint_run / lint_catalog.
// Reuses the existing LintRunOutput / LintIssue types from lint_bridge.go
// since they already match the FE's wire shape exactly (rule_id, title,
// severity, file, line, match, fix + severity counts).
type lintBridge struct {
	core *core.Core
}

type WailsLintRunInput struct {
	Path string `json:"path"`
}

type WailsLintCatalogEntry struct {
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Installed   bool   `json:"installed,omitempty"`
}

type WailsLintCatalogOutput struct {
	OK    bool                    `json:"ok"`
	Tools []WailsLintCatalogEntry `json:"tools,omitempty"`
	Error string                  `json:"error,omitempty"`
}

func (b *lintBridge) mcp() *MCPBridge {
	if b == nil || b.core == nil {
		return nil
	}
	s, _ := core.ServiceFor[*MCPBridge](b.core, "mcp_bridge")
	return s
}

// Run executes core-lint against the workspace and returns the
// canonical issues + severity counts. Reuses the existing
// LintRunOutput type so the FE binding matches the legacy
// callBridge wire shape.
func (b *lintBridge) Run(ctx context.Context, input WailsLintRunInput) (LintRunOutput, error) {
	m := b.mcp()
	if m == nil {
		return LintRunOutput{}, core.E("ide.server.Lint.Run", "mcp bridge unavailable", nil)
	}
	raw := m.toolLintRun(ctx, map[string]any{"path": input.Path})
	out := LintRunOutput{Counts: map[string]int{}}
	if e, _ := raw["error"].(string); e != "" {
		return out, core.E("ide.server.Lint.Run", e, nil)
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		value = raw
	}
	if s, ok := value["path"].(string); ok {
		out.Path = s
	}
	if s, ok := value["binary_path"].(string); ok {
		out.BinaryPath = s
	}
	if n, ok := value["total"].(float64); ok {
		out.Total = int(n)
	}
	if n, ok := value["duration_ms"].(float64); ok {
		out.DurationMs = int64(n)
	}
	if counts, ok := value["counts"].(map[string]any); ok {
		for k, v := range counts {
			if n, ok := v.(float64); ok {
				out.Counts[k] = int(n)
			}
		}
	}
	if list, ok := value["issues"].([]any); ok {
		for _, i := range list {
			im, ok := i.(map[string]any)
			if !ok {
				continue
			}
			issue := LintIssue{}
			if s, ok := im["rule_id"].(string); ok {
				issue.RuleID = s
			}
			if s, ok := im["title"].(string); ok {
				issue.Title = s
			}
			if s, ok := im["severity"].(string); ok {
				issue.Severity = s
			}
			if s, ok := im["file"].(string); ok {
				issue.File = s
			}
			if n, ok := im["line"].(float64); ok {
				issue.Line = int(n)
			}
			if s, ok := im["match"].(string); ok {
				issue.Match = s
			}
			if s, ok := im["fix"].(string); ok {
				issue.Fix = s
			}
			out.Issues = append(out.Issues, issue)
		}
	}
	return out, nil
}

// Catalog returns the configured tool catalog (rules + plugins).
func (b *lintBridge) Catalog(ctx context.Context) (WailsLintCatalogOutput, error) {
	m := b.mcp()
	if m == nil {
		return WailsLintCatalogOutput{}, core.E("ide.server.Lint.Catalog", "mcp bridge unavailable", nil)
	}
	raw := m.toolLintCatalog(ctx, map[string]any{})
	out := WailsLintCatalogOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		value = raw
	}
	if list, ok := value["tools"].([]any); ok {
		for _, t := range list {
			tm, ok := t.(map[string]any)
			if !ok {
				continue
			}
			entry := WailsLintCatalogEntry{}
			if s, ok := tm["name"].(string); ok {
				entry.Name = s
			}
			if s, ok := tm["description"].(string); ok {
				entry.Description = s
			}
			if v, ok := tm["installed"].(bool); ok {
				entry.Installed = v
			}
			out.Tools = append(out.Tools, entry)
		}
	}
	return out, nil
}
