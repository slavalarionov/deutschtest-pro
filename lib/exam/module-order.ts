import { FULL_TEST_MODULE_ORDER } from '@/lib/exam/full-test-constants'

const MODULE_SET = new Set<string>(FULL_TEST_MODULE_ORDER)

export function sortModulesByExamOrder(modules: string[]): string[] {
  const uniq = Array.from(new Set(modules.map((m) => m.trim()).filter(Boolean)))
  return FULL_TEST_MODULE_ORDER.filter((m) => uniq.includes(m))
}

export function parseModuleOrder(mode: string, sessionFlow: string): string[] {
  if (mode === 'full' && sessionFlow === 'full_test') {
    return [...FULL_TEST_MODULE_ORDER]
  }
  if (mode.includes(',')) {
    return mode
      .split(',')
      .map((s) => s.trim())
      .filter((m) => MODULE_SET.has(m))
  }
  if (MODULE_SET.has(mode)) {
    return [mode]
  }
  return []
}

export function isMultiModuleSession(mode: string, sessionFlow: string): boolean {
  return parseModuleOrder(mode, sessionFlow).length > 1
}

export function mergeCompletedModulesCsv(
  previousCsv: string,
  justCompleted: string,
  order: string[]
): string {
  const set = new Set(
    previousCsv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  )
  set.add(justCompleted)
  return order.filter((m) => set.has(m)).join(',')
}
