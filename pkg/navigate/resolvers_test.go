package navigate

import (
	"context"
	"testing"

	core "dappco.re/go/core"

	"dappco.re/go/core/ide/pkg/config"
)

func TestResolvers_Query_Good(t *testing.T) {
	c := core.New()
	c.RegisterQuery(func(_ *core.Core, query core.Query) core.Result {
		if name, ok := query.(string); ok && name == "config.dump" {
			return core.Result{Value: map[string]any{"config": true}, OK: true}
		}
		return core.Result{}
	})
	out, schema, err := New(config.Navigate{}, c).resolveSettings(context.Background(), Filter{})
	if err != nil || out == nil || schema == nil {
		t.Fatalf("unexpected resolver result out=%#v schema=%#v err=%v", out, schema, err)
	}
}

func TestResolvers_Query_Bad(t *testing.T) {
	out, _, err := New(config.Navigate{}, core.New()).resolveWallet(context.Background(), Filter{})
	if err != nil {
		t.Fatalf("expected unavailable payload, got %v", err)
	}
	output := out.(Output)
	if output.Available {
		t.Fatalf("expected unavailable payload, got %#v", output)
	}
}

func TestResolvers_Query_Ugly(t *testing.T) {
	if got := filterString(Filter{Values: map[string]any{"namespace": " demo "}}, "namespace"); got != "demo" {
		t.Fatalf("expected trimmed filter value, got %q", got)
	}
}
