// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"

	core "dappco.re/go"
)

// buildBridge — typed wails wrapper over MCPBridge build_/process_
// tools. /dev/build runs build_detect (cached) on entry and build_run
// + process_* for live output streaming.
type buildBridge struct {
	core *core.Core
}

type BuildDetectInput struct {
	Path  string `json:"path"`
	Force bool   `json:"force,omitempty"`
}

type BuildDetectOutput struct {
	OK          bool     `json:"ok"`
	Path        string   `json:"path,omitempty"`
	Tool        string   `json:"tool,omitempty"`
	Source      string   `json:"source,omitempty"`
	Command     string   `json:"command,omitempty"`
	Args        []string `json:"args,omitempty"`
	Frameworks  []string `json:"frameworks,omitempty"`
	CacheHit    bool     `json:"cache_hit,omitempty"`
	CacheAgeS   int      `json:"cache_age_s,omitempty"`
	Error       string   `json:"error,omitempty"`
}

type BuildRunInput struct {
	Path    string   `json:"path"`
	Command string   `json:"command,omitempty"`
	Args    []string `json:"args,omitempty"`
}

type BuildRunOutput struct {
	OK        bool   `json:"ok"`
	ProcessID string `json:"process_id,omitempty"`
	Error     string `json:"error,omitempty"`
}

type ProcessIDInput struct {
	ID string `json:"id"`
}

type ProcessOutputResult struct {
	OK     bool   `json:"ok"`
	Output string `json:"output,omitempty"`
	Error  string `json:"error,omitempty"`
}

type ProcessKillOutput struct {
	OK    bool   `json:"ok"`
	Error string `json:"error,omitempty"`
}

type ProcessListEntry struct {
	ID     string `json:"id"`
	Status string `json:"status,omitempty"`
}

type ProcessListOutput struct {
	OK        bool               `json:"ok"`
	Processes []ProcessListEntry `json:"processes,omitempty"`
	Error     string             `json:"error,omitempty"`
}

func (b *buildBridge) mcp() *MCPBridge {
	if b == nil || b.core == nil {
		return nil
	}
	s, _ := core.ServiceFor[*MCPBridge](b.core, "mcp_bridge")
	return s
}

// Detect probes the workspace for a buildable project. Result is
// cached server-side (DuckDB, 5min TTL); pass force=true to bypass.
func (b *buildBridge) Detect(ctx context.Context, input BuildDetectInput) (BuildDetectOutput, error) {
	m := b.mcp()
	if m == nil {
		return BuildDetectOutput{}, core.E("ide.server.Build.Detect", "mcp bridge unavailable", nil)
	}
	raw := m.toolBuildDetect(ctx, map[string]any{
		"path":  input.Path,
		"force": input.Force,
	})
	out := BuildDetectOutput{}
	if ok, _ := raw["ok"].(bool); ok {
		out.OK = true
	}
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		value = raw
	}
	if s, _ := value["path"].(string); s != "" {
		out.Path = s
	}
	if s, _ := value["tool"].(string); s != "" {
		out.Tool = s
	}
	if s, _ := value["source"].(string); s != "" {
		out.Source = s
	}
	if s, _ := value["command"].(string); s != "" {
		out.Command = s
	}
	if list, ok := value["args"].([]any); ok {
		for _, a := range list {
			if s, ok := a.(string); ok {
				out.Args = append(out.Args, s)
			}
		}
	}
	if list, ok := value["frameworks"].([]any); ok {
		for _, f := range list {
			if s, ok := f.(string); ok {
				out.Frameworks = append(out.Frameworks, s)
			}
		}
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
	return out, nil
}

// Run spawns the build command and returns the managed process_id so
// the panel can poll output / kill.
func (b *buildBridge) Run(ctx context.Context, input BuildRunInput) (BuildRunOutput, error) {
	m := b.mcp()
	if m == nil {
		return BuildRunOutput{}, core.E("ide.server.Build.Run", "mcp bridge unavailable", nil)
	}
	params := map[string]any{"path": input.Path}
	if input.Command != "" {
		params["command"] = input.Command
	}
	if len(input.Args) > 0 {
		params["args"] = input.Args
	}
	raw := m.toolBuildRun(ctx, params)
	out := BuildRunOutput{}
	if ok, _ := raw["ok"].(bool); ok {
		out.OK = true
	}
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		value = raw
	}
	if s, _ := value["process_id"].(string); s != "" {
		out.ProcessID = s
	}
	return out, nil
}

// ProcessKill stops a running process by its id.
func (b *buildBridge) ProcessKill(ctx context.Context, input ProcessIDInput) (ProcessKillOutput, error) {
	m := b.mcp()
	if m == nil {
		return ProcessKillOutput{}, core.E("ide.server.Build.ProcessKill", "mcp bridge unavailable", nil)
	}
	_ = ctx
	raw := m.toolProcessKill(map[string]any{"id": input.ID})
	out := ProcessKillOutput{}
	if ok, _ := raw["ok"].(bool); ok {
		out.OK = true
	}
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	return out, nil
}

// ProcessOutput fetches accumulated stdout/stderr for a process.
func (b *buildBridge) ProcessOutput(ctx context.Context, input ProcessIDInput) (ProcessOutputResult, error) {
	m := b.mcp()
	if m == nil {
		return ProcessOutputResult{}, core.E("ide.server.Build.ProcessOutput", "mcp bridge unavailable", nil)
	}
	_ = ctx
	raw := m.toolProcessOutput(map[string]any{"id": input.ID})
	out := ProcessOutputResult{}
	if ok, _ := raw["ok"].(bool); ok {
		out.OK = true
	}
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		value = raw
	}
	if s, _ := value["output"].(string); s != "" {
		out.Output = s
	}
	return out, nil
}

// ProcessList returns the current managed-process registry.
func (b *buildBridge) ProcessList(ctx context.Context) (ProcessListOutput, error) {
	m := b.mcp()
	if m == nil {
		return ProcessListOutput{}, core.E("ide.server.Build.ProcessList", "mcp bridge unavailable", nil)
	}
	_ = ctx
	raw := m.toolProcessList(map[string]any{})
	out := ProcessListOutput{}
	if ok, _ := raw["ok"].(bool); ok {
		out.OK = true
	}
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		value = raw
	}
	if list, ok := value["processes"].([]any); ok {
		for _, p := range list {
			pm, ok := p.(map[string]any)
			if !ok {
				continue
			}
			entry := ProcessListEntry{}
			if s, ok := pm["id"].(string); ok {
				entry.ID = s
			}
			if s, ok := pm["status"].(string); ok {
				entry.Status = s
			}
			out.Processes = append(out.Processes, entry)
		}
	}
	return out, nil
}
