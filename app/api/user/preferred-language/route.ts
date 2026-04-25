import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  language: z.enum(['de', 'ru', 'en', 'tr']),
})

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid language. Expected one of: de, ru, en, tr' },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        preferred_language: parsed.data.language,
        // Drop both legacy jsonb cache (migration 012) and the snapshot pointer
        // (migration 028) — the next dashboard hit regenerates in the new locale.
        cached_recommendations: null,
        cached_recommendations_language: null,
        recommendations_attempts_count: null,
        recommendations_generated_at: null,
        current_recommendations_id: null,
      })
      .eq('id', user.id)

    if (error) {
      console.error('[preferred-language] update failed:', error.message)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[preferred-language]', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
