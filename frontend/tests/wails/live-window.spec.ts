import { test, expect } from '@playwright/test';
import { Window, bridgeReachable, callBridge, queryDOM } from './wails-driver';

/**
 * Tests that drive the LIVE Wails window via the MCP bridge.
 *
 * Unlike the dist-served Playwright tests in tests/e2e/, these tests
 * run against the actual production WebKit/WebView2 window:
 *  - macOS WKWebView with system Safari rendering quirks
 *  - Windows WebView2 / Linux WebKitGTK if running there
 *  - @wailsio/runtime calls that go to /wails/runtime actually resolve
 *  - native menus, system tray, window state persistence all live
 *
 * Auto-skip when the binary isn't running. Run them with:
 *   env -u FORGE_TOKEN /tmp/core-ide &
 *   cd frontend && npm run test:wails
 */

const skipIfNoBridge = test.beforeEach(async ({}, testInfo) => {
  const reachable = await bridgeReachable();
  if (!reachable) testInfo.skip(true, 'bridge not reachable — start core-ide first');
});

let win: Window;

test.beforeAll(async () => {
  win = new Window('core-ide-chat');
});

test.describe('live Wails window — sanity', () => {
  test('window title is Lethean Desktop', async () => {
    const title = await win.title();
    expect(title).toBe('Lethean Desktop');
  });

  test('webview_query finds nav rows in the DOM', async () => {
    const rows = await queryDOM('core-ide-chat', '.nav-row');
    expect(rows).toBeTruthy();
  });

  test('evaluate returns a serialisable value', async () => {
    const result = await win.evaluate<{ now: number; href: string }>(`
      return { now: Date.now(), href: window.location.href };
    `);
    expect(result?.now).toBeGreaterThan(0);
    expect(result?.href).toBeTruthy();
  });
});

test.describe('live window — sidebar + routing', () => {
  test('sidebar renders all Developer-group entries', async () => {
    const expected = ['Explorer', 'Search', 'Source Control', 'Updates', 'Sessions', 'Stream', 'Memory', 'Tickets', 'Cache'];
    for (const label of expected) {
      const loc = win.locator('.nav-row').filter({ hasText: label });
      expect(await loc.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('clicking Memory switches the active panel', async () => {
    await win.locator('.nav-row').filter({ hasText: 'Memory' }).click();
    await win.waitFor(async () => {
      const text = await win.locator('.nav-row.active .nav-label').textContent();
      return text === 'Memory';
    }, { timeout: 5000, description: 'active panel = Memory' });
  });

  test('Cmd+5 jumps to Sessions', async () => {
    // Bring focus off any input so the shortcut handler runs.
    await win.evaluate(`document.body.focus(); return true;`);
    await win.keyDown('5', { meta: true });
    await win.waitFor(async () => {
      const text = await win.locator('.nav-row.active .nav-label').textContent();
      return text === 'Sessions';
    }, { timeout: 5000, description: 'active panel = Sessions' });
  });
});

test.describe('live window — bridge-driven panels', () => {
  test('memory panel shows entries from cache', async () => {
    // Seed the cache.
    const seed = await callBridge('memory_list', {});
    test.skip(!seed.ok, `memory_list failed: ${seed.error}`);

    await win.locator('.nav-row').filter({ hasText: 'Memory' }).click();
    const rows = win.locator('.mem-row');
    await rows.waitForVisible(10000);
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('cache panel lists collections', async () => {
    await callBridge('memory_list', {}); // seed
    await win.locator('.nav-row').filter({ hasText: 'Cache' }).click();
    await win.locator('.ch-table tbody tr').waitForAttached(5000);

    const memoryRow = win.locator('.ch-table tbody tr').filter({ hasText: 'memory' });
    expect(await memoryRow.count()).toBeGreaterThanOrEqual(1);
  });
});

test.describe('live window — diagnostics', () => {
  test('console messages are readable', async () => {
    // Don't filter — the IDE produces lots of warnings on every render
    // (Angular sanitizer, Wails browser-mode notice). 50 is plenty.
    const logs = await win.console({ limit: 50 });
    expect(logs.length).toBeGreaterThanOrEqual(1);
  });

  test('domTree returns a node when scoped to .nav-row', async () => {
    // Whole-page tree blows the 5s eval timeout on macOS WebKit;
    // scope to a small subtree so the serialiser stays fast.
    const tree = await win.domTree({ selector: '.nav-row', maxDepth: 1 });
    expect(tree).toBeTruthy();
  });
});
