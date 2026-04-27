<!-- SPDX-License-Identifier: EUPL-1.2 -->

# core/ide

## What Does `core-ide` Actually Do

`core-ide` exposes the Core IDE runtime as MCP tools, named Core actions, and a local chat shell.
It wires workspace inspection, OpenBrain memory, subagent relay, navigation, and package marketplace helpers into one process.
It can run as stdio MCP for editor clients, HTTP MCP for local agents, or a Wails desktop shell.
The GUI mode mounts chat and MCP against the same in-process executor so tool results match non-GUI mode.
HTTP mode is local-only and bearer-token gated by default.

## Connect It To Claude Code

```json
{
  "mcpServers": {
    "core-ide": {
      "command": "core-ide",
      "args": ["--mcp"]
    }
  }
}
```

## Running Modes

| Mode | Command | Use case |
| --- | --- | --- |
| stdio MCP | `core-ide --mcp` | Claude Code, Cursor, Continue |
| HTTP MCP | `core-ide --no-gui --http 127.0.0.1:9880 --token $TOK` | JetBrains, remote agents |
| GUI shell | `core-ide` (default) | local desktop with chat |

Wildcard binds such as `:9880` and `0.0.0.0:9880` are rejected; use an explicit loopback address.

## Tools You Get

The 19-tool MCP/action parity check is enforced in [pkg/server/integration_action_parity_test.go](pkg/server/integration_action_parity_test.go).

- `brain_recall`
- `brain_remember`
- `brain_forget`
- `brain_list`
- `brain_context`
- `workspace_status`
- `workspace_conventions`
- `workspace_impact`
- `workspace_scan`
- `subagent_guide`
- `subagent_ask`
- `subagent_progress`
- `subagent_watch` (supports `cursor`, `limit`, `nextCursor`, and `hasMore` for paged event history)
- `subagent_answer`
- `subagent_dispatch_guided`
- `core_navigate`
- `pkg_search`
- `pkg_info`
- `pkg_install`

## What's Hardened

- HTTP mode refuses to start without a bearer token.
- REST and MCP-over-HTTP requests require `Authorization: Bearer <token>`; missing or wrong tokens return `401`.
- HTTP and relay listeners must bind to `localhost` or a loopback IP; wildcard and externally routable addresses are rejected.
- HTTP read-header, read, write, and idle timeouts are bounded.
- HTTP headers are capped at 1 MiB and request bodies at 10 MiB.
- The relay listener is only enabled when a relay path, loopback bind, and bearer token are configured.

## Live OpenBrain Smoke

The live OpenBrain test is build-tagged and skipped by default:

```sh
CORE_BRAIN_INTEGRATION=1 CORE_BRAIN_KEY=$CORE_BRAIN_KEY \
  go test -tags integration -run TestLive ./pkg/brain/...
```

## End-to-End Smoke

After building changes, run:

```sh
tests/smoke/run-end-to-end.sh
```

The script builds `/tmp/core-ide`, verifies stdio MCP exposes 19 tools, verifies HTTP bearer auth exposes the same 19 tools, calls `workspace_status` through the HTTP tool bridge, checks malformed tool input and schema validation failures, checks unauthenticated HTTP returns `401`, and confirms HTTP mode without a token exits with status `1`.
