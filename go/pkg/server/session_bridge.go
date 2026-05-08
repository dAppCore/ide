// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	sess "dappco.re/go/session"
)

// session_* bridge tools — surfaces dappco.re/go/session for the
// /sessions panel under Developer. Walks ~/.claude/projects/* (one
// directory per encoded cwd Claude Code has been invoked from), lists
// the JSONL transcripts inside, parses them on demand into events +
// analytics. Dogfood lane — we're literally inspecting the transcripts
// of conversations that built this code.

func claudeProjectsRoot() string {
	if v := strings.TrimSpace(os.Getenv("CORE_IDE_CLAUDE_PROJECTS_DIR")); v != "" {
		return v
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, ".claude", "projects")
}

type sessionProjectEntry struct {
	Name         string `json:"name"`            // encoded cwd, e.g. -Users-snider-Code-host-uk-core
	DisplayPath  string `json:"display_path"`    // best-effort decoded path
	Path         string `json:"path"`            // full path to the project dir
	SessionCount int    `json:"session_count"`
	LatestAt     string `json:"latest_at,omitempty"`
}

// session_projects_list — enumerates every ~/.claude/projects/<dir>/
// with at least one .jsonl, plus session count + last modified.
func (b *MCPBridge) toolSessionProjectsList(_ context.Context, _ map[string]any) map[string]any {
	root := claudeProjectsRoot()
	if root == "" {
		return map[string]any{"ok": false, "error": "could not resolve ~/.claude/projects"}
	}
	entries, err := os.ReadDir(root)
	if err != nil {
		return map[string]any{"ok": false, "error": err.Error()}
	}
	out := make([]sessionProjectEntry, 0, len(entries))
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		dir := filepath.Join(root, e.Name())
		matches, _ := filepath.Glob(filepath.Join(dir, "*.jsonl"))
		if len(matches) == 0 {
			continue
		}
		var latest time.Time
		for _, m := range matches {
			if info, err := os.Stat(m); err == nil && info.ModTime().After(latest) {
				latest = info.ModTime()
			}
		}
		ent := sessionProjectEntry{
			Name:         e.Name(),
			DisplayPath:  decodeProjectName(e.Name()),
			Path:         dir,
			SessionCount: len(matches),
		}
		if !latest.IsZero() {
			ent.LatestAt = latest.UTC().Format(time.RFC3339)
		}
		out = append(out, ent)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].LatestAt > out[j].LatestAt })
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"projects": out,
			"count":    len(out),
			"root":     root,
		},
	}
}

// decodeProjectName reverses Claude Code's cwd encoding: "/" → "-",
// leading slash dropped. Best-effort, since dashes in real paths can't
// be distinguished from slash markers.
func decodeProjectName(enc string) string {
	if !strings.HasPrefix(enc, "-") {
		return enc
	}
	return "/" + strings.ReplaceAll(strings.TrimPrefix(enc, "-"), "-", "/")
}

type sessionEntry struct {
	ID         string `json:"id"`
	Path       string `json:"path"`
	StartTime  string `json:"start_time,omitempty"`
	EndTime    string `json:"end_time,omitempty"`
	EventCount int    `json:"event_count"`
	SizeBytes  int64  `json:"size_bytes"`
}

// session_list — sessions in a single project. Uses ListSessions
// which does a first/last-timestamp scan (cheap; doesn't parse events).
// Augments each entry with file size for the UI.
func (b *MCPBridge) toolSessionList(_ context.Context, params map[string]any) map[string]any {
	dir := strings.TrimSpace(paramString(params, "project_dir", ""))
	if dir == "" {
		return map[string]any{"ok": false, "error": "project_dir required"}
	}
	r := sess.ListSessions(dir)
	if !r.OK {
		return map[string]any{"ok": false, "error": r.Error()}
	}
	sessions, ok := r.Value.([]sess.Session)
	if !ok {
		return map[string]any{"ok": false, "error": "unexpected ListSessions return shape"}
	}
	out := make([]sessionEntry, 0, len(sessions))
	for _, s := range sessions {
		var size int64
		if info, err := os.Stat(s.Path); err == nil {
			size = info.Size()
		}
		ent := sessionEntry{
			ID:         s.ID,
			Path:       s.Path,
			EventCount: len(s.Events),
			SizeBytes:  size,
		}
		if !s.StartTime.IsZero() {
			ent.StartTime = s.StartTime.UTC().Format(time.RFC3339)
		}
		if !s.EndTime.IsZero() {
			ent.EndTime = s.EndTime.UTC().Format(time.RFC3339)
		}
		out = append(out, ent)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].StartTime > out[j].StartTime })
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"sessions": out,
			"count":    len(out),
			"project":  dir,
		},
	}
}

