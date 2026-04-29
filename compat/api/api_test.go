package api

import (
	core "dappco.re/go"
	"github.com/gin-gonic/gin"
)

func TestApi_ToolDescriptor_Good(t *core.T) {
	value := ToolDescriptor{Name: "ping"}
	core.AssertEqual(t, "ping", value.Name)
	core.AssertEqual(t, "", value.Description)
}

func TestApi_ToolDescriptor_Bad(t *core.T) {
	value := ToolDescriptor{}
	core.AssertEqual(t, "", value.Name)
	core.AssertEqual(t, "", value.Group)
}

func TestApi_ToolDescriptor_Ugly(t *core.T) {
	value := ToolDescriptor{Name: "tool.name", Group: "group"}
	core.AssertContains(t, value.Name, "tool")
	core.AssertEqual(t, "group", value.Group)
}

func TestApi_RouteDescription_Good(t *core.T) {
	value := RouteDescription{Method: "GET", Path: "/tools"}
	core.AssertEqual(t, "GET", value.Method)
	core.AssertEqual(t, "/tools", value.Path)
}

func TestApi_RouteDescription_Bad(t *core.T) {
	value := RouteDescription{}
	core.AssertEqual(t, "", value.Path)
	core.AssertEqual(t, "", value.Method)
}

func TestApi_RouteDescription_Ugly(t *core.T) {
	value := RouteDescription{Tags: []string{"tools"}}
	core.AssertEqual(t, 1, len(value.Tags))
	core.AssertEqual(t, "tools", value.Tags[0])
}

func TestApi_ToolBridge_Good(t *core.T) {
	bridge := NewToolBridge("/tools")
	var _ *ToolBridge = bridge
	core.AssertNotNil(t, bridge)
	core.AssertEqual(t, "/tools", bridge.BasePath())
}

func TestApi_ToolBridge_Bad(t *core.T) {
	var bridge *ToolBridge
	core.AssertEqual(t, "", bridge.BasePath())
	core.AssertEqual(t, 0, len(bridge.Tools()))
}

func TestApi_ToolBridge_Ugly(t *core.T) {
	bridge := NewToolBridge("tools")
	var _ *ToolBridge = bridge
	core.AssertEqual(t, "/tools", bridge.BasePath())
	core.AssertNotNil(t, bridge.Tools())
}

func TestApi_NewToolBridge_Good(t *core.T) {
	bridge := NewToolBridge("/v1/tools")
	core.AssertEqual(t, "/v1/tools", bridge.BasePath())
	core.AssertEqual(t, 0, len(bridge.Tools()))
}

func TestApi_NewToolBridge_Bad(t *core.T) {
	bridge := NewToolBridge("")
	core.AssertEqual(t, "/tools", bridge.BasePath())
	core.AssertEqual(t, 0, len(bridge.Tools()))
}

func TestApi_NewToolBridge_Ugly(t *core.T) {
	bridge := NewToolBridge("v1/tools")
	core.AssertEqual(t, "/v1/tools", bridge.BasePath())
	core.AssertNotNil(t, bridge)
}

func TestApi_OK_Good(t *core.T) {
	response := OK("value")
	core.AssertEqual(t, true, response["success"])
	core.AssertEqual(t, "value", response["data"])
}

func TestApi_OK_Bad(t *core.T) {
	response := OK(nil)
	core.AssertEqual(t, nil, response["data"])
	core.AssertEqual(t, true, response["success"])
}

func TestApi_OK_Ugly(t *core.T) {
	response := OK(map[string]any{"nested": true})
	core.AssertNotNil(t, response["data"])
	core.AssertEqual(t, true, response["success"])
}

func TestApi_Fail_Good(t *core.T) {
	response := Fail("bad", "message")
	core.AssertEqual(t, false, response["success"])
	core.AssertNotNil(t, response["error"])
}

func TestApi_Fail_Bad(t *core.T) {
	response := Fail("", "")
	core.AssertNotNil(t, response["error"])
	core.AssertEqual(t, false, response["success"])
}

func TestApi_Fail_Ugly(t *core.T) {
	response := Fail("request_too_large", "Request body exceeds 10 MB limit")
	core.AssertContains(t, response["error"].(map[string]any)["message"].(string), "Request")
	core.AssertEqual(t, "request_too_large", response["error"].(map[string]any)["code"])
}

func TestApi_ToolBridge_Add_Good(t *core.T) {
	bridge := NewToolBridge("/tools")
	bridge.Add(ToolDescriptor{Name: "ping"}, func(*gin.Context) {})
	core.AssertEqual(t, 1, len(bridge.Tools()))
}

