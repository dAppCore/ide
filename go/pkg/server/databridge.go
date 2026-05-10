// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"

	core "dappco.re/go"
)

// dataBridge — typed wails wrapper over MCPBridge orm_* tools (Memium /
// DuckDB-backed ORM surface).
type dataBridge struct {
	core *core.Core
}

type DataTable struct {
	Name    string   `json:"name"`
	PK      []string `json:"pk"`
	Fields  []string `json:"fields"`
	Medium  string   `json:"medium"`
	Backend string   `json:"backend"`
}

type DataTablesOutput struct {
	OK     bool        `json:"ok"`
	Tables []DataTable `json:"tables,omitempty"`
	Error  string      `json:"error,omitempty"`
}

type DataBackendInput struct {
	Name string `json:"name,omitempty"`
}

type DataBackendOutput struct {
	OK        bool     `json:"ok"`
	Current   string   `json:"current,omitempty"`
	DuckPath  string   `json:"duck_path,omitempty"`
	Available []string `json:"available,omitempty"`
	Error     string   `json:"error,omitempty"`
}

type DataGetInput struct {
	Table string `json:"table"`
	Limit int    `json:"limit,omitempty"`
}

type DataRowsOutput struct {
	OK    bool             `json:"ok"`
	Rows  []map[string]any `json:"rows,omitempty"`
	Error string           `json:"error,omitempty"`
}

type DataCountInput struct {
	Table string `json:"table"`
}

type DataCountOutput struct {
	OK    bool   `json:"ok"`
	Count int    `json:"count,omitempty"`
	Error string `json:"error,omitempty"`
}

type DataSaveInput struct {
	Table string         `json:"table"`
	Row   map[string]any `json:"row"`
}

type DataDeleteInput struct {
	Table string `json:"table"`
	Field string `json:"field"`
	Value any    `json:"value"`
}

type DataMutationOutput struct {
	OK    bool   `json:"ok"`
	Error string `json:"error,omitempty"`
}

func (b *dataBridge) mcp() *MCPBridge {
	if b == nil || b.core == nil {
		return nil
	}
	s, _ := core.ServiceFor[*MCPBridge](b.core, "mcp_bridge")
	return s
}

func decodeDataTables(raw any) []DataTable {
	list, ok := raw.([]any)
	if !ok {
		return nil
	}
	out := make([]DataTable, 0, len(list))
	for _, item := range list {
		tm, ok := item.(map[string]any)
		if !ok {
			continue
		}
		t := DataTable{}
		if s, ok := tm["name"].(string); ok {
			t.Name = s
		}
		if s, ok := tm["medium"].(string); ok {
			t.Medium = s
		}
		if s, ok := tm["backend"].(string); ok {
			t.Backend = s
		}
		if list, ok := tm["pk"].([]any); ok {
			for _, p := range list {
				if s, ok := p.(string); ok {
					t.PK = append(t.PK, s)
				}
			}
		}
		if list, ok := tm["fields"].([]any); ok {
			for _, f := range list {
				if s, ok := f.(string); ok {
					t.Fields = append(t.Fields, s)
				}
			}
		}
		out = append(out, t)
	}
	return out
}

func (b *dataBridge) Tables() (DataTablesOutput, error) {
	m := b.mcp()
	if m == nil {
		return DataTablesOutput{}, core.E("ide.server.Data.Tables", "mcp bridge unavailable", nil)
	}
	raw := m.toolOrmTables(nil, nil)
	out := DataTablesOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value != nil {
		out.Tables = decodeDataTables(value["tables"])
	}
	return out, nil
}

func (b *dataBridge) Backend(input DataBackendInput) (DataBackendOutput, error) {
	m := b.mcp()
	if m == nil {
		return DataBackendOutput{}, core.E("ide.server.Data.Backend", "mcp bridge unavailable", nil)
	}
	params := map[string]any{}
	if input.Name != "" {
		params["name"] = input.Name
	}
	raw := m.toolOrmBackend(nil, params)
	out := DataBackendOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	value, _ := raw["value"].(map[string]any)
	if value == nil {
		return out, nil
	}
	if s, ok := value["current"].(string); ok {
		out.Current = s
	}
	if s, ok := value["duck_path"].(string); ok {
		out.DuckPath = s
	}
	if list, ok := value["available"].([]any); ok {
		for _, a := range list {
			if s, ok := a.(string); ok {
				out.Available = append(out.Available, s)
			}
		}
	}
	return out, nil
}

func decodeRows(raw any) []map[string]any {
	list, ok := raw.([]any)
	if !ok {
		return nil
	}
	out := make([]map[string]any, 0, len(list))
	for _, item := range list {
		if rm, ok := item.(map[string]any); ok {
			out = append(out, rm)
		}
	}
	return out
}

func (b *dataBridge) Get(ctx context.Context, input DataGetInput) (DataRowsOutput, error) {
	m := b.mcp()
	if m == nil {
		return DataRowsOutput{}, core.E("ide.server.Data.Get", "mcp bridge unavailable", nil)
	}
	params := map[string]any{"table": input.Table}
	if input.Limit > 0 {
		params["limit"] = input.Limit
	}
	raw := m.toolOrmGet(ctx, params)
	out := DataRowsOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	out.Rows = decodeRows(raw["value"])
	return out, nil
}

func (b *dataBridge) Count(ctx context.Context, input DataCountInput) (DataCountOutput, error) {
	m := b.mcp()
	if m == nil {
		return DataCountOutput{}, core.E("ide.server.Data.Count", "mcp bridge unavailable", nil)
	}
	raw := m.toolOrmCount(ctx, map[string]any{"table": input.Table})
	out := DataCountOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	if n, ok := raw["value"].(float64); ok {
		out.Count = int(n)
	} else if n, ok := raw["value"].(int); ok {
		out.Count = n
	} else if n, ok := raw["value"].(int64); ok {
		out.Count = int(n)
	}
	return out, nil
}

func (b *dataBridge) Save(ctx context.Context, input DataSaveInput) (DataMutationOutput, error) {
	m := b.mcp()
	if m == nil {
		return DataMutationOutput{}, core.E("ide.server.Data.Save", "mcp bridge unavailable", nil)
	}
	raw := m.toolOrmSave(ctx, map[string]any{
		"table": input.Table,
		"row":   input.Row,
	})
	out := DataMutationOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	return out, nil
}

func (b *dataBridge) Delete(ctx context.Context, input DataDeleteInput) (DataMutationOutput, error) {
	m := b.mcp()
	if m == nil {
		return DataMutationOutput{}, core.E("ide.server.Data.Delete", "mcp bridge unavailable", nil)
	}
	raw := m.toolOrmDelete(ctx, map[string]any{
		"table": input.Table,
		"field": input.Field,
		"value": input.Value,
	})
	out := DataMutationOutput{}
	out.OK, _ = raw["ok"].(bool)
	if e, _ := raw["error"].(string); e != "" {
		out.Error = e
	}
	return out, nil
}
