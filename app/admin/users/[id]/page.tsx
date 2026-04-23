import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdminPage } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { StatusChip } from '@/components/admin/StatusChip'
import { UserActions } from './user-actions'

export const dynamic = 'force-dynamic'

interface ProfileRow {
  id: string
  email: string
  display_name: string | null
  full_name: string | null
  target_level: string | null
  created_at: string
  modules_balance: number
  is_admin: boolean
  is_unlimited: boolean | null
  is_blocked: boolean | null
}

interface AttemptRow {
  id: string
  session_id: string
  level: string
  started_at: string
  submitted_at: string | null
  is_free_test: boolean
  payment_status: string
  scores: unknown
}

interface LedgerRow {
  id: number
  delta: number
  reason: string
  note: string | null
  related_attempt_id: string | null
  related_promo_id: string | null
  performed_by: string | null
  created_at: string
}

interface PromoRedRow {
  id: number
  promo_id: string
  modules_granted: number
  redeemed_at: string
}

function fmt(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function extractBand(scores: unknown): string | null {
  if (!scores || typeof scores !== 'object') return null
  const s = scores as Record<string, unknown>
  if (typeof s.band === 'string') return s.band
  if (typeof s.total === 'number') return String(s.total)
  return null
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const admin = await requireAdminPage(`/admin/users/${params.id}`)
  const supabase = createAdminClient()

  const { data: profileData, error: profileErr } = await supabase
    .from('profiles')
    .select(
      'id, email, display_name, full_name, target_level, created_at, modules_balance, is_admin, is_unlimited, is_blocked'
    )
    .eq('id', params.id)
    .maybeSingle()

  if (profileErr || !profileData) notFound()
  const profile = profileData as ProfileRow

  const { data: authData } = await supabase
    .schema('auth')
    .from('users')
    .select('id, last_sign_in_at, email_confirmed_at')
    .eq('id', params.id)
    .maybeSingle()

  const authRow = (authData ?? {}) as {
    last_sign_in_at?: string | null
    email_confirmed_at?: string | null
  }

  const { data: attemptsData } = await supabase
    .from('user_attempts')
    .select('id, session_id, level, started_at, submitted_at, is_free_test, payment_status, scores')
    .eq('user_id', params.id)
    .order('started_at', { ascending: false })
    .limit(50)

  const attempts = (attemptsData ?? []) as AttemptRow[]

  const { data: ledgerData } = await supabase
    .from('modules_ledger')
    .select('id, delta, reason, note, related_attempt_id, related_promo_id, performed_by, created_at')
    .eq('user_id', params.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const ledger = (ledgerData ?? []) as LedgerRow[]

  const { data: redemptionData } = await supabase
    .from('promo_redemptions')
    .select('id, promo_id, modules_granted, redeemed_at')
    .eq('user_id', params.id)
    .order('redeemed_at', { ascending: false })

  const redemptions = (redemptionData ?? []) as PromoRedRow[]

  const { count: adminsCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_admin', true)

  const isSelf = admin.id === profile.id
  const totalAdmins = adminsCount ?? 0
  const noFlags = !profile.is_admin && !profile.is_unlimited && !profile.is_blocked

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <Link
          href="/admin/users"
          className="text-sm text-ink-soft transition-colors hover:text-ink"
        >
          К списку пользователей
        </Link>
      </div>

      {/* Header card */}
      <header className="rounded-rad border border-line bg-card p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
              User{profile.target_level ? ` · Ziel ${profile.target_level}` : ''}
            </div>
            <h1 className="mt-2 break-all font-mono text-2xl tracking-tight text-ink">
              {profile.email}
              {isSelf && (
                <span className="ml-3 font-mono text-xs uppercase tracking-wider text-accent-ink">
                  вы
                </span>
              )}
            </h1>
            <div className="mt-2 text-sm text-ink-soft">
              {profile.display_name ?? profile.full_name ?? '— без имени —'}
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {profile.is_admin && <StatusChip variant="admin">admin</StatusChip>}
              {profile.is_unlimited && (
                <StatusChip variant="unlimited">unlimited</StatusChip>
              )}
              {profile.is_blocked && <StatusChip variant="blocked">blocked</StatusChip>}
              {noFlags && <StatusChip variant="regular">regular</StatusChip>}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Balance
            </div>
            <div className="mt-2 font-display text-5xl tabular-nums tracking-tight text-ink">
              {profile.modules_balance}
            </div>
          </div>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
          <Meta label="ID">
            <code className="block break-all font-mono text-[10px] text-ink-soft">
              {profile.id}
            </code>
          </Meta>
          <Meta label="Регистрация">{fmt(profile.created_at)}</Meta>
          <Meta label="Last sign-in">{fmt(authRow.last_sign_in_at ?? null)}</Meta>
          <Meta label="Email подтверждён">{fmt(authRow.email_confirmed_at ?? null)}</Meta>
        </dl>
      </header>

      {/* Actions */}
      <UserActions
        user={{
          id: profile.id,
          email: profile.email,
          isAdmin: profile.is_admin,
          isUnlimited: profile.is_unlimited ?? false,
          isBlocked: profile.is_blocked ?? false,
          modulesBalance: profile.modules_balance,
        }}
        isSelf={isSelf}
        totalAdmins={totalAdmins}
      />

      {/* Attempts */}
      <DataSection
        title="Попытки"
        count={attempts.length}
        subtitle="последние 50"
        empty={attempts.length === 0 ? 'Попыток нет.' : null}
      >
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface font-mono text-[10px] uppercase tracking-widest text-muted">
            <tr>
              <th className="px-5 py-3 text-left font-normal">Started</th>
              <th className="px-5 py-3 text-left font-normal">Level</th>
              <th className="px-5 py-3 text-left font-normal">Статус</th>
              <th className="px-5 py-3 text-left font-normal">Оплата</th>
              <th className="px-5 py-3 text-left font-normal">Band / Score</th>
              <th className="px-5 py-3 text-left font-normal">Session ID</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((a) => (
              <tr key={a.id} className="border-b border-line-soft last:border-0">
                <td className="px-5 py-3 font-mono text-xs tabular-nums text-muted">
                  {fmt(a.started_at)}
                </td>
                <td className="px-5 py-3 font-mono text-sm text-ink">{a.level}</td>
                <td className="px-5 py-3 text-ink">
                  {a.submitted_at ? 'submitted' : 'in progress'}
                </td>
                <td className="px-5 py-3 text-muted">
                  {a.is_free_test ? 'free' : a.payment_status}
                </td>
                <td className="px-5 py-3 font-mono text-sm tabular-nums text-ink">
                  {extractBand(a.scores) ?? '—'}
                </td>
                <td className="px-5 py-3 font-mono text-[11px] text-muted">
                  {a.session_id.slice(0, 8)}…
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataSection>

      {/* Modules ledger */}
      <DataSection
        title="История модулей"
        count={ledger.length}
        subtitle="последние 50"
        empty={ledger.length === 0 ? 'Операций с модулями нет.' : null}
      >
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface font-mono text-[10px] uppercase tracking-widest text-muted">
            <tr>
              <th className="px-5 py-3 text-left font-normal">Когда</th>
              <th className="px-5 py-3 text-right font-normal">Δ</th>
              <th className="px-5 py-3 text-left font-normal">Причина</th>
              <th className="px-5 py-3 text-left font-normal">Note</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((l) => {
              const deltaClass =
                l.delta > 0 ? 'text-accent-ink' : 'text-muted'
              return (
                <tr key={l.id} className="border-b border-line-soft last:border-0">
                  <td className="px-5 py-3 font-mono text-xs tabular-nums text-muted">
                    {fmt(l.created_at)}
                  </td>
                  <td
                    className={`px-5 py-3 text-right font-mono text-sm tabular-nums ${deltaClass}`}
                  >
                    {l.delta >= 0 ? `+${l.delta}` : l.delta}
                  </td>
                  <td className="px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-ink-soft">
                    {l.reason}
                  </td>
                  <td className="px-5 py-3 text-sm text-muted">{l.note ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </DataSection>

      {/* Promo redemptions */}
      <DataSection
        title="Активированные промокоды"
        count={redemptions.length}
        empty={redemptions.length === 0 ? 'Промокоды не активировал.' : null}
      >
        <ul>
          {redemptions.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-4 border-b border-line-soft px-5 py-3 text-sm last:border-0"
            >
              <span className="font-mono text-xs text-muted">
                {r.promo_id.slice(0, 8)}…
              </span>
              <span className="font-mono text-sm tabular-nums text-accent-ink">
                +{r.modules_granted}
              </span>
              <span className="font-mono text-xs tabular-nums text-muted">
                {fmt(r.redeemed_at)}
              </span>
            </li>
          ))}
        </ul>
      </DataSection>
    </div>
  )
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-xs tabular-nums text-ink">{children}</dd>
    </div>
  )
}

function DataSection({
  title,
  count,
  subtitle,
  empty,
  children,
}: {
  title: string
  count: number
  subtitle?: string
  empty: string | null
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-rad border border-line bg-card">
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {title}
          </h2>
          <span className="font-mono text-xs tabular-nums text-ink-soft">({count})</span>
        </div>
        {subtitle && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            {subtitle}
          </span>
        )}
      </header>
      {empty ? (
        <div className="px-5 py-10 text-center font-mono text-xs text-muted">{empty}</div>
      ) : (
        <div className="overflow-x-auto">{children}</div>
      )}
    </section>
  )
}
