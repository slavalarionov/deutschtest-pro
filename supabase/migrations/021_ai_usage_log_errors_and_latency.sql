-- 021: ai_usage_log — логировать ошибки и латенси
--
-- До этой миграции ai_usage_log писался только на успехе: видны tokens + cost, но
-- не видно ошибок Claude/ElevenLabs/Whisper и не видно latency. Слепая зона для
-- диагностики 500-х в /api/exam/generate и для мониторинга деградаций.
--
-- После миграции каждая попытка (включая каждый retry в generateWithTool) пишет
-- отдельную строку. На успехе: status='success' + tokens + cost. На ошибке:
-- status in ('error','timeout','rate_limit','invalid_response','insufficient_balance')
-- + error_message/error_stack + tokens=0, cost=0.
--
-- insufficient_balance — отдельный статус для Anthropic invalid_request_error
-- с message про credit balance (см. задачу от 19.04 «Anthropic billing — защита
-- от обнуления баланса»). Важно отделять от generic 'error', т.к. это actionable
-- сигнал топ-апить баланс, а не искать баг.

ALTER TABLE ai_usage_log
  ADD COLUMN status TEXT NOT NULL DEFAULT 'success'
    CHECK (status IN ('success', 'error', 'timeout', 'rate_limit', 'invalid_response', 'insufficient_balance')),
  ADD COLUMN error_message TEXT,
  ADD COLUMN error_stack TEXT,
  ADD COLUMN latency_ms INTEGER,
  ADD COLUMN attempt_number INTEGER DEFAULT 1;

-- Частичный индекс только по ошибкам: admin-вкладка /admin/ai-errors фильтрует
-- status != 'success', и частичный индекс дешевле, чем полный по всей таблице
-- (большинство записей — success).
CREATE INDEX idx_ai_usage_log_status_created
  ON ai_usage_log(status, created_at DESC)
  WHERE status != 'success';

NOTIFY pgrst, 'reload schema';
