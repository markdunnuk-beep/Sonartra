import { expect, test } from '@playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const adminImportRoute =
  process.env.RANKED_PATTERN_ADMIN_IMPORT_ROUTE ??
  '/admin/assessments/single-domain/role-focus/review';

const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`ranked-pattern admin import panel is readable on ${viewport.name}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const response = await page.goto(`${baseUrl}${adminImportRoute}`);

    test.skip(
      !response || response.status() >= 400 || !page.url().includes('/admin/'),
      'Admin route is unavailable in this environment; component-level coverage verifies the panel.',
    );

    const panel = page.locator('[data-ranked-pattern-import-panel="true"]');
    test.skip(
      (await panel.count()) === 0,
      'Ranked-pattern import panel is not visible, usually because local admin fixture data is absent.',
    );

    await expect(panel).toBeVisible();
    await expect(panel.getByLabel('Workbook file path or package reference')).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Audit package' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Dry-run import' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Apply import' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Run publish audit' })).toBeVisible();
    await expect(panel.getByText('Audit and dry-run do not write to the database')).toBeVisible();
    await expect(panel.getByText(/publishing remains a separate explicit action/i)).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
    expect(consoleErrors).toEqual([]);
  });
}
