// Environment and Climate Change Canada — weather alerts for each crossing's
// Canadian side, via the coordinate-based Atom feeds
// (weather.gc.ca/rss/alerts/{lat}_{lon}_e.xml).

import { XMLParser } from 'fast-xml-parser';
import { CORRIDORS } from './corridors.js';

// One feed per unique query point (Ambassador and the tunnel share Windsor's).
export function feedsFor(crossings) {
  const byPoint = new Map();
  for (const c of crossings) {
    const corridor = CORRIDORS[c.slug];
    if (!corridor) continue;
    const key = `${corridor.ca_point.lat}_${corridor.ca_point.lon}`;
    if (!byPoint.has(key)) byPoint.set(key, { point: key, crossingIds: [] });
    byPoint.get(key).crossingIds.push(c.id);
  }
  return [...byPoint.values()].map(({ point, crossingIds }) => ({
    source: 'eccc',
    url: `https://weather.gc.ca/rss/alerts/${point}_e.xml`,
    parse: (body) => parseAtom(body, crossingIds),
  }));
}

function parseAtom(xml, crossingIds) {
  const doc = new XMLParser({ ignoreDeclaration: true }).parse(xml);
  const feed = doc.feed || {};
  const entries = [].concat(feed.entry ?? []);
  const items = [];
  for (const e of entries) {
    const title = String(e.title ?? '').trim();
    // the quiet state is itself an entry — not an alert
    if (!title || /^no watches or warnings in effect/i.test(title)) continue;
    items.push({
      source: 'eccc',
      external_id: String(e.id || title),
      side: 'ca',
      event_type: 'weather',
      title: title.toLowerCase(),
      description: typeof e.summary === 'object' ? String(e.summary['#text'] ?? '') : String(e.summary ?? '') || null,
      roadway: null,
      direction_of_travel: null,
      lanes_affected: null,
      is_full_closure: 0,
      severity: null,
      latitude: null,
      longitude: null,
      starts_at: null,
      ends_at: null,
      reported_at: e.updated || e.published || null,
      raw: e,
      crossingIds,
    });
  }
  return items;
}
