// GET /api/now — the latest reading for every lane of every active crossing.
// This is the website's only door into the database. It reads; it never writes.

export async function onRequest({ env }) {
  const { results: crossings } = await env.DB.prepare(
    'SELECT id, slug, name FROM crossings WHERE active = 1'
  ).all();

  // Latest reading per (crossing, direction, lane category, lane type).
  // max(id) is safe because ids only ever grow — and it still returns the
  // last known reading if a feed has been down for hours (the page is the
  // one responsible for labelling old data as old).
  const { results: readings } = await env.DB.prepare(
    `SELECT crossing_id, direction, lane_category, lane_type, wait_minutes,
            status_text, lanes_open, max_lanes, feed_updated_at, fetched_at, source
     FROM readings
     WHERE id IN (
       SELECT max(id) FROM readings
       GROUP BY crossing_id, direction, lane_category, lane_type
     )`
  ).all();

  const payload = {
    generated_at: new Date().toISOString(),
    crossings: crossings.map((c) => ({
      slug: c.slug,
      name: c.name,
      readings: readings
        .filter((r) => r.crossing_id === c.id)
        .map(({ crossing_id, ...rest }) => rest),
    })),
  };

  return Response.json(payload, {
    // Data changes every 5 minutes; never let a cache serve stale numbers.
    headers: { 'cache-control': 'no-store' },
  });
}
