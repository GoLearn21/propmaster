/**
 * E2E Tests for People Management Page
 * Tests all CRUD operations and form interactions for Tenants, Owners, Vendors, and Prospects
 */

import { test, expect } from '@playwright/test';

test.describe('People Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to People page before each test
    await page.goto('/people');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Tenants Tab', () => {
    test('should display tenants tab and statistics', async ({ page }) => {
      // Click on Tenants tab
      await page.click('text=Tenants');
      
      // Wait for content to load
      await page.waitForSelector('text=Balance Due', { timeout: 10000 });
      
      // Verify statistics cards are present
      await expect(page.locator('text=Balance Due')).toBeVisible();
      await expect(page.locator('text=Missing Contact Info')).toBeVisible();
    });

    test('should create a new tenant', async ({ page }) => {
      // Click Tenants tab
      await page.click('text=Tenants');
      
      // Click New Tenant button
      await page.click('button:has-text("New Tenant")');
      
      // Wait for modal to appear
      await page.waitForSelector('text=New tenant', { timeout: 5000 });
      
      // Fill in the form
      await page.fill('input[type="text"]', 'John');
      await page.fill('input[type="text"]', 'Doe', { nth: 1 });
      await page.fill('input[type="email"]', 'john.doe@test.com');
      await page.fill('input[type="tel"]', '555-1234');
      
      // Submit the form
      await page.click('button:has-text("Create")');
      
      // Wait for success message
      await expect(page.locator('text=created successfully')).toBeVisible({ timeout: 10000 });
    });

    test('should edit an existing tenant', async ({ page }) => {
      // Click Tenants tab
      await page.click('text=Tenants');
      
      // Wait for tenant list to load
      await page.waitForSelector('table', { timeout: 10000 });
      
      // Click on the first tenant row
      const firstRow = page.locator('tbody tr').first();
      await firstRow.click();
      
      // Wait for details modal
      await page.waitForSelector('text=Tenant Details', { timeout: 5000 });
      
      // Click Edit Details button
      await page.click('button:has-text("Edit Details")');
      
      // Modify phone number
      const phoneInput = page.locator('input[type="tel"]');
      await phoneInput.clear();
      await phoneInput.fill('555-9999');
      
      // Save changes
      await page.click('button:has-text("Save Changes")');
      
      // Wait for success message
      await expect(page.locator('text=updated successfully')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Owners Tab', () => {
    test('should create a new owner', async ({ page }) => {
      // Click Owners tab
      await page.click('text=Owners');
      
      // Click New Owner button
      await page.click('button:has-text("New Owner")');
      
      // Wait for modal
      await page.waitForSelector('text=New owner', { timeout: 5000 });
      
      // Fill form
      await page.fill('input[type="text"]', 'Jane');
      await page.fill('input[type="text"]', 'Smith', { nth: 1 });
      await page.fill('input[type="email"]', 'jane.smith@test.com');
      await page.fill('input[type="tel"]', '555-5678');
      await page.fill('text=Company >> input', 'Smith Properties');
      
      // Submit
      await page.click('button:has-text("Create")');
      
      // Verify success
      await expect(page.locator('text=created successfully')).toBeVisible({ timeout: 10000 });
    });

    test('should edit an existing owner', async ({ page }) => {
      // Click Owners tab
      await page.click('text=Owners');
      
      // Wait for list
      await page.waitForSelector('table', { timeout: 10000 });
      
      // Click first owner
      await page.locator('tbody tr').first().click();
      
      // Wait for modal
      await page.waitForSelector('text=Owner Details', { timeout: 5000 });
      
      // Click Edit
      await page.click('button:has-text("Edit Details")');
      
      // Update email
      const emailInput = page.locator('input[type="email"]');
      await emailInput.clear();
      await emailInput.fill('updated.owner@test.com');
      
      // Save
      await page.click('button:has-text("Save Changes")');
      
      // Verify
      await expect(page.locator('text=updated successfully')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Vendors Tab', () => {
    test('should create a new vendor', async ({ page }) => {
      // Click Vendors tab
      await page.click('text=Vendors');
      
      // Click New Vendor button
      await page.click('button:has-text("New Vendor")');
      
      // Fill form
      await page.fill('input[type="text"]', 'ABC');
      await page.fill('input[type="text"]', 'Maintenance', { nth: 1 });
      await page.fill('input[type="email"]', 'abc@maintenance.com');
      await page.fill('text=Business Name >> input', 'ABC Maintenance LLC');
      
      // Submit
      await page.click('button:has-text("Create")');
      
      // Verify
      await expect(page.locator('text=created successfully')).toBeVisible({ timeout: 10000 });
    });

    test('should edit an existing vendor', async ({ page }) => {
      // Click Vendors tab
      await page.click('text=Vendors');
      
      // Click first vendor
      await page.waitForSelector('table', { timeout: 10000 });
      await page.locator('tbody tr').first().click();
      
      // Edit
      await page.waitForSelector('text=Vendor Details', { timeout: 5000 });
      await page.click('button:has-text("Edit Details")');
      
      // Update company name
      const companyInput = page.locator('text=Business Name >> following-sibling::input');
      await companyInput.clear();
      await companyInput.fill('New Business Name LLC');
      
      // Save
      await page.click('button:has-text("Save Changes")');
      
      // Verify
      await expect(page.locator('text=updated successfully')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Prospects Tab - Multi-Step Form', () => {
    test('should navigate through all prospect form steps', async ({ page }) => {
      // Click Prospects tab
      await page.click('text=Prospects');
      
      // Click New Prospect button
      await page.click('button:has-text("New Prospect")');
      
      // Wait for the multi-step modal
      await page.waitForSelector('text=New Prospect', { timeout: 5000 });
      await page.waitForSelector('text=PERSONAL INFO', { timeout: 5000 });
      
      // Step 1: Personal Info
      await page.fill('input[placeholder*="First"]', 'Sarah');
      await page.fill('input[placeholder*="M.I."]', 'K');
      await page.fill('input[placeholder*="Last"]', 'Wilson');
      await page.fill('input[type="date"]', '1990-05-15');
      await page.fill('input[placeholder*="XXX-XX-XXXX"]', '123-45-6789');
      await page.fill('text=Company >> following-sibling::input', 'Tech Corp');
      await page.fill('text=Job Title >> following-sibling::input', 'Engineer');
      
      // Navigate to Contact Info
      await page.click('button:has-text("Next")');
      await page.waitForSelector('text=CONTACT INFO', { timeout: 5000 });
      
      // Step 2: Contact Info
      await page.fill('input[type="email"]', 'sarah.wilson@test.com');
      await page.fill('input[type="tel"]', '555-7890');
      await page.fill('textarea', 'Interested in 2-bedroom apartment');
      
      // Navigate to Address
      await page.click('button:has-text("Next")');
      await page.waitForSelector('text=ADDRESS', { timeout: 5000 });
      
      // Step 3: Address
      await page.fill('text=Street Address >> following-sibling::input', '123 Main St');
      await page.fill('text=City >> following-sibling::input', 'Portland');
      await page.fill('text=State >> following-sibling::input', 'OR');
      await page.fill('text=ZIP Code >> following-sibling::input', '97201');
      
      // Navigate to Alternate Address
      await page.click('button:has-text("Next")');
      
      // Skip Alternate Address
      await page.click('button:has-text("Next")');
      
      // Step 5: Marketing Profile
      await page.waitForSelector('text=MARKETING PROFILE', { timeout: 5000 });
      await page.selectOption('select', 'website');
      
      // Navigate to Pets
      await page.click('button:has-text("Next")');
      await page.waitForSelector('text=PETS', { timeout: 5000 });
      
      // Step 6: Pets
      await page.check('input[type="checkbox"]#has_pets');
      await page.fill('text=Pet Type >> following-sibling::input', 'Dog');
      await page.fill('text=Number of Pets >> following-sibling::input', '1');
      await page.fill('text=Combined Weight >> following-sibling::input', '45');
      
      // Navigate to Vehicles
      await page.click('button:has-text("Next")');
      await page.waitForSelector('text=VEHICLES', { timeout: 5000 });
      
      // Step 7: Vehicles
      await page.check('input[type="checkbox"]#has_vehicles');
      await page.fill('text=Make >> following-sibling::input', 'Toyota');
      await page.fill('text=Model >> following-sibling::input', 'Camry');
      await page.fill('text=Year >> following-sibling::input', '2020');
      await page.fill('text=License Plate >> following-sibling::input', 'ABC123');
      
      // Navigate to Dependents
      await page.click('button:has-text("Next")');
      await page.waitForSelector('text=DEPENDENTS', { timeout: 5000 });
      
      // Step 8: Dependents
      await page.check('input[type="checkbox"]#has_dependents');
      await page.fill('text=Number of Dependents >> following-sibling::input', '2');
      await page.fill('text=Ages >> following-sibling::input', '5, 8');
      
      // Submit the form
      await page.click('button:has-text("Create Prospect")');
      
      // Verify success
      await expect(page.locator('text=created successfully')).toBeVisible({ timeout: 10000 });
    });

    test('should allow navigation back through prospect form steps', async ({ page }) => {
      // Click Prospects tab
      await page.click('text=Prospects');
      
      // Open new prospect form
      await page.click('button:has-text("New Prospect")');
      await page.waitForSelector('text=PERSONAL INFO', { timeout: 5000 });
      
      // Go forward 3 steps
      await page.click('button:has-text("Next")');
      await page.click('button:has-text("Next")');
      await page.click('button:has-text("Next")');
      
      // Now we should be on Alternate Address
      await page.waitForSelector('text=ALTERNATE ADDRESS', { timeout: 5000 });
      
      // Go back
      await page.click('button:has-text("Previous")');
      await page.waitForSelector('text=ADDRESS', { timeout: 5000 });
      
      // Go back again
      await page.click('button:has-text("Previous")');
      await page.waitForSelector('text=CONTACT INFO', { timeout: 5000 });
      
      // Verify we're back on Contact Info
      await expect(page.locator('text=CONTACT INFO')).toBeVisible();
    });

    test('should validate required fields in prospect form', async ({ page }) => {
      // Click Prospects tab
      await page.click('text=Prospects');
      
      // Open form
      await page.click('button:has-text("New Prospect")');
      await page.waitForSelector('text=PERSONAL INFO', { timeout: 5000 });
      
      // Navigate to last step without filling required fields
      for (let i = 0; i < 7; i++) {
        await page.click('button:has-text("Next")');
        await page.waitForTimeout(500);
      }
      
      // Try to submit
      await page.click('button:has-text("Create Prospect")');
      
      // Button should be disabled or form should not submit
      const createButton = page.locator('button:has-text("Create Prospect")');
      await expect(createButton).toBeDisabled();
    });
  });

  test.describe('Search and Filter', () => {
    test('should search for people by name', async ({ page }) => {
      // Search for a tenant
      await page.click('text=Tenants');
      await page.fill('input[placeholder*="Search"]', 'John');
      
      // Wait for search results
      await page.waitForTimeout(1000);
      
      // Verify results contain search term
      const results = await page.locator('tbody tr').count();
      expect(results).toBeGreaterThan(0);
    });
  });

  test.describe('Statistics Dashboard', () => {
    test('should display statistics for each tab', async ({ page }) => {
      // Test Tenants statistics
      await page.click('text=Tenants');
      await expect(page.locator('text=Balance Due')).toBeVisible();
      
      // Test Owners statistics
      await page.click('text=Owners');
      await expect(page.locator('text=Total Owners')).toBeVisible();
      
      // Test Vendors statistics
      await page.click('text=Vendors');
      await expect(page.locator('text=Active Vendors')).toBeVisible();
      
      // Test Prospects statistics
      await page.click('text=Prospects');
      await expect(page.locator('text=New Prospects')).toBeVisible();
    });
  });
});
