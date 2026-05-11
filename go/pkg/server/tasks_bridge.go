// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"time"

	"dappco.re/go/ide/pkg/tasks"
	"dappco.re/go/orm"
)

// tasks_* bridge tools — surfaces the local-first task system from
// pkg/tasks via MCP. The Mantis-shape panel calls these to render
// Cladius's locally-owned tasks (no remote API, no GitHub anti-bot
// exposure). The legacy mantis_* tools stay as the remote connector
// for tasks.lthn.sh enrichment.
//
// Tool shape mirrors mantis_list / mantis_view exactly so the existing
// frontend panel switches with a tool-name rename only — same JSON
// envelope, same field set per row.

// tasksIssueLite is the row shape the panel renders. Mirrors
// mantisIssueLite for drop-in panel compatibility, but ID is a string
// (local 12-char) rather than an integer.
type tasksIssueLite struct {
	ID         string `json:"id"`
	Summary    string `json:"summary"`
	Status     string `json:"status"`
	Project    string `json:"project"`
	Reporter   string `json:"reporter"`
	Handler    string `json:"handler"`
	Severity   string `json:"severity"`
	Resolution string `json:"resolution"`
	Created    string `json:"created_at"`
	Updated    string `json:"updated_at"`
}

// toolTasksList returns the local task list, optionally filtered by
// status. Mirrors toolMantisList's response envelope.
//
// Usage example:
//
//	raw := b.toolTasksList(ctx, map[string]any{"status": "open", "page_size": 30})
func (b *MCPBridge) toolTasksList(_ context.Context, params map[string]any) map[string]any {
	pageSize := paramInt(params, "page_size", 30)
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 30
	}
	page := paramInt(params, "page", 1)
	if page <= 0 {
		page = 1
	}
	filter := tasks.ListFilter{
		Limit:  pageSize,
		Offset: (page - 1) * pageSize,
	}
	if statusFilter := paramString(params, "status", ""); statusFilter != "" {
		filter.State = mantisStatusToTaskState(statusFilter)
	}
	if project := paramString(params, "project", ""); project != "" {
		filter.Project = project
	}
	r := tasks.List(b.Core(), filter)
	if !r.OK {
		return map[string]any{"ok": false, "error": r.Error()}
	}
	issues, ok := orm.Cast[[]tasks.Issue](r)
	if !ok {
		return map[string]any{"ok": false, "error": "cast []tasks.Issue failed"}
	}
	out := make([]tasksIssueLite, 0, len(issues))
	for _, issue := range issues {
		out = append(out, issueToLite(issue))
	}
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"issues":      out,
			"count":       len(out),
			"page":        page,
			"cache_hit":   false,
			"cache_age_s": 0,
		},
	}
}

// toolTasksView returns a single task by ID, with its notes.
//
// Usage example:
//
//	raw := b.toolTasksView(ctx, map[string]any{"id": "01ABC..."})
func (b *MCPBridge) toolTasksView(_ context.Context, params map[string]any) map[string]any {
	id := paramString(params, "id", "")
	if id == "" {
		return map[string]any{"ok": false, "error": "id required"}
	}
	r := tasks.Get(b.Core(), id)
	if !r.OK {
		return map[string]any{"ok": false, "error": r.Error(), "code": r.Code()}
	}
	issue, _, ok := orm.Detail[tasks.Issue](r)
	if !ok {
		return map[string]any{"ok": false, "error": "cast tasks.Issue failed"}
	}
	notesResult := tasks.ListNotes(b.Core(), id)
	notes := []map[string]any{}
	if notesResult.OK {
		notesList, _ := orm.Cast[[]tasks.Note](notesResult)
		for _, n := range notesList {
			notes = append(notes, map[string]any{
				"id":         n.ID,
				"reporter":   n.Author,
				"text":       n.Body,
				"created_at": n.CreatedAt.Format(time.RFC3339),
			})
		}
	}
	detail := issueToLite(issue)
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"id":          detail.ID,
			"summary":     detail.Summary,
			"description": issue.Description,
			"status":      detail.Status,
			"project":     detail.Project,
			"reporter":    detail.Reporter,
			"handler":     detail.Handler,
			"severity":    detail.Severity,
			"resolution":  detail.Resolution,
			"created":     detail.Created,
			"updated":     detail.Updated,
			"notes":       notes,
		},
	}
}

