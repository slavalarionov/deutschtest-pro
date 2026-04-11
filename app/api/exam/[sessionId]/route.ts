import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session-store'

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID required' },
        { status: 400 }
      )
    }

    const stored = await getSession(sessionId)

    if (!stored) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    if (new Date(stored.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 410 }
      )
    }

    return NextResponse.json({
      success: true,
      session: {
        id: stored.id,
        level: stored.level,
        mode: stored.mode,
        sessionFlow: stored.sessionFlow,
        currentModule: stored.currentModule,
        completedModules: stored.completedModules,
        content: stored.content,
        createdAt: stored.createdAt,
        expiresAt: stored.expiresAt,
      },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
