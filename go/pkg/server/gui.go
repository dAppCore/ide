// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"

	core "dappco.re/go"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type GUIShell struct {
	WindowName string
	WindowURL  string
	Title      string
}

type chatBridge struct {
	core *core.Core
}

type chatBridgeToolCall struct {
	Name      string         `json:"name"`
	Arguments map[string]any `json:"arguments,omitempty"`
}

// NewGUIShell records the Wails window shape used by default GUI mode.
func NewGUIShell() *GUIShell {
	return &GUIShell{
		WindowName: "core-ide-chat",
		WindowURL:  "/",
		Title:      "core/ide",
	}
}

func (shell *GUIShell) Run(
	ctx context.Context,
	coreInstance *core.Core,
) error {
	if shell == nil {
		return core.E("ide.server.GUI", "gui shell is nil", nil)
	}
	app := application.New(application.Options{
		Name:        "core-ide",
		Description: "Core IDE chat shell",
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
		Assets: application.AlphaAssets,
		Services: []application.Service{
			application.NewService(&chatBridge{core: coreInstance}),
		},
	})
	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Name:      shell.WindowName,
		Title:     shell.Title,
		Width:     1180,
		Height:    780,
		MinWidth:  720,
		MinHeight: 520,
	})
	go func() {
		<-ctx.Done()
		app.Quit()
	}()
	return app.Run()
}

func (bridge *chatBridge) Tools(
	ctx context.Context,
) (any, error) {
	_ = ctx
	if bridge == nil || bridge.core == nil {
		return nil, core.E("ide.server.GUI.Tools", "core is nil", nil)
	}
	result := bridge.core.Action("gui.chat.tools").Run(context.Background(), core.Options{})
	if !result.OK {
		return nil, resultError("ide.server.GUI.Tools", result.Value)
	}
	return result.Value, nil
}

func (bridge *chatBridge) ToolManifest(
	ctx context.Context,
) (string, error) {
	_ = ctx
	if bridge == nil || bridge.core == nil {
		return "", core.E("ide.server.GUI.ToolManifest", "core is nil", nil)
	}
	result := bridge.core.Action("gui.chat.tool_manifest").Run(context.Background(), core.Options{})
	if !result.OK {
		return "", resultError("ide.server.GUI.ToolManifest", result.Value)
	}
	text, _ := result.Value.(string)
	return text, nil
}

func (bridge *chatBridge) CallTool(
	ctx context.Context,
	input chatBridgeToolCall,
) (string, error) {
	if bridge == nil || bridge.core == nil {
		return "", core.E("ide.server.GUI.CallTool", "core is nil", nil)
	}
	result := bridge.core.Action("gui.chat.call_tool").Run(ctx, core.NewOptions(
		core.Option{Key: "name", Value: input.Name},
		core.Option{Key: "arguments", Value: input.Arguments},
	))
	if !result.OK {
		return "", resultError("ide.server.GUI.CallTool", result.Value)
	}
	text, _ := result.Value.(string)
	return text, nil
}

func resultError(
	scope string,
	value any,
) error {
	if err, ok := value.(error); ok {
		return err
	}
	return core.E(scope, "action failed", nil)
}


