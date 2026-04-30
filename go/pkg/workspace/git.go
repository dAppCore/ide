package workspace

import (
	"context"

	core "dappco.re/go"
	"dappco.re/go/process"
)

func gitStatus(
	ctx context.Context,
	processService *process.Service,
	root string,
) (GitStatus, error) {
	if processService == nil {
		return GitStatus{}, core.E("ide.workspace.gitStatus", "process service is nil", nil)
	}
	result := processService.Run(ctx, "git", "-C", root, "status", "--short", "--branch", "--untracked-files=all")
	if !result.OK {
		if err, ok := result.Value.(error); ok {
			return GitStatus{}, core.E("ide.workspace.gitStatus", "git status", err)
		}
		return GitStatus{}, core.E("ide.workspace.gitStatus", "git status", nil)
	}
	output, ok := result.Value.(string)
	if !ok {
		return GitStatus{}, core.E("ide.workspace.gitStatus", "git status", nil)
	}
	lines := core.Split(core.Trim(output), "\n")
	status := GitStatus{Clean: true}
	for index, line := range lines {
		line = core.Trim(line)
		if line == "" {
			continue
		}
		if index == 0 && core.HasPrefix(line, "##") {
			status.RawHeader = line
			status.Branch = parseBranch(line)
			continue
		}
		status.Clean = false
		change := parseChange(line)
		status.Changes = append(status.Changes, change)
		if change.Code == "??" {
			status.ChangeCounts.Untracked++
			continue
		}
		if len(change.Code) > 0 && change.Code[0] != ' ' {
			status.ChangeCounts.Staged++
		}
		if len(change.Code) > 1 && change.Code[1] != ' ' {
			status.ChangeCounts.Unstaged++
		}
	}
	return status, nil
}

func parseBranch(line string) string {
	trimmed := core.TrimPrefix(line, "##")
	trimmed = core.Trim(trimmed)
	switch {
	case trimmed == "HEAD (no branch)":
		return "HEAD"
	case core.HasPrefix(trimmed, "HEAD detached at "):
		return core.TrimPrefix(trimmed, "HEAD detached at ")
	}
	parts := core.Split(trimmed, "...")
	return core.Trim(parts[0])
}

func parseChange(line string) GitChange {
	if len(line) < 3 {
		return GitChange{Code: core.Trim(line)}
	}
	return GitChange{
		Code: line[:2],
		Path: core.Trim(line[3:]),
	}
}
