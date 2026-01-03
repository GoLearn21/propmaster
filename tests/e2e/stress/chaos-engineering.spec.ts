/**
 * PropMaster Chaos Engineering E2E Specs
 * Tests system resilience under adverse conditions
 *
 * Test Cases: CHAOS-001 through CHAOS-025
 *
 * Chaos Scenarios:
 * 1. Network interruption and recovery
 * 2. Slow/degraded network performance
 * 3. Failed API responses
 * 4. Timeout simulation
 * 5. Browser resource constraints
 * 6. Unexpected user behavior patterns
 *
 * Resilience Requirements:
 * - Graceful degradation under network issues
 * - No data corruption on failures
 * - User-friendly error messages
 * - Automatic recovery when possible
 * - No NaN or undefined exposed to user
 */

import { test, expect, Page, Route } from '@playwright/test';
import { navigateTo, waitForPageLoad } from '../fixtures/test-fixtures';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check for data corruption indicators
 */
async function checkNoCorruption(page: Page): Promise<boolean> {
  const content = await page.content();
  return (
    !content.includes('NaN') &&
    !content.includes('undefined') &&
    !content.includes('null') &&
    !content.includes('[object Object]')
  );
}

/**
 * Check for user-friendly error handling
 */
async function hasGracefulError(page: Page): Promise<boolean> {
  const content = await page.content().then((c) => c.toLowerCase());
  return (
    content.includes('error') ||
    content.includes('sorry') ||
    content.includes('try again') ||
    content.includes('unavailable') ||
    content.includes('loading')
  );
}

/**
 * Simulate network failure for specific requests
 */
async function simulateNetworkFailure(
  page: Page,
  pattern: string,
  duration: number
): Promise<void> {
  await page.route(pattern, async (route) => {
    await route.abort('failed');
  });

  await page.waitForTimeout(duration);
  await page.unroute(pattern);
}

// ============================================================================
// NETWORK INTERRUPTION TESTS
// ============================================================================

test.describe('CHAOS: Network Interruption', () => {
  // CHAOS-001: App should handle network offline gracefully
  test('CHAOS-001: should handle going offline gracefully', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    // Simulate offline
    await page.route('**/*', (route) => route.abort('failed'));

    // Try to navigate (should fail gracefully)
    try {
      await navigateTo(page, '/payments');
      await page.waitForTimeout(2000);
    } catch {
      // Expected to fail
    }

    // Restore network
    await page.unroute('**/*');

    // Recovery navigation
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    const isClean = await checkNoCorruption(page);
    expect(isClean).toBeTruthy();
  });

  // CHAOS-002: Intermittent network failures
  test('CHAOS-002: should handle intermittent network failures', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    // Simulate intermittent failures (50% of requests fail)
    let requestCount = 0;
    await page.route('**/api/**', async (route) => {
      requestCount++;
      if (requestCount % 2 === 0) {
        await route.abort('failed');
      } else {
        await route.continue();
      }
    });

    // Navigate around
    try {
      await navigateTo(page, '/accounting');
      await page.waitForTimeout(1000);
    } catch {
      // Some failures expected
    }

    await page.unroute('**/api/**');

    // App should still be functional
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    const isClean = await checkNoCorruption(page);
    expect(isClean).toBeTruthy();
  });

  // CHAOS-003: Network recovery after extended outage
  test('CHAOS-003: should recover after extended network outage', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    // Block all network
    await page.route('**/*', (route) => route.abort('failed'));

    // Wait for "extended" outage (5 seconds)
    await page.waitForTimeout(5000);

    // Restore network
    await page.unroute('**/*');

    // Should be able to navigate successfully
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    const isClean = await checkNoCorruption(page);
    expect(isClean).toBeTruthy();
  });
});

// ============================================================================
// SLOW NETWORK TESTS
// ============================================================================

test.describe('CHAOS: Slow Network', () => {
  // CHAOS-010: App should handle very slow responses
  test('CHAOS-010: should handle slow API responses', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    // Simulate slow network (2 second delay)
    await page.route('**/api/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });

    // Navigate
    await navigateTo(page, '/payments');

    // Wait for eventual load
    await page.waitForTimeout(3000);

    await page.unroute('**/api/**');

    const isClean = await checkNoCorruption(page);
    expect(isClean).toBeTruthy();
  });

  // CHAOS-011: Progressive slowdown should not cause corruption
  test('CHAOS-011: progressive slowdown should not corrupt data', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    let delay = 100;

    await page.route('**/api/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay += 100; // Progressively slower
      await route.continue();
    });

    // Navigate multiple times
    await navigateTo(page, '/accounting');
    await page.waitForTimeout(500);
    await navigateTo(page, '/payments');
    await page.waitForTimeout(500);

    await page.unroute('**/api/**');

    const isClean = await checkNoCorruption(page);
    expect(isClean).toBeTruthy();
  });
});

// ============================================================================
// API ERROR RESPONSE TESTS
// ============================================================================

