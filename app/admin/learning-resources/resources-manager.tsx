'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal, ModalField } from '@/components/admin/Modal'
import { LEARNING_TAGS, TAG_LABELS } from '@/lib/learning-tags'

export interface ResourceRow {
  id: string
  module: 'lesen' | 'horen' | 'schreiben' | 'sprechen'
  level: 'a1' | 'a2' | 'b1'
  topic: string
  title: string
  url: string
  resource_type: 'book' | 'video' | 'exercise' | 'website' | 'app' | 'article'
  description: string | null
  language: 'de' | 'ru' | 'en'
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Filters {
  module?: string
  level?: string
  topic?: string
  language?: string
  active?: string
  page?: string
}

interface Props {
  initialRows: ResourceRow[]
  filters: Filters
  page: number
  totalPages: number
  totalCount: number
}

const MODULES = ['lesen', 'horen', 'schreiben', 'sprechen'] as const
const LEVELS = ['a1', 'a2', 'b1'] as const
const LANGUAGES = ['de', 'ru', 'en'] as const
const TYPES = ['book', 'video', 'exercise', 'website', 'app', 'article'] as const

export function ResourcesManager({
  initialRows,
  filters,
  page,
  totalPages,
  totalCount,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState<ResourceRow | null>(null)
  const [creating, setCreating] = useState(false)

  function updateFilter(key: keyof Filters, value: string) {
    const params = new URLSearchParams()
    const next: Filters = { ...filters, [key]: value }
    // Reset pagination on filter change.
    delete next.page
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v as string)
    }
    router.push(`/admin/learning-resources${params.toString() ? `?${params}` : ''}`)
  }

