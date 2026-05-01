import { getTranslations } from 'next-intl/server'
import { HoerenSampleMock } from './hoeren-sample/HoerenSampleMock'

/**
 * Landing · ModulesDetailSection — "Каждый модуль — уникален."
 *
 * Chessboard layout: four module cards alternate left/right between description
 * and a stylised mockup that echoes the real exam UI from
 * components/modules/{Lesen,Horen,Schreiben,Sprechen}Module.tsx. Mockups are
 * decorative — static placeholders, no live data.
 *
 * On mobile (< lg) the chessboard collapses to a single column, with the
 * mockup ALWAYS rendered above the text per module.
 *
 * Tezisy (3 per module) are truth-checked against:
 *   - prompts/scoring/schreiben-score.ts → 4 criteria (Aufgabenerfüllung,
 *     Kohärenz, Wortschatz, Grammatik), 0–25 each.
 *   - prompts/scoring/sprechen-score.ts → 5 criteria (… + Flüssigkeit,
 *     Aussprache), 0–20 each.
 *   - prompts/generation/lesen-teil1..5.ts → 5 Teile across all levels.
 *   - prompts/generation/horen-teil1..4.ts → 4 Teile, multi-voice
 *     synthesis (Teil 2: 2 voices/scene; Teil 4: 5 dialogues, 2 voices each).
 *
 * Static content → server component.
 */

const MODULE_KEYS = ['lesen', 'horen', 'schreiben', 'sprechen'] as const
type ModuleKey = (typeof MODULE_KEYS)[number]

// Chessboard direction: 'normal' = description left / mock right.
//                       'reverse' = mock left / description right.
const SIDE: Record<ModuleKey, 'normal' | 'reverse'> = {
  lesen: 'normal',
  horen: 'reverse',
  schreiben: 'normal',
  sprechen: 'reverse',
}

// Shared atoms for the mockup chrome — the thin cobalt accent ring and the
// editorial card surface come from globals.css design tokens.
const MOCK_CARD =
  'rounded-rad border border-accent/25 bg-card p-4 shadow-lift ring-1 ring-accent/10 sm:p-5'
const MOCK_INNER = 'rounded-rad-sm border border-line bg-card'
const MOCK_EYEBROW =
  'font-mono text-[10px] uppercase tracking-wider text-muted'
const MOCK_TIMER =
  'font-mono text-xs tabular-nums text-ink-soft'

