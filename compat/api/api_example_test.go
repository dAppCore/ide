package api

import (
	core "dappco.re/go"
	"github.com/gin-gonic/gin"
)

func ExampleToolDescriptor() {
	descriptor := ToolDescriptor{Name: "ping"}
	core.Println(descriptor.Name)
	// Output: ping
}

func ExampleRouteDescription() {
	route := RouteDescription{Method: "GET"}
	core.Println(route.Method)
	// Output: GET
}

func ExampleToolBridge() {
	bridge := NewToolBridge("/tools")
	core.Println(bridge.BasePath())
	// Output: /tools
}

func ExampleNewToolBridge() {
	bridge := NewToolBridge("tools")
	core.Println(bridge.BasePath())
	// Output: /tools
}

func ExampleOK() {
	response := OK("value")
	core.Println(response["success"])
	// Output: true
}

func ExampleFail() {
	response := Fail("bad", "message")
	core.Println(response["success"])
	// Output: false
}

func ExampleToolBridge_Add() {
	bridge := NewToolBridge("/tools")
	bridge.Add(ToolDescriptor{Name: "ping"}, func(*gin.Context) {})
	core.Println(len(bridge.Tools()))
	// Output: 1
}

func ExampleToolBridge_Name() {
	bridge := NewToolBridge("/tools")
	core.Println(bridge.Name())
	// Output: tools
}

func ExampleToolBridge_BasePath() {
	bridge := NewToolBridge("/tools")
	core.Println(bridge.BasePath())
	// Output: /tools
}

func ExampleToolBridge_RegisterRoutes() {
	bridge := NewToolBridge("/tools")
	engine := gin.New()
	bridge.RegisterRoutes(engine.Group("/tools"))
	core.Println(bridge.Name())
	// Output: tools
}

func ExampleToolBridge_Describe() {
	bridge := NewToolBridge("/tools")
	core.Println(len(bridge.Describe()))
	// Output: 1
}

func ExampleToolBridge_Tools() {
	bridge := NewToolBridge("/tools")
	bridge.Add(ToolDescriptor{Name: "ping"}, func(*gin.Context) {})
	core.Println(bridge.Tools()[0].Name)
	// Output: ping
}
