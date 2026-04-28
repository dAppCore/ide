package store

import (
	"context"
	"testing"

	core "dappco.re/go"
)

func TestRegister_Store_Good(t *testing.T) {
	result := Register(core.New())
	if !result.OK {
		t.Fatalf("expected store register success, got %#v", result.Value)
	}
}

func TestRegister_Store_Bad(t *testing.T) {
	svc := Register(core.New()).Value.(*Service)
	if svc.snapshot()["namespaces"] == nil {
		t.Fatal("expected snapshot payload")
	}
}

func TestRegister_Store_Ugly(t *testing.T) {
	svc := Register(core.New()).Value.(*Service)
	if !svc.OnShutdown(context.Background()).OK {
		t.Fatal("expected shutdown success")
	}
}
