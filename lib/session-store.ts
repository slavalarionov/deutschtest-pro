// server-only — Supabase-backed session store
import { createServerClient } from '@/lib/supabase-server'
import type { Json } from '@/types/supabase'

export interface StoredSession {
  id: string
  userId: string
  level: string
  mode: string
  sessionFlow: 'single' | 'multi' | 'full_test'
  currentModule: string | null
  completedModules: string
  content: Record<string, unknown>
  answers: Record<string, unknown>
  audioUrls?: Record<string, unknown> | null
  createdAt: string
  expiresAt: string
  retakeOf?: string | null
  retakeModule?: string | null
}

export async function saveSession(session: StoredSession): Promise<void> {
  const supabase = createServerClient()

  const { error } = await supabase.from('exam_sessions').insert({
    id: session.id,
    user_id: session.userId,
    level: session.level,
    mode: session.mode,
    session_flow: session.sessionFlow,
    current_module: session.currentModule,
    completed_modules: session.completedModules,
    content: session.content as unknown as Json,
    answers: session.answers as unknown as Json,
    audio_urls: (session.audioUrls ?? null) as unknown as Json,
    created_at: session.createdAt,
    expires_at: session.expiresAt,
    retake_of: session.retakeOf ?? null,
    retake_module: session.retakeModule ?? null,
  })

  if (error) {
    throw new Error(`Failed to save session: ${error.message}`)
  }
}

export async function getSession(id: string): Promise<StoredSession | null> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('exam_sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null

  let flow: StoredSession['sessionFlow'] = 'single'
  if (data.session_flow === 'full_test') flow = 'full_test'
  else if (data.session_flow === 'multi') flow = 'multi'

  return {
    id: data.id,
    userId: data.user_id,
    level: data.level,
    mode: data.mode,
    sessionFlow: flow,
    currentModule: data.current_module ?? null,
    completedModules: data.completed_modules ?? '',
    content: data.content as Record<string, unknown>,
    answers: (data.answers ?? {}) as Record<string, unknown>,
    audioUrls: data.audio_urls as Record<string, unknown> | null,
    createdAt: data.created_at,
    expiresAt: data.expires_at,
    retakeOf: (data.retake_of as string | null) ?? null,
    retakeModule: (data.retake_module as string | null) ?? null,
  }
}

export async function deleteSession(id: string): Promise<void> {
  const supabase = createServerClient()

  const { error } = await supabase
    .from('exam_sessions')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete session: ${error.message}`)
  }
}

/** Merge generated module payload into an existing session (on-demand generation). */
export async function mergeSessionContentAndAnswers(
  id: string,
  partialContent: Record<string, unknown>,
  partialAnswers: Record<string, unknown>
): Promise<void> {
  const existing = await getSession(id)
  if (!existing) {
    throw new Error('Session not found')
  }

  const content = { ...existing.content, ...partialContent }
  const answers = { ...existing.answers, ...partialAnswers }

  const supabase = createServerClient()
  const { error } = await supabase
    .from('exam_sessions')
    .update({
      content: content as unknown as Json,
      answers: answers as unknown as Json,
    })
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to merge session content: ${error.message}`)
  }
}
