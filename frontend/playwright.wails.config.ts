import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for tests that drive the LIVE Wails window via the
 * MCP bridge (instead of a separate browser). Companion to playwright.config.ts:
 *
 *   playwright.config.ts        — drives Chromium against a static-served
 *                                 dist/. Use for CI or when the binary
 *                                 isn't running.
 *   playwright.wails.config.ts  — drives the live Wails window via the
 *                                 webview_* MCP bridge tools. Tests run
 *                                 against actual production WebKit/WebView2.
 *
 * No webServer here — the binary must already be running. The driver
 * itself doesn't open a Chromium instance for the test pages either; the
 * "page" target is the live window. We still launch a Chromium browser
 * because Playwright's test runner needs one for browser-isolated state,
 * but the tests don't actually navigate it.
 */
export default defineConfig({
  testDir: './tests/wails',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:9877',
    actionTimeout: 5_000,
  },
  projects: [
    {
      name: 'wails-live',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
