import { expect, test } from '@playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const resultUrl = process.env.FLOW_STATE_RANKED_PATTERN_RESULT_URL;

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

test.skip(!resultUrl, 'Set FLOW_STATE_RANKED_PATTERN_RESULT_URL after running the local fixture proof.');

for (const viewport of viewports) {
  test(`generated Flow State ranked-pattern result renders on ${viewport.name}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(new URL(resultUrl!, baseUrl).toString());

    await expect(page.locator('[data-ranked-pattern-result="true"]')).toBeVisible();
    await expect(page.locator('[data-ranked-pattern-signal-distribution="true"]')).toBeVisible();
    await expect(page.getByText(/Pattern /)).toBeVisible();
    await expect(page.getByText(/pattern/i).first()).toBeVisible();

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
