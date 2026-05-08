// SPDX-License-Identifier: EUPL-1.2

package server

import (
	"context"
	"database/sql"
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"

	_ "github.com/marcboeker/go-duckdb"
)

// cache_* — DuckDB-backed application state cache. Snider's nudge:
// "use a duckdb file to load up application state, so we don't have
// to scan for all the repos or whatever, but refresh instead". The
// scanning panels (memory / sessions / ts / php) used to walk the
// filesystem on every navigation; with this they hit a single
// DuckDB query and refresh in the background.
//
// Schema is intentionally simple — one big kv table:
//   cache_kv(collection TEXT, key TEXT, data JSON, refreshed_at TIMESTAMP, PRIMARY KEY(collection, key))
// Plus a metadata row tracking last_full_scan per collection:
//   cache_meta(collection TEXT PRIMARY KEY, last_full_scan TIMESTAMP, item_count INT)
//
// Bridge tools:
//   cache_status — list all collections with row count + age
//   cache_clear  — drop a single collection (forces next scan)
//
// The wrapped scanning bridges (memory_list at v1) check cacheAge() and
// either serve from cache or trigger a fresh scan + write-through.

const cacheDBRelativePath = "ide-cache.db"

var (
	cacheDB     *sql.DB
	cacheDBOnce sync.Once
	cacheDBErr  error
	cacheDBMu   sync.Mutex
)

func openCacheDB() (*sql.DB, error) {
	cacheDBOnce.Do(func() {
		home, err := os.UserHomeDir()
		if err != nil {
			cacheDBErr = err
			return
		}
		dir := filepath.Join(home, ".core")
		if err := os.MkdirAll(dir, 0o755); err != nil {
			cacheDBErr = err
			return
		}
		path := filepath.Join(dir, cacheDBRelativePath)
		conn, err := sql.Open("duckdb", path)
		if err != nil {
			cacheDBErr = err
			return
		}
		if err := conn.Ping(); err != nil {
			_ = conn.Close()
			cacheDBErr = err
			return
		}
		// Schema. Idempotent — safe to run on every open. Timestamps
		// stored as ISO strings — DuckDB's TIMESTAMP scan into
		// sql.NullTime didn't round-trip cleanly with the v1.8.5 driver,
		// so we keep it as VARCHAR + parse on read.
		stmts := []string{
			`CREATE TABLE IF NOT EXISTS cache_kv(
				collection VARCHAR NOT NULL,
				key VARCHAR NOT NULL,
				data JSON NOT NULL,
				refreshed_at VARCHAR NOT NULL,
				PRIMARY KEY(collection, key)
			)`,
			`CREATE TABLE IF NOT EXISTS cache_meta(
				collection VARCHAR PRIMARY KEY,
				last_full_scan VARCHAR,
				item_count INTEGER
			)`,
		}
		for _, s := range stmts {
			if _, err := conn.Exec(s); err != nil {
				_ = conn.Close()
				cacheDBErr = err
				return
			}
		}
		cacheDB = conn
	})
	return cacheDB, cacheDBErr
}

// cacheGetCollection returns []map[string]any decoded from the json blobs,
// plus the last_full_scan timestamp. Returns ("", nil, ok=false) when the
// collection has never been cached.
func cacheGetCollection(collection string) (lastScan time.Time, items []json.RawMessage, ok bool) {
	db, err := openCacheDB()
	if err != nil {
		return time.Time{}, nil, false
	}
	cacheDBMu.Lock()
	defer cacheDBMu.Unlock()

	var lsStr string
	row := db.QueryRow(`SELECT last_full_scan FROM cache_meta WHERE collection = ?`, collection)
	if err := row.Scan(&lsStr); err != nil {
		return time.Time{}, nil, false
	}
	ls, err := time.Parse(time.RFC3339, lsStr)
	if err != nil {
		return time.Time{}, nil, false
	}

	rows, err := db.Query(`SELECT CAST(data AS VARCHAR) FROM cache_kv WHERE collection = ? ORDER BY refreshed_at DESC`, collection)
	if err != nil {
		return ls, nil, false
	}
	defer func() { _ = rows.Close() }()

	out := make([]json.RawMessage, 0, 64)
	for rows.Next() {
		var raw string
		if err := rows.Scan(&raw); err != nil {
			continue
		}
		out = append(out, json.RawMessage(raw))
	}
	return ls, out, true
}

