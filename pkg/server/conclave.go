package server

import (
	"context"
	"reflect"
	"unsafe"

	core "dappco.re/go"
	coremcp "dappco.re/go/mcp/pkg/mcp"
	"dappco.re/go/process"
	"dappco.re/go/ws"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type runtimeMode struct {
	conclave bool
}

func registerMCP(options Options, mode runtimeMode) func(*core.Core) core.Result {
	return func(c *core.Core) core.Result {
		svc, groups, err := newMCPService(c)
		if err != nil {
			return core.Fail(err)
		}
		if !mode.conclave {
			if err := wrapConclaveTools(svc, groups, func() (*runtimeParts, error) {
				return composeRuntimeMode(options, runtimeMode{conclave: true})
			}); err != nil {
				return core.Fail(err)
			}
		}
		svc.ServiceRuntime = core.NewServiceRuntime(c, struct{}{})
		return core.Ok(svc)
	}
}

func newMCPService(c *core.Core) (*coremcp.Service, map[string]bool, error) {
	var subsystems []coremcp.Subsystem
	var processService *process.Service
	var wsHub *ws.Hub
	groups := map[string]bool{}
	for _, name := range c.Services() {
		result := c.Service(name)
		if !result.OK {
			continue
		}
		if subsystem, ok := result.Value.(coremcp.Subsystem); ok {
			subsystems = append(subsystems, subsystem)
			groups[subsystem.Name()] = true
			continue
		}
		switch service := result.Value.(type) {
		case *process.Service:
			processService = service
		case *ws.Hub:
			wsHub = service
		}
	}
	svc, err := coremcp.New(coremcp.Options{
		ProcessService: processService,
		WSHub:          wsHub,
		Subsystems:     subsystems,
	})
	if err != nil {
		return nil, nil, err
	}
	filterMCPToolsToGroups(svc, groups)
	return svc, groups, nil
}

func filterMCPToolsToGroups(svc *coremcp.Service, groups map[string]bool) {
	if svc == nil || len(groups) == 0 {
		return
	}
	records := svc.Tools()
	kept := make([]coremcp.ToolRecord, 0, len(records))
	removed := make([]string, 0)
	for _, record := range records {
		if groups[record.Group] || (record.Group == "pkg" && groups["marketplace"]) {
			kept = append(kept, record)
			continue
		}
		removed = append(removed, record.Name)
	}
	if len(removed) > 0 {
		svc.Server().RemoveTools(removed...)
	}
	setToolRecords(svc, kept)
}

func wrapConclaveTools(svc *coremcp.Service, groups map[string]bool, spawn func() (*runtimeParts, error)) error {
	if svc == nil || len(groups) == 0 {
		return nil
	}
	records := svc.Tools()
	if len(records) == 0 {
		return nil
	}
	updated := make([]coremcp.ToolRecord, 0, len(records))
	for _, record := range records {
		if !groups[record.Group] || record.RESTHandler == nil {
			updated = append(updated, record)
			continue
		}
		handler := newConclaveToolHandler(record.Name, spawn)
		svc.Server().AddTool(&mcp.Tool{
			Name:        record.Name,
			Description: record.Description,
			InputSchema: record.InputSchema,
		}, func(ctx context.Context, req *mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			var body []byte
			if req != nil {
				body = req.Params.Arguments
			}
			output, err := handler(ctx, body)
			if err != nil {
				return nil, err
			}
			return &mcp.CallToolResult{
				Content: []mcp.Content{&mcp.TextContent{Text: core.JSONMarshalString(output)}},
			}, nil
		})
		record.RESTHandler = handler
		updated = append(updated, record)
	}
	setToolRecords(svc, updated)
	return nil
}

func newConclaveToolHandler(name string, spawn func() (*runtimeParts, error)) coremcp.RESTHandler {
	return func(ctx context.Context, body []byte) (any, error) {
		parts, err := spawn()
		if err != nil {
			return nil, core.E("ide.server.conclave", "compose conclave runtime", err)
		}
		if parts == nil || parts.core == nil || parts.mcp == nil {
			return nil, core.E("ide.server.conclave", "conclave runtime unavailable", nil)
		}
		if result := parts.core.ServiceStartup(ctx, nil); !result.OK {
			if startupErr, ok := result.Value.(error); ok {
				return nil, core.E("ide.server.conclave", "conclave startup failed", startupErr)
			}
			return nil, core.E("ide.server.conclave", "conclave startup failed", nil)
		}
		defer parts.core.ServiceShutdown(context.Background())

		record, ok := toolRecordFor(parts.mcp, name)
		if !ok || record.RESTHandler == nil {
			return nil, core.E("ide.server.conclave", core.Concat("tool not found in conclave: ", name), nil)
		}
		return record.RESTHandler(ctx, body)
	}
}

func toolRecordFor(svc *coremcp.Service, name string) (coremcp.ToolRecord, bool) {
	if svc == nil {
		return coremcp.ToolRecord{}, false
	}
	for _, record := range svc.Tools() {
		if record.Name == name {
			return record, true
		}
	}
	return coremcp.ToolRecord{}, false
}

func setToolRecords(svc *coremcp.Service, records []coremcp.ToolRecord) {
	value := reflect.ValueOf(svc).Elem().FieldByName("tools")
	target := reflect.NewAt(value.Type(), unsafe.Pointer(value.UnsafeAddr())).Elem()
	target.Set(reflect.ValueOf(records))
}
