// US National Weather Service — active alerts for each crossing's US side.
// api.weather.gov, no key, just a User-Agent. High-wind warnings here are
// the trigger for Ambassador Bridge wind restrictions.

import { CORRIDORS } from './corridors.js';

// One feed per unique query point (Ambassador and the tunnel share Detroit's).
export function feedsFor(crossings) {
  const byPoint = new Map();
  for (const c of crossings) {
    const corridor = CORRIDORS[c.slug];
    if (!corridor) continue;
    const key = `${corridor.us_point.lat},${corridor.us_point.lon}`;
    if (!byPoint.has(key)) byPoint.set(key, { point: key, crossingIds: [] });
    byPoint.get(key).crossingIds.push(c.id);
  }
  return [...byPoint.values()].map(({ point, crossingIds }) => ({
    source: 'nws',
    url: `https://api.weather.gov/alerts/active?point=${point}`,
    parse: (body) => parseAlerts(body, crossingIds),
  }));
}

function parseAlerts(body, crossingIds) {
  const doc = JSON.parse(body);
  return (doc.features || []).map((f) => {
    const p = f.properties || {};
    return {
      source: 'nws',
      external_id: String(f.id || p.id),
      side: 'us',
      event_type: 'weather',
      title: p.event || null,             // e.g. "High Wind Warning"
      description: p.headline || null,
      roadway: null,
      direction_of_travel: null,
      lanes_affected: null,
      is_full_closure: 0,
      severity: p.severity || null,
      latitude: null,
      longitude: null,
      starts_at: p.onset || null,
      ends_at: p.ends || p.expires || null,
      reported_at: p.sent || null,
      raw: p,
      crossingIds,
    };
  });
}
