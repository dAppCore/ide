package server

import (
	core "dappco.re/go/core"

	"dappco.re/go/core/ide/pkg/config"
)

type Transport struct {
	Mode string
	Addr string
}

func SelectTransport(cfg config.IDEConfig, mcpOnly bool) (Transport, error) {
	if value := core.Trim(core.Env("MCP_HTTP_ADDR")); value != "" {
		return Transport{Mode: "http", Addr: value}, nil
	}
	if value := core.Trim(core.Env("MCP_ADDR")); value != "" {
		return Transport{Mode: "tcp", Addr: value}, nil
	}
	if value := core.Trim(core.Env("MCP_UNIX_SOCKET")); value != "" {
		return Transport{Mode: "unix", Addr: value}, nil
	}
	if mcpOnly {
		return Transport{Mode: "stdio"}, nil
	}
	switch cfg.Ide.Transport.Mode {
	case "http":
		return Transport{Mode: "http", Addr: cfg.Ide.Transport.HTTPAddr}, nil
	case "tcp":
		return Transport{Mode: "tcp", Addr: cfg.Ide.Transport.TCPAddr}, nil
	case "unix":
		return Transport{Mode: "unix", Addr: cfg.Ide.Transport.UnixSocket}, nil
	default:
		return Transport{Mode: "stdio"}, nil
	}
}
