import { test, expect } from '@playwright/test';

test.describe('Plum App', () => {
  test('홈 페이지 메시지 표시', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('text=PLUM에 오신 것을 환영합니다')).toBeVisible();
  });

  test('페이지 타이틀 확인', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Plum/i);
  });
});
