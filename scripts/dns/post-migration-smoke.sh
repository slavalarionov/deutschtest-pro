#!/usr/bin/env bash
#
# post-migration-smoke.sh — быстрая верификация после смены NS на Cloudflare.
# Запускать через 30+ минут после миграции (когда DNS пропагировался).
#
# Использование:
#   bash scripts/dns/post-migration-smoke.sh [domain]
#   default domain = deutschtest.pro
#
# Что проверяет:
#   1. HTTPS 200 на корне.
#   2. Заголовок server: cloudflare (трафик идёт через CF).
#   3. Заголовок cf-ray (CF реально отвечает).
#   4. /api/auth/register (GET) — должен вернуть 200 без 5xx.
#   5. SSL сертификат валидный.
#   6. DNS резолвится в IP'шники Cloudflare (104.x / 172.67.x).
#
# Скрипт продолжает работу при падении проверок и в конце выводит итог.
# Exit code = количество провалов (0 = всё зелёное).
#
set -uo pipefail

DOMAIN="${1:-deutschtest.pro}"
URL="https://${DOMAIN}"

PASS=0
FAIL=0

green() { printf '\033[32m%s\033[0m\n' "$1"; }
red()   { printf '\033[31m%s\033[0m\n' "$1"; }
ok()    { green "✓ $1"; PASS=$((PASS+1)); }
nok()   { red   "✗ $1"; FAIL=$((FAIL+1)); }

echo "Smoke test: ${URL}"
echo "============================================================"
echo ""

# -- 1. HTTPS 200 on root --
echo "[1/6] HTTPS root..."
HEAD_OUT="$(curl -sI -L --max-time 15 "$URL" 2>&1 || true)"
HTTP_LINE="$(echo "$HEAD_OUT" | grep -iE '^HTTP/' | tail -1 | tr -d '\r')"
if echo "$HTTP_LINE" | grep -qE '^HTTP/[0-9.]+ 200'; then
  ok "HTTPS 200 OK ($HTTP_LINE)"
else
  nok "HTTPS root not 200 (got: ${HTTP_LINE:-no response})"
fi

# -- 2. server: cloudflare --
echo "[2/6] Header server: cloudflare..."
SERVER_HEADER="$(echo "$HEAD_OUT" | grep -iE '^server:' | tail -1 | tr -d '\r' | sed 's/^[Ss]erver: *//')"
if echo "$SERVER_HEADER" | grep -qiE 'cloudflare'; then
  ok "Header server: ${SERVER_HEADER}"
else
  nok "server header is not 'cloudflare' (got: ${SERVER_HEADER:-missing}) — трафик НЕ идёт через CF"
fi

# -- 3. cf-ray --
echo "[3/6] Header cf-ray..."
CF_RAY="$(echo "$HEAD_OUT" | grep -iE '^cf-ray:' | tail -1 | tr -d '\r' | sed 's/^[Cc][Ff]-[Rr]ay: *//')"
if [[ -n "$CF_RAY" ]]; then
  ok "cf-ray: ${CF_RAY}"
else
  nok "cf-ray header missing — CF не вошёл в путь запроса"
fi

# -- 4. API endpoint reachable --
# /api/auth/register отвечает GET'ом (возвращает JSON с версией) без auth — годится как health.
echo "[4/6] API endpoint /api/auth/register (GET)..."
API_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "${URL}/api/auth/register" || echo "000")"
if [[ "$API_CODE" == "200" ]] || [[ "$API_CODE" == "401" ]] || [[ "$API_CODE" == "405" ]]; then
  ok "API reachable (HTTP ${API_CODE})"
elif [[ "$API_CODE" =~ ^5 ]]; then
  nok "API returned 5xx (HTTP ${API_CODE}) — Vercel origin не отвечает"
elif [[ "$API_CODE" == "000" ]]; then
  nok "API не ответил (timeout / connection refused)"
else
  nok "API вернул неожиданный код HTTP ${API_CODE}"
fi

# -- 5. SSL certificate valid --
echo "[5/6] SSL/TLS certificate..."
SSL_OUT="$(curl -vI --max-time 15 "$URL" 2>&1 | grep -iE '(SSL|TLS|certificate|subject:|issuer:)' || true)"
SSL_VERIFY_FAIL="$(echo "$SSL_OUT" | grep -iE '(SSL certificate problem|verify failed|unable to get local issuer|self.signed)' || true)"
if [[ -n "$SSL_VERIFY_FAIL" ]]; then
  nok "SSL невалидный: $SSL_VERIFY_FAIL"
elif echo "$SSL_OUT" | grep -qiE 'SSL connection|TLSv1|certificate:'; then
  ISSUER="$(echo "$SSL_OUT" | grep -iE 'issuer:' | head -1 | tr -d '\r' | sed 's/^[* ]*//')"
  ok "SSL valid${ISSUER:+ (}${ISSUER}${ISSUER:+)}"
else
  nok "Не удалось распарсить SSL handshake (curl -vI ничего не вывел про TLS)"
fi

# -- 6. DNS resolves to Cloudflare IPs --
echo "[6/6] DNS → Cloudflare IPs..."
IPS="$(dig +short "$DOMAIN" A @1.1.1.1 2>/dev/null | grep -E '^[0-9]+\.' || true)"
if [[ -z "$IPS" ]]; then
  nok "DNS не резолвится (dig +short вернул пусто)"
else
  CF_IPS="$(echo "$IPS" | grep -E '^(104\.(1[6-9]|2[0-9]|3[01])\.|172\.6[4-9]\.|172\.7[01]\.|162\.159\.|198\.41\.)' || true)"
  if [[ -n "$CF_IPS" ]]; then
    ok "DNS резолвится в Cloudflare IPs:"
    echo "$IPS" | sed 's/^/    /'
  else
    nok "DNS НЕ резолвится в CF-диапазоны (актуально:"
    echo "$IPS" | sed 's/^/    /'
    echo "    ожидается 104.16-31.x / 172.64-71.x / 162.159.x)"
  fi
fi

echo ""
echo "============================================================"
echo "Result: ${PASS} passed, ${FAIL} failed"
if [[ "$FAIL" -gt 0 ]]; then
  echo ""
  echo "Если упал шаг 2 или 3 — скорее всего DNS ещё не пропагировался,"
  echo "или Reg.ru панель не сохранила NS. Подожди час, проверь dig +short NS ${DOMAIN}."
  echo "Если упал шаг 4 — проверь Page Rules в CF (bypass cache на /api/*)."
  echo "Если упал шаг 5 — переключи SSL/TLS mode в CF на Full (strict)."
fi

exit "$FAIL"
