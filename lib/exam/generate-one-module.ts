import {
  generateLesenFull,
  generateSchreiben,
  generateHorenFull,
  generateSprechen,
} from '@/lib/claude'
import type { ExamLevel } from '@/types/exam'

export type ExamModuleKey = 'lesen' | 'horen' | 'schreiben' | 'sprechen'

/**
 * Generate a single exam module (one serverless invocation budget).
 */
export async function generateExamModule(
  level: ExamLevel,
  module: ExamModuleKey
): Promise<{ content: Record<string, unknown>; answers: Record<string, unknown> }> {
  const content: Record<string, unknown> = {}
  const answers: Record<string, unknown> = {}

  if (module === 'lesen') {
    const r = await generateLesenFull(level)
    content.lesen = r.content
    Object.assign(answers, r.answers as Record<string, unknown>)
  } else if (module === 'horen') {
    const r = await generateHorenFull(level)
    content.horen = r.content
    Object.assign(answers, r.answers as Record<string, unknown>)
  } else if (module === 'schreiben') {
    const r = await generateSchreiben(level)
    content.schreiben = r.content
  } else if (module === 'sprechen') {
    const r = await generateSprechen(level)
    content.sprechen = r.content
  } else {
    throw new Error(`Unknown module: ${module}`)
  }

  return { content, answers }
}
