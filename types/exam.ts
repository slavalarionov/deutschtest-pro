import { z } from 'zod'

export type ExamLevel = 'A1' | 'A2' | 'B1'
export type ExamModule = 'lesen' | 'horen' | 'schreiben' | 'sprechen'
/** Single module id, comma-separated list, or legacy `full` */
export type ExamMode = string

export interface ExamSession {
  id: string
  level: ExamLevel
  mode: ExamMode
  /** single = one module; multi = custom subset; full_test = legacy four-in-one (mode `full`) */
  sessionFlow: 'single' | 'multi' | 'full_test'
  /** First / active module in multi flow; null for single-module sessions */
  currentModule: string | null
  /** Comma-separated completed modules (exam order) */
  completedModules: string
  content: ExamContent
  audioUrls?: AudioUrls
  createdAt: string
  expiresAt: string
  /** If this session is a single-module retake, original session id */
  retakeOf?: string | null
  /** Which module is being retaken */
  retakeModule?: string | null
}

export interface ExamContent {
  lesen?: LesenContent
  horen?: HorenContent
  schreiben?: SchreibenContent
  sprechen?: SprechenContent
}

export interface AudioUrls {
  horen?: Record<string, string>
}

export interface UserAttempt {
  id: string
  userId: string
  sessionId: string
  level: ExamLevel
  startedAt: string
  submittedAt?: string
  scores?: ModuleScores
  aiFeedback?: AiFeedback
}

export interface ModuleScores {
  lesen?: number
  horen?: number
  schreiben?: number
  sprechen?: number
}

export interface AiFeedback {
  lesen?: string
  horen?: string
  schreiben?: SchreibenFeedback
  sprechen?: SprechenFeedback
}

export interface SchreibenFeedback {
  score: number
  criteria: {
    taskFulfillment: number
    coherence: number
    vocabulary: number
    grammar: number
  }
  comment: string
}

export interface SprechenFeedback {
  score: number
  criteria: {
    taskFulfillment: number
    fluency: number
    vocabulary: number
    grammar: number
    pronunciation: number
  }
  comment: string
}

// --- Lesen ---

export interface LesenContent {
  teil1: LesenTeil1
  teil2: LesenTeil2
  teil3: LesenTeil3
  teil4: LesenTeil4
  teil5: LesenTeil5
}

// Teil 1: Blog + richtig/falsch
export interface LesenTask {
  id: number
  statement: string
  answer?: 'richtig' | 'falsch' | 'ja' | 'nein' | 'a' | 'b' | 'c'
  isExample?: boolean
}

export interface LesenTeil1 {
  text: string
  tasks: LesenTask[]
}

// Teil 2: Zeitungsartikel + Multiple Choice (a/b/c)
export interface LesenMCTask {
  id: number
  question: string
  options: { a: string; b: string; c: string }
  answer?: 'a' | 'b' | 'c'
  isExample?: boolean
}

export interface LesenTeil2 {
  text: string
  tasks: LesenMCTask[]
}

// Teil 3: Regeltext + ja/nein
export type LesenTeil3 = LesenTeil1

// Teil 4: Kurztexte + Zuordnung
export interface LesenTeil4Situation {
  id: number
  situation: string
  answer?: string
  isExample?: boolean
}

export interface LesenTeil4 {
  texts: { id: number | string; text: string }[]
  situations: LesenTeil4Situation[]
}

// Teil 5: Lückentext + a/b/c
export interface LesenGap {
  id: number
  options: { a: string; b: string; c: string }
  answer?: 'a' | 'b' | 'c'
  isExample?: boolean
}

export interface LesenTeil5 {
  text: string
  gaps: LesenGap[]
}

// --- Hören ---

export interface HorenContent {
  teil1: HorenTeil
  teil2: HorenTeil
  teil3: HorenTeil
  teil4: HorenTeil
}

export interface HorenTeil {
  scripts: HorenScript[]
}

export type HorenTaskRF = {
  id: number
  type: 'rf'
  statement: string
  answer?: 'richtig' | 'falsch'
}

export type HorenTaskMC = {
  id: number
  type: 'mc'
  question: string
  options: { a: string; b: string; c: string }
  answer?: 'a' | 'b' | 'c'
}

export type HorenTask = HorenTaskRF | HorenTaskMC

/** Rollen für Mehrsprecher-Hörtexte (ElevenLabs) — siehe lib/voices.ts */
export type HorenVoiceRole =
  | 'casual_female'
  | 'casual_male'
  | 'professional_female'
  | 'professional_male'
  | 'announcer'
  | 'elderly_female'
  | 'child'

export type HorenDialogueEmotion =
  | 'neutral'
  | 'happy'
  | 'worried'
  | 'angry'
  | 'sad'
  | 'polite'

export interface HorenDialogueLine {
  speaker: string
  role: HorenVoiceRole
  text: string
  emotion?: HorenDialogueEmotion
}

export type HorenLegacyVoiceType =
  | 'male_professional'
  | 'female_professional'
  | 'male_casual'
  | 'female_casual'

/** Ein Script: entweder ein Sprecher (script) oder Dialog (dialogue). */
export interface HorenScript {
  id: number
  playCount: number
  tasks: HorenTask[]
  script?: string
  voiceType?: HorenLegacyVoiceType
  dialogue?: HorenDialogueLine[]
  audioUrl?: string
}

// --- Schreiben ---

export interface SchreibenContent {
  tasks: SchreibenTask[]
}

export interface SchreibenTask {
  id: number
  type: 'email' | 'brief' | 'forum'
  situation: string
  prompt: string
  requiredPoints: string[]
  wordCount: number
  /** Nur bei type === 'forum': Originalbeitrag im Forum. */
  samplePost?: string
  /** Für Anzeige und Scoring (z. B. Forum-Beitrag als Kontext). */
  context: string
}

// --- Sprechen ---

export interface SprechenContent {
  tasks: SprechenTask[]
}

export interface SprechenTask {
  id: number
  type: 'planning' | 'presentation' | 'reaction'
  topic: string
  points: string[]
}

// --- User input (persisted on user_attempts.user_input) ---
//
// Schreiben: the text the user wrote.
// Sprechen:  the Whisper transcript of the user's recording (joined across
//            teils on the client before submit).
// Lesen / Hören: not stored — clicked answers already live in scores.

export const userInputSchreibenSchema = z.object({
  text: z.string(),
  wordCount: z.number().int().nonnegative().optional(),
})

export const userInputSprechenSchema = z.object({
  transcript: z.string(),
  durationSeconds: z.number().nonnegative().optional(),
})

export const userInputSchema = z.object({
  schreiben: userInputSchreibenSchema.optional(),
  sprechen: userInputSprechenSchema.optional(),
})

export type UserInput = z.infer<typeof userInputSchema>
export type UserInputSchreiben = z.infer<typeof userInputSchreibenSchema>
export type UserInputSprechen = z.infer<typeof userInputSprechenSchema>
