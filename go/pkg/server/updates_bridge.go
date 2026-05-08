// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os/exec"
	"strings"
	"sync"
	"time"

	core "dappco.re/go"
)

// updates_* bridge tools — surfaces version tracking for the tools the
// IDE depends on (gitleaks, deno, ripgrep, gh, docker, linuxkit, qemu,
// core-lint, core-php). For each: probe local install for --version,
// query the canonical release source for latest, badge as up-to-date /
// update-available / not-installed.
//
// Designed thin: GitHub release JSON is small, ungated, perfect for the
// quick check. Caches per session via sync.Map so the panel feels live
// without hammering api.github.com.

type toolEntry struct {
	Key         string            // stable id
	Name        string            // display name
	Binary      string            // PATH lookup target
	VersionCmd  []string          // command to print local version
	VersionGrep string            // regex/substring to extract version
	GithubRepo  string            // owner/repo for latest-release query, blank if not GitHub
	Description string
}

var updateCatalogue = []toolEntry{
	{Key: "gitleaks", Name: "gitleaks", Binary: "gitleaks", VersionCmd: []string{"version"}, GithubRepo: "gitleaks/gitleaks", Description: "Secret scanner — used by /devops Secrets tab"},
	{Key: "ripgrep", Name: "ripgrep", Binary: "rg", VersionCmd: []string{"--version"}, GithubRepo: "BurntSushi/ripgrep", Description: "Workspace search — used by /search route"},
	{Key: "deno", Name: "Deno", Binary: "deno", VersionCmd: []string{"--version"}, GithubRepo: "denoland/deno", Description: "TypeScript runtime — required by /ts deno-task scripts"},
	{Key: "gh", Name: "GitHub CLI", Binary: "gh", VersionCmd: []string{"--version"}, GithubRepo: "cli/cli", Description: "GitHub CLI — used by gh-related Lethean workflows"},
	{Key: "docker", Name: "Docker", Binary: "docker", VersionCmd: []string{"--version"}, GithubRepo: "moby/moby", Description: "Container runtime — surfaced by /containers panel"},
	{Key: "linuxkit", Name: "LinuxKit", Binary: "linuxkit", VersionCmd: []string{"version"}, GithubRepo: "linuxkit/linuxkit", Description: "VM image builder — surfaced by /containers panel"},
	{Key: "qemu", Name: "QEMU", Binary: "qemu-system-x86_64", VersionCmd: []string{"--version"}, GithubRepo: "qemu/qemu", Description: "Hypervisor — surfaced by /containers panel"},
	{Key: "go", Name: "Go", Binary: "go", VersionCmd: []string{"version"}, GithubRepo: "golang/go", Description: "Go toolchain — required to build core/ide itself"},
	{Key: "node", Name: "Node.js", Binary: "node", VersionCmd: []string{"--version"}, GithubRepo: "nodejs/node", Description: "Node runtime — used by /ts npm scripts"},
}

type toolStatus struct {
	Key           string `json:"key"`
	Name          string `json:"name"`
	Description   string `json:"description"`
	Installed     bool   `json:"installed"`
	LocalVersion  string `json:"local_version,omitempty"`
	LatestVersion string `json:"latest_version,omitempty"`
	LatestURL     string `json:"latest_url,omitempty"`
	UpToDate      bool   `json:"up_to_date"`
	GithubRepo    string `json:"github_repo,omitempty"`
	Error         string `json:"error,omitempty"`
}

var (
	latestReleaseCache sync.Map // repo → cached releaseEntry
	latestCacheTTL     = 5 * time.Minute
)

type releaseEntry struct {
	Version  string
	URL      string
	FetchedAt time.Time
}

func (b *MCPBridge) toolUpdatesList(_ context.Context, _ map[string]any) map[string]any {
	out := make([]toolStatus, 0, len(updateCatalogue))
	for _, t := range updateCatalogue {
		out = append(out, probeToolStatus(t))
	}
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"tools": out,
			"count": len(out),
		},
	}
}

