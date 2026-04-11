// server-only — Supabase-backed session store
import { createServerClient } from '@/lib/supabase-server'
import type { Json } from '@/types/supabase'

export interface StoredSession {
  id: string
  userId: string
  level: string
  mode: string
  sessionFlow: 'single' | 'full_test'
  currentModule: string | null
  content: Record<string, unknown>
  answers: Record<string, unknown>
  audioUrls?: Record<string, unknown> | null
  createdAt: string
  expiresAt: string
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
    content: session.content as unknown as Json,
    answers: session.answers as unknown as Json,
    audio_urls: (session.audioUrls ?? null) as unknown as Json,
    created_at: session.createdAt,
    expires_at: session.expiresAt,
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

  const flow = data.session_flow === 'full_test' ? 'full_test' : 'single'

  return {
    id: data.id,
    userId: data.user_id,
    level: data.level,
    mode: data.mode,
    sessionFlow: flow,
    currentModule: data.current_module ?? null,
    content: data.content as Record<string, unknown>,
    answers: (data.answers ?? {}) as Record<string, unknown>,
    audioUrls: data.audio_urls as Record<string, unknown> | null,
    createdAt: data.created_at,
    expiresAt: data.expires_at,
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
