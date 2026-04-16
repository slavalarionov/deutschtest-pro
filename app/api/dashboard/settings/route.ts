import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient as createStatelessClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const BodySchema = z
  .object({
    displayName: z.string().trim().max(80).optional(),
    currentPassword: z.string().min(1).optional(),
    newPassword: z.string().min(8).max(128).optional(),
  })
  .refine(
    (v) =>
      v.displayName !== undefined ||
      (v.currentPassword !== undefined && v.newPassword !== undefined),
    { message: 'Nichts zu aktualisieren.' }
  )

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Ungültige Anfrage.' },
      { status: 400 }
    )
  }

  const { displayName, currentPassword, newPassword } = parsed.data

  if (displayName !== undefined) {
    const value = displayName.length > 0 ? displayName : null
    const { error } = await createServerClient()
      .from('profiles')
      .update({ display_name: value })
      .eq('id', user.id)
    if (error) {
      console.error('[api/dashboard/settings] update display_name', error)
      return NextResponse.json(
        { error: 'Name konnte nicht gespeichert werden.' },
        { status: 500 }
      )
    }
  }

  if (currentPassword !== undefined && newPassword !== undefined) {
    if (!user.email) {
      return NextResponse.json(
        { error: 'Passwort-Änderung ist für dieses Konto nicht verfügbar.' },
        { status: 400 }
      )
    }

    const verifier = createStatelessClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const verify = await verifier.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (verify.error) {
      return NextResponse.json(
        { error: 'Aktuelles Passwort ist falsch.' },
        { status: 400 }
      )
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      console.error('[api/dashboard/settings] update password', error)
      return NextResponse.json(
        { error: 'Passwort konnte nicht aktualisiert werden.' },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ success: true })
}
