export interface ModuleSummary {
  module: 'lesen' | 'horen' | 'schreiben' | 'sprechen'
  score: number
  passed: boolean
  category: 'strong' | 'ok' | 'weak'
}

export interface ExamSummary {
  totalAverage: number
  passed: boolean
  modulesPassed: number
  modulesTotal: number
  modules: ModuleSummary[]
  strengths: ModuleSummary[]
  weaknesses: ModuleSummary[]
  recommendations: string[]
}

const VALID_MODULES = new Set(['lesen', 'horen', 'schreiben', 'sprechen'])

export function buildExamSummary(
  scores: Record<string, number>,
  sessionModules: string[],
): ExamSummary {
  const modules: ModuleSummary[] = sessionModules
    .filter((m): m is ModuleSummary['module'] => VALID_MODULES.has(m))
    .map((m) => {
      const score = scores[m] ?? 0
      const passed = score >= 60
      const category: ModuleSummary['category'] =
        score >= 75 ? 'strong' : score >= 60 ? 'ok' : 'weak'
      return { module: m, score, passed, category }
    })

  const totalAverage =
    modules.length > 0
      ? Math.round(modules.reduce((s, m) => s + m.score, 0) / modules.length)
      : 0
  const modulesPassed = modules.filter((m) => m.passed).length
  const passed = modulesPassed === modules.length && modules.length > 0

  const strengths = modules.filter((m) => m.category === 'strong')
  const weaknesses = modules
    .filter((m) => m.category === 'weak')
    .sort((a, b) => a.score - b.score)

  const recommendations: string[] = []
  for (const w of weaknesses) {
    if (w.module === 'lesen') {
      recommendations.push(
        'Lesen: täglich 1 Text aus der Goethe-B1-Sammlung lesen, Schlüsselwörter unterstreichen, Hauptaussagen in eigenen Worten zusammenfassen.',
      )
    }
    if (w.module === 'horen') {
      recommendations.push(
        'Hören: Tagesschau in einfacher Sprache und Slow German Podcast — täglich 15 Minuten, danach Notizen vergleichen.',
      )
    }
    if (w.module === 'schreiben') {
      recommendations.push(
        'Schreiben: 3 Briefe pro Woche zu typischen B1-Themen schreiben, auf Konnektoren (weil, deshalb, obwohl, trotzdem) achten.',
      )
    }
    if (w.module === 'sprechen') {
      recommendations.push(
        'Sprechen: laut Aufgaben aus Teil 2 und 3 üben, sich aufnehmen, mit eigenem Mitschnitt nachsteuern.',
      )
    }
  }
  if (recommendations.length === 0 && passed) {
    recommendations.push(
      'Sehr gute Leistung! Halten Sie das Niveau mit regelmäßiger Lese- und Hörpraxis.',
    )
  }

  return {
    totalAverage,
    passed,
    modulesPassed,
    modulesTotal: modules.length,
    modules,
    strengths,
    weaknesses,
    recommendations,
  }
}
