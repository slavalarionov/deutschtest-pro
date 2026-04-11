import { createServerClient } from '@/lib/supabase-server'
import {
  mergeCompletedModulesCsv,
  parseModuleOrder,
} from '@/lib/exam/module-order'

export {
  mergeCompletedModulesCsv,
  parseModuleOrder,
  isMultiModuleSession,
  sortModulesByExamOrder,
} from '@/lib/exam/module-order'

/**
 * After a module is submitted: update completed_modules and current_module (next or completed).
 */
export async function advanceSessionAfterModule(
  sessionId: string,
  completedModule: string,
  ctx: { mode: string; sessionFlow: string; completedModules: string }
): Promise<{ next: string | 'completed'; completedModules: string }> {
  const order = parseModuleOrder(ctx.mode, ctx.sessionFlow)
  const completedModules = mergeCompletedModulesCsv(ctx.completedModules, completedModule, order)

  const idx = order.indexOf(completedModule)
  const next: string | 'completed' =
    idx >= 0 && idx < order.length - 1 ? order[idx + 1]! : 'completed'

  const supabase = createServerClient()
  const { error } = await supabase
    .from('exam_sessions')
    .update({
      completed_modules: completedModules,
      current_module: next === 'completed' ? 'completed' : next,
    })
    .eq('id', sessionId)

  if (error) {
    console.error('[session-modules] advance failed:', error.message)
  }

  return { next, completedModules }
}
