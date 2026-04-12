// server-only — this file must NEVER be imported in client components

import OpenAI from 'openai'
import { logAiUsage } from './ai-usage-logger'
import { calculateWhisperCost } from './ai-pricing'

let _openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

/**
 * Transcribe audio using OpenAI Whisper with forced German language.
 * Forcing `language: "de"` significantly improves accuracy
 * for non-native / accented speakers learning German.
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename = 'recording.webm'
): Promise<string> {
  const file = new File(
    [new Uint8Array(audioBuffer)],
    filename,
    { type: 'audio/webm' }
  )

  const response = await getOpenAI().audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'de',
    response_format: 'verbose_json',
  })

  const audioSeconds = (response as { duration?: number }).duration ?? 0
  const cost = calculateWhisperCost('whisper-1', audioSeconds)
  logAiUsage({
    provider: 'openai',
    model: 'whisper-1',
    operation: 'whisper_transcribe',
    audioSeconds,
    costUsd: cost,
  }).catch(() => {})

  return response.text
}
