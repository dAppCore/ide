package server

import (
	"io/fs"

	coreio "dappco.re/go/io"

	core "dappco.re/go"
	"dappco.re/go/ide/pkg/config"
)

type Options struct {
	Config                    config.IDEConfig
	GUI                       bool
	Medium                    coreio.Medium
	MCP                       bool
	PreferConfiguredTransport bool
	// Frontend is the production asset bundle served to the Wails webview.
	// When nil, the GUI falls back to the Wails alpha demo assets — useful
	// for go test runs and dev mode where wails3 dev proxies the Vite server.
	Frontend fs.FS
	// GUIServices is the slice returned by gui.Bootstrap(app). The cmd entry
	// (the only place that imports wails) constructs the wails app and hands
	// the registration plan in here as opaque CoreOptions. Library code in
	// pkg/server then only sees the registered services through Core IPC.
	GUIServices []core.CoreOption
	// WailsApp is opaque (typed `any`) so this file doesn't have to import
	// wails. gui.go (the lone wails-importing file in pkg/server) casts it.
	// The cmd entry sets this to the *application.App it constructed.
	WailsApp         any
	extraCoreOptions []core.CoreOption
}

// srv, err := NewServer(Options{Config: cfg, GUI: true, MCP: false})
func (options Options) Register() func(*core.Core) core.Result {
	return func(_ *core.Core) core.Result {
		server, err := NewServer(options)
		if err != nil {
			return core.Fail(err)
		}
		return core.Ok(server)
	}
}
