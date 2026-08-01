// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"

	core "dappco.re/go"
)

// devopsBridge — typed wails wrapper over MCPBridge devops_* tools
// (secrets scan, gitleaks, playbooks).
type devopsBridge struct {
	core *core.Core
}

type DevopsScanInput struct {
	Path  string `json:"path,omitempty"`
	Force bool   `json:"force,omitempty"`
}

type DevopsScanFinding struct {
	File     string `json:"file,omitempty"`
	Line     int    `json:"line,omitempty"`
	Rule     string `json:"rule,omitempty"`
	Severity string `json:"severity,omitempty"`
	Match    string `json:"match,omitempty"`
}

type DevopsScanOutput struct {
	OK        bool                `json:"ok"`
	Findings  []DevopsScanFinding `json:"findings,omitempty"`
	CacheHit  bool                `json:"cache_hit,omitempty"`
	CacheAgeS int                 `json:"cache_age_s,omitempty"`
	Error     string              `json:"error,omitempty"`
}

type DevopsPlaybookEntry struct {
	Name        string   `json:"name"`
	Path        string   `json:"path,omitempty"`
	Description string   `json:"description,omitempty"`
	Tags        []string `json:"tags,omitempty"`
}

type DevopsPlaybooksOutput struct {
	OK        bool                  `json:"ok"`
	Playbooks []DevopsPlaybookEntry `json:"playbooks,omitempty"`
	CacheHit  bool                  `json:"cache_hit,omitempty"`
	CacheAgeS int                   `json:"cache_age_s,omitempty"`
	Error     string                `json:"error,omitempty"`
}

func (b *devopsBridge) mcp() *MCPBridge {
	if b == nil || b.core == nil {
		return nil
	}
	s, _ := core.ServiceFor[*MCPBridge](b.core, "mcp_bridge")
	return s
}

// decodeScan pulls the canonical {findings, cache_*} envelope from a
// devops scan response (secrets / gitleaks share the shape).
func decodeScan(raw map[string]any) DevopsScanOutput {
	out := DevopsScanOutput{}
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
	if list, ok := value["findings"].([]any); ok {
		for _, f := range list {
			fm, ok := f.(map[string]any)
			if !ok {
				continue
			}
			finding := DevopsScanFinding{}
			if s, ok := fm["file"].(string); ok {
				finding.File = s
			}
			if n, ok := fm["line"].(float64); ok {
				finding.Line = int(n)
			}
			if s, ok := fm["rule"].(string); ok {
				finding.Rule = s
			}
			if s, ok := fm["severity"].(string); ok {
				finding.Severity = s
			}
			if s, ok := fm["match"].(string); ok {
				finding.Match = s
			}
			out.Findings = append(out.Findings, finding)
		}
	}
	return out
}

func (b *devopsBridge) SecretsScan(ctx context.Context, input DevopsScanInput) (DevopsScanOutput, error) {
	m := b.mcp()
	if m == nil {
		return DevopsScanOutput{}, core.E("ide.server.Devops.SecretsScan", "mcp bridge unavailable", nil)
	}
	raw := m.toolDevopsSecretsScan(ctx, map[string]any{
		"path":  input.Path,
		"force": input.Force,
	})
	return decodeScan(raw), nil
}

func (b *devopsBridge) Gitleaks(ctx context.Context, input DevopsScanInput) (DevopsScanOutput, error) {
	m := b.mcp()
	if m == nil {
		return DevopsScanOutput{}, core.E("ide.server.Devops.Gitleaks", "mcp bridge unavailable", nil)
	}
	raw := m.toolDevopsGitleaks(ctx, map[string]any{
		"path":  input.Path,
		"force": input.Force,
	})
	return decodeScan(raw), nil
}

func (b *devopsBridge) Playbooks(ctx context.Context, input DevopsScanInput) (DevopsPlaybooksOutput, error) {
	m := b.mcp()
	if m == nil {
		return DevopsPlaybooksOutput{}, core.E("ide.server.Devops.Playbooks", "mcp bridge unavailable", nil)
	}
	raw := m.toolDevopsPlaybooks(ctx, map[string]any{
		"path":  input.Path,
		"force": input.Force,
	})
	out := DevopsPlaybooksOutput{}
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
	if list, ok := value["playbooks"].([]any); ok {
		for _, p := range list {
			pm, ok := p.(map[string]any)
			if !ok {
				continue
			}
			entry := DevopsPlaybookEntry{}
			if s, ok := pm["name"].(string); ok {
				entry.Name = s
			}
			if s, ok := pm["path"].(string); ok {
				entry.Path = s
			}
			if s, ok := pm["description"].(string); ok {
				entry.Description = s
			}
			if list, ok := pm["tags"].([]any); ok {
				for _, t := range list {
					if s, ok := t.(string); ok {
						entry.Tags = append(entry.Tags, s)
					}
				}
			}
			out.Playbooks = append(out.Playbooks, entry)
		}
	}
	return out, nil
}
