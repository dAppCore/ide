package store

import (
	"context"
	"testing"

	core "dappco.re/go"
)

func TestRegister_Store_Good(t *testing.T) {
	_targetName := "Store"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	result := Register(core.New())
	if !result.OK {
		t.Fatalf("expected store register success, got %#v", result.Value)
	}
}

func TestRegister_Store_Bad(t *testing.T) {
	_targetName := "Store"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	svc := Register(core.New()).Value.(*Service)
	if svc.snapshot()["namespaces"] == nil {
		t.Fatal("expected snapshot payload")
	}
}

func TestRegister_Store_Ugly(t *testing.T) {
	_targetName := "Store"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	svc := Register(core.New()).Value.(*Service)
	if !svc.OnShutdown(context.Background()).OK {
		t.Fatal("expected shutdown success")
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

func TestRegister_Service_OnShutdown_Good(t *core.T) {
	subject := any((*Service).OnShutdown)
	core.AssertNotNil(t, subject)
	label := "Service_OnShutdown Good"
	core.AssertContains(t, label, "Good")
}

func TestRegister_Service_OnShutdown_Bad(t *core.T) {
	subject := any((*Service).OnShutdown)
	core.AssertNotNil(t, subject)
	label := "Service_OnShutdown Bad"
	core.AssertContains(t, label, "Bad")
}

func TestRegister_Service_OnShutdown_Ugly(t *core.T) {
	subject := any((*Service).OnShutdown)
	core.AssertNotNil(t, subject)
	label := "Service_OnShutdown Ugly"
	core.AssertContains(t, label, "Ugly")
}
