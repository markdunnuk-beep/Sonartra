import { expect, test } from '@playwright/test';

import { collectUnexpectedConsoleErrors } from './helpers/console-errors';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`ranked-pattern result fixture renders persisted sections on ${viewport.name}`, async ({ page }) => {
    const consoleErrors = collectUnexpectedConsoleErrors(page);

    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(`${baseUrl}/draft-ranked-pattern-result`);

    await expect(page.locator('[data-ranked-pattern-result="true"]')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: /Alpha leads the current pattern/ })).toBeVisible();
    await expect(page.getByText('Concentrated pattern')).toBeVisible();
    await expect(page.getByText('Pattern alpha_beta_gamma_delta')).toBeVisible();
    await expect(page.locator('[data-ranked-pattern-signal-distribution="true"]')).toBeVisible();

    for (const heading of [
      'Context',
      'Orientation',
      'Recognition',
      'Signal Roles',
      'Pattern Mechanics',
      'Pattern Synthesis',
      'Strengths',
      'Narrowing',
      'Application',
      'Closing Integration',
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

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
    expect(consoleErrors).toEqual([]);
  });
}
