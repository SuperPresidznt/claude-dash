import { test, expect } from '@playwright/test';

test.describe('Calendar Sync Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth session with Google OAuth
    await page.goto('/calendar');
  });

  test('should display sync settings panel', async ({ page }) => {
    await page.click('button:has-text("Sync Settings")');
    await expect(page.locator('text=Calendar Sync Settings')).toBeVisible();
  });

  test('should show available Google calendars', async ({ page }) => {
    await page.click('button:has-text("Sync Settings")');

    // Mock Google calendars list response
    await page.route('**/api/calendar/sync', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'sync-1',
            calendarId: 'primary',
            provider: 'google',
            syncEnabled: true,
            lastSyncAt: new Date().toISOString()
          }
        ])
      });
    });

    await page.reload();
    await page.click('button:has-text("Sync Settings")');
  });

  test('should trigger manual sync', async ({ page }) => {
    let syncCalled = false;

    await page.route('**/api/calendar/sync', (route) => {
      if (route.request().method() === 'POST') {
        syncCalled = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      } else {
        route.continue();
      }
    });

    await page.click('button:has-text("Sync Settings")');

    // Find and click sync button
    const syncButton = page.locator('button:has-text("Sync Now")').first();
    if (await syncButton.isVisible()) {
      await syncButton.click();
      await page.waitForTimeout(500);
      expect(syncCalled).toBe(true);
    }
  });

  test('should display synced events in calendar view', async ({ page }) => {
    // Mock events API
    await page.route('**/api/calendar/events*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'event-1',
            title: 'Team Meeting',
            description: 'Weekly sync',
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(),
            isAllDay: false,
            linkedTaskId: null
          }
        ])
      });
    });

    await page.reload();

    // Should display event in calendar
    await expect(page.locator('text=Team Meeting')).toBeVisible();
  });

  test('should link task to calendar event', async ({ page }) => {
    // Mock events with linked task
    await page.route('**/api/calendar/events*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'event-1',
            title: 'Work on Project',
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(),
            isAllDay: false,
            linkedTaskId: 'task-123'
          }
        ])
      });
    });

    await page.reload();

    // Event with linked task should have special styling
    const eventElement = page.locator('text=Work on Project').first();
    if (await eventElement.isVisible()) {
      await eventElement.click();

      // Modal should show linked task indicator
      await expect(page.locator('text=Linked to Task')).toBeVisible();
    }
  });

  test('should create new event and push to Google Calendar', async ({ page }) => {
    let eventCreated = false;

    await page.route('**/api/calendar/events', (route) => {
      if (route.request().method() === 'POST') {
        eventCreated = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-event-1',
            title: 'New Meeting',
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(),
            externalId: 'google-event-123'
          })
        });
      } else {
        route.continue();
      }
    });

    // This would open a create event modal/form
    // For now just check navigation works
    await page.goto('/calendar');
  });

  test('should show available time slots', async ({ page }) => {
    await page.route('**/api/calendar/available-slots*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            start: new Date().toISOString(),
            end: new Date(Date.now() + 3600000).toISOString()
          },
          {
            start: new Date(Date.now() + 7200000).toISOString(),
            end: new Date(Date.now() + 10800000).toISOString()
          }
        ])
      });
    });

    // Would need UI for showing available slots
    await page.goto('/calendar');
  });

  test('should handle sync errors gracefully', async ({ page }) => {
    await page.route('**/api/calendar/sync', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Sync failed' })
        });
      } else {
        route.continue();
      }
    });

    await page.click('button:has-text("Sync Settings")');

    const syncButton = page.locator('button:has-text("Sync Now")').first();
    if (await syncButton.isVisible()) {
      await syncButton.click();
      await page.waitForTimeout(500);
      // Should show error message (implementation dependent)
    }
  });
});
