import { test as base, expect, Page } from '@playwright/test';

const BRIDGE = 'http://127.0.0.1:9877';

/**
 * Ping the MCP bridge — tests that need a live binary can guard with this.
 * Returns true when /mcp/info responds 200.
 */
export async function bridgeReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE}/mcp/info`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Direct bridge call from the test runner — useful for arranging state
 * (seeding caches, publishing stream frames) before driving the UI.
 */
export async function callBridge(tool: string, params: Record<string, unknown> = {}): Promise<{ ok: boolean; value?: any; error?: string }> {
  const res = await fetch(`${BRIDGE}/mcp/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, params }),
  });
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
  return res.json();
}

/**
 * Custom test fixture that auto-skips when the bridge is unreachable.
 * Use `bridgeTest` instead of `test` for any spec that depends on the
 * binary being live.
 */
export const bridgeTest = base.extend<{ bridge: void }>({
  bridge: [
    async ({}, use, testInfo) => {
      const reachable = await bridgeReachable();
      if (!reachable) {
        testInfo.skip(true, `bridge not reachable at ${BRIDGE} — start core-ide first`);
      }
      await use();
    },
    { auto: true },
  ],
});

export { expect, BRIDGE };
export type { Page };

/**
 * Click a sidebar nav row by its label text. Sidebar lives in the
 * left pane; rows are <button class="nav-row"> with a .nav-label child.
 */
export async function clickSidebar(page: Page, label: string): Promise<void> {
  await page.getByRole('button').filter({ hasText: label }).first().click();
}

/**
 * Wait for the route to settle on a panel — uses the active sidebar
 * row's label as the readiness signal.
 */
export async function waitForActivePanel(page: Page, label: string): Promise<void> {
  await expect(page.locator('.nav-row.active .nav-label')).toContainText(label, { timeout: 10_000 });
}
