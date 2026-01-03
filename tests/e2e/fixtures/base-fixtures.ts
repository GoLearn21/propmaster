/**
 * PropMaster E2E Test Base Fixtures
 * Enhanced test utilities and page object helpers
 */

import { test as base, expect, Page, Locator } from '@playwright/test';

// Navigation routes for the application
export const ROUTES = {
  // Property Manager Portal
  dashboard: '/',
  properties: '/properties',
  propertyNew: '/properties/new',
  rentals: '/rentals',
  people: '/people',
  tasksMaintenance: '/tasks-maintenance',
  accounting: '/accounting',
  calendar: '/calendar',
  communications: '/communications',
  notes: '/notes',
  filesAgreements: '/files-agreements',
  reports: '/reports',
  leasing: '/leasing',
  workflows: '/workflows',
  settings: '/settings',
  getStarted: '/get-started',

  // Tenant Portal
  tenantLogin: '/tenant/login',
  tenantSignup: '/tenant/signup',
  tenantDashboard: '/tenant/dashboard',
  tenantPayments: '/tenant/payments',
  tenantPaymentHistory: '/tenant/payments/history',
  tenantPaymentMethods: '/tenant/payments/methods',
  tenantMaintenance: '/tenant/maintenance',
  tenantMaintenanceNew: '/tenant/maintenance/new',
  tenantDocuments: '/tenant/documents',
  tenantNotifications: '/tenant/notifications',
  tenantProfile: '/tenant/profile',
  tenantSettings: '/tenant/settings',

  // Vendor Portal
  vendorLogin: '/vendor/login',
  vendorSignup: '/vendor/signup',
  vendorDashboard: '/vendor/dashboard',
  vendorJobs: '/vendor/jobs',

  // Owner Portal
  ownerLogin: '/owner/login',
  ownerSignup: '/owner/signup',
  ownerDashboard: '/owner/dashboard',
  ownerFinancialReports: '/owner/financial-reports',
  ownerProperties: '/owner/properties',
};

// Common UI selectors
export const SELECTORS = {
  // Navigation
  sidebar: '[data-testid="sidebar"], aside',
  topNav: 'nav',
  breadcrumb: '[data-testid="breadcrumb"], .breadcrumb',

  // Common UI elements
  card: '[data-testid="card"], .card, [class*="Card"]',
  button: 'button',
  input: 'input',
  select: 'select',
  modal: '[role="dialog"], [data-testid="modal"], .modal',
  toast: '[data-testid="toast"], .toast, [role="alert"]',
  table: 'table',
  tableRow: 'tbody tr',

  // Loading states
  loader: '[data-testid="loader"], .animate-spin, .loading',
  skeleton: '[data-testid="skeleton"], .animate-pulse, [class*="skeleton"]',

  // Forms
  formError: '[data-testid="error"], .error, [class*="error"]',
  formSuccess: '[data-testid="success"], .success',
  submitButton: 'button[type="submit"], button:has-text("Save"), button:has-text("Submit")',

  // Badges
  badge: '[data-testid="badge"], .badge, [class*="Badge"]',
  statusBadge: '[data-testid="status-badge"]',
};

// Page helper class for common operations
export class PageHelper {
  constructor(private page: Page) {}

  // Navigation
  async goto(path: string) {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('domcontentloaded');
    // Wait for React hydration
    await this.page.waitForTimeout(300);
    // Wait for any loaders to disappear
    const loader = this.page.locator(SELECTORS.loader);
    if (await loader.count() > 0) {
      await loader.first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    }
  }

  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle');
  }

  // Element interactions
  async clickButton(text: string) {
    await this.page.getByRole('button', { name: text }).click();
  }

  async clickLink(text: string) {
    await this.page.getByRole('link', { name: text }).click();
  }

  async fillInput(label: string, value: string) {
    await this.page.getByLabel(label).fill(value);
  }

  async selectOption(label: string, value: string) {
    await this.page.getByLabel(label).selectOption(value);
  }

  // Assertions
  async expectVisible(selector: string | Locator) {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await expect(locator.first()).toBeVisible();
  }

  async expectNotVisible(selector: string | Locator) {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await expect(locator.first()).not.toBeVisible();
  }

  async expectText(selector: string, text: string) {
    await expect(this.page.locator(selector).first()).toContainText(text);
  }

  async expectUrl(path: string) {
    await expect(this.page).toHaveURL(new RegExp(path));
  }

  // Cards and metrics
  async getCardCount() {
    return await this.page.locator(SELECTORS.card).count();
  }

  async getTableRowCount() {
    return await this.page.locator(SELECTORS.tableRow).count();
  }

  // Modal interactions
  async waitForModal() {
    await this.page.locator(SELECTORS.modal).waitFor({ state: 'visible' });
  }

  async closeModal() {
    const closeButton = this.page.locator(`${SELECTORS.modal} button:has-text("Close"), ${SELECTORS.modal} button[aria-label="Close"]`);
    if (await closeButton.count() > 0) {
      await closeButton.first().click();
    }
  }

  // Toast notifications
  async expectToast(text?: string) {
    const toast = this.page.locator(SELECTORS.toast);
    await expect(toast.first()).toBeVisible({ timeout: 5000 });
    if (text) {
      await expect(toast.first()).toContainText(text);
    }
  }

  // Screenshots for debugging
  async screenshot(name: string) {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
  }
}

// Extended test fixture with helpers
export const test = base.extend<{
  helper: PageHelper;
}>({
  helper: async ({ page }, use) => {
    const helper = new PageHelper(page);
    await use(helper);
  },
});

export { expect };

// Test data generators
export function generateEmail(): string {
  return `test.${Date.now()}@example.com`;
}

export function generatePhone(): string {
  const area = Math.floor(Math.random() * 900) + 100;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const line = Math.floor(Math.random() * 9000) + 1000;
  return `(${area}) ${prefix}-${line}`;
}

export function generateName(): { first: string; last: string } {
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  return {
    first: firstNames[Math.floor(Math.random() * firstNames.length)],
    last: lastNames[Math.floor(Math.random() * lastNames.length)],
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
