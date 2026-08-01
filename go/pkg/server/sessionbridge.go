// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"

	core "dappco.re/go"
)

// sessionBridge — typed wails wrapper over MCPBridge session_* tools.
// /dev/sessions has the heaviest tool surface in the IDE: project
// list (cached), per-project session list, inspect, active scan,
// cross-session search, live tail.
type sessionBridge struct {
	core *core.Core
}

type SessionProject struct {
	Name         string `json:"name"`
	DisplayPath  string `json:"display_path"`
	Path         string `json:"path"`
	SessionCount int    `json:"session_count"`
	LatestAt     string `json:"latest_at,omitempty"`
}

type SessionProjectsOutput struct {
	OK        bool             `json:"ok"`
	Projects  []SessionProject `json:"projects,omitempty"`
	CacheHit  bool             `json:"cache_hit,omitempty"`
	CacheAgeS int              `json:"cache_age_s,omitempty"`
	Error     string           `json:"error,omitempty"`
}

type SessionSummary struct {
	ID         string `json:"id"`
	Path       string `json:"path"`
	StartTime  string `json:"start_time,omitempty"`
	EndTime    string `json:"end_time,omitempty"`
	EventCount int    `json:"event_count,omitempty"`
	SizeBytes  int64  `json:"size_bytes,omitempty"`
}

type SessionListInput struct {
	ProjectDir string `json:"project_dir"`
}

type SessionListOutput struct {
	OK       bool             `json:"ok"`
	Sessions []SessionSummary `json:"sessions,omitempty"`
	Error    string           `json:"error,omitempty"`
}

type SessionInspectInput struct {
	Path  string `json:"path"`
	Limit int    `json:"limit,omitempty"`
}

type SessionEvent struct {
	Timestamp  string `json:"timestamp,omitempty"`
	Type       string `json:"type,omitempty"`
	Tool       string `json:"tool,omitempty"`
	DurationMs int    `json:"duration_ms,omitempty"`
	Input      string `json:"input,omitempty"`
	Success    bool   `json:"success,omitempty"`
}

type SessionAnalytics struct {
	DurationSeconds        int                `json:"duration_seconds,omitempty"`
	ActiveSeconds          int                `json:"active_seconds,omitempty"`
	EventCount             int                `json:"event_count,omitempty"`
	EstimatedInputTokens   int                `json:"estimated_input_tokens,omitempty"`
	EstimatedOutputTokens  int                `json:"estimated_output_tokens,omitempty"`
	SuccessRate            float64            `json:"success_rate,omitempty"`
	ToolCounts             map[string]int     `json:"tool_counts,omitempty"`
	AvgLatencyMs           map[string]float64 `json:"avg_latency_ms,omitempty"`
}

type SessionInspectOutput struct {
	ID          string            `json:"id"`
	Path        string            `json:"path"`
	Start       string            `json:"start,omitempty"`
	End         string            `json:"end,omitempty"`
	TotalEvents int               `json:"total_events,omitempty"`
	TailOffset  int64             `json:"tail_offset,omitempty"`
	EventTail   []SessionEvent    `json:"event_tail,omitempty"`
	Analytics   *SessionAnalytics `json:"analytics,omitempty"`
}

type ActiveSession struct {
	ID          string `json:"id"`
	Path        string `json:"path"`
	Project     string `json:"project,omitempty"`
	ProjectPath string `json:"project_path,omitempty"`
	SizeBytes   int64  `json:"size_bytes,omitempty"`
	Modified    string `json:"modified,omitempty"`
	AgeSeconds  int    `json:"age_seconds,omitempty"`
}

type SessionActiveInput struct {
	SinceMinutes int `json:"since_minutes"`
}

type SessionActiveOutput struct {
	OK     bool            `json:"ok"`
	Active []ActiveSession `json:"active,omitempty"`
	Error  string          `json:"error,omitempty"`
}

type SessionSearchInput struct {
	ProjectDir string `json:"project_dir"`
	Query      string `json:"query"`
}

type SessionSearchHit struct {
	SessionID string `json:"session_id"`
	Timestamp string `json:"timestamp,omitempty"`
	Tool      string `json:"tool,omitempty"`
	Match     string `json:"match,omitempty"`
}

