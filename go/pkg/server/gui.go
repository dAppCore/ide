// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"io/fs"
	"net/http"
	"strings"
	"time"

	core "dappco.re/go"
	"dappco.re/go/gui/pkg/window"
	vipkg "dappco.re/go/ide/pkg/vi"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// spaFallbackMiddleware rewrites navigation requests (paths with no file
// extension, e.g. /ide, /library, /account) to "/" so the asset server serves
// index.html instead of returning 404. Without this, Wails AssetFileServerFS
// 404s on every Angular SPA route — webview_navigate then leaves the user with
// an empty Wails page.
func spaFallbackMiddleware(assets fs.FS) application.Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodGet && r.Method != http.MethodHead {
				next.ServeHTTP(w, r)
				return
			}
			path := strings.TrimPrefix(r.URL.Path, "/")
			if path == "" {
				next.ServeHTTP(w, r)
				return
			}
			lastSlash := strings.LastIndex(path, "/")
			leaf := path[lastSlash+1:]
			if strings.Contains(leaf, ".") {
				// Has an extension (.js, .css, .png) — let asset server handle the 404.
				next.ServeHTTP(w, r)
				return
			}
			if f, err := assets.Open(path); err == nil {
				_ = f.Close()
				next.ServeHTTP(w, r)
				return
			}
			r2 := r.Clone(r.Context())
			r2.URL.Path = "/"
			next.ServeHTTP(w, r2)
		})
	}
}

type GUIShell struct {
	WindowName string
	WindowURL  string
	Title      string
	// Frontend is the bundled web assets served to the webview. When nil,
	// the GUI falls back to Wails alpha demo assets (so go test still runs).
	Frontend fs.FS
	// App is the pre-constructed wails application supplied by the cmd
	// entrypoint. When non-nil, GUIShell.Run uses it directly instead of
	// constructing one. Lets cmd/core-ide own the single wails import in
	// core/ide and pass the app reference through gui.Bootstrap into Core.
	App *application.App
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

// SetWailsApp accepts an opaque wails app reference (kept opaque at the
// pkg/server boundary) and stores it. This is the lone wails-aware setter
// in pkg/server; it's how cmd/core-ide threads the constructed app through.
func (shell *GUIShell) SetWailsApp(app any) {
	if app == nil {
		return
	}
	if a, ok := app.(*application.App); ok {
		shell.App = a
	}
}

func (shell *GUIShell) Run(
	ctx context.Context,
	coreInstance *core.Core,
) error {
	if shell == nil {
		return core.E("ide.server.GUI", "gui shell is nil", nil)
	}
	app := shell.App
	if app == nil {
		// Fallback path for legacy callers / tests — construct the app
		// here. cmd/core-ide builds it explicitly and threads it through.
		assets := application.AlphaAssets
		if shell.Frontend != nil {
			assets = application.AssetOptions{
				Handler:    application.AssetFileServerFS(shell.Frontend),
				Middleware: spaFallbackMiddleware(shell.Frontend),
			}
		}
		app = application.New(application.Options{
			Name:        "core-ide",
			Description: "Core IDE chat shell",
			Mac: application.MacOptions{
				ApplicationShouldTerminateAfterLastWindowClosed: true,
			},
			Assets: assets,
		})
	}
	// Wails-side services that bridge JS calls to Core. Registered late
	// because they need the constructed coreInstance, which only exists
	// after server.NewServer. Wails accepts services up until app.Run().
	app.RegisterService(application.NewService(&chatBridge{core: coreInstance}))
	app.RegisterService(application.NewService(&viBridge{core: coreInstance}))

	// Open the IDE window through window.Service so the manager tracks it
	// (taskOpenWindow → trackWindow). Direct app.Window.NewWithOptions(...)
	// would bypass tracking and break save_layout / restore_layout.
	openResult := coreInstance.Action("window.open").Run(ctx, core.NewOptions(
		core.Option{Key: "task", Value: window.TaskOpenWindow{
			Window: &window.Window{
				Name:      shell.WindowName,
				Title:     shell.Title,
				URL:       shell.WindowURL,
				Width:     1180,
				Height:    780,
				MinWidth:  720,
				MinHeight: 520,
			},
		}},
	))
	if !openResult.OK {
		core.Print(core.Stderr(), "ide.server.GUI: window.open failed: %v\n", openResult.Value)
	}

	// Restore the saved layout (if any) — done after window.open so the
	// tracked window is the target. Save layout before quit so positions
	// carry across restarts. Storage is core/gui window.Service's
	// LayoutManager → DIR_CONFIG/Core/layouts.json.
	go func() {
		// Wait for the wails window to initialise before restoring; without
		// this the SetPosition/SetSize calls race with wails's own startup.
		select {
		case <-ctx.Done():
			return
		case <-time.After(500 * time.Millisecond):
		}
		result := coreInstance.Action("window.restore_layout").Run(ctx, core.NewOptions(
			core.Option{Key: "task", Value: window.TaskRestoreLayout{Name: "default"}},
		))
		if !result.OK {
			core.Print(core.Stderr(), "ide.server.GUI: restore_layout: %v\n", result.Value)
		}
	}()
	go func() {
		<-ctx.Done()
		result := coreInstance.Action("window.save_layout").Run(context.Background(), core.NewOptions(
			core.Option{Key: "task", Value: window.TaskSaveLayout{Name: "default"}},
		))
		if !result.OK {
			core.Print(core.Stderr(), "ide.server.GUI: save_layout failed: %v\n", result.Value)
		}
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
