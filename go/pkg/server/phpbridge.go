// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"

	core "dappco.re/go"
)

// phpBridge — typed wails wrapper over MCPBridge php_* tools (Laravel
// project discovery + composer/artisan runner).
type phpBridge struct {
	core *core.Core
}

type PHPProjectSummary struct {
	Path       string `json:"path"`
	Name       string `json:"name"`
	AppName    string `json:"app_name"`
	AppURL     string `json:"app_url"`
	PackageMgr string `json:"package_mgr"`
	FrankenPHP bool   `json:"frankenphp"`
}

type PHPDetectOutput struct {
	OK        bool                `json:"ok"`
	Projects  []PHPProjectSummary `json:"projects,omitempty"`
	Roots     []string            `json:"roots,omitempty"`
	Count     int                 `json:"count,omitempty"`
	CacheHit  bool                `json:"cache_hit,omitempty"`
	CacheAgeS int                 `json:"cache_age_s,omitempty"`
	Error     string              `json:"error,omitempty"`
}

type PHPProjectInput struct {
	Path string `json:"path"`
}

type PHPProjectDetail struct {
	Path            string   `json:"path"`
	Name            string   `json:"name"`
	AppName         string   `json:"app_name"`
	AppURL          string   `json:"app_url"`
	Domain          string   `json:"domain,omitempty"`
	PackageMgr      string   `json:"package_mgr"`
	FrankenPHP      bool     `json:"frankenphp"`
	Services        []string `json:"services,omitempty"`
	HasEnv          bool     `json:"has_env"`
	HasEnvExample   bool     `json:"has_env_example"`
	HasNodeModules  bool     `json:"has_node_modules"`
	HasVendor       bool     `json:"has_vendor"`
	HasComposerLock bool     `json:"has_composer_lock"`
	HasPackageLock  bool     `json:"has_package_lock"`
}

type PHPProjectOutput struct {
	OK     bool             `json:"ok"`
	Detail PHPProjectDetail `json:"detail"`
	Error  string           `json:"error,omitempty"`
}

type PHPScriptItem struct {
	Name        string   `json:"name"`
	Command     string   `json:"command"`
	Lines       int      `json:"lines,omitempty"`
	Source      string   `json:"source,omitempty"`
	ArtisanArgs []string `json:"artisan_args,omitempty"`
}

type PHPScriptsOutput struct {
	OK              bool            `json:"ok"`
	Path            string          `json:"path,omitempty"`
	ComposerScripts []PHPScriptItem `json:"composer_scripts,omitempty"`
	ArtisanScripts  []PHPScriptItem `json:"artisan_scripts,omitempty"`
	HasArtisan      bool            `json:"has_artisan"`
	HasComposer     bool            `json:"has_composer"`
	Error           string          `json:"error,omitempty"`
}

type PHPRunInput struct {
	Path    string   `json:"path"`
	Mode    string   `json:"mode"`
	Name    string   `json:"name,omitempty"`
	Args    []string `json:"args,omitempty"`
	Command string   `json:"command,omitempty"`
}

type PHPRunOutput struct {
	OK    bool   `json:"ok"`
	Error string `json:"error,omitempty"`
}

func (b *phpBridge) mcp() *MCPBridge {
	if b == nil || b.core == nil {
		return nil
	}
	s, _ := core.ServiceFor[*MCPBridge](b.core, "mcp_bridge")
	return s
}

func decodePHPSummaries(raw any) []PHPProjectSummary {
	list, ok := raw.([]any)
	if !ok {
		return nil
	}
	out := make([]PHPProjectSummary, 0, len(list))
	for _, item := range list {
		pm, ok := item.(map[string]any)
		if !ok {
			continue
		}
		p := PHPProjectSummary{}
		if s, ok := pm["path"].(string); ok {
			p.Path = s
		}
		if s, ok := pm["name"].(string); ok {
			p.Name = s
		}
		if s, ok := pm["app_name"].(string); ok {
			p.AppName = s
		}
		if s, ok := pm["app_url"].(string); ok {
			p.AppURL = s
		}
		if s, ok := pm["package_mgr"].(string); ok {
			p.PackageMgr = s
		}
		if v, ok := pm["frankenphp"].(bool); ok {
			p.FrankenPHP = v
		}
		out = append(out, p)
	}
	return out
}

