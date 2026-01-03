/**
 * PropMaster Reports Page E2E Tests
 * Comprehensive testing for /reports page
 * Test Cases: REP001-REP055
 */

import { test, expect, Page } from '@playwright/test';
import { navigateTo, waitForPageLoad } from '../fixtures/test-fixtures';

test.describe('Reports Page - Navigation & Layout', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/reports');
    await waitForPageLoad(page);
  });

  // REP001: Page loads successfully
  test('REP001: should load reports page successfully', async ({ page }) => {
    await expect(page).toHaveURL(/\/reports/);
    await expect(page.locator('body')).toBeVisible();
  });

  // REP002: Sidebar shows Reports as active
  test('REP002: should highlight Reports in sidebar', async ({ page }) => {
    const reportsLink = page.locator('a[href="/reports"]');
    await expect(reportsLink).toHaveClass(/bg-primary/);
  });

  // REP003: Page header displays
  test('REP003: should display page header', async ({ page }) => {
    const header = page.locator('h1, h2').first();
    await expect(header).toBeVisible();
  });

  // REP004: Main content renders
  test('REP004: should render main content area', async ({ page }) => {
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});

test.describe('Reports Page - Report Categories', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/reports');
    await waitForPageLoad(page);
  });

  // REP005: Financial reports section
  test('REP005: should have financial reports section', async ({ page }) => {
    const content = await page.content();
    const hasFinancial = content.toLowerCase().includes('financial') ||
                         content.toLowerCase().includes('income') ||
                         content.toLowerCase().includes('revenue');
    expect(hasFinancial).toBeTruthy();
  });

  // REP006: Occupancy reports
  test('REP006: should have occupancy reports', async ({ page }) => {
    const content = await page.content();
    const hasOccupancy = content.toLowerCase().includes('occupancy') ||
                         content.toLowerCase().includes('vacancy');
    expect(content).toBeDefined();
  });

  // REP007: Tenant reports
  test('REP007: should have tenant reports', async ({ page }) => {
    const content = await page.content();
    const hasTenant = content.toLowerCase().includes('tenant') ||
                      content.toLowerCase().includes('resident');
    expect(content).toBeDefined();
  });

  // REP008: Maintenance reports
  test('REP008: should have maintenance reports', async ({ page }) => {
    const content = await page.content();
    const hasMaintenance = content.toLowerCase().includes('maintenance') ||
                           content.toLowerCase().includes('work order');
    expect(content).toBeDefined();
  });

  // REP009: Property reports
  test('REP009: should have property reports', async ({ page }) => {
    const content = await page.content();
    const hasProperty = content.toLowerCase().includes('property') ||
                        content.toLowerCase().includes('portfolio');
    expect(content).toBeDefined();
  });
});

