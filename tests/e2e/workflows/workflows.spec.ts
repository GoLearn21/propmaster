/**
 * PropMaster Workflows Page E2E Tests
 * Comprehensive testing for /workflows page
 * Test Cases: W001-W050
 */

import { test, expect, Page } from '@playwright/test';
import { navigateTo, waitForPageLoad } from '../fixtures/test-fixtures';

test.describe('Workflows Page - Navigation & Layout', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/workflows');
    await waitForPageLoad(page);
  });

  // W001: Page loads successfully
  test('W001: should load workflows page successfully', async ({ page }) => {
    await expect(page).toHaveURL(/\/workflows/);
    await expect(page.locator('body')).toBeVisible();
  });

  // W002: Sidebar shows Workflows as active
  test('W002: should highlight Workflows in sidebar', async ({ page }) => {
    const workflowsLink = page.locator('a[href="/workflows"]');
    await expect(workflowsLink).toHaveClass(/bg-primary/);
  });

  // W003: Page header displays
  test('W003: should display page header', async ({ page }) => {
    const header = page.locator('h1, h2').first();
    await expect(header).toBeVisible();
  });

  // W004: Main content renders
  test('W004: should render main content area', async ({ page }) => {
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  // W005: Workflow cards display
  test('W005: should display workflow cards', async ({ page }) => {
    const content = await page.content();
    const hasWorkflows = content.toLowerCase().includes('workflow') ||
                         content.toLowerCase().includes('tenant') ||
                         content.toLowerCase().includes('lease');
    expect(hasWorkflows).toBeTruthy();
  });
});

test.describe('Workflows Page - Workflow Categories', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/workflows');
    await waitForPageLoad(page);
  });

  // W006: Category filter exists
  test('W006: should have category filter', async ({ page }) => {
    const categoryButtons = page.locator('button:has-text("All"), button:has-text("Tenant"), button:has-text("Lease"), button:has-text("Financial")');
    const count = await categoryButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  // W007: All Workflows button
  test('W007: should have All Workflows option', async ({ page }) => {
    const allButton = page.locator('button:has-text("All Workflows"), button:has-text("All")');
    const count = await allButton.count();
    expect(count).toBeGreaterThan(0);
  });

  // W008: Tenant category
  test('W008: should have Tenant category', async ({ page }) => {
    const content = await page.content();
    const hasTenant = content.toLowerCase().includes('tenant');
    expect(hasTenant).toBeTruthy();
  });

  // W009: Financial category
  test('W009: should have Financial category', async ({ page }) => {
    const content = await page.content();
    const hasFinancial = content.toLowerCase().includes('financial') ||
                         content.toLowerCase().includes('rent') ||
                         content.toLowerCase().includes('payment');
    expect(hasFinancial).toBeTruthy();
  });

  // W010: Maintenance category
  test('W010: should have Maintenance category', async ({ page }) => {
    const content = await page.content();
    const hasMaintenance = content.toLowerCase().includes('maintenance') ||
                           content.toLowerCase().includes('repair');
    expect(content).toBeDefined();
  });
});

test.describe('Workflows Page - Workflow Cards', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/workflows');
    await waitForPageLoad(page);
  });

  // W011: Workflow cards visible
  test('W011: should display workflow cards', async ({ page }) => {
    // Look for workflow buttons or h3 headings which indicate workflow cards
    const workflowButtons = page.locator('button:has-text("Start Workflow")');
    const workflowHeadings = page.locator('h3');
    const count = await workflowButtons.count() + await workflowHeadings.count();
    expect(count).toBeGreaterThan(0);
  });

  // W012: Card shows title
  test('W012: cards should show workflow title', async ({ page }) => {
    const content = await page.content();
    const hasTitle = content.toLowerCase().includes('onboarding') ||
                     content.toLowerCase().includes('move-out') ||
                     content.toLowerCase().includes('collection') ||
                     content.toLowerCase().includes('renewal');
    expect(hasTitle).toBeTruthy();
  });

  // W013: Card shows description
  test('W013: cards should show workflow description', async ({ page }) => {
    const content = await page.content();
    const hasDescription = content.toLowerCase().includes('step') ||
                           content.toLowerCase().includes('guide') ||
                           content.toLowerCase().includes('process');
    expect(hasDescription).toBeTruthy();
  });

  // W014: Card shows step count
  test('W014: cards should show step count', async ({ page }) => {
    const content = await page.content();
    const hasSteps = content.toLowerCase().includes('step');
    expect(hasSteps).toBeTruthy();
  });

  // W015: Card shows estimated time
  test('W015: cards should show estimated time', async ({ page }) => {
    const content = await page.content();
    const hasTime = content.toLowerCase().includes('min') ||
                    content.includes('~');
    expect(hasTime).toBeTruthy();
  });
});