type SessionSearchOutput struct {
	OK    bool               `json:"ok"`
	Hits  []SessionSearchHit `json:"hits,omitempty"`
	Error string             `json:"error,omitempty"`
}

type SessionTailInput struct {
	Path        string `json:"path"`
	SinceOffset int64  `json:"since_offset"`
	Limit       int    `json:"limit,omitempty"`
}

type SessionTailLiveEvent struct {
	Timestamp string `json:"timestamp"`
	Type      string `json:"type,omitempty"`
	Role      string `json:"role,omitempty"`
	Tool      string `json:"tool,omitempty"`
	Input     string `json:"input,omitempty"`
}

type SessionTailOutput struct {
	OK         bool                   `json:"ok"`
	Events     []SessionTailLiveEvent `json:"events,omitempty"`
	NextOffset int64                  `json:"next_offset,omitempty"`
	Error      string                 `json:"error,omitempty"`
}

func (b *sessionBridge) mcp() *MCPBridge {
	if b == nil || b.core == nil {
		return nil
	}
	s, _ := core.ServiceFor[*MCPBridge](b.core, "mcp_bridge")
	return s
}

type SessionProjectsInput struct {
	Force bool `json:"force,omitempty"`
}

func (b *sessionBridge) ProjectsList(ctx context.Context, input SessionProjectsInput) (SessionProjectsOutput, error) {
	m := b.mcp()
	if m == nil {
		return SessionProjectsOutput{}, core.E("ide.server.Session.ProjectsList", "mcp bridge unavailable", nil)
	}
	raw := m.toolSessionProjectsList(ctx, map[string]any{"force": input.Force})
	out := SessionProjectsOutput{}
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
	if list, ok := value["projects"].([]any); ok {
		for _, p := range list {
			pm, ok := p.(map[string]any)
			if !ok {
				continue
			}
			entry := SessionProject{}
			if s, ok := pm["name"].(string); ok {
				entry.Name = s
			}
			if s, ok := pm["display_path"].(string); ok {
				entry.DisplayPath = s
			}
			if s, ok := pm["path"].(string); ok {
				entry.Path = s
			}
			if n, ok := pm["session_count"].(float64); ok {
				entry.SessionCount = int(n)
			}
			if s, ok := pm["latest_at"].(string); ok {
				entry.LatestAt = s
			}
			out.Projects = append(out.Projects, entry)
		}
	}
	return out, nil
}

func (b *sessionBridge) List(ctx context.Context, input SessionListInput) (SessionListOutput, error) {
	m := b.mcp()
	if m == nil {
		return SessionListOutput{}, core.E("ide.server.Session.List", "mcp bridge unavailable", nil)
	}
	raw := m.toolSessionList(ctx, map[string]any{"project_dir": input.ProjectDir})
	out := SessionListOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		value = raw
	}
	if list, ok := value["sessions"].([]any); ok {
		for _, s := range list {
			sm, ok := s.(map[string]any)
			if !ok {
				continue
			}
			summary := SessionSummary{}
			if v, ok := sm["id"].(string); ok {
				summary.ID = v
			}
			if v, ok := sm["path"].(string); ok {
				summary.Path = v
			}
			if v, ok := sm["start_time"].(string); ok {
				summary.StartTime = v
			}
			if v, ok := sm["end_time"].(string); ok {
				summary.EndTime = v
			}
			if n, ok := sm["event_count"].(float64); ok {
				summary.EventCount = int(n)
			}
			if n, ok := sm["size_bytes"].(float64); ok {
				summary.SizeBytes = int64(n)
			}
			out.Sessions = append(out.Sessions, summary)
		}
	}
	return out, nil
}

