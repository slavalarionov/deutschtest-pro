import { test, expect, type Page } from '@playwright/test'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { stringToBase64URL, createChunks } from '@supabase/ssr'

/**
 * Smoke-тест golden path прохождения Lesen-экзамена на продакшене.
 *
 * Страховка от регрессий перед миграцией ExamShell на Phase 3 дизайн.
 * Проверяет: login → dashboard → ModuleLauncher → /exam/[id] → 5 Teil'ов →
 *            Abgeben → /exam/[id]/results.
 *
 * Селекторы — по видимому тексту / роли / структуре (никаких className),
 * чтобы тест пережил редизайн модулей на editorial-язык.
 *
 * Credentials читаются из env:
 *   - PLAYWRIGHT_TEST_EMAIL
 *   - PLAYWRIGHT_TEST_PASSWORD
 * Если не заданы — тест скипается.
 *
 * Логин через Supabase SDK (Turnstile и hydration race в headless).
 * Страница результатов рендерится на preferred_language юзера — тест
 * читает статус через data-testid, не матчит текст.
 */

const EMAIL = process.env.PLAYWRIGHT_TEST_EMAIL
const PASSWORD = process.env.PLAYWRIGHT_TEST_PASSWORD
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Парсит mm:ss → секунды. Возвращает null, если формат не распознан.
function parseMmSs(text: string): number | null {
  const match = text.match(/(\d{1,2}):(\d{2})/)
  if (!match) return null
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10)
}

// Регистрирует листенеры на JS-ошибки и 5xx-ответы.
// Любая JS-ошибка или 5xx проваливает тест.
function installFailFastListeners(page: Page) {
  page.on('pageerror', (err) => {
    throw new Error(`[pageerror] ${err.message}\n${err.stack ?? ''}`)
  })
  page.on('response', (res) => {
    const status = res.status()
    if (status >= 500 && status < 600) {
      // Игнорируем сторонние домены (аналитика, шрифты и т.п.)
      const url = res.url()
      if (url.includes('deutschtest.pro') || url.startsWith('/')) {
        throw new Error(`[${status}] ${res.request().method()} ${url}`)
      }
    }
  })
}

// Кликает первую доступную кнопку-ответ в каждой task-карточке текущего Teil'а.
// Task-карточки помечены data-testid="exam-task" (см. components/modules/LesenModule.tsx).
// Пример (data-testid отсутствует) и уже отправленные (submitted → disabled) — пропускаем.
async function answerAllTasksInCurrentTeil(page: Page) {
  const tasks = page.getByTestId('exam-task')
  const count = await tasks.count()
  for (let i = 0; i < count; i++) {
    const task = tasks.nth(i)
    const firstEnabled = task.locator('button:not([disabled])').first()
    if ((await firstEnabled.count()) === 0) continue
    try {
      await firstEnabled.click({ timeout: 2000 })
    } catch {
      // Silent: кнопка может быть вне viewport или уже отправлена.
    }
  }
}

