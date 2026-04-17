'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export interface TopicRow {
  id: string
  module: 'lesen' | 'horen' | 'schreiben' | 'sprechen'
  level: 'a1' | 'a2' | 'b1'
  teil: number | null
  topic_data: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Filters {
  module?: string
  level?: string
  teil?: string
  active?: string
}

interface Props {
  initialTopics: TopicRow[]
  filters: Filters
}

const MODULES = ['lesen', 'horen', 'schreiben', 'sprechen'] as const
const LEVELS = ['a1', 'a2', 'b1'] as const

function teilOptionsFor(module: string): Array<{ value: string; label: string }> {
  if (module === 'lesen') return [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `Teil ${n}` }))
  if (module === 'horen') return [1, 2, 3, 4].map((n) => ({ value: String(n), label: `Teil ${n}` }))
  return [{ value: 'null', label: '—' }]
}

function defaultTopicShape(module: string, teil: string): string {
  if (module === 'schreiben') {
    return JSON.stringify(
      {
        situation: '',
        recipient: '',
        taskHints: ['', '', ''],
      },
      null,
      2
    )
  }
  if (module === 'sprechen') {
    return JSON.stringify(
      {
        situation: '',
        taskType: 'planning',
        taskHints: ['', '', ''],
      },
      null,
      2
    )
  }
  if (module === 'lesen') {
    return JSON.stringify(
      {
        situation: '',
        category: '',
        sceneHint: '',
      },
      null,
      2
    )
  }
  if (module === 'horen') {
    return JSON.stringify(
      {
        situation: '',
        sceneHint: '',
        tone: '',
      },
      null,
      2
    )
  }
  return '{}'
}

function teilForModule(module: string, teil: number | null): string {
  if (module === 'schreiben' || module === 'sprechen') return 'null'
  return teil == null ? '1' : String(teil)
}

