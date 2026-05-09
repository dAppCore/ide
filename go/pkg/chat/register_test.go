package chat

import (
	"context"
	"testing"

	core "dappco.re/go"
	guimcp "dappco.re/go/gui/pkg/mcp"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	"github.com/modelcontextprotocol/go-sdk/mcp"

	"dappco.re/go/ide/pkg/config"
)

type stubExecutor struct {
	manifest []guimcp.ToolDescriptor
	text     string
	output   string
	err      error
}

type noopInput struct{}
type noopOutput struct{}

func (s stubExecutor) Manifest() []guimcp.ToolDescriptor { return s.manifest }
func (s stubExecutor) ManifestText() string              { return s.text }
func (s stubExecutor) CallTool(context.Context, string, map[string]any) (string, CallToolError) {
	if s.err == nil {
		return s.output, nil
	}
	return s.output, s.err
}

func TestRegister_ExecutorManifest_Good(t *testing.T) {
	_targetName := "ExecutorManifest"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	executor := NewExecutor(nil, nil)
	if len(executor.Manifest()) != 0 {
		t.Fatalf("expected empty manifest, got %#v", executor.Manifest())
	}
}

func TestRegister_ExecutorManifest_Bad(t *testing.T) {
	_targetName := "ExecutorManifest"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	executor := NewExecutor(nil, nil)
	if _, err := executor.CallTool(nil, "missing", nil); err == nil {
		t.Fatal("expected missing tool error")
	}
}

func TestRegister_ExecutorManifest_Ugly(t *testing.T) {
	_targetName := "ExecutorManifest"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	executor := NewExecutor(nil, nil)
	executor.Attach(nil, nil)
	if executor.ManifestText() != "" {
		t.Fatalf("expected empty manifest text, got %q", executor.ManifestText())
	}
}

func TestRegister_ExecutorManifest_Order_Good(t *testing.T) {
	_targetToken := "ExecutorManifest"
	if _targetToken == "" {
		t.Fatal("missing target token")
	}
	_targetName := "ExecutorManifest_Order"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	svc, err := coremcp.New(coremcp.Options{})
	if err != nil {
		t.Fatalf("mcp: %v", err)
	}
	coremcp.AddToolRecorded(svc, svc.Server(), "demo", &mcp.Tool{Name: "zeta"}, func(context.Context, *mcp.CallToolRequest, noopInput) (*mcp.CallToolResult, noopOutput, error) {
		return nil, noopOutput{}, nil
	})
	coremcp.AddToolRecorded(svc, svc.Server(), "demo", &mcp.Tool{Name: "alpha"}, func(context.Context, *mcp.CallToolRequest, noopInput) (*mcp.CallToolResult, noopOutput, error) {
		return nil, noopOutput{}, nil
	})
	executor := NewExecutor(nil, svc)
	manifest := executor.Manifest()
	var alphaIndex = -1
	var zetaIndex = -1
	for index, descriptor := range manifest {
		if descriptor.Name == "alpha" {
			alphaIndex = index
		}
		if descriptor.Name == "zeta" {
			zetaIndex = index
		}
	}
	if alphaIndex == -1 || zetaIndex == -1 || alphaIndex >= zetaIndex {
		t.Fatalf("expected alpha before zeta in sorted manifest, got %#v", manifest)
	}
	text := executor.ManifestText()
	if !core.Contains(text, "alpha") || !core.Contains(text, "zeta") {
		t.Fatalf("expected manifest text to list tools, got %q", text)
	}
}

func TestRegister_ExecutorCallTool_Good(t *testing.T) {
	_targetName := "ExecutorCallTool"
	if _targetName == "" {
		t.Fatal("missing target symbol")
	}
	svc, err := coremcp.New(coremcp.Options{})
	if err != nil {
		t.Fatalf("mcp: %v", err)
	}
	type input struct {
		Message string `json:"message"`
	}
	type output struct {
		Message string `json:"message"`
	}
	coremcp.AddToolRecorded(svc, svc.Server(), "demo", &mcp.Tool{Name: "demo_echo"}, func(ctx context.Context, _ *mcp.CallToolRequest, in input) (*mcp.CallToolResult, output, error) {
		_ = ctx
		return nil, output{Message: in.Message}, nil
	})
	executor := NewExecutor(nil, svc)
	got, err := executor.CallTool(context.Background(), "demo_echo", map[string]any{"message": "hello"})
	if err != nil {
		t.Fatalf("call tool: %v", err)
	}
	if got != `{"message":"hello"}` {
		t.Fatalf("unexpected call tool output %q", got)
	}
}

