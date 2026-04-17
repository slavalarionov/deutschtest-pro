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
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-[#6B6560]">
          Редактируется v{currentVersion} → сохранится как v{currentVersion + 1}
        </span>
        {dirty && <span className="text-xs text-[#C8A84B]">● изменения не сохранены</span>}
      </div>

      <textarea
        className="w-full h-[540px] font-mono text-xs leading-relaxed border border-[#E0DDD6] rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-[#C8A84B] bg-white"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        spellCheck={false}
      />

      <div className="text-xs text-[#6B6560]">
        <span className="font-medium">Плейсхолдеры в шаблоне:</span>{' '}
        {placeholders.length === 0 ? (
          <span className="italic">— нет —</span>
        ) : (
          placeholders.map((p) => (
            <code key={p} className="bg-[#F2EFE8] px-1.5 py-0.5 rounded mr-1">
              {p}
            </code>
          ))
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs text-[#6B6560] block">Комментарий к изменению (обязателен)</label>
        <input
          type="text"
          value={changeNote}
          onChange={(e) => setChangeNote(e.target.value)}
          placeholder="Например: усилил инструкцию по разнообразию тем"
          className="w-full border border-[#E0DDD6] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84B] bg-white"
        />
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={pending || !dirty}
          className="px-4 py-2 bg-[#1A1A1A] text-white rounded-md text-sm font-medium hover:bg-[#3A3A3A] disabled:opacity-40"
        >
          {pending ? 'Сохранение…' : 'Сохранить новую версию'}
        </button>
        {dirty && (
          <button
            onClick={() => {
              setContent(initialContent)
              setError(null)
            }}
            className="text-sm text-[#6B6560] hover:text-[#1A1A1A]"
          >
            Сбросить
          </button>
        )}
      </div>
    </div>
  )
}