test.describe('CHAOS: API Error Responses', () => {
  // CHAOS-020: Should handle 500 errors gracefully
  test('CHAOS-020: should handle 500 Internal Server Error', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    // Return 500 for some API calls
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    // Navigate
    try {
      await navigateTo(page, '/payments');
      await page.waitForTimeout(2000);
    } catch {
      // Expected
    }

    await page.unroute('**/api/**');

    // App should show error state, not NaN
    const isClean = await checkNoCorruption(page);
    expect(isClean).toBeTruthy();
  });

  // CHAOS-021: Should handle 404 errors gracefully
  test('CHAOS-021: should handle 404 Not Found', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 404,
        body: JSON.stringify({ error: 'Not Found' }),
      });
    });

    try {
      await navigateTo(page, '/accounting');
      await page.waitForTimeout(2000);
    } catch {
      // Expected
    }

    await page.unroute('**/api/**');

    const isClean = await checkNoCorruption(page);
    expect(isClean).toBeTruthy();
  });

  // CHAOS-022: Should handle malformed JSON responses
  test('CHAOS-022: should handle malformed API responses', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 200,
        body: 'not valid json {{{',
        contentType: 'application/json',
      });
    });

    try {
      await navigateTo(page, '/payments');
      await page.waitForTimeout(2000);
    } catch {
      // Expected
    }

    await page.unroute('**/api/**');

    // Should not show NaN even with malformed data
    const isClean = await checkNoCorruption(page);
    expect(isClean).toBeTruthy();
  });

  // CHAOS-023: Should handle empty responses
  test('CHAOS-023: should handle empty API responses', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 200,
        body: '',
      });
    });

    try {
      await navigateTo(page, '/accounting');
      await page.waitForTimeout(2000);
    } catch {
      // Expected
    }

    await page.unroute('**/api/**');

    const isClean = await checkNoCorruption(page);
    expect(isClean).toBeTruthy();
  });

  // CHAOS-024: Should handle null/undefined in API response
  test('CHAOS-024: should handle null values in API response', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          data: null,
          items: [null, undefined],
          amount: null,
          balance: undefined,
        }),
        contentType: 'application/json',
      });
    });

    try {
      await navigateTo(page, '/payments');
      await page.waitForTimeout(2000);
    } catch {
      // Expected
    }

    await page.unroute('**/api/**');

    // Should handle null gracefully without showing "null" or "undefined"
    const isClean = await checkNoCorruption(page);
    expect(isClean).toBeTruthy();
  });
});

// ============================================================================
// TIMEOUT SIMULATION TESTS
// ============================================================================

test.describe('CHAOS: Timeout Scenarios', () => {
  // CHAOS-030: API timeout handling
  test('CHAOS-030: should handle API timeouts', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    // Never respond (infinite hang)
    await page.route('**/api/**', async (route) => {
      // Don't call continue() or fulfill() - simulates hanging
      await new Promise(() => {}); // Never resolves
    });

    // Navigate and wait for timeout
    try {
      await Promise.race([
        navigateTo(page, '/payments'),
        new Promise((resolve) => setTimeout(resolve, 5000)), // 5 second timeout
      ]);
    } catch {
      // Expected
    }

    await page.unroute('**/api/**');

    // Recover
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    const isClean = await checkNoCorruption(page);
    expect(isClean).toBeTruthy();
  });
});

// ============================================================================
// BROWSER RESOURCE CONSTRAINT TESTS
// ============================================================================

test.describe('CHAOS: Browser Resource Constraints', () => {
  // CHAOS-040: Memory pressure simulation
  test('CHAOS-040: should handle memory pressure', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    // Simulate memory pressure by creating many DOM elements
    await page.evaluate(() => {
      const elements: HTMLDivElement[] = [];
      for (let i = 0; i < 1000; i++) {
        const div = document.createElement('div');
        div.textContent = 'Memory pressure test ' + i;
        elements.push(div);
      }
    });

    // Navigate and verify stability
    await navigateTo(page, '/accounting');
    await waitForPageLoad(page);

    const isClean = await checkNoCorruption(page);
    expect(isClean).toBeTruthy();
  });

  // CHAOS-041: Rapid state changes
  test('CHAOS-041: rapid state changes should not cause corruption', async ({ page }) => {
    await navigateTo(page, '/accounting');
    await waitForPageLoad(page);

    // Rapidly interact with elements
    const buttons = page.locator('button:visible');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      try {
        await button.click({ timeout: 100 });
      } catch {
        // Ignore click failures
      }
    }

    await page.waitForTimeout(500);

    const isClean = await checkNoCorruption(page);
    expect(isClean).toBeTruthy();
  });
});

// ============================================================================
// UNEXPECTED USER BEHAVIOR TESTS
// ============================================================================

