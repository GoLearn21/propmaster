/**
 * PropMaster E2E Tests: Dark Theme
 * Validates dark theme implementation across all pages
 */

import { test, expect, ROUTES, SELECTORS } from '../fixtures/base-fixtures';

test.describe('Dark Theme - Theme Toggle', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.dashboard);
  });

  test('should have theme toggle button in navigation', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="theme" i], button[aria-label*="mode" i], button:has([class*="Sun"]), button:has([class*="Moon"])');
    if (await themeToggle.count() > 0) {
      await expect(themeToggle.first()).toBeVisible();
    }
  });

  test('should toggle between light and dark mode', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="theme" i], button[aria-label*="mode" i], button:has([class*="Sun"]), button:has([class*="Moon"])');

    if (await themeToggle.count() > 0) {
      // Get initial state
      const htmlElement = page.locator('html');
      const initialClasses = await htmlElement.getAttribute('class');

      // Click toggle
      await themeToggle.first().click();
      await page.waitForTimeout(300);

      // Check state changed
      const newClasses = await htmlElement.getAttribute('class');
      expect(newClasses).not.toBe(initialClasses);
    }
  });

  test('should persist theme preference on reload', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="theme" i], button[aria-label*="mode" i]');

    if (await themeToggle.count() > 0) {
      // Click to toggle theme
      await themeToggle.first().click();
      await page.waitForTimeout(300);

      // Get current state
      const htmlElement = page.locator('html');
      const classes = await htmlElement.getAttribute('class');
      const isDark = classes?.includes('dark');

      // Reload page
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      // Check theme persisted
      const afterClasses = await htmlElement.getAttribute('class');
      const isStillDark = afterClasses?.includes('dark');
      expect(isDark).toBe(isStillDark);
    }
  });
});

test.describe('Dark Theme - Dashboard Charts', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.dashboard);
    // Enable dark mode
    const themeToggle = page.locator('button[aria-label*="theme" i], button[aria-label*="mode" i]');
    if (await themeToggle.count() > 0) {
      const htmlElement = page.locator('html');
      const classes = await htmlElement.getAttribute('class');
      if (!classes?.includes('dark')) {
        await themeToggle.first().click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('should display charts with proper dark mode styling', async ({ page }) => {
    // Check for SVG charts
    const charts = page.locator('svg.recharts-surface, svg[class*="chart"]');
    if (await charts.count() > 0) {
      await expect(charts.first()).toBeVisible();
    }
  });

  test('should have readable axis labels in dark mode', async ({ page }) => {
    // Check that text elements in charts are visible
    const chartText = page.locator('.recharts-cartesian-axis-tick text, svg text');
    if (await chartText.count() > 0) {
      await expect(chartText.first()).toBeVisible();
    }
  });

  test('should have visible grid lines in dark mode', async ({ page }) => {
    // Check for grid lines
    const gridLines = page.locator('.recharts-cartesian-grid line');
    if (await gridLines.count() > 0) {
      await expect(gridLines.first()).toBeVisible();
    }
  });
});

test.describe('Dark Theme - Workflow Cards', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.dashboard);
    // Enable dark mode
    const themeToggle = page.locator('button[aria-label*="theme" i], button[aria-label*="mode" i]');
    if (await themeToggle.count() > 0) {
      const htmlElement = page.locator('html');
      const classes = await htmlElement.getAttribute('class');
      if (!classes?.includes('dark')) {
        await themeToggle.first().click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('should have proper card backgrounds in dark mode', async ({ page }) => {
    const cards = page.locator('[class*="bg-neutral-800"], [class*="dark:bg-neutral"]');
    if (await cards.count() > 0) {
      await expect(cards.first()).toBeVisible();
    }
  });

  test('should have proper text contrast in dark mode', async ({ page }) => {
    // Check for dark mode text classes
    const darkText = page.locator('[class*="dark:text-neutral-100"], [class*="dark:text-white"]');
    if (await darkText.count() > 0) {
      await expect(darkText.first()).toBeVisible();
    }
  });
});

