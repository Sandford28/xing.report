// POST /api/subscribe — "get one email when the bridge opens."
// Stores the address in our own database; no third-party service, no
// tracking. Idempotent: subscribing twice is fine and looks the same.

export async function onRequestPost({ request, env }) {
  let email = '';
  let honeypot = '';
  try {
    const data = await request.json();
    email = String(data.email ?? '').trim().toLowerCase();
    honeypot = String(data.website ?? ''); // real people leave this empty
  } catch {
    return Response.json({ ok: false, error: 'bad request' }, { status: 400 });
  }

  // a filled honeypot is a bot: pretend success, store nothing
  if (honeypot) return Response.json({ ok: true });

  // light validation — the point is catching typos, not perfect RFC parsing
  if (email.length < 6 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return Response.json({ ok: false, error: 'that does not look like an email address' }, { status: 400 });
  }

  await env.DB
    .prepare('INSERT OR IGNORE INTO subscribers (email, created_at) VALUES (?, ?)')
    .bind(email, new Date().toISOString())
    .run();

  return Response.json({ ok: true });
}

// Pages routes POST to onRequestPost above; everything else lands here.
export async function onRequest() {
  return Response.json({ ok: false, error: 'POST only' }, { status: 405 });
}
