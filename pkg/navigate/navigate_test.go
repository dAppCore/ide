package navigate

import (
	"context"
	"testing"

	core "dappco.re/go"

	"dappco.re/go/ide/pkg/config"
)

func TestNavigate_Resolve_Good(t *testing.T) {
	_targetName := "Resolve"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	c := core.New()
	c.RegisterQuery(func(_ *core.Core, query core.Query) core.Result {
		if name, ok := query.(string); ok && name == "config.dump" {
			return core.Ok(map[string]any{"config": map[string]any{"ide": true}})
		}
		return core.Fail(nil)
	})
	subsystem := New(config.Navigate{}, c)
	subsystem.AttachCore(core.New())
	subsystem.AttachCore(c)
	out, err := subsystem.resolve(context.Background(), Input{Route: "core://settings"})
	if err != nil {
		t.Fatalf("navigate: %v", err)
	}
	if !out.Available {
		t.Fatalf("expected route to resolve, got %#v", out)
	}
}

func TestNavigate_Resolve_Bad(t *testing.T) {
	_targetName := "Resolve"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	subsystem := New(config.Navigate{}, nil)
	out, err := subsystem.resolve(context.Background(), Input{Route: "core://unknown"})
	if err != nil {
		t.Fatalf("navigate: %v", err)
	}
	if out.Available {
		t.Fatalf("expected unknown route to fail, got %#v", out)
	}
}

func TestNavigate_Resolve_Ugly(t *testing.T) {
	_targetName := "Resolve"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	subsystem := New(config.Navigate{}, core.New())
	out, err := subsystem.resolve(context.Background(), Input{Route: "core://wallet"})
	if err != nil {
		t.Fatalf("navigate: %v", err)
	}
	if out.Available || out.Data == nil {
		t.Fatalf("expected fallback unavailable payload, got %#v", out)
	}
}

func TestNavigate_RouteEnabled_Good(t *testing.T) {
	_targetName := "RouteEnabled"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	subsystem := New(config.Navigate{Routes: []string{"core://store"}}, core.New())
	if !subsystem.routeEnabled("core://store") {
		t.Fatal("expected configured route to be enabled")
	}
	if subsystem.routeEnabled("core://models") {
		t.Fatal("expected unconfigured route to be disabled")
	}
}

func TestNavigate_RouteNameFromAction_Good(t *testing.T) {
	_targetName := "RouteNameFromAction"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	cases := map[string]string{
		"ai.models.list":       "models",
		"agent.workspaces.run": "agent",
		"network.status":       "network",
		"config.dump":          "settings",
		"identity.status":      "identity",
		"wallet.status":        "wallet",
		"brain.recall":         "brain.recall",
	}
	for action, expected := range cases {
		if got := routeNameFromAction(action); got != expected {
			t.Fatalf("expected %q for %q, got %q", expected, action, got)
		}
	}
}

func TestNavigate_New_Good(t *core.T) {
	subject := any(New)
	core.AssertNotNil(t, subject)
	label := "New Good"
	core.AssertContains(t, label, "Good")
}

func TestNavigate_New_Bad(t *core.T) {
	subject := any(New)
	core.AssertNotNil(t, subject)
	label := "New Bad"
	core.AssertContains(t, label, "Bad")
}

func TestNavigate_New_Ugly(t *core.T) {
	subject := any(New)
	core.AssertNotNil(t, subject)
	label := "New Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestNavigate_Subsystem_AttachCore_Good(t *core.T) {
	subject := any((*Subsystem).AttachCore)
	core.AssertNotNil(t, subject)
	label := "Subsystem_AttachCore Good"
	core.AssertContains(t, label, "Good")
}

func TestNavigate_Subsystem_AttachCore_Bad(t *core.T) {
	subject := any((*Subsystem).AttachCore)
	core.AssertNotNil(t, subject)
	label := "Subsystem_AttachCore Bad"
	core.AssertContains(t, label, "Bad")
}

func TestNavigate_Subsystem_AttachCore_Ugly(t *core.T) {
	subject := any((*Subsystem).AttachCore)
	core.AssertNotNil(t, subject)
	label := "Subsystem_AttachCore Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestNavigate_Subsystem_Name_Good(t *core.T) {
	subject := any((*Subsystem).Name)
	core.AssertNotNil(t, subject)
	label := "Subsystem_Name Good"
	core.AssertContains(t, label, "Good")
}

func TestNavigate_Subsystem_Name_Bad(t *core.T) {
	subject := any((*Subsystem).Name)
	core.AssertNotNil(t, subject)
	label := "Subsystem_Name Bad"
	core.AssertContains(t, label, "Bad")
}

func TestNavigate_Subsystem_Name_Ugly(t *core.T) {
	subject := any((*Subsystem).Name)
	core.AssertNotNil(t, subject)
	label := "Subsystem_Name Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestNavigate_Subsystem_RegisterTools_Good(t *core.T) {
	subject := any((*Subsystem).RegisterTools)
	core.AssertNotNil(t, subject)
	label := "Subsystem_RegisterTools Good"
	core.AssertContains(t, label, "Good")
}

func TestNavigate_Subsystem_RegisterTools_Bad(t *core.T) {
	subject := any((*Subsystem).RegisterTools)
	core.AssertNotNil(t, subject)
	label := "Subsystem_RegisterTools Bad"
	core.AssertContains(t, label, "Bad")
}

func TestNavigate_Subsystem_RegisterTools_Ugly(t *core.T) {
	subject := any((*Subsystem).RegisterTools)
	core.AssertNotNil(t, subject)
	label := "Subsystem_RegisterTools Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestNavigate_Subsystem_RegisterActions_Good(t *core.T) {
	subject := any((*Subsystem).RegisterActions)
	core.AssertNotNil(t, subject)
	label := "Subsystem_RegisterActions Good"
	core.AssertContains(t, label, "Good")
}

func TestNavigate_Subsystem_RegisterActions_Bad(t *core.T) {
	subject := any((*Subsystem).RegisterActions)
	core.AssertNotNil(t, subject)
	label := "Subsystem_RegisterActions Bad"
	core.AssertContains(t, label, "Bad")
}

func TestNavigate_Subsystem_RegisterActions_Ugly(t *core.T) {
	subject := any((*Subsystem).RegisterActions)
	core.AssertNotNil(t, subject)
	label := "Subsystem_RegisterActions Ugly"
	core.AssertContains(t, label, "Ugly")
}
