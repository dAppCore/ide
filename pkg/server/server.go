package server

import (
	"context"
	"net/http"
	"os"
	"time"

	core "dappco.re/go/core"
	coreio "dappco.re/go/core/io"
	"dappco.re/go/core/process"
	"dappco.re/go/core/ws"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	guimcp "forge.lthn.ai/core/gui/pkg/mcp"

	aipkg "dappco.re/go/core/ide/pkg/ai"
	brainpkg "dappco.re/go/core/ide/pkg/brain"
	chatpkg "dappco.re/go/core/ide/pkg/chat"
	"dappco.re/go/core/ide/pkg/config"
	marketplacepkg "dappco.re/go/core/ide/pkg/marketplace"
	navigatepkg "dappco.re/go/core/ide/pkg/navigate"
	storepkg "dappco.re/go/core/ide/pkg/store"
	subagentpkg "dappco.re/go/core/ide/pkg/subagent"
	workspacepkg "dappco.re/go/core/ide/pkg/workspace"
)

type Server struct {
	core      *core.Core
	mcp       *coremcp.Service
	hub       *ws.Hub
	transport Transport
	relay     RelayTransport
	authToken string
}

func Compose(options Options) (*Server, error) {
	cfg := options.Config.WithDefaults()
	medium := options.Medium
	if medium == nil {
		medium = coreio.Local
	}
	authToken := core.Trim(cfg.Ide.Transport.Token)
	if authToken == "" {
		authToken = core.Trim(core.Env("MCP_AUTH_TOKEN"))
	}
	hub := newRelayHub(authToken)
	guiExecutor := chatpkg.NewExecutor(nil, nil)

	services := []core.CoreOption{
		core.WithName("ws", func(_ *core.Core) core.Result {
			return core.Result{Value: hub, OK: true}
		}),
		core.WithService(process.Register),
		core.WithService(storepkg.Register),
		core.WithService(aipkg.Register),
		core.WithName("workspace", func(c *core.Core) core.Result {
			processService, _ := core.ServiceFor[*process.Service](c, "process")
			return core.Result{Value: workspacepkg.New(cfg.Ide.Workspace, medium, processService), OK: true}
		}),
		core.WithName("brain", func(c *core.Core) core.Result {
			storeService, _ := core.ServiceFor[*storepkg.Service](c, "store")
			workspaceService, _ := core.ServiceFor[*workspacepkg.Subsystem](c, "workspace")
			return core.Result{Value: brainpkg.New(cfg.Ide.Brain, medium, storeService.Store, workspaceService), OK: true}
		}),
		core.WithName("subagent", func(_ *core.Core) core.Result {
			return core.Result{Value: subagentpkg.New(cfg.Ide.Subagent, hub, authToken), OK: true}
		}),
		core.WithName("navigate", func(c *core.Core) core.Result {
			return core.Result{Value: navigatepkg.New(cfg.Ide.Navigate, c), OK: true}
		}),
		core.WithName("marketplace", func(_ *core.Core) core.Result {
			return core.Result{Value: marketplacepkg.New(cfg.Ide.Marketplace), OK: true}
		}),
		core.WithService(coremcp.Register),
	}
	if options.GUI {
		services = append(services, core.WithName("gui_mcp", func(c *core.Core) core.Result {
			return core.Result{Value: guimcp.New(c), OK: true}
		}))
	}

	c := core.New(services...)
	if options.GUI && config.BoolValue(cfg.Ide.Chat.Enabled, true) {
		result := chatpkg.NewRegister(cfg.Ide.Chat, guiExecutor)(c)
		if !result.OK {
			if err, ok := result.Value.(error); ok {
				return nil, err
			}
			return nil, core.E("ide.server.Compose", "register chat", nil)
		}
		if result.Value != nil {
			if registerErr := c.RegisterService("chat", result.Value); !registerErr.OK {
				if err, ok := registerErr.Value.(error); ok {
					return nil, err
				}
				return nil, core.E("ide.server.Compose", "register chat service", nil)
			}
		}
	}

	workspaceService, _ := core.ServiceFor[*workspacepkg.Subsystem](c, "workspace")
	brainService, _ := core.ServiceFor[*brainpkg.Subsystem](c, "brain")
	subagentService, _ := core.ServiceFor[*subagentpkg.Subsystem](c, "subagent")
	navigateService, _ := core.ServiceFor[*navigatepkg.Subsystem](c, "navigate")
	marketplaceService, _ := core.ServiceFor[*marketplacepkg.Subsystem](c, "marketplace")
	if options.Medium != nil && options.Medium != coreio.Local {
		marketplaceService.AttachMedium(medium)
	}
	brainService.RegisterActions(c)
	workspaceService.RegisterActions(c)
	subagentService.RegisterActions(c)
	navigateService.RegisterActions(c)
	marketplaceService.RegisterActions(c)

	mcpService, ok := core.ServiceFor[*coremcp.Service](c, "mcp")
	if !ok {
		return nil, core.E("ide.server.Compose", "mcp service not registered", nil)
	}
	if options.GUI {
		guiSubsystem, _ := core.ServiceFor[*guimcp.Subsystem](c, "gui_mcp")
		guiExecutor.Attach(guiSubsystem, mcpService)
	}

	transport, err := SelectTransport(cfg, options.MCP, options.PreferConfiguredTransport)
	if err != nil {
		return nil, err
	}
	return &Server{
		core:      c,
		mcp:       mcpService,
		hub:       hub,
		transport: transport,
		relay:     SelectRelayTransport(cfg, authToken, hub.Handler()),
		authToken: authToken,
	}, nil
}

