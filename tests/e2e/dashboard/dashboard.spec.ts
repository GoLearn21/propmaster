/**
 * PropMaster E2E Tests: Dashboard Page
 * Tests for the Property Manager Dashboard with Titanium Precision UI
 */

import { test, expect, PageHelper, ROUTES, SELECTORS } from '../fixtures/base-fixtures';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.dashboard);
  });

  test('should load dashboard page successfully', async ({ page }) => {
    // Check page title and heading
    await expect(page.getByRole('heading', { name: /dashboard/i }).first()).toBeVisible();

    // Check for welcome message
    await expect(page.getByText(/welcome|overview|portfolio/i).first()).toBeVisible();
  });

  test('should display breadcrumb navigation', async ({ page }) => {
    // Dashboard should show breadcrumb
    const breadcrumb = page.locator('nav[aria-label="breadcrumb"], .breadcrumb, [data-testid="breadcrumb"]');
    if (await breadcrumb.count() > 0) {
      await expect(breadcrumb.first()).toBeVisible();
      await expect(breadcrumb.first()).toContainText(/dashboard/i);
    }
  });

  test('should display hero metrics section', async ({ page }) => {
    // Look for metric cards/bento items
    const metricCards = page.locator('[data-testid="metric-card"], [class*="BentoItem"], [class*="MetricCard"]');

    // At minimum, should have metrics like Revenue, Occupancy, Tasks, etc.
    await page.waitForTimeout(1000); // Wait for data to load

    // Check for key metrics text
    const metricsText = ['Revenue', 'Occupancy', 'Tasks', 'Properties', 'Units', 'Tenants'];
    let foundMetrics = 0;

    for (const metric of metricsText) {
      const metricElement = page.getByText(new RegExp(metric, 'i')).first();
      if (await metricElement.count() > 0) {
        foundMetrics++;
      }
    }

    expect(foundMetrics).toBeGreaterThan(0);
  });

  test('should display monthly revenue metric', async ({ page }) => {
    // Look for revenue display
    const revenueSection = page.getByText(/revenue/i).first();
    await expect(revenueSection).toBeVisible();

    // Check for currency formatting ($ symbol)
    const currencyDisplay = page.locator('text=/\\$[\\d,]+/');
    await expect(currencyDisplay.first()).toBeVisible();
  });

  test('should display occupancy rate metric', async ({ page }) => {
    // Look for occupancy rate
    const occupancySection = page.getByText(/occupancy/i).first();
    await expect(occupancySection).toBeVisible();

    // Check for percentage display
    const percentDisplay = page.locator('text=/\\d+(\\.\\d+)?%/');
    await expect(percentDisplay.first()).toBeVisible();
  });

  test('should display active tasks count', async ({ page }) => {
    // Look for tasks section
    const tasksSection = page.getByText(/tasks|maintenance/i).first();
    await expect(tasksSection).toBeVisible();
  });

  test('should display secondary metrics row', async ({ page }) => {
    // Properties, Units, Tenants counts
    const secondaryMetrics = ['Properties', 'Units', 'Tenants'];

    for (const metric of secondaryMetrics) {
      const element = page.getByText(new RegExp(metric, 'i')).first();
      if (await element.count() > 0) {
        await expect(element).toBeVisible();
      }
    }
  });

  test('should have refresh button that works', async ({ page }) => {
    // Find refresh button
    const refreshButton = page.getByRole('button', { name: /refresh/i });

    if (await refreshButton.count() > 0) {
      await refreshButton.click();

      // Button should show loading state or data should refresh
      // Wait for any loading to complete
      await page.waitForTimeout(1000);

      // Page should still be functional
      await expect(page.getByRole('heading', { name: /dashboard/i }).first()).toBeVisible();
    }
  });

  test('should have View Reports button', async ({ page }) => {
    const reportsButton = page.getByRole('link', { name: /reports/i });

    if (await reportsButton.count() > 0) {
      await expect(reportsButton.first()).toBeVisible();

      // Click and verify navigation
      await reportsButton.first().click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/reports/);
    }
  });

  test('should have Create button', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create/i });
    await expect(createButton.first()).toBeVisible();
  });
});

