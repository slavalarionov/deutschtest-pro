export type ExamLevel = 'A1' | 'A2' | 'B1'
export type ExamModule = 'lesen' | 'horen' | 'schreiben' | 'sprechen'
export type ExamMode = 'full' | ExamModule

export interface ExamSession {
  id: string
  level: ExamLevel
  mode: ExamMode
  content: ExamContent
  audioUrls?: AudioUrls
  createdAt: string
  expiresAt: string
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

export interface HorenScript {
  id: number
  script: string
  voiceType: 'male_professional' | 'female_professional' | 'male_casual' | 'female_casual'
  audioUrl?: string
  tasks: HorenTask[]
  playCount: number
}

// --- Schreiben ---

export interface SchreibenContent {
  tasks: SchreibenTask[]
}

export interface SchreibenTask {
  id: number
  prompt: string
  context?: string
  requiredPoints?: string[]
  wordCount: number
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
