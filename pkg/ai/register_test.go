package ai

import (
	"testing"
	"time"

	core "dappco.re/go/core"
)

func TestRegister_AI_Good(t *testing.T) {
	svc := Register(core.New())
	if !svc.OK {
		t.Fatalf("expected service register success, got %#v", svc.Value)
	}
}

func TestRegister_AI_Bad(t *testing.T) {
	home := t.TempDir()
	t.Setenv("DIR_HOME", home)
	ts := time.Date(2026, 4, 15, 12, 0, 0, 0, time.UTC)
	if err := Record(Event{Type: "test", Timestamp: ts}); err != nil {
		t.Fatalf("expected record success, got %v", err)
	}
}

func TestRegister_AI_Ugly(t *testing.T) {
	home := t.TempDir()
	t.Setenv("DIR_HOME", home)
	ts := time.Date(2026, 4, 15, 12, 0, 0, 0, time.UTC)
	if err := Record(Event{Type: "test", Timestamp: ts}); err != nil {
		t.Fatalf("record: %v", err)
	}
	if err := Record(Event{Type: "test-2", Timestamp: ts}); err != nil {
		t.Fatalf("second record: %v", err)
	}
}