// Inspect returns the typed map directly via a passthrough — analytics
// + event_tail are nested + variable-shape, so we route through JSON
// and let the FE bind the wails-emitted model.
func (b *sessionBridge) Inspect(ctx context.Context, input SessionInspectInput) (map[string]any, error) {
	m := b.mcp()
	if m == nil {
		return nil, core.E("ide.server.Session.Inspect", "mcp bridge unavailable", nil)
	}
	limit := input.Limit
	if limit == 0 {
		limit = 200
	}
	raw := m.toolSessionInspect(ctx, map[string]any{"path": input.Path, "limit": limit})
	if errStr, _ := raw["error"].(string); errStr != "" {
		return nil, core.E("ide.server.Session.Inspect", errStr, nil)
	}
	if value, ok := raw["value"].(map[string]any); ok {
		return value, nil
	}
	return raw, nil
}

func (b *sessionBridge) Active(ctx context.Context, input SessionActiveInput) (SessionActiveOutput, error) {
	m := b.mcp()
	if m == nil {
		return SessionActiveOutput{}, core.E("ide.server.Session.Active", "mcp bridge unavailable", nil)
	}
	raw := m.toolSessionActiveList(ctx, map[string]any{"since_minutes": input.SinceMinutes})
	out := SessionActiveOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		value = raw
	}
	if list, ok := value["active"].([]any); ok {
		for _, s := range list {
			sm, ok := s.(map[string]any)
			if !ok {
				continue
			}
			active := ActiveSession{}
			if v, ok := sm["id"].(string); ok {
				active.ID = v
			}
			if v, ok := sm["path"].(string); ok {
				active.Path = v
			}
			if v, ok := sm["project"].(string); ok {
				active.Project = v
			}
			if v, ok := sm["project_path"].(string); ok {
				active.ProjectPath = v
			}
			if n, ok := sm["size_bytes"].(float64); ok {
				active.SizeBytes = int64(n)
			}
			if v, ok := sm["modified"].(string); ok {
				active.Modified = v
			}
			if n, ok := sm["age_seconds"].(float64); ok {
				active.AgeSeconds = int(n)
			}
			out.Active = append(out.Active, active)
		}
	}
	return out, nil
}

func (b *sessionBridge) Search(ctx context.Context, input SessionSearchInput) (SessionSearchOutput, error) {
	m := b.mcp()
	if m == nil {
		return SessionSearchOutput{}, core.E("ide.server.Session.Search", "mcp bridge unavailable", nil)
	}
	raw := m.toolSessionSearch(ctx, map[string]any{"project_dir": input.ProjectDir, "query": input.Query})
	out := SessionSearchOutput{}
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
			hit := SessionSearchHit{}
			if v, ok := hm["session_id"].(string); ok {
				hit.SessionID = v
			}
			if v, ok := hm["timestamp"].(string); ok {
				hit.Timestamp = v
			}
			if v, ok := hm["tool"].(string); ok {
				hit.Tool = v
			}
			if v, ok := hm["match"].(string); ok {
				hit.Match = v
			}
			out.Hits = append(out.Hits, hit)
		}
	}
	return out, nil
}

func (b *sessionBridge) Tail(ctx context.Context, input SessionTailInput) (SessionTailOutput, error) {
	m := b.mcp()
	if m == nil {
		return SessionTailOutput{}, core.E("ide.server.Session.Tail", "mcp bridge unavailable", nil)
	}
	limit := input.Limit
	if limit == 0 {
		limit = 200
	}
	raw := m.toolSessionTail(ctx, map[string]any{
		"path":         input.Path,
		"since_offset": input.SinceOffset,
		"limit":        limit,
	})
	out := SessionTailOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		value = raw
	}
	if n, ok := value["next_offset"].(float64); ok {
		out.NextOffset = int64(n)
	}
	if list, ok := value["events"].([]any); ok {
		for _, e := range list {
			em, ok := e.(map[string]any)
			if !ok {
				continue
			}
			ev := SessionTailLiveEvent{}
			if v, ok := em["timestamp"].(string); ok {
				ev.Timestamp = v
			}
			if v, ok := em["type"].(string); ok {
				ev.Type = v
			}
			if v, ok := em["role"].(string); ok {
				ev.Role = v
			}
			if v, ok := em["tool"].(string); ok {
				ev.Tool = v
			}
			if v, ok := em["input"].(string); ok {
				ev.Input = v
			}
			out.Events = append(out.Events, ev)
		}
	}
	return out, nil
}