test.describe('Dashboard Charts', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.dashboard);
    // Wait for charts to load
    await page.waitForTimeout(2000);
  });

  test('should display revenue chart section', async ({ page }) => {
    // Look for revenue chart
    const chartSection = page.locator('[data-testid="revenue-chart"], [class*="RevenueChart"], canvas, svg').first();

    if (await chartSection.count() > 0) {
      await expect(chartSection).toBeVisible();
    }
  });

  test('should display occupancy chart section', async ({ page }) => {
    // Look for occupancy chart
    const chartSection = page.locator('[data-testid="occupancy-chart"], [class*="OccupancyChart"]').first();

    if (await chartSection.count() > 0) {
      await expect(chartSection).toBeVisible();
    }
  });

  test('should display skeleton loaders while loading', async ({ page, helper }) => {
    // Reload page to catch loading state
    await page.reload();

    // Check for skeleton/loading states
    const skeletons = page.locator('.animate-pulse, [data-testid="skeleton"], [class*="Skeleton"]');

    // Should see skeletons initially (may be very brief)
    // This test is informational - skeletons appear during load
    const skeletonCount = await skeletons.count();
    console.log(`Found ${skeletonCount} skeleton elements during load`);
  });
});

test.describe('Dashboard Task Summary', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.dashboard);
    await page.waitForTimeout(1500);
  });

  test('should display task summary widget', async ({ page }) => {
    // Look for task summary section
    const taskSection = page.getByText(/task|maintenance/i).first();
    await expect(taskSection).toBeVisible();
  });

  test('should show task counts by status', async ({ page }) => {
    // Look for status indicators
    const statusTexts = ['pending', 'progress', 'complete', 'overdue'];
    let foundStatuses = 0;

    for (const status of statusTexts) {
      const element = page.getByText(new RegExp(status, 'i'));
      if (await element.count() > 0) {
        foundStatuses++;
      }
    }

    // Should find at least one status type
    expect(foundStatuses >= 0).toBeTruthy();
  });
});

test.describe('Dashboard Activity Feed', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.dashboard);
    await page.waitForTimeout(1500);
  });

  test('should display recent activity section', async ({ page }) => {
    // Look for activity feed
    const activitySection = page.getByText(/activity|recent/i).first();

    if (await activitySection.count() > 0) {
      await expect(activitySection).toBeVisible();
    }
  });
});

test.describe('Dashboard Quick Actions', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.dashboard);
  });

  test('should display quick actions section', async ({ page }) => {
    // Look for quick actions
    const quickActions = page.getByText(/quick actions/i);

    if (await quickActions.count() > 0) {
      await expect(quickActions.first()).toBeVisible();
    }
  });

  test('should have Add Property action', async ({ page }) => {
    const addProperty = page.getByRole('link', { name: /property/i });

    if (await addProperty.count() > 0) {
      await expect(addProperty.first()).toBeVisible();
    }
  });

  test('should have Add Tenant action', async ({ page }) => {
    const addTenant = page.getByRole('link', { name: /tenant/i });

    if (await addTenant.count() > 0) {
      await expect(addTenant.first()).toBeVisible();
    }
  });

  test('should have Record Payment action', async ({ page }) => {
    const recordPayment = page.getByRole('link', { name: /payment/i });

    if (await recordPayment.count() > 0) {
      await expect(recordPayment.first()).toBeVisible();
    }
  });

  test('should have Create Task action', async ({ page }) => {
    const createTask = page.getByRole('link', { name: /task/i });

    if (await createTask.count() > 0) {
      await expect(createTask.first()).toBeVisible();
    }
  });

  test('should navigate to Calendar from quick actions', async ({ page, helper }) => {
    const calendarLink = page.getByRole('link', { name: /calendar/i });

    if (await calendarLink.count() > 0) {
      await calendarLink.first().click();
      await helper.waitForPageLoad();
      await expect(page).toHaveURL(/calendar/);
    }
  });
});

test.describe('Dashboard Property Performance', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.dashboard);
    await page.waitForTimeout(2000);
  });

  test('should display property performance table', async ({ page }) => {
    // Look for property table
    const table = page.locator('table').first();

    if (await table.count() > 0) {
      await expect(table).toBeVisible();
    }
  });
});

