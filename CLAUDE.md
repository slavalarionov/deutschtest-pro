# CLAUDE.md — DeutschTest.pro

> Это главный файл инструкций для Claude Code. Читается автоматически в начале каждой сессии. Зеркало файла `.cursorrules` по контенту правил разработки, плюс расширение для работы в VS Code через Claude Code.

---

## О проекте

**DeutschTest.pro** — AI-симулятор экзамена Goethe-Zertifikat. Каждый тест уникален: Claude генерирует тексты, вопросы и аудио на лету. Формат 1:1 с Goethe-Institut.

- Уровни: A1, A2, B1 (B2/C1/C2 — позже)
- Модули: Lesen, Hören, Schreiben, Sprechen
- Задеплоен на Vercel: https://deutschtest.pro

---

## Технический стек

- **Frontend:** Next.js 14 App Router + TypeScript (strict)
- **Стили:** Tailwind CSS, shadcn/ui (компоненты вручную, без установки)
- **Состояние:** Zustand (`store/examStore.ts`)
- **Валидация:** Zod (контракт на ВСЕ AI-ответы)
- **Анимации:** Framer Motion
- **Бэкенд:** Next.js API Routes
- **БД + Auth + Storage:** Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- **AI генерация и оценка:** Anthropic Claude Sonnet 4.6 через Tool Use API
- **TTS:** ElevenLabs, модель `eleven_multilingual_v2`
- **STT:** OpenAI Whisper, язык `de` принудительно
- **Email:** Resend
- **Audio склейка:** ffmpeg (`@ffmpeg-installer/ffmpeg`)

---

## Структура папок

```
deutschtest/
├── app/
│   ├── (auth)/login, /register
│   ├── (exam)/exam/[sessionId]/
│   ├── admin/                    ← админ-панель (Шаг 1 готов)
│   ├── api/
│   │   ├── audio/generate
│   │   ├── auth/{logout,register}
│   │   ├── exam/{generate,generate-module,submit,results,...}
│   │   └── sprechen/{transcribe,score}
│   ├── auth/callback
│   ├── pricing/page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── audio/         AudioPlayer, RecordingButton
│   ├── auth/          AuthNav
│   ├── exam/          ExamShell, ExamTimerDisplay, AnswerSheet, TimeUpOverlay
│   ├── landing/       Hero, Features, Pricing, Faq
│   ├── modules/       LesenModule, HorenModule, SchreibenModule, SprechenModule
│   └── ui/
├── lib/
│   ├── audio/
│   ├── exam/          full-test, generate-one-module, limits, module-order, session-modules
│   ├── supabase/      client, server, middleware
│   ├── ai-pricing.ts
│   ├── ai-usage-logger.ts
│   ├── billing.ts
│   ├── claude.ts                 ← server-only, Tool Use API
│   ├── elevenlabs.ts             ← server-only, TTS + логирование
│   ├── whisper.ts                ← server-only, STT + логирование
│   ├── concat-mp3.ts
│   ├── voices.ts
│   ├── horen-emotion.ts
│   ├── email.ts
│   ├── exam-cache.ts
│   ├── session-store.ts
│   └── supabase-audio-cache.ts
├── prompts/
│   ├── generation/    horen-teil1..4, lesen-teil1..5, schreiben, sprechen
│   └── scoring/       schreiben-score, sprechen-score
├── store/examStore.ts
├── supabase/migrations/  001..010 SQL
├── types/             api, exam, supabase
├── .claude/
│   └── agents/        ← субагенты для специализированных задач
├── CLAUDE.md          ← этот файл
└── middleware.ts
```

---

## База данных (Supabase)

**Основные таблицы:**