func (s *Server) Run(ctx context.Context) error {
	go s.hub.Run(ctx)
	var relayServer *http.Server
	if s.relay.Enabled {
		relayServer = &http.Server{
			Addr:              s.relay.Addr,
			Handler:           s.relay.Handler,
			ReadHeaderTimeout: 5 * time.Second,
			ReadTimeout:       10 * time.Second,
			WriteTimeout:      10 * time.Second,
			IdleTimeout:       60 * time.Second,
			MaxHeaderBytes:    1 << 20,
		}
		go func() {
			<-ctx.Done()
			_ = relayServer.Shutdown(context.Background())
		}()
		go func() {
			if err := relayServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
				core.Error("ide.server.Run", "relay", err)
			}
		}()
	}
	if result := s.core.ServiceStartup(ctx, nil); !result.OK {
		if err, ok := result.Value.(error); ok {
			return err
		}
		return core.E("ide.server.Run", "service startup failed", nil)
	}
	defer s.core.ServiceShutdown(context.Background())

	switch s.transport.Mode {
	case "http":
		token := core.Trim(s.authToken)
		if token == "" {
			token = core.Trim(core.Env("MCP_AUTH_TOKEN"))
		}
		if token == "" {
			return core.E("ide.server.Run", "http transport requires a bearer token", nil)
		}
		restoreToken, hadToken := os.LookupEnv("MCP_AUTH_TOKEN")
		if err := os.Setenv("MCP_AUTH_TOKEN", token); err != nil {
			return core.E("ide.server.Run", "set MCP_AUTH_TOKEN", err)
		}
		defer func() {
			if hadToken {
				_ = os.Setenv("MCP_AUTH_TOKEN", restoreToken)
				return
			}
			_ = os.Unsetenv("MCP_AUTH_TOKEN")
		}()
		return s.mcp.ServeHTTP(ctx, s.transport.Addr)
	case "tcp":
		return s.mcp.ServeTCP(ctx, s.transport.Addr)
	case "unix":
		return s.mcp.ServeUnix(ctx, s.transport.Addr)
	default:
		return s.mcp.ServeStdio(ctx)
	}
}

func newRelayHub(token string) *ws.Hub {
	token = core.Trim(token)
	if token == "" {
		return ws.NewHub()
	}
	return ws.NewHubWithConfig(ws.HubConfig{
		Authenticator: ws.NewAPIKeyAuth(map[string]string{token: "core-ide"}),
	})
}

func (s *Server) Core() *core.Core {
	return s.core
}

func (s *Server) MCP() *coremcp.Service {
	return s.mcp
}
