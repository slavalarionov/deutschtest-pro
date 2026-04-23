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

export interface ProviderDaily {
  day: string
  anthropic: number
  elevenlabs: number
  openai: number
}

export interface ProviderSummary {
  provider: 'anthropic' | 'elevenlabs' | 'openai'
  label: string
  totalUsd: number
  pctOfTotal: number
}

const PROVIDER_STROKES = {
  anthropic: 'var(--ink)',
  elevenlabs: 'var(--accent)',
  openai: 'var(--muted)',
} as const

function formatTick(isoDay: string): string {
  if (!isoDay) return ''
  const d = new Date(`${isoDay}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return isoDay
  return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function formatUsdTick(value: number): string {
  if (value === 0) return '$0'
  if (value < 0.01) return `$${value.toFixed(3)}`
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

export function ProviderCostChart({ daily }: { daily: ProviderDaily[] }) {
  return (
    <div className="h-[300px] w-full rounded-rad border border-line bg-card p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={daily} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--line)" />
          <XAxis
            dataKey="day"
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
            dataKey="anthropic"
            name="Anthropic"
            stroke={PROVIDER_STROKES.anthropic}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4, fill: 'var(--ink)', stroke: 'var(--card)' }}
          />
          <Line
            type="monotone"
            dataKey="elevenlabs"
            name="ElevenLabs"
            stroke={PROVIDER_STROKES.elevenlabs}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--card)' }}
          />
          <Line
            type="monotone"
            dataKey="openai"
            name="OpenAI"
            stroke={PROVIDER_STROKES.openai}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4, fill: 'var(--muted)', stroke: 'var(--card)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
