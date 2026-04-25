import { ImageResponse } from 'next/og'
import { createServerClient } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const alt = 'DeutschTest.pro · Goethe-Zertifikat result'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const MODULE_LABELS_DE: Record<string, string> = {
  lesen: 'Lesen.',
  horen: 'Hören.',
  schreiben: 'Schreiben.',
  sprechen: 'Sprechen.',
}

// Same DE strings the score card shows. Frozen here so the OG never depends
// on next-intl message loading inside the Edge/Node runtime.
const SUMMARY_DE: Record<'high' | 'midHigh' | 'midLow' | 'low', { title: string; subtitle: string }> = {
  high:    { title: 'Hervorragend.',    subtitle: 'Sicher bestanden.' },
  midHigh: { title: 'Gut.',             subtitle: 'Bestanden.' },
  midLow:  { title: 'Knapp.',           subtitle: 'Nicht bestanden.' },
  low:     { title: 'Mehr Übung nötig.', subtitle: 'Nicht bestanden.' },
}

function getScoreTone(score: number) {
  if (score >= 80) return { tone: 'high'    as const, color: '#3aa56b' }  // success
  if (score >= 60) return { tone: 'midHigh' as const, color: '#5b6dde' }  // accent (cobalt)
  if (score >= 40) return { tone: 'midLow'  as const, color: '#c89432' }  // warn
  return                  { tone: 'low'     as const, color: '#cf4438' }  // error
}

const INK = '#1a1d2e'
const MUTED = '#7c7f8c'
const PAGE = '#fafaf9'
const LINE = '#e6e7eb'

export default async function OgImage({ params }: { params: { public_id: string } }) {
  const supabase = createServerClient()
  const { data: session } = await supabase
    .from('exam_sessions')
    .select('id, level, mode, public_id, is_public')
    .eq('public_id', params.public_id)
    .maybeSingle()

  if (!session || !session.is_public) {
    // Mirror the page's 404 — bots that cache OG previews shouldn't get a
    // valid image for revoked or non-existent public_ids.
    return new Response('Not found', { status: 404 })
  }

  const moduleKey = (session.mode as string) ?? 'lesen'
  const level: string = session.level
  let score: number | undefined

  const { data: attempt } = await supabase
    .from('user_attempts')
    .select('scores')
    .eq('session_id', session.id)
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  const scores = (attempt?.scores as Record<string, number> | null) ?? null
  if (scores && typeof scores[moduleKey] === 'number') {
    score = scores[moduleKey]
  }

  const moduleLabel = MODULE_LABELS_DE[moduleKey] ?? 'Modul.'
  const accent = score !== undefined ? getScoreTone(score) : { tone: 'midHigh' as const, color: '#5b6dde' }
  const summary = SUMMARY_DE[accent.tone]
  const eyebrowText = `ZERTIFIKAT · GOETHE ${level.toUpperCase()}`

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
        {/* Color accent stripe — cobalt/green/warn/error per score */}
        <div
          style={{
            width: 8,
            background: accent.color,
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
          {/* Top: eyebrow */}
          <div
            style={{
              fontSize: 22,
              letterSpacing: 4,
              color: MUTED,
              fontWeight: 500,
              fontFamily: 'monospace',
            }}
          >
            {eyebrowText}
          </div>

          {/* Middle: module + score + verdict */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div
              style={{
                fontSize: 96,
                fontWeight: 700,
                color: INK,
                letterSpacing: -3,
                lineHeight: 1,
              }}
            >
              {moduleLabel}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 32 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                <div
                  style={{
                    fontSize: 180,
                    fontWeight: 700,
                    color: INK,
                    letterSpacing: -8,
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {score ?? '—'}
                </div>
                <div style={{ fontSize: 36, color: MUTED, fontFamily: 'monospace' }}>
                  / 100
                </div>
              </div>

              {score !== undefined && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    paddingBottom: 24,
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      fontSize: 48,
                      fontWeight: 700,
                      color: INK,
                      letterSpacing: -1.5,
                      lineHeight: 1,
                    }}
                  >
                    {summary.title}
                  </div>
                  <div style={{ fontSize: 28, color: MUTED, lineHeight: 1.2 }}>
                    {summary.subtitle}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom: brand */}
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
