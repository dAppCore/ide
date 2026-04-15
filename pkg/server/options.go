package server

import (
	coreio "dappco.re/go/core/io"

	"dappco.re/go/core/ide/pkg/config"
)

type Options struct {
	Config                    config.IDEConfig
	GUI                       bool
	Medium                    coreio.Medium
	MCP                       bool
	PreferConfiguredTransport bool
}
