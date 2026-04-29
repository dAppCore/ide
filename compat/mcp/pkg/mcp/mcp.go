package mcp

import (
	"context"
	"net/http"

	core "dappco.re/go"
	"dappco.re/go/api"
	"github.com/gin-gonic/gin"
	sdkmcp "github.com/modelcontextprotocol/go-sdk/mcp"
)

type RESTHandler func(context.Context, []byte) (any, error)

type ToolRecord struct {
	Group       string
	Name        string
	Description string
	InputSchema any
	RESTHandler RESTHandler
}

type Subsystem interface {
	Name() string
	RegisterTools(*Service)
}

type Options struct {
	WorkspaceRoot  string
	Unrestricted   bool
	Subsystems     []Subsystem
	ProcessService any
	WSHub          any
}

type Service struct {
	server *sdkmcp.Server
	tools  []ToolRecord

	ServiceRuntime any
	options        Options
}

func New(
	options Options,
) (*Service, error) {
	service := &Service{
		server:  sdkmcp.NewServer(&sdkmcp.Implementation{Name: "core-ide-mcp", Version: "compat"}, nil),
		options: options,
	}
	for _, subsystem := range options.Subsystems {
		if subsystem != nil {
			subsystem.RegisterTools(service)
		}
	}
	return service, nil
}

func AddToolRecorded[I any, O any](
	svc *Service,
	server *sdkmcp.Server,
	group string,
	tool *sdkmcp.Tool,
	handler func(context.Context, *sdkmcp.CallToolRequest, I) (*sdkmcp.CallToolResult, O, error),
) {
	if svc == nil || tool == nil || handler == nil {
		return
	}
	if tool.InputSchema == nil {
		tool.InputSchema = defaultInputSchema()
	}
	rest := func(ctx context.Context, body []byte) (any, error) {
		var input I
		if len(body) > 0 {
			if result := core.JSONUnmarshalString(string(body), &input); !result.OK {
				return nil, core.E("mcp.AddToolRecorded", "decode input", core.NewError(result.Error()))
			}
		}
		_, output, err := handler(ctx, nil, input)
		return output, err
	}
	record := ToolRecord{
		Group:       group,
		Name:        tool.Name,
		Description: tool.Description,
		InputSchema: tool.InputSchema,
		RESTHandler: rest,
	}
	svc.tools = append(svc.tools, record)
	if server == nil {
		server = svc.server
	}
	if server == nil {
		return
	}
	localTool := *tool
	server.AddTool(&localTool, func(ctx context.Context, req *sdkmcp.CallToolRequest) (*sdkmcp.CallToolResult, error) {
		var body []byte
		if req != nil {
			body = req.Params.Arguments
		}
		output, err := rest(ctx, body)
		if err != nil {
			return nil, err
		}
		return &sdkmcp.CallToolResult{
			Content: []sdkmcp.Content{&sdkmcp.TextContent{Text: core.JSONMarshalString(output)}},
		}, nil
	})
}

func BridgeToAPI(svc *Service, bridge *api.ToolBridge) {
	if svc == nil || bridge == nil {
		return
	}
	for _, record := range svc.Tools() {
		current := record
		bridge.Add(api.ToolDescriptor{
			Name:        current.Name,
			Description: current.Description,
			Group:       current.Group,
			InputSchema: current.InputSchema,
		}, func(c *gin.Context) {
			body, err := c.GetRawData()
			if err != nil {
				if core.Contains(err.Error(), "too large") {
					c.JSON(http.StatusRequestEntityTooLarge, api.Fail("request_too_large", err.Error()))
					return
				}
				c.JSON(http.StatusBadRequest, api.Fail("invalid_request", err.Error()))
				return
			}
			output, err := current.RESTHandler(c.Request.Context(), body)
			if err != nil {
				c.JSON(http.StatusInternalServerError, api.Fail("tool_failed", err.Error()))
				return
			}
			c.JSON(http.StatusOK, api.OK(output))
		})
	}
}

func (s *Service) Server() *sdkmcp.Server {
	if s == nil {
		return nil
	}
	return s.server
}

func (s *Service) Tools() []ToolRecord {
	if s == nil {
		return nil
	}
	tools := make([]ToolRecord, len(s.tools))
	copy(tools, s.tools)
	return tools
}

func (s *Service) ServeTCP(
	ctx context.Context,
	addr string,
) error {
	return waitForContext(ctx, addr)
}

func (s *Service) ServeUnix(
	ctx context.Context,
	addr string,
) error {
	return waitForContext(ctx, addr)
}

func (s *Service) ServeStdio(
	ctx context.Context,
) error {
	return waitForContext(ctx, "stdio")
}

func defaultInputSchema() any {
	return map[string]any{"type": "object"}
}

func waitForContext(
	ctx context.Context,
	label string,
) error {
	_ = label
	if ctx == nil {
		ctx = context.Background()
	}
	<-ctx.Done()
	return ctx.Err()
}
