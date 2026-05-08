// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
)

// memory_* bridge tools — surfaces Cladius's auto-memory directory as a
// browseable panel. Lives at ~/.claude/projects/<encoded-cwd>/memory/
// (same convention as the session JSONLs). Each .md has YAML frontmatter
// with name / description / type fields. The panel lists + filters; the
// open-in-monaco loop reuses openSearchResult.

func claudeMemoryDir() string {
	if v := strings.TrimSpace(os.Getenv("CORE_IDE_CLAUDE_MEMORY_DIR")); v != "" {
		return v
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	// First try cwd-encoded path (matches where Claude Code put the memory).
	if cwd, err := os.Getwd(); err == nil {
		encoded := strings.ReplaceAll(cwd, "/", "-")
		candidate := filepath.Join(home, ".claude", "projects", encoded, "memory")
		if entries, err := os.ReadDir(candidate); err == nil && len(entries) > 0 {
			return candidate
		}
	}
	// Fallback: pick the projects/<dir>/memory with the most files. Lets the
	// IDE — launched from anywhere — surface the user's main memory tree
	// without env config.
	root := filepath.Join(home, ".claude", "projects")
	dirs, err := os.ReadDir(root)
	if err != nil {
		return ""
	}
	bestDir := ""
	bestCount := 0
	for _, d := range dirs {
		if !d.IsDir() {
			continue
		}
		mem := filepath.Join(root, d.Name(), "memory")
		entries, err := os.ReadDir(mem)
		if err != nil {
			continue
		}
		if len(entries) > bestCount {
			bestCount = len(entries)
			bestDir = mem
		}
	}
	return bestDir
}

type memoryEntry struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Type        string `json:"type"`
	Filename    string `json:"filename"`
	Path        string `json:"path"`
	Size        int64  `json:"size"`
	Modified    string `json:"modified,omitempty"`
}

// toolMemoryList walks the memory dir, parses each .md's frontmatter, and
// returns a list of entries. Cheap — only reads the first ~30 lines per file
// to extract YAML frontmatter, no full parse.
func (b *MCPBridge) toolMemoryList(_ context.Context, params map[string]any) map[string]any {
	dir := strings.TrimSpace(paramString(params, "dir", ""))
	if dir == "" {
		dir = claudeMemoryDir()
	}
	if dir == "" {
		return map[string]any{"ok": false, "error": "memory directory not configured"}
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return map[string]any{"ok": false, "error": err.Error()}
	}

	out := make([]memoryEntry, 0, len(entries))
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".md") {
			continue
		}
		full := filepath.Join(dir, e.Name())
		info, err := e.Info()
		if err != nil {
			continue
		}
		entry := memoryEntry{
			Filename: e.Name(),
			Path:     full,
			Size:     info.Size(),
			Modified: info.ModTime().UTC().Format("2006-01-02T15:04:05Z"),
		}
		// Parse frontmatter: read first 4KB, look for --- line block at top.
		head := readFileHead(full, 4096)
		parseMemoryFrontmatter(head, &entry)
		// Fallback for un-frontmattered files (e.g. MEMORY.md the index)
		if entry.Name == "" {
			entry.Name = strings.TrimSuffix(e.Name(), ".md")
		}
		out = append(out, entry)
	}

	sortBy := strings.ToLower(strings.TrimSpace(paramString(params, "sort", "modified")))
	switch sortBy {
	case "name":
		sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	case "type":
		sort.Slice(out, func(i, j int) bool {
			if out[i].Type == out[j].Type {
				return out[i].Name < out[j].Name
			}
			return out[i].Type < out[j].Type
		})
	default:
		sort.Slice(out, func(i, j int) bool { return out[i].Modified > out[j].Modified })
	}

	// Type counts for filter pills
	typeCounts := make(map[string]int)
	for _, m := range out {
		t := m.Type
		if t == "" {
			t = "untyped"
		}
		typeCounts[t]++
	}

	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"memories":    out,
			"count":       len(out),
			"dir":         dir,
			"type_counts": typeCounts,
		},
	}
}

type memorySearchHit struct {
	Filename    string `json:"filename"`
	Path        string `json:"path"`
	Line        int    `json:"line"`
	Match       string `json:"match"`
	MemoryName  string `json:"memory_name,omitempty"`
	MemoryType  string `json:"memory_type,omitempty"`
}

