import { test, expect } from '@playwright/test';

test.describe('Plum App', () => {
  test('홈 페이지 메시지 표시', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: /강의는 놀이처럼/ })).toBeVisible();
    await expect(page.getByRole('button', { name: '강의하러 가기' })).toBeVisible();
  });

  test('페이지 타이틀 확인', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Plum/i);
  });
});
