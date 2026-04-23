import {
  generateLesenFull,
  generateSchreiben,
  generateHorenFull,
  generateSprechen,
} from '@/lib/claude'
import type { LogContext } from '@/lib/ai-usage-logger'
import type { ExamLevel } from '@/types/exam'

export type ExamModuleKey = 'lesen' | 'horen' | 'schreiben' | 'sprechen'

/**
 * Generate a single exam module (one serverless invocation budget).
 */
export async function generateExamModule(
  level: ExamLevel,
  module: ExamModuleKey,
  context?: LogContext
): Promise<{ content: Record<string, unknown>; answers: Record<string, unknown> }> {
  const content: Record<string, unknown> = {}
  const answers: Record<string, unknown> = {}

  if (module === 'lesen') {
    const r = await generateLesenFull(level, context)
    content.lesen = r.content
    Object.assign(answers, r.answers as Record<string, unknown>)
  } else if (module === 'horen') {
    const r = await generateHorenFull(level, context)
    content.horen = r.content
    Object.assign(answers, r.answers as Record<string, unknown>)
  } else if (module === 'schreiben') {
    const r = await generateSchreiben(level, context)
    content.schreiben = r.content
  } else if (module === 'sprechen') {
    const r = await generateSprechen(level, context)
    content.sprechen = r.content
  } else {
    throw new Error(`Unknown module: ${module}`)
  }

  return { content, answers }
}
