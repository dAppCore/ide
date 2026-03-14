# core/api Polyglot Merge — Implementation Plan

**Date:** 2026-03-14
**Design:** [2026-03-14-api-polyglot-merge-design.md](../specs/2026-03-14-api-polyglot-merge-design.md)
**Pattern:** Follows core/mcp merge (2026-03-09)
**Co-author:** Co-Authored-By: Virgil <virgil@lethean.io>

## Source Inventory

### Go side (`core/go-api`)

Module: `forge.lthn.ai/core/go-api` (Go 1.26)

Root-level `.go` files (50 files):
- Core: `api.go`, `group.go`, `options.go`, `response.go`, `middleware.go`
- Features: `authentik.go`, `bridge.go`, `brotli.go`, `cache.go`, `codegen.go`, `export.go`, `graphql.go`, `i18n.go`, `openapi.go`, `sse.go`, `swagger.go`, `tracing.go`, `websocket.go`
- Tests: `*_test.go` (26 files including `race_test.go`, `norace_test.go`)
- Subdirs: `cmd/api/` (CLI commands), `docs/` (4 markdown files), `.core/` (build.yaml, release.yaml)

Key dependencies: `forge.lthn.ai/core/cli`, `github.com/gin-gonic/gin`, OpenTelemetry, Casbin, OIDC

### PHP side (`core/php-api`)

Package: `lthn/php-api` (PHP 8.2+, requires `lthn/php`)

Three namespace roots:
- `Core\Api\` (`src/Api/`) — Boot, Controllers, Middleware, Models, Services, Documentation, RateLimit, Tests
- `Core\Front\Api\` (`src/Front/Api/`) — API versioning frontage, auto-discovered provider
- `Core\Website\Api\` (`src/Website/Api/`) — Documentation UI, Blade views, web routes

### Consumer repos (Go)

| Repo | Dependency | Go source imports | Notes |
|------|-----------|-------------------|-------|
| `core/go-ml` | direct | `api/routes.go`, `api/routes_test.go` | Aliased as `goapi` |
| `core/mcp` | direct | `pkg/mcp/bridge.go`, `pkg/mcp/bridge_test.go` | Aliased as `api` |
| `core/go-ai` | direct (go.mod only) | None | go.mod + go.sum + docs reference |
| `core/ide` | indirect | None | Transitive via go-ai or mcp |
| `core/agent` | indirect (v0.0.3) | None | Transitive |

### Consumer repos (PHP)

| Repo / App | Dependency | Notes |
|------------|-----------|-------|
| `host.uk.com` (Laravel app) | `core/php-api: *` | composer.json + repositories block |
| `core/php-template` | `lthn/php-api: dev-main` | Starter template |

---

## Task 1 — Clone core/api and copy Go files from go-api

Clone the empty target repo and copy all Go source files at root level (Option B from the design spec — no `pkg/api/` nesting).

```bash
cd ~/Code/core
git clone ssh://git@forge.lthn.ai:2223/core/api.git
cd api

