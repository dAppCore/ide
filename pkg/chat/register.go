package chat

import (
	"context"
	"sort"

	core "dappco.re/go/core"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	gui_chat "dappco.re/go/gui/pkg/chat"
	guimcp "dappco.re/go/gui/pkg/mcp"

	"dappco.re/go/ide/pkg/config"
)

type ToolExecutor interface {
	Manifest() []guimcp.ToolDescriptor
	ManifestText() string
	CallTool(ctx context.Context, name string, arguments map[string]any) (string, error)
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

func (e *Executor) CallTool(ctx context.Context, name string, arguments map[string]any) (string, error) {
	if e.gui != nil {
		for _, descriptor := range e.gui.Manifest() {
			if descriptor.Name == name {
				return e.gui.CallTool(ctx, name, arguments)
			}
		}
	}
	if e.mcp != nil {
		for _, tool := range e.mcp.Tools() {
			if tool.Name == name && tool.RESTHandler != nil {
				output, err := tool.RESTHandler(ctx, []byte(core.JSONMarshalString(arguments)))
				if err != nil {
					return "", err
				}
				return core.JSONMarshalString(output), nil
			}
		}
	}
	return "", core.E("ide.chat.CallTool", core.Concat("tool not found: ", name), nil)
}

// NewRegister wires the GUI chat subsystem with the shared tool executor.
//
//	core.WithService(chat.NewRegister(cfg.Ide.Chat, sharedExecutor))
func NewRegister(cfg config.Chat, executor ToolExecutor) func(*core.Core) core.Result {
	return gui_chat.Register(func(opts *gui_chat.Options) {
		opts.APIURL = cfg.APIURL
		opts.StorePath = cfg.StorePath
		opts.ToolExecutor = executor
	})
}
