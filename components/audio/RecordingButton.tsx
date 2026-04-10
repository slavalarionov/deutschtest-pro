'use client'

import { useRef, useState, useCallback } from 'react'

interface RecordingButtonProps {
  onRecordingComplete: (audioBlob: Blob) => void
  maxDuration?: number
}

export function RecordingButton({
  onRecordingComplete,
  maxDuration = 120,
}: RecordingButtonProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      chunksRef.current = []
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        onRecordingComplete(blob)
        stream.getTracks().forEach((t) => t.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setElapsed(0)

      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= maxDuration) {
            stopRecording()
            return maxDuration
          }
          return prev + 1
        })
      }, 1000)
    } catch {
      console.error('Microphone access denied')
    }
  }, [maxDuration, onRecordingComplete, stopRecording])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`flex h-14 w-14 items-center justify-center rounded-full transition ${
          isRecording
            ? 'animate-pulse bg-brand-red text-white'
            : 'bg-brand-gold text-white hover:bg-brand-gold-dark'
        }`}
        aria-label={isRecording ? 'Aufnahme stoppen' : 'Aufnahme starten'}
      >
        {isRecording ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <rect x="4" y="4" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="10" cy="10" r="6" />
          </svg>
        )}
      </button>

      {isRecording && (
        <span className="font-mono text-sm font-medium text-brand-red">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      )}
    </div>
  )
}
