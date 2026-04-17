import { test, expect } from '@playwright/test';

// Flow 1: Главная страница
test.describe('Flow 1: Landing page', () => {
  test('hero section renders with title and CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/DeutschTest/i);
    // Hero заголовок
    const hero = page.locator('h1').first();
    await expect(hero).toBeVisible();
    // CTA кнопка
    const cta = page.locator('a[href*="register"], a[href*="login"], button').filter({ hasText: /start|begin|jetzt|test|gratis|free|kostenlos|registr/i }).first();
    await expect(cta).toBeVisible();
  });

  test('features section visible', async ({ page }) => {
    await page.goto('/');
    // Ищем секцию с фичами — обычно содержит текст о модулях
    const body = page.locator('body');
    await expect(body).toContainText(/Lesen|Hören|Schreiben|Sprechen|A1|A2|B1/i);
  });

  test('navigation links present', async ({ page }) => {
    await page.goto('/');
    // Ссылка на pricing
    const pricingLink = page.locator('a[href*="pricing"]').first();
    await expect(pricingLink).toBeVisible();
    // Ссылка на login
    const loginLink = page.locator('a[href*="login"]').first();
    await expect(loginLink).toBeVisible();
  });
});

// Flow 2: Страница /pricing
test.describe('Flow 2: Pricing page', () => {
  test('pricing page loads and shows tariffs', async ({ page }) => {
    await page.goto('/pricing');
    const body = page.locator('body');
    await expect(body).toContainText(/Modul|modul|€|₽|\$/i);
  });
});

// Flow 3: Страница /login
test.describe('Flow 3: Login page', () => {
  test('login form renders', async ({ page }) => {
    await page.goto('/login');
    const form = page.locator('form').first();
    await expect(form).toBeVisible();
  });

  test('login page has email input', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();
  });

  test('login page has Google OAuth button', async ({ page }) => {
    await page.goto('/login');
    const googleBtn = page.locator('button, a').filter({ hasText: /google/i }).first();
    await expect(googleBtn).toBeVisible();
  });

  test('login page has link to register', async ({ page }) => {
    await page.goto('/login');
    const registerLink = page.locator('a[href*="register"]').first();
    await expect(registerLink).toBeVisible();
  });
});

// Flow 4: Страница /register
test.describe('Flow 4: Register page', () => {
  test('register page loads', async ({ page }) => {
    await page.goto('/register');
    const body = page.locator('body');
    // Либо форма регистрации, либо редирект на login — оба варианта приемлемы
    await expect(body).not.toContainText(/500|Internal Server Error/i);
  });

  test('register form or redirect renders correctly', async ({ page }) => {
    await page.goto('/register');
    // Проверяем — либо есть форма, либо редиректнуло на /login
    const url = page.url();
    const hasForm = await page.locator('form').count();
    const isRedirectedToLogin = url.includes('/login');
    expect(hasForm > 0 || isRedirectedToLogin).toBeTruthy();
  });
});

// Flow 5: Страница /admin без авторизации
test.describe('Flow 5: Admin page redirect', () => {
  test('admin page redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url).toContain('/login');
  });
});
