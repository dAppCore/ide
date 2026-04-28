package navigate

import (
	"context"

	core "dappco.re/go"
	coremcp "dappco.re/go/mcp/pkg/mcp"

	"dappco.re/go/ide/pkg/config"
)

func TestAX7_New_Good(t *core.T) {
	c := core.New()
	subsystem := New(config.Navigate{}, c)
	core.AssertNotNil(t, subsystem.router)
	core.AssertEqual(t, c, subsystem.core)
}

func TestAX7_New_Bad(t *core.T) {
	subsystem := New(config.Navigate{Routes: []string{"core://models"}}, nil)
	out, err := subsystem.resolve(context.Background(), Input{Route: "core://store"})
	core.AssertNoError(t, err)
	core.AssertFalse(t, out.Available)
}

func TestAX7_New_Ugly(t *core.T) {
	subsystem := New(config.Navigate{Routes: []string{}}, core.New())
	out, err := subsystem.resolve(context.Background(), Input{Route: ""})
	core.AssertNoError(t, err)
	core.AssertEqual(t, "route is required", out.Reason)
}

func TestAX7_Subsystem_AttachCore_Good(t *core.T) {
	c := core.New()
	subsystem := New(config.Navigate{}, nil)
	subsystem.AttachCore(c)
	core.AssertEqual(t, c, subsystem.core)
}

func TestAX7_Subsystem_AttachCore_Bad(t *core.T) {
	subsystem := New(config.Navigate{}, core.New())
	subsystem.AttachCore(nil)
	core.AssertNil(t, subsystem.core)
}

func TestAX7_Subsystem_AttachCore_Ugly(t *core.T) {
	first := core.New()
	second := core.New()
	subsystem := New(config.Navigate{}, first)
	subsystem.AttachCore(second)
	core.AssertEqual(t, second, subsystem.core)
}

func TestAX7_Subsystem_Name_Good(t *core.T) {
	subsystem := New(config.Navigate{}, core.New())
	name := subsystem.Name()
	core.AssertEqual(t, "navigate", name)
}

func TestAX7_Subsystem_Name_Bad(t *core.T) {
	var subsystem *Subsystem
	name := subsystem.Name()
	core.AssertEqual(t, "navigate", name)
}

func TestAX7_Subsystem_Name_Ugly(t *core.T) {
	subsystem := &Subsystem{}
	name := subsystem.Name()
	core.AssertEqual(t, "navigate", name)
}

func TestAX7_Subsystem_RegisterTools_Good(t *core.T) {
	service, err := coremcp.New(coremcp.Options{})
	core.RequireNoError(t, err)
	New(config.Navigate{}, core.New()).RegisterTools(service)
	core.AssertNotEmpty(t, service.Tools())
}

func TestAX7_Subsystem_RegisterTools_Bad(t *core.T) {
	subsystem := New(config.Navigate{}, core.New())
	core.AssertPanics(t, func() { subsystem.RegisterTools(nil) })
	core.AssertNotNil(t, subsystem)
}

func TestAX7_Subsystem_RegisterTools_Ugly(t *core.T) {
	service, err := coremcp.New(coremcp.Options{})
	core.RequireNoError(t, err)
	New(config.Navigate{Routes: []string{"core://models"}}, core.New()).RegisterTools(service)
	names := ax7NavigateToolNames(service.Tools())
	core.AssertTrue(t, names["core_navigate"])
}

func ax7NavigateToolNames(records []coremcp.ToolRecord) map[string]bool {
	names := map[string]bool{}
	for _, record := range records {
		names[record.Name] = true
	}
	return names
}

func TestAX7_Subsystem_RegisterActions_Good(t *core.T) {
	c := core.New()
	New(config.Navigate{}, c).RegisterActions(c)
	action := c.Action("ide.navigate")
	core.AssertTrue(t, action.Exists())
}

func TestAX7_Subsystem_RegisterActions_Bad(t *core.T) {
	subsystem := New(config.Navigate{}, core.New())
	core.AssertPanics(t, func() { subsystem.RegisterActions(nil) })
	core.AssertNotNil(t, subsystem)
}

func TestAX7_Subsystem_RegisterActions_Ugly(t *core.T) {
	c := core.New()
	New(config.Navigate{}, c).RegisterActions(c)
	result := c.Action("ide.navigate").Run(context.Background(), core.NewOptions(core.Option{Key: "filter", Value: "bad"}))
	core.AssertFalse(t, result.OK)
}

func TestAX7_Router_Handle_Good(t *core.T) {
	router := &Router{}
	router.Handle("core://demo", func(context.Context, Filter) (Data, Schema, error) { return "ok", nil, nil })
	data, _, err := router.Resolve(context.Background(), "core://demo", Filter{})
	core.AssertNoError(t, err)
	core.AssertEqual(t, "ok", data)
}

func TestAX7_Router_Handle_Bad(t *core.T) {
	var router *Router
	router.Handle("core://demo", func(context.Context, Filter) (Data, Schema, error) { return "ok", nil, nil })
	core.AssertNil(t, router)
	core.AssertNotPanics(t, func() {})
}

func TestAX7_Router_Handle_Ugly(t *core.T) {
	router := &Router{}
	router.Handle("", func(context.Context, Filter) (Data, Schema, error) { return "ok", nil, nil })
	_, _, err := router.Resolve(context.Background(), "", Filter{})
	core.AssertError(t, err)
}

func TestAX7_Router_Resolve_Good(t *core.T) {
	router := &Router{}
	router.Handle("core://demo", func(context.Context, Filter) (Data, Schema, error) {
		return "ok", map[string]any{"type": "string"}, nil
	})
	data, schema, err := router.Resolve(context.Background(), "core://demo", Filter{})
	core.AssertNoError(t, err)
	core.AssertEqual(t, "ok", data)
	core.AssertNotNil(t, schema)
}

func TestAX7_Router_Resolve_Bad(t *core.T) {
	var router *Router
	data, schema, err := router.Resolve(context.Background(), "core://demo", Filter{})
	core.AssertError(t, err)
	core.AssertNil(t, data)
	core.AssertNil(t, schema)
}

func TestAX7_Router_Resolve_Ugly(t *core.T) {
	router := &Router{}
	router.Handle("core://store/{namespace}", func(_ context.Context, filter Filter) (Data, Schema, error) {
		return filter.Values["namespace"], nil, nil
	})
	data, _, err := router.Resolve(context.Background(), "core://store/demo", Filter{})
	core.AssertNoError(t, err)
	core.AssertEqual(t, "demo", data)
}
