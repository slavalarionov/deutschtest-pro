import { z } from 'zod'
import type { ExamSession, ModuleScores } from './exam'

// --- Request schemas ---

export const generateExamSchema = z.object({
  level: z.enum(['A1', 'A2', 'B1']),
  modules: z.array(z.enum(['lesen', 'horen', 'schreiben', 'sprechen'])).min(1).max(4),
})

export const generateAudioSchema = z.object({
  sessionId: z.string().uuid(),
  scriptId: z.number(),
  text: z.string(),
  voiceType: z.enum([
    'male_professional',
    'female_professional',
    'male_casual',
    'female_casual',
  ]),
})

// --- Request types ---

export type GenerateExamRequest = z.infer<typeof generateExamSchema>
export type GenerateAudioRequest = z.infer<typeof generateAudioSchema>

// --- Response types ---

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface GenerateExamResponse {
  session: ExamSession
}

export interface SubmitExamResponse {
  scores: ModuleScores
  feedback?: Record<string, unknown>
}

export interface GenerateAudioResponse {
  audioUrl: string
}

export interface TranscribeResponse {
  transcript: string
  score?: number
  feedback?: string
}
