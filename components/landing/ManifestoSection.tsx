import { getLocale } from 'next-intl/server'

/**
 * Manifesto · "Цена ошибки велика."
 *
 * Anchors the price perception: the real Goethe-Institut exam costs 10 500 ₽
 * and up — our 160 ₽ for all four modules is positioned against that reality.
 * RU-only (Russian partner-centre prices, no localised counterpart yet).
 *
 * Layout: two-column on lg+ (left = manifesto copy, right = Goethe price card),
 * full-width black banner below comparing 160 ₽ to A1 Goethe.
 */

const GOETHE_PRICES_RU: Array<{
  level: string
  total: string
  perModule: string | null
}> = [
  { level: 'A1', total: '10 500 ₽', perModule: null },
  { level: 'A2', total: '11 000 ₽', perModule: null },
  { level: 'B1', total: '14 600 ₽', perModule: '4 700 ₽ модуль' },
  { level: 'B2', total: '16 000 ₽', perModule: '5 200 ₽ модуль' },
  { level: 'C1', total: '18 500 ₽', perModule: '6 000 ₽ модуль' },
]

export async function ManifestoSection() {
  const locale = await getLocale()
  if (locale !== 'ru') return null

  return (
    <section
      id="manifesto"
      className="bg-page px-4 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="eyebrow mb-8 sm:mb-12">01 — МАНИФЕСТ</div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: manifesto copy */}
          <div>
            <h2 className="font-display text-4xl leading-none tracking-tighter text-ink sm:text-5xl lg:text-[64px]">
              Цена ошибки велика.
            </h2>
            <div className="mt-8 space-y-5 text-base leading-relaxed text-ink-soft sm:mt-10 sm:text-lg">
              <p>
                Пересдавать экзамен в Гёте-Институте — невыгодное занятие.
                И к нему лучше подготовиться заранее.
              </p>
              <p>
                Часто люди не сдают экзамен просто потому, что переволновались
                или не были готовы к его структуре — а не потому, что не знают
                язык.
              </p>
              <p>
                На <span className="font-medium text-ink">DeutschTest.pro</span>{' '}
                вы не только проверите свои знания и увидите слабые места и
                точки роста, но и избавитесь от страха перед самим экзаменом —
                а именно он чаще всего становится главным врагом.
              </p>
            </div>
          </div>

          {/* Right: Goethe-Institut price table */}
          <div className="rounded-rad border border-line bg-card p-6 sm:p-8">
            <div>
              <h3 className="font-display text-2xl font-medium leading-tight tracking-tight text-ink sm:text-[28px]">
                Стоимость экзамена в Гёте-Институте
              </h3>
              <p className="mt-2 text-sm italic text-muted">
                Партнёрские центры в России, апрель 2026
                <sup className="ml-0.5 not-italic">*</sup>
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between border-y border-line py-3 font-mono text-[11px] uppercase tracking-wide text-muted">
              <span>УРОВЕНЬ</span>
              <span>СТОИМОСТЬ ЭКЗАМЕНА</span>
            </div>

            <ul className="divide-y divide-line">
              {GOETHE_PRICES_RU.map((row) => (
                <li
                  key={row.level}
                  className="flex items-baseline justify-between py-4"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-2xl tracking-tight text-ink sm:text-[28px]">
                      {row.level}
                    </span>
                    {row.perModule && (
                      <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
                        {row.perModule}
                      </span>
                    )}
                  </div>
                  <span className="font-display text-2xl tracking-tight text-ink sm:text-[28px]">
                    {row.total}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-xs leading-relaxed text-muted">
              <em>
                * Средние значения по партнёрским центрам Гёте-Института в
                России. Источник — открытые данные центров на апрель 2026.
              </em>
            </p>
          </div>
        </div>

        {/* Bottom: full-width banner — our price vs A1 Goethe */}
        <div className="mt-12 flex flex-col items-start gap-8 rounded-rad bg-ink p-8 text-card sm:mt-16 sm:p-12 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:p-16">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wide text-card/60">
              DEUTSCHTEST.PRO · ВСЕ 4 МОДУЛЯ
            </div>
            <div
              className="mt-2 font-display leading-none text-card"
              style={{ fontSize: 'clamp(64px, 10vw, 112px)', letterSpacing: '-0.04em' }}
            >
              160 ₽
            </div>
          </div>
          <p className="max-w-md text-2xl leading-snug text-card sm:text-3xl lg:text-right">
            В{' '}
            <span
              className="font-display italic"
              style={{
                fontSize: 'clamp(56px, 7vw, 84px)',
                fontWeight: 500,
                letterSpacing: '-0.03em',
              }}
            >
              65
            </span>{' '}
            раз дешевле, чем сдать A1 в Гёте-Институте.
          </p>
        </div>
      </div>
    </section>
  )
}
