package mcp

import (
	"context"

	core "dappco.re/go"
)

type ToolDescriptor struct {
	Name        string
	Description string
	InputSchema any
}

type Subsystem struct {
	core *core.Core
}

func New(coreInstance *core.Core) *Subsystem {
	return &Subsystem{core: coreInstance}
}

func (s *Subsystem) Manifest() []ToolDescriptor {
	_ = s
	return nil
}

func (s *Subsystem) CallTool(ctx context.Context, name string, arguments map[string]any) (string, error) {
	_ = ctx
	_ = arguments
	if s == nil || s.core == nil {
		return "", core.E("gui.mcp.CallTool", "tool not found: "+name, nil)
	}
	if result := s.core.Action(name).Run(ctx, core.Options{}); result.OK {
		return core.JSONMarshalString(result.Value), nil
	}
	return "", core.E("gui.mcp.CallTool", "tool not found: "+name, nil)
}
