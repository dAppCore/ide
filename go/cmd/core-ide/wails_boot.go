// SPDX-License-Identifier: EUPL-1.2

package main

import (
	"io/fs"
	"net/http"
	"os"
	"strings"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// newWailsApp is the single point in core/ide that constructs the wails
// [*application.App]. The reference is then handed into [gui.Bootstrap] so
// the rest of the codebase only sees gui sub-services through Core IPC.
//
// Library code in pkg/server / pkg/chat / pkg/vi etc. never imports wails
// directly. cmd/core-ide owns the boundary.
func newWailsApp(frontend fs.FS) *application.App {
	assets := application.AlphaAssets
	if frontend != nil {
		assets = application.AssetOptions{
			Handler:    application.AssetFileServerFS(frontend),
			Middleware: spaFallbackMiddleware(frontend),
		}
	}
	return application.New(application.Options{
		Name:        "core-ide",
		Description: "Core IDE",
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
		Assets: assets,
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
