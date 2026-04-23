import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { transcribeAudio } from '@/lib/whisper'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set.')
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const formData = await req.formData()
    const audioFile = formData.get('audio')
    const sessionIdRaw = formData.get('sessionId')
    const sessionId = typeof sessionIdRaw === 'string' && sessionIdRaw.length > 0 ? sessionIdRaw : null

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: 'Audio file required' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer())
    const filename = audioFile instanceof File ? audioFile.name : 'recording.webm'

    const transcript = await transcribeAudio(buffer, filename, {
      sessionId,
      userId: user.id,
    })

    return NextResponse.json({ success: true, transcript })
  } catch (error) {
    console.error('Whisper transcription failed:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: 'Transcription failed' },
      { status: 500 }
    )
  }
}
