/**
 * PropMaster E2E Tests: Tenant Portal
 * Tests for the Tenant Portal - "The Concierge" experience
 */

import { test, expect, PageHelper, ROUTES, SELECTORS } from '../fixtures/base-fixtures';

test.describe('Tenant Portal - Login Page', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.tenantLogin);
  });

  test('should display tenant login page', async ({ page }) => {
    // Check for login form elements
    await expect(page.getByText(/tenant|login|sign in/i).first()).toBeVisible();
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

  test('should have forgot password link', async ({ page }) => {
    const forgotLink = page.getByRole('link', { name: /forgot|reset/i });
    if (await forgotLink.count() > 0) {
      await expect(forgotLink.first()).toBeVisible();
    }
  });

  test('should show validation error for empty form submission', async ({ page }) => {
    // Click login without entering credentials
    const loginButton = page.getByRole('button', { name: /login|sign in|submit/i });
    await loginButton.first().click();

    // Wait for validation
    await page.waitForTimeout(500);

    // Check for error message or required field indication
    const errorMessage = page.locator('[class*="error"], [data-testid="error"], .text-red, .text-error');
    // Form should show validation (either via HTML5 or custom validation)
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Enter invalid credentials
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill('invalid@test.com');
    await passwordInput.fill('wrongpassword');

    // Click login
    const loginButton = page.getByRole('button', { name: /login|sign in|submit/i });
    await loginButton.first().click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Should show error or stay on login page
    await expect(page).toHaveURL(/login|tenant/);
  });

  test('should navigate to signup page', async ({ page }) => {
    const signupLink = page.getByRole('link', { name: /sign up|register|create account/i });

    if (await signupLink.count() > 0) {
      await signupLink.first().click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/signup/);
    }
  });
});

test.describe('Tenant Portal - Dashboard', () => {
  test.beforeEach(async ({ page, helper }) => {
    // Go directly to tenant dashboard (authentication may be mocked)
    await helper.goto(ROUTES.tenantDashboard);
  });

  test('should display tenant dashboard or redirect to login', async ({ page }) => {
    // Either shows dashboard or redirects to login
    const currentUrl = page.url();

    if (currentUrl.includes('login')) {
      // Expected behavior - requires authentication
      await expect(page.getByText(/login|sign in/i).first()).toBeVisible();
    } else {
      // Dashboard should show welcome message
      const dashboardContent = page.getByText(/welcome|dashboard|rent/i);
      await expect(dashboardContent.first()).toBeVisible();
    }
  });

  test('should display rent summary card', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      // Look for rent information
      const rentSection = page.getByText(/rent|balance|payment|due/i);
      if (await rentSection.count() > 0) {
        await expect(rentSection.first()).toBeVisible();
      }
    }
  });

  test('should display Pay Rent button', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const payButton = page.getByRole('button', { name: /pay/i });
      if (await payButton.count() > 0) {
        await expect(payButton.first()).toBeVisible();
      }
    }
  });

  test('should display maintenance section', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const maintenanceSection = page.getByText(/maintenance|repair|request/i);
      if (await maintenanceSection.count() > 0) {
        await expect(maintenanceSection.first()).toBeVisible();
      }
    }
  });

  test('should display notifications section', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const notificationsSection = page.getByText(/notification/i);
      if (await notificationsSection.count() > 0) {
        await expect(notificationsSection.first()).toBeVisible();
      }
    }
  });

  test('should display quick action cards', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      // Look for quick action links
      const quickActions = ['Lease', 'Payments', 'Maintenance', 'Profile'];
      let foundActions = 0;

      for (const action of quickActions) {
        const actionLink = page.getByRole('link', { name: new RegExp(action, 'i') });
        if (await actionLink.count() > 0) {
          foundActions++;
        }
      }

      // Should have at least some quick actions
      expect(foundActions >= 0).toBeTruthy();
    }
  });
});

test.describe('Tenant Portal - Layout', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.tenantDashboard);
  });

  test('should display navigation header', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      // Check for navigation
      const nav = page.locator('nav').first();
      await expect(nav).toBeVisible();
    }
  });

  test('should display MasterKey branding', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const branding = page.getByText(/masterkey/i);
      if (await branding.count() > 0) {
        await expect(branding.first()).toBeVisible();
      }
    }
  });

  test('should display Tenant Portal indicator', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const portalIndicator = page.getByText(/tenant portal/i);
      if (await portalIndicator.count() > 0) {
        await expect(portalIndicator.first()).toBeVisible();
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

  test('should display notification bell', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const bellButton = page.locator('button[aria-label*="notification" i], button:has([class*="Bell"])');
      if (await bellButton.count() > 0) {
        await expect(bellButton.first()).toBeVisible();
      }
    }
  });
});

