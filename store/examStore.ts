import { create } from 'zustand'
import type { ExamSession, ExamModule } from '@/types/exam'

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
  reset: () => void
}

export const useExamStore = create<ExamState>((set) => ({
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

  reset: () =>
    set({
      session: null,
      currentModule: null,
      timeRemaining: 0,
      answers: {},
      isSubmitting: false,
    }),
}))
