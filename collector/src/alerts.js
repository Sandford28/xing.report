// xing.report — ALERTS + WEATHER collector (worker B). Runs every 5 minutes.
//
// The heavy half: Ontario 511, MDOT, NWS and ECCC — several large feeds
// (provincial XML runs to ~600 KB) parsed and upserted every tick. Split into
// its own worker so that when this half is slow or gets killed mid-run, it can
// only cost a few minutes of alert freshness — never a hole in the permanent
// wait-time archive, which lives in the separate waits worker.

import * as on511 from './on511.js';
import * as mdot from './mdot.js';
import * as nws from './nws.js';
import * as eccc from './eccc.js';
import { collectAlertFeed } from './shared.js';
import { collectWaits } from './waits.js';

// if the newest wait reading is older than this, worker A missed a tick and
// worker B collects the waits itself. > one A interval (5 min) + margin, so it
// stays dormant when A is healthy and never double-collects in steady state.
const BACKSTOP_STALE_MIN = 7;

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(collectAlerts(env));
  },
};

async function collectAlerts(env) {
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

  // allSettled: any one feed failing (or its batch throwing) never stops the rest.
  await Promise.allSettled(
    alertFeeds.map((feed) => collectAlertFeed(env, feed, crossings, fetchedAt))
  );

  await backstopWaits(env);
}

// Self-healing backstop for the wait archive. Worker A owns it, but its 5-minute
// cron has stalled three days running (jul 7–9) while this worker kept firing.
// Worker B runs on an offset schedule, so if the newest reading is stale it means
// A skipped a tick — collect the waits here too. In normal operation A keeps the
// readings fresh, this check passes, and nothing else runs. Wrapped so a backstop
// failure can never take down the alerts run that already succeeded.
async function backstopWaits(env) {
  try {
    const row = await env.DB.prepare('SELECT MAX(fetched_at) AS newest FROM readings').first();
    const ageMin = row && row.newest ? (Date.now() - Date.parse(row.newest)) / 60000 : Infinity;
    if (ageMin <= BACKSTOP_STALE_MIN) return;
    // leave a marker so any gap is explainable and we can see the backstop working
    await env.DB
      .prepare("INSERT INTO raw_snapshots (source, fetched_at, http_status, error) VALUES ('waits_backstop', ?, NULL, ?)")
      .bind(new Date().toISOString(), `worker B backstop fired: readings were ${Math.round(ageMin)} min stale`)
      .run();
    await collectWaits(env);
  } catch (e) {
    // never let the backstop break a healthy alerts run
    console.log('backstopWaits error:', e && e.message);
  }
}
