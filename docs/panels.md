---
title: Developer panels
description: The orchestration cockpit — every Developer-group panel in core-ide, what it wraps, what tools it exposes, how cross-surface drill-down + cache layers work.
---

# Developer panels

`core-ide` started as a thin MCP shell. It has since grown into an **orchestration cockpit** over the canonical `core/*` packages — every panel wraps a Service or filesystem surface, exposes its state through MCP bridge tools, and renders an Angular view that closes the loop with the editor (Monaco) and the process manager.

This document describes the panel surface, the bridge files behind each, and the cross-cutting patterns (cache, auto-publish to /stream, click-to-jump).

## Sidebar groups

The sidebar (`frontend/src/app/components/sidebar/sidebar.component.ts`) groups routes:

- **Developer** — full feature set (this document). Will be gated behind a developer-mode setting once onboarding lands; today everyone sees everything.
- **Plugins** — installed marketplace modules that declare a Menu extend the IDE frame here.
- **Account** — profile + settings (skeleton).

## Panel inventory (Developer group)

| Route | Purpose | Wrapped surface | Bridge files |
|-------|---------|-----------------|--------------|
| `/files` | File explorer + Monaco editor with tabs | `dir_list` / `file_read` / Monaco direct | `mcp_bridge.go` |
| `/search` | Workspace search via ripgrep | `workspace_search` | `mcp_bridge.go` |
| `/scm` | Source control (status / diff / stage / commit) | `dappco.re/go/scm` | `mcp_bridge.go` |
| `/build` | Build detection + spawn | `pkg/server/build_bridge.go` | `build_bridge.go` |
| `/lint` | Lint orchestration + click-to-jump | go-lint | `lint_bridge.go` |
| `/locales` | i18n locale package inventory | `i18n_bridge.go` | `i18n_bridge.go` |
| `/marketplace` | Plugin marketplace | `pkg_*` (marketplace package) | `pkg_bridge.go` |
| `/repos` | Multi-repo status dashboard | `dappco.re/go/scm` Status | `repos_bridge.go` |
| `/containers` | Docker / LinuxKit / QEMU detection | `docker ps` + `linuxkit version` | `container_bridge.go` |
| `/process` | Spawned process supervisor + daemons | `dappco.re/go/process` | `process_bridge.go` |
| `/orm` | DuckDB workspace buffer inspector | `dappco.re/go/orm` + `DuckDBMedium` | `orm_bridge.go`, `orm_init.go`, `orm_duckdb_medium.go` |
| `/store` | Go-store KV inspector | `dappco.re/go/store` | `store_bridge.go` |
| `/tenant` | Workspace + user context | `dappco.re/go/tenant` Service | `tenant_bridge.go`, `tenant_init.go` |
| `/forge` | Forgejo client (orgs / repos / issues / PRs / releases) | `dappco.re/go/forge` | `forge_bridge.go` |
| `/devops` | Secret scanning (regex + gitleaks) + Ansible playbooks | `dappco.re/go/devops` devkit | `devops_bridge.go` |
| `/php` | Laravel project discovery + composer scripts + canonical artisan | `dappco.re/go/php` | `php_bridge.go` |
| `/ts` | TypeScript / Deno project discovery + scripts | filesystem walk + manifest parse | `ts_bridge.go` |
| `/sessions` | Claude Code transcript inspector (Browse / Active / Search tabs + Live tail) | `dappco.re/go/session` + custom JSONL tail | `session_bridge.go` |
| `/stream` | go-stream Hub inspector + live activity feed | `dappco.re/go/stream` | `stream_bridge.go` |
| `/memory` | Cladius's auto-memory browser + full-text search | `~/.claude/projects/*/memory/*.md` | `memory_bridge.go` |
| `/mantis` | tasks.lthn.sh ticket browser | Mantis REST API | `mantis_bridge.go` |
| `/updates` | Tool version tracking + IDE self-update | PATH probe + GitHub Releases + `dappco.re/go/update` | `updates_bridge.go`, `selfupdate_bridge.go` |
| `/cache` | DuckDB cache state + ops controls | `pkg/server/cache_bridge.go` | `cache_bridge.go` |

The frontend lives in a single Angular component at `frontend/src/app/pages/ide/ide.component.ts`. Each panel is one `@case` in a route switch; signals back state.

## Pattern 1 — Direct-import lanes

For canonical `core/*` packages with a Service / actions surface, the bridge imports the package directly and forwards to its API. Examples: `forge_bridge.go` constructs a `forge.Forge` client and forwards `f.Releases.ListReleasesPage(ctx, owner, repo, opts)`. `tenant_bridge.go` registers `dappco.re/go/tenant.Service` against the IDE's Core and routes through `c.Action("tenant.workspace_get")`.

The MCP bridge tool is a thin translator from `map[string]any` params → typed package calls → `map[string]any` response.

Direct-import lanes (9): `orm`, `DuckDBMedium`, `tenant`, `forge`, `devops`, `php`, `store`, `session`, `stream`.

## Pattern 2 — File-probe lanes

For surfaces where the underlying truth is on the filesystem (Laravel projects, TS projects, locale dirs, multi-repo status), the bridge walks the workspace directly without importing a Service. Cheaper than wiring a full Service; fine for read-only inspection.

