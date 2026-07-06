// CBSA Border Wait Times — US → Canada direction.
// CSV feed, one row per border office. Quirk: fields are separated by
// DOUBLE semicolons (";;"), not commas.

import { zonedToUtcIso } from './time.js';

export const FEED_URL = 'https://www.cbsa-asfc.gc.ca/bwt-taf/bwt-eng.csv';

export function parse(csv, crossings) {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== '');
  const readings = [];

  for (const line of lines.slice(1)) { // slice(1) skips the header row
    const fields = line.split(';;').map((f) => f.trim());
    // Columns: office, location, last updated,
    //          commercial Canada-bound, commercial US-bound,
    //          travellers Canada-bound, travellers US-bound
    const [office, , updated, commercialToCanada, , travellersToCanada] = fields;

    const crossing = crossings.find((c) => c.cbsa_office_name === office);
    if (!crossing) continue;

    const feedUpdatedAt = updatedToUtc(updated);
    for (const [laneCategory, text] of [
      ['commercial', commercialToCanada],
      ['passenger', travellersToCanada],
    ]) {
      const wait = parseWait(text);
      if (!wait) continue; // lane doesn't apply at this crossing
      readings.push({
        crossing_id: crossing.id,
        direction: 'to_canada',
        lane_category: laneCategory,
        lane_type: 'standard', // CBSA doesn't break out NEXUS/FAST lanes
        wait_minutes: wait.minutes,
        status_text: wait.status,
        lanes_open: null,
        max_lanes: null,
        port_status: null,
        feed_updated_at: feedUpdatedAt,
      });
    }
  }
  return readings;
}

// CBSA reports waits as words: "No Delay", "5 minutes", "Not Applicable".
// Returns null (skip) when the lane doesn't apply; otherwise minutes + the
// original wording. Unrecognised wording is kept with minutes=null so the
// archive never silently drops a status we didn't anticipate.
function parseWait(text) {
  if (!text || text === '--' || text === 'Not Applicable') return null;
  if (/^no delay$/i.test(text)) return { minutes: 0, status: text };
  const m = text.match(/^(\d+)\s*minutes?$/i);
  if (m) return { minutes: Number(m[1]), status: text };
  return { minutes: null, status: text };
}

// "2026-07-06 16:36 EDT" → UTC ISO.
function updatedToUtc(text) {
  const m = (text || '').match(/^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2}) ([A-Z]{2,4})$/);
  if (!m) return null;
  return zonedToUtcIso(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5]), m[6]);
}
