package server

import (
	"context"
	"net/http"
	"time"

	core "dappco.re/go"
	guimcp "dappco.re/go/gui/pkg/mcp"
	coreio "dappco.re/go/io"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	"dappco.re/go/process"
	"dappco.re/go/ws"

	aipkg "dappco.re/go/ide/pkg/ai"
	brainpkg "dappco.re/go/ide/pkg/brain"
	chatpkg "dappco.re/go/ide/pkg/chat"
	"dappco.re/go/ide/pkg/config"
	marketplacepkg "dappco.re/go/ide/pkg/marketplace"
	navigatepkg "dappco.re/go/ide/pkg/navigate"
	storepkg "dappco.re/go/ide/pkg/store"
	subagentpkg "dappco.re/go/ide/pkg/subagent"
	vipkg "dappco.re/go/ide/pkg/vi"
	workspacepkg "dappco.re/go/ide/pkg/workspace"
)

type Server struct {
	core      *core.Core
	mcp       *coremcp.Service
	hub       *ws.Hub
	transport Transport
	relay     RelayTransport
	gui       *GUIShell
	terminal  *TerminalServer
	authToken string
}

type runtimeParts struct {
	core      *core.Core
	mcp       *coremcp.Service
	hub       *ws.Hub
	transport Transport
	relay     RelayTransport
	gui       *GUIShell
	terminal  *TerminalServer
	authToken string
}

// srv, err := NewServer(Options{Config: cfg, GUI: true, MCP: false})
func NewServer(
	options Options,
) (*Server, error) {
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
		gui:       parts.gui,
		terminal:  parts.terminal,
		authToken: parts.authToken,
	}, nil
}

// coreInstance, err := Compose(Options{Config: cfg, GUI: true, MCP: false})
func Compose(
	options Options,
) (*core.Core, error) {
	parts, err := composeRuntime(options)
	if err != nil {
		return nil, err
	}
	return parts.core, nil
}

func composeRuntime(
	options Options,
) (*runtimeParts, error) {
	return composeRuntimeMode(options, runtimeMode{})
}

