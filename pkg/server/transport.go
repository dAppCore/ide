package server

import (
	"context"
	"net"
	"net/http"
	"time"

	api "dappco.re/go/api"
	core "dappco.re/go/core"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	"github.com/gin-gonic/gin"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"

	"dappco.re/go/ide/pkg/config"
)

const (
	httpReadHeaderTimeout = 5 * time.Second
	httpReadTimeout       = 10 * time.Second
	httpWriteTimeout      = 10 * time.Second
	httpIdleTimeout       = 60 * time.Second
	httpMaxHeaderBytes    = 1 << 20
	httpMaxBodyBytes      = 10 << 20
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
		transport, err := selectConfiguredTransport(cfg, false)
		if err != nil {
			return Transport{}, err
		}
		if transport.Mode != "" && transport.Mode != "stdio" {
			return transport, nil
		}
		return selectEnvironmentTransport()
	}
	transport, err := selectEnvironmentTransport()
	if err != nil {
		return Transport{}, err
	}
	if transport.Mode != "" {
		return transport, nil
	}
	return selectConfiguredTransport(cfg, false)
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
		return Transport{}, nil
	}
}

func selectEnvironmentTransport() (Transport, error) {
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
	return Transport{}, nil
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
		return core.E("ide.server.SelectTransport", core.Concat("loopback-only ", mode, " transport must bind to localhost or loopback: ", addr), nil)
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
		return core.E("ide.server.SelectRelayTransport", "loopback-only relay transport must bind to localhost or loopback", nil)
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

func serveHardenedHTTP(ctx context.Context, svc *coremcp.Service, addr string, token string) error {
	if svc == nil {
		return core.E("ide.server.ServeHTTP", "mcp service is nil", nil)
	}
	token = core.Trim(token)
	if token == "" {
		return core.E("ide.server.ServeHTTP", "bearer token required for HTTP mode", nil)
	}
	if addr == "" {
		addr = "127.0.0.1:9880"
	}
	if err := validateTransportAddress("http", addr); err != nil {
		return err
	}

	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return core.E("ide.server.ServeHTTP", core.Concat("listen ", addr), err)
	}
	defer listener.Close()

	httpServer := &http.Server{
		Addr:              addr,
		Handler:           hardenedHTTPHandler(svc, token),
		ReadHeaderTimeout: httpReadHeaderTimeout,
		ReadTimeout:       httpReadTimeout,
		WriteTimeout:      httpWriteTimeout,
		IdleTimeout:       httpIdleTimeout,
		MaxHeaderBytes:    httpMaxHeaderBytes,
	}
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = httpServer.Shutdown(shutdownCtx)
	}()
	if err := httpServer.Serve(listener); err != nil && err != http.ErrServerClosed {
		return core.E("ide.server.ServeHTTP", "serve", err)
	}
	return nil
}

func hardenedHTTPHandler(svc *coremcp.Service, token string) http.Handler {
	streamHandler := sdkmcp.NewStreamableHTTPHandler(
		func(_ *http.Request) *sdkmcp.Server {
			return svc.Server()
		},
		&sdkmcp.StreamableHTTPOptions{SessionTimeout: 30 * time.Minute},
	)

	toolBridge := api.NewToolBridge("/v1/tools")
	coremcp.BridgeToAPI(svc, toolBridge)
	toolEngine := gin.New()
	toolBridge.RegisterRoutes(toolEngine.Group("/v1/tools"))

	mux := http.NewServeMux()
	mux.Handle("/mcp", bearerAuth(token, streamHandler))
	mux.Handle("/v1/tools", bearerAuth(token, toolEngine))
	mux.Handle("/v1/tools/", bearerAuth(token, toolEngine))
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})
	return http.MaxBytesHandler(mux, httpMaxBodyBytes)
}

func bearerAuth(token string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != core.Concat("Bearer ", token) {
			http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}
