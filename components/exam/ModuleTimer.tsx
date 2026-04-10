'use client'

import { useEffect, useCallback } from 'react'
import { useExamStore } from '@/store/examStore'

const MODULE_TIME_LIMITS: Record<string, number> = {
  lesen: 65 * 60,
  horen: 40 * 60,
  schreiben: 60 * 60,
  sprechen: 15 * 60,
}

export function ModuleTimer() {
  const { currentModule, timeRemaining, setTimeRemaining, submitExam } =
    useExamStore()

  const handleAutoSubmit = useCallback(async () => {
    await submitExam()
  }, [submitExam])

  useEffect(() => {
    if (!currentModule) return

    if (timeRemaining === 0) {
      setTimeRemaining(MODULE_TIME_LIMITS[currentModule] ?? 60 * 60)
    }
  }, [currentModule, timeRemaining, setTimeRemaining])

  useEffect(() => {
    if (timeRemaining <= 0) return

    const interval = setInterval(() => {
      setTimeRemaining(timeRemaining - 1)

      if (timeRemaining - 1 <= 0) {
        handleAutoSubmit()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [timeRemaining, setTimeRemaining, handleAutoSubmit])

  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60
  const isLow = timeRemaining < 5 * 60

  return (
    <div
      className={`rounded-lg px-4 py-1.5 text-sm font-mono font-medium tabular-nums ${
        isLow
          ? 'bg-red-50 text-brand-red'
          : 'bg-brand-surface text-brand-text'
      }`}
    >
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </div>
  )
}