- **`exam_sessions`** — сгенерированные экзамены. Поля: `id`, `user_id`, `level` (A1/A2/B1), `mode`, `content jsonb`, `answers jsonb` (server-only!), `audio_urls jsonb`, `session_flow` (single/multi/full_test), `current_module`, `completed_modules`, `retake_of`, `retake_module`, `created_at`, `expires_at` (24ч).
- **`user_attempts`** — попытки пользователей. Поля: `id`, `user_id`, `session_id`, `level`, `started_at`, `submitted_at`, `scores jsonb`, `ai_feedback jsonb`, `is_free_test`, `payment_status`.
- **`profiles`** — профили (триггер на `auth.users`). Поля: `id`, `email`, `full_name`, `target_level`, `exams_taken`, `is_admin`, `is_unlimited`, `is_blocked`, `modules_balance`.
- **`ai_usage_log`** — лог всех вызовов AI (service role only).
- **`prompts`, `prompt_versions`, `promo_codes`, `promo_redemptions`, `modules_ledger`, `feedback`** — админ-панель.

RLS включён везде. Service role обходит RLS. На `profiles` есть policies «Users can read own profile» и «Users can update own profile» (миграция 010).

Миграции 001–010 в `supabase/migrations/`. Новые миграции создавать с номером 011+.

---

## Правила безопасности (КРИТИЧНО)

### API-ключи
1. Все ключи только в `.env.local`, никогда в клиентском коде.
2. `process.env.KEY` — только в server components и API routes.
3. Все вызовы Claude / ElevenLabs / Whisper — ТОЛЬКО через `/app/api/` routes.
4. `.env.local` в `.gitignore`. Шаблон в `.env.example` без значений.
5. Никогда не логировать API-ключи в консоль.

### Данные экзамена
1. Правильные ответы (`exam_sessions.answers`) хранятся ТОЛЬКО на сервере.
2. Клиенту НЕ отдавать эталонные ответы до сабмита.
3. Zod-валидация через Tool Use API на КАЖДЫЙ ответ от Claude.
4. Все API routes проверяют auth session через `lib/supabase/server.ts` перед обработкой.

### Rate limiting
Все `/api/` эндпоинты должны иметь rate-limit. **На текущий момент НЕ реализовано — известный долг.**

### Платежи
1. Никогда не работать с банковскими данными в коде.
2. Webhooks от Точки/Prodamus проверять подписью.
3. Списание кредитов модулей — атомарно через `lib/billing.ts`.

---

## Стиль кода

### TypeScript
- Strict mode, явные типы, никаких `any`.
- Zod-схемы в `types/exam.ts` — единый источник правды.

### React / Next.js
- Server Components по умолчанию.
- `'use client'` только когда реально нужны хуки или браузерные API.
- Динамические роуты: `app/(group)/segment/[param]/page.tsx`.

### Именование
- Файлы: `kebab-case` (`lesen-module.tsx`, `session-store.ts`)
- Компоненты: `PascalCase` (`LesenModule`, `ExamShell`)
- Функции, переменные: `camelCase` (`generateExam`, `userId`)
- БД-колонки: `snake_case` (`user_id`, `is_free_test`)

### Промпты
- Все промпты в `prompts/generation/*` и `prompts/scoring/*`.
- Никогда не хардкодить промпты в `lib/claude.ts` или в API routes.
- При изменении промпта — короткий комментарий-changelog в шапке файла.

---

## Чего НИКОГДА не делать

- ❌ Не вызывать Claude / ElevenLabs / Whisper из клиентского кода
- ❌ Не хранить API-ключи в коде или в клиентских env (`NEXT_PUBLIC_*`)
- ❌ Не отдавать правильные ответы клиенту до сабмита
- ❌ Не использовать `localStorage` / `sessionStorage` в артефактах
- ❌ Не упоминать AI-провайдеров в UI на немецком (`Whisper`, `Claude`, `ElevenLabs` → `KI-Bewertung`)
- ❌ Не генерировать промпты по памяти — читать из `prompts/`
- ❌ Не пропускать Zod-валидацию через Tool Use
- ❌ Не использовать `mode: 'full'` для новых сессий — это легаси

## Что ВСЕГДА делать

- ✅ Server-only для всех AI-вызовов
- ✅ Tool Use API + Zod-валидация для любой генерации
- ✅ Кешировать аудио (Supabase Storage через `lib/supabase-audio-cache.ts`)
- ✅ Проверять авторизацию перед генерацией
- ✅ Списывать кредиты через `lib/billing.ts`, не напрямую SQL
- ✅ Перед изменением БД — создавать новую миграцию в `supabase/migrations/NNN_*.sql`