func decodePHPScripts(raw any) []PHPScriptItem {
	list, ok := raw.([]any)
	if !ok {
		return nil
	}
	out := make([]PHPScriptItem, 0, len(list))
	for _, item := range list {
		sm, ok := item.(map[string]any)
		if !ok {
			continue
		}
		s := PHPScriptItem{}
		if v, ok := sm["name"].(string); ok {
			s.Name = v
		}
		if v, ok := sm["command"].(string); ok {
			s.Command = v
		}
		if v, ok := sm["lines"].(float64); ok {
			s.Lines = int(v)
		}
		if v, ok := sm["source"].(string); ok {
			s.Source = v
		}
		if v, ok := sm["artisan_args"].([]any); ok {
			for _, arg := range v {
				if a, ok := arg.(string); ok {
					s.ArtisanArgs = append(s.ArtisanArgs, a)
				}
			}
		}
		out = append(out, s)
	}
	return out
}

func (b *phpBridge) Detect() (PHPDetectOutput, error) {
	m := b.mcp()
	if m == nil {
		return PHPDetectOutput{}, core.E("ide.server.PHP.Detect", "mcp bridge unavailable", nil)
	}
	raw := m.toolPHPDetect(nil, map[string]any{})
	out := PHPDetectOutput{}
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
	if n, ok := value["count"].(float64); ok {
		out.Count = int(n)
	}
	if list, ok := value["roots"].([]any); ok {
		for _, r := range list {
			if s, ok := r.(string); ok {
				out.Roots = append(out.Roots, s)
			}
		}
	}
	out.Projects = decodePHPSummaries(value["projects"])
	return out, nil
}

func (b *phpBridge) Project(input PHPProjectInput) (PHPProjectOutput, error) {
	m := b.mcp()
	if m == nil {
		return PHPProjectOutput{}, core.E("ide.server.PHP.Project", "mcp bridge unavailable", nil)
	}
	raw := m.toolPHPProject(nil, map[string]any{"path": input.Path})
	out := PHPProjectOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		return out, nil
	}
	d := PHPProjectDetail{}
	if s, ok := value["path"].(string); ok {
		d.Path = s
	}
	if s, ok := value["name"].(string); ok {
		d.Name = s
	}
	if s, ok := value["app_name"].(string); ok {
		d.AppName = s
	}
	if s, ok := value["app_url"].(string); ok {
		d.AppURL = s
	}
	if s, ok := value["domain"].(string); ok {
		d.Domain = s
	}
	if s, ok := value["package_mgr"].(string); ok {
		d.PackageMgr = s
	}
	if v, ok := value["frankenphp"].(bool); ok {
		d.FrankenPHP = v
	}
	if list, ok := value["services"].([]any); ok {
		for _, s := range list {
			if str, ok := s.(string); ok {
				d.Services = append(d.Services, str)
			}
		}
	}
	if v, ok := value["has_env"].(bool); ok {
		d.HasEnv = v
	}
	if v, ok := value["has_env_example"].(bool); ok {
		d.HasEnvExample = v
	}
	if v, ok := value["has_node_modules"].(bool); ok {
		d.HasNodeModules = v
	}
	if v, ok := value["has_vendor"].(bool); ok {
		d.HasVendor = v
	}
	if v, ok := value["has_composer_lock"].(bool); ok {
		d.HasComposerLock = v
	}
	if v, ok := value["has_package_lock"].(bool); ok {
		d.HasPackageLock = v
	}
	out.Detail = d
	return out, nil
}

func (b *phpBridge) Scripts(input PHPProjectInput) (PHPScriptsOutput, error) {
	m := b.mcp()
	if m == nil {
		return PHPScriptsOutput{}, core.E("ide.server.PHP.Scripts", "mcp bridge unavailable", nil)
	}
	raw := m.toolPHPScripts(nil, map[string]any{"path": input.Path})
	out := PHPScriptsOutput{}
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
	if v, ok := value["has_artisan"].(bool); ok {
		out.HasArtisan = v
	}
	if v, ok := value["has_composer"].(bool); ok {
		out.HasComposer = v
	}
	out.ComposerScripts = decodePHPScripts(value["composer_scripts"])
	out.ArtisanScripts = decodePHPScripts(value["artisan_scripts"])
	return out, nil
}

func (b *phpBridge) Run(ctx context.Context, input PHPRunInput) (PHPRunOutput, error) {
	m := b.mcp()
	if m == nil {
		return PHPRunOutput{}, core.E("ide.server.PHP.Run", "mcp bridge unavailable", nil)
	}
	params := map[string]any{
		"path": input.Path,
		"mode": input.Mode,
	}
	if input.Name != "" {
		params["name"] = input.Name
	}
	if len(input.Args) > 0 {
		params["args"] = input.Args
	}
	if input.Command != "" {
		params["command"] = input.Command
	}
	raw := m.toolPHPRun(ctx, params)
	out := PHPRunOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	return out, nil
}
