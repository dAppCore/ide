package mcp

import (
	"context"

	core "dappco.re/go"
	"dappco.re/go/api"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type testSubsystem struct {
	name string
}

func (s testSubsystem) Name() string { return s.name }

func (s testSubsystem) RegisterTools(svc *Service) {
	AddToolRecorded(svc, svc.Server(), s.name, &sdkmcp.Tool{Name: "demo_tool"}, func(context.Context, *sdkmcp.CallToolRequest, struct{}) (*sdkmcp.CallToolResult, string, error) {
		return nil, s.name, nil
	})
}

func TestMcp_New_Good(t *core.T) {
	service, err := New(Options{Subsystems: []Subsystem{testSubsystem{name: "demo"}}})
	core.AssertNil(t, err)
	core.AssertEqual(t, 1, len(service.Tools()))
}

func TestMcp_New_Bad(t *core.T) {
	service, err := New(Options{})
	core.AssertNil(t, err)
	core.AssertEqual(t, 0, len(service.Tools()))
}

func TestMcp_New_Ugly(t *core.T) {
	service, err := New(Options{Unrestricted: true, WorkspaceRoot: "/workspace"})
	core.AssertNil(t, err)
	core.AssertNotNil(t, service.Server())
}

func TestMcp_AddToolRecorded_Good(t *core.T) {
	service, _ := New(Options{})
	AddToolRecorded(service, service.Server(), "demo", &sdkmcp.Tool{Name: "ping"}, func(context.Context, *sdkmcp.CallToolRequest, struct{}) (*sdkmcp.CallToolResult, string, error) {
		return nil, "pong", nil
	})
	core.AssertEqual(t, "ping", service.Tools()[0].Name)
}

func TestMcp_AddToolRecorded_Bad(t *core.T) {
	service, _ := New(Options{})
	AddToolRecorded[struct{}, string](service, service.Server(), "demo", nil, nil)
	core.AssertEqual(t, 0, len(service.Tools()))
}

func TestMcp_AddToolRecorded_Ugly(t *core.T) {
	service, _ := New(Options{})
	AddToolRecorded(service, nil, "demo", &sdkmcp.Tool{Name: "edge"}, func(context.Context, *sdkmcp.CallToolRequest, struct{}) (*sdkmcp.CallToolResult, string, error) {
		return nil, "edge", nil
	})
	core.AssertNotNil(t, service.Tools()[0].RESTHandler)
}

func TestMcp_BridgeToAPI_Good(t *core.T) {
	service, _ := New(Options{Subsystems: []Subsystem{testSubsystem{name: "demo"}}})
	bridge := api.NewToolBridge("/tools")
	BridgeToAPI(service, bridge)
	core.AssertEqual(t, 1, len(bridge.Tools()))
}

func TestMcp_BridgeToAPI_Bad(t *core.T) {
	bridge := api.NewToolBridge("/tools")
	BridgeToAPI(nil, bridge)
	core.AssertEqual(t, 0, len(bridge.Tools()))
}

func TestMcp_BridgeToAPI_Ugly(t *core.T) {
	service, _ := New(Options{})
	BridgeToAPI(service, nil)
	core.AssertEqual(t, 0, len(service.Tools()))
}

func TestMcp_Service_Server_Good(t *core.T) {
	service, _ := New(Options{})
	server := service.Server()
	core.AssertNotNil(t, server)
}

func TestMcp_Service_Server_Bad(t *core.T) {
	var service *Service
	server := service.Server()
	core.AssertNil(t, server)
}

func TestMcp_Service_Server_Ugly(t *core.T) {
	service, _ := New(Options{WorkspaceRoot: "/tmp"})
	server := service.Server()
	core.AssertNotNil(t, server)
}

func TestMcp_Service_Tools_Good(t *core.T) {
	service, _ := New(Options{Subsystems: []Subsystem{testSubsystem{name: "demo"}}})
	tools := service.Tools()
	core.AssertEqual(t, "demo_tool", tools[0].Name)
}

func TestMcp_Service_Tools_Bad(t *core.T) {
	var service *Service
	tools := service.Tools()
	core.AssertNil(t, tools)
}

func TestMcp_Service_Tools_Ugly(t *core.T) {
	service, _ := New(Options{})
	tools := service.Tools()
	core.AssertEqual(t, 0, len(tools))
}

func TestMcp_Service_ServeTCP_Good(t *core.T) {
	service, _ := New(Options{})
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	core.AssertEqual(t, context.Canceled, service.ServeTCP(ctx, "127.0.0.1:0"))
}

func TestMcp_Service_ServeTCP_Bad(t *core.T) {
	service, _ := New(Options{})
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	core.AssertNotNil(t, service.ServeTCP(ctx, ""))
}

func TestMcp_Service_ServeTCP_Ugly(t *core.T) {
	service, _ := New(Options{WorkspaceRoot: "/tmp"})
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	core.AssertEqual(t, context.Canceled, service.ServeTCP(ctx, "localhost:0"))
}

func TestMcp_Service_ServeUnix_Good(t *core.T) {
	service, _ := New(Options{})
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	core.AssertEqual(t, context.Canceled, service.ServeUnix(ctx, "/tmp/mcp.sock"))
}

func TestMcp_Service_ServeUnix_Bad(t *core.T) {
	service, _ := New(Options{})
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	core.AssertNotNil(t, service.ServeUnix(ctx, ""))
}

func TestMcp_Service_ServeUnix_Ugly(t *core.T) {
	service, _ := New(Options{WorkspaceRoot: "/tmp"})
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	core.AssertEqual(t, context.Canceled, service.ServeUnix(ctx, "/tmp/edge.sock"))
}

func TestMcp_Service_ServeStdio_Good(t *core.T) {
	service, _ := New(Options{})
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	core.AssertEqual(t, context.Canceled, service.ServeStdio(ctx))
}

func TestMcp_Service_ServeStdio_Bad(t *core.T) {
	service, _ := New(Options{})
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	core.AssertNotNil(t, service.ServeStdio(ctx))
}

func TestMcp_Service_ServeStdio_Ugly(t *core.T) {
	service, _ := New(Options{Unrestricted: true})
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	core.AssertEqual(t, context.Canceled, service.ServeStdio(ctx))
}
