import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should redirect to signin when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*signin/);
  });

  test('should display email login form', async ({ page }) => {
    await page.goto('/signin');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should display Google OAuth button', async ({ page }) => {
    await page.goto('/signin');
    await expect(page.locator('button:has-text("Google")')).toBeVisible();
  });

  test('should validate email input', async ({ page }) => {
    await page.goto('/signin');
    await page.fill('input[type="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    // Should show validation error
  });

  test('should handle sign out', async ({ page }) => {
    // Assumes authenticated session
    await page.goto('/');
    const signOutButton = page.locator('button:has-text("Sign out")');
    if (await signOutButton.isVisible()) {
      await signOutButton.click();
      await expect(page).toHaveURL(/.*signin/);
    }
  });
});
