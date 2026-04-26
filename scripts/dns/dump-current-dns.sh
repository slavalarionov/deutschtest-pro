#!/usr/bin/env bash
#
# dump-current-dns.sh — снапшот всех публичных DNS-записей домена ПЕРЕД миграцией
# nameservers на Cloudflare. Если потеряем хоть одну TXT (DKIM/SPF/DMARC) — Resend
# уйдёт в спам. Если потеряем CNAME — отвалится поддомен. Поэтому фиксируем всё.
#
# Использование:
#   bash scripts/dns/dump-current-dns.sh [domain]
#   default domain = deutschtest.pro
#
# Вывод:
#   - человекочитаемый отчёт в stdout
#   - копия в scripts/dns/dns-snapshot-YYYY-MM-DD.txt
#
# Требует: dig (входит в bind-utils / dnsutils, на macOS — из коробки).
#
set -euo pipefail

DOMAIN="${1:-deutschtest.pro}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SNAPSHOT="${SCRIPT_DIR}/dns-snapshot-$(date +%Y-%m-%d).txt"

# Резолвер: используем 1.1.1.1 (Cloudflare) для независимости от локального DNS-кеша.
# Если домен ещё на старых NS, мы всё равно увидим публичные записи.
RESOLVER="@1.1.1.1"

# Дополнительные DKIM-селекторы Resend. Если в Dashboard настроен другой селектор —
# допиши его сюда руками либо передай через ENV: SELECTORS="resend send default"
SELECTORS="${SELECTORS:-resend send default google selector1 selector2 mail dkim}"

# Дополнительные поддомены, которые имеет смысл проверить. Email-провайдеры часто
# создают CNAME вида send.deutschtest.pro → bounce-server, и его пропустить нельзя.
SUBDOMAINS="${SUBDOMAINS:-www api admin app mail send bounce track em e click link}"

dump() {
  printf '%s\n' "$@" | tee -a "$SNAPSHOT"
}

run_dig() {
  local label="$1"
  local name="$2"
  local type="$3"
  local out
  out="$(dig "$RESOLVER" +noall +answer "$name" "$type" 2>/dev/null || true)"
  if [[ -n "$out" ]]; then
    dump "── ${label} ─ ${type} ${name}"
    dump "$out"
    dump ""
  else
    dump "── ${label} ─ ${type} ${name}"
    dump "(no records)"
    dump ""
  fi
}

: > "$SNAPSHOT"

dump "DNS snapshot for ${DOMAIN}"
dump "Generated: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
dump "Resolver: ${RESOLVER}"
dump "============================================================"
dump ""

dump "## Nameservers (NS) ##"
run_dig "NS" "$DOMAIN" "NS"

dump "## Apex domain ##"
run_dig "apex A" "$DOMAIN" "A"
run_dig "apex AAAA" "$DOMAIN" "AAAA"
run_dig "apex CNAME" "$DOMAIN" "CNAME"
run_dig "apex MX" "$DOMAIN" "MX"
run_dig "apex TXT" "$DOMAIN" "TXT"
run_dig "apex CAA" "$DOMAIN" "CAA"

dump "## DMARC ##"
run_dig "_dmarc" "_dmarc.${DOMAIN}" "TXT"

dump "## DKIM selectors ##"
for sel in $SELECTORS; do
  run_dig "DKIM ${sel}" "${sel}._domainkey.${DOMAIN}" "TXT"
  run_dig "DKIM ${sel} CNAME" "${sel}._domainkey.${DOMAIN}" "CNAME"
done

dump "## Common subdomains ##"
for sub in $SUBDOMAINS; do
  run_dig "${sub} A" "${sub}.${DOMAIN}" "A"
  run_dig "${sub} CNAME" "${sub}.${DOMAIN}" "CNAME"
done

dump "## SOA ##"
run_dig "SOA" "$DOMAIN" "SOA"

dump "============================================================"
dump "Done. Snapshot saved to: ${SNAPSHOT}"
dump ""
dump "Next steps:"
dump "  1. Сравни вывод с DNS-панелью Reg.ru — ничего не должно отсутствовать."
dump "  2. Сделай скриншот панели Reg.ru и сохрани в docs/dns-snapshots/."
dump "  3. Перед сменой NS — проверь актуальный DKIM-селектор в Resend Dashboard"
dump "     (https://resend.com/domains) и впиши его в Cloudflare DNS до миграции."

echo ""
echo "→ Файл снапшота: ${SNAPSHOT}"
