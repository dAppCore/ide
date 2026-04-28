package chat

import (
	"context"

	core "dappco.re/go"
	guimcp "dappco.re/go/gui/pkg/mcp"
)

type ToolExecutor interface {
	Manifest() []guimcp.ToolDescriptor
	ManifestText() string
	CallTool(ctx context.Context, name string, arguments map[string]any) (string, error)
}

type Options struct {
	APIURL       string
	StorePath    string
	ToolExecutor ToolExecutor
}

type Service struct {
	*core.ServiceRuntime[Options]
	options Options
}

type callToolInput struct {
	Name      string         `json:"name"`
	Arguments map[string]any `json:"arguments,omitempty"`
}

func Register(configure func(*Options)) func(*core.Core) core.Result {
	options := Options{
		APIURL:    "http://localhost:8090",
		StorePath: core.JoinPath(core.Env("DIR_HOME"), ".core", "gui", "chat.db"),
	}
	if configure != nil {
		configure(&options)
	}
	return func(c *core.Core) core.Result {
		service := &Service{
			ServiceRuntime: core.NewServiceRuntime[Options](c, options),
			options:        options,
		}
		c.Action("gui.chat.tools", func(_ context.Context, _ core.Options) core.Result {
			if service.options.ToolExecutor == nil {
				return core.Ok([]guimcp.ToolDescriptor{})
			}
			return core.Ok(service.options.ToolExecutor.Manifest())
		})
		c.Action("gui.chat.tool_manifest", func(_ context.Context, _ core.Options) core.Result {
			if service.options.ToolExecutor == nil {
				return core.Ok("")
			}
			return core.Ok(service.options.ToolExecutor.ManifestText())
		})
		c.Action("gui.chat.call_tool", func(ctx context.Context, opts core.Options) core.Result {
			if service.options.ToolExecutor == nil {
				return core.Fail(core.E("gui.chat.CallTool", "tool executor unavailable", nil))
			}
			input, err := decodeInput[callToolInput](opts)
			if err != nil {
				return core.Fail(err)
			}
			output, err := service.options.ToolExecutor.CallTool(ctx, input.Name, input.Arguments)
			return core.ResultOf(output, err)
		})
		return core.Ok(service)
	}
}

func decodeInput[T any](opts core.Options) (T, error) {
	var out T
	input := map[string]any{}
	for _, item := range opts.Items() {
		input[item.Key] = item.Value
	}
	if result := core.JSONUnmarshalString(core.JSONMarshalString(input), &out); !result.OK {
		if err, ok := result.Value.(error); ok {
			return out, err
		}
		return out, core.E("gui.chat.Decode", "decode options", nil)
	}
	return out, nil
}
