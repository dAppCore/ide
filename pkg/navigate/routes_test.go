package navigate

import (
	"context"
	"testing"

	core "dappco.re/go/core"
	coremcp "dappco.re/go/mcp/pkg/mcp"

	"dappco.re/go/core/ide/pkg/config"
	storepkg "dappco.re/go/core/ide/pkg/store"
)

func TestRoutes_Resolve_Good(t *testing.T) {
	c := core.New(core.WithService(storepkg.Register))
	storeService, ok := core.ServiceFor[*storepkg.Service](c, "store")
	if !ok || storeService == nil {
		t.Fatal("expected store service")
	}
	if err := storeService.Store.Set("demo", "key", "value"); err != nil {
		t.Fatalf("store set: %v", err)
	}
	subsystem := New(config.Navigate{}, c)
	out, err := subsystem.resolve(context.Background(), Input{Route: "core://store"})
	if err != nil {
		t.Fatalf("resolve: %v", err)
	}
	if !out.Available {
		t.Fatalf("expected route to resolve, got %#v", out)
	}
	data, ok := out.Data.(map[string]any)
	if !ok || data["namespaces"] == nil {
		t.Fatalf("expected namespaces payload, got %#v", out.Data)
	}

	router := &Router{}
	var received Filter
	router.Handle("core://store/{namespace}", func(ctx context.Context, filter Filter) (Data, Schema, error) {
		_ = ctx
		received = filter
		return map[string]any{
			"namespace": filterString(filter, "namespace"),
		}, map[string]any{"type": "object"}, nil
	})
	dataAny, schema, err := router.Resolve(context.Background(), "core://store/demo", Filter{Values: map[string]any{"extra": "value"}})
	if err != nil {
		t.Fatalf("resolve pattern route: %v", err)
	}
	payload, ok := dataAny.(map[string]any)
	if !ok || payload["namespace"] != "demo" || schema == nil {
		t.Fatalf("expected pattern route payload, got %#v schema=%#v", dataAny, schema)
	}
	if received.Values["namespace"] != "demo" || received.Values["extra"] != "value" {
		t.Fatalf("expected route filter merge, got %#v", received.Values)
	}
}

func TestRoutes_Resolve_Bad(t *testing.T) {
	r := &Router{}
	if _, _, err := r.Resolve(context.Background(), "core://missing", Filter{}); err == nil {
		t.Fatal("expected unknown route error")
	}
}

func TestRoutes_Resolve_Ugly(t *testing.T) {
	subsystem := New(config.Navigate{}, core.New())
	out, err := subsystem.resolve(context.Background(), Input{Route: "core://settings"})
	if err != nil {
		t.Fatalf("resolve: %v", err)
	}
	if out.Available || out.Data == nil {
		t.Fatalf("expected unavailable fallback payload, got %#v", out)
	}
}

func TestRoutes_MatchRoutePattern_Good(t *testing.T) {
	filter, ok := matchRoutePattern("core://store/{namespace}", "core://store/demo")
	if !ok {
		t.Fatal("expected pattern match")
	}
	if got := filter.Values["namespace"]; got != "demo" {
		t.Fatalf("expected namespace filter, got %#v", filter.Values)
	}
}

func TestRoutes_MatchRoutePattern_Bad(t *testing.T) {
	if _, ok := matchRoutePattern("core://store/{namespace}", "core://store/demo/extra"); ok {
		t.Fatal("expected nested namespace to fail")
	}
}

func TestRoutes_FilterString_Ugly(t *testing.T) {
	if got := filterString(Filter{Values: map[string]any{"namespace": 12}}, "namespace"); got != "" {
		t.Fatalf("expected non-string value to be dropped, got %q", got)
	}
}

func TestRoutes_StoreNamespace_Good(t *testing.T) {
	c := core.New(core.WithService(storepkg.Register))
	storeService, ok := core.ServiceFor[*storepkg.Service](c, "store")
	if !ok || storeService == nil {
		t.Fatal("expected store service")
	}
	_ = storeService.Store.Set("demo", "alpha", "value")
	subsystem := New(config.Navigate{}, c)
	data, schema, err := subsystem.resolveStoreNamespace(context.Background(), Filter{Values: map[string]any{"namespace": "demo"}})
	if err != nil {
		t.Fatalf("resolve store namespace: %v", err)
	}
	if data == nil || schema == nil {
		t.Fatal("expected namespace payload and schema")
	}
}

func TestRoutes_ResolveQuery_Bad(t *testing.T) {
	subsystem := New(config.Navigate{}, core.New())
	out, err := subsystem.query(context.Background(), "config.dump")
	if err != nil {
		t.Fatalf("query: %v", err)
	}
	if out.Available {
		t.Fatalf("expected missing action to be unavailable, got %#v", out)
	}
}