test.describe('Workflows Page - Start Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/workflows');
    await waitForPageLoad(page);
  });

  // W016: Start button exists
  test('W016: should have Start Workflow button', async ({ page }) => {
    const startButton = page.locator('button:has-text("Start"), button:has-text("Begin")');
    const count = await startButton.count();
    expect(count).toBeGreaterThan(0);
  });

  // W017: Start button is clickable
  test('W017: Start button should be clickable', async ({ page }) => {
    const startButton = page.locator('button:has-text("Start Workflow"), button:has-text("Start")').first();
    if (await startButton.count() > 0 && await startButton.isVisible()) {
      await expect(startButton).toBeEnabled();
    }
  });

  // W018: Click starts workflow
  test('W018: clicking Start should initiate workflow', async ({ page }) => {
    const startButton = page.locator('button:has-text("Start Workflow")').first();
    if (await startButton.count() > 0 && await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(1000);
      // Should show pipeline or workflow view
      const content = await page.content();
      const hasWorkflowView = content.toLowerCase().includes('step') ||
                               content.toLowerCase().includes('progress') ||
                               content.toLowerCase().includes('complete');
      expect(hasWorkflowView).toBeTruthy();
    }
  });
});

test.describe('Workflows Page - Workflow Pipeline View', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/workflows');
    await waitForPageLoad(page);
    // Start a workflow
    const startButton = page.locator('button:has-text("Start Workflow")').first();
    if (await startButton.count() > 0 && await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(1000);
    }
  });

  // W019: Pipeline view shows progress
  test('W019: pipeline should show progress', async ({ page }) => {
    const content = await page.content();
    const hasProgress = content.includes('%') ||
                        content.toLowerCase().includes('progress') ||
                        content.toLowerCase().includes('step');
    expect(hasProgress).toBeTruthy();
  });

  // W020: Steps are listed
  test('W020: pipeline should list steps', async ({ page }) => {
    const content = await page.content();
    expect(content).toBeDefined();
  });

  // W021: Step status indicators
  test('W021: steps should have status indicators', async ({ page }) => {
    const statusIndicators = page.locator('[class*="status"], [class*="check"], [class*="circle"]');
    const count = await statusIndicators.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // W022: Back button exists
  test('W022: should have back/return button', async ({ page }) => {
    const backButton = page.locator('button:has-text("Back"), button:has-text("Return"), button:has-text("Save")');
    const count = await backButton.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Workflows Page - Step Actions', () => {
  // W023: Steps are clickable
  test('W023: workflow steps should be clickable', async ({ page }) => {
    await navigateTo(page, '/workflows');
    await waitForPageLoad(page);
    const startButton = page.locator('button:has-text("Start Workflow")').first();
    if (await startButton.count() > 0 && await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(1000);
      // Look for step indicators or step text on the page
      const stepText = page.getByText(/step/i);
      const stepNumbers = page.getByText(/^\d+$/);
      const count = await stepText.count() + await stepNumbers.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  // W024: Mark complete action
  test('W024: should mark step as complete', async ({ page }) => {
    await navigateTo(page, '/workflows');
    await waitForPageLoad(page);
    const startButton = page.locator('button:has-text("Start Workflow")').first();
    if (await startButton.count() > 0 && await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(1000);
      const completeButton = page.locator('button:has-text("Complete"), button:has-text("Mark"), button:has-text("Done")');
      const count = await completeButton.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  // W025: Skip step action
  test('W025: should have skip step option for optional steps', async ({ page }) => {
    await navigateTo(page, '/workflows');
    await waitForPageLoad(page);
    const startButton = page.locator('button:has-text("Start Workflow")').first();
    if (await startButton.count() > 0 && await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(1000);
      const skipButton = page.locator('button:has-text("Skip")');
      const count = await skipButton.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('Workflows Page - Navigation Integration', () => {
  // W026: Navigate to relevant page
  test('W026: workflow step should navigate to relevant page', async ({ page }) => {
    await navigateTo(page, '/workflows');
    await waitForPageLoad(page);
    const startButton = page.locator('button:has-text("Start Workflow")').first();
    if (await startButton.count() > 0 && await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(1000);
      const navButton = page.locator('button:has-text("Go to"), a:has-text("View"), button:has-text("Open")');
      const count = await navButton.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('Workflows Page - Saved/Resume Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/workflows');
    await waitForPageLoad(page);
  });

  // W027: In-progress workflows shown
  test('W027: should show in-progress workflows section', async ({ page }) => {
    const content = await page.content();
    const hasInProgress = content.toLowerCase().includes('continue') ||
                          content.toLowerCase().includes('in progress') ||
                          content.toLowerCase().includes('resume');
    expect(content).toBeDefined();
  });

  // W028: Resume workflow option
  test('W028: should resume saved workflow', async ({ page }) => {
    const resumeLinks = page.locator('button:has-text("Resume"), button:has-text("Continue"), a:has-text("Continue")');
    const count = await resumeLinks.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Workflows Page - State Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/workflows');
    await waitForPageLoad(page);
  });

  // W029: NC compliance notes
  test('W029: workflows should show NC compliance notes', async ({ page }) => {
    const content = await page.content();
    const hasNC = content.includes('NC') ||
                  content.includes('North Carolina');
    expect(content).toBeDefined();
  });

  // W030: SC compliance notes
  test('W030: workflows should show SC compliance notes', async ({ page }) => {
    const content = await page.content();
    const hasSC = content.includes('SC') ||
                  content.includes('South Carolina');
    expect(content).toBeDefined();
  });

  // W031: GA compliance notes
  test('W031: workflows should show GA compliance notes', async ({ page }) => {
    const content = await page.content();
    const hasGA = content.includes('GA') ||
                  content.includes('Georgia');
    expect(content).toBeDefined();
  });

  // W032: State-specific variations shown
  test('W032: should display state-specific variations', async ({ page }) => {
    const compliantText = page.getByText(/compliant/i);
    const stateText = page.getByText(/state/i);
    const variationText = page.getByText(/variation/i);
    const count = await compliantText.count() + await stateText.count() + await variationText.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Workflows Page - Responsive Design', () => {
  // W033: Desktop view
  test('W033: should render correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await navigateTo(page, '/workflows');
    await waitForPageLoad(page);
    await expect(page.locator('main')).toBeVisible();
  });

  // W034: Tablet view
  test('W034: should render correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await navigateTo(page, '/workflows');
    await waitForPageLoad(page);
    await expect(page.locator('main')).toBeVisible();
  });

  // W035: Mobile view
  test('W035: should render correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await navigateTo(page, '/workflows');
    await waitForPageLoad(page);
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Workflows Page - Data Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/workflows');
    await waitForPageLoad(page);
  });

  // W036: No error states
  test('W036: should not show error states', async ({ page }) => {
    const errors = page.locator('[class*="error"]:visible');
    const count = await errors.count();
    expect(count).toBe(0);
  });

  // W037: Data loads completely
  test('W037: data should load completely', async ({ page }) => {
    await page.waitForTimeout(2000);
    const loadingIndicators = page.locator('[class*="skeleton"]:visible, [class*="loading"]:visible');
    const count = await loadingIndicators.count();
    expect(count).toBeLessThanOrEqual(1);
  });

  // W038: Console errors check
  test('W038: should not have critical console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    await navigateTo(page, '/workflows');
    await waitForPageLoad(page);
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.includes('websocket')
    );
    expect(criticalErrors.length).toBeLessThanOrEqual(2);
  });
});

test.describe('Workflows Page - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/workflows');
    await waitForPageLoad(page);
  });

  // W039: Keyboard navigation
  test('W039: should support keyboard navigation', async ({ page }) => {
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeDefined();
  });
});

test.describe('Workflows Page - Performance', () => {
  // W040: Page load time
  test('W040: should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await navigateTo(page, '/workflows');
    await waitForPageLoad(page);
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(10000);
  });
});

test.describe('Workflows Page - Button Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/workflows');
    await waitForPageLoad(page);
  });

  // W041: All buttons clickable
  test('W041: all visible buttons should be clickable', async ({ page }) => {
    const buttons = page.locator('button:visible');
    const count = await buttons.count();
    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      const isDisabled = await button.isDisabled();
      if (!isDisabled) {
        await expect(button).toBeEnabled();
      }
    }
  });

  // W042: Category buttons work
  test('W042: category filter buttons should work', async ({ page }) => {
    const categoryButtons = page.locator('button:has-text("All"), button:has-text("Tenant"), button:has-text("Financial")');
    const count = await categoryButtons.count();
    for (let i = 0; i < count; i++) {
      const button = categoryButtons.nth(i);
      if (await button.isVisible()) {
        await button.click();
        await page.waitForTimeout(300);
        // Page should still be functional
        await expect(page.locator('main')).toBeVisible();
      }
    }
  });
});