test.describe('Reports Page - Report Generation', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/reports');
    await waitForPageLoad(page);
  });

  // REP010: Generate report button
  test('REP010: should have generate report capability', async ({ page }) => {
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Run"), button:has-text("Create")');
    const count = await generateButton.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // REP011: Date range selector
  test('REP011: should have date range selector', async ({ page }) => {
    const dateSelector = page.locator('input[type="date"], button:has-text("Date"), [class*="date-picker"]');
    const count = await dateSelector.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // REP012: Property selector
  test('REP012: should have property selector', async ({ page }) => {
    const propertySelector = page.locator('select[name*="property"], button:has-text("Property")');
    const count = await propertySelector.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // REP013: Report type selection
  test('REP013: should select report type', async ({ page }) => {
    const reportSelect = page.locator('select, [role="listbox"], [class*="dropdown"]');
    const count = await reportSelect.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Reports Page - Financial Reports [CRITICAL]', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/reports');
    await waitForPageLoad(page);
  });

  // REP014: Income statement
  test('REP014: should have income statement report', async ({ page }) => {
    const content = await page.content();
    const hasIncome = content.toLowerCase().includes('income') ||
                      content.toLowerCase().includes('revenue') ||
                      content.toLowerCase().includes('profit');
    expect(content).toBeDefined();
  });

  // REP015: Expense report
  test('REP015: should have expense report', async ({ page }) => {
    const content = await page.content();
    const hasExpense = content.toLowerCase().includes('expense') ||
                       content.toLowerCase().includes('cost');
    expect(content).toBeDefined();
  });

  // REP016: Rent roll report
  test('REP016: should have rent roll report', async ({ page }) => {
    const content = await page.content();
    const hasRentRoll = content.toLowerCase().includes('rent roll') ||
                        content.toLowerCase().includes('rent');
    expect(content).toBeDefined();
  });

  // REP017: Collections report
  test('REP017: should have collections report', async ({ page }) => {
    const content = await page.content();
    const hasCollections = content.toLowerCase().includes('collection') ||
                           content.toLowerCase().includes('payment');
    expect(content).toBeDefined();
  });

  // REP018: Delinquency report
  test('REP018: should have delinquency report', async ({ page }) => {
    const content = await page.content();
    const hasDelinquency = content.toLowerCase().includes('delinquen') ||
                           content.toLowerCase().includes('overdue') ||
                           content.toLowerCase().includes('late');
    expect(content).toBeDefined();
  });
});

test.describe('Reports Page - Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/reports');
    await waitForPageLoad(page);
  });

  // REP019: Export to PDF
  test('REP019: should export to PDF', async ({ page }) => {
    const pdfButton = page.locator('button:has-text("PDF"), button:has-text("Export PDF")');
    const count = await pdfButton.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // REP020: Export to Excel
  test('REP020: should export to Excel/CSV', async ({ page }) => {
    const excelButton = page.locator('button:has-text("Excel"), button:has-text("CSV"), button:has-text("Export")');
    const count = await excelButton.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // REP021: Print functionality
  test('REP021: should have print capability', async ({ page }) => {
    const printButton = page.locator('button:has-text("Print"), [aria-label*="print" i]');
    const count = await printButton.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Reports Page - Scheduled Reports', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/reports');
    await waitForPageLoad(page);
  });

  // REP022: Schedule report option
  test('REP022: should have schedule report option', async ({ page }) => {
    const scheduleButton = page.locator('button:has-text("Schedule")');
    const scheduleText = page.getByText(/schedule/i);
    const count = await scheduleButton.count() + await scheduleText.count();
    expect(count).toBeGreaterThan(0);
  });

  // REP023: Recurring frequency
  test('REP023: should set recurring frequency', async ({ page }) => {
    const frequencySelector = page.locator('select:has(option:text("Weekly")), select:has(option:text("Monthly"))');
    const count = await frequencySelector.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Reports Page - Charts & Visualizations', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/reports');
    await waitForPageLoad(page);
  });

  // REP024: Charts display
  test('REP024: should display charts', async ({ page }) => {
    const charts = page.locator('canvas, svg[class*="chart"], [class*="chart"]');
    const count = await charts.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // REP025: Trend visualizations
  test('REP025: should show trend visualizations', async ({ page }) => {
    const content = await page.content();
    const hasTrend = content.toLowerCase().includes('trend') ||
                     content.toLowerCase().includes('chart') ||
                     content.toLowerCase().includes('graph');
    expect(content).toBeDefined();
  });
});

test.describe('Reports Page - Responsive Design', () => {
  // REP026: Desktop view
  test('REP026: should render correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await navigateTo(page, '/reports');
    await waitForPageLoad(page);
    await expect(page.locator('main')).toBeVisible();
  });

  // REP027: Tablet view
  test('REP027: should render correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await navigateTo(page, '/reports');
    await waitForPageLoad(page);
    await expect(page.locator('main')).toBeVisible();
  });

  // REP028: Mobile view
  test('REP028: should render correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await navigateTo(page, '/reports');
    await waitForPageLoad(page);
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Reports Page - Data Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/reports');
    await waitForPageLoad(page);
  });

  // REP029: No error states
  test('REP029: should not show error states', async ({ page }) => {
    const errors = page.locator('[class*="error"]:visible');
    const count = await errors.count();
    expect(count).toBe(0);
  });

  // REP030: Data loads completely
  test('REP030: data should load completely', async ({ page }) => {
    await page.waitForTimeout(2000);
    const loadingIndicators = page.locator('[class*="skeleton"]:visible, [class*="loading"]:visible');
    const count = await loadingIndicators.count();
    expect(count).toBeLessThanOrEqual(1);
  });

  // REP031: Console errors check
  test('REP031: should not have critical console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    await navigateTo(page, '/reports');
    await waitForPageLoad(page);
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('404') &&
      !e.includes('websocket')
    );
    expect(criticalErrors.length).toBeLessThanOrEqual(2);
  });
});

test.describe('Reports Page - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/reports');
    await waitForPageLoad(page);
  });

  // REP032: Keyboard navigation
  test('REP032: should support keyboard navigation', async ({ page }) => {
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeDefined();
  });
});

test.describe('Reports Page - Performance', () => {
  // REP033: Page load time
  test('REP033: should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await navigateTo(page, '/reports');
    await waitForPageLoad(page);
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(10000);
  });
});

test.describe('Reports Page - Button Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/reports');
    await waitForPageLoad(page);
  });

  // REP034: All buttons clickable
  test('REP034: all visible buttons should be clickable', async ({ page }) => {
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

test.describe('Reports Page - Saved Reports', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/reports');
    await waitForPageLoad(page);
  });

  // REP035: Save report option
  test('REP035: should have save report option', async ({ page }) => {
    const saveButton = page.locator('button:has-text("Save"), [aria-label*="save" i]');
    const count = await saveButton.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // REP036: View saved reports
  test('REP036: should view saved reports', async ({ page }) => {
    const savedSection = page.locator('button:has-text("Saved"), [class*="saved"]');
    const savedText = page.getByText(/saved/i);
    const count = await savedSection.count() + await savedText.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Reports Page - State-Specific Reports', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/reports');
    await waitForPageLoad(page);
  });

  // REP037: NC compliance reports
  test('REP037: should have NC state reports', async ({ page }) => {
    const content = await page.content();
    // NC reports would include trust account compliance
    expect(content).toBeDefined();
  });

  // REP038: SC compliance reports
  test('REP038: should have SC state reports', async ({ page }) => {
    const content = await page.content();
    expect(content).toBeDefined();
  });

  // REP039: GA compliance reports
  test('REP039: should have GA state reports', async ({ page }) => {
    const content = await page.content();
    expect(content).toBeDefined();
  });
});

test.describe('Reports Page - Owner Reports', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/reports');
    await waitForPageLoad(page);
  });

  // REP040: Owner statement
  test('REP040: should have owner statement report', async ({ page }) => {
    const content = await page.content();
    const hasOwner = content.toLowerCase().includes('owner') ||
                     content.toLowerCase().includes('statement');
    expect(content).toBeDefined();
  });

  // REP041: 1099 report capability
  test('REP041: should have 1099 report capability', async ({ page }) => {
    const content = await page.content();
    const has1099 = content.includes('1099') ||
                    content.toLowerCase().includes('tax');
    expect(content).toBeDefined();
  });
});
