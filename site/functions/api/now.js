// GET /api/now — the latest reading for every lane of every active crossing,
// plus a trend word computed against the archive.
// This is the website's only door into the database. It reads; it never writes.

export async function onRequest({ env }) {
  const now = Date.now();

  const { results: crossings } = await env.DB.prepare(
    'SELECT id, slug, name FROM crossings WHERE active = 1'
  ).all();

  // Latest reading per (crossing, direction, lane category, lane type).
  // max(id) is safe because ids only ever grow — and it still returns the
  // last known reading if a feed has been down for hours (the page is the
  // one responsible for labelling old data as old).
  const { results: latest } = await env.DB.prepare(
    `SELECT crossing_id, direction, lane_category, lane_type, wait_minutes,
            status_text, lanes_open, max_lanes, feed_updated_at, fetched_at, source
     FROM readings
     WHERE id IN (
       SELECT max(id) FROM readings
       GROUP BY crossing_id, direction, lane_category, lane_type
     )`
  ).all();

  // For the trend: the same lanes as they stood 15–40 minutes ago
  // (per DESIGN-SPEC §5, trend reflects the last 15–30 min).
  const trendNewest = new Date(now - 15 * 60000).toISOString();
  const trendOldest = new Date(now - 40 * 60000).toISOString();
  const { results: prior } = await env.DB.prepare(
    `SELECT crossing_id, direction, lane_category, lane_type, wait_minutes
     FROM readings
     WHERE id IN (
       SELECT max(id) FROM readings
       WHERE fetched_at >= ? AND fetched_at <= ?
       GROUP BY crossing_id, direction, lane_category, lane_type
     )`
  ).bind(trendOldest, trendNewest).all();

  const laneKey = (r) => `${r.crossing_id}/${r.direction}/${r.lane_category}/${r.lane_type}`;
  const priorByLane = new Map(prior.map((r) => [laneKey(r), r.wait_minutes]));

  const payload = {
    generated_at: new Date(now).toISOString(),
    crossings: crossings.map((c) => ({
      slug: c.slug,
      name: c.name,
      readings: latest
        .filter((r) => r.crossing_id === c.id)
        .map(({ crossing_id, ...rest }) => ({
          ...rest,
          trend: trendWord(rest.wait_minutes, priorByLane.get(laneKey({ crossing_id, ...rest }))),
        })),
    })),
  };

  return Response.json(payload, {
    // Data changes every 5 minutes; never let a cache serve stale numbers.
    headers: { 'cache-control': 'no-store' },
  });
}

// One word, never blank (DESIGN-SPEC §5). The feeds report waits in 5-minute
// steps, so a change of ±5 is one real step of movement; anything less —
// including a young archive with no prior reading yet — reads as steady.
function trendWord(current, previous) {
  if (current === null || previous === null || previous === undefined) return 'steady';
  if (current - previous >= 5) return 'climbing';
  if (previous - current >= 5) return 'easing';
  return 'steady';
}
