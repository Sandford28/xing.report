// Ontario 511 — Canadian-side road events, road conditions, and notices.
// Open public API, no key. Provincewide feeds; we keep what falls inside
// our corridors.

import { CORRIDORS, matchCrossings } from './corridors.js';
import { epochToIso } from './time.js';

export const FEEDS = [
  { source: 'on511_event', url: 'https://511on.ca/api/v2/get/event?format=json&lang=en', parse: parseEvents },
  { source: 'on511_roadcondition', url: 'https://511on.ca/api/v2/get/roadconditions?format=json&lang=en', parse: parseRoadConditions },
  { source: 'on511_alert', url: 'https://511on.ca/api/v2/get/alerts?format=json&lang=en', parse: parseAlerts },
];

function parseEvents(body, crossings) {
  const events = JSON.parse(body);
  const items = [];
  for (const e of events) {
    const crossingIds = matchCrossings(crossings, 'ca', e.Latitude, e.Longitude);
    if (!crossingIds.length) continue;
    items.push({
      source: 'on511_event',
      external_id: String(e.ID),
      side: 'ca',
      event_type: (e.EventType || 'event').toLowerCase(),
      title: [e.RoadwayName, e.DirectionOfTravel].filter(Boolean).join(' '),
      description: e.Description || null,
      roadway: e.RoadwayName || null,
      direction_of_travel: e.DirectionOfTravel || null,
      lanes_affected: e.LanesAffected || null,
      is_full_closure: e.IsFullClosure ? 1 : 0,
      severity: e.Severity || null,
      latitude: e.Latitude ?? null,
      longitude: e.Longitude ?? null,
      starts_at: epochToIso(e.StartDate),
      ends_at: epochToIso(e.PlannedEndDate),
      reported_at: epochToIso(e.LastUpdated),
      raw: e,
      crossingIds,
    });
  }
  return items;
}

// A winter product — in summer everything reads "No Report". We archive a
// segment only when it reports something adverse, so quiet seasons don't
// write meaningless rows.
const UNREMARKABLE = new Set(['no report', 'bare and dry', 'bare and wet']);

function parseRoadConditions(body, crossings) {
  const segments = JSON.parse(body);
  const items = [];
  for (const s of segments) {
    const text = `${s.Region || ''} ${s.LocationDescription || ''}`.toLowerCase();
    const matched = crossings.filter((c) => {
      const corridor = CORRIDORS[c.slug];
      return corridor && text.includes(corridor.on511_region);
    });
    if (!matched.length) continue;

    const conditions = (s.Condition || []).map((c) => String(c).toLowerCase());
    const adverse =
      conditions.some((c) => !UNREMARKABLE.has(c)) ||
      (s.Visibility && s.Visibility !== 'Good') ||
      (s.Drifting && s.Drifting !== 'No');
    if (!adverse) continue;

    items.push({
      source: 'on511_roadcondition',
      external_id: `${s.RoadwayName}|${s.LocationDescription}`,
      side: 'ca',
      event_type: 'road_condition',
      title: `${s.RoadwayName || 'road'}: ${(s.Condition || []).join(', ').toLowerCase()}`,
      description: [s.LocationDescription, `visibility ${s.Visibility}`, s.Drifting === 'Yes' ? 'drifting snow' : null]
        .filter(Boolean).join(' · '),
      roadway: s.RoadwayName || null,
      direction_of_travel: null,
      lanes_affected: null,
      is_full_closure: 0,
      severity: null,
      latitude: null,
      longitude: null,
      starts_at: null,
      ends_at: null,
      reported_at: epochToIso(s.LastUpdated),
      raw: s,
      crossingIds: matched.map((c) => c.id),
    });
  }
  return items;
}

// Provincewide notices, tagged by region only. Windsor and Sarnia are both
// 'Southwestern', so those notices attach to every active crossing.
function parseAlerts(body, crossings) {
  const alerts = JSON.parse(body);
  const items = [];
  for (const a of alerts) {
    if (!(a.Regions || []).includes('Southwestern')) continue;
    items.push({
      source: 'on511_alert',
      external_id: String(a.Id),
      side: 'ca',
      event_type: 'notice',
      title: a.Message || null,
      description: a.Notes || null,
      roadway: null,
      direction_of_travel: null,
      lanes_affected: null,
      is_full_closure: 0,
      severity: a.HighImportance ? 'high' : null,
      latitude: null,
      longitude: null,
      starts_at: epochToIso(a.StartTime),
      ends_at: epochToIso(a.EndTime),
      reported_at: epochToIso(a.LastUpdated),
      raw: a,
      crossingIds: crossings.map((c) => c.id),
    });
  }
  return items;
}
