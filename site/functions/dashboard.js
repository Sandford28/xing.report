// GET /dashboard — private, password-gated view of the first-party analytics.
//
// Not a public product surface: it's the one place the operator can glance at
// "are people coming, how many, when, and from where." The underlying data is
// the same anonymous daily/hourly tallies the site already collects — no IPs,
// no per-visitor ids — so this can never expose an individual, only totals.
//
// Locked with HTTP Basic Auth against the DASHBOARD_PASSWORD secret. Username
// is ignored; only the password matters. If the secret isn't set, it fails
// closed (503) rather than serving open.

// ---- auth -----------------------------------------------------------------

// length-safe compare so a wrong guess can't be timed byte-by-byte
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function passwordFromHeader(request) {
  const h = request.headers.get('Authorization') || '';
  const [scheme, encoded] = h.split(' ');
  if (scheme !== 'Basic' || !encoded) return null;
  let decoded = '';
  try { decoded = atob(encoded); } catch { return null; }
  const i = decoded.indexOf(':');
  return i === -1 ? decoded : decoded.slice(i + 1); // password half of user:pass
}

function askForPassword() {
  return new Response('authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="xing dashboard", charset="UTF-8"' },
  });
}

// ---- timezone helpers (match the beacon: everything is corridor-local) ------

function corridorDay(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Detroit', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}

// ---- referrer classification ----------------------------------------------

// every reddit surface (old/new/np/out + the app's linkshim) folds into one
// line so a reddit launch reads as a single number, not a scatter of hosts.
function isReddit(host) {
  return host === 'reddit.com' || host.endsWith('.reddit.com') || host === 'redd.it';
}

// referrers we recognise as genuine humans arriving from a real place. anything
// not here and not reddit/direct is almost always referrer spam (bots faking a
// Referer header), so it gets bucketed separately instead of flattering the list.
const KNOWN_REAL = new Set([
  'google.com', 'bing.com', 'duckduckgo.com', 'yahoo.com', 'ecosia.org',
  'startpage.com', 'search.brave.com', 'chatgpt.com', 'chat.openai.com',
  'perplexity.ai', 'gemini.google.com', 't.co', 'x.com', 'twitter.com',
  'facebook.com', 'm.facebook.com', 'l.facebook.com', 'linkedin.com',
  'lnkd.in', 'news.ycombinator.com', 'bsky.app', 'youtube.com', 'instagram.com',
]);

// ---- tiny html helpers ------------------------------------------------------

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
));

// one horizontal bar row: label, bar sized to the max, count
function barRow(label, count, max, opts = {}) {
  const pct = max > 0 ? Math.max(2, Math.round((count / max) * 100)) : 0;
  const cls = opts.highlight ? 'bar hi' : 'bar';
  return `<div class="row">
    <div class="row-label">${esc(label)}</div>
    <div class="row-track"><div class="${cls}" style="width:${pct}%"></div></div>
    <div class="row-num">${count.toLocaleString('en-US')}</div>
  </div>`;
}

// ---- render -----------------------------------------------------------------

