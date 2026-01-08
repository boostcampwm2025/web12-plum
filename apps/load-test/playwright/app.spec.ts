import { test, expect } from '@playwright/test';

test('landing page has title', async ({ page }) => {
  await page.goto('/');

  // 타이틀 확인 (실제 앱의 타이틀로 변경 필요)
  await expect(page).toHaveTitle(/PLUM/);
});

test('can join a room', async ({ page }) => {
  await page.goto('/');
  // 여기에 방 입장 로직 작성
  // await page.getByPlaceholder('Room ID').fill('test-room');
  // await page.getByRole('button', { name: 'Join' }).click();
  // await expect(page).toHaveURL(/room\/test-room/);
});

// 여기에 추가 부하 테스트 시나리오 작성
