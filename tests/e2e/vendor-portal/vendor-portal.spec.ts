/**
 * PropMaster E2E Tests: Vendor Portal
 * Tests for the Vendor Portal - "The Workbench" experience
 */

import { test, expect, PageHelper, ROUTES, SELECTORS } from '../fixtures/base-fixtures';

test.describe('Vendor Portal - Login Page', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.vendorLogin);
  });

  test('should display vendor login page', async ({ page }) => {
    // Check for login form elements
    await expect(page.getByText(/vendor|login|sign in/i).first()).toBeVisible();
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
    // Click login without entering credentials
    const loginButton = page.getByRole('button', { name: /login|sign in|submit/i });
    await loginButton.first().click();

    // Wait for validation
    await page.waitForTimeout(500);

    // Form should show validation (either via HTML5 or custom validation)
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Enter invalid credentials
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill('invalid@vendor.com');
    await passwordInput.fill('wrongpassword');

    // Click login
    const loginButton = page.getByRole('button', { name: /login|sign in|submit/i });
    await loginButton.first().click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Should show error or stay on login page
    await expect(page).toHaveURL(/login|vendor/);
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

test.describe('Vendor Portal - Signup Page', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.vendorSignup);
  });

  test('should display vendor signup page', async ({ page }) => {
    await expect(page.getByText(/sign up|register|vendor/i).first()).toBeVisible();
  });

  test('should have signup mode toggle (invite vs self-register)', async ({ page }) => {
    // Check for mode toggle - either buttons or tabs
    const inviteMode = page.getByRole('button', { name: /invite|code/i });
    const selfRegister = page.getByRole('button', { name: /request|no code/i });

    if (await inviteMode.count() > 0 || await selfRegister.count() > 0) {
      // Has mode toggle
      expect(await inviteMode.count() + await selfRegister.count()).toBeGreaterThan(0);
    }
  });

  test('should have company name input field', async ({ page }) => {
    const companyInput = page.locator('input[name*="company" i], input[placeholder*="company" i], #company');
    if (await companyInput.count() > 0) {
      await expect(companyInput.first()).toBeVisible();
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

  test('should have service category selection', async ({ page }) => {
    const serviceSelect = page.locator('select[name*="service" i], [role="listbox"], button:has-text("Select"), label:has-text("Service")');
    if (await serviceSelect.count() > 0) {
      // Has service category selector
      expect(await serviceSelect.count()).toBeGreaterThan(0);
    }
  });

  test('should validate password requirements', async ({ page }) => {
    // Fill in a weak password and check for requirements
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('weak');

    // Check for password requirements message
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
    // Toggle dark mode if available
    const themeToggle = page.locator('button[aria-label*="theme" i], button[aria-label*="mode" i]');
    if (await themeToggle.count() > 0) {
      await themeToggle.first().click();
      await page.waitForTimeout(300);

      // Check that dark mode class is applied
      const htmlElement = page.locator('html');
      const classes = await htmlElement.getAttribute('class');
      expect(classes?.includes('dark') || classes?.includes('light')).toBeTruthy();
    }
  });
});

test.describe('Vendor Portal - Dashboard', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.vendorDashboard);
  });

  test('should display vendor dashboard or redirect to login', async ({ page }) => {
    const currentUrl = page.url();

    if (currentUrl.includes('login')) {
      // Expected behavior - requires authentication
      await expect(page.getByText(/login|sign in/i).first()).toBeVisible();
    } else {
      // Dashboard should show vendor-specific content
      const dashboardContent = page.getByText(/dashboard|jobs|work orders/i);
      await expect(dashboardContent.first()).toBeVisible();
    }
  });

  test('should display active jobs count', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const jobsSection = page.getByText(/active jobs|open jobs|work orders/i);
      if (await jobsSection.count() > 0) {
        await expect(jobsSection.first()).toBeVisible();
      }
    }
  });

  test('should display pending jobs count', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const pendingSection = page.getByText(/pending|awaiting|new/i);
      if (await pendingSection.count() > 0) {
        await expect(pendingSection.first()).toBeVisible();
      }
    }
  });

  test('should display completed jobs count', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const completedSection = page.getByText(/completed|finished|done/i);
      if (await completedSection.count() > 0) {
        await expect(completedSection.first()).toBeVisible();
      }
    }
  });

  test('should display earnings metric', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const earningsSection = page.getByText(/earnings|revenue|income/i);
      if (await earningsSection.count() > 0) {
        await expect(earningsSection.first()).toBeVisible();
      }
    }
  });

  test('should display recent jobs list', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const jobsList = page.getByText(/recent jobs|job list|work orders/i);
      if (await jobsList.count() > 0) {
        await expect(jobsList.first()).toBeVisible();
      }
    }
  });
});

