//go:build linux

package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"forge.lthn.ai/core/api"
	"forge.lthn.ai/core/api/pkg/provider"
	"forge.lthn.ai/core/config"
	process "forge.lthn.ai/core/go-process"
	processapi "forge.lthn.ai/core/go-process/pkg/api"
	"forge.lthn.ai/core/go-ws"
	"forge.lthn.ai/core/go/pkg/core"
	guichat "forge.lthn.ai/core/gui/pkg/chat"
	guiMCP "forge.lthn.ai/core/gui/pkg/mcp"
	"forge.lthn.ai/core/mcp/pkg/mcp"
	"forge.lthn.ai/core/mcp/pkg/mcp/agentic"
	"forge.lthn.ai/core/mcp/pkg/mcp/brain"
	"forge.lthn.ai/core/mcp/pkg/mcp/ide"
)

func main() {
	cfg, _ := config.New()
	ideCfg, flags, err := loadIDEConfig(os.Args[1:])
	if err != nil {
		log.Fatalf("failed to load IDE config: %v", err)
	}
	applyIDEEnvironment(ideCfg)

	cwd, err := os.Getwd()
	if err != nil {
		log.Fatalf("failed to get working directory: %v", err)
	}

	hub := ws.NewHub()

	bridgeCfg := ide.DefaultConfig()
	bridgeCfg.WorkspaceRoot = cwd
	if url := os.Getenv("CORE_API_URL"); url != "" {
		bridgeCfg.LaravelWSURL = url
	}
	if token := os.Getenv("CORE_API_TOKEN"); token != "" {
		bridgeCfg.Token = token
	}
	bridge := ide.NewBridge(hub, bridgeCfg)

	brainDirect, err := NewCachedBrainDirect(cwd)
	if err != nil {
		log.Fatalf("failed to initialise brain cache: %v", err)
	}
	workspaceSubsystem := NewWorkspaceSubsystem(cwd)
	marketplaceSubsystem := NewMarketplaceSubsystem(nil)
	navigateSubsystem := NewNavigateSubsystem(nil)
	subagentSubsystem := NewSubagentSubsystem(hub)
	chatExecutor := newSharedChatToolExecutor()

	reg := provider.NewRegistry()
	reg.Add(processapi.NewProvider(process.DefaultRegistry(), hub))
	reg.Add(brain.NewProvider(bridge, hub))

	apiAddr := ":9880"
	if addr := os.Getenv("CORE_API_ADDR"); addr != "" {
		apiAddr = addr
	}
	engine, _ := api.New(
		api.WithAddr(apiAddr),
		api.WithCORS("*"),
		api.WithWSHandler(http.Handler(hub.Handler())),
		api.WithSwagger("Core IDE", "Service Provider API", "0.1.0"),
	)
	reg.MountAll(engine)

	rm := NewRuntimeManager(engine)
	engine.Register(NewProvidersAPI(reg, rm))
	engine.Register(NewWorkspaceAPI(cwd))
	engine.Register(NewPackageToolsAPI(nil))

	c, err := core.New(
		core.WithName("ws", func(c *core.Core) (any, error) {
			return hub, nil
		}),
		core.WithName("mcp", func(c *core.Core) (any, error) {
			navigateSubsystem.core = c
			guiMCPSub := guiMCP.New(c)
			chatExecutor.Attach(guiMCPSub)
			return mcp.New(
				mcp.WithWorkspaceRoot(cwd),
				mcp.WithWSHub(hub),
				mcp.WithSubsystem(brainDirect),
				mcp.WithSubsystem(workspaceSubsystem),
				mcp.WithSubsystem(marketplaceSubsystem),
				mcp.WithSubsystem(navigateSubsystem),
				mcp.WithSubsystem(subagentSubsystem),
				mcp.WithSubsystem(agentic.NewPrep()),
				mcp.WithSubsystem(guiMCPSub),
			)
		}),
		core.WithService(guichat.Register(func(options *guichat.Options) {
			options.APIURL = ideCfg.Ide.Chat.APIURL
			options.StorePath = ideCfg.Ide.Chat.StorePath
			options.ToolExecutor = chatExecutor
		})),
	)
	if err != nil {
		log.Fatalf("failed to create core: %v", err)
	}

	mcpSvc, err := core.ServiceFor[*mcp.Service](c, "mcp")
	if err != nil {
		log.Fatalf("failed to get MCP service: %v", err)
	}
	registerIDEActions(c, brainDirect, workspaceSubsystem, marketplaceSubsystem, navigateSubsystem, subagentSubsystem)

	if flags.NoGUI {
		log.Printf("GUI mode disabled via --no-gui; running headless instead")
	} else if guiEnabled(cfg) {
		log.Printf("GUI mode is unavailable in this Linux build; running headless instead")
	}

	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	if err := c.ServiceStartup(ctx, nil); err != nil {
		log.Fatalf("core startup failed: %v", err)
	}
	bridge.Start(ctx)
	go hub.Run(ctx)

	if err := rm.StartAll(ctx); err != nil {
		log.Printf("runtime provider error: %v", err)
	}

	go func() {
		log.Printf("API server listening on %s", apiAddr)
		if err := engine.Serve(ctx); err != nil {
			log.Printf("API server error: %v", err)
		}
	}()

	if flags.MCPOnly {
		if err := mcpSvc.ServeStdio(ctx); err != nil {
			log.Printf("MCP stdio error: %v", err)
		}
	} else {
		go func() {
			if err := mcpSvc.Run(ctx); err != nil {
				log.Printf("MCP error: %v", err)
			}
		}()
		<-ctx.Done()
	}

	rm.StopAll()
	shutdownCtx := context.Background()
	_ = mcpSvc.Shutdown(shutdownCtx)
	_ = c.ServiceShutdown(shutdownCtx)
}