// cacheSetCollection rewrites a collection: deletes all rows, inserts
// the fresh set, updates last_full_scan. Each item must be (key, JSON-able).
func cacheSetCollection(collection string, items []cacheItem) error {
	db, err := openCacheDB()
	if err != nil {
		return err
	}
	cacheDBMu.Lock()
	defer cacheDBMu.Unlock()

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.Exec(`DELETE FROM cache_kv WHERE collection = ?`, collection); err != nil {
		return err
	}
	stmt, err := tx.Prepare(`INSERT INTO cache_kv(collection, key, data, refreshed_at) VALUES(?, ?, ?, ?)`)
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	nowStr := now.Format(time.RFC3339)
	for _, it := range items {
		blob, err := json.Marshal(it.Data)
		if err != nil {
			continue
		}
		if _, err := stmt.Exec(collection, it.Key, string(blob), nowStr); err != nil {
			_ = stmt.Close()
			return err
		}
	}
	_ = stmt.Close()
	if _, err := tx.Exec(`INSERT INTO cache_meta(collection, last_full_scan, item_count) VALUES(?, ?, ?)
		ON CONFLICT (collection) DO UPDATE SET last_full_scan = excluded.last_full_scan, item_count = excluded.item_count`,
		collection, nowStr, len(items)); err != nil {
		return err
	}
	return tx.Commit()
}

func cacheClearCollection(collection string) error {
	db, err := openCacheDB()
	if err != nil {
		return err
	}
	cacheDBMu.Lock()
	defer cacheDBMu.Unlock()
	if _, err := db.Exec(`DELETE FROM cache_kv WHERE collection = ?`, collection); err != nil {
		return err
	}
	if _, err := db.Exec(`DELETE FROM cache_meta WHERE collection = ?`, collection); err != nil {
		return err
	}
	return nil
}

type cacheItem struct {
	Key  string
	Data any
}

// CacheScan wraps the standard cache-or-scan dance. Bridges call this
// with a TTL, an extractKey func, and a scan func that returns []any.
//
// On hit: returns cached []json.RawMessage (caller decodes) + true.
// On miss: runs scan, persists results, returns []json.RawMessage of
// the same items + false.
func cacheGetOrScan[T any](collection string, ttl time.Duration, force bool, extractKey func(T) string, scan func() ([]T, error)) ([]json.RawMessage, bool, error) {
	if !force && cacheAge(collection) < ttl {
		_, raws, ok := cacheGetCollection(collection)
		if ok && len(raws) > 0 {
			return raws, true, nil
		}
	}
	items, err := scan()
	if err != nil {
		return nil, false, err
	}
	cacheItems := make([]cacheItem, 0, len(items))
	encoded := make([]json.RawMessage, 0, len(items))
	for _, it := range items {
		blob, mErr := json.Marshal(it)
		if mErr != nil {
			continue
		}
		cacheItems = append(cacheItems, cacheItem{Key: extractKey(it), Data: it})
		encoded = append(encoded, json.RawMessage(blob))
	}
	_ = cacheSetCollection(collection, cacheItems)
	return encoded, false, nil
}

// cacheAge returns the time elapsed since the collection's last full scan.
// Returns a very large duration when the collection is uncached so callers
// treat it as "definitely stale".
func cacheAge(collection string) time.Duration {
	db, err := openCacheDB()
	if err != nil {
		return 100 * 365 * 24 * time.Hour
	}
	cacheDBMu.Lock()
	defer cacheDBMu.Unlock()
	var lsStr string
	row := db.QueryRow(`SELECT last_full_scan FROM cache_meta WHERE collection = ?`, collection)
	if err := row.Scan(&lsStr); err != nil {
		return 100 * 365 * 24 * time.Hour
	}
	ls, err := time.Parse(time.RFC3339, lsStr)
	if err != nil {
		return 100 * 365 * 24 * time.Hour
	}
	return time.Since(ls)
}

