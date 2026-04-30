package server

import (
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
	extraCoreOptions          []core.CoreOption
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
