// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"os"
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
