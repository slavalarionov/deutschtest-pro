// server-only — this file must NEVER be imported in client components

import { getInterLineSilenceMp3 } from '@/lib/audio/silence-between-lines'
import { resolveVoiceId, type VoiceRole } from '@/lib/voices'
import { concatenateMp3Buffers } from '@/lib/concat-mp3'
import { logAiUsage, type LogContext } from './ai-usage-logger'
import { classifyError } from './ai-usage-error-classifier'
import { calculateElevenLabsTtsCost } from './ai-pricing'

const ELEVENLABS_API_URL =
  process.env.ELEVENLABS_API_URL_OVERRIDE || 'https://api.elevenlabs.io/v1'

function getProxyHeaders(): Record<string, string> {
  if (!process.env.ELEVENLABS_API_URL_OVERRIDE) return {}
  const secret = process.env.ELEVENLABS_PROXY_SECRET
  if (!secret) return {}
  return { 'x-proxy-secret': secret }
}

const TTS_MAX_RETRIES = 6

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Free/Creator: oft nur 1 gleichzeitiger TTS-Request — siehe concurrent_limit_exceeded. */
function getDialogueTtsConcurrency(): number {
  const raw = process.env.ELEVENLABS_TTS_CONCURRENCY
  if (raw === undefined || raw === '') return 1
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(n, 4)
}

export interface DialogueTtsLine {
  role: VoiceRole
  text: string
  emotion?: string
}

function getSpeechSpeed(): number {
  const raw = process.env.ELEVENLABS_TTS_SPEED
  if (raw === undefined || raw === '') return 0.9
  const n = parseFloat(raw)
  if (!Number.isFinite(n)) return 0.9
  return Math.min(1.2, Math.max(0.7, n))
}

function voiceSettings(emotion?: string) {
  const styleMap: Record<string, number> = {
    neutral: 0.2,
    happy: 0.45,
    worried: 0.15,
    angry: 0.4,
    sad: 0.1,
    polite: 0.28,
  }
  const style =
    emotion && styleMap[emotion] !== undefined ? styleMap[emotion] : 0.2
  return {
    stability: 0.75,
    similarity_boost: 0.75,
    style,
    use_speaker_boost: true,
    speed: getSpeechSpeed(),
  }
}

