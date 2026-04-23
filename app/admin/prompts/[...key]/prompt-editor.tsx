'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

const PLACEHOLDER_RE = /\{(\w+)\}/g

function extractPlaceholders(template: string): string[] {
  const seen = new Set<string>()
  for (const match of template.matchAll(PLACEHOLDER_RE)) {
    seen.add(`{${match[1]}}`)
  }
  return Array.from(seen).sort()
}

interface Props {
  promptKey: string
  initialContent: string
  currentVersion: number
}

export function PromptEditor({ promptKey, initialContent, currentVersion }: Props) {
  const router = useRouter()
  const [content, setContent] = useState(initialContent)
  const [changeNote, setChangeNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const placeholders = useMemo(() => extractPlaceholders(content), [content])
  const dirty = content !== initialContent

  async function handleSave() {
    setError(null)
    if (!changeNote.trim()) {
      setError('Комментарий к изменению обязателен.')
      return
    }
    if (!dirty) {
      setError('Содержимое не изменилось.')
      return
    }

    const res = await fetch('/api/admin/prompts/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: promptKey, content, change_note: changeNote }),
    })

    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? `HTTP ${res.status}`)
      return
    }

    startTransition(() => {
      router.refresh()
    })
    setChangeNote('')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-xs tabular-nums text-muted">
          v{currentVersion} → v{currentVersion + 1}
        </span>
        {dirty && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-accent-ink">
            ● изменения не сохранены
          </span>
        )}
      </div>

      <textarea
        className="h-[540px] w-full rounded-rad border border-line bg-card p-4 font-mono text-xs leading-relaxed text-ink transition-colors focus:border-ink focus:outline-none"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        spellCheck={false}
      />

      <div className="rounded-rad-sm border border-line bg-surface px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Плейсхолдеры
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {placeholders.length === 0 ? (
            <span className="text-sm italic text-muted">— нет —</span>
          ) : (
            placeholders.map((p) => (
              <code
                key={p}
                className="rounded-rad-sm border border-line-soft bg-card px-1.5 py-0.5 font-mono text-xs text-ink"
              >
                {p}
              </code>
            ))
          )}
        </div>
      </div>

      <label className="block rounded-rad-sm border border-line bg-card px-3 py-2 transition-colors focus-within:border-ink">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
          Комментарий к изменению (обязателен)
        </div>
        <input
          type="text"
          value={changeNote}
          onChange={(e) => setChangeNote(e.target.value)}
          placeholder="напр., усилил инструкцию по разнообразию тем"
          className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
        />
      </label>

      {error && <div className="text-sm text-error">{error}</div>}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={pending || !dirty}
          className="inline-flex items-center rounded-rad-pill bg-ink px-5 py-2 text-sm font-medium text-page transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? 'Сохранение…' : 'Сохранить новую версию'}
        </button>
        {dirty && (
          <button
            onClick={() => {
              setContent(initialContent)
              setError(null)
            }}
            className="text-sm text-muted underline underline-offset-4 transition-colors hover:text-ink"
          >
            Сбросить
          </button>
        )}
      </div>
    </div>
  )
}
