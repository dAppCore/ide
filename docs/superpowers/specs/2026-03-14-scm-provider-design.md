# go-scm Service Provider + Custom Elements

**Date:** 2026-03-14
**Status:** Approved
**Depends on:** Service Provider Framework, core/api

## Problem

go-scm has marketplace, manifest, and registry functionality but no REST API
or UI. The IDE can't browse providers, install apps, or inspect manifests
without CLI commands.

## Solution

Add a service provider to go-scm with REST endpoints and a Lit custom element
bundle containing multiple composable elements.

## Provider (Go)

### ScmProvider

Lives in `go-scm/pkg/api/provider.go`. Implements `Provider` + `Streamable` +
`Describable` + `Renderable`.

```go
Name()     → "scm"
BasePath() → "/api/v1/scm"
Element()  → ElementSpec{Tag: "core-scm-panel", Source: "/assets/core-scm.js"}
Channels() → []string{"scm.marketplace.*", "scm.manifest.*", "scm.registry.*"}
```

### REST Endpoints

#### Marketplace

| Method | Path | Description |
|--------|------|-------------|
| GET | /marketplace | List available providers from git registry |
| GET | /marketplace/:code | Get provider details |
| POST | /marketplace/:code/install | Install provider |
| DELETE | /marketplace/:code | Remove installed provider |
| POST | /marketplace/refresh | Pull latest marketplace index (requires new FetchIndex function) |

#### Manifest

| Method | Path | Description |
|--------|------|-------------|
| GET | /manifest | Read .core/manifest.yaml from current directory |
| POST | /manifest/verify | Verify Ed25519 signature (body: {public_key: hex}) |
| POST | /manifest/sign | Sign manifest with private key (body: {private_key: hex}) |
| GET | /manifest/permissions | List declared permissions |

#### Installed

| Method | Path | Description |
|--------|------|-------------|
| GET | /installed | List installed providers |
| POST | /installed/:code/update | Apply update (pulls latest from git) |

Note: Single-item `GET /installed/:code` and update-check require new methods
on `Installer` (`Get(code)` and `CheckUpdate(code)`). Deferred — the list
endpoint is sufficient for Phase 1. Update applies `Installer.Update()`.

#### Registry

| Method | Path | Description |
|--------|------|-------------|
| GET | /registry | List repos from repos.yaml |
| GET | /registry/:name/status | Git status for a repo |

Note: Registry endpoints are read-only. Pull/push actions are handled by
`core dev` CLI commands, not the REST API. The `<core-scm-registry>` element
shows status only — no write buttons.

### WS Events

| Event | Data | Trigger |
|-------|------|---------|
| scm.marketplace.refreshed | {count} | After marketplace pull |
| scm.marketplace.installed | {code, name, version, installed_at} | After install |
| scm.marketplace.removed | {code} | After remove |
| scm.manifest.verified | {code, valid, signer} | After signature check |
| scm.registry.changed | {name, status} | Repo status change |

## Custom Elements (Lit)

### Bundle Structure

```
go-scm/ui/
├── src/
│   ├── index.ts              # Bundle entry — exports all elements
│   ├── scm-panel.ts          # <core-scm-panel> — HLCRF layout
│   ├── scm-marketplace.ts    # <core-scm-marketplace> — browse/install
│   ├── scm-manifest.ts       # <core-scm-manifest> — view/verify
│   ├── scm-installed.ts      # <core-scm-installed> — manage installed
│   ├── scm-registry.ts       # <core-scm-registry> — repo status
│   └── shared/
│       ├── api.ts            # Fetch wrapper for /api/v1/scm/*
│       └── events.ts         # WS event listener helpers
├── package.json
├── tsconfig.json
└── index.html                # Demo page
```

### Elements

#### `<core-scm-panel>`

Top-level element. Arranges child elements in HLCRF layout `H[LC]CF`:
- H: Title bar with refresh button
- H-L: Navigation tabs (Marketplace / Installed / Registry)
- H-C: Search input
- C: Active tab content (one of the child elements)
- F: Status bar (connection state, last refresh)

#### `<core-scm-marketplace>`

Browse the git-based provider marketplace.

| Attribute | Type | Description |
|-----------|------|-------------|
| api-url | string | API base URL (default: current origin) |
| category | string | Filter by category |