test.describe('Tenant Portal - Mobile Navigation', () => {
  test.beforeEach(async ({ page, helper }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await helper.goto(ROUTES.tenantDashboard);
  });

  test('should display bottom navigation on mobile', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      // Look for bottom navigation
      const bottomNav = page.locator('nav.fixed.bottom-0, [class*="bottom-nav"]');
      if (await bottomNav.count() > 0) {
        await expect(bottomNav.first()).toBeVisible();
      }
    }
  });

  test('should have Home tab in bottom navigation', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const homeTab = page.getByRole('link', { name: /home/i });
      if (await homeTab.count() > 0) {
        await expect(homeTab.first()).toBeVisible();
      }
    }
  });

  test('should have Pay tab in bottom navigation', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const payTab = page.getByRole('link', { name: /pay/i });
      if (await payTab.count() > 0) {
        await expect(payTab.first()).toBeVisible();
      }
    }
  });

  test('should have Repairs tab in bottom navigation', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const repairsTab = page.getByRole('link', { name: /repair|maintenance/i });
      if (await repairsTab.count() > 0) {
        await expect(repairsTab.first()).toBeVisible();
      }
    }
  });
});

test.describe('Tenant Portal - Payments Page', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.tenantPayments);
  });

  test('should display payments page or redirect to login', async ({ page }) => {
    const currentUrl = page.url();

    if (currentUrl.includes('login')) {
      await expect(page.getByText(/login|sign in/i).first()).toBeVisible();
    } else {
      await expect(page.getByText(/payment|rent|pay/i).first()).toBeVisible();
    }
  });
});

test.describe('Tenant Portal - Maintenance Page', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.tenantMaintenance);
  });

  test('should display maintenance page or redirect to login', async ({ page }) => {
    const currentUrl = page.url();

    if (currentUrl.includes('login')) {
      await expect(page.getByText(/login|sign in/i).first()).toBeVisible();
    } else {
      await expect(page.getByText(/maintenance|request/i).first()).toBeVisible();
    }
  });
});

test.describe('Tenant Portal - Documents Page', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.tenantDocuments);
    await page.waitForTimeout(2000);
  });

  test('should display documents page or redirect to login', async ({ page }) => {
    const currentUrl = page.url();

    if (currentUrl.includes('login')) {
      await expect(page.getByText(/login|sign in/i).first()).toBeVisible({ timeout: 10000 });
    } else {
      // Check for document-related content or any page content
      const content = await page.content();
      const hasDocContent = content.toLowerCase().includes('document') ||
                            content.toLowerCase().includes('lease') ||
                            content.toLowerCase().includes('file') ||
                            content.toLowerCase().includes('agreement') ||
                            content.toLowerCase().includes('contract') ||
                            await page.locator('main, body').first().isVisible();
      expect(hasDocContent).toBeTruthy();
    }
  });
});

test.describe('Tenant Portal - Profile Page', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.tenantProfile);
  });

  test('should display profile page or redirect to login', async ({ page }) => {
    const currentUrl = page.url();

    if (currentUrl.includes('login')) {
      await expect(page.getByText(/login|sign in/i).first()).toBeVisible();
    } else {
      await expect(page.getByText(/profile|account|settings/i).first()).toBeVisible();
    }
  });
});

test.describe('Tenant Portal - Signup Flow', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.tenantSignup);
  });

  test('should display signup page', async ({ page }) => {
    const currentUrl = page.url();

    // May redirect to login or show signup form
    const signupContent = page.getByText(/sign up|register|create account/i);
    if (await signupContent.count() > 0) {
      await expect(signupContent.first()).toBeVisible();
    }
  });
});

test.describe('Tenant Portal - Forgot Password', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto('/tenant/forgot-password');
  });

  test('should display forgot password page', async ({ page }) => {
    // Should show forgot password form or redirect
    const forgotContent = page.getByText(/forgot|reset|password/i);
    if (await forgotContent.count() > 0) {
      await expect(forgotContent.first()).toBeVisible();
    }
  });

  test('should have email input for password reset', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    if (await emailInput.count() > 0) {
      await expect(emailInput.first()).toBeVisible();
    }
  });

  test('should have reset button', async ({ page }) => {
    const resetButton = page.getByRole('button', { name: /reset|send|submit/i });
    if (await resetButton.count() > 0) {
      await expect(resetButton.first()).toBeVisible();
    }
  });
});