  function gotoPage(nextPage: number) {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(filters)) {
      if (k === 'page') continue
      if (v) params.set(k, v as string)
    }
    if (nextPage > 1) params.set('page', String(nextPage))
    router.push(`/admin/learning-resources${params.toString() ? `?${params}` : ''}`)
  }

  function refresh() {
    startTransition(() => router.refresh())
  }

  async function toggleActive(id: string, next: boolean) {
    const res = await fetch(`/api/admin/learning-resources/${id}/toggle-active`, {
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
          <FilterCard label="Топик">
            <FilterSelect
              value={filters.topic ?? ''}
              onChange={(v) => updateFilter('topic', v)}
              options={[
                { value: '', label: 'Все' },
                ...LEARNING_TAGS.map((t) => ({ value: t, label: t })),
              ]}
            />
          </FilterCard>
          <FilterCard label="Язык">
            <FilterSelect
              value={filters.language ?? ''}
              onChange={(v) => updateFilter('language', v)}
              options={[
                { value: '', label: 'Все' },
                ...LANGUAGES.map((l) => ({ value: l, label: l.toUpperCase() })),
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
        <div className="mt-4 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Всего: {totalCount}
          </span>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center rounded-rad-pill bg-ink px-5 py-2 text-sm font-medium text-page transition-colors hover:bg-ink/90"
          >
            Добавить ресурс
          </button>
        </div>
      </div>

      {initialRows.length === 0 ? (
        <div className="rounded-rad border border-line bg-card p-14 text-center">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Keine Ressourcen
          </div>
          <p className="mt-3 text-sm text-ink-soft">По фильтрам ничего не найдено.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-rad border border-line bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface text-left font-mono text-[10px] uppercase tracking-widest text-muted">
                <th className="px-4 py-3 font-normal">Title · URL</th>
                <th className="px-3 py-3 font-normal">Module</th>
                <th className="px-3 py-3 font-normal">Level</th>
                <th className="px-3 py-3 font-normal">Topic</th>
                <th className="px-3 py-3 font-normal">Type</th>
                <th className="px-3 py-3 font-normal">Lang</th>
                <th className="px-3 py-3 font-normal">Status</th>
                <th className="px-3 py-3 font-normal">Updated</th>
                <th className="px-3 py-3 font-normal" />
              </tr>
            </thead>
            <tbody>
              {initialRows.map((r) => (
                <tr key={r.id} className="border-b border-line-soft last:border-0">
                  <td className="max-w-xs px-4 py-3">
                    <div className="truncate font-medium text-ink">{r.title}</div>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="truncate font-mono text-xs text-muted underline-offset-4 hover:underline"
                    >
                      {r.url}
                    </a>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-ink-soft">{r.module}</td>
                  <td className="px-3 py-3 font-mono text-xs text-ink-soft">
                    {r.level.toUpperCase()}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-ink-soft">{r.topic}</td>
                  <td className="px-3 py-3 font-mono text-xs text-ink-soft">{r.resource_type}</td>
                  <td className="px-3 py-3 font-mono text-xs text-ink-soft">
                    {r.language.toUpperCase()}
                  </td>
                  <td className="px-3 py-3">
                    <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted">
                      <input
                        type="checkbox"
                        checked={r.is_active}
                        onChange={(e) => toggleActive(r.id, e.target.checked)}
                        disabled={pending}
                      />
                      {r.is_active ? 'on' : 'off'}
                    </label>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-muted tabular-nums">
                    {new Date(r.updated_at).toISOString().slice(0, 10)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={() => setEditing(r)}
                      className="text-xs text-ink-soft underline underline-offset-4 hover:text-ink"
                    >
                      Редактировать
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between font-mono text-xs text-muted">
          <span>
            Стр. {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => gotoPage(page - 1)}
              className="rounded-rad-pill border border-line px-4 py-1.5 text-ink-soft transition-colors hover:text-ink disabled:opacity-40"
            >
              ← Назад
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => gotoPage(page + 1)}
              className="rounded-rad-pill border border-line px-4 py-1.5 text-ink-soft transition-colors hover:text-ink disabled:opacity-40"
            >
              Далее →
            </button>
          </div>
        </div>
      )}

      {(creating || editing) && (
        <ResourceModal
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

function ResourceModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: ResourceRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [moduleVal, setModuleVal] = useState<string>(initial?.module ?? 'lesen')
  const [level, setLevel] = useState<string>(initial?.level ?? 'a1')
  const [topic, setTopic] = useState<string>(initial?.topic ?? 'general')
  const [type, setType] = useState<string>(initial?.resource_type ?? 'website')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [language, setLanguage] = useState<string>(initial?.language ?? 'de')
  const [isActive, setIsActive] = useState<boolean>(initial?.is_active ?? true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function save() {
    setError(null)
    if (!title.trim()) {
      setError('Title не может быть пустым')
      return
    }
    if (!/^https?:\/\//i.test(url.trim())) {
      setError('URL должен начинаться с http:// или https://')
      return
    }

    setSaving(true)
    const res = await fetch('/api/admin/learning-resources/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: initial?.id,
        title: title.trim(),
        url: url.trim(),
        module: moduleVal,
        level,
        topic,
        resource_type: type,
        description: description.trim() || null,
        language,
        is_active: isActive,
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

  return (
    <Modal title={initial ? 'Редактировать ресурс' : 'Новый ресурс'} onClose={onClose}>
      <ModalField label="Title">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-transparent text-sm text-ink focus:outline-none"
          placeholder="Lingolia · Modalverben Kapitel"
        />
      </ModalField>

      <ModalField label="URL">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full bg-transparent font-mono text-xs text-ink focus:outline-none"
          placeholder="https://…"
        />
      </ModalField>

      <div className="grid grid-cols-2 gap-3">
        <ModalField label="Модуль">
          <FilterSelect
            value={moduleVal}
            onChange={setModuleVal}
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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ModalField label="Топик">
          <FilterSelect
            value={topic}
            onChange={setTopic}
            options={LEARNING_TAGS.map((tag) => ({
              value: tag,
              label: `${tag} · ${TAG_LABELS[tag].de}`,
            }))}
          />
        </ModalField>
        <ModalField label="Тип">
          <FilterSelect
            value={type}
            onChange={setType}
            options={TYPES.map((t) => ({ value: t, label: t }))}
          />
        </ModalField>
      </div>

      <ModalField label="Язык ресурса">
        <FilterSelect
          value={language}
          onChange={setLanguage}
          options={LANGUAGES.map((l) => ({ value: l, label: l.toUpperCase() }))}
        />
      </ModalField>

      <div>
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted">
          Описание (опционально)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-rad border border-line bg-card p-3 text-sm text-ink transition-colors focus:border-ink focus:outline-none"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <span>Активен (ИИ-матчинг отдаёт его пользователям)</span>
      </label>

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
