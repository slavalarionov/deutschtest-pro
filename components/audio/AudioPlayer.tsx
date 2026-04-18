'use client'

import { useRef, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'

interface AudioPlayerProps {
  src: string
  maxPlays: number
}

/**
 * Audio player with play/pause ONLY — no seeking allowed.
 * Mirrors real Goethe exam conditions where rewinding is not permitted.
 */
export function AudioPlayer({ src, maxPlays }: AudioPlayerProps) {
  const t = useTranslations('exam.audio')
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playCount, setPlayCount] = useState(0)
  const [progress, setProgress] = useState(0)

  const canPlay = playCount < maxPlays

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else if (canPlay) {
      audio.play()
      setIsPlaying(true)
    }
  }, [isPlaying, canPlay])

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    setProgress((audio.currentTime / audio.duration) * 100)
  }, [])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    setPlayCount((prev) => prev + 1)
    setProgress(0)
  }, [])

  return (
    <div className="flex items-center gap-3 rounded-lg bg-brand-surface px-4 py-3">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        preload="auto"
      />

      <button
        onClick={togglePlay}
        disabled={!canPlay && !isPlaying}
        className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
          canPlay || isPlaying
            ? 'bg-brand-gold text-white hover:bg-brand-gold-dark'
            : 'cursor-not-allowed bg-brand-border text-brand-muted'
        }`}
        aria-label={isPlaying ? t('pause') : t('play')}
      >
        {isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <rect x="3" y="2" width="4" height="12" rx="1" />
            <rect x="9" y="2" width="4" height="12" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2l10 6-10 6V2z" />
          </svg>
        )}
      </button>

      <div className="flex-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-brand-border">
          <div
            className="h-full rounded-full bg-brand-gold transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <span className="text-xs font-medium text-brand-muted">
        {playCount}/{maxPlays}
      </span>
    </div>
  )
}