func composeRuntimeMode(
	options Options,
	mode runtimeMode,
) (*runtimeParts, error) {
	cfg := options.Config.WithDefaults()
	medium := options.Medium
	if medium == nil {
		medium = coreio.Local
	}
	enableGUI := !mode.conclave && options.GUI && !options.MCP
	authToken := core.Trim(cfg.Ide.Transport.Token)
	if authToken == "" {
		authToken = core.Trim(core.Env("MCP_AUTH_TOKEN"))
	}
	hub := newRelayHub(authToken)
	guiExecutor := chatpkg.NewExecutor(nil, nil)
	var guiShell *GUIShell
	if enableGUI {
		guiShell = NewGUIShell()
		guiShell.Frontend = options.Frontend
		// options.WailsApp is opaque (any) — gui.go does the wails type
		// assertion. We just hand the reference through.
		guiShell.SetWailsApp(options.WailsApp)
	}

	services := []core.CoreOption{
		core.WithName("ws", func(_ *core.Core) core.Result {
			return core.Ok(hub)
		}),
		core.WithService(process.Register),
		core.WithService(storepkg.Register),
		core.WithService(aipkg.Register),
		core.WithName("workspace", func(c *core.Core) core.Result {
			processService, _ := core.ServiceFor[*process.Service](c, "process")
			return core.Ok(workspacepkg.New(cfg.Ide.Workspace, medium, processService))
		}),
		core.WithName("brain", func(c *core.Core) core.Result {
			storeService, _ := core.ServiceFor[*storepkg.Service](c, "store")
			workspaceService, _ := core.ServiceFor[*workspacepkg.Subsystem](c, "workspace")
			aiService, _ := core.ServiceFor[*aipkg.Service](c, "ai")
			return core.Ok(brainpkg.New(cfg.Ide.Brain, medium, storeService.Store, workspaceService, aiService))
		}),
		core.WithName("subagent", func(c *core.Core) core.Result {
			storeService, _ := core.ServiceFor[*storepkg.Service](c, "store")
			if storeService != nil {
				return core.Ok(subagentpkg.NewWithHistory(cfg.Ide.Subagent, hub, authToken, storeService.Store))
			}
			return core.Ok(subagentpkg.New(cfg.Ide.Subagent, hub, authToken))
		}),
		core.WithName("navigate", func(c *core.Core) core.Result {
			return core.Ok(navigatepkg.New(cfg.Ide.Navigate, c))
		}),
		core.WithName("marketplace", func(_ *core.Core) core.Result {
			return core.Ok(marketplacepkg.New(cfg.Ide.Marketplace))
		}),
		core.WithService(vipkg.Register),
		core.WithName("mcp_bridge", RegisterMCPBridge(MCPBridgeOptions{})),
	}
	// gui.Bootstrap(app) is built by the cmd entrypoint — it carries window /
	// display / webview / etc. with the wails app reference attached. Library
	// code here treats it as opaque CoreOptions.
	services = append(services, options.GUIServices...)
	services = append(services, options.extraCoreOptions...)
	services = append(services, core.WithName("mcp", registerMCP(options, mode)))
	if enableGUI {
		services = append(services, core.WithName("gui_mcp", func(c *core.Core) core.Result {
			return core.Ok(guimcp.New(c))
		}))
		services = append(services, core.WithName("gui_shell", func(_ *core.Core) core.Result {
			return core.Ok(guiShell)
		}))
	}
	if mode.conclave {
		services = append(services, core.WithServiceLock())
	}

	c := core.New(services...)

	workspaceService, ok := core.ServiceFor[*workspacepkg.Subsystem](c, "workspace")
	if !ok || workspaceService == nil {
		return nil, core.E("ide.server.Compose", "workspace service not registered", nil)
	}
	brainService, ok := core.ServiceFor[*brainpkg.Subsystem](c, "brain")
	if !ok || brainService == nil {
		return nil, core.E("ide.server.Compose", "brain service not registered", nil)
	}
	subagentService, ok := core.ServiceFor[*subagentpkg.Subsystem](c, "subagent")
	if !ok || subagentService == nil {
		return nil, core.E("ide.server.Compose", "subagent service not registered", nil)
	}
	navigateService, ok := core.ServiceFor[*navigatepkg.Subsystem](c, "navigate")
	if !ok || navigateService == nil {
		return nil, core.E("ide.server.Compose", "navigate service not registered", nil)
	}
	marketplaceService, ok := core.ServiceFor[*marketplacepkg.Subsystem](c, "marketplace")
	if !ok || marketplaceService == nil {
		return nil, core.E("ide.server.Compose", "marketplace service not registered", nil)
	}
	aiService, ok := core.ServiceFor[*aipkg.Service](c, "ai")
	if !ok || aiService == nil {
		return nil, core.E("ide.server.Compose", "ai service not registered", nil)
	}
	if options.Medium != nil && options.Medium != coreio.Local {
		marketplaceService.AttachMedium(medium)
	}
	marketplaceService.AttachAI(aiService)
	brainService.RegisterActions(c)
	workspaceService.RegisterActions(c)
	subagentService.RegisterActions(c)
	navigateService.RegisterActions(c)
	marketplaceService.RegisterActions(c)

	// Register orm.Service + mount an in-memory Memium for the IDE's
	// own data. v1 demo: a single `note` table backed by Memium so the
	// /data panel has something concrete to query. Real consumers will
	// mount a duckdb/postgres/borg medium under "default" instead.
	if result := registerOrmService(c); !result.OK {
		core.Print(core.Stderr(), "ide.server.Compose: orm registration warning: %v\n", result.Value)
	}
	// Register tenant.Service for the /tenant panel. Operates in offline
	// mode (cache-only, no client) when no tenant.api_url + api_token are
	// configured — UI surfaces the status honestly.
	if result := registerTenantService(c); !result.OK {
		core.Print(core.Stderr(), "ide.server.Compose: tenant registration warning: %v\n", result.Value)
	}

	mcpService, ok := core.ServiceFor[*coremcp.Service](c, "mcp")
	if !ok {
		return nil, core.E("ide.server.Compose", "mcp service not registered", nil)
	}
	if enableGUI {
		guiSubsystem, _ := core.ServiceFor[*guimcp.Subsystem](c, "gui_mcp")
		guiExecutor.Attach(guiSubsystem, mcpService)
	}
	if enableGUI && config.BoolValue(cfg.Ide.Chat.Enabled, true) {
		// gui.BootstrapWithConfig already registered a chat service via
		// core.WithService(chat.Register(...)) at core construction time —
		// but with no ToolExecutor wired (the executor depends on mcpService
		// which only exists after this point). Calling chat.Register again
		// here returns a fresh Service whose c.Action(...) closures capture
		// the right executor; since Action.Set is overwrite semantics, the
		// new handlers replace the Bootstrap's executor-less ones.
		//
		// We do NOT call c.RegisterService("chat", ...) — that would
		// collide with the Bootstrap registration and crash. Nothing
		// looks up the chat service by name (greppped 2026-05-10), so
		// the stale Bootstrap service in the registry is harmless; the
		// runtime only invokes the actions, and those now have the
		// right executor.
		result := chatpkg.NewRegister(cfg.Ide.Chat, chatExecutor(cfg.Ide.Chat, guiExecutor, mcpService))(c)
		if !result.OK {
			if err, ok := result.Value.(error); ok {
				return nil, err
			}
			return nil, core.E("ide.server.Compose", "register chat", nil)
		}
	}

	if mode.conclave {
		return &runtimeParts{
			core:      c,
			mcp:       mcpService,
			hub:       hub,
			authToken: authToken,
		}, nil
	}

	transport, err := SelectTransport(cfg, options.MCP, options.PreferConfiguredTransport)
	if err != nil {
		return nil, err
	}
	if enableGUI && (transport.Mode == "" || transport.Mode == "stdio") && !options.PreferConfiguredTransport {
		transport = Transport{Mode: "gui"}
	}
	var term *TerminalServer
	if enableGUI {
		term = NewTerminalServer()
	}

	return &runtimeParts{
		core:      c,
		mcp:       mcpService,
		hub:       hub,
		transport: transport,
		relay:     SelectRelayTransport(cfg, authToken, hub.Handler()),
		gui:       guiShell,
		terminal:  term,
		authToken: authToken,
	}, nil
}

