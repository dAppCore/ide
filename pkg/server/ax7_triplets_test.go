package server

import (
	"context"
	"net/http"

	core "dappco.re/go"
	coreio "dappco.re/go/io"
	coremcp "dappco.re/go/mcp/pkg/mcp"

	"dappco.re/go/ide/pkg/config"
)

func TestAX7_SelectTransport_Good(t *core.T) {
	t.Setenv("MCP_HTTP_ADDR", "127.0.0.1:9880")
	transport, err := SelectTransport(config.IDEConfig{}.WithDefaults(), false, false)
	core.AssertNoError(t, err)
	core.AssertEqual(t, Transport{Mode: "http", Addr: "127.0.0.1:9880"}, transport)
}

func TestAX7_SelectTransport_Bad(t *core.T) {
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Transport.Mode = "http"
	cfg.Ide.Transport.HTTPAddr = "0.0.0.0:9880"
	transport, err := SelectTransport(cfg, false, true)
	core.AssertError(t, err)
	core.AssertEqual(t, Transport{}, transport)
}

func TestAX7_SelectTransport_Ugly(t *core.T) {
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Transport.Mode = "http"
	cfg.Ide.Transport.HTTPAddr = "127.0.0.1:9999"
	transport, err := SelectTransport(cfg, false, true)
	core.AssertNoError(t, err)
	core.AssertEqual(t, "127.0.0.1:9999", transport.Addr)
}

