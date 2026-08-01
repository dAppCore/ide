// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"bufio"
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	core "dappco.re/go"
	"dappco.re/go/devops/devkit"
)

// devops_* bridge tools surface core/go-devops's developer-toolkit + the
// canonical Lethean playbook tree. v1 covers the highest daily-value
// pieces: secret scanning (regex + gitleaks) and playbook enumeration.
// Lifts cleanly when go-devops publishes more pkg/* surfaces.

// toolDevopsSecretsScan runs the built-in regex secret scanner from
// core/go-devops/devkit. No external binary required (works on every
// machine), but lower coverage than gitleaks. The frontend offers both.
func (b *MCPBridge) toolDevopsSecretsScan(_ context.Context, params map[string]any) map[string]any {
	root := paramString(params, "path", "")
	if root == "" {
		return errResp("path is required")
	}
	if info, err := os.Stat(root); err != nil || !info.IsDir() {
		return errResp("path is not a directory: " + root)
	}
	findings, r := devkit.ScanDir(root)
	if !r.OK {
		if err, ok := r.Value.(error); ok {
			return map[string]any{"ok": false, "error": err.Error()}
		}
		return errResp("scan failed")
	}
	out := make([]map[string]any, 0, len(findings))
	rules := map[string]int{}
	for _, f := range findings {
		out = append(out, map[string]any{
			"file":    f.Path,
			"line":    f.Line,
			"column":  f.Column,
			"rule":    f.Rule,
			"snippet": f.Snippet,
		})
		rules[f.Rule]++
	}
	rulesArr := make([]map[string]any, 0, len(rules))
	for k, v := range rules {
		rulesArr = append(rulesArr, map[string]any{"rule": k, "count": v})
	}
	sort.Slice(rulesArr, func(i, j int) bool {
		return rulesArr[i]["count"].(int) > rulesArr[j]["count"].(int)
	})
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"path":      root,
			"findings":  out,
			"total":     len(findings),
			"rules":     rulesArr,
			"scanner":   "regex",
		},
	}
}

// toolDevopsGitleaks runs gitleaks via devkit.ScanSecrets. Requires the
// gitleaks binary on PATH; surfaces the binary's wider rule coverage
// (~150 patterns) when available.
func (b *MCPBridge) toolDevopsGitleaks(_ context.Context, params map[string]any) map[string]any {
	root := paramString(params, "path", "")
	if root == "" {
		return errResp("path is required")
	}
	findings, r := devkit.ScanSecrets(root)
	if !r.OK {
		if err, ok := r.Value.(error); ok {
			return map[string]any{
				"ok":    false,
				"error": err.Error(),
				"hint":  "ensure `gitleaks` is on PATH (brew install gitleaks)",
			}
		}
		return errResp("gitleaks scan failed")
	}
	out := make([]map[string]any, 0, len(findings))
	for _, f := range findings {
		out = append(out, map[string]any{
			"file":    f.Path,
			"line":    f.Line,
			"column":  f.Column,
			"rule":    f.Rule,
			"snippet": f.Snippet,
		})
	}
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"path":     root,
			"findings": out,
			"total":    len(findings),
			"scanner":  "gitleaks",
		},
	}
}

// toolDevopsPlaybooks enumerates Ansible playbooks across the canonical
// Lethean directories — the user's DevOps tree (~/Code/DevOps/playbooks)
// and go-devops's own bundled playbooks (core/go-devops/playbooks).
// Returns name + path + size + first-line description (parsed from a
// `# description: …` comment if present, else the YAML `name:` field).
func (b *MCPBridge) toolDevopsPlaybooks(_ context.Context, params map[string]any) map[string]any {
	home, err := os.UserHomeDir()
	if err != nil {
		return errResp("user home not resolvable")
	}
	roots := []string{
		filepath.Join(home, "Code", "DevOps", "playbooks"),
		filepath.Join(home, "Code", "core", "go-devops", "playbooks"),
	}

	// DuckDB cache — playbooks are filesystem-walked across two roots
	// every panel visit. TTL 5min; force-refresh available.
	const collection = "devops_playbooks"
	const ttl = 5 * time.Minute
	force := paramBool(params, "force", false)
	if !force && cacheAge(collection) < ttl {
		_, raws, hit := cacheGetCollection(collection)
		if hit && len(raws) > 0 {
			out := make([]map[string]any, 0, len(raws))
			for _, r := range raws {
				var entry map[string]any
				if err := json.Unmarshal(r, &entry); err == nil {
					out = append(out, entry)
				}
			}
			return map[string]any{
				"ok": true,
				"value": map[string]any{
					"roots":       roots,
					"playbooks":   out,
					"count":       len(out),
					"cache_hit":   true,
					"cache_age_s": int(cacheAge(collection).Seconds()),
				},
			}
		}
	}

	out := []map[string]any{}
	for _, root := range roots {
		entries, err := os.ReadDir(root)
		if err != nil {
			continue
		}
		for _, e := range entries {
			if e.IsDir() {
				continue
			}
			name := e.Name()
			if !strings.HasSuffix(name, ".yml") && !strings.HasSuffix(name, ".yaml") {
				continue
			}
			full := filepath.Join(root, name)
			info, err := os.Stat(full)
			if err != nil {
				continue
			}
			desc := readPlaybookDescription(full)
			out = append(out, map[string]any{
				"name":        name,
				"path":        full,
				"root":        root,
				"size_bytes":  info.Size(),
				"modified":    info.ModTime(),
				"description": desc,
			})
		}
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i]["path"].(string) < out[j]["path"].(string)
	})
	cacheItems := make([]cacheItem, 0, len(out))
	for _, entry := range out {
		path, _ := entry["path"].(string)
		cacheItems = append(cacheItems, cacheItem{Key: path, Data: entry})
	}
	_ = cacheSetCollection(collection, cacheItems)
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"roots":       roots,
			"playbooks":   out,
			"count":       len(out),
			"cache_hit":   false,
			"cache_age_s": 0,
		},
	}
}

// readPlaybookDescription returns the first useful descriptive line of a
// playbook — top `# description: …` comment, or the first play's `name:`
// field. Best-effort, returns "" when nothing parses.
func readPlaybookDescription(path string) string {
	f, err := os.Open(path)
	if err != nil {
		return ""
	}
	defer func() { _ = f.Close() }()
	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 0, 64*1024), 64*1024)
	for i := 0; i < 30 && scanner.Scan(); i++ {
		line := strings.TrimSpace(scanner.Text())
		if strings.HasPrefix(line, "# description:") {
			return strings.TrimSpace(strings.TrimPrefix(line, "# description:"))
		}
		if strings.HasPrefix(line, "- name:") {
			return strings.TrimSpace(strings.TrimPrefix(line, "- name:"))
		}
		if strings.HasPrefix(line, "name:") {
			return strings.TrimSpace(strings.TrimPrefix(line, "name:"))
		}
	}
	return ""
}

// Keep core import live (future: c.Action dispatch when devkit exposes
// services).
var _ = core.E
