import { ImageResponse } from 'next/og'
import { createServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const alt = 'DeutschTest.pro · Personalized study plan'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const INK = '#1a1d2e'
const MUTED = '#7c7f8c'
const PAGE = '#fafaf9'
const LINE = '#e6e7eb'
const ACCENT = '#5b6dde'

export default async function OgImage({ params }: { params: { public_id: string } }) {
  const supabase = createServerClient()
  const { data: row } = await supabase
    .from('user_recommendations')
    .select('weak_areas, is_public, public_id')
    .eq('public_id', params.public_id)
    .maybeSingle()

  if (!row || !row.is_public) {
    return new Response('Not found', { status: 404 })
  }

  const weakAreas = (row.weak_areas as Array<unknown> | null) ?? []
  const count = weakAreas.length

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: PAGE,
          display: 'flex',
          padding: 80,
          fontFamily: 'Inter',
        }}
      >
        <div
          style={{
            width: 8,
            background: ACCENT,
            borderRadius: 4,
            marginRight: 56,
          }}
        />

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              fontSize: 22,
              letterSpacing: 4,
              color: MUTED,
              fontWeight: 500,
              fontFamily: 'monospace',
            }}
          >
            LERNPLAN · DEUTSCHTEST.PRO
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div
              style={{
                fontSize: 124,
                fontWeight: 700,
                color: INK,
                letterSpacing: -4,
                lineHeight: 1,
              }}
            >
              Ihr Lernplan.
            </div>
            <div
              style={{
                fontSize: 56,
                fontWeight: 500,
                color: MUTED,
                letterSpacing: -1.5,
                lineHeight: 1.1,
              }}
            >
              {count} {count === 1 ? 'Wachstumsfeld identifiziert.' : 'Wachstumsfelder identifiziert.'}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: `1px solid ${LINE}`,
              paddingTop: 24,
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontFamily: 'monospace',
                color: MUTED,
                letterSpacing: 2,
              }}
            >
              DEUTSCHTEST.PRO
            </div>
            <div
              style={{
                fontSize: 18,
                fontFamily: 'monospace',
                color: MUTED,
                letterSpacing: 1.5,
              }}
            >
              KI · GOETHE · A1 / A2 / B1
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  )
}
