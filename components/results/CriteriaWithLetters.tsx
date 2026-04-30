import { getBuchstabe } from '@/lib/grading/buchstabe'

type CriterionKey = 'taskFulfillment' | 'coherence' | 'vocabulary' | 'grammar'

interface Labels {
  /** German criterion name — primary, big. */
  de: Record<CriterionKey, string>
  /** Translated criterion name — small, in parentheses. */
  translated: Record<CriterionKey, string>
}

interface Props {
  scores: Record<CriterionKey, number>
  max?: number
  labels: Labels
  title: string
  translatedTitle: string
  helper: string
}

const ORDER: CriterionKey[] = ['taskFulfillment', 'coherence', 'vocabulary', 'grammar']

export function CriteriaWithLetters({
  scores,
  max = 25,
  labels,
  title,
  translatedTitle,
  helper,
}: Props) {
  const showTranslatedTitle = translatedTitle && translatedTitle !== title

  return (
    <div className="rounded-rad border border-line bg-card p-6 sm:p-8">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
        {title}
      </div>
      {showTranslatedTitle && (
        <div className="mt-1 font-mono text-[10px] tracking-wider text-muted">
          {translatedTitle}
        </div>
      )}

      <ul className="mt-6 divide-y divide-line-soft">
        {ORDER.map((key) => {
          const score = scores[key]
          const buchstabe = getBuchstabe(score, max)
          const showTranslated = labels.translated[key] !== labels.de[key]
          return (
            <li
              key={key}
              className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 py-4 sm:gap-x-8"
            >
              <div className="min-w-0">
                <div className="text-base font-medium text-ink">
                  {labels.de[key]}
                </div>
                {showTranslated && (
                  <div className="mt-0.5 text-xs italic text-muted">
                    {labels.translated[key]}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 sm:gap-6">
                <div className="font-mono text-sm tabular-nums text-ink-soft">
                  {score}/{max}
                </div>
                <div
                  data-buchstabe={buchstabe.letter}
                  className="font-display text-4xl leading-none tracking-tight tabular-nums sm:text-5xl"
                  style={{ color: buchstabe.cssColor }}
                  aria-label={`Note: ${buchstabe.letter}`}
                >
                  {buchstabe.letter}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <p className="mt-6 text-xs italic leading-relaxed text-muted">{helper}</p>
    </div>
  )
}
