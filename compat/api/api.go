package api

import (
	"net/http"

	core "dappco.re/go"
	"github.com/gin-gonic/gin"
)

type ToolDescriptor struct {
	Name         string `json:"name"`
	Description  string `json:"description,omitempty"`
	Group        string `json:"group,omitempty"`
	InputSchema  any    `json:"inputSchema,omitempty"`
	OutputSchema any    `json:"outputSchema,omitempty"`
}

type RouteDescription struct {
	Method      string   `json:"method"`
	Path        string   `json:"routePath"`
	Summary     string   `json:"summary,omitempty"`
	Description string   `json:"description,omitempty"`
	Tags        []string `json:"tags,omitempty"`
	RequestBody any      `json:"requestBody,omitempty"`
	Response    any      `json:"response,omitempty"`
}

type ToolBridge struct {
	basePath string
	tools    []boundTool
}

type boundTool struct {
	descriptor ToolDescriptor
	handler    gin.HandlerFunc
}

func NewToolBridge(basePath string) *ToolBridge {
	if core.Trim(basePath) == "" {
		basePath = "/tools"
	}
	if !core.HasPrefix(basePath, "/") {
		basePath = core.Concat("/", basePath)
	}
	return &ToolBridge{basePath: basePath}
}

func OK(data any) map[string]any {
	return map[string]any{"success": true, "data": data}
}

func Fail(code string, message string) map[string]any {
	return map[string]any{
		"success": false,
		"error":   map[string]any{"code": code, "message": message},
	}
}

func (b *ToolBridge) Add(desc ToolDescriptor, handler gin.HandlerFunc) {
	if b == nil || handler == nil {
		return
	}
	b.tools = append(b.tools, boundTool{descriptor: desc, handler: handler})
}

func (b *ToolBridge) Name() string {
	return "tools"
}

func (b *ToolBridge) BasePath() string {
	if b == nil {
		return ""
	}
	return b.basePath
}

func (b *ToolBridge) RegisterRoutes(rg *gin.RouterGroup) {
	if b == nil || rg == nil {
		return
	}
	rg.GET("", b.listHandler())
	rg.GET("/", b.listHandler())
	for _, tool := range b.tools {
		if core.Trim(tool.descriptor.Name) == "" {
			continue
		}
		rg.POST(core.Concat("/", tool.descriptor.Name), tool.handler)
	}
}

func (b *ToolBridge) Describe() []RouteDescription {
	if b == nil {
		return nil
	}
	descriptions := make([]RouteDescription, 0, len(b.tools)+1)
	descriptions = append(descriptions, RouteDescription{Method: http.MethodGet, Path: b.basePath, Summary: "List tools"})
	for _, tool := range b.tools {
		descriptions = append(descriptions, RouteDescription{
			Method:      http.MethodPost,
			Path:        core.Concat(b.basePath, "/", tool.descriptor.Name),
			Summary:     tool.descriptor.Description,
			Description: tool.descriptor.Description,
			Tags:        []string{tool.descriptor.Group},
			RequestBody: tool.descriptor.InputSchema,
			Response:    tool.descriptor.OutputSchema,
		})
	}
	return descriptions
}

func (b *ToolBridge) Tools() []ToolDescriptor {
	if b == nil {
		return nil
	}
	tools := make([]ToolDescriptor, 0, len(b.tools))
	for _, tool := range b.tools {
		tools = append(tools, tool.descriptor)
	}
	return tools
}

func (b *ToolBridge) listHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, OK(b.Tools()))
	}
}
