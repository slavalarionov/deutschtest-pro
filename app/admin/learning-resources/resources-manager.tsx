'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal, ModalField } from '@/components/admin/Modal'
import { LEARNING_TAGS, TAG_LABELS } from '@/lib/learning-tags'
import type { LearningAdviceBody } from '@/types/learning-advice'

export interface ResourceRow {
  id: string
  module: 'lesen' | 'horen' | 'schreiben' | 'sprechen'
  level: 'a1' | 'a2' | 'b1'
  topic: string
  title: string
  url: string | null
  resource_type: 'book' | 'video' | 'exercise' | 'website' | 'app' | 'article' | 'advice'
  description: string | null
  language: 'de' | 'ru' | 'en'
  is_active: boolean
  body: LearningAdviceBody | null
  created_at: string
  updated_at: string
}

interface Filters {
  module?: string
  level?: string
  topic?: string
  language?: string
  active?: string
  type?: string
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
const EXTERNAL_TYPES = ['book', 'video', 'exercise', 'website', 'app', 'article'] as const

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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <FilterCard label="Тип">
            <FilterSelect
              value={filters.type ?? ''}
              onChange={(v) => updateFilter('type', v)}
              options={[
                { value: '', label: 'Все' },
                { value: 'advice', label: 'Совет' },
                { value: 'external', label: 'Внешний ресурс' },
              ]}
            />
          </FilterCard>
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
                <th className="px-4 py-3 font-normal">Title · URL/Превью</th>
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
                    {r.resource_type === 'advice' ? (
                      <span className="block truncate font-mono text-xs text-muted">
                        {r.description ?? '—'}
                      </span>
                    ) : r.url ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="block truncate font-mono text-xs text-muted underline-offset-4 hover:underline"
                      >
                        {r.url}
                      </a>
                    ) : (
                      <span className="block truncate font-mono text-xs text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-ink-soft">{r.module}</td>
                  <td className="px-3 py-3 font-mono text-xs text-ink-soft">
                    {r.level.toUpperCase()}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-ink-soft">{r.topic}</td>
                  <td className="px-3 py-3 font-mono text-xs text-ink-soft">
                    {r.resource_type === 'advice' ? (
                      <span className="rounded-rad-pill bg-ink px-2 py-0.5 text-[10px] uppercase tracking-widest text-page">
                        Совет
                      </span>
                    ) : (
                      r.resource_type
                    )}
                  </td>
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

const EMPTY_BODY: LearningAdviceBody = {
  why: '',
  steps: ['', '', ''],
  drill: '',
  avoid: '',
  progress: '',
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
  const initialKind: 'advice' | 'external' =
    initial?.resource_type === 'advice' ? 'advice' : initial ? 'external' : 'advice'

  const [kind, setKind] = useState<'advice' | 'external'>(initialKind)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [moduleVal, setModuleVal] = useState<string>(initial?.module ?? 'lesen')
  const [level, setLevel] = useState<string>(initial?.level ?? 'a1')
  const [topic, setTopic] = useState<string>(initial?.topic ?? 'general')
  const [externalType, setExternalType] = useState<string>(
    initial && initial.resource_type !== 'advice' ? initial.resource_type : 'website',
  )
  const [description, setDescription] = useState(initial?.description ?? '')
  const [language, setLanguage] = useState<string>(initial?.language ?? 'ru')
  const [isActive, setIsActive] = useState<boolean>(initial?.is_active ?? true)
  const [body, setBody] = useState<LearningAdviceBody>(
    initial?.body ?? EMPTY_BODY,
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function setStep(i: number, value: string) {
    setBody((prev) => {
      const next = [...prev.steps]
      next[i] = value
      return { ...prev, steps: next }
    })
  }

  function addStep() {
    setBody((prev) => {
      if (prev.steps.length >= 6) return prev
      return { ...prev, steps: [...prev.steps, ''] }
    })
  }

  function removeStep(i: number) {
    setBody((prev) => {
      if (prev.steps.length <= 3) return prev
      return { ...prev, steps: prev.steps.filter((_, idx) => idx !== i) }
    })
  }

  async function save() {
    setError(null)
    if (!title.trim()) {
      setError('Title не может быть пустым')
      return
    }

    let payload: Record<string, unknown>
    if (kind === 'external') {
      if (!/^https?:\/\//i.test(url.trim())) {
        setError('URL должен начинаться с http:// или https://')
        return
      }
      payload = {
        id: initial?.id,
        title: title.trim(),
        url: url.trim(),
        module: moduleVal,
        level,
        topic,
        resource_type: externalType,
        description: description.trim() || null,
        language,
        is_active: isActive,
      }
    } else {
      const trimmedSteps = body.steps.map((s) => s.trim()).filter(Boolean)
      if (body.why.trim().length < 50) {
        setError('Раздел «Почему это сложно сейчас» — минимум 50 символов')
        return
      }
      if (trimmedSteps.length < 3) {
        setError('Нужно минимум 3 шага в разделе «Что делать на этой неделе»')
        return
      }
      if (trimmedSteps.some((s) => s.length < 20)) {
        setError('Каждый шаг — минимум 20 символов')
        return
      }
      if (body.drill.trim().length < 50) {
        setError('Раздел «Упражнение прямо сейчас» — минимум 50 символов')
        return
      }
      if (body.avoid.trim().length < 30) {
        setError('Раздел «Чего избегать» — минимум 30 символов')
        return
      }
      if (body.progress.trim().length < 30) {
        setError('Раздел «Признак прогресса» — минимум 30 символов')
        return
      }
      payload = {
        id: initial?.id,
        title: title.trim(),
        module: moduleVal,
        level,
        topic,
        resource_type: 'advice',
        description: description.trim() || null,
        language,
        is_active: isActive,
        body: {
          why: body.why.trim(),
          steps: trimmedSteps,
          drill: body.drill.trim(),
          avoid: body.avoid.trim(),
          progress: body.progress.trim(),
        },
      }
    }

    setSaving(true)
    const res = await fetch('/api/admin/learning-resources/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
      {/* Type toggle */}
      <div className="flex gap-2 rounded-rad border border-line bg-surface p-1">
        <button
          type="button"
          onClick={() => setKind('advice')}
          className={`flex-1 rounded-rad-sm px-4 py-2 text-sm font-medium transition-colors ${
            kind === 'advice' ? 'bg-ink text-page' : 'text-ink-soft hover:text-ink'
          }`}
        >
          Обучающий совет
        </button>
        <button
          type="button"
          onClick={() => setKind('external')}
          className={`flex-1 rounded-rad-sm px-4 py-2 text-sm font-medium transition-colors ${
            kind === 'external' ? 'bg-ink text-page' : 'text-ink-soft hover:text-ink'
          }`}
        >
          Внешний ресурс
        </button>
      </div>

      <ModalField label="Заголовок">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-transparent text-sm text-ink focus:outline-none"
          placeholder={
            kind === 'advice'
              ? 'Как отвечать на вопросы экзаменатора без долгих пауз'
              : 'Lingolia · Modalverben Kapitel'
          }
        />
      </ModalField>

      {kind === 'external' && (
        <ModalField label="URL">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full bg-transparent font-mono text-xs text-ink focus:outline-none"
            placeholder="https://…"
          />
        </ModalField>
      )}

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
        <ModalField label="Язык">
          <FilterSelect
            value={language}
            onChange={setLanguage}
            options={LANGUAGES.map((l) => ({ value: l, label: l.toUpperCase() }))}
          />
        </ModalField>
      </div>

      {kind === 'external' && (
        <ModalField label="Тип внешнего ресурса">
          <FilterSelect
            value={externalType}
            onChange={setExternalType}
            options={EXTERNAL_TYPES.map((t) => ({ value: t, label: t }))}
          />
        </ModalField>
      )}

      <div>
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted">
          {kind === 'advice' ? 'Превью (1-2 строки для админ-списка)' : 'Описание (опционально)'}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-rad border border-line bg-card p-3 text-sm text-ink transition-colors focus:border-ink focus:outline-none"
        />
      </div>

      {kind === 'advice' && (
        <div className="space-y-4 rounded-rad border border-line bg-surface p-4">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Тело совета · 5 разделов
          </div>

          <BodyTextarea
            label="Почему это сложно сейчас"
            hint="200–300 символов · мин. 50"
            rows={4}
            value={body.why}
            onChange={(v) => setBody((p) => ({ ...p, why: v }))}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted">
                Что делать на этой неделе · {body.steps.length} {body.steps.length === 1 ? 'шаг' : body.steps.length < 5 ? 'шага' : 'шагов'} (3–6, мин. 20 симв. каждый)
              </label>
              <button
                type="button"
                onClick={addStep}
                disabled={body.steps.length >= 6}
                className="font-mono text-[10px] uppercase tracking-widest text-ink-soft hover:text-ink disabled:opacity-40"
              >
                + добавить
              </button>
            </div>
            {body.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-3 font-mono text-xs text-muted tabular-nums">{i + 1}.</span>
                <textarea
                  value={step}
                  onChange={(e) => setStep(i, e.target.value)}
                  rows={2}
                  className="flex-1 rounded-rad border border-line bg-card p-2 text-sm text-ink transition-colors focus:border-ink focus:outline-none"
                  placeholder="Один конкретный шаг…"
                />
                <button
                  type="button"
                  onClick={() => removeStep(i)}
                  disabled={body.steps.length <= 3}
                  className="mt-2 font-mono text-[10px] uppercase tracking-widest text-ink-soft hover:text-error disabled:opacity-40"
                >
                  −
                </button>
              </div>
            ))}
          </div>

          <BodyTextarea
            label="Упражнение прямо сейчас"
            hint="150–250 символов · мин. 50"
            rows={3}
            value={body.drill}
            onChange={(v) => setBody((p) => ({ ...p, drill: v }))}
          />

          <BodyTextarea
            label="Чего избегать"
            hint="150–250 символов · мин. 30"
            rows={3}
            value={body.avoid}
            onChange={(v) => setBody((p) => ({ ...p, avoid: v }))}
          />

          <BodyTextarea
            label="Признак прогресса"
            hint="100–200 символов · мин. 30"
            rows={2}
            value={body.progress}
            onChange={(v) => setBody((p) => ({ ...p, progress: v }))}
          />
        </div>
      )}

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

function BodyTextarea({
  label,
  hint,
  rows,
  value,
  onChange,
}: {
  label: string
  hint: string
  rows: number
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {label}
        </label>
        <span className="font-mono text-[10px] tracking-widest text-muted">
          {hint} · {value.length} симв.
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-rad border border-line bg-card p-2 text-sm text-ink transition-colors focus:border-ink focus:outline-none"
      />
    </div>
  )
}
