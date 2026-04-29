# Notion update TODO — hotfix-3

После hotfix-3 (`fix(tochka): use payments_with_receipt + merchantId + Operation[] wrapper`) обновить страницы в workspace **DeutschTest.pro**:

## 🗄 Архитектура → раздел «Tochka acquiring»
- Метод покупки изменён с `POST /acquiring/v1.0/payments` на `POST /acquiring/v1.0/payments_with_receipt` — Точка автоматически передаёт чек в **Бизнес.Ру → ОФД → ФНС**.
- Запрос обёрнут в `Operation[]` (массив, мы всегда отправляем ровно одну операцию). Каждая операция содержит:
  - `amount`, `purpose`, `paymentMode: ['card', 'sbp']`, `redirectUrl`, `failRedirectUrl?`
  - `Items[]` — позиции чека (одна позиция = весь пакет)
  - `Client.email` — обязательный, берётся из `auth.users.email`
- Поля чека: `vatType: 'none'` (УСН без НДС), `paymentObject: 'service'` (услуга), `paymentMethod: 'full_payment'` (юзер сразу получает доступ).
- Шаблон наименования услуги в чеке: **«Пакет {Tier} — {N} модулей AI-экзамена немецкого»** (формируется в [lib/tochka/client.ts](../lib/tochka/client.ts) функцией `getReceiptItemName`).
- `getPaymentInfo` и `refundPayment` остались на эндпоинтах без `_with_receipt` — поведение Точки одинаковое.

## 🗄 Архитектура → раздел «Env vars»
- `TOCHKA_MERCHANT_ID` теперь обязательный, **15 цифр** (siteUid торговой точки в интернет-эквайринге). Регекс в `lib/env.ts`: `^\d{15}$`.
- Получить можно командой `npx tsx scripts/check-tochka-retailers.ts` (новый скрипт). Он дёрнет `GET /acquiring/v1.0/retailers?customerCode=…` и распечатает список retail-точек с их siteUid.

## 🎯 Текущее состояние → блок «✅ Phase 4 закрыт» (или последний апдейт)
Дописать абзац: «hotfix-3 (29.04.2026): корректная фискализация через Бизнес.Ру. Метод платежа сменили с `payments` на `payments_with_receipt`, тело запроса вернулось в `Operation[]`-обёртку с прикреплённым `Items[]`. В чек уходят: УСН без НДС (`vatType: 'none'`), услуга (`paymentObject: 'service'`), полный расчёт (`paymentMethod: 'full_payment'`). Email клиента берётся из `auth.users.email` — без email Точка не сможет отправить чек, поэтому в `/api/payments/create` добавлена защита 400 `email_required_for_receipt`».