test.describe('Lesen exam golden path', () => {
  test.setTimeout(180_000)

  test.skip(
    !EMAIL || !PASSWORD || !SUPABASE_URL || !SUPABASE_ANON_KEY,
    'PLAYWRIGHT_TEST_EMAIL/PASSWORD or NEXT_PUBLIC_SUPABASE_* not set',
  )

  // Логин через Supabase SDK в Node — обход UI-формы, которую в headless
  // блокирует bot-detection (default form-submit вместо React handler после
  // клика по кнопке при свежей сессии). Инжектим cookies формата @supabase/ssr
  // в browser context до первого page.goto, чтобы middleware сразу видел
  // залогиненного пользователя.
  test.beforeEach(async ({ context }) => {
    const supabase = createSupabaseClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: EMAIL!,
      password: PASSWORD!,
    })
    if (error || !data.session) {
      throw new Error(`SDK auth failed: ${error?.message ?? 'no session'}`)
    }

    const projectRef = new URL(SUPABASE_URL!).hostname.split('.')[0]
    const storageKey = `sb-${projectRef}-auth-token`
    const sessionJson = JSON.stringify({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      expires_at: data.session.expires_at,
      token_type: data.session.token_type,
      user: data.session.user,
    })
    const encoded = `base64-${stringToBase64URL(sessionJson)}`
    const chunks = createChunks(storageKey, encoded)

    await context.addCookies(
      chunks.map(({ name, value }) => ({
        name,
        value,
        domain: '.deutschtest.pro',
        path: '/',
        sameSite: 'Lax' as const,
        secure: true,
        expires: Math.floor(Date.now() / 1000) + 34_560_000,
      })),
    )
  })

  test('B1 Lesen: dashboard → generate → 5 Teils → submit → results', async ({
    page,
  }) => {
    installFailFastListeners(page)

    // ────────────────────────────────────────────────────────────────
    // 1. Dashboard (уже залогинены через beforeEach)
    // ────────────────────────────────────────────────────────────────
    await page.goto('/dashboard', { timeout: 30_000, waitUntil: 'domcontentloaded' })
    await page.waitForURL(/\/dashboard(\/|$|\?)/, { timeout: 10_000 })

    // ────────────────────────────────────────────────────────────────
    // 2. Dashboard → ModuleLauncher → B1 + Lesen + Starten
    // ────────────────────────────────────────────────────────────────
    // Phase 3 редизайн ModuleLauncher: визуальный текст label/description
    // рендерится внутри <button> разными div'ами, поэтому accessible name
    // выглядит как "B1\nBeginner" и /^B1$/ не матчит. Используем data-testid
    // из components/dashboard/ModuleLauncher.tsx — они стабильны к редизайну.
    const b1Button = page.getByTestId('level-b1')
    await expect(b1Button).toBeVisible({ timeout: 10_000 })
    await b1Button.click()

    const lesenButton = page.getByTestId('module-lesen')
    await expect(lesenButton).toBeVisible({ timeout: 5_000 })
    await lesenButton.click()

    const startButton = page.getByTestId('launch-exam-start')
    await expect(startButton).toBeEnabled({ timeout: 5_000 })
    await startButton.click()

    // ────────────────────────────────────────────────────────────────
    // 3. Ждём редирект на /exam/[sessionId] (генерация B1 Lesen — 5 текстов
    //    + вопросы через Claude, реально 30-60с на холодный кеш).
    // ────────────────────────────────────────────────────────────────
    await page.waitForURL(/\/exam\/[0-9a-f-]{8,}(?!.*\/results)/, {
      timeout: 60_000,
    })

    // Таймер: mm:ss внутри exam-timer.
    const timerLocator = page.getByTestId('exam-timer')
    await expect(timerLocator).toBeVisible({ timeout: 30_000 })

    // Первый Teil — заголовок h3 «Teil 1».
    await expect(
      page.locator('h3', { hasText: /^Teil 1$/ }).first(),
    ).toBeVisible({ timeout: 10_000 })

    // ────────────────────────────────────────────────────────────────
    // 4. Таймер должен тикать (уменьшаться)
    // ────────────────────────────────────────────────────────────────
    const timerText1 = (await timerLocator.textContent()) ?? ''
    const t1 = parseMmSs(timerText1)
    expect(t1, `parse initial timer "${timerText1}"`).not.toBeNull()

    await page.waitForTimeout(3_100)

    const timerText2 = (await timerLocator.textContent()) ?? ''
    const t2 = parseMmSs(timerText2)
    expect(t2, `parse second timer "${timerText2}"`).not.toBeNull()
    expect(
      t2!,
      `timer did not decrease: ${timerText1} → ${timerText2}`,
    ).toBeLessThan(t1!)

    // ────────────────────────────────────────────────────────────────
    // 5. Проходим 5 Teil'ов
    // ────────────────────────────────────────────────────────────────
    for (let teil = 0; teil < 5; teil++) {
      // Ждём заголовок текущего Teil'а.
      const teilHeader = page
        .locator('h3', { hasText: new RegExp(`^Teil ${teil + 1}$`) })
        .first()
      await expect(teilHeader).toBeVisible({ timeout: 5_000 })

      // Отвечаем на все задания в этом Teil'е.
      await answerAllTasksInCurrentTeil(page)

      if (teil < 4) {
        const nextBtn = page.getByTestId('nav-weiter')
        await expect(nextBtn).toBeEnabled({ timeout: 5_000 })
        await nextBtn.click()
      } else {
        const submitBtn = page.getByTestId('nav-abgeben')
        await expect(submitBtn).toBeVisible({ timeout: 5_000 })
        await expect(submitBtn).toBeEnabled({ timeout: 5_000 })
        await submitBtn.click()
      }
    }

    // ────────────────────────────────────────────────────────────────
    // 6. Ждём окончания scoring (20-30с через Claude) и переход на /results.
    // ────────────────────────────────────────────────────────────────
    // После submit LesenModule рендерит кнопку nav-to-results только когда
    // /api/exam/submit вернулся с ответом. Автоматического редиректа нет —
    // клик обязателен.
    const toResultsBtn = page.getByTestId('nav-to-results')
    await expect(toResultsBtn).toBeVisible({ timeout: 45_000 })
    await toResultsBtn.click()

    await page.waitForURL(/\/exam\/[0-9a-f-]{8,}\/results(\/|$|\?)/, {
      timeout: 15_000,
    })

    // ────────────────────────────────────────────────────────────────
    // 7. Страница результатов: score 0-100 + статус (pass/fail)
    // ────────────────────────────────────────────────────────────────
    // Тест не проверяет значения (сдал/не сдал зависит от ответов), только
    // что элементы отрендерились. data-testid вместо текста — устойчиво к
    // локали (аккаунт может быть ru/de/en/tr).
    const statusEl = page.getByTestId('result-status')
    await expect(statusEl).toBeVisible({ timeout: 15_000 })
    const passedAttr = await statusEl.getAttribute('data-passed')
    expect(passedAttr).toMatch(/^(true|false)$/)

    const scoreEl = page.getByTestId('result-score-value')
    await expect(scoreEl).toBeVisible({ timeout: 5_000 })
    const scoreText = (await scoreEl.textContent()) ?? ''
    const score = Number(scoreText.replace(/\D/g, ''))
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})