---

## Бизнес-логика

- **Единица продажи:** пачка модулей (10/20/40).
- **Пакеты:** Starter (10 модулей), Standard (20 модулей, −10%), Intensive (40 модулей, −15%).
- **Цены:** RU → 400 / 720 / 1360 ₽; DE/EN/TR → 4 / 7.20 / 13.60 €.
- **Минимальная покупка:** 10 модулей (один пакет Starter).
- **Гибкость:** купленные модули — универсальные кредиты, тратятся на любой из 4 типов модулей в любых пропорциях.
- **Бесплатно при регистрации:** 3 модуля любых на выбор.
- **Оплата:** Robokassa (единственный провайдер). Prodamus отменён.
- **Поля БД:** `profiles.modules_balance`, `user_attempts.is_free_test`, `user_attempts.payment_status`.

---

## Git и деплой

Пользователь не работает с терминалом руками. Claude Code выполняет git сам через встроенный терминал.

**После любой задачи с изменениями файлов:**
```bash
git status
git add <конкретные файлы>
git commit -m "<тип>: <короткое описание>"
git push
```

**Формат коммитов (Conventional Commits):**
- `fix:` — починка бага
- `feat:` — новая фича
- `chore:` — техническая уборка, логи, форматирование
- `refactor:` — переписывание без смены поведения
- `docs:` — только документация
- `db:` — миграция БД

Один коммит = одно логическое изменение.

**Рабочая директория:** корень git-репо — текущая папка (внутри `~/Desktop/Работа с ИИ/Cursor/deutschtest.pro/deutschtest`).

**Что НЕ делать в git:**
- ❌ Не коммитить `.env.local`, `.env`, ключи
- ❌ Не делать `git push --force` без явного разрешения
- ❌ Не делать `git reset --hard` или `git clean -fd` без разрешения
- ❌ Не создавать новые ветки без просьбы — работаем в `main`
- ❌ Не коммитить автогенерируемое (`tsconfig.tsbuildinfo`, `.next/`, `node_modules/`)

**После push:** Vercel автодеплоит `main` за 30–60 секунд. Сообщай пользователю: «Запушил коммит `<hash>`, Vercel задеплоит за минуту».

**Миграции БД:** создавай и коммить SQL-файл в `supabase/migrations/NNN_*.sql`. Накатить на прод нужно **вручную** через Supabase Dashboard → SQL Editor. Явно скажи пользователю:
> ⚠️ Миграция `NNN_xxx.sql` создана и закоммичена. Накати её на прод вручную: Supabase Dashboard → SQL Editor → вставь содержимое файла → Run. После этого `NOTIFY pgrst, 'reload schema';`.

### Приоритет наката миграций: MCP > ручной Dashboard

Если доступен Supabase MCP (`mcp__supabase__apply_migration`) — накатывай через него сам, это основной путь. Коммить SQL-файл в `supabase/migrations/NNN_*.sql` одним коммитом с кодом, который на миграцию опирается, и в том же коммите (или сразу следом) накатывай через MCP. Цель — чтобы на Vercel никогда не деплоился код, ссылающийся на ненакатанные таблицы или колонки.

Ручной накат через Supabase Dashboard → SQL Editor допустим только как fallback:
- MCP недоступен (ошибка подключения — показать пользователю).
- Пользователь явно просит «сделай руками, я хочу проверить SQL глазами».
- Миграция затрагивает чувствительные данные (drop таблицы с прод-данными, truncate, массовый update без WHERE) — показать план и дождаться явного OK в чате перед накатом.

**Правило приоритета:** specific instruction в промпте пользователя > generic convention в этом файле. Если пользователь в задаче написал «накатывай через MCP» — накатываешь через MCP, даже если здесь написан fallback про Dashboard. Эта конвенция — страховка, а не первый выбор.

После любого наката — `NOTIFY pgrst, 'reload schema';` через `mcp__supabase__execute_sql` или вторым SQL в теле миграции.