func TestApi_ToolBridge_Add_Bad(t *core.T) {
	var bridge *ToolBridge
	bridge.Add(ToolDescriptor{Name: "ping"}, func(*gin.Context) {})
	core.AssertEqual(t, 0, len(bridge.Tools()))
}

func TestApi_ToolBridge_Add_Ugly(t *core.T) {
	bridge := NewToolBridge("/tools")
	bridge.Add(ToolDescriptor{Name: ""}, nil)
	core.AssertEqual(t, 0, len(bridge.Tools()))
}

func TestApi_ToolBridge_Name_Good(t *core.T) {
	bridge := NewToolBridge("/tools")
	core.AssertEqual(t, "tools", bridge.Name())
	core.AssertEqual(t, "/tools", bridge.BasePath())
}

func TestApi_ToolBridge_Name_Bad(t *core.T) {
	var bridge *ToolBridge
	core.AssertEqual(t, "tools", bridge.Name())
	core.AssertEqual(t, "", bridge.BasePath())
}

func TestApi_ToolBridge_Name_Ugly(t *core.T) {
	bridge := NewToolBridge("/other")
	core.AssertEqual(t, "tools", bridge.Name())
	core.AssertEqual(t, "/other", bridge.BasePath())
}

func TestApi_ToolBridge_BasePath_Good(t *core.T) {
	bridge := NewToolBridge("/tools")
	core.AssertEqual(t, "/tools", bridge.BasePath())
	core.AssertEqual(t, 0, len(bridge.Tools()))
}

func TestApi_ToolBridge_BasePath_Bad(t *core.T) {
	var bridge *ToolBridge
	core.AssertEqual(t, "", bridge.BasePath())
	core.AssertEqual(t, 0, len(bridge.Tools()))
}

func TestApi_ToolBridge_BasePath_Ugly(t *core.T) {
	bridge := NewToolBridge("tools")
	core.AssertEqual(t, "/tools", bridge.BasePath())
	core.AssertNotNil(t, bridge)
}

func TestApi_ToolBridge_RegisterRoutes_Good(t *core.T) {
	bridge := NewToolBridge("/tools")
	engine := gin.New()
	bridge.RegisterRoutes(engine.Group("/tools"))
	core.AssertNotNil(t, engine)
}

func TestApi_ToolBridge_RegisterRoutes_Bad(t *core.T) {
	var bridge *ToolBridge
	bridge.RegisterRoutes(nil)
	core.AssertEqual(t, "", bridge.BasePath())
}

func TestApi_ToolBridge_RegisterRoutes_Ugly(t *core.T) {
	bridge := NewToolBridge("/tools")
	bridge.Add(ToolDescriptor{Name: "ping"}, func(*gin.Context) {})
	engine := gin.New()
	bridge.RegisterRoutes(engine.Group("/tools"))
	core.AssertEqual(t, 1, len(bridge.Tools()))
}

func TestApi_ToolBridge_Describe_Good(t *core.T) {
	bridge := NewToolBridge("/tools")
	descriptions := bridge.Describe()
	core.AssertEqual(t, 1, len(descriptions))
}

func TestApi_ToolBridge_Describe_Bad(t *core.T) {
	var bridge *ToolBridge
	core.AssertEqual(t, 0, len(bridge.Describe()))
	core.AssertEqual(t, "", bridge.BasePath())
}

func TestApi_ToolBridge_Describe_Ugly(t *core.T) {
	bridge := NewToolBridge("/tools")
	bridge.Add(ToolDescriptor{Name: "ping", Description: "Ping"}, func(*gin.Context) {})
	core.AssertEqual(t, 2, len(bridge.Describe()))
}

func TestApi_ToolBridge_Tools_Good(t *core.T) {
	bridge := NewToolBridge("/tools")
	bridge.Add(ToolDescriptor{Name: "ping"}, func(*gin.Context) {})
	core.AssertEqual(t, "ping", bridge.Tools()[0].Name)
}

func TestApi_ToolBridge_Tools_Bad(t *core.T) {
	var bridge *ToolBridge
	core.AssertEqual(t, 0, len(bridge.Tools()))
	core.AssertEqual(t, "", bridge.BasePath())
}

func TestApi_ToolBridge_Tools_Ugly(t *core.T) {
	bridge := NewToolBridge("/tools")
	bridge.Add(ToolDescriptor{Name: "alpha"}, func(*gin.Context) {})
	bridge.Add(ToolDescriptor{Name: "zeta"}, func(*gin.Context) {})
	core.AssertEqual(t, 2, len(bridge.Tools()))
}
