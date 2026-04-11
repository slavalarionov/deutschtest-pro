// server-only — this file must NEVER be imported in client components

import { resolveVoiceId, type VoiceRole } from '@/lib/voices'
import { concatenateMp3Buffers } from '@/lib/concat-mp3'

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1'

export interface DialogueTtsLine {
  role: VoiceRole
  text: string
  emotion?: string
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
  }
}

async function synthesizeToBuffer(
  text: string,
  voiceId: string,
  emotion?: string
): Promise<Buffer> {
  const response = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: voiceSettings(emotion),
      }),
    }
  )

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    const keyPreview = process.env.ELEVENLABS_API_KEY
      ? `${process.env.ELEVENLABS_API_KEY.slice(0, 8)}...`
      : 'MISSING'
    console.error(
      `ElevenLabs ${response.status} | key: ${keyPreview} | body: ${errorBody.slice(0, 200)}`
    )
    throw new Error(`ElevenLabs API error: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/** Ein Sprecher: Legacy voiceType (male_casual, …) oder VoiceRole (casual_male, …). */
export async function generateSpeech(
  text: string,
  voiceType: string
): Promise<Buffer> {
  const voiceId = resolveVoiceId(voiceType)
  return synthesizeToBuffer(text, voiceId)
}

/** Mehrere Sprecher: parallele TTS, dann MP3-Zusammenfügung. */
export async function generateDialogue(
  lines: DialogueTtsLine[]
): Promise<Buffer> {
  const buffers = await Promise.all(
    lines.map((line) =>
      synthesizeToBuffer(
        line.text,
        resolveVoiceId(line.role),
        line.emotion
      )
    )
  )
  return concatenateMp3Buffers(buffers)
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
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`ElevenLabs STT error: ${response.status}`)
  }

  const data = await response.json()
  return data.text
}
