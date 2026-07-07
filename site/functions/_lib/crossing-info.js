// Hand-maintained facts: tolls, hazmat, Gordie Howe status.
// This file is edited by a human, verified against the operator/agency
// listed in `source`, and never scraped. Every block carries the date it
// was last checked (as_of / last_verified) — the page always shows it.
//
// PRICING RULE: show the operator's real posted prices wherever they exist
// (fill both usd and cad when the operator posts both); only calculate a
// currency when the operator doesn't give one (leave it null), and the page
// will mark the calculated figure as an estimate. Each row carries its own
// as_of date because operators change rate classes on different days.
//
// HAZMAT IS SAFETY INFORMATION. Rules per crossing differ and have been in
// flux. If the current rule is not verified, leave status null — the page
// will say "not yet verified" rather than guess. Never fill these fields
// from memory or a search result; verify against current MDOT / operator
// guidance and record the date.

export const CROSSING_INFO = {
  'ambassador-bridge': {
    tolls: {
      rows: [
        {
          label: 'car', usd: 10.0, cad: 14.0, // both posted by the operator
          as_of: '2026-04-19',
          source: 'https://www.ambassadorbridge.com/auto-toll-rates/',
        },
        {
          label: 'truck, per axle', usd: 20.0, cad: null, // operator posts USD only
          note: 'with a-pass or e-zpass: $15.00 usd',
          as_of: '2026-03-15',
          source: 'https://www.ambassadorbridge.com/commercial/commercial-toll-rates/',
        },
      ],
    },
    hazmat: {
      status: null,          // NOT VERIFIED — do not guess (see header note)
      last_verified: null,
      source: 'https://www.michigan.gov/mdot/projects-studies/studies/additional-studies/hazardous-materials-routing',
    },
  },
  'gordie-howe-bridge': {
    status: {
      headline: 'not open yet',
      note: 'construction is complete. a june 12, 2026 opening ceremony was called off and no new date has been announced.',
      as_of: '2026-07-06',
      source: 'https://gordiehoweinternationalbridge.com/news-releases/',
    },
    tolls: null,             // to be posted by the operator at opening
    hazmat: {
      status: null,          // NOT VERIFIED — do not guess (see header note)
      last_verified: null,
      source: 'https://gordiehoweinternationalbridge.com',
    },
  },
  'detroit-windsor-tunnel': { tolls: null, hazmat: { status: null, last_verified: null, source: null } },
  'blue-water-bridge': { tolls: null, hazmat: { status: null, last_verified: null, source: null } },
};
