# Webhook от Точки — особенности подключения

## Регистрация webhook'а

Endpoint: `PUT https://enter.tochka.com/uapi/webhook/v1.0/{clientId}`

⚠️ **Используется `clientId`, а не `customerCode`** — это разные идентификаторы.
- `customerCode` — 9 цифр, начинается с 3 (используется во всех остальных методах API).
- `clientId` — UUID-подобная строка из кабинета https://i.tochka.com/a/integration.

⚠️ **Тело запроса БЕЗ обёртки `Data`** (в отличие от других методов Точки):

```json
{
  "webhooks_list": ["acquiringInternetPayment"],
  "url": "https://deutschtest.pro/api/webhooks/tochka"
}
```

⚠️ **Поля в snake_case** (`webhooks_list`), хотя в **ответе** Точка возвращает их в camelCase (`webhooksList`) — это особенность их Pydantic-валидатора.

Команда:

```bash
curl -i -X PUT "https://enter.tochka.com/uapi/webhook/v1.0/<clientId>" \
  -H "Authorization: Bearer <TOCHKA_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"webhooks_list":["acquiringInternetPayment"],"url":"https://deutschtest.pro/api/webhooks/tochka"}'
```

## Формат payload'а от Точки

Точка отправляет `POST` на наш endpoint:
- **Заголовок:** `Content-Type: text/plain`
- **Тело:** JWT-строка, подпись RS256.
- Декодированный payload — плоский, без обёртки `Operation[]`.

Поля в payload (для `acquiringInternetPayment`):
- `customerCode`, `merchantId` — наши идентификаторы.
- `operationId` — UUID платежа (= наш `provider_operation_id`).
- `amount` — строка типа `"400.00"` или число (Точка по своему усмотрению — наша Zod-схема принимает оба варианта).
- `paymentType` — `"card"` / `"sbp"` / `"dolyame"`.
- `status` — `"AUTHORIZED"` / `"APPROVED"`.
- `webhookType` — `"acquiringInternetPayment"`.
- `paymentLinkId` — наш `order_id`, **если** мы его передали при создании платежа (сейчас не передаём, в backlog — может быть полезно как резервный матч-ключ).
- `purpose`, `consumerId`, `transactionId`, `qrcId`, `payerName` — дополнительные поля для разных типов платежа.

## Публичный ключ для верификации подписи

URL: https://enter.tochka.com/doc/openapi/static/keys/public

Формат: одиночный JWK (НЕ JWKS-массив):

```json
{"kty":"RSA","e":"AQAB","n":"rwm77av7..."}
```

Хранится в env `TOCHKA_WEBHOOK_PUBLIC_KEY` (одной строкой без переносов).

Код верификации в [lib/tochka/webhook.ts](../lib/tochka/webhook.ts) — поддерживает и PEM, и JWK через детект по префиксу `-----BEGIN`. Для Точки — путь JWK.

## Управление webhook'ами

- `GET    /uapi/webhook/v1.0/{clientId}` — список наших webhook'ов.
- `PUT    /uapi/webhook/v1.0/{clientId}` — создать новый.
- `POST   /uapi/webhook/v1.0/{clientId}` — изменить URL/тип.
- `DELETE /uapi/webhook/v1.0/{clientId}` — удалить.
- `POST   /uapi/webhook/v1.0/{clientId}/test_send` — отправить тестовый webhook.

## Критические особенности

1. **При регистрации Точка отправляет тестовый webhook** на указанный URL. Если endpoint вернёт не-200, webhook **не будет создан**. Endpoint должен корректно обрабатывать тестовые payload'ы — где `operationId` может не быть в нашей БД, RPC вернёт `payment_not_found`, мы вернём 200 (см. [app/api/webhooks/tochka/route.ts](../app/api/webhooks/tochka/route.ts)).

2. **Retry-логика:** если webhook вернул не-200, Точка ретрайнет до 30 раз с интервалом 10 секунд. Endpoint должен возвращать 200 в большинстве сценариев (включая `payment_not_found`, `was_already_approved`), 5xx — только при неустранимых ошибках БД.

3. **Идемпотентность:** RPC `approve_payment_atomic` использует `FOR UPDATE` + проверку `was_already_approved`. Webhook может прийти 30 раз — дубля начисления не будет. Это же даёт безопасный fallback на поллер: если оба канала одновременно дойдут до approve_payment_atomic, второй увидит `status='approved'` и тихо вернёт `was_already_approved=true`.

4. **Ошибки валидации Точки в snake_case** даже когда API ждёт camelCase (или наоборот). Текст ошибки — не источник правды о формате запроса. Проверять опытным путём.

5. **Резервный канал — поллинг через `getPaymentInfo`** в [app/api/payments/[orderId]/status/route.ts](../app/api/payments/[orderId]/status/route.ts). Если webhook не дошёл (Точка лежит, сетевая проблема, кабинет с просроченной регистрацией), success-страница каждые 2 секунды дёргает status-route, тот после 10 секунд `pending` ходит к Точке через `GET /acquiring/v1.0/payments/{operationId}` и сам зовёт RPC при `APPROVED`. Поэтому даже без webhook'а интеграция остаётся живой.

## История подключения

- **30.04.2026:** webhook зарегистрирован после серии хотфиксов 3.5, 3.6, 4.1. До этого работал только поллер.
- **clientId на проде:** `f834916b3aead9d63a87034a8a41560d`.
