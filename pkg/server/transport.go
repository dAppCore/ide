package server

import (
	"net"
	"net/http"

	core "dappco.re/go/core"

	"dappco.re/go/core/ide/pkg/config"
)

type Transport struct {
	Mode string
	Addr string
}

type RelayTransport struct {
	Enabled bool
	Addr    string
	Path    string
	Handler http.Handler
}

// transport, err := SelectTransport(cfg, true, false)
func SelectTransport(cfg config.IDEConfig, mcpOnly bool, preferConfigured bool) (Transport, error) {
	if mcpOnly {
		return Transport{Mode: "stdio"}, nil
	}
	if preferConfigured {
		return selectConfiguredTransport(cfg, mcpOnly)
	}
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
	return selectConfiguredTransport(cfg, mcpOnly)
}

func selectConfiguredTransport(cfg config.IDEConfig, mcpOnly bool) (Transport, error) {
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

// relay := SelectRelayTransport(cfg, token, handler)
func SelectRelayTransport(cfg config.IDEConfig, token string, handler http.Handler) RelayTransport {
	addr := core.Trim(cfg.Ide.Subagent.Relay.Addr)
	path := core.Trim(cfg.Ide.Subagent.Relay.Path)
	if !config.BoolValue(cfg.Ide.Subagent.Enabled, true) || core.Trim(token) == "" || addr == "" || path == "" || handler == nil {
		return RelayTransport{}
	}
	if err := validateRelayTransportAddress(addr); err != nil {
		return RelayTransport{}
	}
	if !core.HasPrefix(path, "/") {
		path = core.Concat("/", path)
	}
	mux := http.NewServeMux()
	mux.Handle(path, handler)
	return RelayTransport{
		Enabled: true,
		Addr:    addr,
		Path:    path,
		Handler: mux,
	}
}

func validateTransportAddress(mode, addr string) error {
	addr = core.Trim(addr)
	if addr == "" {
		return nil
	}
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return core.E("ide.server.SelectTransport", core.Concat("invalid ", mode, " address: ", addr), err)
	}
	if !isLoopbackHost(host) {
		return core.E("ide.server.SelectTransport", core.Concat(mode, " transport must bind to localhost or loopback: ", addr), nil)
	}
	switch mode {
	case "http", "tcp":
		if _, err := net.ResolveTCPAddr("tcp", addr); err != nil {
			return core.E("ide.server.SelectTransport", core.Concat("invalid ", mode, " address: ", addr), err)
		}
	}
	return nil
}

func validateRelayTransportAddress(addr string) error {
	if core.Trim(addr) == "" {
		return nil
	}
	if err := validateTransportAddress("http", addr); err != nil {
		return err
	}
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return core.E("ide.server.SelectRelayTransport", core.Concat("invalid relay address: ", addr), err)
	}
	if !isLoopbackHost(host) {
		return core.E("ide.server.SelectRelayTransport", "relay transport must bind to localhost or loopback", nil)
	}
	return nil
}

func isLoopbackHost(host string) bool {
	host = core.Trim(host)
	switch host {
	case "localhost":
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}
