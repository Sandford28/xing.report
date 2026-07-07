// MDOT Mi Drive — US-side live incidents (crashes, blockages, closures).
// This is the JSON endpoint the Mi Drive site itself uses. It is public but
// undocumented, so it may change without notice — if it does, the collector
// records failed fetches and the site says incident data is unavailable,
// never a blank or a stale claim.

import { matchCrossings } from './corridors.js';

export const FEEDS = [
  { source: 'mdot_incident', url: 'https://mdotjboss.state.mi.us/MiDrive/incidents/AllForPage', parse: parseIncidents },
];

function parseIncidents(body, crossings) {
  const incidents = JSON.parse(body);
  const items = [];
  for (const inc of incidents) {
    const crossingIds = matchCrossings(crossings, 'us', inc.latitude, inc.longitude);
    if (!crossingIds.length) continue;

    // The useful details are embedded in an HTML blob; pull out the
    // labelled fields it always carries.
    const field = (label) => {
      const m = (inc.incidentText || '').match(new RegExp(`${label}:\\s*</strong>([^<]*)`, 'i'));
      return m ? m[1].trim() : null;
    };

    items.push({
      source: 'mdot_incident',
      external_id: String(inc.incidentId),
      side: 'us',
      // titles look like "Crash on EB I-75" or "Cleared Crash on EB I-75"
      event_type: /^cleared/i.test(inc.incidentTitle || '') ? 'incident_cleared' : 'incident',
      title: (inc.incidentTitle || '').trim() || null,
      description: field('Event Message') || field('Location'),
      roadway: field('Location'),
      direction_of_travel: null,
      lanes_affected: field('Lanes Blocked'),
      is_full_closure: 0,
      severity: null,
      latitude: inc.latitude ?? null,
      longitude: inc.longitude ?? null,
      starts_at: null,
      ends_at: null,
      // the feed only gives a clock time with no date, so we don't guess:
      // first_seen_at (set by the collector) is accurate to 5 minutes.
      reported_at: null,
      raw: inc,
      crossingIds,
    });
  }
  return items;
}
