-- Поддержка пересдачи отдельных модулей

-- Связь "новой сессии-пересдачи" с предыдущей
ALTER TABLE exam_sessions
  ADD COLUMN IF NOT EXISTS retake_of uuid REFERENCES exam_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS retake_module text;

CREATE INDEX IF NOT EXISTS idx_exam_sessions_retake_of ON exam_sessions(retake_of);

COMMENT ON COLUMN exam_sessions.retake_of IS 'Если эта сессия — пересдача одного модуля, тут id исходной сессии';
COMMENT ON COLUMN exam_sessions.retake_module IS 'Какой именно модуль пересдаётся (lesen/horen/schreiben/sprechen)';
