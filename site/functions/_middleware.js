// Server-side rendering of the current wait times into the homepage.
//
// WHY: the page paints its live cards with JavaScript (fetch /api/now). A human
// browser runs that JS; many AI answer engines and crawlers do not — they read
// the raw HTML. Without this, they see an empty page where the numbers should
// be. This middleware fills a hidden #ssr-live block with a plain-language,
// text equivalent of the live cards, so those readers get the real numbers.
//
// SAFETY: it only touches the homepage HTML, reads the database (never writes),
// and on ANY error returns the page exactly as it was. It cannot break the site.
// The page's own JavaScript removes #ssr-live once the live cards paint, so a
// real visitor never sees or hears a duplicate.

const HTML_PATH = '/';
const COMPARE_POOL = ['ambassador-bridge', 'detroit-windsor-tunnel'];
const TZ = 'America/Detroit';

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // Everything except the homepage passes straight through, untouched.
  if (url.pathname !== HTML_PATH) return next();

  const res = await next();
  const type = res.headers.get('content-type') || '';
  if (!type.includes('text/html')) return res;

  try {
    const summary = await buildSummaryHtml(context.env);
    if (!summary) return res; // no data yet — leave the page as it is

    return new HTMLRewriter()
      .on('#ssr-live', {
        element(el) {
          el.setInnerContent(summary, { html: true });
        },
      })
      .transform(res);
  } catch {
    // Any failure (DB down, query change, runtime quirk) → serve the page as-is.
    return res;
  }
}

export async function buildSummaryHtml(env) {
  if (!env || !env.DB) return null;

  const { results } = await env.DB.prepare(
    `SELECT c.slug AS slug, c.name AS name, r.direction AS direction,
            r.lane_category AS lane_category, r.wait_minutes AS wait_minutes,
            r.fetched_at AS fetched_at
     FROM readings r
     JOIN crossings c ON c.id = r.crossing_id
     WHERE c.active = 1 AND r.lane_type = 'standard'
       AND r.id IN (
         SELECT max(id) FROM readings
         GROUP BY crossing_id, direction, lane_category, lane_type
       )`
  ).all();

  if (!results || results.length === 0) return null;

  // Index: rows[direction][vehicle] = [{slug, name, wait}]
  const rows = {};
  let newestFetched = 0;
  for (const r of results) {
    const vehicle = r.lane_category === 'commercial' ? 'truck' : 'car';
    (rows[r.direction] ??= {});
    (rows[r.direction][vehicle] ??= []).push({ slug: r.slug, name: r.name, wait: r.wait_minutes });
    const t = Date.parse(r.fetched_at);
    if (t && t > newestFetched) newestFetched = t;
  }

  const now = Date.now();
  const asOf = fmtTime(newestFetched || now);
  const ageMin = newestFetched ? Math.floor((now - newestFetched) / 60000) : null;
  const stale = ageMin !== null && ageMin > 10;

  const parts = [];
  parts.push(
    `<p>Live Detroit–Windsor border wait times as of ${esc(asOf)}, updated every five minutes from U.S. Customs and Border Protection (into the U.S.) and the Canada Border Services Agency (into Canada).</p>`
  );
  if (stale) {
    parts.push(
      `<p>Warning: the last successful data check was about ${ageMin} minutes ago, so these numbers may be out of date.</p>`
    );
  }

  for (const [dir, dirLabel] of [
    ['to_canada', 'Into Canada (Detroit → Windsor)'],
    ['to_us', 'Into the United States (Windsor → Detroit)'],
  ]) {
    const byVeh = rows[dir];
    if (!byVeh) continue;
    parts.push(`<p>${esc(dirLabel)}:</p><ul>`);
    for (const vehicle of ['car', 'truck']) {
      const list = byVeh[vehicle];
      if (!list || list.length === 0) continue;
      parts.push(`<li>${vehicleLabel(vehicle)}: ${esc(lineFor(vehicle, list))}</li>`);
    }
    parts.push('</ul>');
  }

  parts.push(
    `<p>Compare the live numbers and see approach-road alerts, tolls, and cameras at https://xing.report. Machine-readable data: https://xing.report/api/now</p>`
  );

  return parts.join('');
}

// One sentence for a direction + vehicle: name the fastest, then list each
// crossing with its wait and plain-word status. Mirrors the site's rules —
// the tunnel is never named the fastest freight crossing (standard 13'6"
// trailers can't clear its 12'8" height).
function lineFor(vehicle, list) {
  const ordered = COMPARE_POOL
    .map((slug) => list.find((x) => x.slug === slug))
    .filter(Boolean);
  const items = ordered.length ? ordered : list;

  const detail = items
    .map((x) => `${shortName(x)} ${waitPhrase(x.wait, vehicle)}`)
    .join('; ');

  const eligible = items.filter(
    (x) => x.wait !== null && x.wait !== undefined &&
      !(vehicle === 'truck' && x.slug === 'detroit-windsor-tunnel')
  );
  if (eligible.length === 0) return detail;

  const fastest = eligible.reduce((a, b) => (b.wait < a.wait ? b : a));
  const lead =
    eligible.length > 1
      ? `fastest is the ${shortName(fastest)} at ${waitPhrase(fastest.wait, vehicle)}. `
      : '';
  const tail =
    vehicle === 'truck' && items.some((x) => x.slug === 'detroit-windsor-tunnel')
      ? " The Detroit–Windsor Tunnel can't clear standard 13'6\" trailers."
      : '';
  return `${lead}${detail}.${tail}`;
}

function waitPhrase(wait, vehicle) {
  if (wait === null || wait === undefined) return 'no current reading';
  const w = statusWord(wait, vehicle);
  return `${wait} min (${w})`;
}

// Same thresholds as the page (index.html THRESHOLDS / statusOf).
function statusWord(wait, vehicle) {
  const t = vehicle === 'truck' ? { slow: 20, backed: 60 } : { slow: 15, backed: 45 };
  if (wait < t.slow) return 'moving';
  if (wait < t.backed) return 'slow';
  return 'backed up';
}

function shortName(x) {
  if (x.slug === 'ambassador-bridge') return 'Ambassador Bridge';
  if (x.slug === 'detroit-windsor-tunnel') return 'Detroit–Windsor Tunnel';
  return x.name || x.slug;
}

function vehicleLabel(vehicle) {
  return vehicle === 'truck' ? 'Trucks' : 'Cars';
}

function fmtTime(ms) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
      timeZoneName: 'short',
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString();
  }
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
