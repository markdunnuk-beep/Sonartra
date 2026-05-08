import type { ConsoleMessage, Page } from '@playwright/test';

const PLAYWRIGHT_CLERK_TEST_HOST = 'local-test-1.clerk.accounts.dev';
const CLERK_JS_PACKAGE_PATH = '/npm/@clerk/clerk-js@';

function isKnownClerkDevelopmentConsoleNoise(message: ConsoleMessage) {
  const locationUrl = message.location().url;
  const text = message.text();

  return (
    (locationUrl.includes(PLAYWRIGHT_CLERK_TEST_HOST)
      && locationUrl.includes(CLERK_JS_PACKAGE_PATH))
    || (text.includes(PLAYWRIGHT_CLERK_TEST_HOST) && text.includes(CLERK_JS_PACKAGE_PATH))
  );
}

export function collectUnexpectedConsoleErrors(page: Page) {
  const consoleErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() !== 'error') {
      return;
    }

    if (isKnownClerkDevelopmentConsoleNoise(message)) {
      return;
    }

    consoleErrors.push(message.text());
  });

  return consoleErrors;
}
