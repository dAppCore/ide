package server

import (
	"context"
	"net/http"
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

type runtimeParts struct {
	core      *core.Core
	mcp       *coremcp.Service
	hub       *ws.Hub
	transport Transport
	relay     RelayTransport
	authToken string
}

//   srv, err := NewServer(Options{Config: cfg, GUI: true, MCP: false})
func NewServer(options Options) (*Server, error) {
	parts, err := composeRuntime(options)
	if err != nil {
		return nil, err
	}
	return &Server{
		core:      parts.core,
		mcp:       parts.mcp,
		hub:       parts.hub,
		transport: parts.transport,
		relay:     parts.relay,
		authToken: parts.authToken,
	}, nil
}

// Compose builds the Core graph and registers all IDE subsystems.
//
//   coreInstance, err := Compose(Options{Config: cfg, GUI: true, MCP: false})
func Compose(options Options) (*core.Core, error) {
	parts, err := composeRuntime(options)
	if err != nil {
		return nil, err
	}
	return parts.core, nil
}

func composeRuntime(options Options) (*runtimeParts, error) {
	cfg := options.Config.WithDefaults()
	medium := options.Medium
	if medium == nil {
		medium = coreio.Local
	}
	enableGUI := options.GUI && !options.MCP
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
			aiService, _ := core.ServiceFor[*aipkg.Service](c, "ai")
			return core.Result{Value: brainpkg.New(cfg.Ide.Brain, medium, storeService.Store, workspaceService, aiService), OK: true}
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
	if enableGUI {
		services = append(services, core.WithName("gui_mcp", func(c *core.Core) core.Result {
			return core.Result{Value: guimcp.New(c), OK: true}
		}))
	}

	c := core.New(services...)

	workspaceService, _ := core.ServiceFor[*workspacepkg.Subsystem](c, "workspace")
	brainService, _ := core.ServiceFor[*brainpkg.Subsystem](c, "brain")
	subagentService, _ := core.ServiceFor[*subagentpkg.Subsystem](c, "subagent")
	navigateService, _ := core.ServiceFor[*navigatepkg.Subsystem](c, "navigate")
	marketplaceService, _ := core.ServiceFor[*marketplacepkg.Subsystem](c, "marketplace")
	aiService, _ := core.ServiceFor[*aipkg.Service](c, "ai")
	if options.Medium != nil && options.Medium != coreio.Local {
		marketplaceService.AttachMedium(medium)
	}
	marketplaceService.AttachAI(aiService)
	brainService.RegisterActions(c)
	workspaceService.RegisterActions(c)
	subagentService.RegisterActions(c)
	navigateService.RegisterActions(c)
	marketplaceService.RegisterActions(c)

	mcpService, ok := core.ServiceFor[*coremcp.Service](c, "mcp")
	if !ok {
		return nil, core.E("ide.server.Compose", "mcp service not registered", nil)
	}
	mcpService.SetAPIToken(authToken)
	if enableGUI {
		guiSubsystem, _ := core.ServiceFor[*guimcp.Subsystem](c, "gui_mcp")
		guiExecutor.Attach(guiSubsystem, mcpService)
	}
	if enableGUI && config.BoolValue(cfg.Ide.Chat.Enabled, true) {
		result := chatpkg.NewRegister(cfg.Ide.Chat, chatExecutor(cfg.Ide.Chat, guiExecutor, mcpService))(c)
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

	transport, err := SelectTransport(cfg, options.MCP, options.PreferConfiguredTransport)
	if err != nil {
		return nil, err
	}
	return &runtimeParts{
		core:      c,
		mcp:       mcpService,
		hub:       hub,
		transport: transport,
		relay:     SelectRelayTransport(cfg, authToken, hub.Handler()),
		authToken: authToken,
	}, nil
}

func chatExecutor(cfg config.Chat, shared *chatpkg.Executor, mcpService *coremcp.Service) chatpkg.ToolExecutor {
	if core.Trim(cfg.ToolExecutor) == "mcp_self" {
		return chatpkg.NewExecutor(nil, mcpService)
	}
	return shared
}

func (s *Server) Run(ctx context.Context) error {
	if s.transport.Mode == "http" && core.Trim(s.authToken) == "" {
		return core.E("ide.server.Run", "http transport requires a bearer token", nil)
	}
	runtimeCtx, cancelRuntime := context.WithCancel(ctx)
	defer cancelRuntime()

	go s.hub.Run(runtimeCtx)
	if result := s.core.ServiceStartup(runtimeCtx, nil); !result.OK {
		if err, ok := result.Value.(error); ok {
			return err
		}
		return core.E("ide.server.Run", "service startup failed", nil)
	}
	defer s.core.ServiceShutdown(context.Background())

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
			<-runtimeCtx.Done()
			_ = relayServer.Shutdown(context.Background())
		}()
		go func() {
			if err := relayServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
				core.Error("ide.server.Run", "relay", err)
			}
		}()
	}

	switch s.transport.Mode {
	case "http":
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
