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
    await expect(page.locator('[data-ranked-pattern-snapshot="true"]')).toBeVisible();
    await expect(page.locator('[data-ranked-pattern-snapshot-card="true"]')).toHaveCount(4);

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
    const snapshotCards = page.locator('[data-ranked-pattern-snapshot-card="true"]');
    await expect(snapshotCards.nth(0)).toContainText('Alpha');
    await expect(snapshotCards.nth(0)).toContainText('55%');
    await expect(snapshotCards.nth(1)).toContainText('Beta');
    await expect(snapshotCards.nth(1)).toContainText('25%');
    await expect(snapshotCards.nth(2)).toContainText('Gamma');
    await expect(snapshotCards.nth(2)).toContainText('12%');
    await expect(snapshotCards.nth(3)).toContainText('Delta');
    await expect(snapshotCards.nth(3)).toContainText('8%');
    await expect(page.locator('[data-ranked-pattern-snapshot="true"]').getByText('Signal shape')).toBeVisible();
    await expect(page.getByText('Pattern shape')).toHaveCount(0);
    await expect(page.getByText('Score shape')).toHaveCount(0);
    await expect(page.getByText('Ranked spread')).toHaveCount(0);
    await expect(page.getByText('Use the ranked order')).toBeVisible();
    await expect(page.getByText('Take the whole pattern forward')).toBeVisible();
    await expect(page.locator('[data-ranked-pattern-signal-role-group="true"]')).toHaveCount(4);
    await expect(page.locator('[data-ranked-pattern-signal-role-card="true"]')).toHaveCount(12);
    await expect(page.getByText('What this helps')).toHaveCount(4);
    await expect(page.getByText('Watch for')).toHaveCount(4);
    await expect(page.getByText('Try this')).toHaveCount(4);

    const signalRoleLayout = await page.evaluate(() => {
      const groups = [...document.querySelectorAll('[data-ranked-pattern-signal-role-group="true"]')];
      const firstCardLefts = groups.map((group) => {
        const firstCard = group.querySelector('[data-ranked-pattern-signal-role-card="true"]');
        return firstCard ? Math.round(firstCard.getBoundingClientRect().left) : 0;
      });
      const cardHeights = [...document.querySelectorAll('[data-ranked-pattern-signal-role-card="true"]')]
        .map((card) => Math.round(card.getBoundingClientRect().height));

      return {
        maxLeftDelta: Math.max(...firstCardLefts) - Math.min(...firstCardLefts),
        minCardHeight: Math.min(...cardHeights),
      };
    });

    expect(signalRoleLayout.maxLeftDelta).toBeLessThanOrEqual(2);
    expect(signalRoleLayout.minCardHeight).toBeGreaterThanOrEqual(110);
    await expect(page.getByRole('heading', { name: 'Drivers' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Pair' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Limitation' })).toHaveCount(0);

    await page.locator('button[aria-label="Switch to light reading mode"]:visible').first().click();
    const publicHeader = page.locator('[data-public-site-header="true"]');
    await expect(publicHeader).toBeVisible();
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

    if (viewport.name === 'mobile') {
      const mobileNavigator = page.locator('[data-draft-mobile-section-navigator="true"]');
      const currentSection = mobileNavigator.locator('.draft-mobile-section-current');
      await expect(currentSection).toHaveText('Introduction');
      await expect(currentSection).not.toHaveCSS('color', 'rgb(255, 255, 255)');

      await page.getByRole('button', { name: 'Open report sections' }).click();
      const activeSectionLink = mobileNavigator.locator('.draft-mobile-section-link[aria-current="step"]');
      await expect(activeSectionLink).toBeVisible();
      await expect(activeSectionLink).not.toHaveCSS('color', 'rgb(255, 255, 255)');

      const activeItemLayout = await activeSectionLink.evaluate((link) => {
        const card = link.closest('.draft-mobile-section-nav-card');
        const linkRect = link.getBoundingClientRect();
        const cardRect = card?.getBoundingClientRect();

        return {
          borderColor: window.getComputedStyle(link).borderColor,
          leftInset: cardRect ? linkRect.left - cardRect.left : 0,
          rightInset: cardRect ? cardRect.right - linkRect.right : 0,
        };
      });

      expect(activeItemLayout.borderColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(activeItemLayout.leftInset).toBeGreaterThan(8);
      expect(activeItemLayout.rightInset).toBeGreaterThan(8);
    }

    await page.locator('button[aria-label="Switch to dark reading mode"]:visible').first().click();
    await expect(publicHeader.locator('img[alt="Sonartra"]')).toHaveAttribute(
      'src',
      /sonartra-logo-white\.svg/,
    );

    await expect(publicHeader).toHaveAttribute('data-draft-focus-mode', 'false');
    if (viewport.name === 'desktop') {
      await page.getByRole('button', { name: 'Enter focus mode' }).click();
      await expect(publicHeader).toHaveAttribute('data-draft-focus-mode', 'true');
      await expect(publicHeader).toHaveCSS('opacity', '0');

      await page.getByRole('button', { name: 'Exit focus mode' }).click();
      await expect(publicHeader).toHaveAttribute('data-draft-focus-mode', 'false');
      await expect(publicHeader).toHaveCSS('opacity', '1');
    }

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
    expect(consoleErrors).toEqual([]);
  });
}
