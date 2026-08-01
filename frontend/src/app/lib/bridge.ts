// SPDX-Licence-Identifier: EUPL-1.2

/**
 * MCP HTTP bridge wrapper — last-resort transport for the rare case
 * where a panel needs data that has no wails binding yet AND the right
 * answer can't wait for the binding to land.
 *
 * **Default to wails bindings.** Line-speed goroutine access, secure,
 * type-safe via the generated TS files in `frontend/bindings/`. MCP is
 * orders of magnitude slower (HTTP round-trip per call) and was built
 * as the EXTERNAL access layer for tooling (Cladius, Claude Code, the
 * MCP CLI) — the app itself is not an MCP client.
 *
 * Decision tree before importing this file:
 *   1. Is there a wails binding for the data? → use it
 *   2. Is there a Go service that could trivially expose one? → add it
 *   3. Genuine third-party HTTP source? → use HttpClient directly
 *   4. Only-currently-reachable-via-MCP? → use this, file the work to
 *      replace with a binding
 *
 * Used by stores wrapping endpoints that haven't been bridged yet.
 * Every consumer should carry a TODO pointing at the missing binding.
 */

const BRIDGE_BASE = 'http://127.0.0.1:9877';

export interface BridgeError extends Error {
  tool: string;
  payload?: unknown;
}

/**
 * Call an MCP bridge tool. Resolves with the unwrapped `value`; rejects
 * with a `BridgeError` carrying the tool name and the server payload
 * so callers can log or branch on specific failure modes.
 *
 *   const repos = await callBridge<Repo[]>('forge_repos', { org: 'agent' });
 */
export async function callBridge<T = unknown>(
  tool: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(`${BRIDGE_BASE}/mcp/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, params }),
  });

  if (!res.ok) {
    const err = new Error(`bridge HTTP ${res.status}`) as BridgeError;
    err.tool = tool;
    throw err;
  }

  const body = (await res.json()) as { ok: boolean; value?: T; error?: string };
  if (!body.ok) {
    const err = new Error(body.error || `bridge tool ${tool} returned not-ok`) as BridgeError;
    err.tool = tool;
    err.payload = body;
    throw err;
  }

  return body.value as T;
}

/**
 * Lower-level call: returns the full server envelope ({ok, value?,
 * error?, …extra}) instead of unwrapping to value. Use this for tools
 * that put their payload at the top level (git_branch returns
 * {ok, branch, ahead, behind}; workspace_search returns
 * {ok, matches, truncated}; …) — `callBridge<T>` would resolve those
 * to undefined because there's no `value` field.
 *
 * Network failures still throw; tool-level errors come back as
 * {ok:false, error:"…"}.
 */
export async function callBridgeRaw(
  tool: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; value?: any; error?: string } & Record<string, any>> {
  const res = await fetch(`${BRIDGE_BASE}/mcp/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, params }),
  });
  if (!res.ok) {
    const err = new Error(`bridge HTTP ${res.status}`) as BridgeError;
    err.tool = tool;
    throw err;
  }
  return (await res.json()) as { ok: boolean; value?: any; error?: string } & Record<string, any>;
}
