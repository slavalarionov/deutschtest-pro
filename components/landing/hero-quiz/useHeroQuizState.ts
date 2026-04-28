'use client'

import { useState } from 'react'
import { HERO_QUIZ_CARDS, type QuizCard } from './quiz-cards'

export type HeroQuizState = {
  currentIndex: number
  selectedOption: number | null
  isAnswered: boolean
  isCorrect: boolean
  isFinal: boolean
  card: QuizCard | null
  correctCount: number
  handleAnswer: (idx: number) => void
  handleNext: () => void
}

export function useHeroQuizState(): HeroQuizState {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [correctCount, setCorrectCount] = useState(0)

  const isFinal = currentIndex >= HERO_QUIZ_CARDS.length
  const card = isFinal ? null : HERO_QUIZ_CARDS[currentIndex]
  const isAnswered = selectedOption !== null
  const isCorrect =
    isAnswered && card !== null && selectedOption === card.correctIndex

  function handleAnswer(idx: number) {
    if (isAnswered || !card) return
    setSelectedOption(idx)
    if (idx === card.correctIndex) {
      setCorrectCount((c) => c + 1)
    }
  }

  function handleNext() {
    setCurrentIndex((i) => i + 1)
    setSelectedOption(null)
  }

  return {
    currentIndex,
    selectedOption,
    isAnswered,
    isCorrect,
    isFinal,
    card,
    correctCount,
    handleAnswer,
    handleNext,
  }
}
