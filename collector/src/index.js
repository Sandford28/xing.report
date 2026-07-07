// xing.report collector — runs every 5 minutes (see wrangler.toml).
// Fetches the wait-time feeds (CBP, CBSA) and the alert feeds (Ontario 511,
// MDOT, NWS, ECCC), parses them, and archives everything in D1.
//
// Design rules honoured here:
//  - one source failing never stops the others
//  - a failed fetch is still recorded (so gaps in the archive are explainable)
//  - a parse error still saves the raw body (so data can be re-derived)

import * as cbp from './cbp.js';
import * as cbsa from './cbsa.js';
import * as on511 from './on511.js';
import * as mdot from './mdot.js';
import * as nws from './nws.js';
import * as eccc from './eccc.js';
import * as boc from './boc.js';

const WAIT_SOURCES = { cbp, cbsa };
const RAW_RETENTION_DAYS = 7;
// Provincial feeds run to ~600 KB per fetch; archiving those raw every
// 5 minutes would exhaust D1's free storage. Above this size we archive the
// corridor-matched subset instead (full body still kept when parsing fails).
const RAW_BODY_LIMIT = 50_000;
const USER_AGENT = 'xing.report data collector (mark.b.sandford@gmail.com)';

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

  const alertFeeds = [
    ...on511.FEEDS,
    ...mdot.FEEDS,
    ...nws.feedsFor(crossings),
    ...eccc.feedsFor(crossings),
  ];

  await Promise.all([
    ...Object.keys(WAIT_SOURCES).map((name) => collectWaitSource(env, name, crossings, fetchedAt)),
    ...alertFeeds.map((feed) => collectAlertFeed(env, feed, crossings, fetchedAt)),
    boc.maybeCollect(env, fetchedAt, USER_AGENT),
  ]);

  // Prune old raw snapshots; parsed readings and alerts are kept forever.
  const cutoff = new Date(Date.now() - RAW_RETENTION_DAYS * 24 * 3600 * 1000).toISOString();
  await env.DB.prepare('DELETE FROM raw_snapshots WHERE fetched_at < ?').bind(cutoff).run();
}

async function fetchFeed(url) {
  let httpStatus = null;
  let body = null;
  let error = null;
  try {
    const res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
    httpStatus = res.status;
    body = await res.text();
    if (!res.ok) error = `feed returned HTTP ${res.status}`;
  } catch (e) {
    error = String(e?.message ?? e);
  }
  return { httpStatus, body, error };
}

function snapshotStatement(env, source, fetchedAt, httpStatus, error, body) {
  return env.DB
    .prepare('INSERT INTO raw_snapshots (source, fetched_at, http_status, error, body) VALUES (?, ?, ?, ?, ?)')
    .bind(source, fetchedAt, httpStatus, error, body);
}

async function collectWaitSource(env, name, crossings, fetchedAt) {
  const source = WAIT_SOURCES[name];
  const { httpStatus, body, error: fetchError } = await fetchFeed(source.FEED_URL);
  let error = fetchError;
  let readings = [];
  if (!error) {
    try {
      readings = source.parse(body, crossings);
    } catch (e) {
      error = `parse: ${String(e?.message ?? e)}`;
    }
  }

  const insertReading = env.DB.prepare(
    `INSERT INTO readings
       (crossing_id, direction, lane_category, lane_type, wait_minutes,
        status_text, lanes_open, max_lanes, port_status, feed_updated_at,
        fetched_at, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  await env.DB.batch([
    snapshotStatement(env, name, fetchedAt, httpStatus, error, body),
    ...readings.map((r) =>
      insertReading.bind(
        r.crossing_id, r.direction, r.lane_category, r.lane_type, r.wait_minutes,
        r.status_text, r.lanes_open, r.max_lanes, r.port_status, r.feed_updated_at,
        fetchedAt, name
      )
    ),
  ]);
}

const UPSERT_ALERT = `
  INSERT INTO alerts
    (source, external_id, side, event_type, title, description, roadway,
     direction_of_travel, lanes_affected, is_full_closure, severity,
     latitude, longitude, starts_at, ends_at, reported_at,
     first_seen_at, last_seen_at, raw)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (source, external_id) DO UPDATE SET
    event_type = excluded.event_type,
    title = excluded.title,
    description = excluded.description,
    roadway = excluded.roadway,
    direction_of_travel = excluded.direction_of_travel,
    lanes_affected = excluded.lanes_affected,
    is_full_closure = excluded.is_full_closure,
    severity = excluded.severity,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    reported_at = excluded.reported_at,
    last_seen_at = excluded.last_seen_at,
    raw = excluded.raw`;

const LINK_ALERT = `
  INSERT OR IGNORE INTO alert_crossings (alert_id, crossing_id)
  SELECT id, ? FROM alerts WHERE source = ? AND external_id = ?`;

async function collectAlertFeed(env, feed, crossings, fetchedAt) {
  const { httpStatus, body, error: fetchError } = await fetchFeed(feed.url);
  let error = fetchError;
  let items = [];
  if (!error) {
    try {
      items = feed.parse(body, crossings);
    } catch (e) {
      error = `parse: ${String(e?.message ?? e)}`;
    }
  }

  // Storage guard: keep the full body when small or when parsing failed;
  // otherwise keep only the corridor-matched subset.
  const snapshotBody =
    error || !body || body.length <= RAW_BODY_LIMIT
      ? body
      : JSON.stringify({ note: 'corridor subset (full body exceeded size limit)', items: items.map((i) => i.raw) });

  const upsert = env.DB.prepare(UPSERT_ALERT);
  const link = env.DB.prepare(LINK_ALERT);

  await env.DB.batch([
    snapshotStatement(env, feed.source, fetchedAt, httpStatus, error, snapshotBody),
    ...items.flatMap((a) => [
      upsert.bind(
        a.source, a.external_id, a.side, a.event_type, a.title, a.description,
        a.roadway, a.direction_of_travel, a.lanes_affected, a.is_full_closure,
        a.severity, a.latitude, a.longitude, a.starts_at, a.ends_at,
        a.reported_at, fetchedAt, fetchedAt, JSON.stringify(a.raw)
      ),
      ...a.crossingIds.map((crossingId) => link.bind(crossingId, a.source, a.external_id)),
    ]),
  ]);
}
