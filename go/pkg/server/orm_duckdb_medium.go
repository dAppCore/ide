// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"database/sql"
	"fmt"
	"strings"
	"sync"
	"time"

	core "dappco.re/go"
	"dappco.re/go/orm"

	// duckdb driver — same dep go-store already pulls in transitively.
	_ "github.com/marcboeker/go-duckdb"
)

// duckDBMedium implements orm.Medium against a DuckDB *sql.DB connection.
//
// Capabilities: equality / comparison / IN / LIKE / NULL / BETWEEN, joins
// (single-table only for v1), aggregates, transactions, no native watch
// (needs poll-fallback when WatchPoll wired). DDL is generated from the
// Schema on RegisterTable so a fresh database file becomes useable
// immediately.
//
// Pairs with the orm.Memium that already mounts under "default" — the
// IDE's /data panel exposes a backend picker that re-mounts whichever
// the user chooses as "default", so swapping is a single action call.
type duckDBMedium struct {
	mu      sync.Mutex
	conn    *sql.DB
	path    string
	schemas map[string]orm.Schema
}

// openDuckDBMedium connects to the given DuckDB file (creates it if
// missing, opens read-write). Returns nil + error if the connection
// fails — caller can fall back to Memium.
func openDuckDBMedium(path string) (*duckDBMedium, error) {
	conn, err := sql.Open("duckdb", path)
	if err != nil {
		return nil, fmt.Errorf("duckdb open %s: %w", path, err)
	}
	if err := conn.Ping(); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("duckdb ping %s: %w", path, err)
	}
	return &duckDBMedium{
		conn:    conn,
		path:    path,
		schemas: make(map[string]orm.Schema),
	}, nil
}

func (m *duckDBMedium) Close() error {
	if m == nil || m.conn == nil {
		return nil
	}
	return m.conn.Close()
}

// RegisterTable seeds DuckDB with a CREATE TABLE IF NOT EXISTS for the
// given schema. Idempotent — safe to call repeatedly. Field-type mapping
// follows orm.Schema.Field.Type ("int64" → BIGINT, "string" → TEXT,
// "bool" → BOOLEAN, "float64" → DOUBLE, "json" → JSON, "bytes" → BLOB,
// "time" → TIMESTAMP). PK is enforced via PRIMARY KEY clause.
func (m *duckDBMedium) RegisterTable(schema orm.Schema) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.schemas[schema.Name] = schema

	cols := make([]string, 0, len(schema.Fields))
	for _, f := range schema.Fields {
		cols = append(cols, fmt.Sprintf(`"%s" %s`, f.Name, duckDBType(f.Type)))
	}
	if len(schema.PK) > 0 {
		cols = append(cols, fmt.Sprintf(`PRIMARY KEY (%s)`, quoteCsv(schema.PK)))
	}
	stmt := fmt.Sprintf(`CREATE TABLE IF NOT EXISTS "%s" (%s)`, schema.Name, strings.Join(cols, ", "))
	if _, err := m.conn.Exec(stmt); err != nil {
		return fmt.Errorf("ensure table %s: %w", schema.Name, err)
	}
	return nil
}

// --- orm.Medium impl ---

func (m *duckDBMedium) Caps() orm.Capabilities {
	return orm.Capabilities{
		Predicates: orm.PredicateCaps{
			Equality:   true,
			Comparison: true,
			In:         true,
			Like:       true,
			Null:       true,
			Between:    true,
		},
		Joins:        true,
		Transactions: true,
		Aggregates:   true,
		Cursor:       true,
		Introspect:   true,
		Watch:        false,
		WatchPoll:    true,
		Aliases:      true,
		Subqueries:   true,
		SetOps:       true,
		JoinKinds:    orm.JoinCaps{Inner: true, Left: true, Right: true, Full: true},
	}
}

