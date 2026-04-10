import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateSpeech } from '@/lib/elevenlabs'

const requestSchema = z.object({
  text: z.string().min(1).max(5000),
  voiceType: z.enum(['male_professional', 'female_professional', 'male_casual', 'female_casual']),
  cacheKey: z.string().optional(),
})

const g = globalThis as Record<string, unknown>
function getAudioCache(): Map<string, ArrayBuffer> {
  if (!g.__audio_cache__) g.__audio_cache__ = new Map<string, ArrayBuffer>()
  return g.__audio_cache__ as Map<string, ArrayBuffer>
}

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request' },
        { status: 400 }
      )
    }

    const { text, voiceType, cacheKey } = parsed.data
    const cache = getAudioCache()

    if (cacheKey && cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)!
      return new NextResponse(cached, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(cached.byteLength),
          'Cache-Control': 'private, max-age=3600',
        },
      })
    }

    const audioBuffer = await generateSpeech(text, voiceType)
    const ab = audioBuffer.buffer.slice(
      audioBuffer.byteOffset,
      audioBuffer.byteOffset + audioBuffer.byteLength
    ) as ArrayBuffer

    if (cacheKey) {
      cache.set(cacheKey, ab)
    }

    return new NextResponse(ab, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(ab.byteLength),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err) {
    console.error('Audio generation error:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { success: false, error: 'Failed to generate audio' },
      { status: 500 }
    )
  }
}
