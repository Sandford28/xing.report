// Bank of Canada Valet API — the official USD/CAD daily rate.
// Published once per business day (~16:30 ET), so we don't hit it every
// 5 minutes: the collector calls maybeCollect once an hour, and only if
// we don't already have a fresh observation.

export const FEED_URL = 'https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json?recent=1';

export async function maybeCollect(env, fetchedAt, userAgent) {
  // only on the first tick of each hour
  if (new Date(fetchedAt).getUTCMinutes() >= 5) return;

  // skip if we already have an observation from the last ~24h
  const latest = await env.DB
    .prepare("SELECT max(date) AS d FROM fx_rates WHERE pair = 'USDCAD'")
    .first();
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
  if (latest?.d && latest.d >= dayAgo) return;

  let httpStatus = null;
  let body = null;
  let error = null;
  let observation = null;
  try {
    const res = await fetch(FEED_URL, { headers: { 'user-agent': userAgent } });
    httpStatus = res.status;
    body = await res.text();
    if (res.ok) {
      const doc = JSON.parse(body);
      const obs = (doc.observations || [])[0];
      const rate = Number(obs?.FXUSDCAD?.v);
      if (obs?.d && Number.isFinite(rate)) observation = { date: obs.d, rate };
      else error = 'no observation in response';
    } else {
      error = `feed returned HTTP ${res.status}`;
    }
  } catch (e) {
    error = String(e?.message ?? e);
  }

  const statements = [
    env.DB
      .prepare('INSERT INTO raw_snapshots (source, fetched_at, http_status, error, body) VALUES (?, ?, ?, ?, ?)')
      .bind('boc_fx', fetchedAt, httpStatus, error, body),
  ];
  if (observation) {
    statements.push(
      env.DB
        .prepare("INSERT OR IGNORE INTO fx_rates (date, pair, rate, fetched_at) VALUES (?, 'USDCAD', ?, ?)")
        .bind(observation.date, observation.rate, fetchedAt)
    );
  }
  await env.DB.batch(statements);
}
