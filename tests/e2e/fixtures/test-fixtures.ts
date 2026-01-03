/**
 * PropMaster E2E Test Fixtures
 * Shared test data and utilities for all test suites
 */

import { test as base, expect, Page } from '@playwright/test';

// State compliance data for NC, SC, GA
export const STATE_COMPLIANCE = {
  NC: {
    name: 'North Carolina',
    securityDepositMax: 2, // months
    gracePeriodDays: 5,
    lateFeeMax: 0.05, // 5% of rent
    noticeToVacate: 7,
    evictionNoticeDays: 10,
    requiredDisclosures: ['lead-paint', 'mold', 'sex-offender-registry'],
    trustAccountRequired: true,
  },
  SC: {
    name: 'South Carolina',
    securityDepositMax: null, // No statutory limit
    gracePeriodDays: 5,
    lateFeeMax: null, // No statutory limit
    noticeToVacate: 30,
    evictionNoticeDays: 5,
    requiredDisclosures: ['lead-paint'],
    trustAccountRequired: false,
  },
  GA: {
    name: 'Georgia',
    securityDepositMax: null, // No statutory limit
    gracePeriodDays: 0, // No statutory requirement
    lateFeeMax: null, // No statutory limit
    noticeToVacate: 60,
    evictionNoticeDays: 7,
    requiredDisclosures: ['lead-paint', 'flooding'],
    trustAccountRequired: true,
  },
};

// Test property data
export const TEST_PROPERTIES = {
  NC: {
    id: 'prop-nc-001',
    name: 'Magnolia Gardens',
    address: '123 Main St, Charlotte, NC 28202',
    state: 'NC',
    units: 24,
    type: 'multi-family',
  },
  SC: {
    id: 'prop-sc-001',
    name: 'Palmetto Place',
    address: '456 Oak Ave, Charleston, SC 29401',
    state: 'SC',
    units: 16,
    type: 'multi-family',
  },
  GA: {
    id: 'prop-ga-001',
    name: 'Peachtree Commons',
    address: '789 Peach Blvd, Atlanta, GA 30301',
    state: 'GA',
    units: 32,
    type: 'multi-family',
  },
};

// Test tenant data
export const TEST_TENANTS = [
  {
    id: 'tenant-001',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@test.com',
    phone: '(704) 555-0101',
    status: 'current',
    state: 'NC',
    monthlyRent: 1500,
    leaseStart: '2024-01-01',
    leaseEnd: '2024-12-31',
  },
  {
    id: 'tenant-002',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.j@test.com',
    phone: '(843) 555-0202',
    status: 'current',
    state: 'SC',
    monthlyRent: 1800,
    leaseStart: '2024-03-01',
    leaseEnd: '2025-02-28',
  },
  {
    id: 'tenant-003',
    firstName: 'Michael',
    lastName: 'Williams',
    email: 'm.williams@test.com',
    phone: '(404) 555-0303',
    status: 'current',
    state: 'GA',
    monthlyRent: 2200,
    leaseStart: '2024-06-01',
    leaseEnd: '2025-05-31',
  },
];

// Payment test scenarios
export const PAYMENT_SCENARIOS = {
  onTime: {
    description: 'Payment received on or before due date',
    daysBeforeDue: 0,
    lateFee: 0,
    status: 'paid',
  },
  gracePeriod: {
    description: 'Payment within grace period',
    daysAfterDue: 3,
    lateFee: 0,
    status: 'paid',
  },
  late: {
    description: 'Payment after grace period',
    daysAfterDue: 10,
    lateFeeApplied: true,
    status: 'paid',
  },
  overdue: {
    description: 'Payment not yet received past due',
    daysAfterDue: 15,
    status: 'overdue',
  },
  partial: {
    description: 'Partial payment received',
    percentPaid: 0.5,
    status: 'partial',
  },
};

// Navigation helper
export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

// Wait for page to be fully loaded
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
  // Wait for React to hydrate
  await page.waitForTimeout(500);
}

// Click and wait for navigation
export async function clickAndNavigate(page: Page, selector: string) {
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click(selector),
  ]);
}

// Fill form field with validation
export async function fillFormField(page: Page, selector: string, value: string) {
  const field = page.locator(selector);
  await field.fill(value);
  await expect(field).toHaveValue(value);
}

// Select dropdown option
export async function selectOption(page: Page, selector: string, value: string) {
  await page.selectOption(selector, value);
}

// Check element visibility
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector);
  return await element.isVisible();
}

// Get text content
export async function getText(page: Page, selector: string): Promise<string> {
  const element = page.locator(selector);
  return await element.textContent() || '';
}

// Count elements
export async function countElements(page: Page, selector: string): Promise<number> {
  return await page.locator(selector).count();
}

// Verify table data
export async function verifyTableRow(page: Page, rowIndex: number, expectedData: string[]) {
  const row = page.locator(`table tbody tr`).nth(rowIndex);
  for (let i = 0; i < expectedData.length; i++) {
    const cell = row.locator('td').nth(i);
    await expect(cell).toContainText(expectedData[i]);
  }
}

// Extended test with custom fixtures
export const test = base.extend<{
  authenticatedPage: Page;
}>({
  authenticatedPage: async ({ page }, use) => {
    // For now, we don't have auth - just use regular page
    await use(page);
  },
});

export { expect };
