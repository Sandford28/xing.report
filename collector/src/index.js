// xing.report collector — runs every 5 minutes (see wrangler.toml).
// Fetches both government feeds, parses them, and archives every reading
// in D1 forever. Also keeps the raw responses for 14 days as insurance.
//
// Design rules honoured here:
//  - one source failing never stops the other
//  - a failed fetch is still recorded (so gaps in the archive are explainable)
//  - a parse error still saves the raw body (so readings can be re-derived)

import * as cbp from './cbp.js';
import * as cbsa from './cbsa.js';

const SOURCES = { cbp, cbsa };
const RAW_RETENTION_DAYS = 14;

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(collect(env));
  },
};

async function collect(env) {
  const fetchedAt = new Date().toISOString();
  const { results: crossings } = await env.DB
    .prepare('SELECT * FROM crossings WHERE active = 1')
    .all();

  await Promise.all(
    Object.keys(SOURCES).map((name) => collectSource(env, name, crossings, fetchedAt))
  );

  // Prune old raw snapshots; the parsed readings are kept forever.
  const cutoff = new Date(Date.now() - RAW_RETENTION_DAYS * 24 * 3600 * 1000).toISOString();
  await env.DB.prepare('DELETE FROM raw_snapshots WHERE fetched_at < ?').bind(cutoff).run();
}

async function collectSource(env, name, crossings, fetchedAt) {
  const source = SOURCES[name];
  let httpStatus = null;
  let body = null;
  let error = null;
  let readings = [];

  try {
    const res = await fetch(source.FEED_URL, {
      headers: { 'user-agent': 'xing.report data collector (mark.b.sandford@gmail.com)' },
    });
    httpStatus = res.status;
    body = await res.text();
    if (res.ok) readings = source.parse(body, crossings);
    else error = `feed returned HTTP ${res.status}`;
  } catch (e) {
    error = String(e?.message ?? e);
  }

  const insertReading = env.DB.prepare(
    `INSERT INTO readings
       (crossing_id, direction, lane_category, lane_type, wait_minutes,
        status_text, lanes_open, max_lanes, port_status, feed_updated_at,
        fetched_at, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  await env.DB.batch([
    env.DB
      .prepare(
        'INSERT INTO raw_snapshots (source, fetched_at, http_status, error, body) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(name, fetchedAt, httpStatus, error, body),
    ...readings.map((r) =>
      insertReading.bind(
        r.crossing_id, r.direction, r.lane_category, r.lane_type, r.wait_minutes,
        r.status_text, r.lanes_open, r.max_lanes, r.port_status, r.feed_updated_at,
        fetchedAt, name
      )
    ),
  ]);
}
