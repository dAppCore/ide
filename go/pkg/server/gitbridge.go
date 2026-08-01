// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"

	core "dappco.re/go"
)

// gitBridge — typed wails wrapper over MCPBridge git_* tools. /dev/git
// is the source-control surface; these are called every time the user
// stages, diffs, commits, switches branches.
type gitBridge struct {
	core *core.Core
}

type GitPathInput struct {
	Path string `json:"path"`
}

type GitBranchOutput struct {
	OK     bool   `json:"ok"`
	Branch string `json:"branch,omitempty"`
	Ahead  int    `json:"ahead,omitempty"`
	Behind int    `json:"behind,omitempty"`
	Error  string `json:"error,omitempty"`
}

type GitEntry struct {
	Path           string `json:"path"`
	IndexStatus    string `json:"index_status,omitempty"`
	WorktreeStatus string `json:"worktree_status,omitempty"`
	Staged         bool   `json:"staged,omitempty"`
	Unstaged       bool   `json:"unstaged,omitempty"`
	Untracked      bool   `json:"untracked,omitempty"`
}

type GitStatusOutput struct {
	OK      bool       `json:"ok"`
	Entries []GitEntry `json:"entries,omitempty"`
	Error   string     `json:"error,omitempty"`
}

type GitDiffInput struct {
	Path   string `json:"path"`
	File   string `json:"file"`
	Staged bool   `json:"staged,omitempty"`
}

type GitDiffOutput struct {
	OK    bool   `json:"ok"`
	Diff  string `json:"diff,omitempty"`
	Error string `json:"error,omitempty"`
}

type GitAddInput struct {
	Path  string   `json:"path"`
	Files []string `json:"files,omitempty"`
	All   bool     `json:"all,omitempty"`
}

type GitAddOutput struct {
	OK    bool   `json:"ok"`
	Error string `json:"error,omitempty"`
}

type GitUnstageInput struct {
	Path  string   `json:"path"`
	Files []string `json:"files"`
}

type GitCommitInput struct {
	Path    string `json:"path"`
	Message string `json:"message"`
}

type GitCommitOutput struct {
	OK    bool   `json:"ok"`
	SHA   string `json:"sha,omitempty"`
	Error string `json:"error,omitempty"`
}

func (b *gitBridge) mcp() *MCPBridge {
	if b == nil || b.core == nil {
		return nil
	}
	s, _ := core.ServiceFor[*MCPBridge](b.core, "mcp_bridge")
	return s
}

// decodeOK extracts the canonical {ok, error} envelope.
func decodeOK(raw map[string]any) (bool, string) {
	ok, _ := raw["ok"].(bool)
	errStr, _ := raw["error"].(string)
	return ok, errStr
}

func (b *gitBridge) Branch(ctx context.Context, input GitPathInput) (GitBranchOutput, error) {
	m := b.mcp()
	if m == nil {
		return GitBranchOutput{}, core.E("ide.server.Git.Branch", "mcp bridge unavailable", nil)
	}
	_ = ctx
	raw := m.toolGitBranch(map[string]any{"path": input.Path})
	out := GitBranchOutput{}
	out.OK, out.Error = decodeOK(raw)
	if s, _ := raw["branch"].(string); s != "" {
		out.Branch = s
	}
	if n, ok := raw["ahead"].(int); ok {
		out.Ahead = n
	}
	if n, ok := raw["behind"].(int); ok {
		out.Behind = n
	}
	if n, ok := raw["ahead"].(float64); ok {
		out.Ahead = int(n)
	}
	if n, ok := raw["behind"].(float64); ok {
		out.Behind = int(n)
	}
	return out, nil
}

func (b *gitBridge) Status(ctx context.Context, input GitPathInput) (GitStatusOutput, error) {
	m := b.mcp()
	if m == nil {
		return GitStatusOutput{}, core.E("ide.server.Git.Status", "mcp bridge unavailable", nil)
	}
	_ = ctx
	raw := m.toolGitStatus(map[string]any{"path": input.Path})
	out := GitStatusOutput{}
	out.OK, out.Error = decodeOK(raw)
	if list, ok := raw["entries"].([]any); ok {
		for _, e := range list {
			em, ok := e.(map[string]any)
			if !ok {
				continue
			}
			entry := GitEntry{}
			if s, ok := em["path"].(string); ok {
				entry.Path = s
			}
			if s, ok := em["index_status"].(string); ok {
				entry.IndexStatus = s
			}
			if s, ok := em["worktree_status"].(string); ok {
				entry.WorktreeStatus = s
			}
			if v, ok := em["staged"].(bool); ok {
				entry.Staged = v
			}
			if v, ok := em["unstaged"].(bool); ok {
				entry.Unstaged = v
			}
			if v, ok := em["untracked"].(bool); ok {
				entry.Untracked = v
			}
			out.Entries = append(out.Entries, entry)
		}
	}
	return out, nil
}

func (b *gitBridge) Diff(ctx context.Context, input GitDiffInput) (GitDiffOutput, error) {
	m := b.mcp()
	if m == nil {
		return GitDiffOutput{}, core.E("ide.server.Git.Diff", "mcp bridge unavailable", nil)
	}
	_ = ctx
	raw := m.toolGitDiff( map[string]any{
		"path":   input.Path,
		"file":   input.File,
		"staged": input.Staged,
	})
	out := GitDiffOutput{}
	out.OK, out.Error = decodeOK(raw)
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		value = raw
	}
	if d, _ := value["diff"].(string); d != "" {
		out.Diff = d
	}
	return out, nil
}

func (b *gitBridge) Add(ctx context.Context, input GitAddInput) (GitAddOutput, error) {
	m := b.mcp()
	if m == nil {
		return GitAddOutput{}, core.E("ide.server.Git.Add", "mcp bridge unavailable", nil)
	}
	params := map[string]any{
		"path": input.Path,
	}
	if input.All {
		params["all"] = true
	}
	if len(input.Files) > 0 {
		params["files"] = input.Files
	}
	_ = ctx
	raw := m.toolGitAdd( params)
	out := GitAddOutput{}
	out.OK, out.Error = decodeOK(raw)
	return out, nil
}

func (b *gitBridge) Unstage(ctx context.Context, input GitUnstageInput) (GitAddOutput, error) {
	m := b.mcp()
	if m == nil {
		return GitAddOutput{}, core.E("ide.server.Git.Unstage", "mcp bridge unavailable", nil)
	}
	_ = ctx
	raw := m.toolGitUnstage( map[string]any{
		"path":  input.Path,
		"files": input.Files,
	})
	out := GitAddOutput{}
	out.OK, out.Error = decodeOK(raw)
	return out, nil
}

func (b *gitBridge) Commit(ctx context.Context, input GitCommitInput) (GitCommitOutput, error) {
	m := b.mcp()
	if m == nil {
		return GitCommitOutput{}, core.E("ide.server.Git.Commit", "mcp bridge unavailable", nil)
	}
	_ = ctx
	raw := m.toolGitCommit( map[string]any{
		"path":    input.Path,
		"message": input.Message,
	})
	out := GitCommitOutput{}
	out.OK, out.Error = decodeOK(raw)
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		value = raw
	}
	if s, _ := value["sha"].(string); s != "" {
		out.SHA = s
	}
	return out, nil
}
