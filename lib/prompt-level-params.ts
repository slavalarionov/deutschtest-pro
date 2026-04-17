// Резолвер уровне-зависимых параметров промптов.
//
// Зачем: единый шаблон промпта на все уровни (A1/A2/B1) не может передать Claude
// форматные константы Goethe, которые реально зависят от уровня (число Inhaltspunkte,
// регистр обращения и т. п.). Шаблон содержит плейсхолдеры {required_points_text},
// {register_hint}, а этот модуль подставляет значения по уровню и модулю.
//
// Контракт: buildXxxPrompt вызывает resolveLevelParams(...) и затем .replaceAll(...)
// для каждой пары key→value в возвращённом словаре (тот же механизм, что для {level}).
// Если модуль не поддерживает уровне-зависимые параметры — возвращается {} и
// .replaceAll просто не срабатывает.
//
// Scope текущей итерации: только schreiben. Остальные модули — см. задел Phase 2
// в Notion «🇩🇪 Уровне-зависимые параметры промптов».

import type { ExamLevel, ExamModule } from '@/types/exam'

type LevelKey = 'A1' | 'A2' | 'B1'

type LevelMap = Record<LevelKey, string>

const SCHREIBEN_REQUIRED_POINTS_TEXT: LevelMap = {
  A1: '3 kurze Leitpunkte als informeller Orientierungshinweis (nicht als formelle abhakbare Liste)',
  A2: '3 Leitpunkte (als Liste im Aufgabentext)',
  B1: '3 Inhaltspunkte (als nummerierte Liste im Aufgabentext, alle müssen behandelt werden)',
}

const SCHREIBEN_REGISTER_HINT: LevelMap = {
  A1: 'informell mit "du", einfache Begrüßung und Abschied',
  A2: 'meist informell mit "du", Anrede und Grußformel der Situation anpassen',
  B1: 'je nach Situation informell (du) oder formell (Sie); für offizielle Schreiben klar formell',
}

export function resolveLevelParams(
  module: ExamModule,
  level: ExamLevel,
  _teil?: number,
): Record<string, string | number> {
  if (module === 'schreiben') {
    return {
      required_points_text: SCHREIBEN_REQUIRED_POINTS_TEXT[level],
      register_hint: SCHREIBEN_REGISTER_HINT[level],
    }
  }

  return {}
}
