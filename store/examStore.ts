import { create } from 'zustand'
import type { ExamSession } from '@/types/exam'

interface ExamState {
  session: ExamSession | null
  answers: Record<string, unknown>

  setSession: (session: ExamSession) => void
  setAnswer: (questionId: string, answer: unknown) => void
  reset: () => void
}

export const useExamStore = create<ExamState>((set) => ({
  session: null,
  answers: {},

  setSession: (session) => set({ session }),
  setAnswer: (questionId, answer) =>
    set((state) => ({ answers: { ...state.answers, [questionId]: answer } })),

  reset: () =>
    set({
      session: null,
      answers: {},
    }),
}))
