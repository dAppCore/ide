import { test, expect } from '@playwright/test';
import { clickSidebar, waitForActivePanel } from './_helpers';

/**
 * Baseline UI tests — exercise the parts that don't require a live
 * MCP bridge. Sidebar rendering, panel switching, keyboard shortcuts.
 *
 * Tests that DO need the bridge live use the bridgeTest fixture from
 * _helpers — see bridge.spec.ts.
 */

test.describe('sidebar + routing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for Angular hydration — sidebar's brand row is a stable signal.
    await expect(page.locator('.brand-name')).toContainText('Lethean Desktop');
  });

  test('renders Developer-group sidebar', async ({ page }) => {
    const expected = ['Explorer', 'Search', 'Source Control', 'Updates', 'Sessions', 'Stream', 'Memory', 'Tickets', 'Cache'];
    for (const label of expected) {
      await expect(page.locator('.nav-row').filter({ hasText: label }).first()).toBeVisible();
    }
  });

  test('clicking sidebar entries switches the active panel', async ({ page }) => {
    await clickSidebar(page, 'Memory');
    await waitForActivePanel(page, 'Memory');

    await clickSidebar(page, 'Sessions');
    await waitForActivePanel(page, 'Sessions');

    await clickSidebar(page, 'Cache');
    await waitForActivePanel(page, 'Cache');
  });

  test('Cmd+digit shortcuts jump between panels', async ({ page }) => {
    // Take focus off any input first — shortcuts skip text fields.
    await page.locator('body').click();

    // ⌘5 = Sessions (5th in Developer group: Files, Search, Source Control, Updates, Sessions)
    await page.keyboard.press('Meta+5');
    await waitForActivePanel(page, 'Sessions');

    // ⌘7 = Memory
    await page.keyboard.press('Meta+7');
    await waitForActivePanel(page, 'Memory');

    // ⌘8 = Tickets
    await page.keyboard.press('Meta+8');
    await waitForActivePanel(page, 'Tickets');
  });
});
