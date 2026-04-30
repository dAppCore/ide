package chat

import (
	"context"

	core "dappco.re/go"
	guimcp "dappco.re/go/gui/pkg/mcp"
)

type ax7Executor struct{}

func (ax7Executor) Manifest() []guimcp.ToolDescriptor {
	return []guimcp.ToolDescriptor{{Name: "gui.echo", Description: "echo"}}
}

func (ax7Executor) ManifestText() string {
	return "gui.echo"
}

func (ax7Executor) CallTool(context.Context, string, map[string]any) (string, error) {
	return "called", nil
}

func TestAX7_Register_Good(t *core.T) {
	register := Register(func(options *Options) {
		options.APIURL = "http://localhost:9000"
		options.StorePath = "/tmp/gui-chat.db"
	})
	c := core.New(core.WithService(register))
	service, ok := core.ServiceFor[*Service](c, "chat")
	core.AssertTrue(t, ok)
	core.AssertEqual(t, "http://localhost:9000", service.options.APIURL)
}

func TestAX7_Register_Bad(t *core.T) {
	register := Register(nil)
	c := core.New(core.WithService(register))
	service, ok := core.ServiceFor[*Service](c, "chat")
	core.AssertTrue(t, ok)
	core.AssertContains(t, service.options.StorePath, "chat.db")
}

func TestAX7_Register_Ugly(t *core.T) {
	register := Register(func(options *Options) { options.ToolExecutor = ax7Executor{} })
	c := core.New(core.WithService(register))
	result := c.Action("gui.chat.tools").Run(context.Background(), core.NewOptions())
	core.AssertTrue(t, result.OK)
	core.AssertLen(t, result.Value.([]guimcp.ToolDescriptor), 1)
}
