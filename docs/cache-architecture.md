---
title: Application-state cache
description: DuckDB-backed app-state cache that turns scanning panels into single-SELECT reads. ts_detect 770→43ms, forge_repos 410→43ms.
---

# Application-state cache

The IDE used to re-walk the filesystem (or hit remote APIs) on every panel navigation. `ts_detect` walked 5 root dirs to depth 3 classifying 115 projects every time `/ts` was opened — 770ms cold. `forge_repos` HTTP'd Forgejo for 85 repos in `core/` — 410ms.

The fix: store scan results in a DuckDB file, refresh on a per-collection TTL, surface the cache state in the UI.

## Storage

Single file at `~/.core/ide-cache.db`. Generic kv schema:

```sql
CREATE TABLE IF NOT EXISTS cache_kv(
  collection VARCHAR NOT NULL,
  key VARCHAR NOT NULL,
  data JSON NOT NULL,
  refreshed_at VARCHAR NOT NULL,         -- RFC3339 string, NOT timestamp
  PRIMARY KEY(collection, key)
);

CREATE TABLE IF NOT EXISTS cache_meta(
  collection VARCHAR PRIMARY KEY,
  last_full_scan VARCHAR,                 -- RFC3339 string
  item_count INTEGER
);
```

`PRIMARY KEY` on `cache_meta` is **load-bearing** — without it, `ON CONFLICT DO UPDATE` becomes a silent no-op and `last_full_scan` never advances past the first write.

## Cached collections

Each collection has a TTL tuned for how fast its underlying source changes:

| Collection | TTL | Cold | Warm | Speedup | Source |
|------------|-----|------|------|---------|--------|
| `memory` | 5 min | 91 ms | 45 ms | ~2× | `~/.claude/projects/*/memory/*.md` frontmatter |
| `session_projects` | 2 min | 69 ms | 45 ms | ~1.5× | `~/.claude/projects/*` enum + first/last timestamp scan |
| `ts_projects` | 10 min | **770 ms** | **43 ms** | **~18×** | walk 5 root dirs → 115 TS/Deno projects |
| `php_projects` | 10 min | 268 ms | 42 ms | ~6× | walk 3 root dirs → 12 Laravel apps |
| `mantis_issues` | 60 s | 105 ms | 48 ms | ~2× | tasks.lthn.sh REST API (default page only) |
| `forge_orgs` | 5 min | 119 ms | 42 ms | ~3× | forge.lthn.sh `Orgs.ListOrgs` |
| `forge_repos:<org>` | 5 min | **410 ms** | **43 ms** | **~10×** | forge.lthn.sh `Repos.ListOrgRepos` per org |
| `i18n_packages` | 10 min | 188 ms | 46 ms | ~4× | walk for `locales/` dirs in `~/Code/core` |

Per-org collection key (`forge_repos:core`, `forge_repos:agent`, `forge_repos:_user`) lets switching orgs hit independent caches without invalidation.

## API

```go
// Lookup
cacheGetCollection(name) → (lastScan time.Time, items []json.RawMessage, ok bool)
cacheAge(name) → time.Duration         // sentinel ~100yr when uncached

// Mutation
cacheSetCollection(name, []cacheItem)  // DELETE + INSERT in one transaction
cacheClearCollection(name)              // drop all rows + meta entry

// Helper — wraps the standard cache-or-scan dance
cacheGetOrScan[T](name, ttl, force, keyFn, scanFn) → (raws, hit, err)
```

Each cache-aware bridge is shaped like:

```go
func (b *MCPBridge) toolXxxList(_ context.Context, params map[string]any) map[string]any {
    force := paramBool(params, "force", false)
    const collection = "xxx"
    const ttl = 5 * time.Minute

    raws, hit, err := cacheGetOrScan(collection, ttl, force,
        func(item ItemType) string { return item.Key },
        func() ([]ItemType, error) {
            // do the actual scan / API call
            return scanResults, nil
        },
    )
    if err != nil {
        return map[string]any{"ok": false, "error": err.Error()}
    }

    items := make([]ItemType, 0, len(raws))
    for _, r := range raws {
        var i ItemType
        if err := json.Unmarshal(r, &i); err == nil {
            items = append(items, i)
        }
    }
    return map[string]any{
        "ok": true,
        "value": map[string]any{
            "items":       items,
            "count":       len(items),
            "cache_hit":   hit,
            "cache_age_s": int(cacheAge(collection).Seconds()),
        },
    }
}
```

`force=true` param bypasses the cache and runs a fresh scan + write-through.

