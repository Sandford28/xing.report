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
}
