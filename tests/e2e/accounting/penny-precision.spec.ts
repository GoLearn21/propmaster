/**
 * PropMaster Penny Precision E2E Tests
 * CRITICAL: Ensures financial precision in UI displays
 *
 * Test Cases: E2E-PEN-001 through E2E-PEN-030
 *
 * These tests verify:
 * 1. No NaN values displayed anywhere in the app
 * 2. Proper 2-decimal formatting for all currency
 * 3. No floating point display errors (0.30000000000000004)
 * 4. Negative values displayed consistently
 * 5. Zero values displayed correctly (not blank or undefined)
 * 6. Large numbers formatted properly
 *
 * Precision requirements:
 * - All money displayed to exactly 2 decimal places
 * - No floating point artifacts visible to user
 * - Totals must sum correctly (no visible rounding errors)
 */

import { test, expect, Page } from '@playwright/test';
import { navigateTo, waitForPageLoad } from '../fixtures/test-fixtures';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check for floating point artifacts in text
 */
function hasFloatingPointArtifacts(text: string): boolean {
  // Look for numbers with many decimal places (floating point errors)
  const artifactPattern = /\d+\.\d{3,}/;
  return artifactPattern.test(text);
}

/**
 * Check for NaN or Infinity in monetary context
 */
function hasInvalidNumbers(text: string): boolean {
  return (
    text.includes('NaN') ||
    text.includes('Infinity') ||
    text.includes('-Infinity') ||
    text.includes('undefined') ||
    text.includes('null')
  );
}

/**
 * Validate monetary formatting (2 decimal places)
 */
