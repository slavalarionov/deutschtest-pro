'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal, ModalField } from '@/components/admin/Modal'

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

function defaultTopicShape(module: string, _teil: string): string {
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
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-rad border border-line bg-surface p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterCard label="Модуль">
            <FilterSelect
              value={filters.module ?? ''}
              onChange={(v) => updateFilter('module', v)}
              options={[{ value: '', label: 'Все' }, ...MODULES.map((m) => ({ value: m, label: m }))]}
            />
          </FilterCard>
          <FilterCard label="Уровень">
            <FilterSelect
              value={filters.level ?? ''}
              onChange={(v) => updateFilter('level', v)}
              options={[
                { value: '', label: 'Все' },
                ...LEVELS.map((l) => ({ value: l, label: l.toUpperCase() })),
              ]}
            />
          </FilterCard>
          <FilterCard label="Teil">
            <FilterSelect
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
          </FilterCard>
          <FilterCard label="Статус">
            <FilterSelect
              value={filters.active ?? ''}
              onChange={(v) => updateFilter('active', v)}
              options={[
                { value: '', label: 'Все' },
                { value: '1', label: 'Активные' },
                { value: '0', label: 'Выключенные' },
              ]}
            />
          </FilterCard>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center rounded-rad-pill bg-ink px-5 py-2 text-sm font-medium text-page transition-colors hover:bg-ink/90"
          >
            Добавить тему
          </button>
        </div>
      </div>

      {initialTopics.length === 0 ? (
        <div className="rounded-rad border border-line bg-card p-14 text-center">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Keine Themen
          </div>
          <p className="mt-3 text-sm text-ink-soft">
            Тем по выбранным фильтрам нет.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([groupKey, items]) => {
            const [module, level, teilRaw] = groupKey.split(':')
            const teilLabel = teilRaw === 'null' ? '—' : `Teil ${teilRaw}`
            const activeCount = items.filter((t) => t.is_active).length
            const warn = activeCount < 3
            return (
              <section
                key={groupKey}
                className="overflow-hidden rounded-rad border border-line bg-card"
              >
                <header className="flex items-center justify-between border-b border-line bg-surface px-5 py-3">
                  <div className="flex items-baseline gap-3 font-mono text-[10px] uppercase tracking-widest text-muted">
                    <span>
                      {module} · {level.toUpperCase()} · {teilLabel}
                    </span>
                    <span className="tabular-nums text-ink-soft">
                      {activeCount}/{items.length}
                    </span>
                  </div>
                  {warn && (
                    <div className="rounded-rad-sm border border-line bg-accent-soft px-3 py-1">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-accent-ink">
                        Hinweis · &lt; 3 активных
                      </span>
                    </div>
                  )}
                </header>
                <ul>
                  {items.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-start gap-4 border-b border-line-soft px-5 py-4 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-ink">
                          {String(t.topic_data?.['situation'] ?? '(без situation)')}
                        </div>
                        <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-xs text-muted">
                          {JSON.stringify(t.topic_data, null, 0).slice(0, 280)}
                        </pre>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted">
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
                          className="text-xs text-ink-soft underline underline-offset-4 hover:text-ink"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => deleteTopic(t.id)}
                          disabled={pending}
                          className="text-xs text-muted underline underline-offset-4 transition-colors hover:text-error disabled:opacity-40"
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

function FilterCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-rad-sm border border-line bg-card px-3 py-2 transition-colors focus-within:border-ink">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
      </div>
      {children}
    </div>
  )
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent text-sm text-ink focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
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
    <Modal title={initial ? 'Редактировать тему' : 'Новая тема'} onClose={onClose}>
      <div className="grid grid-cols-3 gap-3">
        <ModalField label="Модуль">
          <FilterSelect
            value={module}
            onChange={onModuleChange}
            options={MODULES.map((m) => ({ value: m, label: m }))}
          />
        </ModalField>
        <ModalField label="Уровень">
          <FilterSelect
            value={level}
            onChange={setLevel}
            options={LEVELS.map((l) => ({ value: l, label: l.toUpperCase() }))}
          />
        </ModalField>
        <ModalField label="Teil">
          <FilterSelect value={teil} onChange={setTeil} options={teilOptions} />
        </ModalField>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <span>Активна (участвует в sampler&apos;е)</span>
      </label>

      <div>
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted">
          topic_data (JSON-объект)
        </label>
        <textarea
          className="h-72 w-full rounded-rad border border-line bg-card p-3 font-mono text-xs leading-relaxed text-ink transition-colors focus:border-ink focus:outline-none"
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          spellCheck={false}
        />
        <p className="mt-2 text-xs text-muted">
          Поля зависят от модуля. Примеры:{' '}
          <code className="font-mono text-xs text-ink-soft">situation</code>,{' '}
          <code className="font-mono text-xs text-ink-soft">recipient</code>,{' '}
          <code className="font-mono text-xs text-ink-soft">taskHints[]</code>,{' '}
          <code className="font-mono text-xs text-ink-soft">category</code>,{' '}
          <code className="font-mono text-xs text-ink-soft">sceneHint</code>,{' '}
          <code className="font-mono text-xs text-ink-soft">tone</code>,{' '}
          <code className="font-mono text-xs text-ink-soft">taskType</code>.
        </p>
      </div>

      {error && <div className="text-sm text-error">{error}</div>}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="inline-flex items-center rounded-rad-pill border border-line px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center rounded-rad-pill bg-ink px-5 py-2 text-sm font-medium text-page transition-colors hover:bg-ink/90 disabled:opacity-50"
        >
          {saving ? 'Сохранение…' : initial ? 'Сохранить' : 'Создать'}
        </button>
      </div>
    </Modal>
  )
}
