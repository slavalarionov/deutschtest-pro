import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateDialogue, generateSpeech } from '@/lib/elevenlabs'
import {
  dialogueCachePath,
  downloadCachedMp3,
  monologueCachePath,
  uploadCachedMp3,
} from '@/lib/supabase-audio-cache'
import { horenDialogueEmotionSchema } from '@/lib/horen-emotion'

const horenVoiceRoleRequest = z.enum([
  'casual_female',
  'casual_male',
  'professional_female',
  'professional_male',
  'announcer',
  'elderly_female',
  'child',
])

const dialogueLineRequest = z.object({
  speaker: z.string().optional(),
  role: horenVoiceRoleRequest,
  text: z.string().min(1).max(4000),
  emotion: horenDialogueEmotionSchema,
})

const requestSchema = z
  .object({
    text: z.string().min(1).max(5000).optional(),
    voiceType: z
      .enum([
        'male_professional',
        'female_professional',
        'male_casual',
        'female_casual',
      ])
      .optional(),
    dialogue: z.array(dialogueLineRequest).min(2).max(80).optional(),
    cacheKey: z.string().optional(),
  })
  .refine(
    (b) => {
      const mono = Boolean(b.text && b.voiceType)
      const dia = Boolean(b.dialogue && b.dialogue.length >= 2)
      return mono !== dia
    },
    { message: 'Either text+voiceType or dialogue (min 2 lines)' }
  )

const g = globalThis as Record<string, unknown>
function getAudioMemoryCache(): Map<string, ArrayBuffer> {
  if (!g.__audio_cache__) g.__audio_cache__ = new Map<string, ArrayBuffer>()
  return g.__audio_cache__ as Map<string, ArrayBuffer>
}

export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'invalid_request',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }

    const data = parsed.data
    const memoryCache = getAudioMemoryCache()

    const storagePath = data.dialogue
      ? dialogueCachePath(
          data.dialogue.map((l) => ({
            role: l.role,
            text: l.text,
            emotion: l.emotion,
          }))
        ).path
      : monologueCachePath(data.voiceType!, data.text!).path

    if (memoryCache.has(storagePath)) {
      const cached = memoryCache.get(storagePath)!
      return new NextResponse(cached, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(cached.byteLength),
          'Cache-Control': 'private, max-age=3600',
          'X-Audio-Cache': 'memory',
        },
      })
    }

    let fromSupabase = await downloadCachedMp3(storagePath)
    if (fromSupabase) {
      const ab = fromSupabase.buffer.slice(
        fromSupabase.byteOffset,
        fromSupabase.byteOffset + fromSupabase.byteLength
      ) as ArrayBuffer
      memoryCache.set(storagePath, ab)
      return new NextResponse(ab, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(ab.byteLength),
          'Cache-Control': 'private, max-age=3600',
          'X-Audio-Cache': 'supabase',
        },
      })
    }

    const audioBuffer = data.dialogue
      ? await generateDialogue(
          data.dialogue.map((l) => ({
            role: l.role,
            text: l.text,
            emotion: l.emotion,
          }))
        )
      : await generateSpeech(data.text!, data.voiceType!)

    await uploadCachedMp3(storagePath, audioBuffer)

    const ab = audioBuffer.buffer.slice(
      audioBuffer.byteOffset,
      audioBuffer.byteOffset + audioBuffer.byteLength
    ) as ArrayBuffer
    memoryCache.set(storagePath, ab)

    return new NextResponse(ab, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(ab.byteLength),
        'Cache-Control': 'private, max-age=3600',
        'X-Audio-Cache': 'miss',
      },
    })
  } catch (err) {
    console.error(
      'Audio generation error:',
      err instanceof Error ? err.message : err
    )
    return NextResponse.json(
      { success: false, error: 'Failed to generate audio' },
      { status: 500 }
    )
  }
}
