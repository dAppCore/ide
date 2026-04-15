package server

import (
	coreio "dappco.re/go/core/io"

	core "dappco.re/go/core"
	"dappco.re/go/core/ide/pkg/config"
)

type Options struct {
	Config                    config.IDEConfig
	GUI                       bool
	Medium                    coreio.Medium
	MCP                       bool
	PreferConfiguredTransport bool
}

// srv, err := NewServer(Options{Config: cfg, GUI: true, MCP: false})
func (options Options) Register() func(*core.Core) core.Result {
	return func(_ *core.Core) core.Result {
		server, err := NewServer(options)
		if err != nil {
			return core.Result{Value: err, OK: false}
		}
		return core.Result{Value: server, OK: true}
	}
}
