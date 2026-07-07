// GET /api/patterns — "best time to cross" history: the typical wait by hour
// of day for each crossing, direction, and vehicle, built from the readings
// archive. Read-only, like every site endpoint; the collector owns writes.
//
// Honesty gate (DESIGN-SPEC / brief): an hour-of-day pattern is only drawn
// once the archive holds at least MIN_DAYS of history — otherwise the site
// says so plainly instead of drawing a confident-looking chart from thin data.

const LOOKBACK_DAYS = 90; // recent typical behaviour, and keeps the scan bounded
const MIN_DAYS = 7;       // a week — at least one of each weekday — before we draw
const TZ = 'America/Detroit';

export async function onRequest({ env }) {
  const now = Date.now();
  const since = new Date(now - LOOKBACK_DAYS * 24 * 3600 * 1000).toISOString();

  // How much history we actually have in the window. Distinct UTC calendar
  // days is a close-enough proxy for local days to gate the chart on.
  const span = await env.DB.prepare(
    `SELECT COUNT(DISTINCT substr(fetched_at, 1, 10)) AS days,
            MIN(fetched_at) AS first, MAX(fetched_at) AS last
     FROM readings WHERE fetched_at >= ?`
  ).bind(since).first();

  const days = span?.days ?? 0;
  const ready = days >= MIN_DAYS;

  const { results: crossings } = await env.DB.prepare(
    'SELECT id, slug FROM crossings WHERE active = 1'
  ).all();
  const slugById = new Map(crossings.map((c) => [c.id, c.slug]));

  // Only pay for the aggregation once there's enough history to show it.
  let byCrossing = {};
  if (ready) {
    const { results: rows } = await env.DB.prepare(
      `SELECT crossing_id, direction, lane_category,
              CAST(strftime('%H', fetched_at) AS INTEGER) AS utc_hour,
              ROUND(AVG(wait_minutes)) AS avg_wait,
              COUNT(wait_minutes) AS n
       FROM readings
       WHERE lane_type = 'standard' AND wait_minutes IS NOT NULL
         AND fetched_at >= ?
       GROUP BY crossing_id, direction, lane_category, utc_hour`
    ).bind(since).all();

    // Shift UTC hour to local hour with the corridor's *current* offset. This
    // is exact for all readings taken in the present DST season; readings from
    // the other season smear by one hour — acceptable for a "typical" chart,
    // revisited if we ever want per-season precision.
    const shift = tzOffsetHours(TZ, new Date(now));

    for (const r of rows) {
      const slug = slugById.get(r.crossing_id);
      if (!slug) continue;
      const vehicle = r.lane_category === 'commercial' ? 'truck' : 'car';
      const localHour = ((r.utc_hour + shift) % 24 + 24) % 24;
      const c = (byCrossing[slug] ??= {});
      const d = (c[r.direction] ??= {});
      const series = (d[vehicle] ??= Array.from({ length: 24 }, (_, h) => ({ hour: h, wait: null, n: 0 })));
      // A UTC hour maps to exactly one local hour, so no accumulation needed.
      series[localHour] = { hour: localHour, wait: r.avg_wait, n: r.n };
    }
  }

  const payload = {
    generated_at: new Date(now).toISOString(),
    timezone: TZ,
    lookback_days: LOOKBACK_DAYS,
    min_days: MIN_DAYS,
    history: { days, first: span?.first ?? null, last: span?.last ?? null },
    ready,
    crossings: byCrossing,
  };

  return Response.json(payload, {
    // Historical aggregates move slowly; an hour of edge caching spares D1 the
    // repeated full-window scan. This is not the live number.
    headers: { 'cache-control': 'public, max-age=3600' },
  });
}

// Hours to add to a UTC hour to reach local time in `timeZone` (e.g. -4 for
// America/Detroit in July). Uses the same instant formatted two ways.
function tzOffsetHours(timeZone, date) {
  const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const local = new Date(date.toLocaleString('en-US', { timeZone }));
  return Math.round((local - utc) / 3600000);
}
