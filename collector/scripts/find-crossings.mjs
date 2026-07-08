// On-demand discovery: list every port/office the CBP and CBSA feeds currently
// carry, and flag any we don't already track — most importantly the Gordie Howe
// International Bridge the day it appears. Run this when you hear Gordie Howe is
// opening (or occasionally) to get the EXACT feed strings needed to activate it.
//
//   node scripts/find-crossings.mjs
//
// The collector itself needs no code change to add a crossing: the CBP/CBSA
// parsers are data-driven (they match rows in the `crossings` table by
// cbp_port_name+cbp_crossing_name / cbsa_office_name). Activation is data only —
// see GORDIE-HOWE-ACTIVATION.md.

import { XMLParser } from 'fast-xml-parser';

const UA = 'xing.report data collector (mark.b.sandford@gmail.com)';
const CBP_URL = 'https://bwt.cbp.gov/xml/bwt.xml';
const CBSA_URL = 'https://www.cbsa-asfc.gc.ca/bwt-taf/bwt-eng.csv';

// what we already track (keep in sync with the crossings table seed)
const KNOWN_CBP = new Set([
  'Detroit|Ambassador Bridge',
  'Detroit|Windsor Tunnel',
  'Port Huron|Bluewater Bridge',
]);
const KNOWN_CBSA = new Set([
  'Ambassador Bridge',
  'Windsor and Detroit Tunnel',
  'Blue Water Bridge',
]);
const WATCH = /howe|gordie/i; // the one we're waiting for

async function get(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

function flag(isNew, text) {
  if (WATCH.test(text)) return `  ★ GORDIE HOWE? → ${text}`;
  return `  ${isNew ? '+ NEW    ' : '  tracked '} ${text}`;
}

const cbpXml = await get(CBP_URL);
const doc = new XMLParser({ ignoreDeclaration: true }).parse(cbpXml);
const ports = [].concat(Object.values(doc)[0]?.port ?? []);
console.log(`CBP (Canada→US) — ${ports.length} ports:`);
for (const p of ports.sort((a, b) => String(a.port_name).localeCompare(String(b.port_name)))) {
  const key = `${p.port_name}|${p.crossing_name}`;
  console.log(flag(!KNOWN_CBP.has(key), `port_name="${p.port_name}"  crossing_name="${p.crossing_name}"`));
}

const csv = await get(CBSA_URL);
const offices = csv.split(/\r?\n/).slice(1).filter((l) => l.trim())
  .map((l) => l.split(';;')[0].trim()).filter(Boolean);
console.log(`\nCBSA (US→Canada) — ${offices.length} offices:`);
for (const office of offices.sort()) {
  console.log(flag(!KNOWN_CBSA.has(office), `office="${office}"`));
}

console.log('\nAny ★ line is Gordie Howe appearing in the feed — copy its exact');
console.log('strings into the UPDATE in GORDIE-HOWE-ACTIVATION.md.');
