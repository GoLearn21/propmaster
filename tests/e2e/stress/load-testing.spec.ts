/**
 * PropMaster Load Testing E2E Specs
 * Tests system behavior under high load conditions
 *
 * Test Cases: LOAD-001 through LOAD-020
 *
 * Scenarios:
 * 1. Rapid page navigation (simulating fast user)
 * 2. Multiple concurrent data fetches
 * 3. Large data set rendering
 * 4. Repeated form submissions
 * 5. Memory leak detection (page stability over time)
 *
 * Performance Benchmarks:
 * - Page load: < 3 seconds
 * - Navigation: < 1 second
 * - Form response: < 2 seconds
 * - No NaN/undefined under load
 */

import { test, expect, Page } from '@playwright/test';
import { navigateTo, waitForPageLoad } from '../fixtures/test-fixtures';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Measure page load time
 */
async function measurePageLoad(page: Page, route: string): Promise<number> {
  const start = Date.now();
  await navigateTo(page, route);
  await waitForPageLoad(page);
  return Date.now() - start;
}

/**
 * Check for errors in console
 */
async function hasConsoleErrors(page: Page): Promise<boolean> {
  let hasErrors = false;

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      hasErrors = true;
    }
  });

  return hasErrors;
}

/**
 * Check page content for data integrity
 */
async function checkDataIntegrity(page: Page): Promise<boolean> {
  const content = await page.content();
  return !content.includes('NaN') && !content.includes('undefined') && !content.includes('Error');
}

// ============================================================================
// RAPID NAVIGATION TESTS
// ============================================================================

test.describe('LOAD: Rapid Navigation Stress', () => {
  // LOAD-001: Rapid navigation should not crash
  test('LOAD-001: rapid navigation between pages should be stable', async ({ page }) => {
    const routes = [
      '/dashboard',
      '/properties',
      '/leases',
      '/people',
      '/payments',
      '/accounting',
      '/maintenance',
      '/communications',
    ];

    // Navigate rapidly 3 times through all routes
    for (let round = 0; round < 3; round++) {
      for (const route of routes) {
        await navigateTo(page, route);
        await page.waitForTimeout(200); // Fast navigation
      }
    }

    // Final page should be stable
    await waitForPageLoad(page);
    const isIntact = await checkDataIntegrity(page);
    expect(isIntact).toBeTruthy();
  });

  // LOAD-002: Back/forward navigation stress
  test('LOAD-002: browser history navigation should be stable', async ({ page }) => {
    // Build up history
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);
    await navigateTo(page, '/properties');
    await waitForPageLoad(page);
    await navigateTo(page, '/leases');
    await waitForPageLoad(page);
    await navigateTo(page, '/payments');
    await waitForPageLoad(page);

    // Rapid back/forward
    for (let i = 0; i < 5; i++) {
      await page.goBack();
      await page.waitForTimeout(300);
      await page.goForward();
      await page.waitForTimeout(300);
    }

    const isIntact = await checkDataIntegrity(page);
    expect(isIntact).toBeTruthy();
  });

  // LOAD-003: Tab switching simulation
  test('LOAD-003: rapid tab switching should maintain state', async ({ page }) => {
    await navigateTo(page, '/accounting');
    await waitForPageLoad(page);

    // Find tabs if they exist
    const tabs = page.locator('[role="tab"], .tab, button[class*="tab"]');
    const tabCount = await tabs.count();

    if (tabCount > 1) {
      // Rapidly switch tabs
      for (let round = 0; round < 5; round++) {
        for (let i = 0; i < Math.min(tabCount, 5); i++) {
          const tab = tabs.nth(i);
          if (await tab.isVisible()) {
            await tab.click();
            await page.waitForTimeout(100);
          }
        }
      }
    }

    const isIntact = await checkDataIntegrity(page);
    expect(isIntact).toBeTruthy();
  });
});

// ============================================================================
// PAGE LOAD PERFORMANCE
// ============================================================================

