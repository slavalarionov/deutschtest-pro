-- 020_scoring_prompts_i18n.sql
-- Этап 6.5 i18n: обновление промптов scoring/schreiben-score и scoring/sprechen-score.
--
-- Что меняется по сравнению с v1:
-- 1. В начало добавлен плейсхолдер {language_reminder} — инструкция о языке
--    вывода и allowlist немецких терминов Goethe подставляется в рантайме
--    из prompts/scoring/*.ts в зависимости от preferred_language пользователя.
-- 2. Удалена немецкая инструкция «Schreibe das Feedback im Kommentar auf
--    authentischem Deutsch» — она конфликтовала с новым многоязычным режимом.
-- 3. Структура тела промпта (AUFGABE, критерии, TEXT/TRANSKRIPTION) остаётся
--    на немецком — это часть симуляции Goethe; меняется только язык комментария.
--
-- Старая v1 остаётся в таблице для истории и возможного отката.

BEGIN;

-- Schreiben v2
INSERT INTO prompt_versions (prompt_key, version, content, change_note)
VALUES (
  'scoring/schreiben-score',
  2,
  E'{language_reminder}\n\nDu bist ein offizieller Prüfer für das Goethe-Zertifikat {level}, Modul Schreiben.\n\nAUFGABE war:\n{task}\n\nINHALTLICHE PUNKTE die behandelt werden sollten:\n{required_points}\n\nTEXT DES PRÜFLINGS:\n```\n{user_text}\n```\n\nBewerte den Text nach den offiziellen Goethe-Bewertungskriterien:\n1. Aufgabenerfüllung (0–25): Wurden alle Inhaltspunkte behandelt? Ist das Format korrekt?\n2. Kohärenz (0–25): Ist der Text logisch aufgebaut? Gibt es Konnektoren?\n3. Wortschatz (0–25): Passt der Wortschatz zum Niveau {level}? Ist er vielfältig?\n4. Grammatik (0–25): Sind die grammatischen Strukturen korrekt? Passen sie zum Niveau?\n\nÜbergib deine Bewertung ausschließlich über das bereitgestellte Tool.',
  'i18n: add {language_reminder} placeholder, drop German-only output instruction'
);

UPDATE prompts
SET active_version_id = (
  SELECT id FROM prompt_versions
  WHERE prompt_key = 'scoring/schreiben-score' AND version = 2
),
updated_at = now()
WHERE key = 'scoring/schreiben-score';

-- Sprechen v2
INSERT INTO prompt_versions (prompt_key, version, content, change_note)
VALUES (
  'scoring/sprechen-score',
  2,
  E'{language_reminder}\n\nDu bist ein offizieller Prüfer für das Goethe-Zertifikat {level}, Modul Sprechen.\n\nAUFGABE: {task_type_label}\nThema: {task_topic}\n\nErwartete Inhaltspunkte:\n{task_points}\n\nTRANSKRIPTION DES PRÜFLINGS:\n```\n{transcript}\n```\n\nBewerte nach den offiziellen Goethe-Bewertungskriterien:\n1. Aufgabenerfüllung (0–20): Wurden alle Punkte der Aufgabe behandelt? Passt die Antwort zur Aufgabenstellung?\n2. Flüssigkeit (0–20): Spricht der Prüfling zusammenhängend? Gibt es lange Pausen oder Abbrüche?\n3. Wortschatz (0–20): Ist der Wortschatz dem Niveau {level} angemessen und vielfältig?\n4. Grammatik (0–20): Sind die grammatischen Strukturen korrekt und dem Niveau angemessen?\n5. Aussprache (0–20): Kann indirekt beurteilt werden — korrekte Wortformen, keine Verwechslungen.\n\nÜbergib deine Bewertung ausschließlich über das bereitgestellte Tool.',
  'i18n: add {language_reminder} placeholder, drop German-only output instruction'
);

UPDATE prompts
SET active_version_id = (
  SELECT id FROM prompt_versions
  WHERE prompt_key = 'scoring/sprechen-score' AND version = 2
),
updated_at = now()
WHERE key = 'scoring/sprechen-score';

COMMIT;

NOTIFY pgrst, 'reload schema';