function renderPage(data) {
  const { totalViews, today, redditToday, viewsByDay, hoursByDay, sources, dirs, vehs, generatedAt } = data;

  const dayMax = Math.max(1, ...viewsByDay.map((d) => d.count));
  const dailyBars = viewsByDay.map((d) => {
    const h = Math.max(2, Math.round((d.count / dayMax) * 100));
    const label = d.day.slice(5); // MM-DD
    return `<div class="vcol" title="${esc(d.day)}: ${d.count}">
      <div class="vnum">${d.count}</div>
      <div class="vbar" style="height:${h}%"></div>
      <div class="vlabel">${esc(label)}</div>
    </div>`;
  }).join('');

  // hourly strips for the most recent days that have hour data — the bump shape
  const hourBlocks = hoursByDay.map(({ day, hours }) => {
    const hmax = Math.max(1, ...hours.map((h) => h.count));
    const bars = hours.map((h) => {
      const height = Math.max(2, Math.round((h.count / hmax) * 100));
      const tick = ['00', '06', '12', '18'].includes(h.hh) ? h.hh : '';
      return `<div class="hcol" title="${esc(day)} ${h.hh}:00 — ${h.count}">
        <div class="hbar" style="height:${height}%"></div>
        <div class="hlabel">${tick}</div>
      </div>`;
    }).join('');
    const dayTotal = hours.reduce((s, h) => s + h.count, 0);
    return `<div class="hourday">
      <div class="hourday-head">${esc(day)} <span class="muted">· ${dayTotal} views</span></div>
      <div class="hourrow">${bars}</div>
    </div>`;
  }).join('');

  const srcMax = Math.max(1, ...sources.named.map((s) => s.count), data.redditTotal);
  const namedRows = sources.named.map((s) =>
    barRow(s.label, s.count, srcMax, { highlight: s.label === 'reddit' })
  ).join('');

  const dirMax = Math.max(1, ...dirs.map((d) => d.count));
  const dirRows = dirs.map((d) => barRow(d.label, d.count, dirMax)).join('');
  const vehMax = Math.max(1, ...vehs.map((v) => v.count));
  const vehRows = vehs.map((v) => barRow(v.label, v.count, vehMax)).join('');

  const spamNote = sources.spam.hosts > 0
    ? `<div class="muted small">+ ${sources.spam.hosts} obscure referrer hosts totalling
       ${sources.spam.hits} hits — almost all referrer spam (bots faking a source),
       not counted as real traffic above.</div>`
    : '';

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>xing.report · dashboard</title>
<style>
  :root { --paper:#F2F1ED; --ink:#141414; --muted:#6b6b6b; --line:#141414; --hi:#1f8a3d; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--paper); color:var(--ink);
    font:400 15px/1.4 "Helvetica Neue", Helvetica, Arial, sans-serif;
    text-transform: lowercase; padding: 20px; max-width: 860px; }
  h1 { font-weight:700; font-size:20px; margin:0 0 2px; }
  h2 { font-weight:700; font-size:15px; margin:28px 0 10px; border-bottom:4px solid var(--ink); padding-bottom:4px; }
  .sub { color:var(--muted); font-size:13px; margin-bottom:18px; }
  .tiles { display:flex; gap:12px; flex-wrap:wrap; }
  .tile { border:4px solid var(--ink); padding:12px 16px; min-width:150px; flex:1; }
  .tile .big { font-weight:700; font-size:40px; font-variant-numeric:tabular-nums; line-height:1; }
  .tile .cap { color:var(--muted); font-size:13px; margin-top:4px; }
  .tile.reddit .big { color:var(--hi); }
  /* horizontal bars */
  .row { display:flex; align-items:center; gap:10px; margin:6px 0; }
  .row-label { width:150px; flex:none; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .row-track { flex:1; background:transparent; border-bottom:1px dotted #bbb; height:20px; position:relative; }
  .bar { height:16px; background:var(--ink); position:absolute; top:2px; left:0; }
  .bar.hi { background:var(--hi); }
  .row-num { width:64px; flex:none; text-align:right; font-variant-numeric:tabular-nums; font-weight:700; }
  /* vertical daily bars */
  .vchart { display:flex; align-items:flex-end; gap:4px; height:160px; overflow-x:auto; padding-top:14px; }
  .vcol { flex:1; min-width:20px; display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end; }
  .vbar { width:70%; background:var(--ink); }
  .vnum { font-size:11px; font-variant-numeric:tabular-nums; margin-bottom:2px; }
  .vlabel { font-size:11px; color:var(--muted); margin-top:4px; }
  /* hourly strips */
  .hourday { margin:10px 0 16px; }
  .hourday-head { font-weight:700; font-size:13px; margin-bottom:4px; }
  .hourrow { display:flex; align-items:flex-end; gap:2px; height:90px; }
  .hcol { flex:1; display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end; }
  .hbar { width:80%; background:var(--ink); }
  .hlabel { font-size:10px; color:var(--muted); margin-top:2px; height:12px; }
  .muted { color:var(--muted); }
  .small { font-size:13px; margin-top:8px; }
  footer { margin-top:32px; color:var(--muted); font-size:12px; border-top:1px solid #ccc; padding-top:8px; }
  @media (prefers-color-scheme: dark) {
    :root { --paper:#141414; --ink:#F2F1ED; --muted:#9a9a9a; --hi:#39d353; }
    .row-track { border-bottom-color:#444; }
    .bar { background:var(--ink); } .bar.hi { background:var(--hi); }
  }
</style>
</head><body>
  <h1>xing.report — traffic</h1>
  <div class="sub">first-party, anonymous. last 30 days. all times america/detroit.</div>

  <div class="tiles">
    <div class="tile"><div class="big">${totalViews.toLocaleString('en-US')}</div><div class="cap">views · 30 days</div></div>
    <div class="tile"><div class="big">${today.toLocaleString('en-US')}</div><div class="cap">views · today</div></div>
    <div class="tile reddit"><div class="big">${redditToday.toLocaleString('en-US')}</div><div class="cap">from reddit · today</div></div>
  </div>

  <h2>views by day</h2>
  <div class="vchart">${dailyBars || '<div class="muted">no data yet</div>'}</div>

  <h2>by hour — the bump</h2>
  ${hourBlocks || '<div class="muted">hourly data starts collecting from this deploy onward.</div>'}

  <h2>where they came from</h2>
  ${namedRows || '<div class="muted">no referrers yet</div>'}
  ${spamNote}

  <h2>direction chosen</h2>
  ${dirRows || '<div class="muted">no data</div>'}

  <h2>vehicle chosen</h2>
  ${vehRows || '<div class="muted">no data</div>'}

  <footer>generated ${esc(generatedAt)} · direction/vehicle reflect the page's default toggles as much as real choice · refresh to update</footer>
</body></html>`;
}

// ---- handler ----------------------------------------------------------------

export async function onRequest({ request, env }) {
  const expected = env.DASHBOARD_PASSWORD;
  if (!expected) {
    return new Response('dashboard password not configured', { status: 503 });
  }
  const given = passwordFromHeader(request);
  if (given === null || !safeEqual(given, expected)) {
    return askForPassword();
  }

  const { results } = await env.DB
    .prepare(
      `SELECT day, metric, key, count FROM analytics
       WHERE day >= date('now', '-30 days') ORDER BY day, key`
    )
    .all();

  const today = corridorDay();
  const viewsMap = {};
  const hoursMap = {};       // day -> { HH -> count }
  const refMap = {};
  const dirMap = {};
  const vehMap = {};
  let totalViews = 0;

  for (const r of results || []) {
    if (r.metric === 'view') {
      viewsMap[r.day] = (viewsMap[r.day] || 0) + r.count;
      totalViews += r.count;
    } else if (r.metric === 'hour') {
      (hoursMap[r.day] ||= {})[r.key] = (hoursMap[r.day]?.[r.key] || 0) + r.count;
    } else if (r.metric === 'ref') {
      refMap[r.key] = (refMap[r.key] || 0) + r.count;
    } else if (r.metric === 'dir') {
      dirMap[r.key] = (dirMap[r.key] || 0) + r.count;
    } else if (r.metric === 'veh') {
      vehMap[r.key] = (vehMap[r.key] || 0) + r.count;
    }
  }

  const viewsByDay = Object.entries(viewsMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, count]) => ({ day, count }));

  // last 3 days that actually have hourly data, newest first, 24 slots each
  const hoursByDay = Object.keys(hoursMap)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 3)
    .map((day) => ({
      day,
      hours: Array.from({ length: 24 }, (_, i) => {
        const hh = String(i).padStart(2, '0');
        return { hh, count: hoursMap[day][hh] || 0 };
      }),
    }));

  // referrers: reddit folded to one line, real sources listed, spam bucketed
  let redditTotal = 0;
  const named = {};
  const spam = { hosts: 0, hits: 0 };
  for (const [host, count] of Object.entries(refMap)) {
    if (host === 'direct' || host === 'internal') {
      if (host === 'direct') named['direct'] = (named['direct'] || 0) + count;
      continue;
    }
    if (isReddit(host)) { redditTotal += count; continue; }
    if (KNOWN_REAL.has(host)) { named[host] = (named[host] || 0) + count; continue; }
    spam.hosts += 1;
    spam.hits += count;
  }
  if (redditTotal > 0) named['reddit'] = redditTotal;
  const namedSorted = Object.entries(named)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));

  const redditToday = (() => {
    // reddit hits today only — recompute from raw rows for the tile
    let n = 0;
    for (const r of results || []) {
      if (r.metric === 'ref' && r.day === today && isReddit(r.key)) n += r.count;
    }
    return n;
  })();

  const html = renderPage({
    totalViews,
    today: viewsMap[today] || 0,
    redditToday,
    redditTotal,
    viewsByDay,
    hoursByDay,
    sources: { named: namedSorted, spam },
    dirs: Object.entries(dirMap).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    vehs: Object.entries(vehMap).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    generatedAt: new Date().toISOString(),
  });

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}
