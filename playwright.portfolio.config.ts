import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/portfolio-e2e',
  outputDir: './test-results/portfolio',
  workers: 1,
  timeout: 45000,
  expect: { timeout: 15000 },
  use: {
    baseURL: process.env.PORTFOLIO_TEST_URL ?? 'http://127.0.0.1:3002',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'portfolio',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
  ],
  ...(!process.env.PORTFOLIO_TEST_URL
    ? {
        webServer: {
          command: 'npm run dev:portfolio',
          url: 'http://127.0.0.1:3002',
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        },
      }
    : {}),
});
