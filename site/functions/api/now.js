// GET /api/now — the latest reading for every lane of every active crossing,
// plus alerts, trends, hand-maintained facts (tolls, hazmat, statuses), and
// the official exchange rate.
// This is the website's door into the database. It reads; it never writes.

import { CROSSING_INFO } from '../_lib/crossing-info.js';
import { CAMERAS } from '../_lib/cameras.js';

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

  // Active alerts: still present in the source's feed as of the last ~15 min,
  // currently in effect (planned future roadwork stays out until it starts),
  // not cleared, and not a low-importance provincewide notice.
  const nowIso = new Date(now).toISOString();
  const activeSince = new Date(now - 15 * 60000).toISOString();
  const { results: alerts } = await env.DB.prepare(
    `SELECT ac.crossing_id, a.source, a.side, a.event_type, a.title, a.description,
            a.roadway, a.direction_of_travel, a.lanes_affected, a.is_full_closure,
            a.severity, a.reported_at, a.first_seen_at
     FROM alerts a
     JOIN alert_crossings ac ON ac.alert_id = a.id
     WHERE a.last_seen_at >= ?
       AND (a.starts_at IS NULL OR a.starts_at <= ?)
       AND (a.ends_at IS NULL OR a.ends_at >= ?)
       AND a.event_type != 'incident_cleared'
       AND NOT (a.event_type = 'notice' AND (a.severity IS NULL OR a.severity != 'high'))
     ORDER BY a.is_full_closure DESC, a.first_seen_at DESC`
  ).bind(activeSince, nowIso, nowIso).all();

  // When our alert collection last succeeded — the page uses this to say
  // "incident reports unavailable" instead of a false "no incidents".
  const alertsChecked = await env.DB.prepare(
    `SELECT max(fetched_at) AS t FROM raw_snapshots
     WHERE source IN ('on511_event', 'on511_roadcondition', 'on511_alert', 'mdot_incident', 'nws', 'eccc')
       AND error IS NULL`
  ).first();

  // Official Bank of Canada USD/CAD rate — for showing a USD-only toll in
  // CAD (and vice versa) so a driver never does currency math.
  const fx = await env.DB.prepare(
    "SELECT date, rate FROM fx_rates WHERE pair = 'USDCAD' ORDER BY date DESC LIMIT 1"
  ).first();

  // The Gordie Howe status section is hand-maintained and shown even while
  // the crossing is inactive for wait times.
  const gordie = CROSSING_INFO['gordie-howe-bridge'];

  const payload = {
    generated_at: nowIso,
    alerts_checked_at: alertsChecked?.t ?? null,
    usd_cad: fx ? { date: fx.date, rate: fx.rate } : null,
    gordie_howe: gordie ? { status: gordie.status, hazmat: gordie.hazmat } : null,
    crossings: crossings.map((c) => ({
      slug: c.slug,
      name: c.name,
      info: CROSSING_INFO[c.slug] ?? null,
      cameras: CAMERAS[c.slug] ?? null,
      readings: latest
        .filter((r) => r.crossing_id === c.id)
        .map(({ crossing_id, ...rest }) => ({
          ...rest,
          trend: trendWord(rest.wait_minutes, priorByLane.get(laneKey({ crossing_id, ...rest }))),
        })),
      alerts: alerts
        .filter((a) => a.crossing_id === c.id)
        .map(({ crossing_id, ...rest }) => rest),
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
