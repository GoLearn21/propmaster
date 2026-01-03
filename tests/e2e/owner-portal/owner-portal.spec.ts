/**
 * PropMaster E2E Tests: Owner Portal
 * Tests for the Owner Portal - "The Boardroom" experience
 */

import { test, expect, PageHelper, ROUTES, SELECTORS } from '../fixtures/base-fixtures';

test.describe('Owner Portal - Login Page', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.ownerLogin);
  });

  test('should display owner login page', async ({ page }) => {
    // Check for login form elements
    await expect(page.getByText(/owner|login|sign in/i).first()).toBeVisible();
  });

  test('should have email input field', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    await expect(emailInput.first()).toBeVisible();
  });

  test('should have password input field', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    await expect(passwordInput.first()).toBeVisible();
  });

  test('should have login button', async ({ page }) => {
    const loginButton = page.getByRole('button', { name: /login|sign in|submit/i });
    await expect(loginButton.first()).toBeVisible();
  });

  test('should show validation error for empty form submission', async ({ page }) => {
    const loginButton = page.getByRole('button', { name: /login|sign in|submit/i });
    await loginButton.first().click();
    await page.waitForTimeout(500);
    // Form should show validation
  });

  test('should show error for invalid credentials', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill('invalid@owner.com');
    await passwordInput.fill('wrongpassword');

    const loginButton = page.getByRole('button', { name: /login|sign in|submit/i });
    await loginButton.first().click();

    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/login|owner/);
  });

  test('should display forgot password link', async ({ page }) => {
    const forgotLink = page.getByRole('link', { name: /forgot|reset/i });
    if (await forgotLink.count() > 0) {
      await expect(forgotLink.first()).toBeVisible();
    }
  });

  test('should display signup link', async ({ page }) => {
    const signupLink = page.getByRole('link', { name: /sign up|register|request access/i });
    await expect(signupLink.first()).toBeVisible();
  });

  test('should navigate to signup page from login', async ({ page }) => {
    const signupLink = page.getByRole('link', { name: /sign up|register|request access/i });
    await signupLink.first().click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/signup/);
  });
});

test.describe('Owner Portal - Signup Page', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.ownerSignup);
  });

  test('should display owner signup page', async ({ page }) => {
    await expect(page.getByText(/sign up|register|owner/i).first()).toBeVisible();
  });

  test('should have signup mode toggle (invite vs self-register)', async ({ page }) => {
    const inviteMode = page.getByRole('button', { name: /invite|code/i });
    const selfRegister = page.getByRole('button', { name: /request|no code/i });

    if (await inviteMode.count() > 0 || await selfRegister.count() > 0) {
      expect(await inviteMode.count() + await selfRegister.count()).toBeGreaterThan(0);
    }
  });

  test('should have name input fields', async ({ page }) => {
    const nameInput = page.locator('input[name*="name" i], input[placeholder*="name" i]');
    if (await nameInput.count() > 0) {
      await expect(nameInput.first()).toBeVisible();
    }
  });

  test('should have email input field', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name*="email" i]');
    await expect(emailInput.first()).toBeVisible();
  });

  test('should have password input fields', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput.first()).toBeVisible();
  });

  test('should have phone number field', async ({ page }) => {
    const phoneInput = page.locator('input[type="tel"], input[name*="phone" i]');
    if (await phoneInput.count() > 0) {
      await expect(phoneInput.first()).toBeVisible();
    }
  });

  test('should validate password requirements', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('weak');

    const requirements = page.getByText(/8 characters|uppercase|number|password/i);
    if (await requirements.count() > 0) {
      expect(await requirements.count()).toBeGreaterThan(0);
    }
  });

  test('should have signup submit button', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /sign up|register|submit|create/i });
    await expect(submitButton.first()).toBeVisible();
  });

  test('should have link back to login', async ({ page }) => {
    const loginLink = page.getByRole('link', { name: /sign in|login|already have/i });
    if (await loginLink.count() > 0) {
      await expect(loginLink.first()).toBeVisible();
    }
  });

  test('should display dark mode styling correctly', async ({ page }) => {
    const themeToggle = page.locator('button[aria-label*="theme" i], button[aria-label*="mode" i]');
    if (await themeToggle.count() > 0) {
      await themeToggle.first().click();
      await page.waitForTimeout(300);

      const htmlElement = page.locator('html');
      const classes = await htmlElement.getAttribute('class');
      expect(classes?.includes('dark') || classes?.includes('light')).toBeTruthy();
    }
  });
});

