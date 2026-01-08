import { test, expect } from '@playwright/test';

test.describe('Plum App', () => {
  test('should display Plum App text', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('text=Plum App')).toBeVisible();
  });

  test('should have correct title', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Plum/i);
  });
});