// session_inspect — full ParseTranscript + Analyse on one .jsonl. Returns
// analytics + a tail of the event stream (last N events). Avoids dumping
// 100k+ events into the UI for sessions that are gigabytes large.
func (b *MCPBridge) toolSessionInspect(_ context.Context, params map[string]any) map[string]any {
	path := strings.TrimSpace(paramString(params, "path", ""))
	if path == "" {
		return map[string]any{"ok": false, "error": "path required"}
	}
	limit := paramInt(params, "limit", 200)
	if limit <= 0 || limit > 5000 {
		limit = 200
	}
	r := sess.ParseTranscript(path)
	if !r.OK {
		return map[string]any{"ok": false, "error": r.Error()}
	}
	parsed, ok := r.Value.(sess.ParsedSession)
	if !ok {
		return map[string]any{"ok": false, "error": "unexpected ParseTranscript return shape"}
	}
	if parsed.Session == nil {
		return map[string]any{"ok": false, "error": "parsed session is nil"}
	}
	an := sess.Analyse(parsed.Session)

	totalEvents := len(parsed.Session.Events)
	start := 0
	if totalEvents > limit {
		start = totalEvents - limit
	}
	tail := parsed.Session.Events[start:]
	events := make([]map[string]any, 0, len(tail))
	for _, e := range tail {
		events = append(events, map[string]any{
			"timestamp": e.Timestamp.UTC().Format(time.RFC3339),
			"type":      e.Type,
			"tool":      e.Tool,
			"input":     truncateForUI(e.Input, 200),
			"success":   e.Success,
			"duration_ms": e.Duration.Milliseconds(),
			"error":     e.ErrorMsg,
		})
	}

	stats := map[string]any{
		"event_count":             an.EventCount,
		"duration_seconds":        an.Duration.Seconds(),
		"active_seconds":          an.ActiveTime.Seconds(),
		"success_rate":            an.SuccessRate,
		"estimated_input_tokens":  an.EstimatedInputTokens,
		"estimated_output_tokens": an.EstimatedOutputTokens,
		"tool_counts":             an.ToolCounts,
		"error_counts":            an.ErrorCounts,
	}

	avgLatency := make(map[string]int64, len(an.AvgLatency))
	for k, v := range an.AvgLatency {
		avgLatency[k] = v.Milliseconds()
	}
	stats["avg_latency_ms"] = avgLatency

	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"id":            parsed.Session.ID,
			"path":          parsed.Session.Path,
			"start":         parsed.Session.StartTime.UTC().Format(time.RFC3339),
			"end":           parsed.Session.EndTime.UTC().Format(time.RFC3339),
			"total_events":  totalEvents,
			"event_tail":    events,
			"tail_offset":   start,
			"analytics":     stats,
		},
	}
}

// session_search — cross-session full-text search. sess.Search returns
// SearchResult{File, Line, Match} per hit; we surface those flat.
func (b *MCPBridge) toolSessionSearch(_ context.Context, params map[string]any) map[string]any {
	dir := strings.TrimSpace(paramString(params, "project_dir", ""))
	query := strings.TrimSpace(paramString(params, "query", ""))
	if dir == "" || query == "" {
		return map[string]any{"ok": false, "error": "project_dir and query required"}
	}
	r := sess.Search(dir, query)
	if !r.OK {
		return map[string]any{"ok": false, "error": r.Error()}
	}
	hits, ok := r.Value.([]sess.SearchResult)
	if !ok {
		return map[string]any{"ok": false, "error": "unexpected Search return shape"}
	}
	out := make([]map[string]any, 0, len(hits))
	for _, h := range hits {
		out = append(out, map[string]any{
			"session_id": h.SessionID,
			"timestamp":  h.Timestamp.UTC().Format(time.RFC3339),
			"tool":       h.Tool,
			"match":      truncateForUI(h.Match, 240),
		})
	}
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"hits":  out,
			"count": len(out),
			"query": query,
		},
	}
}

func truncateForUI(s string, n int) string {
	s = strings.ReplaceAll(s, "\n", " ")
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