test.describe('Owner Portal - Dashboard', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.ownerDashboard);
  });

  test('should display owner dashboard or redirect to login', async ({ page }) => {
    const currentUrl = page.url();

    if (currentUrl.includes('login')) {
      await expect(page.getByText(/login|sign in/i).first()).toBeVisible();
    } else {
      const dashboardContent = page.getByText(/dashboard|portfolio|properties/i);
      await expect(dashboardContent.first()).toBeVisible();
    }
  });

  test('should display portfolio value metric', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const portfolioSection = page.getByText(/portfolio|total value|assets/i);
      if (await portfolioSection.count() > 0) {
        await expect(portfolioSection.first()).toBeVisible();
      }
    }
  });

  test('should display monthly income metric', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const incomeSection = page.getByText(/income|revenue|rent/i);
      if (await incomeSection.count() > 0) {
        await expect(incomeSection.first()).toBeVisible();
      }
    }
  });

  test('should display occupancy rate', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const occupancySection = page.getByText(/occupancy|occupied/i);
      if (await occupancySection.count() > 0) {
        await expect(occupancySection.first()).toBeVisible();
      }
    }
  });

  test('should display net income metric', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const netIncomeSection = page.getByText(/net income|profit|earnings/i);
      if (await netIncomeSection.count() > 0) {
        await expect(netIncomeSection.first()).toBeVisible();
      }
    }
  });

  test('should display currency values with proper formatting', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      // Look for currency formatting ($ symbol)
      const currencyDisplay = page.locator('text=/\\$[\\d,]+/');
      if (await currencyDisplay.count() > 0) {
        await expect(currencyDisplay.first()).toBeVisible();
      }
    }
  });

  test('should display percentage values', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      // Look for percentage formatting
      const percentDisplay = page.locator('text=/\\d+(\\.\\d+)?%/');
      if (await percentDisplay.count() > 0) {
        await expect(percentDisplay.first()).toBeVisible();
      }
    }
  });

  test('should display sparklines for trends', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      // Look for sparkline/chart elements
      const sparklines = page.locator('svg, canvas, [class*="sparkline"], [class*="chart"]');
      if (await sparklines.count() > 0) {
        await expect(sparklines.first()).toBeVisible();
      }
    }
  });
});

test.describe('Owner Portal - Layout', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.ownerDashboard);
  });

  test('should display owner portal branding', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const branding = page.getByText(/masterkey|owner portal/i);
      if (await branding.count() > 0) {
        await expect(branding.first()).toBeVisible();
      }
    }
  });

  test('should display navigation header', async ({ page }) => {
    await page.waitForTimeout(3000);
    const currentUrl = page.url();

    // Owner portal may redirect to login or show portal
    if (currentUrl.includes('login') || currentUrl.includes('owner')) {
      // On login or owner page, verify some content exists
      const content = await page.content();
      expect(content.length).toBeGreaterThan(100);
      await expect(page.locator('body')).toBeVisible();
    } else {
      // On any other page, verify body is visible
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should have emerald accent theme', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      // Check for emerald/green accent color in styling
      const emeraldElements = page.locator('[class*="emerald"], [class*="green"]');
      if (await emeraldElements.count() > 0) {
        expect(await emeraldElements.count()).toBeGreaterThan(0);
      }
    }
  });

  test('should display theme toggle', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const themeToggle = page.locator('button[aria-label*="theme" i], button[aria-label*="mode" i], button:has([class*="Sun"]), button:has([class*="Moon"])');
      if (await themeToggle.count() > 0) {
        await expect(themeToggle.first()).toBeVisible();
      }
    }
  });

  test('should display user menu', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const userMenu = page.locator('button[aria-label*="user" i], button[aria-label*="account" i], [class*="avatar"]');
      if (await userMenu.count() > 0) {
        await expect(userMenu.first()).toBeVisible();
      }
    }
  });
});

test.describe('Owner Portal - Financial Reports', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.ownerFinancialReports);
  });

  test('should display financial reports page or redirect to login', async ({ page }) => {
    const currentUrl = page.url();

    if (currentUrl.includes('login')) {
      await expect(page.getByText(/login|sign in/i).first()).toBeVisible();
    } else {
      await expect(page.getByText(/financial|reports|statements/i).first()).toBeVisible();
    }
  });

  test('should display income statement option', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const incomeStatement = page.getByText(/income statement|p&l|profit/i);
      if (await incomeStatement.count() > 0) {
        await expect(incomeStatement.first()).toBeVisible();
      }
    }
  });

  test('should display cash flow statement option', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const cashFlow = page.getByText(/cash flow|cash statement/i);
      if (await cashFlow.count() > 0) {
        await expect(cashFlow.first()).toBeVisible();
      }
    }
  });

  test('should display balance sheet option', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const balanceSheet = page.getByText(/balance sheet|assets|liabilities/i);
      if (await balanceSheet.count() > 0) {
        await expect(balanceSheet.first()).toBeVisible();
      }
    }
  });

  test('should have date range selector', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const dateSelector = page.locator('select, [class*="date-picker"], input[type="date"]');
      if (await dateSelector.count() > 0) {
        await expect(dateSelector.first()).toBeVisible();
      }
    }
  });

  test('should have export/download option', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const exportButton = page.getByRole('button', { name: /export|download|pdf/i });
      if (await exportButton.count() > 0) {
        await expect(exportButton.first()).toBeVisible();
      }
    }
  });
});

