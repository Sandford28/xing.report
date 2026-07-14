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

// day string N days before today, corridor-local
function dayBefore(n) {
  return corridorDay(new Date(Date.now() - n * 86400000));
}

// ---- referrer classification ----------------------------------------------

// every reddit surface (old/new/np/out + the app's linkshim) folds into one
// line so a reddit launch reads as a single number, not a scatter of hosts.
function isReddit(host) {
  return host === 'reddit.com' || host.endsWith('.reddit.com') || host === 'redd.it';
}

// referrers we recognise as genuine humans arriving from a real place. anything
// not here and not reddit/direct is almost always referrer spam (bots faking a
// Referer header), so it's flagged as such rather than flattering the numbers.
const KNOWN_REAL = new Set([
  'google.com', 'bing.com', 'duckduckgo.com', 'yahoo.com', 'ecosia.org',
  'startpage.com', 'search.brave.com', 'chatgpt.com', 'chat.openai.com',
  'perplexity.ai', 'gemini.google.com', 't.co', 'x.com', 'twitter.com',
  'facebook.com', 'm.facebook.com', 'l.facebook.com', 'linkedin.com',
  'lnkd.in', 'news.ycombinator.com', 'bsky.app', 'youtube.com', 'instagram.com',
]);

function categorise(host) {
  if (host === 'direct') return 'direct';
  if (isReddit(host)) return 'reddit';
  if (KNOWN_REAL.has(host)) return 'real';
  return 'spam';
}

// ---- tiny html helpers ------------------------------------------------------

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
));

const n = (x) => Number(x || 0).toLocaleString('en-US');

function tile(big, cap, cls = '') {
  return `<div class="tile ${cls}"><div class="big">${esc(big)}</div><div class="cap">${esc(cap)}</div></div>`;
}

// vertical bar chart from [{label,count,title}]
function vchart(items) {
  if (!items.length) return '<div class="muted">no data yet</div>';
  const max = Math.max(1, ...items.map((i) => i.count));
  const cols = items.map((i) => {
    const h = i.count > 0 ? Math.max(3, Math.round((i.count / max) * 100)) : 0;
    return `<div class="vcol" title="${esc(i.title || i.label)}">
      <div class="vnum">${i.count || ''}</div>
      <div class="vbar" style="height:${h}%"></div>
      <div class="vlabel">${esc(i.label)}</div>
    </div>`;
  }).join('');
  return `<div class="vchart">${cols}</div>`;
}

// ---- render -----------------------------------------------------------------

