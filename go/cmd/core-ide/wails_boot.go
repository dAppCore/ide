// SPDX-License-Identifier: EUPL-1.2

package main

import (
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	core "dappco.re/go"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// newWailsApp is the single point in core/ide that constructs the wails
// [*application.App]. The reference is then handed into [gui.Bootstrap] so
// the rest of the codebase only sees gui sub-services through Core IPC.
//
// Library code in pkg/server / pkg/chat / pkg/vi etc. never imports wails
// directly. cmd/core-ide owns the boundary.
//
// The Options surface exercises the full Wails v3 lifecycle/diagnostic
// hooks — panic capture, error/warning piping, single-instance enforcement,
// dev-mode log verbosity, global key bindings (⌘R reload, ⌘⇧R force
// reload, ⌘⌥I devtools). Frontend asset routing differs in dev vs
// production via spaFallbackMiddleware below.
//
// core/ide lives in the system tray. The Mac option
// ApplicationShouldTerminateAfterLastWindowClosed is false — closing the
// IDE window hides it (see WindowClosing hook in pkg/server/gui.go),
// reopening goes through the tray menu. The systray IS the app; windows
// are surfaces it spawns.
func newWailsApp(frontend fs.FS) *application.App {
	devMode := os.Getenv("FRONTEND_DEVSERVER_URL") != ""

	assets := application.AlphaAssets
	if frontend != nil {
		assets = application.AssetOptions{
			Handler:    application.AssetFileServerFS(frontend),
			Middleware: spaFallbackMiddleware(frontend),
		}
	}

	logLevel := slog.LevelWarn
	if devMode {
		logLevel = slog.LevelDebug
	}

	return application.New(application.Options{
		Name:        "core-ide",
		Description: "Core IDE — Lethean operator cockpit",
		Assets:      assets,
		LogLevel:    logLevel,
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: false,
		},
		// SingleInstance prevents two core-ide processes racing for the
		// same MCP bridge port (:9877) and the same window.Service
		// layout file. Second-instance launches surface a warning in
		// the first instance's log; future enhancement: focus the
		// existing window via app.Window.GetByName(name).Focus().
		SingleInstance: &application.SingleInstanceOptions{
			UniqueID: "com.lethean.core-ide",
			OnSecondInstanceLaunch: func(data application.SecondInstanceData) {
				core.Warn("ide.wails.second_instance",
					"args", data.Args,
					"workingDir", data.WorkingDir,
				)
			},
			ExitCode: 0,
		},
		// Global key bindings — wails calls these regardless of which
		// window has focus. ⌘R reloads the SPA, ⌘⇧R forces a hard
		// reload (cache bypass), ⌘⌥I opens the platform devtools
		// (Web Inspector on macOS).
		KeyBindings: map[string]func(window application.Window){
			"cmd+r": func(w application.Window) {
				w.Reload()
			},
			"cmd+shift+r": func(w application.Window) {
				w.ForceReload()
			},
			"cmd+alt+i": func(w application.Window) {
				w.OpenDevTools()
			},
		},
		// PanicHandler catches panics inside Wails-managed goroutines
		// (event handlers, lifecycle hooks). Without it, a panic in a
		// service method would terminate the process silently. We pipe
		// it through core's structured logger.
		PanicHandler: func(p *application.PanicDetails) {
			core.Error("ide.wails.panic",
				"error", p.Error,
				"trace", p.StackTrace,
				"time", p.Time.Format(time.RFC3339),
			)
		},
		// ErrorHandler / WarningHandler receive non-fatal diagnostics
		// from Wails internals. Surfacing them through core means they
		// land in the same log stream as everything else and feed the
		// /sessions panel diagnostics view.
		ErrorHandler: func(err error) {
			core.Error("ide.wails", "error", err)
		},
		WarningHandler: func(msg string) {
			core.Warn("ide.wails", "msg", msg)
		},
		// OnShutdown fires after the user accepts quit but before the
		// process exits. window.Service's save_layout still runs from
		// the gui.go ctx.Done() goroutine because it needs the live
		// coreInstance reference, which isn't accessible from here
		// without leaking lib coupling. This hook is kept as a tracing
		// marker — useful when investigating shutdown ordering bugs.
		OnShutdown: func() {
			core.Warn("ide.wails.shutdown", "phase", "OnShutdown")
		},
	})
}

// spaFallbackMiddleware rewrites navigation requests with no file extension
// to "/" so the asset server returns index.html instead of 404 — the
// standard SPA fallback pattern. Without it, Angular routes (/ide, /library
// etc.) load empty pages.
//
// In dev mode (FRONTEND_DEVSERVER_URL set by `wails3 dev`), the middleware
// is a passthrough — vite owns its own routing AND the special `/@vite/`,
// `/@fs/`, `/@id/` URLs (leaf "client", "env" etc. have no dot, would
// otherwise be rewritten to `/`, breaking ESM imports with the
// `text/html is not a valid JavaScript MIME type` error).
func spaFallbackMiddleware(assets fs.FS) application.Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if os.Getenv("FRONTEND_DEVSERVER_URL") != "" {
				next.ServeHTTP(w, r)
				return
			}
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