export async function ModulesDetailSection() {
  const t = await getTranslations('landing.modulesDetail')

  return (
    <section
      id="modules-detail"
      className="bg-page px-4 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        {/* Section header — mirrors FeaturesSection's eyebrow + display H2 +
            muted second-line treatment. Eyebrow is left numberless on
            purpose; the main agent renumbers all sections in a follow-up. */}
        <div className="mb-16 sm:mb-20 lg:mb-24">
          <div className="eyebrow mb-3">{t('eyebrow')}</div>
          <h2 className="font-display text-4xl leading-none tracking-tighter text-ink sm:text-5xl lg:text-[64px]">
            {t('titleStrong')}
            <br />
            <span className="italic text-muted">{t('titleMuted')}</span>
          </h2>
        </div>

        {/* Chessboard list */}
        <div className="space-y-20 sm:space-y-28 lg:space-y-32">
          {MODULE_KEYS.map((key, i) => (
            <ModuleRow key={key} moduleKey={key} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

async function ModuleRow({
  moduleKey,
  index,
}: {
  moduleKey: ModuleKey
  index: number
}) {
  const t = await getTranslations('landing.modulesDetail')
  const tezisy = [0, 1, 2] as const
  const reverse = SIDE[moduleKey] === 'reverse'

  return (
    <article className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">
      {/* Description column */}
      <div
        className={
          reverse
            ? 'order-2 lg:order-2 lg:col-span-5 lg:col-start-8'
            : 'order-2 lg:order-1 lg:col-span-5'
        }
      >
        <div className="font-mono text-[11px] uppercase tracking-wider text-muted">
          {`0${index + 1} · ${t(`items.${moduleKey}.label`)}`}
        </div>
        <h3 className="mt-3 font-display text-3xl leading-tight tracking-tight text-ink sm:text-4xl lg:text-[44px]">
          {t(`items.${moduleKey}.title`)}
        </h3>
        <p className="mt-4 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
          {t(`items.${moduleKey}.lede`)}
        </p>

        <ul className="mt-7 space-y-3 text-sm leading-relaxed text-ink-soft sm:text-base">
          {tezisy.map((idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-[0.45em] inline-block h-px w-4 shrink-0 bg-ink/40"
              />
              <span>{t(`items.${moduleKey}.tezisy.${idx}`)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Mockup column — always above text on mobile (order-1) */}
      <div
        className={
          reverse
            ? 'order-1 lg:order-1 lg:col-span-6 lg:col-start-1'
            : 'order-1 lg:order-2 lg:col-span-6 lg:col-start-7'
        }
      >
        {moduleKey === 'lesen' && <LesenMock />}
        {moduleKey === 'horen' && <HoerenSampleMock />}
        {moduleKey === 'schreiben' && <SchreibenMock />}
        {moduleKey === 'sprechen' && <SprechenMock />}
      </div>
    </article>
  )
}

// ============================================================
// Shared mock chrome
// ============================================================

function MockHeader({
  caption,
  timer,
}: {
  caption: string
  timer: string
}) {
  return (
    <div className="flex items-center justify-between border-b border-line pb-3">
      <span className={MOCK_EYEBROW}>{caption}</span>
      <span className={MOCK_TIMER}>{timer}</span>
    </div>
  )
}

function TeilTabs({
  count,
  active,
  prefix = 'Teil',
}: {
  count: number
  active: number
  prefix?: string
}) {
  return (
    <div className="mt-3 flex gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={`flex-1 rounded-rad-sm px-2 py-1.5 text-center font-mono text-[10px] uppercase tracking-wider transition ${
            i === active
              ? 'bg-ink text-card'
              : 'bg-surface text-muted'
          }`}
        >
          {prefix} {i + 1}
        </span>
      ))}
    </div>
  )
}

// ============================================================
// Lesen — text-on-left + r/f questions on right
// ============================================================

function LesenMock() {
  return (
    <div className={MOCK_CARD}>
      <MockHeader
        caption="МОДУЛЬ · LESEN · 65 МИН · 5 ЧАСТЕЙ"
        timer="42:17"
      />
      <TeilTabs count={5} active={0} />

      <div className="mt-4 grid gap-3 sm:grid-cols-5">
        {/* Text column */}
        <div className={`${MOCK_INNER} p-3 sm:col-span-3`}>
          <p className="text-[10px] leading-relaxed text-ink-soft sm:text-[11px]">
            <span className="font-medium text-ink">
              Liebe Freunde, gestern war ich endlich auf dem Wochenmarkt.
            </span>{' '}
            Es war voll, aber ich habe alles gefunden, was ich brauchte. Der
            Käse aus dem Allgäu hat mir besonders gut geschmeckt. Nächste
            Woche möchte ich wieder hingehen — vielleicht kommst du mit?
          </p>
          <p className="mt-2 text-[10px] leading-relaxed text-muted sm:text-[11px]">
            Am Stand mit Brot habe ich Anna getroffen. Sie hat erzählt, dass
            sie jetzt jeden Samstag dort einkauft…
          </p>
        </div>

        {/* Questions column */}
        <div className="space-y-2 sm:col-span-2">
          {[
            { id: 1, q: 'Der Markt war leer.', a: 'falsch' as const },
            { id: 2, q: 'Käse hat geschmeckt.', a: 'richtig' as const },
            { id: 3, q: 'Anna kommt nicht.', a: null as 'richtig' | 'falsch' | null },
          ].map((row) => (
            <div
              key={row.id}
              className={`${MOCK_INNER} flex items-start justify-between gap-2 p-2.5`}
            >
              <span className="text-[10px] leading-tight text-ink-soft">
                <span className="mr-1.5 font-mono text-[9px] text-muted">
                  {row.id}
                </span>
                {row.q}
              </span>
              <div className="flex shrink-0 gap-1">
                <span
                  className={`rounded-rad-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase ${
                    row.a === 'richtig'
                      ? 'border-accent/60 bg-accent-soft text-accent-ink'
                      : 'border-line text-muted'
                  }`}
                >
                  R
                </span>
                <span
                  className={`rounded-rad-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase ${
                    row.a === 'falsch'
                      ? 'border-accent/60 bg-accent-soft text-accent-ink'
                      : 'border-line text-muted'
                  }`}
                >
                  F
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Hören — fake waveform + transcript + r/f tasks
// ============================================================

function HorenMock() {
  // Deterministic bar heights (no Math.random — server-render stability).
  // 28 bars; first 11 are "played" (cobalt), rest muted.
  const HEIGHTS = [
    14, 22, 9, 26, 18, 30, 12, 20, 28, 16, 24, 11, 19, 27,
    13, 21, 10, 25, 17, 23, 15, 29, 12, 18, 26, 14, 20, 16,
  ]
  const PLAYED = 11

  return (
    <div className={MOCK_CARD}>
      <MockHeader
        caption="МОДУЛЬ · HÖREN · 40 МИН · 4 ЧАСТИ"
        timer="32:08"
      />
      <TeilTabs count={4} active={1} />

      {/* Audio player */}
      <div className={`${MOCK_INNER} mt-4 flex items-center gap-3 p-3`}>
        {/* Play button */}
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-card">
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>

        {/* Waveform */}
        <div className="flex h-8 flex-1 items-center gap-[2px]">
          {HEIGHTS.map((h, i) => (
            <span
              key={i}
              aria-hidden
              className="block w-[3px] rounded-full"
              style={{
                height: `${h}px`,
                background:
                  i < PLAYED ? 'var(--accent)' : 'var(--line)',
              }}
            />
          ))}
        </div>

        <span className="font-mono text-[10px] tabular-nums text-muted">
          0:23 / 1:08
        </span>
      </div>

      {/* Tasks */}
      <div className="mt-3 space-y-1.5">
        {[
          { id: 6, q: 'Die Frau kommt aus München.', a: 'richtig' as const },
          { id: 7, q: 'Sie arbeitet seit drei Jahren.', a: 'falsch' as const },
          { id: 8, q: 'Das Treffen ist am Freitag.', a: null as 'richtig' | 'falsch' | null },
        ].map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-2 border-l-2 border-accent/40 py-1.5 pl-2.5"
          >
            <span className="text-[10px] leading-tight text-ink-soft">
              <span className="mr-1.5 font-mono text-[9px] text-muted">
                {row.id}
              </span>
              {row.q}
            </span>
            <div className="flex shrink-0 gap-1">
              <span
                className={`rounded-rad-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase ${
                  row.a === 'richtig'
                    ? 'border-accent/60 bg-accent-soft text-accent-ink'
                    : 'border-line text-muted'
                }`}
              >
                R
              </span>
              <span
                className={`rounded-rad-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase ${
                  row.a === 'falsch'
                    ? 'border-accent/60 bg-accent-soft text-accent-ink'
                    : 'border-line text-muted'
                }`}
              >
                F
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Schreiben — Aufgabe + textarea + 4-criteria letters
// ============================================================

function SchreibenMock() {
  // Schreiben criteria (Goethe). Letters mirror the A–E system used in
  // results UI (CriteriaWithLetters), capped at 4 letters here.
  const CRITERIA = [
    { code: 'AUF', label: 'Aufgabenerfüllung', letter: 'A' },
    { code: 'KOH', label: 'Kohärenz', letter: 'B' },
    { code: 'WOR', label: 'Wortschatz', letter: 'A' },
    { code: 'GRA', label: 'Grammatik', letter: 'B' },
  ]

  return (
    <div className={MOCK_CARD}>
      <MockHeader
        caption="МОДУЛЬ · SCHREIBEN · 60 МИН · 2 ЗАДАНИЯ"
        timer="48:52"
      />
      <TeilTabs count={2} active={0} prefix="Teil" />

      {/* Aufgabe */}
      <div className={`${MOCK_INNER} mt-4 p-3`}>
        <div className={MOCK_EYEBROW}>AUFGABE</div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink">
          Schreiben Sie eine E-Mail an Ihre Freundin Lisa. Sie möchten
          zusammen ins Kino gehen.
        </p>
        <ul className="mt-2 space-y-0.5 text-[10px] leading-relaxed text-ink-soft">
          <li>· wann Sie Zeit haben</li>
          <li>· welchen Film Sie sehen möchten</li>
          <li>· wo Sie sich treffen</li>
        </ul>
      </div>

      {/* Textarea */}
      <div className={`${MOCK_INNER} mt-2 p-3`}>
        <p className="text-[11px] leading-relaxed text-ink">
          Liebe Lisa,
          <br />
          danke für deine Nachricht. Ich habe am Samstag Zeit. Wollen
          wir den neuen Film im Cinemaxx sehen?<span className="ml-0.5 inline-block h-3 w-px animate-live-pulse bg-ink align-middle" />
        </p>
      </div>

      {/* Word counter + criteria */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            34 / 40 Wörter
          </span>
        </div>
        <div className="flex gap-1">
          {CRITERIA.map((c) => (
            <span
              key={c.code}
              title={c.label}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-accent/40 bg-accent-soft font-display text-[11px] font-medium text-accent-ink"
            >
              {c.letter}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Sprechen — record button + transcript + 5-criteria letters
// ============================================================

function SprechenMock() {
  // Sprechen has 5 Goethe criteria — see prompts/scoring/sprechen-score.ts.
  const CRITERIA = [
    { code: 'AUF', letter: 'A' },
    { code: 'FLU', letter: 'B' },
    { code: 'WOR', letter: 'A' },
    { code: 'GRA', letter: 'B' },
    { code: 'AUS', letter: 'A' },
  ]

  return (
    <div className={MOCK_CARD}>
      <MockHeader
        caption="МОДУЛЬ · SPRECHEN · 15 МИН · 3 ЧАСТИ"
        timer="08:14"
      />
      <TeilTabs count={3} active={1} />

      {/* Aufgabe label */}
      <div className={`${MOCK_INNER} mt-4 p-3`}>
        <div className={MOCK_EYEBROW}>TEIL 2 · EIN THEMA PRÄSENTIEREN</div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink">
          Online-Einkaufen — Vor- und Nachteile.
        </p>
      </div>

      {/* Record button + timer */}
      <div className="mt-4 flex flex-col items-center gap-2">
        <button
          type="button"
          aria-label="Запись"
          className="relative flex h-16 w-16 items-center justify-center rounded-full bg-accent text-card shadow-pop"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0" />
            <path d="M12 18v3" />
            <path d="M9 21h6" />
          </svg>
          <span
            aria-hidden
            className="absolute -inset-1 animate-live-pulse rounded-full ring-2 ring-accent/30"
          />
        </button>
        <span className="font-mono text-xs tabular-nums text-ink-soft">
          00:38
        </span>
      </div>

      {/* Transcript bubble */}
      <div className={`${MOCK_INNER} mt-4 p-3`}>
        <div className="mb-1.5">
          <span className="inline-flex items-center gap-1 rounded-rad-pill border border-accent/30 bg-accent-soft px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-accent-ink">
            <span className="h-1 w-1 rounded-full bg-accent" />
            ТРАНСКРИПТ
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-ink">
          {`„Heute spreche ich über Online-Einkaufen. Ich finde, es hat viele Vorteile, aber auch ein paar Nachteile…“`}
        </p>
      </div>

      {/* 5 criteria letters */}
      <div className="mt-3 flex items-center justify-end gap-1">
        {CRITERIA.map((c, i) => (
          <span
            key={i}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-accent/40 bg-accent-soft font-display text-[11px] font-medium text-accent-ink"
          >
            {c.letter}
          </span>
        ))}
      </div>
    </div>
  )
}