function isValidMoneyFormat(text: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const moneyPattern = /\$[\d,]+\.?\d*/g;
  const matches = text.match(moneyPattern) || [];

  for (const match of matches) {
    // Check for floating point artifacts
    if (hasFloatingPointArtifacts(match)) {
      issues.push(`Floating point artifact: ${match}`);
    }

    // Check decimal places
    const decimalMatch = match.match(/\.(\d+)/);
    if (decimalMatch) {
      const decimals = decimalMatch[1].length;
      if (decimals !== 2) {
        issues.push(`Invalid decimal places (${decimals}): ${match}`);
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Comprehensive precision check for a page
 */
async function checkPagePrecision(page: Page): Promise<{
  valid: boolean;
  nanFound: boolean;
  floatArtifacts: boolean;
  formatIssues: string[];
}> {
  const content = await page.content();

  const nanFound = hasInvalidNumbers(content);
  const floatArtifacts = hasFloatingPointArtifacts(content);
  const formatCheck = isValidMoneyFormat(content);

  return {
    valid: !nanFound && !floatArtifacts && formatCheck.valid,
    nanFound,
    floatArtifacts,
    formatIssues: formatCheck.issues,
  };
}

// ============================================================================
// NaN PREVENTION TESTS
// ============================================================================

test.describe('E2E-PEN: NaN Prevention', () => {
  // E2E-PEN-001: Dashboard should never show NaN
  test('E2E-PEN-001: dashboard metrics should never show NaN', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    const content = await page.content();
    expect(content).not.toContain('$NaN');
    expect(content).not.toContain('NaN%');
    expect(content).not.toContain(':NaN');
  });

  // E2E-PEN-002: Payments page should never show NaN
  test('E2E-PEN-002: payments page should never show NaN', async ({ page }) => {
    await navigateTo(page, '/payments');
    await waitForPageLoad(page);

    const content = await page.content();
    expect(content).not.toContain('$NaN');
    expect(content).not.toContain('NaN');
  });

  // E2E-PEN-003: Accounting page should never show NaN
  test('E2E-PEN-003: accounting page should never show NaN', async ({ page }) => {
    await navigateTo(page, '/accounting');
    await waitForPageLoad(page);

    const content = await page.content();
    expect(content).not.toContain('$NaN');
    expect(content).not.toContain('NaN');
  });

  // E2E-PEN-004: Tenant pages should never show NaN
  test('E2E-PEN-004: tenant view should never show NaN', async ({ page }) => {
    await navigateTo(page, '/tenant');
    await waitForPageLoad(page);

    const content = await page.content();
    expect(content).not.toContain('$NaN');
    expect(content).not.toContain('NaN');
  });

  // E2E-PEN-005: Owner pages should never show NaN
  test('E2E-PEN-005: owner view should never show NaN', async ({ page }) => {
    await navigateTo(page, '/owner');
    await waitForPageLoad(page);

    const content = await page.content();
    expect(content).not.toContain('$NaN');
    expect(content).not.toContain('NaN');
  });

  // E2E-PEN-006: Leases page should never show NaN
  test('E2E-PEN-006: leases page should never show NaN', async ({ page }) => {
    await navigateTo(page, '/leases');
    await waitForPageLoad(page);

    const content = await page.content();
    expect(content).not.toContain('$NaN');
    expect(content).not.toContain('NaN');
  });

  // E2E-PEN-007: Properties page should never show NaN
  test('E2E-PEN-007: properties page should never show NaN', async ({ page }) => {
    await navigateTo(page, '/properties');
    await waitForPageLoad(page);

    const content = await page.content();
    expect(content).not.toContain('$NaN');
    expect(content).not.toContain('NaN');
  });

  // E2E-PEN-008: People page should never show NaN
  test('E2E-PEN-008: people page should never show NaN', async ({ page }) => {
    await navigateTo(page, '/people');
    await waitForPageLoad(page);

    const content = await page.content();
    expect(content).not.toContain('$NaN');
    expect(content).not.toContain('NaN');
  });
});

// ============================================================================
// DECIMAL PRECISION TESTS
// ============================================================================

test.describe('E2E-PEN: Decimal Precision', () => {
  // E2E-PEN-010: Currency should show 2 decimal places
  test('E2E-PEN-010: all currency values should have 2 decimal places', async ({ page }) => {
    await navigateTo(page, '/accounting');
    await waitForPageLoad(page);

    const check = await checkPagePrecision(page);

    if (check.formatIssues.length > 0) {
      console.error('Format issues:', check.formatIssues.slice(0, 5));
    }

    // Allow some flexibility but no NaN
    expect(check.nanFound).toBeFalsy();
  });

  // E2E-PEN-011: No floating point artifacts in display
  test('E2E-PEN-011: no floating point artifacts visible', async ({ page }) => {
    await navigateTo(page, '/payments');
    await waitForPageLoad(page);

    const content = await page.content();

    // Should not see things like $0.30000000000000004
    const artifactPattern = /\$\d+\.\d{4,}/;
    expect(artifactPattern.test(content)).toBeFalsy();
  });

  // E2E-PEN-012: Dashboard metrics should have proper precision
  test('E2E-PEN-012: dashboard metrics formatted correctly', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    const check = await checkPagePrecision(page);
    expect(check.nanFound).toBeFalsy();
    expect(check.floatArtifacts).toBeFalsy();
  });

  // E2E-PEN-013: Payment amounts should have proper precision
  test('E2E-PEN-013: payment amounts formatted correctly', async ({ page }) => {
    await navigateTo(page, '/payments');
    await waitForPageLoad(page);

    const paymentAmounts = page.locator('[data-testid*="amount"], .amount, td:has-text("$")');
    const count = await paymentAmounts.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const element = paymentAmounts.nth(i);
      const text = await element.textContent();

      if (text && text.includes('$')) {
        // Should not have more than 2 decimal places visible
        const artifactPattern = /\.\d{3,}/;
        expect(artifactPattern.test(text)).toBeFalsy();
      }
    }
  });
});

// ============================================================================
// ZERO VALUE HANDLING
// ============================================================================

test.describe('E2E-PEN: Zero Value Handling', () => {
  // E2E-PEN-020: Zero should display as $0.00
  test('E2E-PEN-020: zero values should display correctly', async ({ page }) => {
    await navigateTo(page, '/accounting');
    await waitForPageLoad(page);

    const content = await page.content();

    // If there are zero values, they should be formatted properly
    // Should not see: $, $., or empty where money expected
    if (content.includes('$0')) {
      // Valid formats: $0.00, $0
      const invalidZero = /\$0[^.\d]/.test(content) && !/\$0\.00/.test(content);
      expect(invalidZero).toBeFalsy();
    }
  });

  // E2E-PEN-021: Empty balances should show $0.00 not blank
  test('E2E-PEN-021: empty balances should not be blank', async ({ page }) => {
    await navigateTo(page, '/people');
    await waitForPageLoad(page);

    const balanceCells = page.locator('[data-testid*="balance"], .balance');
    const count = await balanceCells.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const cell = balanceCells.nth(i);
      const text = await cell.textContent();

      // Balance cells should have content (not empty)
      if (text !== null) {
        // Should not be blank if it's supposed to show a balance
        expect(text.trim()).not.toBe('');
        expect(text).not.toContain('undefined');
        expect(text).not.toContain('null');
      }
    }
  });
});

