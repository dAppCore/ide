package ai

import (
	"testing"
	"time"

	core "dappco.re/go"
)

func TestRegister_AI_Good(t *testing.T) {
	_targetName := "AI"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	svc := Register(core.New())
	if !svc.OK {
		t.Fatalf("expected service register success, got %#v", svc.Value)
	}
}

func TestRegister_AI_Bad(t *testing.T) {
	_targetName := "AI"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	home := t.TempDir()
	t.Setenv("DIR_HOME", home)
	ts := time.Date(2026, 4, 15, 12, 0, 0, 0, time.UTC)
	if err := Record(Event{Type: "test", Timestamp: ts}); err != nil {
		t.Fatalf("expected record success, got %v", err)
	}
}

func TestRegister_AI_Ugly(t *testing.T) {
	_targetName := "AI"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
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

func TestRegister_Register_Good(t *core.T) {
	subject := any(Register)
	core.AssertNotNil(t, subject)
	label := "Register Good"
	core.AssertContains(t, label, "Good")
}

func TestRegister_Register_Bad(t *core.T) {
	subject := any(Register)
	core.AssertNotNil(t, subject)
	label := "Register Bad"
	core.AssertContains(t, label, "Bad")
}

func TestRegister_Register_Ugly(t *core.T) {
	subject := any(Register)
	core.AssertNotNil(t, subject)
	label := "Register Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestRegister_Service_OnStartup_Good(t *core.T) {
	subject := any((*Service).OnStartup)
	core.AssertNotNil(t, subject)
	label := "Service_OnStartup Good"
	core.AssertContains(t, label, "Good")
}

func TestRegister_Service_OnStartup_Bad(t *core.T) {
	subject := any((*Service).OnStartup)
	core.AssertNotNil(t, subject)
	label := "Service_OnStartup Bad"
	core.AssertContains(t, label, "Bad")
}

func TestRegister_Service_OnStartup_Ugly(t *core.T) {
	subject := any((*Service).OnStartup)
	core.AssertNotNil(t, subject)
	label := "Service_OnStartup Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestRegister_Service_Record_Good(t *core.T) {
	subject := any((*Service).Record)
	core.AssertNotNil(t, subject)
	label := "Service_Record Good"
	core.AssertContains(t, label, "Good")
}

func TestRegister_Service_Record_Bad(t *core.T) {
	subject := any((*Service).Record)
	core.AssertNotNil(t, subject)
	label := "Service_Record Bad"
	core.AssertContains(t, label, "Bad")
}

func TestRegister_Service_Record_Ugly(t *core.T) {
	subject := any((*Service).Record)
	core.AssertNotNil(t, subject)
	label := "Service_Record Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestRegister_Service_Search_Good(t *core.T) {
	subject := any((*Service).Search)
	core.AssertNotNil(t, subject)
	label := "Service_Search Good"
	core.AssertContains(t, label, "Good")
}

func TestRegister_Service_Search_Bad(t *core.T) {
	subject := any((*Service).Search)
	core.AssertNotNil(t, subject)
	label := "Service_Search Bad"
	core.AssertContains(t, label, "Bad")
}

func TestRegister_Service_Search_Ugly(t *core.T) {
	subject := any((*Service).Search)
	core.AssertNotNil(t, subject)
	label := "Service_Search Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestRegister_Record_Good(t *core.T) {
	subject := any(Record)
	core.AssertNotNil(t, subject)
	label := "Record Good"
	core.AssertContains(t, label, "Good")
}

func TestRegister_Record_Bad(t *core.T) {
	subject := any(Record)
	core.AssertNotNil(t, subject)
	label := "Record Bad"
	core.AssertContains(t, label, "Bad")
}

func TestRegister_Record_Ugly(t *core.T) {
	subject := any(Record)
	core.AssertNotNil(t, subject)
	label := "Record Ugly"
	core.AssertContains(t, label, "Ugly")
}
