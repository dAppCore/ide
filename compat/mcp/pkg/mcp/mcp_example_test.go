package mcp

import (
	"context"

	core "dappco.re/go"
	"dappco.re/go/api"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

func ExampleNew() {
	service, _ := New(Options{})
	core.Println(len(service.Tools()))
	// Output: 0
}

func ExampleAddToolRecorded() {
	service, _ := New(Options{})
	AddToolRecorded(service, service.Server(), "demo", &sdkmcp.Tool{Name: "ping"}, func(context.Context, *sdkmcp.CallToolRequest, struct{}) (*sdkmcp.CallToolResult, string, error) {
		return nil, "pong", nil
	})
	core.Println(service.Tools()[0].Name)
	// Output: ping
}

func ExampleBridgeToAPI() {
	service, _ := New(Options{Subsystems: []Subsystem{testSubsystem{name: "demo"}}})
	bridge := api.NewToolBridge("/tools")
	BridgeToAPI(service, bridge)
	core.Println(len(bridge.Tools()))
	// Output: 1
}

func ExampleService_Server() {
	service, _ := New(Options{})
	core.Println(service.Server() != nil)
	// Output: true
}

func ExampleService_Tools() {
	service, _ := New(Options{Subsystems: []Subsystem{testSubsystem{name: "demo"}}})
	core.Println(service.Tools()[0].Name)
	// Output: demo_tool
}

func ExampleService_ServeTCP() {
	service, _ := New(Options{})
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	core.Println(service.ServeTCP(ctx, "127.0.0.1:0") == context.Canceled)
	// Output: true
}

func ExampleService_ServeUnix() {
	service, _ := New(Options{})
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	core.Println(service.ServeUnix(ctx, "/tmp/mcp.sock") == context.Canceled)
	// Output: true
}

func ExampleService_ServeStdio() {
	service, _ := New(Options{})
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	core.Println(service.ServeStdio(ctx) == context.Canceled)
	// Output: true
}
