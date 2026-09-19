import type { SupabaseClient } from "@supabase/supabase-js";

export type AnalyticsSummary = { impressions: number; engagements: number };

/**
 * Fetch the per-target analytics snapshot aggregated per post.
 * The analytics table is not a time-series (migrations 060/061 made each
 * post_platform_id UNIQUE = 1 row per platform), so summing rows by post_id
 * yields the correct total across multi-target posts (FB+IG = both rows).
 */
export async function fetchAnalyticsByPost(
  supabase: SupabaseClient,
  postIds: string[],
): Promise<Map<string, AnalyticsSummary>> {
  const result = new Map<string, AnalyticsSummary>();
  if (postIds.length === 0) return result;

  const { data: analyticsRows, error } = await supabase
    .from("analytics")
    .select("post_id, impressions, engagements")
    .in("post_id", postIds);

  if (error || !analyticsRows) return result;

  for (const a of analyticsRows as { post_id: string; impressions: number | null; engagements: number | null }[]) {
    const impressions = a.impressions ?? 0;
    const engagements = a.engagements ?? 0;
    const cur = result.get(a.post_id);
    if (cur) {
      result.set(a.post_id, {
        impressions: cur.impressions + impressions,
        engagements: cur.engagements + engagements,
      });
    } else {
      result.set(a.post_id, { impressions, engagements });
    }
  }
  return result;
}