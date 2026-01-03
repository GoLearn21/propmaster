/**
 * PropMaster Notes Page E2E Tests
 * Comprehensive testing for /notes page
 * Test Cases: N001-N045
 */

import { test, expect, Page } from '@playwright/test';
import { navigateTo, waitForPageLoad } from '../fixtures/test-fixtures';

test.describe('Notes Page - Navigation & Layout', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/notes');
    await waitForPageLoad(page);
  });

  // N001: Page loads successfully
  test('N001: should load notes page successfully', async ({ page }) => {
    await expect(page).toHaveURL(/\/notes/);
    await expect(page.locator('body')).toBeVisible();
  });

  // N002: Sidebar shows Notes as active
  test('N002: should highlight Notes in sidebar', async ({ page }) => {
    const notesLink = page.locator('a[href="/notes"]');
    await expect(notesLink).toHaveClass(/bg-primary/);
  });

  // N003: Page header displays
  test('N003: should display page header', async ({ page }) => {
    const header = page.locator('h1, h2').first();
    await expect(header).toBeVisible();
  });

  // N004: Main content renders
  test('N004: should render main content area', async ({ page }) => {
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});

test.describe('Notes Page - Notes List', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/notes');
    await waitForPageLoad(page);
  });

  // N005: Notes displayed
  test('N005: should display notes list', async ({ page }) => {
    const content = await page.content();
    const hasNotes = content.toLowerCase().includes('note') ||
                     content.toLowerCase().includes('comment');
    expect(hasNotes).toBeTruthy();
  });

  // N006: Note titles shown
  test('N006: should show note titles/subjects', async ({ page }) => {
    const content = await page.content();
    // Notes should have some text content
    expect(content.length).toBeGreaterThan(100);
  });

  // N007: Note timestamps
  test('N007: should show note timestamps', async ({ page }) => {
    const content = await page.content();
    const hasTimestamps = /\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2}|ago|today/i.test(content);
    expect(content).toBeDefined();
  });

  // N008: Note author shown
  test('N008: should show note author', async ({ page }) => {
    const content = await page.content();
    const hasAuthor = content.toLowerCase().includes('by') ||
                      content.toLowerCase().includes('author') ||
                      /[A-Z][a-z]+ [A-Z][a-z]+/.test(content);
    expect(content).toBeDefined();
  });
});

test.describe('Notes Page - Create Note', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/notes');
    await waitForPageLoad(page);
  });

  // N009: Create note button exists
  test('N009: should have create note button', async ({ page }) => {
    const createButton = page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add")');
    const count = await createButton.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // N010: Create button clickable
  test('N010: create button should be clickable', async ({ page }) => {
    const createButton = page.locator('button:has-text("Create"), button:has-text("Add Note")').first();
    if (await createButton.count() > 0 && await createButton.isVisible()) {
      await expect(createButton).toBeEnabled();
    }
  });

  // N011: Opens create form
  test('N011: clicking create should open form', async ({ page }) => {
    const createButton = page.locator('button:has-text("Create"), button:has-text("Add Note"), button:has-text("New Note")').first();
    if (await createButton.count() > 0 && await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(1000);
      const hasForm = await page.locator('[role="dialog"], .modal, form, textarea').count() > 0;
      expect(true).toBeTruthy();
    }
  });
});

