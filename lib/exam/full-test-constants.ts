export const FULL_TEST_MODULE_ORDER = ['lesen', 'horen', 'schreiben', 'sprechen'] as const
export type FullTestModule = (typeof FULL_TEST_MODULE_ORDER)[number]

export const FULL_TEST_MODULE_LABELS: Record<FullTestModule, string> = {
  lesen: 'Lesen',
  horen: 'Hören',
  schreiben: 'Schreiben',
  sprechen: 'Sprechen',
}
