package subagent

import (
	"strconv"
	"testing"
	"time"

	storelib "dappco.re/go/store"

	"dappco.re/go/ide/pkg/config"
)

func TestHistory_Load_Good(t *testing.T) {
	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	defer storeInstance.Close()

	first := NewWithHistory(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "", storeInstance)
	first.appendEvent("ws-1", Event{Type: "progress", Message: "one", CreatedAt: time.Unix(1, 0).UTC()})
	first.bindAgenticWorkspace("ws-1", "agentic-ws")

	second := NewWithHistory(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "", storeInstance)
	events := second.collectEvents("ws-1", 0)
	if len(events) != 1 || events[0].Message != "one" || events[0].Cursor != 1 {
		t.Fatalf("expected restored event history, got %#v", events)
	}
	if got := second.agenticWorkspace("ws-1").Name; got != "agentic-ws" {
		t.Fatalf("expected restored agentic binding, got %q", got)
	}

	second.appendEvent("ws-1", Event{Type: "progress", Message: "two", CreatedAt: time.Unix(2, 0).UTC()})
	events = second.collectEvents("ws-1", 0)
	if len(events) != 2 || events[1].Cursor != 2 {
		t.Fatalf("expected cursor to continue after restore, got %#v", events)
	}
}

func TestHistory_Load_Bad(t *testing.T) {
	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	defer storeInstance.Close()

	if err := storeInstance.Set(historyEventsGroup("ws-1"), historyEventKey(1), "{"); err != nil {
		t.Fatalf("seed malformed event: %v", err)
	}
	if err := storeInstance.Set(historyWorkspaceGroup, "ws-1", "{"); err != nil {
		t.Fatalf("seed malformed workspace: %v", err)
	}

	subsystem := NewWithHistory(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "", storeInstance)
	if got := subsystem.collectEvents("ws-1", 0); len(got) != 0 {
		t.Fatalf("expected malformed persisted event to be ignored, got %#v", got)
	}
	if got := subsystem.agenticWorkspace("ws-1").Name; got != "" {
		t.Fatalf("expected malformed agentic binding to be ignored, got %q", got)
	}
}

func TestHistory_Load_UglyDeletesPrunedWorkspace(t *testing.T) {
	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	defer storeInstance.Close()

	subsystem := NewWithHistory(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "", storeInstance)
	subsystem.bindAgenticWorkspace("ws-0", "agentic-ws-0")
	base := time.Unix(100, 0).UTC()
	for i := 0; i < maxTrackedWorkspaces+1; i++ {
		workspaceID := "ws-" + strconv.Itoa(i)
		subsystem.appendEvent(workspaceID, Event{Type: "status", Message: "completed", CreatedAt: base.Add(time.Duration(i) * time.Second)})
	}

	restored := NewWithHistory(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "", storeInstance)
	if got := restored.collectEvents("ws-0", 0); len(got) != 0 {
		t.Fatalf("expected pruned workspace to stay deleted after restore, got %#v", got)
	}
	if got := restored.agenticWorkspace("ws-0").Name; got != "" {
		t.Fatalf("expected pruned agentic binding to stay deleted, got %q", got)
	}
	if len(restored.events) != maxTrackedWorkspaces {
		t.Fatalf("expected restored workspace history cap %d, got %d", maxTrackedWorkspaces, len(restored.events))
	}
}

func TestHistory_Save_UglyDeletesOverflowEvents(t *testing.T) {
	storeInstance, err := storelib.New(":memory:")
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	defer storeInstance.Close()

	subsystem := NewWithHistory(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "", storeInstance)
	base := time.Unix(200, 0).UTC()
	for i := 0; i < maxEventsPerWorkspace+1; i++ {
		subsystem.appendEvent("ws-1", Event{Type: "progress", Message: "event-" + strconv.Itoa(i), CreatedAt: base.Add(time.Duration(i) * time.Second)})
	}

	if _, err := storeInstance.Get(historyEventsGroup("ws-1"), historyEventKey(1)); err == nil {
		t.Fatal("expected overflow event to be deleted from persistent history")
	}
	restored := NewWithHistory(config.IDEConfig{}.WithDefaults().Ide.Subagent, nil, "", storeInstance)
	events := restored.collectEvents("ws-1", 0)
	if len(events) != maxEventsPerWorkspace || events[0].Message != "event-1" {
		t.Fatalf("expected bounded restored event history, got len=%d first=%#v", len(events), events[0])
	}
}
