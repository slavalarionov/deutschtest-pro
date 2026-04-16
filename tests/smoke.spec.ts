import { test, expect } from '@playwright/test';

test('landing page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/DeutschTest/i);
});

test('login page loads', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('form')).toBeVisible();
});

test('pricing page loads', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.locator('body')).toContainText(/Modul/i);
});
