# Cloudflare Migration Runbook

Боевой чек-лист миграции `deutschtest.pro` под Cloudflare-прокси перед Vercel
для разблокировки трафика из РФ. Полный контекст — в Notion-странице
«🔒 Обход блокировки Vercel в РФ через Cloudflare-прокси».

> **Окно работ:** ночь / выходные. DNS-пропагация — 1–4 часа (до 48 в худшем случае).
> **Откат:** возврат NS в Reg.ru → пропагация ещё 1–4 часа. Поэтому HSTS пока НЕ включаем.

---

## Pre-flight (за день до миграции)

- [ ] Прочитал Notion-страницу целиком (риски + альтернативы), убедился, что нет открытых блокеров
- [ ] Запустил `bash scripts/dns/dump-current-dns.sh` — снапшот сохранён в `scripts/dns/dns-snapshot-YYYY-MM-DD.txt`
- [ ] Зашёл в [Resend Dashboard](https://resend.com/domains) → `deutschtest.pro` → скопировал актуальный DKIM-селектор (обычно `resend._domainkey`, но проверить!) и SPF-запись
- [ ] Сделал скриншоты текущих DNS из панели Reg.ru, сохранил в `docs/dns-snapshots/reg-ru-YYYY-MM-DD/` (создать папку, в репозитории её пока нет)
- [ ] Зарегистрировал аккаунт Cloudflare на рабочий email (бесплатный тариф, без карты)
- [ ] Включил 2FA на Cloudflare
- [ ] Подготовил VPN с локацией РФ для ручной проверки доступности после миграции (Browsec / WARP / любой)
- [ ] Анонсировал в соцсетях / email-листе про возможные перебои (если юзеры есть; на 26.04.2026 их минимум — пропустить)

---

## Day X — миграция

Лучше начать в ~22:00 МСК пятницы / субботы. С утра в воскресенье будет окно на верификацию и откат, если что-то сломалось.

### Шаг 1. Добавить домен в Cloudflare (10 мин)

- [ ] Cloudflare Dashboard → **Add a site** (правый верх) → ввести `deutschtest.pro` → Continue
- [ ] Выбрать **Free** план → Continue
- [ ] Cloudflare сам просканирует публичные DNS-записи Reg.ru и покажет список. Сравнить с `dns-snapshot-*.txt` — каждая ваша запись должна быть в списке CF
- [ ] Если CF не подтянул какую-то TXT (особенно DKIM/DMARC/Resend verification) — **Add Record** руками, по содержимому из снапшота
- [ ] Continue → CF покажет два присвоенных nameserver'а вида `xxx.ns.cloudflare.com` и `yyy.ns.cloudflare.com` — записать оба

### Шаг 2. Настроить proxy / cloud-флажки (5 мин)

В таблице DNS Records в Cloudflare для каждой записи стоит «оранжевое облачко» (proxied) или «серое» (DNS only):

- [ ] **A `deutschtest.pro` → 76.76.21.x (Vercel)** — оранжевое (proxied). Без этого нет смысла в миграции.
- [ ] **CNAME `www` → cname.vercel-dns.com** (или что у вас) — оранжевое (proxied)
- [ ] **MX-записи Resend** — серое (DNS only). Если оставить оранжевым, MX перестанет работать, письма перестанут ходить. **Это критично.**
- [ ] **TXT (SPF, DMARC, DKIM, Resend verification, Google site-verification)** — оранжевое не применимо, у TXT просто нет proxy-флажка. Просто сохранить.
- [ ] **Любые `send.deutschtest.pro` / `bounce.deutschtest.pro` CNAME для Resend** — серое (DNS only).

### Шаг 3. SSL/TLS режим (3 мин)

- [ ] Левое меню → **SSL/TLS** → **Overview**
- [ ] Encryption mode → **Full (strict)**.
  - Не «Flexible» (это HTTPS только до CF, между CF и Vercel — HTTP, ломает редиректы и cookie).
  - Не «Full» без strict (CF не проверяет валидность сертификата от Vercel — теряем защиту от MITM на пути CF↔Vercel).
- [ ] **Edge Certificates** → подтвердить, что Universal SSL включён (по умолчанию должен быть)
- [ ] **Always Use HTTPS** → **On**
- [ ] **HSTS (Strict Transport Security)** → **НЕ ВКЛЮЧАТЬ**. Включаем только через неделю стабильной работы — иначе откат к http в случае проблем будет невозможен месяцами.
- [ ] **Minimum TLS Version** → 1.2
- [ ] **TLS 1.3** → On

### Шаг 4. Cache rules (5 мин)

API-роуты НЕ должны кешироваться (`/api/*` — это `/api/exam/generate`, `/api/auth/*`, всё динамическое). Админка — тоже. Статика Next.js (`/_next/static/*`) кешируется агрессивно.

- [ ] Левое меню → **Caching** → **Cache Rules** → **Create rule**
- [ ] Rule 1 «Bypass API»:
  - Field: `URI Path` → operator `starts with` → value `/api/`
  - Then: **Bypass cache**
- [ ] Rule 2 «Bypass Admin»:
  - Field: `URI Path` → operator `starts with` → value `/admin/`
  - Then: **Bypass cache**
- [ ] Rule 3 «Bypass auth callback» (опционально, на всякий):
  - Field: `URI Path` → operator `starts with` → value `/auth/callback`
  - Then: **Bypass cache**
- [ ] Save / Deploy

### Шаг 5. Performance — отключить минификацию (2 мин)

Cloudflare умеет минифицировать HTML/CSS/JS. Next.js уже отдаёт минифицированные бандлы — двойная минификация может сломать source maps и hash'и.

- [ ] **Speed** → **Optimization** → **Auto Minify** → выключить все три (HTML/CSS/JS)
- [ ] **Brotli** → On (CF дожимает поверх gzip от Vercel — выигрыш в трафике)
- [ ] **Rocket Loader** → Off (ломает `<Script>` от Next.js)

### Шаг 6. Сменить NS в Reg.ru (5 мин + 1–4 ч пропагация)

- [ ] Войти в [Reg.ru](https://reg.ru) под аккаунтом владельца домена
- [ ] Раздел **Домены** → выбрать `deutschtest.pro` → **DNS-серверы и управление зоной** (или «Управление DNS-серверами»)
- [ ] Переключить с «DNS-серверы Reg.ru» на «Указать вручную»
- [ ] Вписать те два NS'а от Cloudflare, которые получили на Шаге 1 (`xxx.ns.cloudflare.com`, `yyy.ns.cloudflare.com`)
- [ ] Сохранить
- [ ] Cloudflare Dashboard → **Overview** → CF будет проверять NS каждые ~15 минут. Когда увидит свои NS — пришлёт email «Your domain is now active on Cloudflare»

### Шаг 7. Дождаться пропагации

- [ ] Минимум 30 минут, обычно 1–4 часа. Можно мониторить:
  ```bash
  dig +short NS deutschtest.pro @1.1.1.1
  dig +short NS deutschtest.pro @8.8.8.8
  dig +short NS deutschtest.pro @9.9.9.9
  ```
  Когда все три резолвера показывают `*.ns.cloudflare.com` — пропагация прошла глобально.

---

## Post-migration (1–4 часа после смены NS)

### Smoke-тесты автоматом

- [ ] `bash scripts/dns/post-migration-smoke.sh` — все 6 проверок зелёные. Если упали — см. подсказки в выводе скрипта.

### Email deliverability — критично

- [ ] Зарегистрировал тестового юзера через `/register` (любой временный email от gmail/mail.ru)
- [ ] Confirmation email пришёл в **Inbox**, не в Spam, не в Promotions
- [ ] Открыл письмо → проверил у gmail кнопку «Подробнее» → SPF=PASS, DKIM=PASS, DMARC=PASS
- [ ] Если хоть один FAIL — НЕ продолжать, вернуться к DNS, проверить TXT-записи, при необходимости откатиться

### OAuth и auth

- [ ] Залогинился через Google OAuth (`/login` → Google) — успех
- [ ] Залогинился по email+password — успех
- [ ] Кука `sb-{project}-auth-token` ставится на домене `deutschtest.pro` (DevTools → Application → Cookies)

### Главные user flows

- [ ] `/exam/generate` (или клик «Начать пробный экзамен» на главной) — экзамен генерируется, тексты приходят
- [ ] Hörverstehen аудио воспроизводится (CF проксирует mp3 из Supabase Storage корректно)
- [ ] `/dashboard` после логина — открывается, баланс модулей виден
- [ ] `/admin` под админ-аккаунтом — открывается

### Проверка из РФ

- [ ] VPN отключить → открыть `https://deutschtest.pro` из РФ-локации (если есть прямой доступ) или через VPN с РФ-exit-нодой → 200 OK без timeout
- [ ] Headers в DevTools → Network → запрос на корень → видно `cf-ray`, `server: cloudflare`

### Vercel deploy не сломан

- [ ] Push любой мелкий коммит → дождаться Vercel deploy → открыть прод → новые изменения видны через CF
- [ ] Vercel Dashboard → Logs → запросы идут (`x-vercel-id` в заголовках ответа)

---

## Через 7 дней — финализация

- [ ] Email deliverability ок всю неделю (subjective: отзывы юзеров, monitoring в Resend Dashboard)
- [ ] Vercel bandwidth снизился (Vercel Dashboard → Usage)
- [ ] Включить **HSTS**: Cloudflare → SSL/TLS → Edge Certificates → HSTS → Enable → max-age 6 months, includeSubdomains: yes, preload: no (preload — отдельная процедура submit'а в браузерные списки, делается позже)
- [ ] Опционально: Cloudflare → Security → **Bot Fight Mode** → On (бесплатный, отбивает ботов; следить чтобы не блокировал OG-боты Telegram/WhatsApp при шеринге `/recommendations/{id}`)

---

## Rollback procedure

Применять, если после миграции что-то критичное сломалось и не чинится за час.

- [ ] Reg.ru → DNS-серверы домена → переключить обратно на «DNS-серверы Reg.ru» (стандартные NS Reg.ru)
- [ ] В панели Reg.ru восстановить DNS-записи по `dns-snapshot-YYYY-MM-DD.txt`. Особенно важно: A apex и www (на Vercel IP), все TXT (SPF, DMARC, DKIM Resend), MX, верификация Resend
- [ ] Дождаться пропагации (1–4 часа)
- [ ] `dig +short NS deutschtest.pro @1.1.1.1` → должно быть `ns*.reg.ru` (или whatever был раньше)
- [ ] `bash scripts/dns/post-migration-smoke.sh` — должны провалиться шаги 2, 3, 6 (нет Cloudflare). Шаги 1, 4, 5 — должны быть зелёные (Vercel прямо отдаёт сайт). Если 1/4/5 тоже красные — проблема не в DNS, а в Vercel
- [ ] В Cloudflare Dashboard зону можно НЕ удалять — оставить как «нерабочую», на следующую попытку миграции записи останутся

---

## Контакты на случай проблем

- Cloudflare support (Free план): только community + docs. Платный Pro ($20/мес) даёт email-support.
- Reg.ru support: круглосуточный чат в личном кабинете.
- Vercel support: email-тикет, ответ 12-24ч на Hobby.
- Resend support: email, обычно отвечают за пару часов; Status page: status.resend.com.

---

**Last updated:** 2026-04-26
