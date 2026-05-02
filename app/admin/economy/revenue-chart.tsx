'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'

export interface RevenueDailyPoint {
  date: string
  grossUsd: number
  netUsd: number
}

function formatTick(isoDay: string): string {
  if (!isoDay) return ''
  const d = new Date(`${isoDay}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return isoDay
  return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function formatUsdTick(value: number): string {
  if (value === 0) return '$0'
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${value.toFixed(2)}`
}

interface TooltipPayload {
  dataKey?: string
  name?: string
  value?: number
  color?: string
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-rad border border-line bg-card px-3 py-2 shadow-lift">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
        {formatTick(label ?? '')}
      </div>
      <ul className="mt-1 space-y-0.5">
        {payload.map((entry, i) => (
          <li
            key={i}
            className="flex items-baseline gap-2 font-mono text-xs tabular-nums text-ink"
          >
            <span
              aria-hidden="true"
              className="block h-2 w-2 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="flex-1">{entry.name ?? entry.dataKey}</span>
            <span>{formatUsdTick(Number(entry.value ?? 0))}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function RevenueChart({ daily }: { daily: RevenueDailyPoint[] }) {
  if (daily.length === 0) {
    return (
      <div className="flex h-[260px] w-full items-center justify-center rounded-rad border border-line bg-card">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
          За выбранный период платежей не было
        </p>
      </div>
    )
  }

  return (
    <div className="h-[300px] w-full rounded-rad border border-line bg-card p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={daily} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--line)" />
          <XAxis
            dataKey="date"
            stroke="var(--muted)"
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--line)' }}
            tickFormatter={formatTick}
            minTickGap={24}
          />
          <YAxis
            stroke="var(--muted)"
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--line)' }}
            tickFormatter={formatUsdTick}
            width={56}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 11, color: 'var(--muted)', paddingTop: 4 }}
          />
          <Line
            type="monotone"
            dataKey="grossUsd"
            name="Gross"
            stroke="var(--ink)"
            strokeWidth={1.75}
            dot={false}
            activeDot={{ r: 4, fill: 'var(--ink)', stroke: 'var(--card)' }}
          />
          <Line
            type="monotone"
            dataKey="netUsd"
            name="Net"
            stroke="var(--muted)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            activeDot={{ r: 4, fill: 'var(--muted)', stroke: 'var(--card)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
