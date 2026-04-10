import { create } from 'zustand'
import type { ExamSession, ExamModule, ModuleScores } from '@/types/exam'

interface ExamState {
  session: ExamSession | null
  currentModule: ExamModule | null
  timeRemaining: number
  answers: Record<string, unknown>
  isSubmitting: boolean

  setSession: (session: ExamSession) => void
  setCurrentModule: (module: ExamModule) => void
  setTimeRemaining: (time: number) => void
  setAnswer: (questionId: string, answer: unknown) => void
  submitExam: () => Promise<ModuleScores>
  reset: () => void
}

export const useExamStore = create<ExamState>((set, get) => ({
  session: null,
  currentModule: null,
  timeRemaining: 0,
  answers: {},
  isSubmitting: false,

  setSession: (session) => set({ session }),
  setCurrentModule: (module) => set({ currentModule: module }),
  setTimeRemaining: (time) => set({ timeRemaining: time }),
  setAnswer: (questionId, answer) =>
    set((state) => ({ answers: { ...state.answers, [questionId]: answer } })),

  submitExam: async () => {
    set({ isSubmitting: true })
    try {
      const { session, answers } = get()
      if (!session) throw new Error('No active session')

      const response = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, answers }),
      })

      if (!response.ok) throw new Error('Submission failed')

      const data = await response.json()
      return data.scores as ModuleScores
    } finally {
      set({ isSubmitting: false })
    }
  },

  reset: () =>
    set({
      session: null,
      currentModule: null,
      timeRemaining: 0,
      answers: {},
      isSubmitting: false,
    }),
}))
