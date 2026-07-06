// CBP Border Wait Times — Canada → US direction.
// XML feed covering every northern-border port; we keep only the crossings
// listed in our `crossings` table.

import { XMLParser } from 'fast-xml-parser';
import { zonedToUtcIso } from './time.js';

export const FEED_URL = 'https://bwt.cbp.gov/xml/bwt.xml';

// How the CBP XML lane blocks map onto our (lane_category, lane_type) pairs.
const LANE_BLOCKS = [
  ['commercial_vehicle_lanes', 'commercial', [
    ['standard_lanes', 'standard'],
    ['FAST_lanes', 'fast'],
  ]],
  ['passenger_vehicle_lanes', 'passenger', [
    ['standard_lanes', 'standard'],
    ['NEXUS_SENTRI_lanes', 'nexus'],
    ['ready_lanes', 'ready'],
  ]],
  ['pedestrian_lanes', 'pedestrian', [
    ['standard_lanes', 'standard'],
    ['ready_lanes', 'ready'],
  ]],
];

export function parse(xml, crossings) {
  const doc = new XMLParser({ ignoreDeclaration: true }).parse(xml);
  const root = Object.values(doc)[0] ?? {};
  const ports = [].concat(root.port ?? []);

  const readings = [];
  for (const crossing of crossings) {
    if (!crossing.cbp_crossing_name) continue;
    const port = ports.find(
      (p) =>
        str(p.port_name) === crossing.cbp_port_name &&
        str(p.crossing_name) === crossing.cbp_crossing_name
    );
    if (!port) continue;

    for (const [blockKey, laneCategory, lanes] of LANE_BLOCKS) {
      const block = port[blockKey];
      if (!block) continue;
      for (const [laneKey, laneType] of lanes) {
        const lane = block[laneKey];
        if (!lane) continue;
        const status = str(lane.operational_status);
        // 'N/A' means the lane type doesn't exist at this crossing — not a reading.
        if (!status || status === 'N/A') continue;

        readings.push({
          crossing_id: crossing.id,
          direction: 'to_us',
          lane_category: laneCategory,
          lane_type: laneType,
          wait_minutes: toInt(lane.delay_minutes),
          status_text: status,
          lanes_open: toInt(lane.lanes_open),
          max_lanes: toInt(block.maximum_lanes),
          port_status: str(port.port_status) || null,
          feed_updated_at: updateTimeToUtc(str(port.date), str(lane.update_time)),
        });
      }
    }
  }
  return readings;
}

// CBP splits the timestamp across two fields: <date>7/6/2026</date> on the port
// and update_time "At 6:00 pm EDT" on each lane. Combine them into UTC.
function updateTimeToUtc(dateText, timeText) {
  const d = dateText.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const t = timeText.match(/at\s+(\d{1,2}):(\d{2})\s*(am|pm)\s+([A-Z]{2,4})/i);
  if (!d || !t) return null;
  let hour = Number(t[1]) % 12;
  if (t[3].toLowerCase() === 'pm') hour += 12;
  return zonedToUtcIso(Number(d[3]), Number(d[1]), Number(d[2]), hour, Number(t[2]), t[4].toUpperCase());
}

// The XML parser hands back numbers, strings, or '' depending on the field.
function str(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function toInt(value) {
  const s = str(value);
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
