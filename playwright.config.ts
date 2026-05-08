import { defineConfig, devices } from '@playwright/test';

const playwrightBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim() || 'http://localhost:3000';
const playwrightClerkPublishableKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ||
  'pk_test_bG9jYWwtdGVzdC0xLmNsZXJrLmFjY291bnRzLmRldiQ=';
const playwrightClerkSecretKey =
  process.env.CLERK_SECRET_KEY?.trim() || 'sk_test_playwright_local_placeholder';

process.env.PLAYWRIGHT_BASE_URL = playwrightBaseUrl;

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: playwrightBaseUrl,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run build && npm run start',
    url: playwrightBaseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      PLAYWRIGHT_BASE_URL: playwrightBaseUrl,
      PORT: '3000',
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: playwrightClerkPublishableKey,
      CLERK_SECRET_KEY: playwrightClerkSecretKey,
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
      NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: '/app/workspace',
      NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: '/app/workspace',
      NEXT_PUBLIC_CLERK_TELEMETRY_DISABLED: 'true',
    },
  },
});
