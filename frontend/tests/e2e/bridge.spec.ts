import { bridgeTest as test, expect, callBridge } from './_helpers';

/**
 * Tests that require a live MCP bridge at http://127.0.0.1:9877.
 *
 * Auto-skip when the bridge is unreachable — start core-ide first:
 *   cd go && go build -o /tmp/core-ide-smoke ./cmd/core-ide
 *   env -u FORGE_TOKEN /tmp/core-ide-smoke &
 *
 * The bridgeTest fixture from _helpers.ts handles the skip logic.
 */

test.describe('memory panel + cache', () => {
  test('navigates to /memory and shows entries from the bridge', async ({ page }) => {
    await page.goto('/');
    // First seed the cache via direct bridge call so the panel renders fast.
    const seed = await callBridge('memory_list', { force: false });
    test.skip(!seed.ok, `memory_list failed: ${seed.error}`);

    await page.locator('.nav-row').filter({ hasText: 'Memory' }).first().click();
    await expect(page.locator('.nav-row.active .nav-label')).toContainText('Memory');

    // Wait for entries to populate.
    await expect(page.locator('.mem-row').first()).toBeVisible({ timeout: 10_000 });
    const count = await page.locator('.mem-row').count();
    expect(count).toBeGreaterThan(0);
  });

  test('cache pill renders after a second visit', async ({ page }) => {
    await page.goto('/');
    // Visit memory twice — first seeds, second should be cache-hit.
    await page.locator('.nav-row').filter({ hasText: 'Memory' }).first().click();
    await expect(page.locator('.mem-row').first()).toBeVisible({ timeout: 10_000 });

    // Bounce away + back to trigger a re-load.
    await page.locator('.nav-row').filter({ hasText: 'Sessions' }).first().click();
    await page.waitForTimeout(500);
    await page.locator('.nav-row').filter({ hasText: 'Memory' }).first().click();

    // Pill should appear (either ● fresh or ● cached); any visible cache-pill counts.
    await expect(page.locator('.mem-header .cache-pill')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('cache panel', () => {
  test('lists cached collections after seeding', async ({ page }) => {
    // Seed at least one collection.
    const seed = await callBridge('memory_list', {});
    test.skip(!seed.ok, `memory_list failed: ${seed.error}`);

    await page.goto('/');
    await page.locator('.nav-row').filter({ hasText: 'Cache' }).first().click();
    await expect(page.locator('.nav-row.active .nav-label')).toContainText('Cache');

    // The memory collection row should be present.
    await expect(page.locator('.ch-table tbody tr').filter({ hasText: 'memory' })).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('mantis panel', () => {
  test('renders ticket rows when API reachable', async ({ page }) => {
    const probe = await callBridge('mantis_list', { page_size: 5 });
    test.skip(!probe.ok, `mantis_list unavailable: ${probe.error}`);

    await page.goto('/');
    await page.locator('.nav-row').filter({ hasText: 'Tickets' }).first().click();
    await expect(page.locator('.nav-row.active .nav-label')).toContainText('Tickets');

    await expect(page.locator('.mn-row').first()).toBeVisible({ timeout: 10_000 });
    const idText = await page.locator('.mn-row .mn-id').first().textContent();
    expect(idText).toMatch(/^#\d+$/);
  });
});