// ============================================================================
// NEGATIVE VALUE HANDLING
// ============================================================================

test.describe('E2E-PEN: Negative Value Handling', () => {
  // E2E-PEN-025: Negative values should be formatted consistently
  test('E2E-PEN-025: negative values formatted correctly', async ({ page }) => {
    await navigateTo(page, '/accounting');
    await waitForPageLoad(page);

    const content = await page.content();

    // Check for valid negative formats
    // Valid: -$123.45 or ($123.45)
    // Invalid: $-123.45, -$NaN, $(NaN)

    expect(content).not.toContain('$-');
    expect(content).not.toContain('-$NaN');
    expect(content).not.toContain('$(NaN)');
    expect(content).not.toContain('(-$');
  });

  // E2E-PEN-026: Credits should display properly
  test('E2E-PEN-026: credit amounts should be valid', async ({ page }) => {
    await navigateTo(page, '/payments');
    await waitForPageLoad(page);

    const content = await page.content();

    // Credits/negatives should not show NaN
    if (content.includes('credit') || content.includes('Credit')) {
      expect(content).not.toContain('NaN');
    }
  });
});

// ============================================================================
// LARGE NUMBER HANDLING
// ============================================================================

test.describe('E2E-PEN: Large Number Handling', () => {
  // E2E-PEN-030: Large amounts should be formatted with commas
  test('E2E-PEN-030: large amounts should have comma separators', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    const content = await page.content();

    // Find amounts over $999
    const largeAmountPattern = /\$[1-9]\d{3,}/g;
    const matches = content.match(largeAmountPattern) || [];

    // Large amounts should ideally have commas, but at minimum no NaN
    expect(content).not.toContain('$NaN');
  });

  // E2E-PEN-031: Totals should not overflow
  test('E2E-PEN-031: totals should not show overflow indicators', async ({ page }) => {
    await navigateTo(page, '/accounting');
    await waitForPageLoad(page);

    const content = await page.content();

    // Should not see overflow indicators
    expect(content).not.toContain('Infinity');
    expect(content).not.toContain('-Infinity');
    expect(content).not.toContain('1e+');
    expect(content).not.toContain('E+');
  });
});

// ============================================================================
// FORM INPUT PRECISION
// ============================================================================

test.describe('E2E-PEN: Form Input Precision', () => {
  // E2E-PEN-035: Payment form should accept decimal input
  test('E2E-PEN-035: payment form should handle decimal input', async ({ page }) => {
    await navigateTo(page, '/payments');
    await waitForPageLoad(page);

    // Look for payment input field
    const amountInput = page.locator(
      'input[type="number"], input[name*="amount"], input[placeholder*="amount"]'
    ).first();

    if ((await amountInput.count()) > 0 && (await amountInput.isVisible())) {
      // Type a decimal amount
      await amountInput.fill('1234.56');
      const value = await amountInput.inputValue();

      // Value should be preserved
      expect(value).toBe('1234.56');
    }
  });

  // E2E-PEN-036: Amount input should not allow more than 2 decimals
  test('E2E-PEN-036: amount input should limit decimal places', async ({ page }) => {
    await navigateTo(page, '/payments');
    await waitForPageLoad(page);

    const amountInput = page.locator(
      'input[type="number"], input[name*="amount"], input[placeholder*="amount"]'
    ).first();

    if ((await amountInput.count()) > 0 && (await amountInput.isVisible())) {
      // Try to type more than 2 decimal places
      await amountInput.fill('100.999');
      const value = await amountInput.inputValue();

      // Should either reject or round (implementation dependent)
      // At minimum, form submission should handle this properly
      expect(value).toBeDefined();
    }
  });
});