func TestRoutes_ResolveQuery_Good(t *testing.T) {
	c := core.New()
	c.RegisterQuery(func(_ *core.Core, q core.Query) core.Result {
		if name, ok := q.(string); ok && name == "config.dump" {
			return core.Result{Value: map[string]any{"config": "ok"}, OK: true}
		}
		return core.Result{}
	})
	subsystem := New(config.Navigate{}, c)
	out, err := subsystem.query(context.Background(), "config.dump")
	if err != nil {
		t.Fatalf("query: %v", err)
	}
	if !out.Available {
		t.Fatalf("expected query to resolve, got %#v", out)
	}
}

func TestRoutes_ResolveQueryRoutes_Good(t *testing.T) {
	c := core.New()
	c.RegisterQuery(func(_ *core.Core, q core.Query) core.Result {
		switch name := q.(string); name {
		case "ai.models.list":
			return core.Result{Value: map[string]any{"models": []any{map[string]any{"name": "gpt"}}}, OK: true}
		case "agent.workspaces.status":
			return core.Result{Value: map[string]any{"workspaces": []any{map[string]any{"name": "demo"}}}, OK: true}
		case "network.status":
			return core.Result{Value: map[string]any{"connected": true}, OK: true}
		case "identity.status":
			return core.Result{Value: map[string]any{"tim": map[string]any{"keys": []any{}}}, OK: true}
		default:
			return core.Result{}
		}
	})
	subsystem := New(config.Navigate{}, c)
	cases := []struct {
		route string
	}{
		{route: "core://models"},
		{route: "core://agent"},
		{route: "core://network"},
		{route: "core://identity"},
	}
	for _, tc := range cases {
		out, err := subsystem.resolve(context.Background(), Input{Route: tc.route})
		if err != nil {
			t.Fatalf("resolve %s: %v", tc.route, err)
		}
		if !out.Available || out.Data == nil {
			t.Fatalf("expected %s route payload, got %#v", tc.route, out)
		}
	}
}

func TestRoutes_RegisterRoutes_Ugly(t *testing.T) {
	c := core.New()
	c.RegisterQuery(func(_ *core.Core, q core.Query) core.Result {
		if name, ok := q.(string); ok && name == "ai.models.list" {
			return core.Result{Value: map[string]any{"models": []any{map[string]any{"name": "gpt"}}}, OK: true}
		}
		return core.Result{}
	})
	subsystem := New(config.Navigate{Routes: []string{"core://models"}}, c)
	out, err := subsystem.resolve(context.Background(), Input{Route: "core://models"})
	if err != nil {
		t.Fatalf("resolve core://models: %v", err)
	}
	if !out.Available || out.Data == nil {
		t.Fatalf("expected models route to remain available when store is disabled, got %#v", out)
	}
}

func TestRoutes_ResolveStore_Ugly(t *testing.T) {
	subsystem := New(config.Navigate{}, core.New())
	data, schema, err := subsystem.resolveStore(context.Background(), Filter{})
	if err != nil {
		t.Fatalf("resolve store: %v", err)
	}
	out, ok := data.(Output)
	if !ok || out.Available || schema != nil {
		t.Fatalf("expected unavailable store payload, got %#v schema=%#v", data, schema)
	}
}

func TestNavigate_Name_Good(t *testing.T) {
	subsystem := New(config.Navigate{}, core.New())
	if subsystem.Name() != "navigate" {
		t.Fatalf("expected navigate name, got %q", subsystem.Name())
	}
}

func TestNavigate_RegisterActions_Good(t *testing.T) {
	subsystem := New(config.Navigate{}, core.New())
	c := core.New()
	subsystem.RegisterActions(c)
	if !c.Action("ide.navigate").Exists() {
		t.Fatal("expected ide.navigate action")
	}
}

func TestNavigate_RegisterTools_Good(t *testing.T) {
	subsystem := New(config.Navigate{}, core.New())
	svc, err := coremcp.New(coremcp.Options{})
	if err != nil {
		t.Fatalf("mcp: %v", err)
	}
	subsystem.RegisterTools(svc)
	names := map[string]bool{}
	for _, tool := range svc.Tools() {
		names[tool.Name] = true
	}
	if !names["core_navigate"] {
		t.Fatal("expected core_navigate tool")
	}
}

func TestNavigate_Decode_Good(t *testing.T) {
	input, err := decode[Input](core.NewOptions(core.Option{Key: "route", Value: "core://store"}))
	if err != nil {
		t.Fatalf("decode: %v", err)
	}
	if input.Route != "core://store" {
		t.Fatalf("unexpected decoded input %#v", input)
	}
}

func TestNavigate_Decode_Bad(t *testing.T) {
	if _, err := decode[struct {
		Route string `json:"route"`
	}](core.NewOptions(core.Option{Key: "route", Value: 123})); err == nil {
		t.Fatal("expected type mismatch error")
	}
}
