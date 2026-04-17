import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdminPage } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
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

  return (
    <div className="max-w-5xl space-y-6">
      <div className="text-xs text-[#6B6560]">
        <Link href="/admin/users" className="hover:text-[#1A1A1A]">
          ← К списку пользователей
        </Link>
      </div>

      {/* Header */}
      <header className="border border-[#E0DDD6] rounded-md bg-white p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] font-mono">
              {profile.email}
              {isSelf && (
                <span className="ml-2 text-sm text-[#C8A84B] font-sans normal-case">(вы)</span>
              )}
            </h1>
            <div className="mt-1 text-sm text-[#6B6560]">
              {profile.display_name ?? profile.full_name ?? '— без имени —'}
              {profile.target_level && <span className="ml-2">· цель {profile.target_level}</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.is_admin && <Pill color="gold">admin</Pill>}
              {profile.is_unlimited && <Pill color="blue">unlimited</Pill>}
              {profile.is_blocked && <Pill color="red">blocked</Pill>}
              {!profile.is_admin && !profile.is_unlimited && !profile.is_blocked && (
                <Pill color="neutral">regular</Pill>
              )}
            </div>
          </div>
          <div className="text-right space-y-0.5">
            <div className="text-xs text-[#6B6560]">Баланс модулей</div>
            <div className="text-3xl font-bold text-[#1A1A1A]">{profile.modules_balance}</div>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <Meta label="ID">
            <code className="text-[10px] break-all">{profile.id}</code>
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
      <section className="border border-[#E0DDD6] rounded-md bg-white">
        <header className="px-4 py-3 border-b border-[#E0DDD6] flex items-center justify-between">
          <h2 className="text-sm font-medium text-[#1A1A1A]">
            Попытки <span className="text-[#6B6560] font-normal">({attempts.length})</span>
          </h2>
          <span className="text-xs text-[#6B6560]">последние 50</span>
        </header>
        {attempts.length === 0 ? (
          <div className="p-6 text-sm text-[#6B6560]">Попыток нет.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#F2EFE8] text-[#6B6560] text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left">Started</th>
                <th className="px-3 py-2 text-left">Level</th>
                <th className="px-3 py-2 text-left">Статус</th>
                <th className="px-3 py-2 text-left">Оплата</th>
                <th className="px-3 py-2 text-left">Band / Score</th>
                <th className="px-3 py-2 text-left">Session ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0DDD6]">
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td className="px-3 py-2 text-[#6B6560]">{fmt(a.started_at)}</td>
                  <td className="px-3 py-2 text-[#1A1A1A] font-medium">{a.level}</td>
                  <td className="px-3 py-2 text-[#1A1A1A]">
                    {a.submitted_at ? 'submitted' : 'in progress'}
                  </td>
                  <td className="px-3 py-2 text-[#6B6560]">
                    {a.is_free_test ? 'free' : a.payment_status}
                  </td>
                  <td className="px-3 py-2 text-[#1A1A1A]">{extractBand(a.scores) ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-[#6B6560]">
                    {a.session_id.slice(0, 8)}…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Modules ledger */}
      <section className="border border-[#E0DDD6] rounded-md bg-white">
        <header className="px-4 py-3 border-b border-[#E0DDD6] flex items-center justify-between">
          <h2 className="text-sm font-medium text-[#1A1A1A]">
            История модулей{' '}
            <span className="text-[#6B6560] font-normal">({ledger.length})</span>
          </h2>
          <span className="text-xs text-[#6B6560]">последние 50</span>
        </header>
        {ledger.length === 0 ? (
          <div className="p-6 text-sm text-[#6B6560]">Операций с модулями нет.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#F2EFE8] text-[#6B6560] text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left">Когда</th>
                <th className="px-3 py-2 text-right">Δ</th>
                <th className="px-3 py-2 text-left">Причина</th>
                <th className="px-3 py-2 text-left">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0DDD6]">
              {ledger.map((l) => (
                <tr key={l.id}>
                  <td className="px-3 py-2 text-[#6B6560]">{fmt(l.created_at)}</td>
                  <td
                    className={`px-3 py-2 text-right font-medium ${
                      l.delta >= 0 ? 'text-green-700' : 'text-[#8B1A1A]'
                    }`}
                  >
                    {l.delta >= 0 ? `+${l.delta}` : l.delta}
                  </td>
                  <td className="px-3 py-2 text-[#1A1A1A] font-mono text-xs">{l.reason}</td>
                  <td className="px-3 py-2 text-[#6B6560]">{l.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Promo redemptions */}
      <section className="border border-[#E0DDD6] rounded-md bg-white">
        <header className="px-4 py-3 border-b border-[#E0DDD6]">
          <h2 className="text-sm font-medium text-[#1A1A1A]">
            Активированные промокоды{' '}
            <span className="text-[#6B6560] font-normal">({redemptions.length})</span>
          </h2>
        </header>
        {redemptions.length === 0 ? (
          <div className="p-6 text-sm text-[#6B6560]">Промокоды не активировал.</div>
        ) : (
          <ul className="divide-y divide-[#E0DDD6]">
            {redemptions.map((r) => (
              <li key={r.id} className="px-4 py-2 text-sm flex justify-between">
                <span className="font-mono text-xs text-[#6B6560]">{r.promo_id.slice(0, 8)}…</span>
                <span className="text-green-700 font-medium">+{r.modules_granted}</span>
                <span className="text-[#6B6560]">{fmt(r.redeemed_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-[#6B6560] uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-[#1A1A1A] mt-0.5">{children}</dd>
    </div>
  )
}

function Pill({
  children,
  color,
}: {
  children: React.ReactNode
  color: 'gold' | 'red' | 'blue' | 'neutral'
}) {
  const palette =
    color === 'gold'
      ? 'bg-[#FAF4DD] text-[#9E7E2C] border-[#E6D8A8]'
      : color === 'red'
        ? 'bg-red-50 text-[#8B1A1A] border-red-200'
        : color === 'blue'
          ? 'bg-blue-50 text-blue-800 border-blue-200'
          : 'bg-[#F2EFE8] text-[#6B6560] border-[#E0DDD6]'
  return (
    <span className={`text-[10px] uppercase tracking-wide border rounded-sm px-2 py-0.5 ${palette}`}>
      {children}
    </span>
  )
}
