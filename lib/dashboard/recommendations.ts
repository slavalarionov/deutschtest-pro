// server-only — thin wrapper around getOrGenerateSnapshot for the dashboard
// API route. Old shape (overallAssessment / strengths / weaknesses / studyPlan)
// is gone; consumers now read weak_areas + summary_text + matched_resources.

import { getOrGenerateSnapshot, type RecommendationsSnapshot } from '@/lib/recommendations/snapshot'

export interface RecommendationsPayload {
  snapshot: RecommendationsSnapshot | null
}

export async function loadRecommendations(
  userId: string,
  opts: { forceRefresh?: boolean } = {}
): Promise<RecommendationsPayload> {
  const snapshot = await getOrGenerateSnapshot(userId, opts)
  return { snapshot }
}