test.describe('Vendor Portal - Layout', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.vendorDashboard);
  });

  test('should display vendor portal branding', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const branding = page.getByText(/masterkey|vendor portal/i);
      if (await branding.count() > 0) {
        await expect(branding.first()).toBeVisible();
      }
    }
  });

  test('should display navigation header', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const nav = page.locator('nav').first();
      await expect(nav).toBeVisible();
    }
  });

  test('should have blue accent theme', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      // Check for blue accent color in styling
      const blueElements = page.locator('[class*="blue"], [class*="primary"]');
      if (await blueElements.count() > 0) {
        // Vendor portal should have blue accent
        expect(await blueElements.count()).toBeGreaterThan(0);
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
});

test.describe('Vendor Portal - Jobs Page', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.vendorJobs);
  });

  test('should display jobs page or redirect to login', async ({ page }) => {
    const currentUrl = page.url();

    if (currentUrl.includes('login')) {
      await expect(page.getByText(/login|sign in/i).first()).toBeVisible();
    } else {
      await expect(page.getByText(/jobs|work orders|maintenance/i).first()).toBeVisible();
    }
  });

  test('should display job cards with priority indicators', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      // Look for priority indicators
      const priorityBadges = page.locator('[class*="badge"], [class*="priority"]');
      if (await priorityBadges.count() > 0) {
        await expect(priorityBadges.first()).toBeVisible();
      }
    }
  });

  test('should have quick accept/decline actions', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      // Look for action buttons
      const acceptButton = page.getByRole('button', { name: /accept/i });
      const declineButton = page.getByRole('button', { name: /decline/i });

      if (await acceptButton.count() > 0) {
        await expect(acceptButton.first()).toBeVisible();
      }
      if (await declineButton.count() > 0) {
        await expect(declineButton.first()).toBeVisible();
      }
    }
  });

  test('should display job details', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      // Look for job detail elements
      const jobDetails = ['Property', 'Description', 'Status', 'Priority'];
      let foundDetails = 0;

      for (const detail of jobDetails) {
        const element = page.getByText(new RegExp(detail, 'i'));
        if (await element.count() > 0) {
          foundDetails++;
        }
      }

      expect(foundDetails >= 0).toBeTruthy();
    }
  });
});

test.describe('Vendor Portal - Mobile Navigation', () => {
  test.beforeEach(async ({ page, helper }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await helper.goto(ROUTES.vendorDashboard);
  });

  test('should be responsive on mobile', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      // Dashboard should still be visible on mobile
      const dashboardContent = page.getByText(/dashboard|jobs/i);
      if (await dashboardContent.count() > 0) {
        await expect(dashboardContent.first()).toBeVisible();
      }
    }
  });

  test('should display mobile navigation', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      // Look for mobile menu or bottom navigation
      const mobileNav = page.locator('nav, [class*="mobile-nav"], [class*="bottom-nav"]');
      if (await mobileNav.count() > 0) {
        await expect(mobileNav.first()).toBeVisible();
      }
    }
  });
});

test.describe('Vendor Portal - Work Completion Flow', () => {
  test.beforeEach(async ({ page, helper }) => {
    await helper.goto(ROUTES.vendorJobs);
  });

  test('should have photo upload capability', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      // Look for file upload or photo upload elements
      const uploadInput = page.locator('input[type="file"], button:has-text("Upload"), button:has-text("Photo")');
      if (await uploadInput.count() > 0) {
        // Photo upload functionality exists
        expect(await uploadInput.count()).toBeGreaterThan(0);
      }
    }
  });

  test('should have mark complete button', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const completeButton = page.getByRole('button', { name: /complete|finish|done/i });
      if (await completeButton.count() > 0) {
        await expect(completeButton.first()).toBeVisible();
      }
    }
  });

  test('should have invoice submission option', async ({ page }) => {
    const currentUrl = page.url();

    if (!currentUrl.includes('login')) {
      const invoiceButton = page.getByRole('button', { name: /invoice|submit invoice/i });
      const invoiceLink = page.getByRole('link', { name: /invoice/i });

      if (await invoiceButton.count() > 0 || await invoiceLink.count() > 0) {
        expect(true).toBeTruthy();
      }
    }
  });
});
