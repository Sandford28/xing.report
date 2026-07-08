// GET /api/stats — read-only view of the first-party counter (last 30 days).
// Aggregated, anonymous, no auth: it exposes nothing about any individual, only
// daily totals. Handy for a glance at whether the site is being used and where
// visitors are coming from (the SEO signal).

export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare(
      `SELECT day, metric, key, count FROM analytics
       WHERE day >= date('now', '-30 days') ORDER BY day`
    )
    .all();

  const days = {};
  const refs = {};
  const dirs = {};
  const vehs = {};
  let totalViews = 0;
  for (const r of results || []) {
    if (r.metric === 'view') {
      days[r.day] = (days[r.day] || 0) + r.count;
      totalViews += r.count;
    } else if (r.metric === 'ref') {
      refs[r.key] = (refs[r.key] || 0) + r.count;
    } else if (r.metric === 'dir') {
      dirs[r.key] = (dirs[r.key] || 0) + r.count;
    } else if (r.metric === 'veh') {
      vehs[r.key] = (vehs[r.key] || 0) + r.count;
    }
  }
  const topRefs = Object.entries(refs).sort((a, b) => b[1] - a[1]).slice(0, 20);

  return Response.json(
    { total_views_30d: totalViews, views_by_day: days, top_referrers: topRefs, direction_split: dirs, vehicle_split: vehs },
    { headers: { 'cache-control': 'public, max-age=300' } }
  );
}
