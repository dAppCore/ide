// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"net/http"

	core "dappco.re/go/core"
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

func (shell *GUIShell) Run(ctx context.Context, coreInstance *core.Core) error {
	if shell == nil {
		return core.E("ide.server.GUI", "gui shell is nil", nil)
	}
	app := application.New(application.Options{
		Name:        "core-ide",
		Description: "Core IDE chat shell",
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
		Assets: application.AssetOptions{
			Handler: http.HandlerFunc(serveChatShellAsset),
		},
		Services: []application.Service{
			application.NewService(&chatBridge{core: coreInstance}),
		},
	})
	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Name:      shell.WindowName,
		Title:     shell.Title,
		URL:       shell.WindowURL,
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

func (bridge *chatBridge) Tools(ctx context.Context) (any, error) {
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

func (bridge *chatBridge) ToolManifest(ctx context.Context) (string, error) {
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

func (bridge *chatBridge) CallTool(ctx context.Context, input chatBridgeToolCall) (string, error) {
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

func resultError(scope string, value any) error {
	if err, ok := value.(error); ok {
		return err
	}
	return core.E(scope, "action failed", nil)
}

func serveChatShellAsset(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(chatShellHTML))
}

const chatShellHTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>core/ide</title>
  <script type="module" src="/wails/runtime.js"></script>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #101418; color: #eef3f7; }
    main { min-height: 100vh; display: grid; grid-template-rows: auto 1fr auto; }
    header, footer { padding: 16px 22px; border-color: #26313a; }
    header { border-bottom: 1px solid #26313a; }
    footer { border-top: 1px solid #26313a; color: #91a1ad; }
    section { padding: 22px; }
    h1 { margin: 0; font-size: 18px; font-weight: 650; }
    p { margin: 8px 0 0; line-height: 1.45; color: #b8c4ce; }
  </style>
</head>
<body>
  <main>
    <header><h1>core/ide</h1><p>Chat service and MCP tools are mounted in the same Core runtime.</p></header>
    <section id="chat-root"></section>
    <footer id="tool-count">Loading tools...</footer>
  </main>
  <script type="module">
    const footer = document.getElementById('tool-count');
    window.addEventListener('DOMContentLoaded', async () => {
      try {
        const services = window.runtime?.Services;
        const tools = services?.chatBridge?.Tools ? await services.chatBridge.Tools() : [];
        footer.textContent = String(tools && tools.length ? tools.length : 0) + ' tools available';
      } catch (error) {
        footer.textContent = 'Chat bridge unavailable';
      }
    });
  </script>
</body>
</html>`
