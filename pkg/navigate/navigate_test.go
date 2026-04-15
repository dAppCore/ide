package navigate

import (
	"context"
	"testing"

	core "dappco.re/go/core"

	"dappco.re/go/core/ide/pkg/config"
)

func TestNavigate_Resolve_Good(t *testing.T) {
	c := core.New()
	c.RegisterQuery(func(_ *core.Core, query core.Query) core.Result {
		if name, ok := query.(string); ok && name == "config.dump" {
			return core.Result{Value: map[string]any{"config": map[string]any{"ide": true}}, OK: true}
		}
		return core.Result{}
	})
	subsystem := New(config.Navigate{}, c)
	out, err := subsystem.resolve(context.Background(), Input{Route: "core://settings"})
	if err != nil {
		t.Fatalf("navigate: %v", err)
	}
	if !out.Available {
		t.Fatalf("expected route to resolve, got %#v", out)
	}
}

func TestNavigate_Resolve_Bad(t *testing.T) {
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
	subsystem := New(config.Navigate{}, core.New())
	out, err := subsystem.resolve(context.Background(), Input{Route: "core://wallet"})
	if err != nil {
		t.Fatalf("navigate: %v", err)
	}
	if out.Available || out.Data == nil {
		t.Fatalf("expected fallback unavailable payload, got %#v", out)
	}
}