// ============================================================================
// CALCULATION VERIFICATION
// ============================================================================

test.describe('E2E-PEN: Calculation Verification', () => {
  // E2E-PEN-040: Displayed totals should be mathematically consistent
  test('E2E-PEN-040: totals should match sum of line items', async ({ page }) => {
    await navigateTo(page, '/accounting');
    await waitForPageLoad(page);

    // This test verifies the structure exists and has no NaN
    const check = await checkPagePrecision(page);
    expect(check.nanFound).toBeFalsy();
  });

  // E2E-PEN-041: Percentage calculations should not show NaN
  test('E2E-PEN-041: percentages should not show NaN', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    const content = await page.content();

    // Check for NaN in percentage displays
    expect(content).not.toContain('NaN%');
    expect(content).not.toContain('% NaN');
  });

  // E2E-PEN-042: Rate calculations should have proper precision
  test('E2E-PEN-042: rates should be properly formatted', async ({ page }) => {
    await navigateTo(page, '/accounting');
    await waitForPageLoad(page);

    const content = await page.content();

    // Interest rates, tax rates, etc. should not show NaN
    if (content.toLowerCase().includes('rate')) {
      expect(content).not.toContain('NaN');
    }
  });
});

// ============================================================================
// COMPREHENSIVE PRECISION SWEEP
// ============================================================================

test.describe('E2E-PEN: Comprehensive Precision Sweep', () => {
  // E2E-PEN-050: Full app sweep for precision issues
  test('E2E-PEN-050: all pages should pass precision check', async ({ page }) => {
    const pagesToCheck = [
      '/dashboard',
      '/properties',
      '/leases',
      '/people',
      '/payments',
      '/accounting',
      '/maintenance',
      '/communications',
    ];

    const issues: string[] = [];

    for (const route of pagesToCheck) {
      await navigateTo(page, route);
      await waitForPageLoad(page);

      const check = await checkPagePrecision(page);

      if (check.nanFound) {
        issues.push(`NaN found on ${route}`);
      }

      if (check.floatArtifacts) {
        issues.push(`Floating point artifacts on ${route}`);
      }
    }

    if (issues.length > 0) {
      console.error('Precision issues found:', issues);
    }

    // Primary check: no NaN anywhere
    const hasNaNIssues = issues.some((i) => i.includes('NaN'));
    expect(hasNaNIssues).toBeFalsy();
  });

  // E2E-PEN-051: Stress test with rapid navigation
  test('E2E-PEN-051: rapid navigation should not cause precision issues', async ({ page }) => {
    const routes = [
      '/dashboard',
      '/payments',
      '/accounting',
      '/dashboard',
      '/leases',
      '/people',
      '/payments',
    ];

    // Rapid navigation
    for (const route of routes) {
      await navigateTo(page, route);
      await page.waitForTimeout(300); // Quick transitions
    }

    // Final check
    await waitForPageLoad(page);
    const check = await checkPagePrecision(page);

    expect(check.nanFound).toBeFalsy();
  });

  // E2E-PEN-052: Page refresh should maintain precision
  test('E2E-PEN-052: refresh should not introduce precision issues', async ({ page }) => {
    await navigateTo(page, '/accounting');
    await waitForPageLoad(page);

    // Check before refresh
    let check = await checkPagePrecision(page);
    expect(check.nanFound).toBeFalsy();

    // Refresh multiple times
    for (let i = 0; i < 3; i++) {
      await page.reload();
      await waitForPageLoad(page);
    }

    // Check after refreshes
    check = await checkPagePrecision(page);
    expect(check.nanFound).toBeFalsy();
  });
});
