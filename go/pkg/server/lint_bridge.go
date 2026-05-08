// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// lint_* bridge tools — IDE surface over core/lint.
//
// Today (v1) shells out to the core-lint binary (`lint check --format json`)
// against the workspace root. When core/lint publishes its pkg/lint surface
// as a Go module the bridge can swap subprocess for direct Go API calls —
// same result schema, same UI.
//
// Schema mirrors core-lint's JSON output:
//   [{rule_id, title, severity, file, line, match, fix}]

// LintIssue mirrors a single result row from `core-lint lint check --format json`.
type LintIssue struct {
	RuleID   string `json:"rule_id"`
	Title    string `json:"title"`
	Severity string `json:"severity"`
	File     string `json:"file"`
	Line     int    `json:"line"`
	Match    string `json:"match"`
	Fix      string `json:"fix"`
}

// LintRunOutput is the wrapped response shape — adds severity counts
// and the absolute-path resolution used by the frontend's click-to-open.
type LintRunOutput struct {
	Path       string         `json:"path"`
	Issues     []LintIssue    `json:"issues"`
	Counts     map[string]int `json:"counts"`
	Total      int            `json:"total"`
	BinaryPath string         `json:"binary_path"`
	DurationMs int64          `json:"duration_ms"`
}

// toolLintRun executes core-lint against a workspace root and returns
// parsed issues + severity buckets. The frontend's /lint route renders
// the grouped table and uses File+Line for click-to-open.
func (b *MCPBridge) toolLintRun(ctx context.Context, params map[string]any) map[string]any {
	root := paramString(params, "path", "")
	if root == "" {
		return errResp("path is required")
	}
	if info, err := os.Stat(root); err != nil || !info.IsDir() {
		return errResp("path is not a directory: " + root)
	}
	binary := paramString(params, "binary", "")
	if binary == "" {
		binary = lintBinary()
	}
	if binary == "" {
		return errResp("core-lint binary not found (looked at PATH + canonical /Users/snider/Code/core/lint/bin/core-lint)")
	}

	severity := paramString(params, "severity", "")
	lang := paramString(params, "lang", "")
	args := []string{"lint", "check", root, "--format", "json"}
	if severity != "" {
		args = append(args, "--severity", severity)
	}
	if lang != "" {
		args = append(args, "--lang", lang)
	}

	c, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()
	start := time.Now()
	cmd := exec.CommandContext(c, binary, args...)
	out, err := cmd.Output()
	dur := time.Since(start).Milliseconds()
	if err != nil {
		// Non-zero exit is normal when issues exist. Only treat as error
		// if no JSON came back.
		if len(out) == 0 {
			return map[string]any{"ok": false, "error": err.Error()}
		}
	}

	var issues []LintIssue
	if jerr := json.Unmarshal(out, &issues); jerr != nil {
		return map[string]any{"ok": false, "error": "parse json: " + jerr.Error()}
	}

	counts := map[string]int{}
	for _, iss := range issues {
		counts[iss.Severity]++
	}

	return map[string]any{
		"ok": true,
		"value": LintRunOutput{
			Path:       root,
			Issues:     issues,
			Counts:     counts,
			Total:      len(issues),
			BinaryPath: binary,
			DurationMs: dur,
		},
	}
}

// toolLintCatalog enumerates the rules the linter knows about — useful
// for tooltips + a "rule reference" surface.
func (b *MCPBridge) toolLintCatalog(ctx context.Context, _ map[string]any) map[string]any {
	binary := lintBinary()
	if binary == "" {
		return errResp("core-lint binary not found")
	}
	c, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	cmd := exec.CommandContext(c, binary, "lint", "catalog", "list")
	out, err := cmd.Output()
	if err != nil {
		return map[string]any{"ok": false, "error": err.Error()}
	}
	// Catalog list is text; parse line-by-line.
	rules := []map[string]string{}
	for _, line := range strings.Split(string(out), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, " ", 2)
		if len(parts) == 2 {
			rules = append(rules, map[string]string{"id": parts[0], "title": parts[1]})
		}
	}
	return map[string]any{"ok": true, "value": map[string]any{"rules": rules, "count": len(rules)}}
}

// lintBinary returns the path to core-lint, preferring PATH and falling
// back to the canonical Snider workstation path. Returns "" if nothing's
// found.
func lintBinary() string {
	if path, err := exec.LookPath("core-lint"); err == nil {
		return path
	}
	canonical := "/Users/snider/Code/core/lint/bin/core-lint"
	if info, err := os.Stat(canonical); err == nil && !info.IsDir() {
		return canonical
	}
	// Worker workstations may have it under their own path.
	home, err := os.UserHomeDir()
	if err == nil {
		alt := filepath.Join(home, "Code", "core", "lint", "bin", "core-lint")
		if info, err := os.Stat(alt); err == nil && !info.IsDir() {
			return alt
		}
	}
	return ""
}
