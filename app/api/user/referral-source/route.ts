import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  source: z.enum([
    'ai',
    'search',
    'friend',
    'teacher',
    'ads',
    'social',
    'other',
    'skipped',
  ]),
})

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Idempotency: if survey was already shown once, return 200 no-op.
    // Protects against double-clicks and stale tabs.
    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_source_asked')
      .eq('id', user.id)
      .single()

    if (profile?.referral_source_asked === true) {
      return NextResponse.json({ ok: true, alreadyAsked: true })
    }

    const { source } = parsed.data
    const { error } = await supabase
      .from('profiles')
      .update({
        referral_source: source === 'skipped' ? null : source,
        referral_source_asked: true,
      })
      .eq('id', user.id)

    if (error) {
      console.error('[referral-source] update failed:', error.message)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[referral-source]', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