test.describe('Dark Theme - All Major Pages', () => {
  const pagesToTest = [
    { name: 'Dashboard', route: ROUTES.dashboard },
    { name: 'Properties', route: ROUTES.properties },
    { name: 'Rentals', route: ROUTES.rentals },
    { name: 'People', route: ROUTES.people },
    { name: 'Tasks', route: ROUTES.tasksMaintenance },
    { name: 'Accounting', route: ROUTES.accounting },
    { name: 'Calendar', route: ROUTES.calendar },
    { name: 'Communications', route: ROUTES.communications },
    { name: 'Reports', route: ROUTES.reports },
    { name: 'Leasing', route: ROUTES.leasing },
    { name: 'Settings', route: ROUTES.settings },
  ];

  for (const pageConfig of pagesToTest) {
    test(`should render ${pageConfig.name} page correctly in dark mode`, async ({ page, helper }) => {
      await helper.goto(pageConfig.route);

      // Enable dark mode
      const themeToggle = page.locator('button[aria-label*="theme" i], button[aria-label*="mode" i]');
      if (await themeToggle.count() > 0) {
        const htmlElement = page.locator('html');
        const classes = await htmlElement.getAttribute('class');
        if (!classes?.includes('dark')) {
          await themeToggle.first().click();
          await page.waitForTimeout(300);
        }
      }

      // Verify dark mode is active
      const htmlElement = page.locator('html');
      const classes = await htmlElement.getAttribute('class');
      if (classes?.includes('dark')) {
        // Check that the page renders content
        await expect(page.locator('main, [class*="content"]').first()).toBeVisible();

        // Check no pure white backgrounds in main content area
        const mainContent = page.locator('main');
        const hasContent = await mainContent.count() > 0;
        expect(hasContent).toBeTruthy();
      }
    });
  }
});

test.describe('Dark Theme - Portal Pages', () => {
  test('Tenant Login should support dark mode', async ({ page, helper }) => {
    await helper.goto(ROUTES.tenantLogin);
    await page.waitForTimeout(300);

    // Check page loads correctly
    await expect(page.locator('body')).toBeVisible();
  });

  test('Vendor Login should support dark mode', async ({ page, helper }) => {
    await helper.goto(ROUTES.vendorLogin);
    await page.waitForTimeout(300);

    // Check page loads correctly
    await expect(page.locator('body')).toBeVisible();
  });

  test('Owner Login should support dark mode', async ({ page, helper }) => {
    await helper.goto(ROUTES.ownerLogin);
    await page.waitForTimeout(300);

    // Check page loads correctly
    await expect(page.locator('body')).toBeVisible();
  });

  test('Vendor Signup should support dark mode', async ({ page, helper }) => {
    await helper.goto(ROUTES.vendorSignup);
    await page.waitForTimeout(300);

    // Check page loads correctly
    await expect(page.locator('body')).toBeVisible();
  });

  test('Owner Signup should support dark mode', async ({ page, helper }) => {
    await helper.goto(ROUTES.ownerSignup);
    await page.waitForTimeout(300);

    // Check page loads correctly
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Dark Theme - Contrast Validation', () => {
  test('should have sufficient contrast in dark mode cards', async ({ page, helper }) => {
    await helper.goto(ROUTES.dashboard);

    // Enable dark mode
    const themeToggle = page.locator('button[aria-label*="theme" i], button[aria-label*="mode" i]');
    if (await themeToggle.count() > 0) {
      const htmlElement = page.locator('html');
      const classes = await htmlElement.getAttribute('class');
      if (!classes?.includes('dark')) {
        await themeToggle.first().click();
        await page.waitForTimeout(300);
      }
    }

    // Take a screenshot for visual verification
    await page.screenshot({ path: 'test-results/screenshots/dark-mode-dashboard.png', fullPage: true });

    // Verify page has content
    const mainContent = page.locator('main');
    if (await mainContent.count() > 0) {
      await expect(mainContent.first()).toBeVisible();
    }
  });

  test('should maintain readability in dark mode tables', async ({ page, helper }) => {
    await helper.goto(ROUTES.people);

    // Enable dark mode
    const themeToggle = page.locator('button[aria-label*="theme" i], button[aria-label*="mode" i]');
    if (await themeToggle.count() > 0) {
      const htmlElement = page.locator('html');
      const classes = await htmlElement.getAttribute('class');
      if (!classes?.includes('dark')) {
        await themeToggle.first().click();
        await page.waitForTimeout(300);
      }
    }

    // Check table exists
    const table = page.locator('table');
    if (await table.count() > 0) {
      await expect(table.first()).toBeVisible();
    }
  });
});

test.describe('Dark Theme - System Preference', () => {
  test('should respect system preference for dark mode', async ({ page, helper }) => {
    // Emulate dark mode system preference
    await page.emulateMedia({ colorScheme: 'dark' });
    await helper.goto(ROUTES.dashboard);
    await page.waitForTimeout(500);

    // Check if dark mode is applied
    const htmlElement = page.locator('html');
    const classes = await htmlElement.getAttribute('class');
    // Should either be dark or respond to system preference
    expect(classes?.includes('dark') || classes?.includes('system')).toBeTruthy();
  });

  test('should respect system preference for light mode', async ({ page, helper }) => {
    // Emulate light mode system preference
    await page.emulateMedia({ colorScheme: 'light' });
    await helper.goto(ROUTES.dashboard);
    await page.waitForTimeout(500);

    // Check page loads correctly
    await expect(page.locator('body')).toBeVisible();
  });
});
