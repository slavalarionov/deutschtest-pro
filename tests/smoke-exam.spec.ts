import { test, expect, type Page, type Locator } from '@playwright/test'
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
 * Локаль прода без префикса = de (defaultLocale, localePrefix='as-needed'),
 * поэтому кнопки: «Starten — B1», «Weiter →», «← Zurück», «Alle Antworten abgeben»,
 * «Bestanden» / «Nicht bestanden».
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

// Выбирает первый доступный (enabled) вариант ответа внутри task-карточки.
// Task-карточки не имеют data-testid, поэтому ищем по структуре:
// в LesenModule каждая задача — это div с кнопками ответов (richtig/falsch, ja/nein, a/b/c, A/B/C/...).
// Кнопки таб-бара и навигации мы исключаем по тексту.
async function answerAllTasksInCurrentTeil(page: Page) {
  // Находим контейнер активного Teil'а — это div со space-y-4, где лежат task-карточки.
  // Идём по всем кнопкам на странице, которые выглядят как ответы, и фильтруем навигацию/таб-бар.
  const NAV_TEXTS = [
    /^← ?Zurück$/i,
    /^Weiter ?→$/i,
    /^Alle Antworten abgeben$/i,
    /^Wird geprüft/i,
    /^Zu den Ergebnissen$/i,
    /^Teil ?\d$/i, // таб-бар
  ]

  // Ждём, пока появится хотя бы один task-level button
  // (кнопки внутри task-карточек имеют короткие лейблы: «richtig», «falsch», «ja», «nein», «a) …», «A», …).
  // Проще всего итерироваться по всем button, фильтруя навигацию.
  const allButtons = page.locator('main button, [class*="max-w-4xl"] button')

  // Fallback: если селектор выше ничего не даёт, берём просто все button в body.
  const buttons: Locator =
    (await allButtons.count()) > 0 ? allButtons : page.locator('button')

  const total = await buttons.count()
  // Группируем кнопки по ближайшему task-контейнеру (rounded-xl p-5 shadow-soft).
  // Упрощённо: по очереди кликаем первую кнопку каждой уникальной «строки задания».
  // Для этого собираем xpath родителя уровня task-карточки и отбираем по одной кнопке на родителя.
  const seenTaskIds = new Set<string>()
  const answeredContainers = new Set<string>()

  for (let i = 0; i < total; i++) {
    const btn = buttons.nth(i)
    const disabled = await btn.isDisabled().catch(() => true)
    if (disabled) continue

    const text = ((await btn.textContent().catch(() => '')) ?? '').trim()
    if (!text) continue
    if (NAV_TEXTS.some((rx) => rx.test(text))) continue

    // Поднимаемся до task-контейнера (ближайший div с rounded-xl).
    // В Playwright нет прямого «closest», поэтому используем evaluate.
    const containerKey = await btn
      .evaluate((el: HTMLElement) => {
        // Находим ближайшего предка с rounded-xl И с position в документе (для уникальности).
        let cur: HTMLElement | null = el
        while (cur && !cur.className?.toString?.().includes('rounded-xl')) {
          cur = cur.parentElement
        }
        if (!cur) return null
        // Генерируем ключ по относительной позиции в DOM.
        const rect = cur.getBoundingClientRect()
        return `${Math.round(rect.top)}-${Math.round(rect.left)}-${Math.round(rect.width)}`
      })
      .catch(() => null)

    if (!containerKey) continue
    if (answeredContainers.has(containerKey)) continue

    // Пытаемся кликнуть. Если не кликается — пропускаем.
    try {
      await btn.click({ timeout: 2000 })
      answeredContainers.add(containerKey)
      seenTaskIds.add(containerKey)
    } catch {
      // Silent: задача может быть примером или уже отправлена.
    }
  }
}

