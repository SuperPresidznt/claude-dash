import { test, expect } from '@playwright/test';

test.describe('Settings Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display settings page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Settings');
  });

  test('should display profile settings form', async ({ page }) => {
    await expect(page.locator('label:has-text("Email")')).toBeVisible();
    await expect(page.locator('label:has-text("Timezone")')).toBeVisible();
    await expect(page.locator('label:has-text("Currency")')).toBeVisible();
  });

  test('should update timezone setting', async ({ page }) => {
    await page.selectOption('select[value*="America"]', 'America/Los_Angeles');
    await page.click('button:has-text("Save Changes")');

    // Should show success message
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('success');
      dialog.accept();
    });
  });

  test('should display session management', async ({ page }) => {
    await expect(page.locator('text=Active Sessions')).toBeVisible();
  });

  test('should display account information', async ({ page }) => {
    await expect(page.locator('text=Account Information')).toBeVisible();
    await expect(page.locator('text=Account ID')).toBeVisible();
    await expect(page.locator('text=Member since')).toBeVisible();
  });
});