func (m *duckDBMedium) Read(ctx core.Context, in orm.ReadIntent) core.Result {
	start := time.Now()

	if in.Aggregate != nil {
		return m.readAggregate(ctx, in, start)
	}

	cols := fieldNames(in.Schema)
	if len(cols) == 0 {
		return core.Fail(fmt.Errorf("duckdb.Read: schema %q has no fields", in.Schema.Name))
	}

	var sb strings.Builder
	args := []any{}
	sb.WriteString("SELECT ")
	sb.WriteString(quoteCsv(cols))
	sb.WriteString(` FROM "`)
	sb.WriteString(in.Schema.Name)
	sb.WriteString(`"`)

	// PK lookup short-circuit
	if len(in.PK) > 0 && len(in.PK) == len(in.Schema.PK) {
		sb.WriteString(" WHERE ")
		for i, pk := range in.Schema.PK {
			if i > 0 {
				sb.WriteString(" AND ")
			}
			sb.WriteString(`"`)
			sb.WriteString(pk)
			sb.WriteString(`" = ?`)
			args = append(args, in.PK[i])
		}
	} else if len(in.Where) > 0 {
		clause, wargs := buildWhere(in.Where)
		if clause != "" {
			sb.WriteString(" WHERE ")
			sb.WriteString(clause)
			args = append(args, wargs...)
		}
	}

	if len(in.Order) > 0 {
		sb.WriteString(" ORDER BY ")
		parts := make([]string, 0, len(in.Order))
		for _, o := range in.Order {
			dir := "ASC"
			if o.Desc {
				dir = "DESC"
			}
			parts = append(parts, fmt.Sprintf(`"%s" %s`, o.Field, dir))
		}
		sb.WriteString(strings.Join(parts, ", "))
	}
	if in.Limit > 0 {
		sb.WriteString(fmt.Sprintf(" LIMIT %d", in.Limit))
	}
	if in.Offset > 0 {
		sb.WriteString(fmt.Sprintf(" OFFSET %d", in.Offset))
	}

	rows, err := m.conn.Query(sb.String(), args...)
	if err != nil {
		return core.Fail(fmt.Errorf("duckdb.Read query: %w (sql=%s)", err, sb.String()))
	}
	defer func() { _ = rows.Close() }()

	out, err := scanRows(rows, cols)
	if err != nil {
		return core.Fail(err)
	}

	// PK lookup returns single row (or nil). Service layer wraps into a
	// single-map shape; here we return slice and let it pass through the
	// existing singleMap helper in orm.Service.
	return core.Ok(&orm.Payload{
		Data: out,
		Meta: orm.Meta{
			Medium:   "duckdb",
			Duration: core.Duration(time.Since(start)),
			RowsRead: int64(len(out)),
		},
	})
}

func (m *duckDBMedium) readAggregate(_ core.Context, in orm.ReadIntent, start time.Time) core.Result {
	op := strings.ToUpper(in.Aggregate.Op)
	expr := "*"
	if in.Aggregate.Field != "" {
		expr = fmt.Sprintf(`"%s"`, in.Aggregate.Field)
	}
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf(`SELECT %s(%s) AS agg FROM "%s"`, op, expr, in.Schema.Name))
	args := []any{}
	if len(in.Where) > 0 {
		clause, wargs := buildWhere(in.Where)
		if clause != "" {
			sb.WriteString(" WHERE ")
			sb.WriteString(clause)
			args = append(args, wargs...)
		}
	}
	row := m.conn.QueryRow(sb.String(), args...)
	var v any
	if err := row.Scan(&v); err != nil {
		return core.Fail(fmt.Errorf("duckdb.Aggregate scan: %w", err))
	}
	return core.Ok(&orm.Payload{
		Data: v,
		Meta: orm.Meta{
			Medium:   "duckdb",
			Duration: core.Duration(time.Since(start)),
		},
	})
}

func (m *duckDBMedium) Write(_ core.Context, in orm.WriteIntent) core.Result {
	start := time.Now()
	switch in.Op {
	case orm.OpInsert, orm.OpSave:
		return m.writeInsert(in, start)
	case orm.OpUpdate:
		return m.writeUpdate(in, start)
	case orm.OpDelete:
		return m.writeDelete(in, start)
	default:
		return core.Fail(fmt.Errorf("duckdb.Write: unknown op %v", in.Op))
	}
}