// toolCacheStatus surfaces every cached collection with its row count
// and age — useful for the cache panel ("memory: 455 entries, 2m old").
func (b *MCPBridge) toolCacheStatus(_ context.Context, _ map[string]any) map[string]any {
	db, err := openCacheDB()
	if err != nil {
		return map[string]any{"ok": false, "error": err.Error()}
	}
	cacheDBMu.Lock()
	defer cacheDBMu.Unlock()
	rows, err := db.Query(`SELECT collection, last_full_scan, item_count FROM cache_meta ORDER BY last_full_scan DESC`)
	if err != nil {
		return map[string]any{"ok": false, "error": err.Error()}
	}
	defer func() { _ = rows.Close() }()
	type meta struct {
		Collection   string `json:"collection"`
		LastFullScan string `json:"last_full_scan"`
		ItemCount    int    `json:"item_count"`
		AgeSeconds   int64  `json:"age_seconds"`
	}
	out := make([]meta, 0, 8)
	now := time.Now()
	for rows.Next() {
		var m meta
		var tsStr string
		if err := rows.Scan(&m.Collection, &tsStr, &m.ItemCount); err != nil {
			continue
		}
		ts, err := time.Parse(time.RFC3339, tsStr)
		if err == nil {
			m.LastFullScan = ts.UTC().Format(time.RFC3339)
			m.AgeSeconds = int64(now.Sub(ts).Seconds())
		} else {
			m.LastFullScan = tsStr
		}
		out = append(out, m)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].AgeSeconds < out[j].AgeSeconds })
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"collections": out,
			"count":       len(out),
		},
	}
}

// toolCacheDebug — temp diagnostic. Returns raw cacheAge + first row's
// scan result for the requested collection.
func (b *MCPBridge) toolCacheDebug(_ context.Context, params map[string]any) map[string]any {
	collection := paramString(params, "collection", "memory")
	db, err := openCacheDB()
	if err != nil {
		return map[string]any{"ok": false, "error": err.Error()}
	}
	cacheDBMu.Lock()
	defer cacheDBMu.Unlock()
	var totalKv int
	_ = db.QueryRow(`SELECT count(*) FROM cache_kv`).Scan(&totalKv)
	var matchKv int
	_ = db.QueryRow(`SELECT count(*) FROM cache_kv WHERE collection = ?`, collection).Scan(&matchKv)
	var matchKvLiteral int
	_ = db.QueryRow(`SELECT count(*) FROM cache_kv WHERE collection = '` + collection + `'`).Scan(&matchKvLiteral)
	var distinctCollections []string
	rows, _ := db.Query(`SELECT DISTINCT collection FROM cache_kv`)
	if rows != nil {
		for rows.Next() {
			var c string
			if err := rows.Scan(&c); err == nil {
				distinctCollections = append(distinctCollections, c)
			}
		}
		_ = rows.Close()
	}
	// Try the actual cacheGetCollection query to see if ORDER BY breaks
	var dataRows int
	var firstDataErr string
	dataR, err := db.Query(`SELECT data FROM cache_kv WHERE collection = ? ORDER BY refreshed_at DESC`, collection)
	if err != nil {
		firstDataErr = err.Error()
	} else {
		for dataR.Next() {
			var s string
			if err := dataR.Scan(&s); err != nil {
				firstDataErr = err.Error()
				break
			}
			dataRows++
		}
		_ = dataR.Close()
	}
	return map[string]any{
		"ok": true,
		"value": map[string]any{
			"collection":            collection,
			"total_kv_rows":         totalKv,
			"match_kv_param":        matchKv,
			"match_kv_literal":      matchKvLiteral,
			"distinct_collections":  distinctCollections,
			"data_rows_via_orderby": dataRows,
			"data_err":              firstDataErr,
		},
	}
}

func (b *MCPBridge) toolCacheClear(_ context.Context, params map[string]any) map[string]any {
	collection := paramString(params, "collection", "")
	if collection == "" {
		return map[string]any{"ok": false, "error": "collection required"}
	}
	if err := cacheClearCollection(collection); err != nil {
		return map[string]any{"ok": false, "error": err.Error()}
	}
	return map[string]any{"ok": true, "value": map[string]any{"cleared": collection}}
}