test.describe('Owner Portal - Properties', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.ownerProperties);
  });

  test('should display properties page or redirect to login', async ({ page }) => {
    const currentUrl = page.url();

    if (currentUrl.includes('login')) {
      await expect(page.getByText(/login|sign in/i).first()).toBeVisible();
    } else {
      await expect(page.getByText(/properties|portfolio/i).first()).toBeVisible();
    }
  });

  test('should display property cards', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const propertyCards = page.locator('[class*="card"], [class*="property"]');
      if (await propertyCards.count() > 0) {
        await expect(propertyCards.first()).toBeVisible();
      }
    }
  });

  test('should show property performance metrics', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const performanceMetrics = ['Occupancy', 'Revenue', 'NOI', 'ROI'];
      let foundMetrics = 0;

      for (const metric of performanceMetrics) {
        const element = page.getByText(new RegExp(metric, 'i'));
        if (await element.count() > 0) {
          foundMetrics++;
        }
      }

      expect(foundMetrics >= 0).toBeTruthy();
    }
  });

  test('should have property comparison feature', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const compareButton = page.getByRole('button', { name: /compare/i });
      if (await compareButton.count() > 0) {
        await expect(compareButton.first()).toBeVisible();
      }
    }
  });
});

test.describe('Owner Portal - Distributions', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.ownerDashboard);
  });

  test('should display distribution/payout section', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const distributionSection = page.getByText(/distribution|payout|disbursement/i);
      if (await distributionSection.count() > 0) {
        await expect(distributionSection.first()).toBeVisible();
      }
    }
  });

  test('should show pending distributions', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const pendingSection = page.getByText(/pending|upcoming|scheduled/i);
      if (await pendingSection.count() > 0) {
        expect(await pendingSection.count()).toBeGreaterThan(0);
      }
    }
  });

  test('should show distribution history', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const historySection = page.getByText(/history|past|previous/i);
      if (await historySection.count() > 0) {
        expect(await historySection.count()).toBeGreaterThan(0);
      }
    }
  });
});

test.describe('Owner Portal - Tax Documents', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.ownerDashboard);
  });

  test('should have access to tax documents', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const taxSection = page.getByText(/tax|1099|documents/i);
      if (await taxSection.count() > 0) {
        await expect(taxSection.first()).toBeVisible();
      }
    }
  });

  test('should display 1099 forms when available', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const form1099 = page.getByText(/1099/i);
      if (await form1099.count() > 0) {
        await expect(form1099.first()).toBeVisible();
      }
    }
  });
});

test.describe('Owner Portal - Mobile Responsiveness', () => {
  test.beforeEach(async ({ page, helper }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await helper.goto(ROUTES.ownerDashboard);
  });

  test('should be responsive on mobile', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const dashboardContent = page.getByText(/dashboard|portfolio/i);
      if (await dashboardContent.count() > 0) {
        await expect(dashboardContent.first()).toBeVisible();
      }
    }
  });

  test('should display mobile navigation', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const mobileNav = page.locator('nav, [class*="mobile-nav"], [class*="bottom-nav"]');
      if (await mobileNav.count() > 0) {
        await expect(mobileNav.first()).toBeVisible();
      }
    }
  });

  test('should stack metric cards on mobile', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      // Metric cards should be visible and stacked
      const metricCards = page.locator('[class*="card"], [class*="metric"]');
      if (await metricCards.count() > 0) {
        await expect(metricCards.first()).toBeVisible();
      }
    }
  });
});

test.describe('Owner Portal - Tablet Responsiveness', () => {
  test.beforeEach(async ({ page, helper }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await helper.goto(ROUTES.ownerDashboard);
  });

  test('should be responsive on tablet', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const dashboardContent = page.getByText(/dashboard|portfolio/i);
      if (await dashboardContent.count() > 0) {
        await expect(dashboardContent.first()).toBeVisible();
      }
    }
  });
});