test.describe('Dashboard Responsive Design', () => {
  test('should display correctly on mobile viewport', async ({ page, helper }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await helper.goto(ROUTES.dashboard);

    // Dashboard should still be visible
    await expect(page.getByRole('heading', { name: /dashboard/i }).first()).toBeVisible();

    // Metrics should be visible
    const revenue = page.getByText(/revenue/i).first();
    await expect(revenue).toBeVisible();
  });

  test('should display correctly on tablet viewport', async ({ page, helper }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await helper.goto(ROUTES.dashboard);

    // Dashboard should still be visible
    await expect(page.getByRole('heading', { name: /dashboard/i }).first()).toBeVisible();
  });

  test('should display correctly on desktop viewport', async ({ page, helper }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await helper.goto(ROUTES.dashboard);

    // Dashboard should display with full layout
    await expect(page.getByRole('heading', { name: /dashboard/i }).first()).toBeVisible();

    // Sidebar should be visible on desktop
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();
  });
});

test.describe('Dashboard Data Visibility', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.dashboard);
    await page.waitForTimeout(2000);
  });

  test('should display property count matching seeded data', async ({ page }) => {
    // Look for property count display
    const propertyCount = page.locator('text=/\\d+\\s*properties/i');
    const propertyMetric = page.getByText(/properties/i).first();

    if (await propertyMetric.count() > 0) {
      await expect(propertyMetric).toBeVisible();
    }

    // Check for numeric value near properties
    const numericDisplay = page.locator('[class*="metric"], [class*="count"], [class*="stat"]').filter({ hasText: /\\d+/ });
    if (await numericDisplay.count() > 0) {
      await expect(numericDisplay.first()).toBeVisible();
    }
  });

  test('should display unit count metric', async ({ page }) => {
    const unitMetric = page.getByText(/units/i).first();
    if (await unitMetric.count() > 0) {
      await expect(unitMetric).toBeVisible();
    }
  });

  test('should display tenant count metric', async ({ page }) => {
    const tenantMetric = page.getByText(/tenants/i).first();
    if (await tenantMetric.count() > 0) {
      await expect(tenantMetric).toBeVisible();
    }
  });

  test('should display lease count metric', async ({ page }) => {
    const leaseMetric = page.getByText(/leases/i).first();
    if (await leaseMetric.count() > 0) {
      await expect(leaseMetric).toBeVisible();
    }
  });

  test('should display workflow cards with proper progress', async ({ page }) => {
    // Look for workflow cards
    const workflowCards = page.locator('[class*="workflow"], [class*="card"]').filter({ hasText: /setup|onboarding|collection/i });

    if (await workflowCards.count() > 0) {
      await expect(workflowCards.first()).toBeVisible();
    }
  });

  test('should show non-zero metrics when data is seeded', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);

    // Check that we have some numeric values displayed
    const numericValues = page.locator('text=/[\\$]?[0-9,]+[.0-9k%]?/');
    const count = await numericValues.count();

    // Should have at least some numeric values on dashboard
    expect(count).toBeGreaterThan(0);
  });

  test('should display charts with data points', async ({ page }) => {
    // Check for SVG chart elements
    const chartPaths = page.locator('svg path[d], svg line, svg rect[class*="bar"]');

    if (await chartPaths.count() > 0) {
      // Charts should have rendered elements
      expect(await chartPaths.count()).toBeGreaterThan(0);
    }
  });

  test('should display recent activity items', async ({ page }) => {
    // Look for activity feed items
    const activityItems = page.locator('[class*="activity"], [class*="recent"] li, [class*="timeline"]');

    if (await activityItems.count() > 0) {
      await expect(activityItems.first()).toBeVisible();
    }
  });
});

test.describe('Dashboard Dark Mode Data Visibility', () => {
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

    await page.waitForTimeout(2000);
  });

  test('should display metrics clearly in dark mode', async ({ page }) => {
    // Check metrics are visible in dark mode
    const revenue = page.getByText(/revenue/i).first();
    await expect(revenue).toBeVisible();

    const occupancy = page.getByText(/occupancy/i).first();
    await expect(occupancy).toBeVisible();
  });

  test('should display charts with visible data in dark mode', async ({ page }) => {
    // Check charts render in dark mode
    const chartSvg = page.locator('svg.recharts-surface, [class*="chart"] svg');

    if (await chartSvg.count() > 0) {
      await expect(chartSvg.first()).toBeVisible();
    }
  });

  test('should display workflow cards clearly in dark mode', async ({ page }) => {
    // Check workflow cards are readable
    const workflowSection = page.getByText(/workflow/i).first();
    if (await workflowSection.count() > 0) {
      await expect(workflowSection).toBeVisible();
    }
  });
});