test.describe('CHAOS: Unexpected User Behavior', () => {
  // CHAOS-050: Double-click on navigation
  test('CHAOS-050: double-click on navigation should not break app', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    const navLinks = page.locator('nav a, [role="navigation"] a').first();

    if ((await navLinks.count()) > 0) {
      await navLinks.dblclick();
    }

    await page.waitForTimeout(1000);

    const isClean = await checkNoCorruption(page);
    expect(isClean).toBeTruthy();
  });

  // CHAOS-051: Clicking during page transition
  test('CHAOS-051: clicking during transition should not break app', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    // Start navigation and immediately click around
    const navigationPromise = navigateTo(page, '/payments');

    // Click randomly during navigation
    await page.mouse.click(100, 100);
    await page.mouse.click(200, 200);
    await page.mouse.click(300, 300);

    await navigationPromise;
    await waitForPageLoad(page);

    const isClean = await checkNoCorruption(page);
    expect(isClean).toBeTruthy();
  });

  // CHAOS-052: Keyboard mashing
  test('CHAOS-052: random keyboard input should not break app', async ({ page }) => {
    await navigateTo(page, '/accounting');
    await waitForPageLoad(page);

    // Random keyboard input
    const keys = ['Tab', 'Enter', 'Escape', 'ArrowDown', 'ArrowUp', ' '];

    for (const key of keys) {
      await page.keyboard.press(key);
      await page.waitForTimeout(50);
    }

    const isClean = await checkNoCorruption(page);
    expect(isClean).toBeTruthy();
  });

  // CHAOS-053: Browser back during form fill
  test('CHAOS-053: browser back during form should not corrupt state', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);
    await navigateTo(page, '/payments');
    await waitForPageLoad(page);

    // Find any input
    const inputs = page.locator('input:visible').first();

    if ((await inputs.count()) > 0) {
      await inputs.fill('test input');
      // Immediately go back
      await page.goBack();
    }

    await page.waitForTimeout(500);

    const isClean = await checkNoCorruption(page);
    expect(isClean).toBeTruthy();
  });
});

// ============================================================================
// DATA INTEGRITY UNDER CHAOS
// ============================================================================

test.describe('CHAOS: Data Integrity', () => {
  // CHAOS-060: Financial data should never show NaN under any chaos
  test('CHAOS-060: financial data should never show NaN', async ({ page }) => {
    const chaosScenarios = [
      async () => {
        // Slow network
        await page.route('**/*', async (route) => {
          await new Promise((r) => setTimeout(r, 500));
          await route.continue();
        });
      },
      async () => {
        // Rapid navigation
        for (let i = 0; i < 5; i++) {
          await navigateTo(page, '/payments');
          await page.waitForTimeout(100);
        }
      },
      async () => {
        // Multiple refreshes
        for (let i = 0; i < 3; i++) {
          await page.reload();
          await page.waitForTimeout(200);
        }
      },
    ];

    for (const scenario of chaosScenarios) {
      await navigateTo(page, '/dashboard');
      await waitForPageLoad(page);

      try {
        await scenario();
      } catch {
        // Chaos expected to potentially fail
      }

      await page.unroute('**/*');
      await navigateTo(page, '/accounting');
      await waitForPageLoad(page);

      const content = await page.content();
      expect(content).not.toContain('$NaN');
      expect(content).not.toContain('NaN%');
    }
  });

  // CHAOS-061: Balance displays should remain valid
  test('CHAOS-061: balance displays should remain valid under chaos', async ({ page }) => {
    await navigateTo(page, '/accounting');
    await waitForPageLoad(page);

    // Cause chaos
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);
    }

    await page.reload();
    await waitForPageLoad(page);

    const content = await page.content();

    // No NaN in any monetary display
    const nanPattern = /\$NaN|\$undefined|NaN%/;
    expect(nanPattern.test(content)).toBeFalsy();
  });
});

// ============================================================================
// RECOVERY VERIFICATION
// ============================================================================

test.describe('CHAOS: Recovery Verification', () => {
  // CHAOS-070: Full chaos and recovery
  test('CHAOS-070: app should fully recover from chaos', async ({ page }) => {
    // Initial state
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    // Apply chaos: failed requests, slow network, rapid navigation
    await page.route('**/api/**', (route) => route.abort('failed'));

    try {
      await navigateTo(page, '/payments');
    } catch {
      // Expected
    }

    await page.unroute('**/api/**');

    // Full recovery
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    // Navigate through all pages to verify recovery
    const pages = ['/properties', '/leases', '/people', '/payments', '/accounting'];

    for (const route of pages) {
      await navigateTo(page, route);
      await waitForPageLoad(page);

      const isClean = await checkNoCorruption(page);
      expect(isClean).toBeTruthy();
    }
  });

  // CHAOS-071: State should be consistent after recovery
  test('CHAOS-071: state should be consistent after chaos recovery', async ({ page }) => {
    await navigateTo(page, '/dashboard');
    await waitForPageLoad(page);

    const initialContent = await page.content();

    // Apply and recover from chaos
    await page.route('**/*', (route) => route.abort());
    await page.waitForTimeout(1000);
    await page.unroute('**/*');

    await page.reload();
    await waitForPageLoad(page);

    const recoveredContent = await page.content();

    // Both should be valid (no NaN)
    expect(initialContent).not.toContain('NaN');
    expect(recoveredContent).not.toContain('NaN');
  });
});
