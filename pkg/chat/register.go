package chat

import (
	"context"
	"sort"

	core "dappco.re/go/core"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	guimcp "forge.lthn.ai/core/gui/pkg/mcp"

	"dappco.re/go/core/ide/pkg/config"
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

type Service struct {
	*core.ServiceRuntime[config.Chat]
	executor ToolExecutor
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

func NewRegister(cfg config.Chat, executor ToolExecutor) func(*core.Core) core.Result {
	return func(c *core.Core) core.Result {
		return core.Result{Value: &Service{ServiceRuntime: core.NewServiceRuntime[config.Chat](c, cfg), executor: executor}, OK: true}
	}
}

func (s *Service) OnStartup(context.Context) core.Result {
	return core.Result{OK: true}
}
