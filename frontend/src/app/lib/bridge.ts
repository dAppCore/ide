// SPDX-Licence-Identifier: EUPL-1.2

/**
 * Typed wrapper around core/ide's MCP HTTP bridge at port 9877.
 *
 * The bridge speaks `{tool, params}` POST → `{ok, value, error?}`. Every
 * frontend store / signal that needs backend data flows through this
 * single helper so:
 *
 *   - There's one place to add auth, retry, telemetry, error logging.
 *   - The bridge URL / port lives in one constant.
 *   - Components never touch `fetch` directly — they consume signals
 *     wired by stores that call this.
 *
 * Used by `services/store/*.ts` resource() loaders.
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
 *   const sites = await callBridge<Site[]>('vibridge.Sites');
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