// toolTasksCreate creates a new local task.
//
// Usage example:
//
//	raw := b.toolTasksCreate(ctx, map[string]any{
//	    "project": "ide", "summary": "wire tasks panel",
//	})
func (b *MCPBridge) toolTasksCreate(_ context.Context, params map[string]any) map[string]any {
	input := tasks.CreateInput{
		Project:       paramString(params, "project", ""),
		Summary:       paramString(params, "summary", ""),
		Description:   paramString(params, "description", ""),
		Severity:      paramString(params, "severity", ""),
		Priority:      paramString(params, "priority", ""),
		Assignee:      paramString(params, "assignee", ""),
		Reporter:      paramString(params, "reporter", ""),
		Version:       paramString(params, "version", ""),
		TargetVersion: paramString(params, "target_version", ""),
	}
	r := tasks.Create(b.Core(), input)
	if !r.OK {
		return map[string]any{"ok": false, "error": r.Error()}
	}
	issue, _, ok := orm.Detail[tasks.Issue](r)
	if !ok {
		return map[string]any{"ok": false, "error": "cast tasks.Issue failed"}
	}
	return map[string]any{
		"ok":    true,
		"value": issueToLite(issue),
	}
}

// toolTasksAddNote appends a comment to a task.
//
// Usage example:
//
//	raw := b.toolTasksAddNote(ctx, map[string]any{
//	    "id": "01ABC", "body": "fixed in commit X", "author": "cladius",
//	})
func (b *MCPBridge) toolTasksAddNote(_ context.Context, params map[string]any) map[string]any {
	id := paramString(params, "id", "")
	body := paramString(params, "body", "")
	author := paramString(params, "author", "")
	r := tasks.AddNote(b.Core(), id, body, author)
	if !r.OK {
		return map[string]any{"ok": false, "error": r.Error()}
	}
	note, _, ok := orm.Detail[tasks.Note](r)
	if !ok {
		return map[string]any{"ok": false, "error": "cast tasks.Note failed"}
	}
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"id":         note.ID,
			"issue_id":   note.IssueID,
			"text":       note.Body,
			"reporter":   note.Author,
			"created_at": note.CreatedAt.Format(time.RFC3339),
		},
	}
}

// toolTasksClose transitions a task to done with the given resolution.
//
// Usage example:
//
//	raw := b.toolTasksClose(ctx, map[string]any{"id": "01ABC", "resolution": "fixed"})
func (b *MCPBridge) toolTasksClose(_ context.Context, params map[string]any) map[string]any {
	id := paramString(params, "id", "")
	resolution := paramString(params, "resolution", "")
	r := tasks.Close(b.Core(), id, resolution)
	if !r.OK {
		return map[string]any{"ok": false, "error": r.Error()}
	}
	issue, _, ok := orm.Detail[tasks.Issue](r)
	if !ok {
		return map[string]any{"ok": false, "error": "cast tasks.Issue failed"}
	}
	return map[string]any{
		"ok":    true,
		"value": issueToLite(issue),
	}
}

func issueToLite(issue tasks.Issue) tasksIssueLite {
	updated := ""
	if !issue.UpdatedAt.IsZero() {
		updated = issue.UpdatedAt.Format(time.RFC3339)
	}
	created := ""
	if !issue.CreatedAt.IsZero() {
		created = issue.CreatedAt.Format(time.RFC3339)
	}
	return tasksIssueLite{
		ID:         issue.ID,
		Summary:    issue.Summary,
		Status:     taskStateToMantisStatus(issue.State),
		Project:    issue.Project,
		Reporter:   issue.Reporter,
		Handler:    issue.Assignee,
		Severity:   issue.Severity,
		Resolution: issue.Resolution,
		Created:    created,
		Updated:    updated,
	}
}

// mantisStatusToTaskState maps the panel's status filter strings to
// local tasks state values. Keeps the panel's "status" filter UX
// unchanged when it switches from mantis_* to tasks_*.
func mantisStatusToTaskState(status string) string {
	switch status {
	case "new", "open":
		return tasks.StateOpen
	case "assigned", "in_progress":
		return tasks.StateInProgress
	case "resolved", "closed", "done":
		return tasks.StateDone
	case "cancelled":
		return tasks.StateCancelled
	default:
		return status
	}
}

// taskStateToMantisStatus is the reverse map for rendering.
func taskStateToMantisStatus(state string) string {
	switch state {
	case tasks.StateOpen:
		return "new"
	case tasks.StateInProgress:
		return "assigned"
	case tasks.StateDone:
		return "closed"
	case tasks.StateCancelled:
		return "cancelled"
	default:
		return state
	}
}