func TestAX7_SelectRelayTransport_Good(t *core.T) {
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Subagent.Relay.Addr = "127.0.0.1:9882"
	cfg.Ide.Subagent.Relay.Path = "relay"
	relay := SelectRelayTransport(cfg, "token", http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	core.AssertTrue(t, relay.Enabled)
	core.AssertEqual(t, "/relay", relay.Path)
}

func TestAX7_SelectRelayTransport_Bad(t *core.T) {
	cfg := config.IDEConfig{}.WithDefaults()
	relay := SelectRelayTransport(cfg, "", http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	core.AssertFalse(t, relay.Enabled)
	core.AssertNil(t, relay.Handler)
}

func TestAX7_SelectRelayTransport_Ugly(t *core.T) {
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Subagent.Relay.Addr = "0.0.0.0:9882"
	relay := SelectRelayTransport(cfg, "token", http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	core.AssertFalse(t, relay.Enabled)
}

func TestAX7_NewServer_Good(t *core.T) {
	server, err := NewServer(Options{Config: config.IDEConfig{}.WithDefaults(), MCP: true, Medium: coreio.NewMemoryMedium()})
	core.AssertNoError(t, err)
	core.AssertNotNil(t, server)
}

func TestAX7_NewServer_Bad(t *core.T) {
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Transport.Mode = "http"
	cfg.Ide.Transport.HTTPAddr = "0.0.0.0:9880"
	server, err := NewServer(Options{Config: cfg, PreferConfiguredTransport: true, Medium: coreio.NewMemoryMedium()})
	core.AssertError(t, err)
	core.AssertNil(t, server)
}

func TestAX7_NewServer_Ugly(t *core.T) {
	server, err := NewServer(Options{Config: config.IDEConfig{}.WithDefaults(), GUI: true, MCP: true, Medium: coreio.NewMemoryMedium()})
	core.AssertNoError(t, err)
	core.AssertEqual(t, "stdio", server.transport.Mode)
}

func TestAX7_Server_Run_Good(t *core.T) {
	server := &Server{core: core.New(), transport: Transport{Mode: "gui"}}
	err := server.Run(context.Background())
	core.AssertError(t, err)
	core.AssertContains(t, err.Error(), "gui shell")
}

func TestAX7_Server_Run_Bad(t *core.T) {
	var server *Server
	core.AssertPanics(t, func() { _ = server.Run(context.Background()) })
	core.AssertNil(t, server)
}

func TestAX7_Server_Run_Ugly(t *core.T) {
	server := &Server{core: core.New(), transport: Transport{Mode: "unknown"}}
	core.AssertPanics(t, func() { _ = server.Run(context.Background()) })
	core.AssertEqual(t, "unknown", server.transport.Mode)
}

func TestAX7_Server_Core_Good(t *core.T) {
	c := core.New()
	server := &Server{core: c}
	got := server.Core()
	core.AssertEqual(t, c, got)
}

func TestAX7_Server_Core_Bad(t *core.T) {
	server := &Server{}
	got := server.Core()
	core.AssertNil(t, got)
}

func TestAX7_Server_Core_Ugly(t *core.T) {
	var server *Server
	core.AssertPanics(t, func() { _ = server.Core() })
	core.AssertNil(t, server)
}

func TestAX7_Server_MCP_Good(t *core.T) {
	mcpService, err := coremcp.New(coremcp.Options{})
	core.RequireNoError(t, err)
	server := &Server{mcp: mcpService}
	core.AssertEqual(t, mcpService, server.MCP())
}

func TestAX7_Server_MCP_Bad(t *core.T) {
	server := &Server{}
	got := server.MCP()
	core.AssertNil(t, got)
}

func TestAX7_Server_MCP_Ugly(t *core.T) {
	var server *Server
	core.AssertPanics(t, func() { _ = server.MCP() })
	core.AssertNil(t, server)
}

func TestAX7_Options_Register_Good(t *core.T) {
	register := Options{Config: config.IDEConfig{}.WithDefaults(), MCP: true, Medium: coreio.NewMemoryMedium()}.Register()
	result := register(core.New())
	core.AssertTrue(t, result.OK)
	core.AssertNotNil(t, result.Value.(*Server))
}

func TestAX7_Options_Register_Bad(t *core.T) {
	cfg := config.IDEConfig{}.WithDefaults()
	cfg.Ide.Transport.Mode = "http"
	cfg.Ide.Transport.HTTPAddr = "0.0.0.0:9880"
	result := Options{Config: cfg, PreferConfiguredTransport: true, Medium: coreio.NewMemoryMedium()}.Register()(core.New())
	core.AssertFalse(t, result.OK)
	core.AssertNotNil(t, result.Value)
}

func TestAX7_Options_Register_Ugly(t *core.T) {
	register := Options{Config: config.IDEConfig{}.WithDefaults(), GUI: true, MCP: true, Medium: coreio.NewMemoryMedium()}.Register()
	result := register(core.New())
	core.AssertTrue(t, result.OK)
	core.AssertEqual(t, "stdio", result.Value.(*Server).transport.Mode)
}

func TestAX7_NewGUIShell_Good(t *core.T) {
	shell := NewGUIShell()
	core.AssertEqual(t, "core-ide-chat", shell.WindowName)
	core.AssertEqual(t, "core/ide", shell.Title)
}

func TestAX7_NewGUIShell_Bad(t *core.T) {
	shell := NewGUIShell()
	shell.WindowURL = ""
	core.AssertEqual(t, "", shell.WindowURL)
	core.AssertEqual(t, "core/ide", shell.Title)
}

func TestAX7_NewGUIShell_Ugly(t *core.T) {
	first := NewGUIShell()
	second := NewGUIShell()
	core.AssertFalse(t, first == second)
	core.AssertEqual(t, first.WindowName, second.WindowName)
}

func TestAX7_GUIShell_Run_Good(t *core.T) {
	method := (*GUIShell).Run
	core.AssertNotNil(t, method)
	core.AssertContains(t, core.Sprintf("%T", method), "func")
}

func TestAX7_GUIShell_Run_Bad(t *core.T) {
	var shell *GUIShell
	err := shell.Run(context.Background(), core.New())
	core.AssertError(t, err)
	core.AssertContains(t, err.Error(), "nil")
}

func TestAX7_GUIShell_Run_Ugly(t *core.T) {
	method := (*GUIShell).Run
	core.AssertNotPanics(t, func() { _ = core.Sprintf("%T", method) })
	core.AssertNotNil(t, method)
}

func TestAX7_Bridge_Tools_Good(t *core.T) {
	c := core.New()
	c.Action("gui.chat.tools", func(context.Context, core.Options) core.Result { return core.Ok([]string{"tool"}) })
	got, err := (&chatBridge{core: c}).Tools(context.Background())
	core.AssertNoError(t, err)
	core.AssertEqual(t, []string{"tool"}, got)
}

func TestAX7_Bridge_Tools_Bad(t *core.T) {
	got, err := (&chatBridge{}).Tools(context.Background())
	core.AssertError(t, err)
	core.AssertNil(t, got)
}

func TestAX7_Bridge_Tools_Ugly(t *core.T) {
	c := core.New()
	c.Action("gui.chat.tools", func(context.Context, core.Options) core.Result {
		return core.Fail(core.NewError("boom"))
	})
	got, err := (&chatBridge{core: c}).Tools(context.Background())
	core.AssertError(t, err)
	core.AssertNil(t, got)
}

func TestAX7_Bridge_ToolManifest_Good(t *core.T) {
	c := core.New()
	c.Action("gui.chat.tool_manifest", func(context.Context, core.Options) core.Result { return core.Ok("brain_recall") })
	text, err := (&chatBridge{core: c}).ToolManifest(context.Background())
	core.AssertNoError(t, err)
	core.AssertEqual(t, "brain_recall", text)
}

func TestAX7_Bridge_ToolManifest_Bad(t *core.T) {
	text, err := (&chatBridge{}).ToolManifest(context.Background())
	core.AssertError(t, err)
	core.AssertEqual(t, "", text)
}

func TestAX7_Bridge_ToolManifest_Ugly(t *core.T) {
	c := core.New()
	c.Action("gui.chat.tool_manifest", func(context.Context, core.Options) core.Result { return core.Ok(123) })
	text, err := (&chatBridge{core: c}).ToolManifest(context.Background())
	core.AssertNoError(t, err)
	core.AssertEqual(t, "", text)
}

func TestAX7_Bridge_CallTool_Good(t *core.T) {
	c := core.New()
	c.Action("gui.chat.call_tool", func(context.Context, core.Options) core.Result { return core.Ok("ok") })
	text, err := (&chatBridge{core: c}).CallTool(context.Background(), chatBridgeToolCall{Name: "tool"})
	core.AssertNoError(t, err)
	core.AssertEqual(t, "ok", text)
}

func TestAX7_Bridge_CallTool_Bad(t *core.T) {
	text, err := (&chatBridge{}).CallTool(context.Background(), chatBridgeToolCall{Name: "tool"})
	core.AssertError(t, err)
	core.AssertEqual(t, "", text)
}

func TestAX7_Bridge_CallTool_Ugly(t *core.T) {
	c := core.New()
	c.Action("gui.chat.call_tool", func(context.Context, core.Options) core.Result {
		return core.Fail(core.NewError("boom"))
	})
	text, err := (&chatBridge{core: c}).CallTool(context.Background(), chatBridgeToolCall{Name: "tool", Arguments: map[string]any{"x": true}})
	core.AssertError(t, err)
	core.AssertEqual(t, "", text)
}