test.describe('Lesen exam golden path', () => {
  test.setTimeout(90_000)

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
    // Уровень B1: кнопка в сетке с видимым текстом "B1" (label = value, не зависит от локали).
    // Используем getByRole для устойчивости к редизайну.
    const b1Button = page.getByRole('button', { name: /^B1$/ }).first()
    await expect(b1Button).toBeVisible({ timeout: 10_000 })
    await b1Button.click()

    // Модуль Lesen: текст «Lesen» в DE/EN/TR. В RU не рендерится (прод без префикса = de).
    // Ограничиваемся exact-match, чтобы не ловить «Lesen-Modul» в хедере таймера.
    const lesenButton = page
      .getByRole('button', { name: /^\s*\d+\s*min\s*Lesen\s*$/i })
      .first()
    // Fallback: если durations не матчатся, ищем просто по «Lesen» как кнопку с иконкой.
    const lesenFallback = page.locator('button').filter({ hasText: /^Lesen$/ })
    if ((await lesenButton.count()) > 0) {
      await lesenButton.click()
    } else if ((await lesenFallback.count()) > 0) {
      await lesenFallback.first().click()
    } else {
      // Последний fallback: любая кнопка, у которой видимый текст включает "Lesen" без суффиксов.
      await page
        .locator('button', { hasText: /Lesen/ })
        .filter({ hasNotText: /Starten|Modul|Zertifikat|abgeben/i })
        .first()
        .click()
    }

    // Starten — кнопка «Starten — B1 Lesen» (формат из i18n: "Starten — {level}").
    const startButton = page.getByRole('button', { name: /^Starten/i }).first()
    await expect(startButton).toBeEnabled({ timeout: 5_000 })
    await startButton.click()

    // ────────────────────────────────────────────────────────────────
    // 3. Ждём редирект на /exam/[sessionId] (генерация до 20-30с)
    // ────────────────────────────────────────────────────────────────
    await page.waitForURL(/\/exam\/[0-9a-f-]{8,}(?!.*\/results)/, {
      timeout: 30_000,
    })

    // Таймер: mm:ss где-то на странице.
    const timerLocator = page.locator('text=/\\d{2}:\\d{2}/').first()
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
        // Weiter →
        const nextBtn = page.getByRole('button', { name: /Weiter/i }).first()
        await expect(nextBtn).toBeEnabled({ timeout: 5_000 })
        await nextBtn.click()
      } else {
        // Abgeben: «Alle Antworten abgeben» на последнем Teil'е.
        const submitBtn = page
          .getByRole('button', { name: /Alle Antworten abgeben/i })
          .first()
        await expect(submitBtn).toBeVisible({ timeout: 5_000 })
        await expect(submitBtn).toBeEnabled({ timeout: 5_000 })
        await submitBtn.click()
      }
    }

    // ────────────────────────────────────────────────────────────────
    // 6. Редирект на /results или кнопка «Zu den Ergebnissen»
    // ────────────────────────────────────────────────────────────────
    // После submit LesenModule показывает кнопку «Zu den Ergebnissen» (setPostSubmit).
    // Переход на /results не всегда автоматический — кликаем кнопку, если она видна.
    const toResultsBtn = page
      .getByRole('button', { name: /Zu den Ergebnissen/i })
      .first()
    const resultsLinkVisible = await toResultsBtn
      .isVisible()
      .catch(() => false)
    if (resultsLinkVisible) {
      await toResultsBtn.click()
    }

    await page.waitForURL(/\/exam\/[0-9a-f-]{8,}\/results(\/|$|\?)/, {
      timeout: 30_000,
    })

    // ────────────────────────────────────────────────────────────────
    // 7. Страница результатов: score 0-100 + Bestanden/Nicht bestanden
    // ────────────────────────────────────────────────────────────────
    // Ждём, пока исчезнет loader и появится либо score, либо «Nicht bestanden».
    await expect(
      page.locator('text=/Bestanden|Nicht bestanden/').first(),
    ).toBeVisible({ timeout: 20_000 })

    const bodyText = (await page.locator('body').textContent()) ?? ''

    // Проверяем число 0-100 (score).
    // Ищем изолированное число: либо 0-99 из одной-двух цифр, либо 100.
    const scoreMatch = bodyText.match(/\b(100|[0-9]{1,2})\b/)
    expect(scoreMatch, 'no score number (0-100) found on results page').not.toBeNull()

    // И статус.
    expect(bodyText).toMatch(/Bestanden|Nicht bestanden/)
  })
})