---

## Рабочий процесс в VS Code

### В начале каждой сессии

1. Прочитай этот файл (CLAUDE.md) — ты его уже читаешь автоматически.
2. Если подключён Notion MCP — прочитай страницу «🎯 Текущее состояние» из Notion (workspace DeutschTest.pro) для актуального статуса.
3. Жди задачу от пользователя.

### При получении задачи

1. Если задача простая и в твоей зоне компетенции — делай сам.
2. Если задача требует специализации — **делегируй субагенту** из `.claude/agents/`:
   - Баг, диагностика, фикс → **bug-hunter**
   - UI, вёрстка, Tailwind → **designer**
   - Миграция БД → **db-migrator**
   - Правка промптов → **prompt-engineer**
   - Прогон тестов после изменений → **test-runner**
3. Перед большими изменениями — используй **plan mode**: покажи план, дождись подтверждения, потом исполняй.
4. После любых правок кода — запусти минимум `npm run build` перед коммитом.

### После завершения задачи

1. Коммить и пушь (по правилам выше).
2. Кратко опиши, что сделал, и попроси пользователя обновить Notion через claude.ai (страница «🎯 Текущее состояние»).
3. Если подключён Notion MCP и пользователь просил — обнови Notion сам.

---

## Субагенты

Определены в `.claude/agents/`:

- **bug-hunter.md** — диагностика и починка багов
- **designer.md** — UI, вёрстка, Tailwind
- **db-migrator.md** — миграции Supabase
- **prompt-engineer.md** — промпты генерации и скоринга
- **test-runner.md** — прогон тестов и проверок
- **qa-tester.md** — тестирование прода через браузер (Playwright)

Каждый субагент знает свою зону ответственности и ограничения доступа.

---

## MCP-серверы

Claude Code подключён к следующим внешним сервисам через MCP:

- **Notion** (claude.ai) — чтение/запись страниц workspace DeutschTest.pro
- **Gmail** (claude.ai) — поиск тредов, черновики
- **Google Calendar** (claude.ai) — события, предложение времени
- **Supabase** (локальный .mcp.json) — прямой доступ к прод-БД (read+write), применение миграций
- **Vercel** (локальный .mcp.json) — логи прода, статус деплоя, env vars
- **GitHub** (локальный .mcp.json) — issues, PR, чтение/запись кода через API

Все MCP-инструменты разрешены в `.claude/settings.json` без подтверждения.

### Запуск Claude Code без подтверждений

Пользователь запускает Claude Code через алиас в `~/.zshrc`:

```bash
alias cc="claude --dangerously-skip-permissions"
```

Флаг `--dangerously-skip-permissions` полностью отключает подтверждения на bash-команды, edits и file writes. Это осознанное решение: работа ведётся локально в доверенном git-репо, откат через `git reset --hard` всегда доступен, а ручные подтверждения на каждый `git push` / `npm install` / `mkdir` жрут время без пользы.

**Режим по умолчанию:** `cc` (с флагом). Обычный `claude` без флага используется только если нужно перестраховаться на какой-то особо рискованной задаче (массовое удаление файлов, работа вне репо и т.п.) — но это редкое исключение.

---

## Синхронизация с Notion

Notion — источник правды о проекте. Структура workspace «DeutschTest.pro — AI Goethe Exam Simulator»:

1. **📐 Cursor Rules** — зеркало этого файла (поддерживаем идентичность)
2. **🎯 Текущее состояние** — актуальный статус (что работает, что в работе, что сломано)
3. **🗄 Архитектура** — детали стека, БД, env
4. **💰 Бизнес-модель** — цены, кредиты, планы
5. **💡 Идеи и подпроекты** — конкретные фичи и баги, каждая на своей подстранице
6. **📝 Changelog** — лог разработки
7. **🗃 Архив** — устаревшее, НЕ читать по умолчанию

Обновление Notion происходит через claude.ai (основной канал) или напрямую через Notion MCP из VS Code (если подключён).

---

**Последнее обновление:** 16 апреля 2026
