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

func TestResolvers_Query_UglySecretRedaction(t *testing.T) {
	c := core.New()
	c.RegisterQuery(func(_ *core.Core, query core.Query) core.Result {
		if name, ok := query.(string); ok && name == "config.dump" {
			return core.Result{Value: map[string]any{
				"ide": map[string]any{
					"transport": map[string]any{"token": "secret-token"},
					"brain":     map[string]any{"key": "secret-key"},
					"nested":    []any{map[string]any{"api_key": "abc123"}},
				},
			}, OK: true}
		}
		return core.Result{}
	})
	out, _, err := New(config.Navigate{}, c).resolveSettings(context.Background(), Filter{})
	if err != nil {
		t.Fatalf("resolve settings: %v", err)
	}
	payload, ok := out.(Output)
	if !ok || !payload.Available {
		t.Fatalf("expected available payload, got %#v", out)
	}
	data, ok := payload.Data.(map[string]any)
	if !ok {
		t.Fatalf("expected map payload, got %#v", payload.Data)
	}
	ide, ok := data["ide"].(map[string]any)
	if !ok {
		t.Fatalf("expected nested ide payload, got %#v", data["ide"])
	}
	transport, ok := ide["transport"].(map[string]any)
	if !ok || transport["token"] != "[redacted]" {
		t.Fatalf("expected token redaction, got %#v", transport)
	}
	brain, ok := ide["brain"].(map[string]any)
	if !ok || brain["key"] != "[redacted]" {
		t.Fatalf("expected key redaction, got %#v", brain)
	}
	nested, ok := ide["nested"].([]any)
	if !ok || len(nested) != 1 {
		t.Fatalf("expected nested list redaction payload, got %#v", ide["nested"])
	}
	leaf, ok := nested[0].(map[string]any)
	if !ok || leaf["api_key"] != "[redacted]" {
		t.Fatalf("expected nested api key redaction, got %#v", nested[0])
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