# Copy all Go source files (root level)
cp ~/Code/core/go-api/*.go .

# Copy cmd/ directory
cp -r ~/Code/core/go-api/cmd .

# Copy docs/
cp -r ~/Code/core/go-api/docs .

# Copy .core/ build config
mkdir -p .core
cp ~/Code/core/go-api/.core/build.yaml .core/build.yaml
cp ~/Code/core/go-api/.core/release.yaml .core/release.yaml

# Copy go.sum as starting point
cp ~/Code/core/go-api/go.sum .
```

Update `.core/build.yaml`:

```yaml
version: 1

project:
  name: core-api
  description: REST API framework (Go + PHP)
  binary: ""

build:
  cgo: false
  flags:
    - -trimpath
  ldflags:
    - -s
    - -w

targets:
  - os: linux
    arch: amd64
  - os: linux
    arch: arm64
  - os: darwin
    arch: arm64
  - os: windows
    arch: amd64
```

Update `.core/release.yaml`:

```yaml
version: 1

project:
  name: core-api
  repository: core/api

publishers: []

changelog:
  include:
    - feat
    - fix
    - perf
    - refactor
  exclude:
    - chore
    - docs
    - style
    - test
    - ci
```

### Verification

```bash
ls *.go | wc -l  # Should be 50 files
ls cmd/api/       # Should have cmd.go, cmd_sdk.go, cmd_spec.go, cmd_test.go
ls docs/          # architecture.md, development.md, history.md, index.md
```

---

## Task 2 — Copy PHP files from php-api into src/php/

```bash
cd ~/Code/core/api

# Create PHP directory structure
mkdir -p src/php/src
mkdir -p src/php/tests

# Copy PHP source namespaces
cp -r ~/Code/core/php-api/src/Api     src/php/src/Api
cp -r ~/Code/core/php-api/src/Front   src/php/src/Front
cp -r ~/Code/core/php-api/src/Website src/php/src/Website

# Copy PHP test infrastructure
cp -r ~/Code/core/php-api/tests/Feature  src/php/tests/Feature 2>/dev/null || true
cp -r ~/Code/core/php-api/tests/Unit     src/php/tests/Unit 2>/dev/null || true
cp    ~/Code/core/php-api/tests/TestCase.php src/php/tests/TestCase.php 2>/dev/null || true

# Copy phpunit.xml (adjust paths for new location)
cp ~/Code/core/php-api/phpunit.xml src/php/phpunit.xml
```

Edit `src/php/phpunit.xml` — update the `<directory>` paths:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="vendor/phpunit/phpunit/phpunit.xsd"
         bootstrap="vendor/autoload.php"
         colors="true"
>
    <testsuites>
        <testsuite name="Unit">
            <directory>tests/Unit</directory>
        </testsuite>
        <testsuite name="Feature">
            <directory>tests/Feature</directory>
        </testsuite>
    </testsuites>
    <source>
        <include>
            <directory>src</directory>
        </include>
    </source>
    <php>
        <env name="APP_ENV" value="testing"/>
        <env name="APP_MAINTENANCE_DRIVER" value="file"/>
        <env name="BCRYPT_ROUNDS" value="4"/>
        <env name="CACHE_STORE" value="array"/>
        <env name="DB_CONNECTION" value="sqlite"/>
        <env name="DB_DATABASE" value=":memory:"/>
        <env name="MAIL_MAILER" value="array"/>
        <env name="PULSE_ENABLED" value="false"/>
        <env name="QUEUE_CONNECTION" value="sync"/>
        <env name="SESSION_DRIVER" value="array"/>
        <env name="TELESCOPE_ENABLED" value="false"/>
    </php>
</phpunit>
```

### Verification

```bash
ls src/php/src/          # Api, Front, Website
ls src/php/src/Api/      # Boot.php, Controllers/, Middleware/, Models/, etc.
ls src/php/src/Front/Api/ # Boot.php, ApiVersionService.php, Middleware/, etc.
ls src/php/src/Website/Api/ # Boot.php, Controllers/, Views/, etc.
```

---

## Task 3 — Create go.mod, composer.json, and .gitattributes

### go.mod

Create `go.mod` with the new module path. Start from the existing go.mod and change the module line:

```bash
cd ~/Code/core/api
sed 's|module forge.lthn.ai/core/go-api|module forge.lthn.ai/core/api|' \
  ~/Code/core/go-api/go.mod > go.mod
```

The first line should now read:

```
module forge.lthn.ai/core/api
```

Then tidy:

```bash
go mod tidy
```

### composer.json

Create `composer.json` following the core/mcp pattern:

```json
{
    "name": "lthn/api",
    "description": "REST API module — Laravel API layer + standalone Go binary",
    "keywords": ["api", "rest", "laravel", "openapi"],
    "license": "EUPL-1.2",
    "require": {
        "php": "^8.2",
        "lthn/php": "*",
        "symfony/yaml": "^7.0"
    },
    "autoload": {
        "psr-4": {
            "Core\\Api\\": "src/php/src/Api/",
            "Core\\Front\\Api\\": "src/php/src/Front/Api/",
            "Core\\Website\\Api\\": "src/php/src/Website/Api/"
        }
    },
    "autoload-dev": {
        "psr-4": {
            "Core\\Api\\Tests\\": "src/php/tests/"
        }
    },
    "extra": {
        "laravel": {
            "providers": [
                "Core\\Front\\Api\\Boot"
            ]
        }
    },
    "config": {
        "sort-packages": true
    },
    "minimum-stability": "dev",
    "prefer-stable": true,
    "replace": {
        "core/php-api": "self.version",
        "lthn/php-api": "self.version"
    }
}
```

### .gitattributes

Create `.gitattributes` matching the core/mcp pattern — exclude Go files from Composer installs:

```
*.go              export-ignore
go.mod            export-ignore
go.sum            export-ignore
cmd/              export-ignore
pkg/              export-ignore
.core/            export-ignore
src/php/tests/    export-ignore
```

### .gitignore

```
# Binaries
core-api
*.exe

# IDE
.idea/
.vscode/

# Go
vendor/

# PHP
/vendor/
node_modules/
```

### Verification

```bash
head -1 go.mod                    # module forge.lthn.ai/core/api
cat composer.json | python3 -m json.tool  # Valid JSON
cat .gitattributes                # 7 export-ignore lines
```

---

## Task 4 — Create CLAUDE.md for the polyglot repo

Create `CLAUDE.md` at the repo root:

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Core API is the REST framework for the Lethean ecosystem, providing both a **Go HTTP engine** (Gin-based, with OpenAPI generation, WebSocket/SSE, ToolBridge) and a **PHP Laravel package** (rate limiting, webhooks, API key management, OpenAPI documentation). Both halves serve the same purpose in their respective stacks.

Module: `forge.lthn.ai/core/api` | Package: `lthn/api` | Licence: EUPL-1.2

## Build and Test Commands

### Go

```bash
core build                          # Build binary (if cmd/ has main)
go build ./...                      # Build library

core go test                        # Run all Go tests
core go test --run TestName         # Run a single test
core go cov                         # Coverage report
core go cov --open                  # Open HTML coverage in browser
core go qa                          # Format + vet + lint + test
core go qa full                     # Also race detector, vuln scan, security audit
core go fmt                         # gofmt
core go lint                        # golangci-lint
core go vet                         # go vet
```

### PHP (from repo root)

```bash
composer test                                    # Run all PHP tests (Pest)
composer test -- --filter=ApiKey                 # Single test
composer lint                                    # Laravel Pint (PSR-12)
./vendor/bin/pint --dirty                        # Format changed files
```

Tests live in `src/php/src/Api/Tests/Feature/` (in-source) and `src/php/tests/` (standalone).

## Architecture

### Go Engine (root-level .go files)

`Engine` is the central type, configured via functional `Option` functions passed to `New()`:

```go
engine, _ := api.New(api.WithAddr(":8080"), api.WithCORS("*"), api.WithSwagger(...))
engine.Register(myRouteGroup)
engine.Serve(ctx)
```

**Extension interfaces** (`group.go`):
- `RouteGroup` — minimum: `Name()`, `BasePath()`, `RegisterRoutes(*gin.RouterGroup)`
- `StreamGroup` — optional: `Channels() []string` for WebSocket
- `DescribableGroup` — extends RouteGroup with `Describe() []RouteDescription` for OpenAPI

**ToolBridge** (`bridge.go`): Converts `ToolDescriptor` structs into `POST /{tool_name}` REST endpoints with auto-generated OpenAPI paths.

**Authentication** (`authentik.go`): Authentik OIDC integration + static bearer token. Permissive middleware with `RequireAuth()` / `RequireGroup()` guards.

**OpenAPI** (`openapi.go`, `export.go`, `codegen.go`): `SpecBuilder.Build()` generates OpenAPI 3.1 JSON. `SDKGenerator` wraps openapi-generator-cli for 11 languages.

**CLI** (`cmd/api/`): Registers `core api spec` and `core api sdk` commands.

### PHP Package (`src/php/`)

Three namespace roots:

| Namespace | Path | Role |
|-----------|------|------|
| `Core\Front\Api` | `src/php/src/Front/Api/` | API frontage — middleware, versioning, auto-discovered provider |
| `Core\Api` | `src/php/src/Api/` | Backend — auth, scopes, models, webhooks, OpenAPI docs |
| `Core\Website\Api` | `src/php/src/Website/Api/` | Documentation UI — controllers, Blade views, web routes |

Boot chain: `Front\Api\Boot` (auto-discovered) fires `ApiRoutesRegistering` → `Api\Boot` registers middleware and routes.

Key services: `WebhookService`, `RateLimitService`, `IpRestrictionService`, `OpenApiBuilder`, `ApiKeyService`.

## Conventions

- **UK English** in all user-facing strings and docs (colour, organisation, unauthorised)
- **SPDX headers** in Go files: `// SPDX-License-Identifier: EUPL-1.2`
- **`declare(strict_types=1);`** in every PHP file
- **Full type hints** on all PHP parameters and return types
- **Pest syntax** for PHP tests (not PHPUnit)
- **Flux Pro** components in Livewire views; **Font Awesome** icons
- **Conventional commits**: `type(scope): description`
- **Co-Author**: `Co-Authored-By: Virgil <virgil@lethean.io>`
- Go test names use `_Good` / `_Bad` / `_Ugly` suffixes

## Key Dependencies

| Go module | Role |
|-----------|------|
| `forge.lthn.ai/core/cli` | CLI command registration |
| `github.com/gin-gonic/gin` | HTTP router |
| `github.com/casbin/casbin/v2` | Authorisation policies |
| `github.com/coreos/go-oidc/v3` | OIDC / Authentik |
| `go.opentelemetry.io/otel` | OpenTelemetry tracing |

PHP: `lthn/php` (Core framework), Laravel 12, `symfony/yaml`.

Go workspace: this module is part of `~/Code/go.work`. Requires Go 1.26+, PHP 8.2+.
```

### Verification

```bash
wc -l CLAUDE.md  # Should be ~100 lines
```

---

## Task 5 — Update consumer repos (Go import paths)

Change `forge.lthn.ai/core/go-api` to `forge.lthn.ai/core/api` in all consumers.

### 5a — core/go-ml (2 source files + go.mod)

```bash
cd ~/Code/core/go-ml

# Update Go source imports
sed -i '' 's|forge.lthn.ai/core/go-api|forge.lthn.ai/core/api|g' \
  api/routes.go api/routes_test.go

# Update go.mod
sed -i '' 's|forge.lthn.ai/core/go-api|forge.lthn.ai/core/api|g' go.mod

go mod tidy
```

Verify the import alias in `api/routes.go` reads:
```go
goapi "forge.lthn.ai/core/api"
```

### 5b — core/mcp (2 source files + go.mod)

```bash
cd ~/Code/core/mcp

# Update Go source imports
sed -i '' 's|forge.lthn.ai/core/go-api|forge.lthn.ai/core/api|g' \
  pkg/mcp/bridge.go pkg/mcp/bridge_test.go

# Update go.mod
sed -i '' 's|forge.lthn.ai/core/go-api|forge.lthn.ai/core/api|g' go.mod

go mod tidy
```

Verify the import alias in `pkg/mcp/bridge.go` reads:
```go
api "forge.lthn.ai/core/api"
```

### 5c — core/go-ai (go.mod only — no Go source imports)

```bash
cd ~/Code/core/go-ai

sed -i '' 's|forge.lthn.ai/core/go-api|forge.lthn.ai/core/api|g' go.mod

go mod tidy
```

Also update the docs reference:
```bash
sed -i '' 's|forge.lthn.ai/core/go-api|forge.lthn.ai/core/api|g' docs/index.md
```

### 5d — core/ide (indirect only — go.mod)

```bash
cd ~/Code/core/ide

sed -i '' 's|forge.lthn.ai/core/go-api|forge.lthn.ai/core/api|g' go.mod

go mod tidy
```

### 5e — core/agent (indirect only — go.mod)

```bash
cd ~/Code/core/agent

sed -i '' 's|forge.lthn.ai/core/go-api|forge.lthn.ai/core/api|g' go.mod

go mod tidy
```

### 5f — Update CLAUDE.md references in core/mcp

In `~/Code/core/mcp/CLAUDE.md`, update the dependency table:

```
| `forge.lthn.ai/core/go-api` | REST framework + `ToolBridge` |
```
becomes:
```
| `forge.lthn.ai/core/api` | REST framework + `ToolBridge` |
```

### 5g — PHP consumers

**host.uk.com Laravel app** (`~/Code/lab/host.uk.com/composer.json`):

Replace the `core/php-api` requirement and repository entry:
- Change `"core/php-api": "*"` to `"lthn/api": "dev-main"`
- Change repository URL from `ssh://git@forge.lthn.ai:2223/core/php-api.git` to `ssh://git@forge.lthn.ai:2223/core/api.git`

The `replace` block in the new `composer.json` (`"core/php-api": "self.version"`, `"lthn/php-api": "self.version"`) ensures backward compatibility.

**core/php-template** (`~/Code/core/php-template/composer.json`):

```bash
cd ~/Code/core/php-template
sed -i '' 's|"lthn/php-api": "dev-main"|"lthn/api": "dev-main"|g' composer.json
```

### Verification

```bash
# Confirm no stale references remain
grep -r 'forge.lthn.ai/core/go-api' ~/Code/core/go-ml/  --include='*.go' --include='go.mod'
grep -r 'forge.lthn.ai/core/go-api' ~/Code/core/mcp/    --include='*.go' --include='go.mod'
grep -r 'forge.lthn.ai/core/go-api' ~/Code/core/go-ai/  --include='*.go' --include='go.mod'
grep -r 'forge.lthn.ai/core/go-api' ~/Code/core/ide/    --include='*.go' --include='go.mod'
grep -r 'forge.lthn.ai/core/go-api' ~/Code/core/agent/  --include='*.go' --include='go.mod'
# All should return nothing
```

---

## Task 6 — Update go.work

Edit `~/Code/go.work`:

```bash
cd ~/Code

# Remove go-api entry, add api entry
sed -i '' 's|./core/go-api|./core/api|' go.work

# Sync workspace
go work sync
```

### Verification

```bash
grep 'core/api' ~/Code/go.work      # Should show ./core/api
grep 'core/go-api' ~/Code/go.work   # Should return nothing
```

---

## Task 7 — Build verification across all affected repos

Run in sequence — each depends on the workspace being consistent:

```bash
cd ~/Code

# 1. Verify core/api itself builds and tests pass
cd ~/Code/core/api
go build ./...
go test ./...
go vet ./...

# 2. Verify core/go-ml
cd ~/Code/core/go-ml
go build ./...
go test ./...

# 3. Verify core/mcp
cd ~/Code/core/mcp
go build ./...
go test ./...

# 4. Verify core/go-ai
cd ~/Code/core/go-ai
go build ./...

# 5. Verify core/ide
cd ~/Code/core/ide
go build ./...

# 6. Verify core/agent
cd ~/Code/core/agent
go build ./...
```

If any fail, fix import paths and re-run `go mod tidy` in the affected repo.

### Verification

All six builds should succeed with zero errors. Test failures unrelated to the import path change can be ignored (pre-existing).

---

## Task 8 — Archive go-api and php-api on Forge

Archive both source repos on Forge. This marks them read-only but keeps them accessible for existing consumers that haven't updated.

```bash
# Archive via Forgejo API (requires GITEA_TOKEN or gh-equivalent)
# Option A: Forgejo web UI
#   1. Navigate to https://forge.lthn.ai/core/go-api/settings
#   2. Click "Archive this repository"
#   3. Repeat for https://forge.lthn.ai/core/php-api/settings

# Option B: Forgejo API
curl -X PATCH \
  -H "Authorization: token ${FORGE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"archived": true}' \
  "https://forge.lthn.ai/api/v1/repos/core/go-api"

curl -X PATCH \
  -H "Authorization: token ${FORGE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"archived": true}' \
  "https://forge.lthn.ai/api/v1/repos/core/php-api"
```

Update repo descriptions to point to the merged repo:

```bash
curl -X PATCH \
  -H "Authorization: token ${FORGE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"description": "ARCHIVED — merged into core/api"}' \
  "https://forge.lthn.ai/api/v1/repos/core/go-api"

curl -X PATCH \
  -H "Authorization: token ${FORGE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"description": "ARCHIVED — merged into core/api"}' \
  "https://forge.lthn.ai/api/v1/repos/core/php-api"
```

### Local cleanup

```bash
# Optionally remove the old local clones (or keep for reference)
# rm -rf ~/Code/core/go-api ~/Code/core/php-api
```

---

## Commit Strategy

Initial commit in core/api:

```bash
cd ~/Code/core/api
git add -A
git commit -m "$(cat <<'EOF'
feat(api): merge go-api + php-api into polyglot repo

Go source at root level (Option B), PHP under src/php/.
Module path: forge.lthn.ai/core/api
Package name: lthn/api

Co-Authored-By: Virgil <virgil@lethean.io>
EOF
)"
git push origin main
```

Consumer updates (one commit per repo):

```bash
# core/go-ml
cd ~/Code/core/go-ml
git add -A
git commit -m "$(cat <<'EOF'
refactor(api): update import path from go-api to core/api

Part of the polyglot merge — forge.lthn.ai/core/go-api is now
forge.lthn.ai/core/api.

Co-Authored-By: Virgil <virgil@lethean.io>
EOF
)"

# core/mcp
cd ~/Code/core/mcp
git add -A
git commit -m "$(cat <<'EOF'
refactor(api): update import path from go-api to core/api

Part of the polyglot merge — forge.lthn.ai/core/go-api is now
forge.lthn.ai/core/api.

Co-Authored-By: Virgil <virgil@lethean.io>
EOF
)"

# core/go-ai
cd ~/Code/core/go-ai
git add -A
git commit -m "$(cat <<'EOF'
refactor(api): update import path from go-api to core/api

Part of the polyglot merge — forge.lthn.ai/core/go-api is now
forge.lthn.ai/core/api.

Co-Authored-By: Virgil <virgil@lethean.io>
EOF
)"

# core/ide
cd ~/Code/core/ide
git add -A
git commit -m "$(cat <<'EOF'
refactor(api): update import path from go-api to core/api

Part of the polyglot merge — forge.lthn.ai/core/go-api is now
forge.lthn.ai/core/api.

Co-Authored-By: Virgil <virgil@lethean.io>
EOF
)"

# core/agent
cd ~/Code/core/agent
git add -A
git commit -m "$(cat <<'EOF'
refactor(api): update import path from go-api to core/api

Part of the polyglot merge — forge.lthn.ai/core/go-api is now
forge.lthn.ai/core/api.

Co-Authored-By: Virgil <virgil@lethean.io>
EOF
)"
```

---

## Summary

| # | Task | Files touched | Risk |
|---|------|--------------|------|
| 1 | Clone core/api, copy Go files | 50 .go + cmd/ + docs/ + .core/ | Low |
| 2 | Copy PHP files into src/php/ | ~80 PHP files | Low |
| 3 | Create go.mod, composer.json, .gitattributes | 4 new files | Low |
| 4 | Create CLAUDE.md | 1 new file | Low |
| 5 | Update 5 Go consumers + 2 PHP consumers | ~12 files across 7 repos | Medium |
| 6 | Update go.work | 1 file | Low |
| 7 | Build verification | 0 files (validation only) | N/A |
| 8 | Archive go-api + php-api | 0 local files (Forge API) | Low |

Estimated effort: 30–45 minutes of execution time.