File-probe lanes (9): `marketplace`, `repos`, `build`, `containers`, `lint`, `locales` (i18n), `process_daemons`, `ts`, `memory`.

## Pattern 3 — Probe lanes

Mix of PATH lookup + HTTP endpoint check. Used for `/updates` (each tool entry: `LookPath(binary)` → run `--version` → `https://api.github.com/repos/<owner>/<repo>/releases/latest`).

Probe lanes (2): `updates`, `selfupdate`.

## Pattern 4 — Poll lanes

Frontend `setInterval` against a bridge tool that returns incremental data. Currently one: `/sessions` Live tail polls `session_tail` every 3s with a running byte offset.

## Cross-surface drill-down

Many panels close the loop with the editor by detecting paths in their content + making them clickable:

- **`/sessions`** — `Read` / `Edit` / `Write` event inputs are absolute paths; clicking a row calls `openSearchResult({path, line: 1})` which opens the file in Monaco.
- **`/stream`** — `parseStreamFrame()` JSON-decodes frame bodies; if a `path` / `file` / `file_path` field is an absolute path, surfaces a `↗` jump button.
- **`/mantis`** — `mantisSegments()` splits ticket descriptions on `/Users/...` paths and renders each as a clickable link.
- **`/lint`** — finding rows are `file:line:col` clickable to Monaco at the right line.
- **`/devops`** — secret-scan findings click to file at the offending line.
- **`/php` script run** — clicking a script spawns via `process_start` and auto-routes to `/process`.
- **`/ts` script run** — same pattern; `npm run <script>` or `deno task` in the project's cwd.
- **`/memory` content search** — ripgrep hits open in Monaco at the matched line.
- **`/sessions` cross-search** — search hit click switches to Browse tab + inspects the matched session.

The mechanism is uniform: every panel has access to `openSearchResult({path, line})` and re-uses it.

## Cross-cutting infrastructure

### Bridge auto-publish to Stream Hub

Every MCP bridge dispatch publishes a JSON frame to `bridge.<toolname>` + a wildcard `bridge` channel on the in-process Stream Hub. `/stream` becomes a live activity feed of every IDE action.

Frame shape:

```json
{
  "tool": "memory_list",
  "ok": true,
  "duration_ms": 45,
  "timestamp": "2026-05-08T16:35:38Z",
  "params": {"sort": "modified"}
}
```

Skip-list at `bridgeAutoPublishSkip` excludes self-loop tools (`stream_*`, `webview_*`) to avoid feedback. Sanitisation redacts known token-shaped param keys.

### App-state cache

Heavy scanners are wrapped through `pkg/server/cache_bridge.go` which writes to `~/.core/ide-cache.db` (DuckDB). First scan seeds; subsequent navigations serve from cache. See [cache-architecture.md](cache-architecture.md) for the full design.

Cache-aware panels render a `● cached Nm ago` pill on their header — click to force re-scan.

### Keyboard shortcuts

`⌘1` … `⌘9` (or `Ctrl+1..9` on non-Mac) jumps to the first 9 Developer panels in sidebar order. Skipped when focus is in an input / textarea / Monaco editor (Monaco's own bindings stay valuable).

### UI state persistence

Sidebar route + open editor tabs + workspace root + chat panel visibility persist to `~/.core/config.yaml` via debounced `POST /internal/ui-state`. Restored on next launch — same panel + same files open.

## Bridge file naming

Each panel's MCP tools live in one file at `pkg/server/<area>_bridge.go`. Convention:

- `tool<Area><Verb>` — `func (b *MCPBridge) toolMemoryList(ctx, params) map[string]any`
- Dispatch wired in `mcp_bridge.go`'s `dispatchTool()` switch
- Most bridges have an `<area>_init.go` companion for Service registration when needed (`orm_init.go`, `tenant_init.go`)

`mcp_bridge.go` is the central router — every new bridge tool needs a `case "<tool_name>": return b.toolXxx(ctx, params)` line added there.

## What lives outside this document

The plumbing each panel rests on:

- Wails 3 GUI shell composition — see [architecture.md](architecture.md) §6
- MCP transport selection — [architecture.md](architecture.md) §5
- Conclave parity — [architecture.md](architecture.md) §3
- Process supervisor + daemon registry — `dappco.re/go/process` + the canonical RFC at `plans/code/core/process/RFC.md`
- Frontend state persistence — `feedback_ui_state_persistence_pattern.md` memory

## Frontend hot-reload

The Angular frontend is embedded into the Go binary at compile time via `//go:embed`. To iterate:

```bash
# Frontend changes — rebuild bundle + ship into the binary's embed dir
cd frontend && npm run build:dev
cp -R dist/. ../go/cmd/core-ide/dist/

# Go changes — rebuild binary
cd ../go && go build -o /tmp/core-ide-smoke ./cmd/core-ide

# Restart
pkill -f /tmp/core-ide-smoke; /tmp/core-ide-smoke
```

`wails3 dev` does both automatically with hot-reload, but the manual loop is useful when iterating on bridge tools where you want to control the binary lifecycle.
