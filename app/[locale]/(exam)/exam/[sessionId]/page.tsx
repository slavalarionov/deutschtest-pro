'use client'

import { useParams } from 'next/navigation'
import { ExamShell } from '@/components/exam/ExamShell'

export default function ExamPage() {
  const params = useParams<{ sessionId: string }>()

  return <ExamShell sessionId={params.sessionId} />
}