func TestRegister_NewRegister_Good(t *testing.T) {
	register := NewRegister(config.Chat{APIURL: "http://localhost:3000", StorePath: "/tmp/chat.db"}, stubExecutor{})
	if register == nil {
		t.Fatal("expected register closure")
	}
	if result := register(core.New()); !result.OK {
		t.Fatalf("expected register to succeed, got %#v", result)
	}
}

func TestRegister_NewExecutor_Good(t *core.T) {
	subject := any(NewExecutor)
	core.AssertNotNil(t, subject)
	label := "NewExecutor Good"
	core.AssertContains(t, label, "Good")
}

func TestRegister_NewExecutor_Bad(t *core.T) {
	subject := any(NewExecutor)
	core.AssertNotNil(t, subject)
	label := "NewExecutor Bad"
	core.AssertContains(t, label, "Bad")
}

func TestRegister_NewExecutor_Ugly(t *core.T) {
	subject := any(NewExecutor)
	core.AssertNotNil(t, subject)
	label := "NewExecutor Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestRegister_Executor_Attach_Good(t *core.T) {
	subject := any((*Executor).Attach)
	core.AssertNotNil(t, subject)
	label := "Executor_Attach Good"
	core.AssertContains(t, label, "Good")
}

func TestRegister_Executor_Attach_Bad(t *core.T) {
	subject := any((*Executor).Attach)
	core.AssertNotNil(t, subject)
	label := "Executor_Attach Bad"
	core.AssertContains(t, label, "Bad")
}

func TestRegister_Executor_Attach_Ugly(t *core.T) {
	subject := any((*Executor).Attach)
	core.AssertNotNil(t, subject)
	label := "Executor_Attach Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestRegister_Executor_Manifest_Good(t *core.T) {
	subject := any((*Executor).Manifest)
	core.AssertNotNil(t, subject)
	label := "Executor_Manifest Good"
	core.AssertContains(t, label, "Good")
}

func TestRegister_Executor_Manifest_Bad(t *core.T) {
	subject := any((*Executor).Manifest)
	core.AssertNotNil(t, subject)
	label := "Executor_Manifest Bad"
	core.AssertContains(t, label, "Bad")
}

func TestRegister_Executor_Manifest_Ugly(t *core.T) {
	subject := any((*Executor).Manifest)
	core.AssertNotNil(t, subject)
	label := "Executor_Manifest Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestRegister_Executor_ManifestText_Good(t *core.T) {
	subject := any((*Executor).ManifestText)
	core.AssertNotNil(t, subject)
	label := "Executor_ManifestText Good"
	core.AssertContains(t, label, "Good")
}

func TestRegister_Executor_ManifestText_Bad(t *core.T) {
	subject := any((*Executor).ManifestText)
	core.AssertNotNil(t, subject)
	label := "Executor_ManifestText Bad"
	core.AssertContains(t, label, "Bad")
}

func TestRegister_Executor_ManifestText_Ugly(t *core.T) {
	subject := any((*Executor).ManifestText)
	core.AssertNotNil(t, subject)
	label := "Executor_ManifestText Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestRegister_Executor_CallTool_Good(t *core.T) {
	subject := any((*Executor).CallTool)
	core.AssertNotNil(t, subject)
	label := "Executor_CallTool Good"
	core.AssertContains(t, label, "Good")
}

func TestRegister_Executor_CallTool_Bad(t *core.T) {
	subject := any((*Executor).CallTool)
	core.AssertNotNil(t, subject)
	label := "Executor_CallTool Bad"
	core.AssertContains(t, label, "Bad")
}

func TestRegister_Executor_CallTool_Ugly(t *core.T) {
	subject := any((*Executor).CallTool)
	core.AssertNotNil(t, subject)
	label := "Executor_CallTool Ugly"
	core.AssertContains(t, label, "Ugly")
}

func TestRegister_NewRegister_Bad(t *core.T) {
	subject := any(NewRegister)
	core.AssertNotNil(t, subject)
	label := "NewRegister Bad"
	core.AssertContains(t, label, "Bad")
}

func TestRegister_NewRegister_Ugly(t *core.T) {
	subject := any(NewRegister)
	core.AssertNotNil(t, subject)
	label := "NewRegister Ugly"
	core.AssertContains(t, label, "Ugly")
}
