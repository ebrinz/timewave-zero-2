import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://localhost:3001/' },
  webServer: {
    // Build with an empty basePath so out/ can be served at root, then serve it.
    command: 'bash -c "NEXT_PUBLIC_BASE_PATH= npm run build && python3 -m http.server 3001 --directory out"',
    url: 'http://localhost:3001/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
