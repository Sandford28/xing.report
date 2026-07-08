// POST /api/hit — first-party, cookieless page-view counter.
//
// The whole of our analytics: no third party, no cookies, no IP or user-agent
// stored, no full URLs, no per-visitor id. Just coarse daily tallies in the D1
// we already run — enough to answer "are people coming, where from, and what
// are they looking at" without tracking anyone. Honours the brief's "no
// third-party trackers" by having zero third parties.

// YYYY-MM-DD in the corridor's timezone (en-CA formats as ISO date)
function corridorDay(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Detroit', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}

// only the referring site's host, never the full URL or query — and our own
// domains collapse to "internal" so self-navigation isn't counted as traffic
function refHost(ref) {
  if (!ref) return 'direct';
  try {
    const h = new URL(ref).hostname.toLowerCase().replace(/^www\./, '');
    if (!h) return 'direct';
    if (h.endsWith('xing.report') || h.endsWith('xing-report-site.pages.dev')) return 'internal';
    return h.slice(0, 100);
  } catch {
    return 'other';
  }
}

const DIRS = new Set(['to_us', 'to_canada']);
const VEHS = new Set(['truck', 'car']);

export async function onRequestPost({ request, env }) {
  // a beacon must never fail loudly — always 204, whatever happens
  try {
    let ref = '', dir = '', veh = '';
    try {
      const d = await request.json();
      ref = String(d.ref ?? '');
      dir = String(d.dir ?? '');
      veh = String(d.veh ?? '');
    } catch {}

    const day = corridorDay();
    const bump = env.DB.prepare(
      `INSERT INTO analytics (day, metric, key, count) VALUES (?, ?, ?, 1)
       ON CONFLICT (day, metric, key) DO UPDATE SET count = count + 1`
    );
    const stmts = [
      bump.bind(day, 'view', ''),
      bump.bind(day, 'ref', refHost(ref)),
    ];
    if (DIRS.has(dir)) stmts.push(bump.bind(day, 'dir', dir));
    if (VEHS.has(veh)) stmts.push(bump.bind(day, 'veh', veh));
    await env.DB.batch(stmts);
  } catch {}
  return new Response(null, { status: 204 });
}

// only POST writes a tally; anything else is a no-op
export async function onRequest() {
  return new Response(null, { status: 204 });
}
