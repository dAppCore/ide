package chat

import (
	"context"
	"sort"

	core "dappco.re/go"
	gui_chat "dappco.re/go/gui/pkg/chat"
	guimcp "dappco.re/go/gui/pkg/mcp"
	coremcp "dappco.re/go/mcp/pkg/mcp"

	"dappco.re/go/ide/pkg/config"
)

// ToolExecutor is the local (IDE-side) executor contract. CallTool returns a
// core.Result so failure carries structured error data (op + msg + cause)
// rather than the bare interface{ Error() string } placeholder this package
// used to expose.
//
// The upstream gui_chat.ToolExecutor still uses the standard `error` shape;
// NewRegister adapts the local executor at that boundary so the IDE side can
// stay on core.Result canon while gui_chat receives the error shape it expects.
type ToolExecutor interface {
	Manifest() []guimcp.ToolDescriptor
	ManifestText() string
	CallTool(ctx context.Context, name string, arguments map[string]any) (string, core.Result)
}

type Executor struct {
	gui *guimcp.Subsystem
	mcp *coremcp.Service
}

func NewExecutor(guiSubsystem *guimcp.Subsystem, mcpService *coremcp.Service) *Executor {
	return &Executor{gui: guiSubsystem, mcp: mcpService}
}

func (e *Executor) Attach(guiSubsystem *guimcp.Subsystem, mcpService *coremcp.Service) {
	e.gui = guiSubsystem
	e.mcp = mcpService
}

func (e *Executor) Manifest() []guimcp.ToolDescriptor {
	descriptors := make([]guimcp.ToolDescriptor, 0)
	if e.gui != nil {
		descriptors = append(descriptors, e.gui.Manifest()...)
	}
	if e.mcp != nil {
		for _, tool := range e.mcp.Tools() {
			descriptors = append(descriptors, guimcp.ToolDescriptor{Name: tool.Name, Description: tool.Description, InputSchema: tool.InputSchema})
		}
	}
	sort.Slice(descriptors, func(i, j int) bool {
		return descriptors[i].Name < descriptors[j].Name
	})
	return descriptors
}

func (e *Executor) ManifestText() string {
	builder := core.NewBuilder()
	for _, descriptor := range e.Manifest() {
		builder.WriteString("- ")
		builder.WriteString(descriptor.Name)
		builder.WriteString("\n")
	}
	return core.Trim(builder.String())
}

// CallTool dispatches by tool name, returning the output payload + a structured
// core.Result. Result.OK == true means the tool ran cleanly and Value (when
// present) is the underlying error/output; OK == false carries a core.E with op
// + msg + cause for the chat surface to render.
func (e *Executor) CallTool(
	ctx context.Context,
	name string,
	arguments map[string]any,
) (string, core.Result) {
	if e.gui != nil {
		for _, descriptor := range e.gui.Manifest() {
			if descriptor.Name == name {
				output, err := e.gui.CallTool(ctx, name, arguments)
				if err != nil {
					return "", core.Fail(core.E("ide.chat.CallTool", "gui tool failed: "+name, err))
				}
				return output, core.Ok(nil)
			}
		}
	}
	if e.mcp != nil {
		for _, tool := range e.mcp.Tools() {
			if tool.Name == name && tool.RESTHandler != nil {
				output, err := tool.RESTHandler(ctx, []byte(core.JSONMarshalString(arguments)))
				if err != nil {
					return "", core.Fail(core.E("ide.chat.CallTool", "mcp tool failed: "+name, err))
				}
				return core.JSONMarshalString(output), core.Ok(nil)
			}
		}
	}
	return "", core.Fail(core.E("ide.chat.CallTool", core.Concat("tool not found: ", name), nil))
}

// guiChatExecutorAdapter bridges the local ToolExecutor (core.Result-returning)
// to the upstream gui_chat.ToolExecutor (resultFailure-returning, where
// resultFailure is an anonymous interface{ Error() string } alias — see
// external/gui/go/pkg/chat/result_failure.go). gui_chat is part of
// dappco.re/go/gui — a separate canonical project that uses an in-house
// failure shape, so the adapter preserves the contract at the boundary rather
// than forcing an upstream change.
//
// The return type is the literal anonymous interface — NOT the named `error`
// type — because Go interface-method matching requires identical return types
// even when structurally equivalent. error and interface{ Error() string } are
// distinct in the type system, so resultFailure satisfaction needs the
// anonymous-interface return verbatim.
//
// On failure, Result.Value carries the underlying error built by core.E. The
// adapter unwraps; if Value isn't error-shaped (shouldn't happen with core.Fail),
// the adapter synthesises one from the Result for safety.
type guiChatExecutorAdapter struct {
	inner ToolExecutor
}

func (a guiChatExecutorAdapter) Manifest() []guimcp.ToolDescriptor { return a.inner.Manifest() }
func (a guiChatExecutorAdapter) ManifestText() string              { return a.inner.ManifestText() }

func (a guiChatExecutorAdapter) CallTool(
	ctx context.Context,
	name string,
	arguments map[string]any,
) (string, interface{ Error() string }) {
	output, result := a.inner.CallTool(ctx, name, arguments)
	if result.OK {
		return output, nil
	}
	if err, ok := result.Value.(interface{ Error() string }); ok {
		return output, err
	}
	return output, core.E("ide.chat.adapter", "tool failed without error value", nil)
}

// NewRegister wires the GUI chat subsystem with the shared tool executor. The
// local executor (core.Result-shaped) is wrapped in guiChatExecutorAdapter so
// upstream gui_chat sees the error-shape it expects — single boundary
// translation, full Result canon for IDE-side callers.
//
//	core.WithService(chat.NewRegister(cfg.Ide.Chat, sharedExecutor))
func NewRegister(cfg config.Chat, executor ToolExecutor) func(*core.Core) core.Result {
	return gui_chat.Register(func(opts *gui_chat.Options) {
		opts.APIURL = cfg.APIURL
		opts.StorePath = cfg.StorePath
		opts.ToolExecutor = guiChatExecutorAdapter{inner: executor}
	})
}
