import { defineConfig, devices } from '@playwright/test';

import { BASE_URL } from './support/env.mjs';

const ci = !!process.env.CI;

/**
 * End-to-end tests against the whole site (server/start.mjs: API + client on one origin, own
 * port and database). Locally in the installed Edge (no browser download), in CI in Playwright's
 * Chromium. The UI language follows the browser: English, the default.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  // More parallel browsers than this overload a laptop (tests time out)
  workers: ci ? 2 : 4,
  reporter: ci
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    locale: 'en-US',
    timezoneId: 'Europe/Berlin',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: ci ? 'chromium' : 'edge',
      use: { ...devices['Desktop Chrome'], channel: ci ? undefined : 'msedge' },
    },
  ],
  webServer: {
    command: 'node server/start.mjs',
    url: `${BASE_URL}/api/health`,
    // Builds the client and the API first
    timeout: 5 * 60_000,
    // Locally a site left running (node server/start.mjs) is reused
    reuseExistingServer: !ci,
    stdout: 'pipe',
  },
});
