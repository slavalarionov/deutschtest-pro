// server-only — this file must NEVER be imported in client components

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1'

const VOICE_MAP: Record<string, string> = {
  male_professional: 'pNInz6obpgDQGcFmaJgB',
  female_professional: 'EXAVITQu4vr4xnSDxMaL',
  male_casual: 'VR6AewLTigWG4xSOukaG',
  female_casual: 'MF3mGyEYCl7XYWbV9V6O',
}

export async function generateSpeech(
  text: string,
  voiceType: string
): Promise<Buffer> {
  const voiceId = VOICE_MAP[voiceType] || VOICE_MAP.male_professional

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
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.75,
          style: 0.2,
        },
      }),
    }
  )

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    const keyPreview = process.env.ELEVENLABS_API_KEY
      ? `${process.env.ELEVENLABS_API_KEY.slice(0, 8)}...`
      : 'MISSING'
    console.error(`ElevenLabs ${response.status} | key: ${keyPreview} | body: ${errorBody.slice(0, 200)}`)
    throw new Error(`ElevenLabs API error: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
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

  const response = await fetch(
    `${ELEVENLABS_API_URL}/speech-to-text`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      },
      body: formData,
    }
  )

  if (!response.ok) {
    throw new Error(`ElevenLabs STT error: ${response.status}`)
  }

  const data = await response.json()
  return data.text
}
