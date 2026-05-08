import type { ConsoleMessage, Page } from '@playwright/test';

const PLAYWRIGHT_CLERK_TEST_HOST = 'local-test-1.clerk.accounts.dev';
const CLERK_JS_PACKAGE_PATH = '/npm/@clerk/clerk-js@';
const WEBKIT_BENIGN_RESOURCE_400_MESSAGE =
  'Failed to load resource: the server responded with a status of 400 (Bad Request)';
const BENIGN_RESOURCE_400_MESSAGE =
  'Failed to load resource: the server responded with a status of 400 ()';

type ConsoleErrorCollectionOptions = {
  ignoreBrowserResourceLoad400?: boolean;
  ignoreWebKitResourceLoad400?: boolean;
};

function isKnownClerkDevelopmentConsoleNoise(message: ConsoleMessage) {
  const locationUrl = message.location().url;
  const text = message.text();

  return (
    (locationUrl.includes(PLAYWRIGHT_CLERK_TEST_HOST)
      && locationUrl.includes(CLERK_JS_PACKAGE_PATH))
    || (text.includes(PLAYWRIGHT_CLERK_TEST_HOST) && text.includes(CLERK_JS_PACKAGE_PATH))
  );
}

export function collectUnexpectedConsoleErrors(
  page: Page,
  options: ConsoleErrorCollectionOptions = {},
) {
  const consoleErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() !== 'error') {
      return;
    }

    if (isKnownClerkDevelopmentConsoleNoise(message)) {
      return;
    }

    const text = message.text();

    if (
      (options.ignoreWebKitResourceLoad400 && text === WEBKIT_BENIGN_RESOURCE_400_MESSAGE)
      || (options.ignoreBrowserResourceLoad400 && text === BENIGN_RESOURCE_400_MESSAGE)
    ) {
      return;
    }

    consoleErrors.push(text);
  });

  return consoleErrors;
}