// toolMemorySearch shells out to ripgrep across the memory directory and
// returns matched lines with filename + line + context. Falls back to a
// pure-Go scan if rg isn't on PATH (rg is in the /updates catalogue, but
// can be missing on a fresh machine).
func (b *MCPBridge) toolMemorySearch(_ context.Context, params map[string]any) map[string]any {
	query := strings.TrimSpace(paramString(params, "query", ""))
	if query == "" {
		return map[string]any{"ok": false, "error": "query required"}
	}
	dir := strings.TrimSpace(paramString(params, "dir", ""))
	if dir == "" {
		dir = claudeMemoryDir()
	}
	if dir == "" {
		return map[string]any{"ok": false, "error": "memory directory not configured"}
	}
	limit := paramInt(params, "limit", 200)
	if limit <= 0 || limit > 5000 {
		limit = 200
	}

	hits := runRipgrepJSON(query, dir, limit)
	if hits == nil {
		hits = goGrep(query, dir, limit)
	}

	// Per-hit, enrich with memory name/type from frontmatter (cheap — head read).
	frontmatterCache := make(map[string]memoryEntry)
	for i, h := range hits {
		entry, ok := frontmatterCache[h.Path]
		if !ok {
			entry = memoryEntry{Filename: h.Filename, Path: h.Path}
			parseMemoryFrontmatter(readFileHead(h.Path, 4096), &entry)
			frontmatterCache[h.Path] = entry
		}
		hits[i].MemoryName = entry.Name
		hits[i].MemoryType = entry.Type
	}

	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"hits":  hits,
			"count": len(hits),
			"query": query,
			"dir":   dir,
		},
	}
}

// runRipgrepJSON invokes `rg --json` and parses match events. Returns nil
// when rg isn't on PATH (signals fallback). Empty result with rg present
// returns []memorySearchHit{}.
func runRipgrepJSON(query, dir string, limit int) []memorySearchHit {
	if _, err := exec.LookPath("rg"); err != nil {
		return nil
	}
	cmd := exec.Command("rg", "--json", "--smart-case", "--max-count", "10", "--no-heading", "--", query, dir)
	out, err := cmd.Output()
	if err != nil {
		// rg exits non-zero when there are no matches; surface as empty
		// rather than fall back to the slower path.
		if exitErr, ok := err.(*exec.ExitError); ok && exitErr.ExitCode() == 1 {
			return []memorySearchHit{}
		}
		return nil
	}
	hits := make([]memorySearchHit, 0, 32)
	for _, line := range strings.Split(string(out), "\n") {
		if line == "" {
			continue
		}
		var event struct {
			Type string `json:"type"`
			Data struct {
				Path struct {
					Text string `json:"text"`
				} `json:"path"`
				Lines struct {
					Text string `json:"text"`
				} `json:"lines"`
				LineNumber int `json:"line_number"`
			} `json:"data"`
		}
		if err := json.Unmarshal([]byte(line), &event); err != nil {
			continue
		}
		if event.Type != "match" {
			continue
		}
		hits = append(hits, memorySearchHit{
			Filename: filepath.Base(event.Data.Path.Text),
			Path:     event.Data.Path.Text,
			Line:     event.Data.LineNumber,
			Match:    truncateForUI(strings.TrimRight(event.Data.Lines.Text, "\n"), 200),
		})
		if len(hits) >= limit {
			break
		}
	}
	return hits
}

// goGrep is a minimal pure-Go fallback when rg isn't installed. Walks
// the dir, reads each .md, scans for case-insensitive substring matches.
// Slower than rg but always works.
func goGrep(query, dir string, limit int) []memorySearchHit {
	q := strings.ToLower(query)
	hits := make([]memorySearchHit, 0, 32)
	entries, err := os.ReadDir(dir)
	if err != nil {
		return hits
	}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".md") {
			continue
		}
		full := filepath.Join(dir, e.Name())
		data, err := os.ReadFile(full)
		if err != nil {
			continue
		}
		for i, line := range strings.Split(string(data), "\n") {
			if !strings.Contains(strings.ToLower(line), q) {
				continue
			}
			hits = append(hits, memorySearchHit{
				Filename: e.Name(),
				Path:     full,
				Line:     i + 1,
				Match:    truncateForUI(line, 200),
			})
			if len(hits) >= limit {
				return hits
			}
		}
	}
	return hits
}

func readFileHead(path string, n int) string {
	f, err := os.Open(path)
	if err != nil {
		return ""
	}
	defer f.Close()
	buf := make([]byte, n)
	read, _ := f.Read(buf)
	return string(buf[:read])
}

func parseMemoryFrontmatter(head string, entry *memoryEntry) {
	if !strings.HasPrefix(head, "---") {
		return
	}
	rest := head[3:]
	if !strings.HasPrefix(rest, "\n") {
		return
	}
	rest = rest[1:]
	end := strings.Index(rest, "\n---")
	if end < 0 {
		return
	}
	block := rest[:end]
	for _, line := range strings.Split(block, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		colon := strings.Index(line, ":")
		if colon <= 0 {
			continue
		}
		key := strings.TrimSpace(line[:colon])
		val := strings.TrimSpace(line[colon+1:])
		val = strings.TrimPrefix(val, "\"")
		val = strings.TrimSuffix(val, "\"")
		val = strings.TrimPrefix(val, "'")
		val = strings.TrimSuffix(val, "'")
		switch key {
		case "name":
			entry.Name = val
		case "description":
			entry.Description = val
		case "type":
			entry.Type = val
		}
	}
}
