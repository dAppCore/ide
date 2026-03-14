# core/api Polyglot Merge — Go + PHP API in One Repo

**Date:** 2026-03-14
**Status:** Approved
**Pattern:** Same as core/mcp merge (2026-03-09)

## Problem

The API layer is split across two repos:
- `core/go-api` — Gin REST framework, OpenAPI, ToolBridge, SDK codegen, WS/SSE
- `core/php-api` — Laravel REST module, rate limiting, webhooks, OAuth, API docs

These serve the same purpose in their respective stacks. The provider framework
(previous spec) needs a single `core/api` that both Go and PHP packages register
into. Same problem core/mcp solved by merging.

## Solution

Merge both into `core/api` (`ssh://git@forge.lthn.ai:2223/core/api.git`),
following the exact pattern established by core/mcp.

## Target Structure

```
core/api/
├── go.mod                    # module forge.lthn.ai/core/api
├── composer.json             # name: lthn/api
├── .gitattributes            # export-ignore Go files for Composer
├── CLAUDE.md
├── pkg/                      # Go packages
│   ├── api/                  # Engine, RouteGroup, middleware (from go-api root)
│   ├── provider/             # Provider framework (new, from previous spec)
│   └── openapi/              # SpecBuilder, codegen (from go-api root)
├── cmd/
│   └── core-api/             # Standalone binary (if needed)
├── src/
│   └── php/
│       └── src/
│           ├── Api/          # Boot, Controllers, Middleware, etc. (from php-api/src/Api/)
│           ├── Front/Api/    # Frontend API routes (from php-api/src/Front/)
│           └── Website/Api/  # Website API routes (from php-api/src/Website/)
└── docs/
```

## Go Module

```go
module forge.lthn.ai/core/api
```

All current consumers importing `forge.lthn.ai/core/go-api` will need to update
to `forge.lthn.ai/core/api/pkg/api` (or `forge.lthn.ai/core/api` if we keep
packages at root level — see decision below).

### Package Layout Decision

**Option A**: Packages under `pkg/api/` — clean but changes all import paths.
**Option B**: Packages at root (like go-api currently) — no import path change
if module path stays `forge.lthn.ai/core/api`.

**Recommendation: B** — keep Go files at repo root. The module path changes from
`forge.lthn.ai/core/go-api` to `forge.lthn.ai/core/api`. This is a one-line
change in each consumer's import. The PHP code lives under `src/php/` and
doesn't conflict.

```
core/api/
├── api.go, group.go, openapi.go, ...   # Go source at root (same as go-api today)
├── pkg/provider/                        # New provider framework
├── cmd/core-api/                        # Binary
├── src/php/                             # PHP source
├── composer.json
├── go.mod
└── .gitattributes
```

## Composer Package

```json
{
    "name": "lthn/api",
    "autoload": {
        "psr-4": {
            "Core\\Api\\": "src/php/src/Api/",
            "Core\\Website\\Api\\": "src/php/src/Website/Api/"
        }
    },
    "replace": {
        "lthn/php-api": "self.version",
        "core/php-api": "self.version"
    }
}
```

Note: No `Core\Front\Api\` namespace — php-api has no `src/Front/` directory.
Add it later if a frontend API boot provider is needed.

## .gitattributes

Same pattern as core/mcp — exclude Go files from Composer installs:

```
*.go              export-ignore
go.mod            export-ignore
go.sum            export-ignore
cmd/              export-ignore
pkg/              export-ignore
.core/            export-ignore
src/php/tests/    export-ignore
```

## Migration Steps

1. **Clone core/api** (empty repo, just created)
2. **Copy Go code** from go-api → core/api root (all .go files, cmd/, docs/)
3. **Copy PHP code** from php-api/src/ → core/api/src/php/src/
4. **Copy PHP config** — composer.json, phpunit.xml, tests
5. **Update go.mod** — change module path to `forge.lthn.ai/core/api`
6. **Create .gitattributes** — export-ignore Go files
7. **Create composer.json** — lthn/api with PSR-4 autoload
8. **Update consumers** — sed import paths in all repos that import go-api
9. **Add provider framework** — `pkg/provider/` from the previous spec
10. **Archive go-api and php-api** on forge (keep for backward compat period)

## Consumer Updates

Repos that import `forge.lthn.ai/core/go-api`:
- core/go-ai (ToolBridge, API routes)
- core/go-ml (API route group)
- core/mcp (bridge.go)
- core/agent (indirect, v0.0.3)
- core/ide (via provider framework)

Each needs: `s/forge.lthn.ai\/core\/go-api/forge.lthn.ai\/core\/api/g` in
imports and go.mod.

PHP consumers via Composer — update `lthn/php-api` → `lthn/api` in
composer.json. Namespace stays `Core\Api\` (unchanged).

## Go Workspace

Add `core/api` to `~/Code/go.work`, remove `core/go-api` entry.

## Testing

- `go test ./...` in core/api
- `composer test` in core/api (runs PHP tests via phpunit)
- Build verification across consumer repos after import path update

## Not In Scope

- Provider framework implementation (separate spec, separate plan)
- New API features — this is a structural merge only
- TypeScript API layer (future Phase 3)
