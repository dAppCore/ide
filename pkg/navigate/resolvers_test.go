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
					"identity":  map[string]any{"privateKey": "camel-secret"},
					"nested":    []any{map[string]any{"api_key": "abc123"}},
					"flags":     []any{"--token=secret-token", "--safe=value", "Authorization: Bearer secret", "https://example.com/callback?api_key=secret"},
					"urls":      []any{"https://user:pass@example.com/path", "https://example.com/path?token=secret"},
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
	identity, ok := ide["identity"].(map[string]any)
	if !ok || identity["privateKey"] != "[redacted]" {
		t.Fatalf("expected camelCase private key redaction, got %#v", identity)
	}
	nested, ok := ide["nested"].([]any)
	if !ok || len(nested) != 1 {
		t.Fatalf("expected nested list redaction payload, got %#v", ide["nested"])
	}
	leaf, ok := nested[0].(map[string]any)
	if !ok || leaf["api_key"] != "[redacted]" {
		t.Fatalf("expected nested api key redaction, got %#v", nested[0])
	}
	flags, ok := ide["flags"].([]any)
	if !ok || len(flags) != 4 {
		t.Fatalf("expected flag payload, got %#v", ide["flags"])
	}
	if flags[0] != "[redacted]" || flags[1] != "--safe=value" || flags[2] != "[redacted]" || flags[3] != "[redacted]" {
		t.Fatalf("expected string slice redaction, got %#v", flags)
	}
	urls, ok := ide["urls"].([]any)
	if !ok || len(urls) != 2 {
		t.Fatalf("expected URL payload, got %#v", ide["urls"])
	}
	if urls[0] != "[redacted]" || urls[1] != "[redacted]" {
		t.Fatalf("expected URL redaction, got %#v", urls)
	}
}

func TestResolvers_Query_UglySecretRedactionStruct(t *testing.T) {
	type nestedConfig struct {
		Token string `json:"token"`
		Items []struct {
			Secret string `json:"secret"`
		} `json:"items"`
		Meta  struct {
			APIKey string `yaml:"api_key"`
		} `json:"meta"`
		Pointer *struct {
			Secret string `json:"secret"`
		} `json:"pointer"`
	}

	payload := nestedConfig{
		Token: "secret-token",
		Items: []struct {
			Secret string `json:"secret"`
		}{{Secret: "list-secret"}},
		Pointer: &struct {
			Secret string `json:"secret"`
		}{Secret: "pointer-secret"},
	}
	payload.Meta.APIKey = "nested-secret"

	c := core.New()
	c.RegisterQuery(func(_ *core.Core, query core.Query) core.Result {
		if name, ok := query.(string); ok && name == "config.dump" {
			return core.Result{Value: map[string]any{"ide": payload}, OK: true}
		}
		return core.Result{}
	})

	out, _, err := New(config.Navigate{}, c).resolveSettings(context.Background(), Filter{})
	if err != nil {
		t.Fatalf("resolve settings: %v", err)
	}
	payloadOut, ok := out.(Output)
	if !ok || !payloadOut.Available {
		t.Fatalf("expected available payload, got %#v", out)
	}
	data, ok := payloadOut.Data.(map[string]any)
	if !ok {
		t.Fatalf("expected map payload, got %#v", payloadOut.Data)
	}
	ide, ok := data["ide"].(map[string]any)
	if !ok {
		t.Fatalf("expected nested ide payload, got %#v", data["ide"])
	}
	if ide["token"] != "[redacted]" {
		t.Fatalf("expected struct token redaction, got %#v", ide["token"])
	}
	meta, ok := ide["meta"].(map[string]any)
	if !ok {
		t.Fatalf("expected nested meta payload, got %#v", ide["meta"])
	}
	if meta["api_key"] != "[redacted]" {
		t.Fatalf("expected nested api_key redaction, got %#v", meta["api_key"])
	}
	items, ok := ide["items"].([]any)
	if !ok || len(items) != 1 {
		t.Fatalf("expected redacted slice payload, got %#v", ide["items"])
	}
	item, ok := items[0].(map[string]any)
	if !ok {
		t.Fatalf("expected redacted slice element payload, got %#v", items[0])
	}
	if item["secret"] != "[redacted]" {
		t.Fatalf("expected slice secret redaction, got %#v", item["secret"])
	}
	pointer, ok := ide["pointer"].(map[string]any)
	if !ok {
		t.Fatalf("expected nested pointer payload, got %#v", ide["pointer"])
	}
	if pointer["secret"] != "[redacted]" {
		t.Fatalf("expected pointer secret redaction, got %#v", pointer["secret"])
	}
}

func TestResolvers_Query_UglyIdentityRedaction(t *testing.T) {
	c := core.New()
	c.RegisterQuery(func(_ *core.Core, query core.Query) core.Result {
		if name, ok := query.(string); ok && name == "identity.status" {
			return core.Result{Value: map[string]any{
				"tim": map[string]any{
					"certificates": []any{"cert-a"},
					"keys":         []any{"secret-key"},
				},
			}, OK: true}
		}
		return core.Result{}
	})

	out, _, err := New(config.Navigate{}, c).resolveIdentity(context.Background(), Filter{})
	if err != nil {
		t.Fatalf("resolve identity: %v", err)
	}
	payload, ok := out.(Output)
	if !ok || !payload.Available {
		t.Fatalf("expected available payload, got %#v", out)
	}
	data, ok := payload.Data.(map[string]any)
	if !ok {
		t.Fatalf("expected map payload, got %#v", payload.Data)
	}
	tim, ok := data["tim"].(map[string]any)
	if !ok {
		t.Fatalf("expected tim payload, got %#v", data["tim"])
	}
	if tim["keys"] != "[redacted]" {
		t.Fatalf("expected identity key redaction, got %#v", tim["keys"])
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