Displays:
- Provider cards with name, description, version, author
- Install/Remove button per card
- Category filter tabs
- Search (filters client-side)

#### `<core-scm-manifest>`

View and verify a .core/manifest.yaml file.

| Attribute | Type | Description |
|-----------|------|-------------|
| api-url | string | API base URL |
| path | string | Directory to read manifest from |

Displays:
- Manifest fields (code, name, version, layout variant)
- HLCRF slot assignments
- Permission declarations
- Signature status badge (verified/unsigned/invalid)
- Sign button (calls POST /manifest/sign)

#### `<core-scm-installed>`

Manage installed providers.

| Attribute | Type | Description |
|-----------|------|-------------|
| api-url | string | API base URL |

Displays:
- Installed provider list with version, status
- Update available indicator
- Update/Remove buttons
- Provider detail panel on click

#### `<core-scm-registry>`

Show repos.yaml registry status.

| Attribute | Type | Description |
|-----------|------|-------------|
| api-url | string | API base URL |

Displays:
- Repo list from registry
- Git status per repo (clean/dirty/ahead/behind)

### Shared

#### `api.ts`

```typescript
export class ScmApi {
  constructor(private baseUrl: string = '') {}

  private get base() {
    return `${this.baseUrl}/api/v1/scm`;
  }

  marketplace()        { return fetch(`${this.base}/marketplace`).then(r => r.json()); }
  install(code: string){ return fetch(`${this.base}/marketplace/${code}/install`, {method:'POST'}).then(r => r.json()); }
  remove(code: string) { return fetch(`${this.base}/marketplace/${code}`, {method:'DELETE'}).then(r => r.json()); }
  installed()          { return fetch(`${this.base}/installed`).then(r => r.json()); }
  manifest()           { return fetch(`${this.base}/manifest`).then(r => r.json()); }
  verify(publicKey: string) { return fetch(`${this.base}/manifest/verify`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({public_key: publicKey})}).then(r => r.json()); }
  sign(privateKey: string) { return fetch(`${this.base}/manifest/sign`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({private_key: privateKey})}).then(r => r.json()); }
  registry()           { return fetch(`${this.base}/registry`).then(r => r.json()); }
}
```

#### `events.ts`

```typescript
export function connectScmEvents(wsUrl: string, handler: (event: any) => void) {
  const ws = new WebSocket(wsUrl);
  ws.onmessage = (e) => {
    const event = JSON.parse(e.data);
    if (event.type?.startsWith('scm.')) handler(event);
  };
  return ws;
}
```

## Build

```bash
cd go-scm/ui
npm install
npm run build    # → dist/core-scm.js (single bundle, all elements)
```

The built JS is embedded in go-scm's Go binary via `//go:embed` and served
as a static asset by the provider.

## Dependencies

### Go (go-scm)
- core/api (provider interfaces, Gin)
- go-ws (WS hub for events)
- Existing: manifest, marketplace, repos packages (already in go-scm)

### TypeScript (ui/)
- lit (Web Components)
- No other runtime deps

## Files

### Create in go-scm

| File | Purpose |
|------|---------|
| `pkg/api/provider.go` | ScmProvider with all REST endpoints |
| `pkg/api/provider_test.go` | Endpoint tests |
| `pkg/api/embed.go` | `//go:embed` for UI assets |
| `ui/src/index.ts` | Bundle entry |
| `ui/src/scm-panel.ts` | Top-level HLCRF panel |
| `ui/src/scm-marketplace.ts` | Marketplace browser |
| `ui/src/scm-manifest.ts` | Manifest viewer |
| `ui/src/scm-installed.ts` | Installed provider manager |
| `ui/src/scm-registry.ts` | Registry status |
| `ui/src/shared/api.ts` | API client |
| `ui/src/shared/events.ts` | WS event helpers |
| `ui/package.json` | Lit + TypeScript deps |
| `ui/tsconfig.json` | TypeScript config |
| `ui/index.html` | Demo page |

## Not In Scope

- Actual STIM packaging/distribution (future — uses Borg)
- Provider sandbox enforcement (future — uses TIM/CoreDeno)
- Marketplace git server (uses existing forge)
- Angular wrappers (IDE dynamically loads custom elements)
