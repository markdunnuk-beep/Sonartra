import { expect, test } from '@playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

test('draft runner supports selection, display modes, and mobile layout', async ({ page }) => {
  await page.goto(`${baseUrl}/draft-runner`);

  await expect(page.getByRole('heading', { level: 1, name: 'Leadership Approach' })).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: 'When a project starts to lose momentum, what are you most likely to do first?',
    }),
  ).toBeVisible();

  const options = page.getByRole('radio');
  await expect(options).toHaveCount(4);

  const optionA = page.getByRole('radio', {
    name: /Refocus the group on the outcome and what needs to happen next/i,
  });
  const optionB = page.getByRole('radio', {
    name: /Step back, identify where the process is breaking down/i,
  });

  await expect(optionB).toHaveAttribute('aria-checked', 'true');
  await optionA.click();
  await expect(optionA).toHaveAttribute('aria-checked', 'true');
  await expect(optionB).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();

  const lightToggle = page.getByRole('button', { name: 'Switch to light reading mode' });
  await expect(lightToggle).toBeVisible();
  await lightToggle.click();
  await expect(page.locator('.draft-runner-shell')).toHaveAttribute('data-reading-mode', 'light');
  await expect(page.getByRole('button', { name: 'Switch to dark reading mode' })).toBeVisible();

  const focusToggle = page.getByRole('button', { name: 'Enter focus mode' });
  await focusToggle.click();
  await expect(page.locator('.draft-runner-shell')).toHaveAttribute('data-focus-mode', 'true');
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Leadership Approach' })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(4);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
