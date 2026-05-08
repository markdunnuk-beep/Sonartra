import { expect, test } from '@playwright/test';

import { collectUnexpectedConsoleErrors } from './helpers/console-errors';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`ranked-pattern result fixture renders persisted sections on ${viewport.name}`, async ({
    browserName,
    page,
  }) => {
    const consoleErrors = collectUnexpectedConsoleErrors(page, {
      ignoreWebKitResourceLoad400: browserName === 'webkit',
    });

    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(`${baseUrl}/draft-ranked-pattern-result`);

    await expect(page.locator('[data-ranked-pattern-result="true"]')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: /clear first-route pattern/i })).toBeVisible();
    await expect(page.getByRole('definition').filter({ hasText: 'Concentrated pattern' })).toBeVisible();
    await expect(page.getByText('Pattern reference: alpha_beta_gamma_delta')).toBeVisible();
    await expect(page.locator('[data-ranked-pattern-signal-distribution="true"]')).toBeVisible();

    for (const heading of [
      'Introduction',
      'Pattern at a Glance',
      'Core Interpretation',
      'Signal Profile',
      'What Shapes This Pattern',
      'How the Pattern Works',
      'What Comes Easily',
      'Where It Can Narrow',
      'How to Use It',
      'Take Forward',
    ]) {
      await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
    }

    await expect(
      page.locator('[data-ranked-pattern-signal-distribution="true"]').getByText('Alpha', { exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('[data-ranked-pattern-signal-distribution="true"]').getByText('55%', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Use the ranked order')).toBeVisible();
    await expect(page.getByText('Take the whole pattern forward')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Drivers' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Pair' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Limitation' })).toHaveCount(0);

    await page.locator('button[aria-label="Switch to light reading mode"]:visible').first().click();
    const publicHeader = page.locator('[data-public-site-header="true"]');
    await expect(publicHeader.locator('img[alt="Sonartra"]')).toHaveAttribute(
      'src',
      /sonartra-logo-black\.svg/,
    );
    const lightHeaderColor = await publicHeader.evaluate((header) => {
      const readableHeaderControl =
        header.querySelector('nav[aria-label="Primary"] a') ??
        header.querySelector('button[aria-label="Open navigation menu"]');

      return readableHeaderControl ? window.getComputedStyle(readableHeaderControl).color : '';
    });
    expect(lightHeaderColor).not.toBe('rgb(255, 255, 255)');

    await page.locator('button[aria-label="Switch to dark reading mode"]:visible').first().click();
    await expect(publicHeader.locator('img[alt="Sonartra"]')).toHaveAttribute(
      'src',
      /sonartra-logo-white\.svg/,
    );

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
    expect(consoleErrors).toEqual([]);
  });
}
