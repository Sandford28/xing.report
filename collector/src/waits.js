// xing.report — WAIT-TIME collector (worker A). Runs every 5 minutes.
//
// The core of the whole project: the permanent CBP/CBSA wait-time archive.
// Kept deliberately lean — two small feeds and a once-a-day FX rate — so this
// invocation is fast and can never be starved or killed mid-run by the heavier
// alert/weather worker. Every reading is archived with its timestamp forever.

import * as cbp from './cbp.js';
import * as cbsa from './cbsa.js';
import * as boc from './boc.js';
import { collectWaitSource, pruneRawSnapshots, USER_AGENT } from './shared.js';

const WAIT_SOURCES = { cbp, cbsa };

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(collectWaits(env));
  },
};

// exported so worker B can run it as a self-healing backstop when worker A's
// cron stalls (see alerts.js). idempotent: safe to call from either worker.
export async function collectWaits(env) {
  const fetchedAt = new Date().toISOString();
  const { results: crossings } = await env.DB
    .prepare('SELECT * FROM crossings WHERE active = 1')
    .all();

  // allSettled: one source erroring never drops the other or skips the prune.
  await Promise.allSettled([
    ...Object.entries(WAIT_SOURCES).map(([name, src]) => collectWaitSource(env, name, src, crossings, fetchedAt)),
    boc.maybeCollect(env, fetchedAt, USER_AGENT),
  ]);

  await pruneRawSnapshots(env);
}
