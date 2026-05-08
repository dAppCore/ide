// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"os"
	"path/filepath"

	scmgit "dappco.re/go/scm/git"
)

// repos_status surfaces the multi-repo dashboard. Different abstraction layer
// to git_status (per-file source control inside one repo): this returns
// per-repo aggregate state for a list of working trees. Drives the /repos
// route — "your N Lethean repos: which need attention?".
//
// When params.paths is empty the bridge scans defaultRepoRoots — the user's
// well-known Code/* trees — and returns every git repo found inside them.
func (b *MCPBridge) toolReposStatus(ctx context.Context, params map[string]any) map[string]any {
	paths := stringSliceParam(params, "paths")
	if len(paths) == 0 {
		// Honour user-configured roots when present; otherwise scan the
		// canonical Code/{core,lthn,host-uk,lab,snider} trees.
		roots := stringSliceParam(params, "roots")
		if len(roots) > 0 {
			paths = scanRepoRoots(roots)
		} else {
			paths = scanDefaultRepoRoots()
		}
	}
	if len(paths) == 0 {
		return map[string]any{"ok": true, "value": map[string]any{"repos": []any{}, "scanned": 0}}
	}
	statuses := scmgit.Status(ctx, scmgit.StatusOptions{Paths: paths})
	repos := make([]map[string]any, 0, len(statuses))
	for _, st := range statuses {
		entry := map[string]any{
			"name":      st.Name,
			"path":      st.Path,
			"branch":    st.Branch,
			"modified":  st.Modified,
			"untracked": st.Untracked,
			"staged":    st.Staged,
			"ahead":     st.Ahead,
			"behind":    st.Behind,
			"dirty":     st.IsDirty(),
		}
		if st.Error != nil {
			entry["error"] = st.Error.Error()
		}
		repos = append(repos, entry)
	}
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"repos":   repos,
			"scanned": len(paths),
		},
	}
}

// scanDefaultRepoRoots walks the user's canonical workspace roots and returns
// the absolute path of every directory that contains a .git entry.
func scanDefaultRepoRoots() []string {
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		return nil
	}
	return scanRepoRoots([]string{
		filepath.Join(home, "Code", "core"),
		filepath.Join(home, "Code", "lthn"),
		filepath.Join(home, "Code", "host-uk"),
		filepath.Join(home, "Code", "lab"),
		filepath.Join(home, "Code", "snider"),
	})
}

// scanRepoRoots expands a list of parent directories into git-repo paths. Any
// immediate subdirectory that contains a .git entry is included. Order is
// stable — root order then alphabetical within root.
func scanRepoRoots(roots []string) []string {
	var out []string
	for _, root := range roots {
		entries, err := os.ReadDir(root)
		if err != nil {
			continue
		}
		for _, entry := range entries {
			if !entry.IsDir() {
				continue
			}
			full := filepath.Join(root, entry.Name())
			info, err := os.Stat(filepath.Join(full, ".git"))
			if err != nil || info == nil {
				continue
			}
			out = append(out, full)
		}
	}
	return out
}

// stringSliceParam extracts a []string from a map[string]any param. Tolerates
// both []string and []any (which JSON decode produces).
func stringSliceParam(params map[string]any, key string) []string {
	raw, ok := params[key]
	if !ok || raw == nil {
		return nil
	}
	if s, ok := raw.([]string); ok {
		return s
	}
	arr, ok := raw.([]any)
	if !ok {
		return nil
	}
	out := make([]string, 0, len(arr))
	for _, v := range arr {
		if s, ok := v.(string); ok && s != "" {
			out = append(out, s)
		}
	}
	return out
}
