package chat

import (
	"context"

	core "dappco.re/go/core"
	guimcp "forge.lthn.ai/core/gui/pkg/mcp"
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
				return core.Result{Value: []guimcp.ToolDescriptor{}, OK: true}
			}
			return core.Result{Value: service.options.ToolExecutor.Manifest(), OK: true}
		})
		c.Action("gui.chat.tool_manifest", func(_ context.Context, _ core.Options) core.Result {
			if service.options.ToolExecutor == nil {
				return core.Result{Value: "", OK: true}
			}
			return core.Result{Value: service.options.ToolExecutor.ManifestText(), OK: true}
		})
		c.Action("gui.chat.call_tool", func(ctx context.Context, opts core.Options) core.Result {
			if service.options.ToolExecutor == nil {
				return core.Result{Value: core.E("gui.chat.CallTool", "tool executor unavailable", nil), OK: false}
			}
			input, err := decodeInput[callToolInput](opts)
			if err != nil {
				return core.Result{Value: err, OK: false}
			}
			output, err := service.options.ToolExecutor.CallTool(ctx, input.Name, input.Arguments)
			return core.Result{}.New(output, err)
		})
		return core.Result{Value: service, OK: true}
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
