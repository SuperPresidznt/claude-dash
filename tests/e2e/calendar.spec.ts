import { test, expect } from '@playwright/test';

test.describe('Calendar Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth session
    await page.goto('/calendar');
  });

  test('should display calendar view', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Calendar');
  });

  test('should switch between month, week, and day views', async ({ page }) => {
    // Click week view
    await page.click('button:has-text("Week")');
    await expect(page.locator('text=Week of')).toBeVisible();

    // Click month view
    await page.click('button:has-text("Month")');
    // Should show month name

    // Click day view
    await page.click('button:has-text("Day")');
    // Should show single day
  });

  test('should navigate to previous and next periods', async ({ page }) => {
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Previous")');
    await page.click('button:has-text("Today")');
  });

  test('should open sync settings', async ({ page }) => {
    await page.click('button:has-text("Sync Settings")');
    await expect(page.locator('text=Calendar Sync Settings')).toBeVisible();
  });
});
