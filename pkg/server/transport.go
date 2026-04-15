package server

import (
	"net"

	core "dappco.re/go/core"

	"dappco.re/go/core/ide/pkg/config"
)

type Transport struct {
	Mode string
	Addr string
}

func SelectTransport(cfg config.IDEConfig, mcpOnly bool) (Transport, error) {
	if value := core.Trim(core.Env("MCP_HTTP_ADDR")); value != "" {
		if err := validateTransportAddress("http", value); err != nil {
			return Transport{}, err
		}
		return Transport{Mode: "http", Addr: value}, nil
	}
	if value := core.Trim(core.Env("MCP_ADDR")); value != "" {
		if err := validateTransportAddress("tcp", value); err != nil {
			return Transport{}, err
		}
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
		if err := validateTransportAddress("http", cfg.Ide.Transport.HTTPAddr); err != nil {
			return Transport{}, err
		}
		return Transport{Mode: "http", Addr: cfg.Ide.Transport.HTTPAddr}, nil
	case "tcp":
		if err := validateTransportAddress("tcp", cfg.Ide.Transport.TCPAddr); err != nil {
			return Transport{}, err
		}
		return Transport{Mode: "tcp", Addr: cfg.Ide.Transport.TCPAddr}, nil
	case "unix":
		return Transport{Mode: "unix", Addr: cfg.Ide.Transport.UnixSocket}, nil
	default:
		return Transport{Mode: "stdio"}, nil
	}
}

func validateTransportAddress(mode, addr string) error {
	if core.Trim(addr) == "" {
		return nil
	}
	switch mode {
	case "http", "tcp":
		if _, err := net.ResolveTCPAddr("tcp", addr); err != nil {
			return core.E("ide.server.SelectTransport", core.Concat("invalid ", mode, " address: ", addr), err)
		}
	}
	return nil
}