async function synthesizeToBuffer(
  text: string,
  voiceId: string,
  emotion?: string,
  context?: LogContext
): Promise<Buffer> {
  let last429 = false

  for (let attempt = 0; attempt < TTS_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const base = Math.min(12_000, 800 * 2 ** attempt)
      const jitter = Math.random() * 500
      await sleep(base + jitter)
    }

    const startedAt = Date.now()
    const attemptNumber = attempt + 1

    let response: Response
    try {
      response = await fetch(
        `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': process.env.ELEVENLABS_API_KEY!,
            'User-Agent': 'Mozilla/5.0 (compatible; DeutschTest/1.0; +https://deutschtest.pro)',
            'Accept': 'audio/mpeg',
            ...getProxyHeaders(),
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: voiceSettings(emotion),
          }),
        }
      )
    } catch (err) {
      logAiUsage({
        provider: 'elevenlabs',
        model: 'eleven_multilingual_v2',
        operation: 'tts_generate',
        characters: text.length,
        costUsd: 0,
        status: classifyError(err),
        errorMessage: err instanceof Error ? err.message : String(err),
        errorStack: err instanceof Error ? err.stack ?? null : null,
        latencyMs: Date.now() - startedAt,
        attemptNumber,
        sessionId: context?.sessionId ?? null,
        userId: context?.userId ?? null,
      }).catch(() => {})
      throw err
    }

    if (response.status === 429) {
      last429 = true
      const errorBody = await response.text().catch(() => '')
      console.warn(
        `ElevenLabs 429 (attempt ${attemptNumber}/${TTS_MAX_RETRIES}) voice=${voiceId.slice(0, 8)}… ${errorBody.slice(0, 120)}`
      )
      logAiUsage({
        provider: 'elevenlabs',
        model: 'eleven_multilingual_v2',
        operation: 'tts_generate',
        characters: text.length,
        costUsd: 0,
        status: 'rate_limit',
        errorMessage: `429: ${errorBody.slice(0, 300)}`,
        latencyMs: Date.now() - startedAt,
        attemptNumber,
        sessionId: context?.sessionId ?? null,
        userId: context?.userId ?? null,
      }).catch(() => {})
      continue
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      const keyPreview = process.env.ELEVENLABS_API_KEY
        ? `${process.env.ELEVENLABS_API_KEY.slice(0, 8)}...`
        : 'MISSING'
      console.error(
        `ElevenLabs ${response.status} | key: ${keyPreview} | body: ${errorBody.slice(0, 200)}`
      )
      logAiUsage({
        provider: 'elevenlabs',
        model: 'eleven_multilingual_v2',
        operation: 'tts_generate',
        characters: text.length,
        costUsd: 0,
        status: 'error',
        errorMessage: `ElevenLabs ${response.status}: ${errorBody.slice(0, 300)}`,
        latencyMs: Date.now() - startedAt,
        attemptNumber,
        sessionId: context?.sessionId ?? null,
        userId: context?.userId ?? null,
      }).catch(() => {})
      throw new Error(`ElevenLabs API error: ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()

    const cost = calculateElevenLabsTtsCost('eleven_multilingual_v2', text.length)
    logAiUsage({
      provider: 'elevenlabs',
      model: 'eleven_multilingual_v2',
      operation: 'tts_generate',
      characters: text.length,
      costUsd: cost,
      status: 'success',
      latencyMs: Date.now() - startedAt,
      attemptNumber,
      sessionId: context?.sessionId ?? null,
      userId: context?.userId ?? null,
    }).catch(() => {})

    return Buffer.from(arrayBuffer)
  }

  if (last429) {
    throw new Error('ElevenLabs API error: 429 (rate limit after retries)')
  }
  throw new Error('ElevenLabs TTS failed')
}

/** Ein Sprecher: Legacy voiceType (male_casual, …) oder VoiceRole (casual_male, …). */
export async function generateSpeech(
  text: string,
  voiceType: string,
  context?: LogContext
): Promise<Buffer> {
  const voiceId = resolveVoiceId(voiceType)
  return synthesizeToBuffer(text, voiceId, undefined, context)
}

/** Mehrere Sprecher: standardmäßig strikt nacheinander (vermeidet concurrent_limit_exceeded). */
export async function generateDialogue(
  lines: DialogueTtsLine[],
  context?: LogContext
): Promise<Buffer> {
  const buffers: Buffer[] = []
  const concurrent = getDialogueTtsConcurrency()
  for (let i = 0; i < lines.length; i += concurrent) {
    const chunk = lines.slice(i, i + concurrent)
    const parts = await Promise.all(
      chunk.map((line) =>
        synthesizeToBuffer(
          line.text,
          resolveVoiceId(line.role),
          line.emotion,
          context
        )
      )
    )
    buffers.push(...parts)
  }

  const silence = getInterLineSilenceMp3()
  const withPauses: Buffer[] = []
  for (let i = 0; i < buffers.length; i++) {
    withPauses.push(buffers[i])
    if (i < buffers.length - 1) {
      withPauses.push(silence)
    }
  }
  return concatenateMp3Buffers(withPauses)
}

export async function transcribeSpeech(
  audioBuffer: Buffer
): Promise<string> {
  const formData = new FormData()
  formData.append(
    'audio',
    new Blob([new Uint8Array(audioBuffer)], { type: 'audio/webm' }),
    'recording.webm'
  )
  formData.append('model_id', 'scribe_v1')
  formData.append('language_code', 'deu')

  const response = await fetch(`${ELEVENLABS_API_URL}/speech-to-text`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      'User-Agent': 'Mozilla/5.0 (compatible; DeutschTest/1.0; +https://deutschtest.pro)',
      ...getProxyHeaders(),
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`ElevenLabs STT error: ${response.status}`)
  }

  const data = await response.json()
  return data.text
}