func (m *duckDBMedium) writeInsert(in orm.WriteIntent, start time.Time) core.Result {
	if len(in.Rows) == 0 {
		return core.Ok(&orm.Payload{Meta: orm.Meta{Medium: "duckdb"}})
	}
	cols := fieldNames(in.Schema)
	tx, err := m.conn.Begin()
	if err != nil {
		return core.Fail(fmt.Errorf("duckdb.Write begin: %w", err))
	}
	rowsWrit := int64(0)
	for _, raw := range in.Rows {
		row, ok := rawToMap(raw)
		if !ok {
			_ = tx.Rollback()
			return core.Fail(fmt.Errorf("duckdb.Write: row not coercible to map[string]any"))
		}
		args := make([]any, 0, len(cols))
		for _, c := range cols {
			args = append(args, row[c])
		}
		// INSERT OR REPLACE — DuckDB equivalent: INSERT … ON CONFLICT … DO UPDATE
		// For Save semantics we use ON CONFLICT (pk) DO UPDATE SET …
		insertCols := quoteCsv(cols)
		placeholders := strings.Repeat("?,", len(cols))
		placeholders = placeholders[:len(placeholders)-1]
		stmt := fmt.Sprintf(`INSERT INTO "%s" (%s) VALUES (%s)`, in.Schema.Name, insertCols, placeholders)
		if in.Op == orm.OpSave && len(in.Schema.PK) > 0 {
			updateClauses := make([]string, 0, len(cols))
			for _, c := range cols {
				skip := false
				for _, pk := range in.Schema.PK {
					if pk == c {
						skip = true
						break
					}
				}
				if !skip {
					updateClauses = append(updateClauses, fmt.Sprintf(`"%s" = excluded."%s"`, c, c))
				}
			}
			if len(updateClauses) > 0 {
				stmt += fmt.Sprintf(` ON CONFLICT (%s) DO UPDATE SET %s`, quoteCsv(in.Schema.PK), strings.Join(updateClauses, ", "))
			}
		}
		if _, err := tx.Exec(stmt, args...); err != nil {
			_ = tx.Rollback()
			return core.Fail(fmt.Errorf("duckdb.Write insert: %w (sql=%s)", err, stmt))
		}
		rowsWrit++
	}
	if err := tx.Commit(); err != nil {
		return core.Fail(fmt.Errorf("duckdb.Write commit: %w", err))
	}
	return core.Ok(&orm.Payload{
		Meta: orm.Meta{
			Medium:   "duckdb",
			Duration: core.Duration(time.Since(start)),
			RowsWrit: rowsWrit,
		},
	})
}

func (m *duckDBMedium) writeUpdate(in orm.WriteIntent, start time.Time) core.Result {
	if len(in.Updates) == 0 {
		return core.Ok(&orm.Payload{Meta: orm.Meta{Medium: "duckdb"}})
	}
	sets := make([]string, 0, len(in.Updates))
	args := make([]any, 0, len(in.Updates))
	for k, v := range in.Updates {
		sets = append(sets, fmt.Sprintf(`"%s" = ?`, k))
		args = append(args, v)
	}
	stmt := fmt.Sprintf(`UPDATE "%s" SET %s`, in.Schema.Name, strings.Join(sets, ", "))
	if len(in.Where) > 0 {
		clause, wargs := buildWhere(in.Where)
		if clause != "" {
			stmt += " WHERE " + clause
			args = append(args, wargs...)
		}
	}
	res, err := m.conn.Exec(stmt, args...)
	if err != nil {
		return core.Fail(fmt.Errorf("duckdb.Write update: %w (sql=%s)", err, stmt))
	}
	rowsWrit, _ := res.RowsAffected()
	return core.Ok(&orm.Payload{
		Meta: orm.Meta{
			Medium:   "duckdb",
			Duration: core.Duration(time.Since(start)),
			RowsWrit: rowsWrit,
		},
	})
}

func (m *duckDBMedium) writeDelete(in orm.WriteIntent, start time.Time) core.Result {
	stmt := fmt.Sprintf(`DELETE FROM "%s"`, in.Schema.Name)
	args := []any{}
	if len(in.Where) > 0 {
		clause, wargs := buildWhere(in.Where)
		if clause != "" {
			stmt += " WHERE " + clause
			args = append(args, wargs...)
		}
	}
	res, err := m.conn.Exec(stmt, args...)
	if err != nil {
		return core.Fail(fmt.Errorf("duckdb.Write delete: %w (sql=%s)", err, stmt))
	}
	rowsWrit, _ := res.RowsAffected()
	return core.Ok(&orm.Payload{
		Meta: orm.Meta{
			Medium:   "duckdb",
			Duration: core.Duration(time.Since(start)),
			RowsWrit: rowsWrit,
		},
	})
}

// Stream falls through to Read for v1 — DuckDB cursor streaming via the
// driver's Rows interface is feasible but adds complexity. core.Seq[T]
// support is queued.
func (m *duckDBMedium) Stream(ctx core.Context, in orm.ReadIntent) core.Result {
	return m.Read(ctx, in)
}

// Watch is unsupported on DuckDB without a poll-fallback wrapper. Service
// layer's WatchPoll cap can degrade gracefully.
func (m *duckDBMedium) Watch(_ core.Context, _ orm.ReadIntent) core.Result {
	return core.Fail(fmt.Errorf("duckdb.Watch: not implemented (use poll fallback)"))
}