func chatExecutor(cfg config.Chat, shared *chatpkg.Executor, mcpService *coremcp.Service) chatpkg.ToolExecutor {
	if core.Trim(cfg.ToolExecutor) == "mcp_self" {
		return chatpkg.NewExecutor(nil, mcpService)
	}
	return shared
}

func (s *Server) Run(
	ctx context.Context,
) error {
	if s.transport.Mode == "http" && core.Trim(s.authToken) == "" {
		return core.E("ide.server.Run", "bearer token required for HTTP mode", nil)
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
	defer func() {
		if r := s.core.ServiceShutdown(context.Background()); !r.OK {
			_ = r
		}
	}()

	// Embedded SSH server — exposes the user's shell on 127.0.0.1:9876.
	// Runs only in GUI mode; MCP/HTTP transports skip it. Lifetime is
	// scoped to the server.Run call so it goes down on Ctrl+C / quit.
	if s.terminal != nil {
		if err := s.terminal.Start(); err != nil {
			core.Print(core.Stderr(), "ide.server.Run: terminal SSH start failed: %v\n", err)
		} else {
			core.Print(core.Stderr(), "ide.server.Run: terminal SSH listening on %s\n", s.terminal.Addr)
		}
		defer func() { _ = s.terminal.Stop() }()
	}

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
			if err := relayServer.Shutdown(context.Background()); err != nil && err != http.ErrServerClosed {
				core.Warn("ide.server.Run relay shutdown", "err", err)
			}
		}()
		go func() {
			if err := relayServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
				core.Error("ide.server.Run", "relay", err)
			}
		}()
	}

	switch s.transport.Mode {
	case "http":
		return withMCPAuthToken(s.authToken, func() error {
			return serveHardenedHTTP(ctx, s.mcp, s.transport.Addr, s.authToken)
		})
	case "gui":
		if s.gui == nil {
			return core.E("ide.server.Run", "gui shell is not registered", nil)
		}
		return s.gui.Run(ctx, s.core)
	case "tcp":
		return s.mcp.ServeTCP(ctx, s.transport.Addr)
	case "unix":
		return s.mcp.ServeUnix(ctx, s.transport.Addr)
	default:
		return s.mcp.ServeStdio(ctx)
	}
}

func withMCPAuthToken(
	token string,
	run func() error,
) error {
	if run == nil {
		return core.E("ide.server.Run", "http runner is nil", nil)
	}
	token = core.Trim(token)
	if token == "" {
		return run()
	}
	previous, hadPrevious := core.LookupEnv("MCP_AUTH_TOKEN")
	if result := core.Setenv("MCP_AUTH_TOKEN", token); !result.OK {
		err, _ := result.Value.(error)
		return core.E("ide.server.Run", "set MCP_AUTH_TOKEN", err)
	}
	defer func() {
		if hadPrevious {
			if result := core.Setenv("MCP_AUTH_TOKEN", previous); !result.OK {
				err, _ := result.Value.(error)
				core.Warn("ide.server.Run restore MCP_AUTH_TOKEN", "err", err)
			}
			return
		}
		if result := core.Unsetenv("MCP_AUTH_TOKEN"); !result.OK {
			err, _ := result.Value.(error)
			core.Warn("ide.server.Run unset MCP_AUTH_TOKEN", "err", err)
		}
	}()
	return run()
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
