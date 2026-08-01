// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"

	core "dappco.re/go"
)

// orm_* bridge tools — IDE surface over the canonical core/orm Bridge +
// Service. Frontend's /data panel calls these to list tables / query rows
// / insert new rows. The bridge dispatches via Core actions registered by
// orm.Register(c) — same dispatch path the rest of the IDE uses.

func (b *MCPBridge) toolOrmTables(_ context.Context, _ map[string]any) map[string]any {
	// Hardcoded mirror of ideOrmSchemas() for v1. v2: ask the orm service
	// for its registered tables when that surface lands.
	backend, _ := currentOrmBackend()
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"tables": []map[string]any{
				{
					"name":    "note",
					"pk":      []string{"id"},
					"fields":  []string{"id", "title", "body", "created_at"},
					"medium":  "default",
					"backend": backend,
				},
			},
		},
	}
}

// toolOrmBackend reports the current backend + DuckDB file path; with
// `name` set, switches the backend.
func (b *MCPBridge) toolOrmBackend(_ context.Context, params map[string]any) map[string]any {
	if name := paramString(params, "name", ""); name != "" {
		path, err := switchOrmBackend(name)
		if err != nil {
			return map[string]any{"ok": false, "error": err.Error()}
		}
		current, _ := currentOrmBackend()
		return map[string]any{
			"ok": true,
			"value": map[string]any{
				"current":   current,
				"duck_path": path,
			},
		}
	}
	current, path := currentOrmBackend()
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"current":   current,
			"duck_path": path,
			"available": []string{"memium", "duckdb"},
		},
	}
}

// toolOrmGet runs a table-scan query via the orm.get action. Optional
// where[] / order[] / limit / offset map onto orm.GetDTO. Returns the
// rows as []map[string]any.
func (b *MCPBridge) toolOrmGet(ctx context.Context, params map[string]any) map[string]any {
	table := paramString(params, "table", "")
	if table == "" {
		return errResp("table is required")
	}
	limit := paramInt(params, "limit", 50)

	opts := core.NewOptions(
		core.Option{Key: "table", Value: table},
		core.Option{Key: "limit", Value: limit},
	)
	result := b.Core().Action("orm.get").Run(ctx, opts)
	return ormResultToResponse(result)
}

// toolOrmCount returns the row count for a table.
func (b *MCPBridge) toolOrmCount(ctx context.Context, params map[string]any) map[string]any {
	table := paramString(params, "table", "")
	if table == "" {
		return errResp("table is required")
	}
	result := b.Core().Action("orm.count").Run(ctx, core.NewOptions(
		core.Option{Key: "table", Value: table},
	))
	return ormResultToResponse(result)
}

// toolOrmSave inserts/upserts a row. params.row is a flat map of
// field → value; the bridge wraps it in the orm.SaveDTO shape Action
// expects.
func (b *MCPBridge) toolOrmSave(ctx context.Context, params map[string]any) map[string]any {
	table := paramString(params, "table", "")
	if table == "" {
		return errResp("table is required")
	}
	row, ok := params["row"].(map[string]any)
	if !ok {
		return errResp("row is required (object)")
	}
	rows := []any{row}
	result := b.Core().Action("orm.save").Run(ctx, core.NewOptions(
		core.Option{Key: "table", Value: table},
		core.Option{Key: "rows", Value: rows},
	))
	return ormResultToResponse(result)
}

// toolOrmDelete removes rows matching a single-field predicate. v1
// supports field+value equality only; complex predicates land via
// orm.delete_all later.
func (b *MCPBridge) toolOrmDelete(ctx context.Context, params map[string]any) map[string]any {
	table := paramString(params, "table", "")
	field := paramString(params, "field", "")
	value, hasValue := params["value"]
	if table == "" || field == "" || !hasValue {
		return errResp("table + field + value are required")
	}
	preds := []map[string]any{
		{"field": field, "op": "=", "value": value},
	}
	result := b.Core().Action("orm.delete_all").Run(ctx, core.NewOptions(
		core.Option{Key: "table", Value: table},
		core.Option{Key: "where", Value: preds},
	))
	return ormResultToResponse(result)
}

func ormResultToResponse(result core.Result) map[string]any {
	if !result.OK {
		if err, ok := result.Value.(error); ok {
			return map[string]any{"ok": false, "error": err.Error()}
		}
		return map[string]any{"ok": false, "error": "orm action failed"}
	}
	return map[string]any{"ok": true, "value": result.Value}
}
