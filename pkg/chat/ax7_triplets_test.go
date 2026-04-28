package chat

import (
	"context"

	core "dappco.re/go"
	guimcp "dappco.re/go/gui/pkg/mcp"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	"github.com/modelcontextprotocol/go-sdk/mcp"

	"dappco.re/go/ide/pkg/config"
)

func TestAX7_NewExecutor_Good(t *core.T) {
	executor := NewExecutor(nil, nil)
	core.AssertNotNil(t, executor)
	core.AssertEmpty(t, executor.Manifest())
}

func TestAX7_NewExecutor_Bad(t *core.T) {
	executor := NewExecutor(nil, nil)
	output, err := executor.CallTool(context.Background(), "missing", nil)
	core.AssertError(t, err)
	core.AssertEqual(t, "", output)
}

func TestAX7_NewExecutor_Ugly(t *core.T) {
	service, err := coremcp.New(coremcp.Options{})
	core.RequireNoError(t, err)
	executor := NewExecutor(nil, service)
	core.AssertNotNil(t, executor)
	core.AssertEqual(t, service, executor.mcp)
}

func TestAX7_Executor_Attach_Good(t *core.T) {
	service, err := coremcp.New(coremcp.Options{})
	core.RequireNoError(t, err)
	executor := NewExecutor(nil, nil)
	executor.Attach(nil, service)
	core.AssertEqual(t, service, executor.mcp)
}

func TestAX7_Executor_Attach_Bad(t *core.T) {
	executor := NewExecutor(nil, nil)
	executor.Attach(nil, nil)
	core.AssertNil(t, executor.gui)
	core.AssertNil(t, executor.mcp)
}

func TestAX7_Executor_Attach_Ugly(t *core.T) {
	first, err := coremcp.New(coremcp.Options{})
	core.RequireNoError(t, err)
	second, err := coremcp.New(coremcp.Options{})
	core.RequireNoError(t, err)
	executor := NewExecutor(nil, first)
	executor.Attach(nil, second)
	core.AssertEqual(t, second, executor.mcp)
}

func TestAX7_Executor_Manifest_Good(t *core.T) {
	service, err := coremcp.New(coremcp.Options{})
	core.RequireNoError(t, err)
	coremcp.AddToolRecorded(service, service.Server(), "demo", &mcp.Tool{Name: "demo_echo"}, func(context.Context, *mcp.CallToolRequest, noopInput) (*mcp.CallToolResult, noopOutput, error) {
		return nil, noopOutput{}, nil
	})
	manifest := NewExecutor(nil, service).Manifest()
	names := ax7ChatToolNames(manifest)
	core.AssertTrue(t, names["demo_echo"])
}

func TestAX7_Executor_Manifest_Bad(t *core.T) {
	executor := NewExecutor(nil, nil)
	manifest := executor.Manifest()
	core.AssertEmpty(t, manifest)
	core.AssertEqual(t, 0, len(manifest))
}

func TestAX7_Executor_Manifest_Ugly(t *core.T) {
	service, err := coremcp.New(coremcp.Options{})
	core.RequireNoError(t, err)
	coremcp.AddToolRecorded(service, service.Server(), "demo", &mcp.Tool{Name: "zeta"}, func(context.Context, *mcp.CallToolRequest, noopInput) (*mcp.CallToolResult, noopOutput, error) {
		return nil, noopOutput{}, nil
	})
	coremcp.AddToolRecorded(service, service.Server(), "demo", &mcp.Tool{Name: "alpha"}, func(context.Context, *mcp.CallToolRequest, noopInput) (*mcp.CallToolResult, noopOutput, error) {
		return nil, noopOutput{}, nil
	})
	manifest := NewExecutor(nil, service).Manifest()
	core.AssertEqual(t, "alpha", manifest[0].Name)
}

func ax7ChatToolNames(records []guimcp.ToolDescriptor) map[string]bool {
	names := map[string]bool{}
	for _, record := range records {
		names[record.Name] = true
	}
	return names
}

func TestAX7_Executor_ManifestText_Good(t *core.T) {
	executor := NewExecutor(nil, nil)
	text := executor.ManifestText()
	core.AssertEqual(t, "", text)
}

func TestAX7_Executor_ManifestText_Bad(t *core.T) {
	service, err := coremcp.New(coremcp.Options{})
	core.RequireNoError(t, err)
	coremcp.AddToolRecorded(service, service.Server(), "demo", &mcp.Tool{Name: "demo_echo"}, func(context.Context, *mcp.CallToolRequest, noopInput) (*mcp.CallToolResult, noopOutput, error) {
		return nil, noopOutput{}, nil
	})
	text := NewExecutor(nil, service).ManifestText()
	core.AssertContains(t, text, "demo_echo")
}

func TestAX7_Executor_ManifestText_Ugly(t *core.T) {
	executor := NewExecutor(nil, nil)
	executor.Attach(nil, nil)
	text := executor.ManifestText()
	core.AssertEqual(t, "", text)
}

func TestAX7_Executor_CallTool_Good(t *core.T) {
	service, err := coremcp.New(coremcp.Options{})
	core.RequireNoError(t, err)
	coremcp.AddToolRecorded(service, service.Server(), "demo", &mcp.Tool{Name: "demo_echo"}, func(context.Context, *mcp.CallToolRequest, noopInput) (*mcp.CallToolResult, map[string]string, error) {
		return nil, map[string]string{"message": "ok"}, nil
	})
	output, err := NewExecutor(nil, service).CallTool(context.Background(), "demo_echo", nil)
	core.AssertNoError(t, err)
	core.AssertContains(t, output, "ok")
}

func TestAX7_Executor_CallTool_Bad(t *core.T) {
	executor := NewExecutor(nil, nil)
	output, err := executor.CallTool(context.Background(), "missing", nil)
	core.AssertError(t, err)
	core.AssertEqual(t, "", output)
}

func TestAX7_Executor_CallTool_Ugly(t *core.T) {
	executor := NewExecutor(nil, nil)
	output, err := executor.CallTool(context.Background(), "", map[string]any{"ignored": true})
	core.AssertError(t, err)
	core.AssertEqual(t, "", output)
}

func TestAX7_NewRegister_Bad(t *core.T) {
	register := NewRegister(config.Chat{}, nil)
	result := register(core.New())
	core.AssertTrue(t, result.OK)
	core.AssertNotNil(t, result.Value)
}

func TestAX7_NewRegister_Ugly(t *core.T) {
	register := NewRegister(config.Chat{APIURL: "http://localhost:3000"}, stubExecutor{manifest: []guimcp.ToolDescriptor{{Name: "tool"}}})
	c := core.New(core.WithService(register))
	service, ok := core.ServiceFor[any](c, "chat")
	core.AssertTrue(t, ok)
	core.AssertNotNil(t, service)
}