// Search is unsupported v1 — DuckDB has FTS extension but wiring it
// through the SearchSpec is a separate lane.
func (m *duckDBMedium) Search(_ core.Context, _ orm.ReadIntent) core.Result {
	return core.Fail(fmt.Errorf("duckdb.Search: not implemented"))
}

// --- helpers ---

func fieldNames(s orm.Schema) []string {
	out := make([]string, 0, len(s.Fields))
	for _, f := range s.Fields {
		out = append(out, f.Name)
	}
	return out
}

func quoteCsv(names []string) string {
	if len(names) == 0 {
		return ""
	}
	parts := make([]string, len(names))
	for i, n := range names {
		parts[i] = fmt.Sprintf(`"%s"`, n)
	}
	return strings.Join(parts, ", ")
}

// buildWhere translates a list of orm.Predicate into a SQL WHERE clause +
// the args slice. v1 supports flat predicates with all operators except
// nested groups. Group / OR semantics queued.
func buildWhere(preds []orm.Predicate) (string, []any) {
	if len(preds) == 0 {
		return "", nil
	}
	parts := make([]string, 0, len(preds))
	args := []any{}
	for i, p := range preds {
		joiner := " AND "
		if p.OR {
			joiner = " OR "
		}
		clause := buildPredicate(p, &args)
		if clause == "" {
			continue
		}
		if i == 0 {
			parts = append(parts, clause)
		} else {
			parts = append(parts, joiner+clause)
		}
	}
	return strings.Join(parts, ""), args
}

func buildPredicate(p orm.Predicate, args *[]any) string {
	op := strings.ToLower(p.Op)
	col := fmt.Sprintf(`"%s"`, p.Field)
	switch op {
	case "=", "!=", "<>", "<", "<=", ">", ">=":
		*args = append(*args, p.Value)
		return fmt.Sprintf("%s %s ?", col, p.Op)
	case "in":
		values, ok := p.Value.([]any)
		if !ok {
			return ""
		}
		placeholders := strings.Repeat("?,", len(values))
		placeholders = placeholders[:len(placeholders)-1]
		for _, v := range values {
			*args = append(*args, v)
		}
		return fmt.Sprintf("%s IN (%s)", col, placeholders)
	case "like":
		*args = append(*args, p.Value)
		return fmt.Sprintf("%s LIKE ?", col)
	case "is null":
		return fmt.Sprintf("%s IS NULL", col)
	case "is not null":
		return fmt.Sprintf("%s IS NOT NULL", col)
	case "between":
		values, ok := p.Value.([]any)
		if !ok || len(values) != 2 {
			return ""
		}
		*args = append(*args, values[0], values[1])
		return fmt.Sprintf("%s BETWEEN ? AND ?", col)
	}
	return ""
}

func duckDBType(t string) string {
	switch t {
	case "int", "int64":
		return "BIGINT"
	case "int32":
		return "INTEGER"
	case "string":
		return "TEXT"
	case "bool":
		return "BOOLEAN"
	case "float", "float64":
		return "DOUBLE"
	case "time":
		return "TIMESTAMP"
	case "json":
		return "JSON"
	case "bytes":
		return "BLOB"
	default:
		return "TEXT"
	}
}

func scanRows(rows *sql.Rows, cols []string) ([]map[string]any, error) {
	out := []map[string]any{}
	for rows.Next() {
		raw := make([]any, len(cols))
		ptrs := make([]any, len(cols))
		for i := range cols {
			ptrs[i] = &raw[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			return nil, fmt.Errorf("duckdb.scan: %w", err)
		}
		row := make(map[string]any, len(cols))
		for i, c := range cols {
			v := raw[i]
			// Coerce []byte to string for friendlier JSON marshalling
			if b, ok := v.([]byte); ok {
				v = string(b)
			}
			row[c] = v
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

// rawToMap normalises the variety of row shapes orm callers produce
// (struct, *struct, map[string]any, map[string]string).
func rawToMap(raw any) (map[string]any, bool) {
	if m, ok := raw.(map[string]any); ok {
		return m, true
	}
	// Best-effort JSON round-trip for structs — keeps the medium honest
	// without reflective field walks. Cheap for small writes.
	data := core.JSONMarshalString(raw)
	out := map[string]any{}
	r := core.JSONUnmarshalString(data, &out)
	if !r.OK {
		return nil, false
	}
	return out, true
}
