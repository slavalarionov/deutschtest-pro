'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

interface ExamTimerDisplayProps {
  timeLeft: number
}

export function ExamTimerDisplay({ timeLeft }: ExamTimerDisplayProps) {
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const isCritical = timeLeft <= 60 && timeLeft > 0
  const isWarning = timeLeft <= 5 * 60 && timeLeft > 60

  return (
    <div
      className={`rounded-lg px-4 py-2 font-mono text-lg font-semibold tabular-nums transition-colors ${
        isCritical
          ? 'animate-timer-pulse bg-red-100 text-brand-red'
          : isWarning
            ? 'bg-orange-50 text-orange-600'
            : 'bg-brand-surface text-brand-text'
      }`}
    >
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </div>
  )
}

export function TimerWarningBanner({ timeLeft }: { timeLeft: number }) {
  const t = useTranslations('exam.timer')
  const [dismissed, setDismissed] = useState(false)
  const [shownWarning, setShownWarning] = useState<'5min' | '1min' | null>(null)

  useEffect(() => {
    if (timeLeft <= 60 && timeLeft > 0 && shownWarning !== '1min') {
      setShownWarning('1min')
      setDismissed(false)
    } else if (timeLeft <= 5 * 60 && timeLeft > 60 && shownWarning !== '5min' && shownWarning !== '1min') {
      setShownWarning('5min')
      setDismissed(false)
    }
  }, [timeLeft, shownWarning])

  if (dismissed || !shownWarning || timeLeft <= 0) return null

  const is1Min = shownWarning === '1min'

  return (
    <div
      className={`flex items-center justify-between rounded-xl px-5 py-3 shadow-soft ${
        is1Min
          ? 'animate-timer-pulse bg-red-50 text-brand-red'
          : 'bg-orange-50 text-orange-700'
      }`}
    >
      <div className="flex items-center gap-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12,6 12,12 16,14" />
        </svg>
        <span className="text-sm font-semibold">
          {is1Min ? t('warning60Seconds') : t('warning5Minutes')}
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-xs font-medium opacity-70 hover:opacity-100"
      >
        {t('dismiss')}
      </button>
    </div>
  )
}