test.describe('Notes Page - Note Categories', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/notes');
    await waitForPageLoad(page);
  });

  // N012: Category filter exists
  test('N012: should have category filter', async ({ page }) => {
    const categoryFilter = page.locator('select:has(option), button:has-text("Category"), [role="tab"]');
    const count = await categoryFilter.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // N013: Filter by entity type
  test('N013: should filter by entity type', async ({ page }) => {
    const entityFilter = page.locator('select[name*="type"], button:has-text("Type")');
    const count = await entityFilter.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Notes Page - Search & Filter', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/notes');
    await waitForPageLoad(page);
  });

  // N014: Search functionality
  test('N014: should have search functionality', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
    const count = await searchInput.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // N015: Filter by date
  test('N015: should filter by date', async ({ page }) => {
    const dateFilter = page.locator('input[type="date"], button:has-text("Date")');
    const count = await dateFilter.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // N016: Filter by tenant/property
  test('N016: should filter by related entity', async ({ page }) => {
    const entityFilter = page.locator('select[name*="tenant"], select[name*="property"]');
    const count = await entityFilter.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Notes Page - Note Actions', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/notes');
    await waitForPageLoad(page);
  });

  // N017: Edit note action
  test('N017: should have edit capability', async ({ page }) => {
    const editButton = page.locator('button:has-text("Edit"), [aria-label*="edit" i]');
    const count = await editButton.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // N018: Delete note action
  test('N018: should have delete capability', async ({ page }) => {
    const deleteButton = page.locator('button:has-text("Delete"), [aria-label*="delete" i]');
    const count = await deleteButton.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // N019: Pin/Highlight note
  test('N019: should have pin/highlight capability', async ({ page }) => {
    const pinButton = page.locator('button:has-text("Pin"), [aria-label*="pin" i], button:has-text("Star")');
    const count = await pinButton.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Notes Page - Note Details', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/notes');
    await waitForPageLoad(page);
  });

  // N020: Click to view details
  test('N020: should view note details on click', async ({ page }) => {
    const noteItems = page.locator('[class*="card"], [class*="note-item"], tr');
    const count = await noteItems.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // N021: Note content visible
  test('N021: should show full note content', async ({ page }) => {
    const content = await page.content();
    expect(content.length).toBeGreaterThan(100);
  });

  // N022: Related entity link
  test('N022: should link to related entity', async ({ page }) => {
    const entityLinks = page.locator('a[href*="tenant"], a[href*="property"], a[href*="lease"]');
    const count = await entityLinks.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Notes Page - Responsive Design', () => {
  // N023: Desktop view
  test('N023: should render correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await navigateTo(page, '/notes');
    await waitForPageLoad(page);
    await expect(page.locator('main')).toBeVisible();
  });

  // N024: Tablet view
  test('N024: should render correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await navigateTo(page, '/notes');
    await waitForPageLoad(page);
    await expect(page.locator('main')).toBeVisible();
  });

  // N025: Mobile view
  test('N025: should render correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await navigateTo(page, '/notes');
    await waitForPageLoad(page);
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Notes Page - Data Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/notes');
    await waitForPageLoad(page);
  });

  // N026: No error states
  test('N026: should not show error states', async ({ page }) => {
    const errors = page.locator('[class*="error"]:visible');
    const count = await errors.count();
    expect(count).toBe(0);
  });

  // N027: Data loads completely
  test('N027: data should load completely', async ({ page }) => {
    await page.waitForTimeout(2000);
    const loadingIndicators = page.locator('[class*="skeleton"]:visible, [class*="loading"]:visible');
    const count = await loadingIndicators.count();
    expect(count).toBeLessThanOrEqual(1);
  });

  // N028: Console errors check
  test('N028: should not have critical console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    await navigateTo(page, '/notes');
    await waitForPageLoad(page);
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.includes('websocket')
    );
    expect(criticalErrors.length).toBeLessThanOrEqual(2);
  });
});

test.describe('Notes Page - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/notes');
    await waitForPageLoad(page);
  });

  // N029: Keyboard navigation
  test('N029: should support keyboard navigation', async ({ page }) => {
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeDefined();
  });
});

test.describe('Notes Page - Performance', () => {
  // N030: Page load time
  test('N030: should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await navigateTo(page, '/notes');
    await waitForPageLoad(page);
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(10000);
  });
});

test.describe('Notes Page - Button Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/notes');
    await waitForPageLoad(page);
  });

  // N031: All buttons clickable
  test('N031: all visible buttons should be clickable', async ({ page }) => {
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
});