export function TopicsManager({ initialTopics, filters }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [editing, setEditing] = useState<TopicRow | null>(null)
  const [creating, setCreating] = useState(false)

  const grouped = useMemo(() => {
    const map = new Map<string, TopicRow[]>()
    for (const t of initialTopics) {
      const k = `${t.module}:${t.level}:${t.teil ?? 'null'}`
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(t)
    }
    return map
  }, [initialTopics])

  function updateFilter(key: keyof Filters, value: string) {
    const params = new URLSearchParams()
    const next = { ...filters, [key]: value }
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v)
    }
    router.push(`/admin/topics${params.toString() ? `?${params}` : ''}`)
  }

  function refresh() {
    startTransition(() => router.refresh())
  }

  async function deleteTopic(id: string) {
    if (!confirm('Точно удалить эту тему?')) return
    const res = await fetch(`/api/admin/topics/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(`Ошибка: ${j.error ?? res.status}`)
      return
    }
    refresh()
  }

  async function toggleActive(id: string, next: boolean) {
    const res = await fetch(`/api/admin/topics/${id}/toggle-active`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: next }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      alert(`Ошибка: ${j.error ?? res.status}`)
      return
    }
    refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 p-4 rounded-md border border-[#E0DDD6] bg-white">
        <FilterSelect
          label="Модуль"
          value={filters.module ?? ''}
          onChange={(v) => updateFilter('module', v)}
          options={[{ value: '', label: 'Все' }, ...MODULES.map((m) => ({ value: m, label: m }))]}
        />
        <FilterSelect
          label="Уровень"
          value={filters.level ?? ''}
          onChange={(v) => updateFilter('level', v)}
          options={[
            { value: '', label: 'Все' },
            ...LEVELS.map((l) => ({ value: l, label: l.toUpperCase() })),
          ]}
        />
        <FilterSelect
          label="Teil"
          value={filters.teil ?? ''}
          onChange={(v) => updateFilter('teil', v)}
          options={[
            { value: '', label: 'Все' },
            { value: 'null', label: '— (Schreiben/Sprechen)' },
            { value: '1', label: '1' },
            { value: '2', label: '2' },
            { value: '3', label: '3' },
            { value: '4', label: '4' },
            { value: '5', label: '5' },
          ]}
        />
        <FilterSelect
          label="Статус"
          value={filters.active ?? ''}
          onChange={(v) => updateFilter('active', v)}
          options={[
            { value: '', label: 'Все' },
            { value: '1', label: 'Активные' },
            { value: '0', label: 'Выключенные' },
          ]}
        />
        <div className="ml-auto">
          <button
            onClick={() => setCreating(true)}
            className="px-4 py-2 bg-[#1A1A1A] text-white rounded-md text-sm font-medium hover:bg-[#3A3A3A]"
          >
            + Добавить тему
          </button>
        </div>
      </div>

      {initialTopics.length === 0 ? (
        <div className="p-8 text-center text-sm text-[#6B6560] border border-dashed border-[#E0DDD6] rounded-md bg-white">
          Тем по выбранным фильтрам нет.
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([groupKey, items]) => {
            const [module, level, teilRaw] = groupKey.split(':')
            const teilLabel = teilRaw === 'null' ? '—' : `Teil ${teilRaw}`
            const warn = items.filter((t) => t.is_active).length < 3
            return (
              <section key={groupKey} className="border border-[#E0DDD6] rounded-md bg-white">
                <header className="flex items-center justify-between px-4 py-2 border-b border-[#E0DDD6] bg-[#F2EFE8]">
                  <div className="text-xs uppercase tracking-wide text-[#6B6560] font-mono">
                    {module} · {level.toUpperCase()} · {teilLabel}
                    <span className="ml-3 text-[#1A1A1A] normal-case">
                      {items.filter((t) => t.is_active).length} активных / {items.length} всего
                    </span>
                  </div>
                  {warn && (
                    <span className="text-xs text-[#C8A84B]">
                      ⚠ &lt; 3 активных — экзамены будут повторяться
                    </span>
                  )}
                </header>
                <ul className="divide-y divide-[#E0DDD6]">
                  {items.map((t) => (
                    <li key={t.id} className="px-4 py-3 flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[#1A1A1A]">
                          {String(t.topic_data?.['situation'] ?? '(без situation)')}
                        </div>
                        <pre className="text-xs text-[#6B6560] mt-1 whitespace-pre-wrap break-words font-mono">
                          {JSON.stringify(t.topic_data, null, 0).slice(0, 280)}
                        </pre>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <label className="flex items-center gap-1 text-xs text-[#6B6560]">
                          <input
                            type="checkbox"
                            checked={t.is_active}
                            onChange={(e) => toggleActive(t.id, e.target.checked)}
                            disabled={pending}
                          />
                          активна
                        </label>
                        <button
                          onClick={() => setEditing(t)}
                          className="text-xs text-[#C8A84B] hover:text-[#1A1A1A]"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => deleteTopic(t.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                          disabled={pending}
                        >
                          Удалить
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      {(creating || editing) && (
        <TopicModal
          initial={editing}
          onClose={() => {
            setEditing(null)
            setCreating(false)
          }}
          onSaved={() => {
            setEditing(null)
            setCreating(false)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-[#6B6560]">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-[#E0DDD6] rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8A84B]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function TopicModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: TopicRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const [module, setModule] = useState<string>(initial?.module ?? 'schreiben')
  const [level, setLevel] = useState<string>(initial?.level ?? 'a1')
  const [teil, setTeil] = useState<string>(
    initial ? teilForModule(initial.module, initial.teil) : 'null'
  )
  const [isActive, setIsActive] = useState<boolean>(initial?.is_active ?? true)
  const [jsonText, setJsonText] = useState<string>(
    initial ? JSON.stringify(initial.topic_data, null, 2) : defaultTopicShape(module, teil)
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function onModuleChange(next: string) {
    setModule(next)
    const defaultTeil = next === 'schreiben' || next === 'sprechen' ? 'null' : '1'
    setTeil(defaultTeil)
    if (!initial) setJsonText(defaultTopicShape(next, defaultTeil))
  }

  async function save() {
    setError(null)
    let parsed: unknown
    try {
      parsed = JSON.parse(jsonText)
    } catch (e) {
      setError(`JSON невалиден: ${e instanceof Error ? e.message : 'parse error'}`)
      return
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      setError('topic_data должен быть JSON-объектом')
      return
    }

    setSaving(true)
    const res = await fetch('/api/admin/topics/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: initial?.id,
        module,
        level,
        teil: teil === 'null' ? null : Number(teil),
        is_active: isActive,
        topic_data: parsed,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? `HTTP ${res.status}`)
      return
    }
    onSaved()
  }

  const teilOptions = teilOptionsFor(module)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-md border border-[#E0DDD6] w-full max-w-3xl max-h-[90vh] overflow-auto">
        <header className="flex items-center justify-between p-4 border-b border-[#E0DDD6]">
          <h3 className="text-lg font-medium text-[#1A1A1A]">
            {initial ? 'Редактировать тему' : 'Новая тема'}
          </h3>
          <button onClick={onClose} className="text-sm text-[#6B6560] hover:text-[#1A1A1A]">
            ✕
          </button>
        </header>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <FilterSelect
              label="Модуль"
              value={module}
              onChange={onModuleChange}
              options={MODULES.map((m) => ({ value: m, label: m }))}
            />
            <FilterSelect
              label="Уровень"
              value={level}
              onChange={setLevel}
              options={LEVELS.map((l) => ({ value: l, label: l.toUpperCase() }))}
            />
            <FilterSelect label="Teil" value={teil} onChange={setTeil} options={teilOptions} />
          </div>

          <label className="flex items-center gap-2 text-sm text-[#1A1A1A]">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Активна (участвует в sampler&apos;е)
          </label>

          <div>
            <label className="text-xs text-[#6B6560] block mb-1">
              topic_data (JSON-объект)
            </label>
            <textarea
              className="w-full h-72 font-mono text-xs leading-relaxed border border-[#E0DDD6] rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-[#C8A84B] bg-white"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              spellCheck={false}
            />
            <p className="text-xs text-[#6B6560] mt-1">
              Поля зависят от модуля. Примеры:{' '}
              <code>situation</code>, <code>recipient</code>, <code>taskHints[]</code>,{' '}
              <code>category</code>, <code>sceneHint</code>, <code>tone</code>,{' '}
              <code>taskType</code>.
            </p>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>

        <footer className="flex items-center justify-end gap-3 p-4 border-t border-[#E0DDD6]">
          <button
            onClick={onClose}
            className="text-sm text-[#6B6560] hover:text-[#1A1A1A]"
            disabled={saving}
          >
            Отмена
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-[#1A1A1A] text-white rounded-md text-sm font-medium hover:bg-[#3A3A3A] disabled:opacity-40"
          >
            {saving ? 'Сохранение…' : initial ? 'Сохранить' : 'Создать'}
          </button>
        </footer>
      </div>
    </div>
  )
}
