// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"

	core "dappco.re/go"
	vipkg "dappco.re/go/ide/pkg/vi"
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

// viBridge exposes the vi.Service to the Wails frontend. Methods here generate
// TypeScript bindings the Angular Vi Control Panel calls — Status / Briefs /
// Sites / Activity. Per the desktop convergence RFC §1.3, "expect data to come
// from the Go side via Wails bindings."
type viBridge struct {
	core *core.Core
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
			application.NewService(&viBridge{core: coreInstance}),
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

// Status returns the live Vi presence state (connected, latency, watching, pending).
//
//	const status = await ViBridge.Status();
func (bridge *viBridge) Status(
	ctx context.Context,
) (vipkg.ViStatus, error) {
	_ = ctx
	svc, err := bridge.service()
	if err != nil {
		return vipkg.ViStatus{}, err
	}
	return svc.Status(), nil
}

// Briefs returns the current brief feed — what Vi has surfaced for attention.
//
//	const briefs = await ViBridge.Briefs();
func (bridge *viBridge) Briefs(
	ctx context.Context,
) ([]vipkg.Brief, error) {
	_ = ctx
	svc, err := bridge.service()
	if err != nil {
		return nil, err
	}
	return svc.Briefs(), nil
}

// Sites returns the watched-site list with status / uptime / response.
//
//	const sites = await ViBridge.Sites();
func (bridge *viBridge) Sites(
	ctx context.Context,
) ([]vipkg.Site, error) {
	_ = ctx
	svc, err := bridge.service()
	if err != nil {
		return nil, err
	}
	return svc.Sites(), nil
}

// Activity returns the activity feed — Vi's narration interleaved with the
// operator's recent actions.
//
//	const activity = await ViBridge.Activity();
func (bridge *viBridge) Activity(
	ctx context.Context,
) ([]vipkg.ActivityItem, error) {
	_ = ctx
	svc, err := bridge.service()
	if err != nil {
		return nil, err
	}
	return svc.Activity(), nil
}

func (bridge *viBridge) service() (*vipkg.Service, error) {
	if bridge == nil || bridge.core == nil {
		return nil, core.E("ide.server.GUI.Vi", "core is nil", nil)
	}
	svc, ok := core.ServiceFor[*vipkg.Service](bridge.core, "vi")
	if !ok || svc == nil {
		return nil, core.E("ide.server.GUI.Vi", "vi service not registered", nil)
	}
	return svc, nil
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
