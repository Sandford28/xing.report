// IndexNow ping — tells participating search engines (Bing, Yandex, Seznam…)
// that a URL is new or changed, so they re-crawl in minutes instead of days.
//
// Usage:
//   node scripts/indexnow.mjs                       # pings the homepage
//   node scripts/indexnow.mjs https://xing.report/  https://xing.report/foo
//
// The key lives in site/public/<key>.txt (hosted at the site root, which is how
// IndexNow proves the ping is authorized). This site is essentially one page,
// so ping sparingly — on a real content/structure change (e.g. a new page, or
// the Gordie Howe launch), not on every 5-minute wait-time update.

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HOST = 'xing.report';
const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'site', 'public');

const keyFile = (await readdir(PUBLIC_DIR)).find((f) => /^[a-f0-9]{16,}\.txt$/.test(f));
if (!keyFile) {
  console.error('No IndexNow key file found in site/public/. Nothing to do.');
  process.exit(1);
}
const key = (await readFile(join(PUBLIC_DIR, keyFile), 'utf8')).trim();

const urlList = process.argv.slice(2);
if (urlList.length === 0) urlList.push(`https://${HOST}/`);

const body = {
  host: HOST,
  key,
  keyLocation: `https://${HOST}/${keyFile}`,
  urlList,
};

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});

// IndexNow returns 200 or 202 on success; the body is usually empty.
const text = await res.text();
console.log(`IndexNow: HTTP ${res.status} ${res.statusText}${text ? ' — ' + text : ''}`);
console.log('submitted:', urlList.join(', '));
process.exit(res.ok ? 0 : 1);
