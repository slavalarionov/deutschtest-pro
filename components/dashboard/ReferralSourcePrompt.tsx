'use client'

import { useEffect, useState } from 'react'
import { ReferralSourceModal } from './ReferralSourceModal'

interface ReferralSourcePromptProps {
  initiallyAsked: boolean
}

export function ReferralSourcePrompt({ initiallyAsked }: ReferralSourcePromptProps) {
  const [asked, setAsked] = useState(initiallyAsked)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (asked) return
    const timer = setTimeout(() => setVisible(true), 800)
    return () => clearTimeout(timer)
  }, [asked])

  async function handleSubmit(source: string) {
    try {
      await fetch('/api/user/referral-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      })
    } catch {
      // Silent: the survey is non-critical; on network error we still
      // dismiss so the user isn't blocked. Worst case — they see the
      // modal once more on next visit, which is acceptable.
    }
    setAsked(true)
    setVisible(false)
  }

  if (asked || !visible) return null
  return <ReferralSourceModal onSubmit={handleSubmit} />
}