function renderPage(d) {
  const {
    stats, viewsByDay, redditByDay, hoursByDay, referrers, dirs, vehs, generatedAt,
  } = d;

  // Overview: daily bars + reddit-per-day overlay via the by-day table
  const dailyChart = vchart(viewsByDay.map((x) => ({
    label: x.day.slice(5), count: x.count, title: `${x.day}: ${x.count} views`,
  })));

  // By day: sortable table
  const dayRows = [...viewsByDay].reverse().map((x) => {
    const r = redditByDay[x.day] || 0;
    return `<tr>
      <td data-sort="${esc(x.day)}">${esc(x.day)}</td>
      <td data-sort="${x.count}" class="num">${n(x.count)}</td>
      <td data-sort="${r}" class="num">${n(r)}</td>
    </tr>`;
  }).join('');

  // By hour: one strip + table per recent day
  const hourBlocks = hoursByDay.length ? hoursByDay.map(({ day, hours }) => {
    const hmax = Math.max(1, ...hours.map((h) => h.count));
    const bars = hours.map((h) => {
      const height = h.count > 0 ? Math.max(3, Math.round((h.count / hmax) * 100)) : 0;
      const tick = ['00', '06', '12', '18'].includes(h.hh) ? h.hh : '';
      return `<div class="hcol" title="${esc(day)} ${h.hh}:00 — ${h.count}">
        <div class="hbar" style="height:${height}%"></div><div class="hlabel">${tick}</div>
      </div>`;
    }).join('');
    const total = hours.reduce((s, h) => s + h.count, 0);
    return `<div class="hourday">
      <div class="hourday-head">${esc(day)} <span class="muted">· ${total} views</span></div>
      <div class="hourrow">${bars}</div>
    </div>`;
  }).join('') : '<div class="muted">hourly data starts collecting from the deploy that added it onward.</div>';

  // Referrers: full sortable table with a category flag
  const catLabel = { reddit: 'reddit', direct: 'direct', real: 'real', spam: 'likely bot/spam' };
  const refRows = referrers.map((rf) => `<tr class="cat-${rf.cat}">
    <td data-sort="${esc(rf.host)}">${esc(rf.host)}</td>
    <td data-sort="${rf.count}" class="num">${n(rf.count)}</td>
    <td data-sort="${esc(rf.cat)}">${esc(catLabel[rf.cat] || rf.cat)}</td>
  </tr>`).join('');

  const splitTable = (rows, a, b) => `<table class="sortable">
    <thead><tr><th>${a}</th><th data-type="num">${b}</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
  const dirRows = dirs.map((x) => `<tr><td data-sort="${esc(x.label)}">${esc(x.label)}</td><td data-sort="${x.count}" class="num">${n(x.count)}</td></tr>`).join('');
  const vehRows = vehs.map((x) => `<tr><td data-sort="${esc(x.label)}">${esc(x.label)}</td><td data-sort="${x.count}" class="num">${n(x.count)}</td></tr>`).join('');

  const trendStr = stats.trendPct === null ? '—'
    : `${stats.trendPct >= 0 ? '+' : ''}${stats.trendPct}%`;
  const trendCls = stats.trendPct === null ? '' : (stats.trendPct >= 0 ? 'up' : 'down');

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>xing.report · dashboard</title>
<style>
  :root { --paper:#F2F1ED; --ink:#141414; --muted:#6b6b6b; --hi:#1f8a3d; --warn:#b23b1e; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--paper); color:var(--ink);
    font:400 15px/1.4 "Helvetica Neue", Helvetica, Arial, sans-serif;
    text-transform:lowercase; padding:20px; max-width:900px; }
  h1 { font-weight:700; font-size:20px; margin:0 0 2px; }
  h2 { font-weight:700; font-size:15px; margin:24px 0 10px; }
  .sub { color:var(--muted); font-size:13px; margin-bottom:16px; }
  /* tabs */
  .tabbar { display:flex; gap:0; border-bottom:4px solid var(--ink); flex-wrap:wrap; }
  .tabbar button { font:700 14px "Helvetica Neue", Helvetica, Arial, sans-serif; text-transform:lowercase;
    background:transparent; color:var(--muted); border:none; border-bottom:4px solid transparent;
    margin-bottom:-4px; padding:10px 14px; cursor:pointer; }
  .tabbar button[aria-selected="true"] { color:var(--ink); border-bottom-color:var(--ink); }
  [data-panel] { padding-top:8px; }
  /* tiles */
  .tiles { display:flex; gap:10px; flex-wrap:wrap; margin:6px 0 4px; }
  .tile { border:4px solid var(--ink); padding:10px 14px; min-width:120px; flex:1; }
  .tile .big { font-weight:700; font-size:32px; font-variant-numeric:tabular-nums; line-height:1; }
  .tile .cap { color:var(--muted); font-size:12px; margin-top:4px; }
  .tile.reddit .big { color:var(--hi); }
  .tile.up .big { color:var(--hi); } .tile.down .big { color:var(--warn); }
  /* tables */
  table { border-collapse:collapse; width:100%; margin:8px 0 4px; font-variant-numeric:tabular-nums; }
  th, td { text-align:left; padding:6px 10px; border-bottom:1px solid #ccc; }
  th { font-weight:700; border-bottom:2px solid var(--ink); user-select:none; }
  td.num, th[data-type="num"] { text-align:right; }
  tr.cat-reddit td { color:var(--hi); font-weight:700; }
  tr.cat-spam td { color:var(--muted); }
  .sortable th { cursor:pointer; }
  .sortable th::after { content:" ↕"; color:#bbb; font-size:11px; }
  /* vertical daily bars */
  .vchart { display:flex; align-items:flex-end; gap:4px; height:150px; overflow-x:auto; padding-top:14px; }
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
  .muted { color:var(--muted); } .small { font-size:13px; }
  .note { color:var(--muted); font-size:13px; margin:8px 0; }
  footer { margin-top:28px; color:var(--muted); font-size:12px; border-top:1px solid #ccc; padding-top:8px; }
  @media (prefers-color-scheme: dark) {
    :root { --paper:#141414; --ink:#F2F1ED; --muted:#9a9a9a; --hi:#39d353; --warn:#ff6a45; }
    th, td { border-bottom-color:#333; } .vchart, .hourrow {}
  }
</style>
</head><body>
  <h1>xing.report — traffic</h1>
  <div class="sub">first-party, anonymous · last 30 days · times america/detroit</div>

  <div class="tabbar">
    <button data-tab="overview" aria-selected="true">overview</button>
    <button data-tab="byday" aria-selected="false">by day</button>
    <button data-tab="byhour" aria-selected="false">by hour</button>
    <button data-tab="refs" aria-selected="false">referrers</button>
  </div>

  <section data-panel="overview">
    <div class="tiles">
      ${tile(n(stats.total30), 'views · 30 days')}
      ${tile(n(stats.today), 'today')}
      ${tile(n(stats.yesterday), 'yesterday')}
      ${tile(trendStr, 'last 7d vs prior 7d', trendCls)}
    </div>
    <div class="tiles">
      ${tile(n(stats.reddit30), 'from reddit · 30d', 'reddit')}
      ${tile(n(stats.redditToday), 'from reddit · today', 'reddit')}
      ${tile(stats.busiestDay.count ? `${n(stats.busiestDay.count)}` : '—', `busiest day (${stats.busiestDay.day ? stats.busiestDay.day.slice(5) : '—'})`)}
      ${tile(stats.peakHour.count ? `${stats.peakHour.hh}:00` : '—', `peak hour${stats.peakHour.count ? ` (${n(stats.peakHour.count)} on ${stats.peakHour.day.slice(5)})` : ''}`)}
    </div>
    <h2>views by day</h2>
    ${dailyChart}
    <h2>direction chosen</h2>
    ${splitTable(dirRows || '<tr><td class="muted">no data</td><td></td></tr>', 'direction', 'hits')}
    <h2>vehicle chosen</h2>
    ${splitTable(vehRows || '<tr><td class="muted">no data</td><td></td></tr>', 'vehicle', 'hits')}
    <div class="note">direction & vehicle reflect the page's default toggles as much as real choice — read them as rough, not precise.</div>
  </section>

  <section data-panel="byday" hidden>
    <h2>views by day <span class="muted small">— click a column to sort</span></h2>
    <table class="sortable">
      <thead><tr><th>day</th><th data-type="num">views</th><th data-type="num">from reddit</th></tr></thead>
      <tbody>${dayRows || '<tr><td class="muted">no data yet</td><td></td><td></td></tr>'}</tbody>
    </table>
  </section>

  <section data-panel="byhour" hidden>
    <h2>by hour — the bump</h2>
    <div class="note">the shape of traffic through the day. right after you post to reddit, watch this fill in hour by hour.</div>
    ${hourBlocks}
  </section>

  <section data-panel="refs" hidden>
    <h2>where they came from <span class="muted small">— click a column to sort</span></h2>
    <div class="note">reddit surfaces are folded into one line. rows marked “likely bot/spam” are obscure hosts faking a referrer — real people don't come from them.</div>
    <table class="sortable">
      <thead><tr><th>source</th><th data-type="num">hits</th><th>type</th></tr></thead>
      <tbody>${refRows || '<tr><td class="muted">no referrers yet</td><td></td><td></td></tr>'}</tbody>
    </table>
  </section>

  <footer>generated ${esc(generatedAt)} · refresh to update · reddit's mobile app often sends no referrer, so app traffic can land in “direct” — the reddit number is a reliable floor, not a perfect total</footer>

<script>
(function(){
  var tabs = [].slice.call(document.querySelectorAll('[data-tab]'));
  var panels = [].slice.call(document.querySelectorAll('[data-panel]'));
  function show(name){
    panels.forEach(function(p){ p.hidden = p.getAttribute('data-panel') !== name; });
    tabs.forEach(function(t){ t.setAttribute('aria-selected', String(t.getAttribute('data-tab') === name)); });
  }
  tabs.forEach(function(t){ t.addEventListener('click', function(){ show(t.getAttribute('data-tab')); }); });

  [].slice.call(document.querySelectorAll('table.sortable')).forEach(function(tbl){
    var ths = [].slice.call(tbl.tHead.rows[0].cells);
    ths.forEach(function(th, idx){
      var dir = 1;
      th.addEventListener('click', function(){
        var body = tbl.tBodies[0];
        var rows = [].slice.call(body.rows);
        var numeric = th.getAttribute('data-type') === 'num';
        rows.sort(function(a,b){
          var av = a.cells[idx] ? (a.cells[idx].getAttribute('data-sort') || a.cells[idx].textContent) : '';
          var bv = b.cells[idx] ? (b.cells[idx].getAttribute('data-sort') || b.cells[idx].textContent) : '';
          return numeric ? (parseFloat(av||0)-parseFloat(bv||0))*dir : String(av).localeCompare(String(bv))*dir;
        });
        dir = -dir;
        rows.forEach(function(r){ body.appendChild(r); });
      });
    });
  });
})();
</script>
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

  const viewsMap = {};
  const hoursMap = {};        // day -> { HH -> count }
  const refMap = {};          // host -> total count
  const redditByDay = {};     // day -> reddit count
  const dirMap = {};
  const vehMap = {};
  const peakHour = { day: '', hh: '', count: 0 };

  for (const r of results || []) {
    if (r.metric === 'view') {
      viewsMap[r.day] = (viewsMap[r.day] || 0) + r.count;
    } else if (r.metric === 'hour') {
      (hoursMap[r.day] ||= {})[r.key] = (hoursMap[r.day]?.[r.key] || 0) + r.count;
      if (r.count > peakHour.count) { peakHour.day = r.day; peakHour.hh = r.key; peakHour.count = r.count; }
    } else if (r.metric === 'ref') {
      if (r.key === 'internal') continue; // self-navigation isn't traffic
      refMap[r.key] = (refMap[r.key] || 0) + r.count;
      if (isReddit(r.key)) redditByDay[r.day] = (redditByDay[r.day] || 0) + r.count;
    } else if (r.metric === 'dir') {
      dirMap[r.key] = (dirMap[r.key] || 0) + r.count;
    } else if (r.metric === 'veh') {
      vehMap[r.key] = (vehMap[r.key] || 0) + r.count;
    }
  }

  const viewsByDay = Object.entries(viewsMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, count]) => ({ day, count }));

  const today = corridorDay();
  const yesterday = dayBefore(1);
  const last7Days = new Set(Array.from({ length: 7 }, (_, i) => dayBefore(i)));
  const prev7Days = new Set(Array.from({ length: 7 }, (_, i) => dayBefore(i + 7)));
  const sumDays = (set) => viewsByDay.reduce((s, x) => s + (set.has(x.day) ? x.count : 0), 0);
  const last7 = sumDays(last7Days);
  const prev7 = sumDays(prev7Days);

  const busiestDay = viewsByDay.reduce((best, x) => (x.count > best.count ? x : best), { day: '', count: 0 });

  const total30 = viewsByDay.reduce((s, x) => s + x.count, 0);
  const reddit30 = Object.values(redditByDay).reduce((s, c) => s + c, 0);

  // last 3 days that actually have hourly data, newest first, all 24 slots
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

  // reddit folded to one synthetic host; everything else listed with a category
  let redditTotalHost = 0;
  const referrers = [];
  for (const [host, count] of Object.entries(refMap)) {
    if (isReddit(host)) { redditTotalHost += count; continue; }
    referrers.push({ host, count, cat: categorise(host) });
  }
  if (redditTotalHost > 0) referrers.push({ host: 'reddit (all)', count: redditTotalHost, cat: 'reddit' });
  referrers.sort((a, b) => b.count - a.count);

  const stats = {
    total30, today: viewsMap[today] || 0, yesterday: viewsMap[yesterday] || 0,
    last7, prev7, trendPct: prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : null,
    reddit30, redditToday: redditByDay[today] || 0,
    busiestDay, peakHour,
  };

  const html = renderPage({
    stats, viewsByDay, redditByDay, hoursByDay, referrers,
    dirs: Object.entries(dirMap).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    vehs: Object.entries(vehMap).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    generatedAt: new Date().toISOString(),
  });

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}
