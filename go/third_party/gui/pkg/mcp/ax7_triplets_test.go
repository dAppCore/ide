package mcp

import (
	"context"

	core "dappco.re/go"
)

func TestAX7_New_Good(t *core.T) {
	c := core.New()
	subsystem := New(c)
	core.AssertNotNil(t, subsystem)
	core.AssertEqual(t, c, subsystem.core)
}

func TestAX7_New_Bad(t *core.T) {
	subsystem := New(nil)
	core.AssertNotNil(t, subsystem)
	core.AssertNil(t, subsystem.core)
}

func TestAX7_New_Ugly(t *core.T) {
	c := core.New()
	subsystem := New(c)
	subsystem.core = nil
	core.AssertNil(t, subsystem.core)
}

func TestAX7_Subsystem_Manifest_Good(t *core.T) {
	subsystem := New(core.New())
	manifest := subsystem.Manifest()
	core.AssertNil(t, manifest)
	core.AssertEqual(t, 0, len(manifest))
}

func TestAX7_Subsystem_Manifest_Bad(t *core.T) {
	var subsystem *Subsystem
	manifest := subsystem.Manifest()
	core.AssertNil(t, manifest)
	core.AssertEqual(t, 0, len(manifest))
}

func TestAX7_Subsystem_Manifest_Ugly(t *core.T) {
	subsystem := &Subsystem{}
	manifest := subsystem.Manifest()
	core.AssertNil(t, manifest)
	core.AssertEmpty(t, manifest)
}

func TestAX7_Subsystem_CallTool_Good(t *core.T) {
	c := core.New()
	c.Action("gui.echo", func(context.Context, core.Options) core.Result { return core.Ok("ok") })
	output, err := New(c).CallTool(context.Background(), "gui.echo", nil)
	core.AssertNoError(t, err)
	core.AssertEqual(t, `"ok"`, output)
}

func TestAX7_Subsystem_CallTool_Bad(t *core.T) {
	subsystem := New(nil)
	output, err := subsystem.CallTool(context.Background(), "gui.missing", nil)
	core.AssertError(t, err)
	core.AssertEqual(t, "", output)
}

func TestAX7_Subsystem_CallTool_Ugly(t *core.T) {
	subsystem := New(core.New())
	output, err := subsystem.CallTool(context.Background(), "", map[string]any{"ignored": true})
	core.AssertError(t, err)
	core.AssertEqual(t, "", output)
}