// toolUpdatesRefresh re-probes a single tool by key (or all when key empty).
// Bypasses the github cache so the user can force a re-check.
func (b *MCPBridge) toolUpdatesRefresh(_ context.Context, params map[string]any) map[string]any {
	target := paramString(params, "key", "")
	out := make([]toolStatus, 0)
	for _, t := range updateCatalogue {
		if target != "" && t.Key != target {
			continue
		}
		latestReleaseCache.Delete(t.GithubRepo)
		out = append(out, probeToolStatus(t))
	}
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"tools": out,
			"count": len(out),
		},
	}
}

func probeToolStatus(t toolEntry) toolStatus {
	st := toolStatus{
		Key:         t.Key,
		Name:        t.Name,
		Description: t.Description,
		GithubRepo:  t.GithubRepo,
	}
	path, err := exec.LookPath(t.Binary)
	if err != nil {
		st.Installed = false
	} else {
		st.Installed = true
		_ = path
		c, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		out, err := exec.CommandContext(c, t.Binary, t.VersionCmd...).CombinedOutput()
		cancel()
		if err == nil {
			st.LocalVersion = extractVersion(string(out))
		}
	}
	if t.GithubRepo != "" {
		ver, url, err := latestGitHubRelease(t.GithubRepo)
		if err == nil {
			st.LatestVersion = ver
			st.LatestURL = url
		} else {
			st.Error = err.Error()
		}
	}
	if st.Installed && st.LocalVersion != "" && st.LatestVersion != "" {
		st.UpToDate = versionsMatch(st.LocalVersion, st.LatestVersion)
	}
	return st
}

// extractVersion finds the first vX.Y[.Z] or X.Y[.Z] in a tool's version
// output. Tools print wildly different shapes — simplest robust fallback
// is take the first dotted-number sequence.
func extractVersion(s string) string {
	s = strings.TrimSpace(s)
	for _, line := range strings.Split(s, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		// Find first run of digit-dot-digit
		var start, end int = -1, -1
		for i, r := range line {
			if r >= '0' && r <= '9' {
				if start < 0 {
					start = i
				}
				end = i + 1
			} else if r == '.' && start >= 0 {
				end = i + 1
			} else if start >= 0 {
				break
			}
		}
		if start >= 0 && end > start {
			return line[start:end]
		}
	}
	return ""
}

// versionsMatch compares two version strings loosely. Trims any leading
// "v" + treats trailing patch-zero as optional.
func versionsMatch(local, latest string) bool {
	a := strings.TrimPrefix(strings.TrimSpace(local), "v")
	b := strings.TrimPrefix(strings.TrimSpace(latest), "v")
	if a == b {
		return true
	}
	// Treat 1.2 and 1.2.0 as the same
	if strings.HasPrefix(b, a+".") && trailingZeros(strings.TrimPrefix(b, a+".")) {
		return true
	}
	if strings.HasPrefix(a, b+".") && trailingZeros(strings.TrimPrefix(a, b+".")) {
		return true
	}
	return false
}

func trailingZeros(s string) bool {
	for _, r := range s {
		if r != '0' && r != '.' {
			return false
		}
	}
	return true
}

func latestGitHubRelease(repo string) (string, string, error) {
	if cached, ok := latestReleaseCache.Load(repo); ok {
		entry := cached.(releaseEntry)
		if time.Since(entry.FetchedAt) < latestCacheTTL {
			return entry.Version, entry.URL, nil
		}
	}
	c, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	url := "https://api.github.com/repos/" + repo + "/releases/latest"
	req, err := http.NewRequestWithContext(c, http.MethodGet, url, nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "core-ide-updates/0.1")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer func() { _ = resp.Body.Close() }()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return "", "", core.E("updates.latestGitHubRelease", resp.Status, nil)
	}
	var rel struct {
		TagName string `json:"tag_name"`
		HTMLURL string `json:"html_url"`
	}
	if err := json.Unmarshal(body, &rel); err != nil {
		return "", "", err
	}
	latestReleaseCache.Store(repo, releaseEntry{
		Version:   rel.TagName,
		URL:       rel.HTMLURL,
		FetchedAt: time.Now(),
	})
	return rel.TagName, rel.HTMLURL, nil
}
