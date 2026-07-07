// Approach corridors, keyed by crossing slug (matching the crossings table).
// ca_box / us_box: bounding boxes for the approach roads on each side —
// road events inside the box get linked to the crossing.
// ca_point / us_point: where the weather feeds are asked about that side.
// Adding a crossing = adding an entry here plus a row in `crossings`.

export const CORRIDORS = {
  'ambassador-bridge': {
    // Huron Church Rd + the western end of Hwy 401 / Hwy 3
    ca_box: { latMin: 42.22, latMax: 42.33, lonMin: -83.12, lonMax: -82.93 },
    // I-75 / I-96 through southwest Detroit
    us_box: { latMin: 42.25, latMax: 42.4, lonMin: -83.2, lonMax: -82.98 },
    ca_point: { lat: 42.293, lon: -83.051 },   // windsor
    us_point: { lat: 42.3314, lon: -83.0458 }, // detroit
    on511_region: 'windsor',
  },
  'detroit-windsor-tunnel': {
    // both downtown cores
    ca_box: { latMin: 42.29, latMax: 42.33, lonMin: -83.06, lonMax: -82.98 },
    us_box: { latMin: 42.31, latMax: 42.36, lonMin: -83.1, lonMax: -82.99 },
    ca_point: { lat: 42.293, lon: -83.051 },   // windsor (shared with ambassador)
    us_point: { lat: 42.3314, lon: -83.0458 }, // detroit (shared with ambassador)
    on511_region: 'windsor',
  },
  'blue-water-bridge': {
    // Hwy 402 through Point Edward / Sarnia
    ca_box: { latMin: 42.93, latMax: 43.02, lonMin: -82.47, lonMax: -82.3 },
    // I-69 / I-94 through Port Huron
    us_box: { latMin: 42.9, latMax: 43.05, lonMin: -82.55, lonMax: -82.38 },
    ca_point: { lat: 42.999, lon: -82.309 },   // sarnia
    us_point: { lat: 42.9709, lon: -82.4249 }, // port huron
    on511_region: 'sarnia',
  },
};

export function inBox(box, lat, lon) {
  return (
    typeof lat === 'number' && typeof lon === 'number' &&
    lat >= box.latMin && lat <= box.latMax &&
    lon >= box.lonMin && lon <= box.lonMax
  );
}

// crossings: rows from the crossings table. Returns ids whose box on the
// given side contains the point.
export function matchCrossings(crossings, side, lat, lon) {
  return crossings
    .filter((c) => {
      const corridor = CORRIDORS[c.slug];
      if (!corridor) return false;
      return inBox(side === 'ca' ? corridor.ca_box : corridor.us_box, lat, lon);
    })
    .map((c) => c.id);
}