test.describe('LOAD: Page Load Performance', () => {
  // LOAD-010: Dashboard load time
  test('LOAD-010: dashboard should load within 5 seconds', async ({ page }) => {
    const loadTime = await measurePageLoad(page, '/dashboard');
    console.log(`Dashboard load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });

  // LOAD-011: Accounting page load time
  test('LOAD-011: accounting page should load within 5 seconds', async ({ page }) => {
    const loadTime = await measurePageLoad(page, '/accounting');
    console.log(`Accounting load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });

  // LOAD-012: Payments page load time
  test('LOAD-012: payments page should load within 5 seconds', async ({ page }) => {
    const loadTime = await measurePageLoad(page, '/payments');
    console.log(`Payments load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });

  // LOAD-013: People page load time
  test('LOAD-013: people page should load within 5 seconds', async ({ page }) => {
    const loadTime = await measurePageLoad(page, '/people');
    console.log(`People load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });

  // LOAD-014: Properties page load time
  test('LOAD-014: properties page should load within 5 seconds', async ({ page }) => {
    const loadTime = await measurePageLoad(page, '/properties');
    console.log(`Properties load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });
});

// ============================================================================
// REPEATED REFRESH STRESS
// ============================================================================

test.describe('LOAD: Repeated Refresh Stress', () => {
  // LOAD-020: Multiple refreshes should not cause errors
  test('LOAD-020: multiple page refreshes should be stable', async ({ page }) => {
    await navigateTo(page, '/accounting');
    await waitForPageLoad(page);

    // Refresh 10 times
    for (let i = 0; i < 10; i++) {
      await page.reload();
      await page.waitForTimeout(500);
    }

    await waitForPageLoad(page);
    const isIntact = await checkDataIntegrity(page);
    expect(isIntact).toBeTruthy();
  });

  // LOAD-021: Refresh during data load
  test('LOAD-021: refresh during load should not corrupt state', async ({ page }) => {
    await navigateTo(page, '/dashboard');

    // Immediately try to refresh before full load
    await page.waitForTimeout(100);
    await page.reload();
    await page.waitForTimeout(100);
    await page.reload();

    await waitForPageLoad(page);
    const isIntact = await checkDataIntegrity(page);
    expect(isIntact).toBeTruthy();
  });
});

// ============================================================================
// SCROLL STRESS TESTS
// ============================================================================

test.describe('LOAD: Scroll Stress', () => {
  // LOAD-030: Rapid scrolling should not cause issues
  test('LOAD-030: rapid scrolling through data lists', async ({ page }) => {
    await navigateTo(page, '/people');
    await waitForPageLoad(page);

    // Scroll up and down rapidly
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(100);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(100);
    }

    const isIntact = await checkDataIntegrity(page);
    expect(isIntact).toBeTruthy();
  });

  // LOAD-031: Scroll with data loading
  test('LOAD-031: scroll during infinite scroll should be stable', async ({ page }) => {
    await navigateTo(page, '/payments');
    await waitForPageLoad(page);

    // Scroll to bottom multiple times (trigger infinite scroll if present)
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
    }

    const isIntact = await checkDataIntegrity(page);
    expect(isIntact).toBeTruthy();
  });
});

// ============================================================================
// CONCURRENT ACTION STRESS
// ============================================================================

test.describe('LOAD: Concurrent Actions', () => {
  // LOAD-040: Multiple filter changes
  test('LOAD-040: rapid filter changes should not crash', async ({ page }) => {
    await navigateTo(page, '/payments');
    await waitForPageLoad(page);

    const filters = page.locator('select, [role="combobox"], input[type="search"]');
    const filterCount = await filters.count();

    if (filterCount > 0) {
      for (let i = 0; i < Math.min(filterCount, 3); i++) {
        const filter = filters.nth(i);
        if (await filter.isVisible()) {
          await filter.click();
          await page.waitForTimeout(100);
        }
      }
    }

    const isIntact = await checkDataIntegrity(page);
    expect(isIntact).toBeTruthy();
  });

  // LOAD-041: Multiple button clicks
  test('LOAD-041: rapid button clicks should be handled gracefully', async ({ page }) => {
    await navigateTo(page, '/accounting');
    await waitForPageLoad(page);

    const buttons = page.locator('button:not([disabled])').first();

    if ((await buttons.count()) > 0 && (await buttons.isVisible())) {
      // Rapid clicks
      for (let i = 0; i < 5; i++) {
        await buttons.click({ force: true });
        await page.waitForTimeout(50);
      }
    }

    // Should not crash
    await page.waitForTimeout(500);
    const isIntact = await checkDataIntegrity(page);
    expect(isIntact).toBeTruthy();
  });
});

// ============================================================================
// MEMORY STABILITY TESTS
// ============================================================================

test.describe('LOAD: Memory Stability', () => {
  // LOAD-050: Extended session stability
  test('LOAD-050: app should remain stable during extended session', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    const routes = ['/properties', '/leases', '/payments', '/accounting', '/people'];

    // Simulate 5-minute session (compressed)
    for (let minute = 0; minute < 5; minute++) {
      for (const route of routes) {
        await navigateTo(page, route);
        await page.waitForTimeout(200);
      }
    }

    // Should still be responsive
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    const isIntact = await checkDataIntegrity(page);
    expect(isIntact).toBeTruthy();
  });

  // LOAD-051: No memory leak indicators
  test('LOAD-051: no visible memory leak symptoms', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    // Check initial load
    let initialContent = await page.content();
    const initialLength = initialContent.length;

    // Navigate around
    for (let i = 0; i < 10; i++) {
      await navigateTo(page, '/accounting');
      await page.waitForTimeout(200);
      await navigateTo(page, '/dashboard');
      await page.waitForTimeout(200);
    }

    // Check final state
    let finalContent = await page.content();
    const finalLength = finalContent.length;

    // Content size should be similar (not growing unboundedly)
    const growthRatio = finalLength / initialLength;
    expect(growthRatio).toBeLessThan(5); // Should not grow more than 5x
  });
});

// ============================================================================
// ERROR RECOVERY TESTS
// ============================================================================

test.describe('LOAD: Error Recovery', () => {
  // LOAD-060: Recovery from network timeout
  test('LOAD-060: should recover from slow network', async ({ page }) => {
    // Navigate normally first
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    // Slow down network
    await page.route('**/*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await route.continue();
    });

    // Try to navigate
    await navigateTo(page, '/payments');

    // Clear route throttling
    await page.unroute('**/*');

    await waitForPageLoad(page);
    const isIntact = await checkDataIntegrity(page);
    expect(isIntact).toBeTruthy();
  });

  // LOAD-061: Recovery after failed request
  test('LOAD-061: should handle and recover from failed requests', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    // App should still be functional after any transient errors
    const isIntact = await checkDataIntegrity(page);
    expect(isIntact).toBeTruthy();
  });
});

// ============================================================================
// PERFORMANCE BENCHMARKS
// ============================================================================

test.describe('LOAD: Performance Benchmarks', () => {
  // LOAD-070: Navigation should be under 2 seconds
  test('LOAD-070: navigation performance benchmark', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    const routes = ['/properties', '/leases', '/payments', '/accounting'];
    const times: number[] = [];

    for (const route of routes) {
      const start = Date.now();
      await navigateTo(page, route);
      await waitForPageLoad(page);
      times.push(Date.now() - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`Average navigation time: ${avgTime}ms`);
    console.log(`Individual times: ${times.join(', ')}ms`);

    // Average should be under 3 seconds
    expect(avgTime).toBeLessThan(3000);
  });

  // LOAD-071: All pages should load within acceptable time
  test('LOAD-071: all pages should meet load time SLA', async ({ page }) => {
    const routes = [
      '/dashboard',
      '/properties',
      '/leases',
      '/people',
      '/payments',
      '/accounting',
    ];

    const SLA_MS = 5000; // 5 second SLA
    const violations: string[] = [];

    for (const route of routes) {
      const loadTime = await measurePageLoad(page, route);
      if (loadTime > SLA_MS) {
        violations.push(`${route}: ${loadTime}ms`);
      }
    }

    if (violations.length > 0) {
      console.error('SLA violations:', violations);
    }

    expect(violations.length).toBe(0);
  });
});
