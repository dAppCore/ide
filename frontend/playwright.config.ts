import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for core-ide UI tests.
 *
 * Strategy: build the Angular bundle, serve `dist/` with a static server,
 * and drive it via Chromium. The MCP bridge that the frontend talks to
 * (http://127.0.0.1:9877) must already be running — start it with
 *   `cd ../go && go run ./cmd/core-ide`
 * (or use the smoke binary: `env -u FORGE_TOKEN /tmp/core-ide-smoke &`).
 *
 * The bridge has Access-Control-Allow-Origin: * so cross-origin fetches
 * from the test page work without proxying. Tests that require the
 * bridge skip themselves when it's unreachable (see tests/e2e/_helpers.ts).
 *
 * @wailsio/runtime 404s on /wails/runtime when not running inside Wails;
 * the affected calls are lazy + .then()'d so the page renders correctly.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // bridge state (cache, stream) isn't isolated
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4200',
    trace: 'on-first-retry',
    actionTimeout: 5_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      // Static-serve the production build. Build first via npm run build:dev,
      // or set BUILD_BEFORE_SERVE=1 to do it inline.
      command: process.env.BUILD_BEFORE_SERVE
        ? 'npm run build:dev && npx serve -s dist -l 4200 --no-clipboard'
        : 'npx serve -s dist -l 4200 --no-clipboard',
      url: 'http://127.0.0.1:4200',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
