// SPDX-License-Identifier: EUPL-1.2

package tasks_test

import (
	"testing"

	core "dappco.re/go"
	"dappco.re/go/ide/pkg/tasks"
	"dappco.re/go/orm"
)

// newTestCore returns a *core.Core with orm registered + a fresh Memium
// mounted under "default" + the tasks schemas registered. Tests use this
// to exercise the package end-to-end without any DuckDB / filesystem.
func newTestCore(t *testing.T) *core.Core {
	t.Helper()
	c := core.New()
	if r := orm.Register(c); !r.OK {
		t.Fatalf("orm.Register: %s", r.Error())
	}
	mem := orm.NewMemium()
	if r := orm.Mount(c, "default", mem); !r.OK {
		t.Fatalf("orm.Mount: %s", r.Error())
	}
	for _, schema := range tasks.Schemas() {
		if r := orm.RegisterSchema(c, schema); !r.OK {
			t.Fatalf("orm.RegisterSchema: %s", r.Error())
		}
		mem.RegisterTable(schema.Name, schema)
	}
	return c
}

func TestTasks_Create_Good_PopulatesDefaults(t *testing.T) {
	c := newTestCore(t)

	r := tasks.Create(c, tasks.CreateInput{
		Project: "ide",
		Summary: "wire tasks panel",
	})
	if !r.OK {
		t.Fatalf("Create: %s", r.Error())
	}
	issue, _, ok := orm.Detail[tasks.Issue](r)
	if !ok {
		t.Fatal("Detail cast failed")
	}
	if issue.ID == "" {
		t.Error("expected non-empty ID")
	}
	if issue.State != tasks.StateOpen {
		t.Errorf("expected state=%q, got %q", tasks.StateOpen, issue.State)
	}
	if issue.Severity != tasks.SeverityMinor {
		t.Errorf("expected severity=%q, got %q", tasks.SeverityMinor, issue.Severity)
	}
	if issue.Priority != tasks.PriorityNormal {
		t.Errorf("expected priority=%q, got %q", tasks.PriorityNormal, issue.Priority)
	}
	if issue.CreatedAt.IsZero() {
		t.Error("expected non-zero CreatedAt")
	}
}

func TestTasks_Create_Bad_MissingProject(t *testing.T) {
	c := newTestCore(t)

	r := tasks.Create(c, tasks.CreateInput{Summary: "no project"})
	if r.OK {
		t.Fatal("expected failure when project is empty")
	}
}

func TestTasks_Create_Bad_MissingSummary(t *testing.T) {
	c := newTestCore(t)

	r := tasks.Create(c, tasks.CreateInput{Project: "ide"})
	if r.OK {
		t.Fatal("expected failure when summary is empty")
	}
}

func TestTasks_Get_Good_RoundTrip(t *testing.T) {
	c := newTestCore(t)
	created := tasks.Create(c, tasks.CreateInput{Project: "ide", Summary: "round trip"})
	if !created.OK {
		t.Fatalf("Create: %s", created.Error())
	}
	createdIssue, _, _ := orm.Detail[tasks.Issue](created)

	r := tasks.Get(c, createdIssue.ID)
	if !r.OK {
		t.Fatalf("Get: %s", r.Error())
	}
	issue, _, ok := orm.Detail[tasks.Issue](r)
	if !ok {
		t.Fatal("Detail cast failed")
	}
	if issue.Summary != "round trip" {
		t.Errorf("expected summary=%q, got %q", "round trip", issue.Summary)
	}
}

func TestTasks_Get_Bad_NotFound(t *testing.T) {
	c := newTestCore(t)

	r := tasks.Get(c, "missing-id")
	if r.OK {
		t.Fatal("expected not-found failure")
	}
}

func TestTasks_List_Good_FiltersByProject(t *testing.T) {
	c := newTestCore(t)
	tasks.Create(c, tasks.CreateInput{Project: "ide", Summary: "ide one"})
	tasks.Create(c, tasks.CreateInput{Project: "ide", Summary: "ide two"})
	tasks.Create(c, tasks.CreateInput{Project: "store", Summary: "store one"})

	r := tasks.List(c, tasks.ListFilter{Project: "ide"})
	if !r.OK {
		t.Fatalf("List: %s", r.Error())
	}
	issues, ok := orm.Cast[[]tasks.Issue](r)
	if !ok {
		t.Fatal("Cast to []Issue failed")
	}
	if len(issues) != 2 {
		t.Errorf("expected 2 issues, got %d", len(issues))
	}
	for _, issue := range issues {
		if issue.Project != "ide" {
			t.Errorf("expected project=ide, got %q", issue.Project)
		}
	}
}

func TestTasks_Update_Good_StateTransitionSetsClosedAt(t *testing.T) {
	c := newTestCore(t)
	created := tasks.Create(c, tasks.CreateInput{Project: "ide", Summary: "to be closed"})
	if !created.OK {
		t.Fatalf("Create: %s", created.Error())
	}
	createdIssue, _, _ := orm.Detail[tasks.Issue](created)

	r := tasks.Update(c, createdIssue.ID, tasks.UpdateInput{State: tasks.StateDone})
	if !r.OK {
		t.Fatalf("Update: %s", r.Error())
	}
	updated, _, _ := orm.Detail[tasks.Issue](r)
	if updated.State != tasks.StateDone {
		t.Errorf("expected state=%q, got %q", tasks.StateDone, updated.State)
	}
	if updated.ClosedAt.IsZero() {
		t.Error("expected ClosedAt set on state=done")
	}
}

func TestTasks_Close_Good_SetsResolution(t *testing.T) {
	c := newTestCore(t)
	created := tasks.Create(c, tasks.CreateInput{Project: "ide", Summary: "to close"})
	if !created.OK {
		t.Fatalf("Create: %s", created.Error())
	}
	createdIssue, _, _ := orm.Detail[tasks.Issue](created)

	r := tasks.Close(c, createdIssue.ID, "fixed")
	if !r.OK {
		t.Fatalf("Close: %s", r.Error())
	}
	closed, _, _ := orm.Detail[tasks.Issue](r)
	if closed.State != tasks.StateDone {
		t.Errorf("expected state=done, got %q", closed.State)
	}
	if closed.Resolution != "fixed" {
		t.Errorf("expected resolution=fixed, got %q", closed.Resolution)
	}
}

func TestTasks_AddNote_Good_PersistsAndLists(t *testing.T) {
	c := newTestCore(t)
	created := tasks.Create(c, tasks.CreateInput{Project: "ide", Summary: "note me"})
	createdIssue, _, _ := orm.Detail[tasks.Issue](created)

	if r := tasks.AddNote(c, createdIssue.ID, "first comment", "cladius"); !r.OK {
		t.Fatalf("AddNote: %s", r.Error())
	}
	if r := tasks.AddNote(c, createdIssue.ID, "second comment", "snider"); !r.OK {
		t.Fatalf("AddNote: %s", r.Error())
	}

	r := tasks.ListNotes(c, createdIssue.ID)
	if !r.OK {
		t.Fatalf("ListNotes: %s", r.Error())
	}
	notes, ok := orm.Cast[[]tasks.Note](r)
	if !ok {
		t.Fatal("Cast to []Note failed")
	}
	if len(notes) != 2 {
		t.Errorf("expected 2 notes, got %d", len(notes))
	}
}

func TestTasks_AddNote_Bad_EmptyBody(t *testing.T) {
	c := newTestCore(t)

	r := tasks.AddNote(c, "any-id", "", "cladius")
	if r.OK {
		t.Fatal("expected failure on empty body")
	}
}