## MCP tools

| Tool | Purpose |
|------|---------|
| `cache_status` | Lists every cached collection with `item_count`, `last_full_scan`, `age_seconds`. Drives the `/cache` panel. |
| `cache_clear` | Drops a collection (`{collection: "memory"}`). Next access re-scans. |
| `cache_debug` | Diagnostic — total kv rows, match count, raw `last_full_scan` string. Kept post-debug as an ops aid. |

## /cache panel

The Cache route lists all collections in a table:

| collection | items | last scan | age | actions |
|------------|------:|-----------|-----|---------|
| memory | 456 | 2026-05-08 16:35:38 | 8m | ↻ × |
| ts_projects | 115 | 2026-05-08 16:42:00 | 2m | ↻ × |
| forge_repos:core | 85 | 2026-05-08 16:54:02 | 1m | ↻ × |
| … | | | | |

Stale rows (age > 600s) get a faint amber tint. The ↻ button calls a per-collection refresher (`memory_list({force:true})`, `ts_detect({force:true})`, etc. — see `cacheRefresherFor` in `ide.component.ts`); × clears the collection entirely.

## Per-panel pills

Cache-aware panels render a freshness pill on their header:

- `● fresh` (green) — scan just ran, cache-hit was false
- `● cached Nm ago` (brand-coloured) — served from cache; click to force re-scan
- amber tint past stale threshold (panel-specific, usually 10 min)

Wired on `/memory`, `/mantis`, `/ts`, `/php`, `/forge`. The shared CSS class is `.cache-pill`.

## Two driver gotchas (`marcboeker/go-duckdb` v1.8.5)

These bit when first wiring the cache. Captured here so future sessions don't re-discover them:

### TIMESTAMP doesn't round-trip through `sql.NullTime`

The driver wouldn't decode TIMESTAMP cleanly into `sql.NullTime` — silently returned `Valid=false`, so cacheAge always reported the sentinel. **Workaround**: store `last_full_scan` and `refreshed_at` as `VARCHAR`, format with `time.RFC3339`, parse explicitly on read.

### JSON columns return `map[string]any`, not raw bytes

`Scan(&rawString)` on a JSON column returns `unsupported Scan ... type *string` — the driver auto-decodes the JSON into a Go map. **Workaround**: `Scan(&v any)` then `json.Marshal(v)` to round-trip back to bytes:

```go
for rows.Next() {
    var v any
    if err := rows.Scan(&v); err != nil { continue }
    blob, _ := json.Marshal(v)
    out = append(out, json.RawMessage(blob))
}
```

`CAST(data AS VARCHAR)` does **not** help — the driver still applies the JSON-decoder.

## What's intentionally NOT cached

| Surface | Why |
|---------|-----|
| `repos_status` | git status is volatile by definition; tight TTL barely helps |
| `container_list` | `docker ps` results change second-by-second |
| `build_detect` | already cheap (single os.Stat + LookPath, ~1 ms) |
| `webview_*` | DOM probes are realtime by intent |
| `process_*` | managed-process state must reflect current spawns |
| `stream_*` | already in-memory; would deadlock against itself via the auto-publish loop |
| `selfupdate_status` | github API has its own 5min cache layer in `updates_bridge.go` |

## Bridge auto-publish complement

Every cache hit / miss publishes to the Stream Hub at `bridge.<tool>` + the wildcard `bridge` channel — see [panels.md → Bridge auto-publish](panels.md#bridge-auto-publish-to-stream-hub). Cached calls show `duration_ms ~40ms`; scan-path calls show `duration_ms 200ms+`. The visible delta is the architecture working.

## Migration

`CREATE TABLE IF NOT EXISTS` doesn't migrate. If the schema changes (e.g. adding a PRIMARY KEY), existing installs need to drop the file once:

```bash
rm ~/.core/ide-cache.db
```

Production migration would need explicit `ALTER` or schema versioning — out of scope for v1. Snider's machine works because the table got the PRIMARY KEY on a fresh DB after the schema bug was fixed.

## Reference paths

- `core/ide/go/pkg/server/cache_bridge.go` — schema + helpers + MCP tools
- `core/ide/go/pkg/server/{memory,session,ts,php,mantis,forge,i18n}_bridge.go` — wrapped scanners
- `core/ide/frontend/src/app/pages/ide/ide.component.ts` — `xCacheHit` signals + `.cache-pill` template + `/cache` panel
- `core/ide/frontend/src/app/components/sidebar/sidebar.component.ts` — Cache nav entry under Developer
