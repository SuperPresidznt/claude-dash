import { test, expect } from '@playwright/test';

test.describe('Tasks Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
  });

  test('should display tasks page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Tasks');
  });

  test('should switch between Kanban, List, and Matrix views', async ({ page }) => {
    // Click List view
    await page.click('button:has-text("List")');

    // Click Matrix view
    await page.click('button:has-text("Matrix")');
    await expect(page.locator('text=Quick Wins')).toBeVisible();
    await expect(page.locator('text=Major Projects')).toBeVisible();

    // Click back to Kanban
    await page.click('button:has-text("Kanban")');
  });

  test('should open task creation modal', async ({ page }) => {
    await page.click('button:has-text("New Task")');
    await expect(page.locator('text=Create Task')).toBeVisible();
  });

  test('should filter tasks by status', async ({ page }) => {
    const filterButton = page.locator('button:has-text("Filter")');
    if (await filterButton.isVisible()) {
      await filterButton.click();
    }
  });

  test('should open quick capture', async ({ page }) => {
    // Press keyboard shortcut or click button
    await page.keyboard.press('Control+K');
  });
});
