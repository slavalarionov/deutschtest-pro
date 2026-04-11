// server-only — Supabase Storage cache for generated MP3

import { createHash } from 'crypto'
import { createServerClient } from '@/lib/supabase-server'
import type { VoiceRole } from '@/lib/voices'

const DEFAULT_BUCKET = 'audio-cache'

export function getAudioCacheBucket(): string {
  return process.env.SUPABASE_AUDIO_BUCKET ?? DEFAULT_BUCKET
}

export function monologueCachePath(voiceType: string, text: string): { hash: string; path: string } {
  const hash = createHash('md5').update(`${voiceType}|${text}`).digest('hex')
  return { hash, path: `monologue/${hash}.mp3` }
}

export interface DialogueLineInput {
  role: VoiceRole
  text: string
  emotion?: string
}

export function dialogueCachePath(lines: DialogueLineInput[]): { hash: string; path: string } {
  const hash = createHash('md5').update(JSON.stringify(lines)).digest('hex')
  return { hash, path: `dialogues/${hash}.mp3` }
}

export async function downloadCachedMp3(storagePath: string): Promise<Buffer | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return null
  }

  try {
    const supabase = createServerClient()
    const bucket = getAudioCacheBucket()
    const { data, error } = await supabase.storage.from(bucket).download(storagePath)
    if (error || !data) return null
    return Buffer.from(await data.arrayBuffer())
  } catch {
    return null
  }
}

export async function uploadCachedMp3(storagePath: string, buffer: Buffer): Promise<boolean> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return false
  }

  try {
    const supabase = createServerClient()
    const bucket = getAudioCacheBucket()
    const { error } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
      contentType: 'audio/mpeg',
      upsert: true,
      cacheControl: '31536000',
    })
    if (error) {
      console.warn('[audio-cache] upload failed:', error.message)
      return false
    }
    return true
  } catch (e) {
    console.warn('[audio-cache] upload exception:', e)
    return false
  }
}
