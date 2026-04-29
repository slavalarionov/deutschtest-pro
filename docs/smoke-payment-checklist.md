# Smoke-тест Точки на проде

Цель — пройти полный путь покупки 400 ₽ → начисление 10 модулей → возврат, чтобы убедиться, что вся цепочка работает с реальным банком.

## Подготовка

1. ENV-переменные на Timeweb (или там, где живёт прод):
   - `TOCHKA_JWT_TOKEN`
   - `TOCHKA_CUSTOMER_CODE` (узнать через `npx tsx scripts/check-tochka-customers.ts` локально)
   - `TOCHKA_WEBHOOK_PUBLIC_KEY` — *опционально*, оставить пустым на старте; подключим после первого успешного теста
   - `NEXT_PUBLIC_APP_URL=https://deutschtest.pro`
2. Дождаться деплоя в Timeweb (Docker rebuild ~1–3 мин после push).
3. Локально: убедиться, что в `.env.local` те же значения, чтобы `scripts/check-tochka-customers.ts` и `scripts/smoke-payment.ts` запускались.

## Сценарий A — через UI (основной)

- [ ] Открыть `https://deutschtest.pro/ru/register` в инкогнито, зарегистрироваться на тестовый email (slava+smoke@…).
- [ ] Подтвердить email.
- [ ] Запомнить текущий `profiles.modules_balance` (по умолчанию 3 после регистрации).
- [ ] Открыть `https://deutschtest.pro/ru/pricing`, нажать «Купить» на **Starter (400 ₽)**.
- [ ] DevTools → Network: убедиться, что `POST /api/payments/create` вернул 200 и в теле `paymentUrl`.
- [ ] Перейти по `paymentUrl` — открывается страница Точки.
- [ ] Оплатить любой картой 400 ₽.
- [ ] Браузер редиректит на `/ru/payment/success?orderId=…` — должен появиться спиннер «Ожидаем подтверждение от банка…».
- [ ] В течение ~10 секунд статус перевернётся на «Готово! +10 модулей зачислено.» (либо вебхук, если ключ настроен, либо поллинг через `getPaymentInfo`).
- [ ] В Supabase проверить:
  - `payments.status = 'approved'`,
  - `payments.payment_method = 'card'` (или `'sbp'`),
  - `profiles.modules_balance` = старое + 10,
  - в `modules_ledger` появилась строка с `delta = +10`, `reason = payment:tochka:<orderId>`, `related_payment_id` указывает на платёж.
- [ ] В Timeweb-логах увидеть `[tochka-webhook] approved` (если webhook настроен) **или** `[payments/status] poll` (если работает поллинг).

## Сценарий B — через скрипт (если UI вдруг сломается)

- [ ] `npx tsx scripts/smoke-payment.ts slava+smoke@deutschtest.pro` — выводит `orderId`, `provider_operation_id`, `paymentUrl`.
- [ ] Открыть `paymentUrl` в браузере и оплатить 400 ₽ картой.
- [ ] Дождаться `payments.status = 'approved'` (как в сценарии A).

## Возврат

- [ ] Скопировать `provider_operation_id` из БД или из вывода скрипта.
- [ ] `npx tsx scripts/smoke-payment.ts --refund <operationId>` (или `curl`):

  ```bash
  curl -X POST "$TOCHKA_API_BASE_URL/acquiring/v1.0/payments/<operationId>/refund" \
    -H "Authorization: Bearer $TOCHKA_JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"Data":{"amount":"400.00"}}'
  ```

- [ ] В ответе `Data.isRefund: true` — возврат запущен.
- [ ] **Вручную** обновить БД (автоматизация refund-flow — отдельный спринт):

  ```sql
  UPDATE payments
     SET status = 'refunded',
         status_updated_at = now()
   WHERE order_id = '<orderId>';

  INSERT INTO modules_ledger (user_id, delta, reason, related_payment_id, performed_by, note)
  VALUES (
    (SELECT user_id FROM payments WHERE order_id = '<orderId>'),
    -10,
    'refund:tochka:<orderId>',
    (SELECT id FROM payments WHERE order_id = '<orderId>'),
    NULL,
    'Manual reflection of Tochka refund'
  );

  UPDATE profiles
     SET modules_balance = modules_balance - 10
   WHERE id = (SELECT user_id FROM payments WHERE order_id = '<orderId>');
  ```

- [ ] Деньги придут на карту за 1–7 рабочих дней (это банковский SLA, ничего не делать).

## После успешного теста

- [ ] Подключить вебхук в кабинете Точки (если ещё нет): URL `https://deutschtest.pro/api/webhooks/tochka`. Если в кабинете нет UI — написать `public-api@tochka.com`.
- [ ] Получить публичный ключ RS256, положить в env как `TOCHKA_WEBHOOK_PUBLIC_KEY`. Передеплоить.
- [ ] Прогнать сценарий A ещё раз — убедиться, что в логах теперь `[tochka-webhook] approved` *до* того, как сработает поллинг.
