import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('OPENAI_API_KEY is not set. Available env keys:', Object.keys(process.env).filter(k => k.includes('KEY') || k.includes('API')).join(', '))
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const formData = await req.formData()
    const audioFile = formData.get('audio')

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: 'Audio file required' },
        { status: 400 }
      )
    }

    const openai = new OpenAI({ apiKey })

    const file = new File(
      [await audioFile.arrayBuffer()],
      audioFile instanceof File ? audioFile.name : 'recording.webm',
      { type: 'audio/webm' }
    )

    const response = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'de',
    })

    return NextResponse.json({ success: true, transcript: response.text })
  } catch (error) {
    console.error('Whisper transcription failed:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: 'Transcription failed' },
      { status: 500 }
    )
  }
}
