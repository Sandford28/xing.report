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
          note: 'with a-pass or e-zpass: $15.00 usd or less',
          as_of: '2026-03-15', // operator's posted effective date; re-verified unchanged 2026-07-07
          source: 'https://www.ambassadorbridge.com/commercial/commercial-toll-rates/',
        },
        {
          label: 'oversize load', usd: 125.0, cad: 178.0, // both posted in the operator's faq
          note: 'plus per-axle tolls · schedule ahead: (313) 989-0136',
          as_of: '2026-07-07',
          source: 'https://www.ambassadorbridge.com/faqs/',
        },
      ],
    },
    hours: {
      text: 'open 24 hours, every day',
      as_of: '2026-07-07',
      source: 'https://www.ambassadorbridge.com/faqs/', // "the bridge never closes, we are open 24/7, 365 days a year"
    },
    // `text`/`status` is the bold one-line answer; `detail` lines stay short —
    // this panel is read at arm's length, so no sentences, no parentheticals
    // that matter. phone renders as a big tap-to-call button.
    limits: {
      text: 'oversize loads by appointment',
      detail: ['up to 14\' high · 80\' long · 144,000 lbs'],
      phone: '+13139890136',
      phone_label: 'call (313) 989-0136 to schedule',
      as_of: '2026-07-07',
      source: 'https://www.ambassadorbridge.com/faqs/',
    },
    // verified against the operator's posted crossing guide ("updated october
    // 2024") and its class 3 & 8 escort procedure page, both checked this date.
    // the decades-old class 3/8 ban ended 10-29-2024: those classes now cross
    // with a bridge escort, scheduled at least 24 hours ahead.
    hazmat: {
      status: 'most classes allowed',
      detail: [
        'never: explosives (class 1) · infectious (6.2) · radioactive (7)',
        'class 3 & 8: bridge escort — book at least 24 hr ahead',
      ],
      phone: '+13139890136',
      phone_label: 'call (313) 989-0136 — escort desk',
      last_verified: '2026-07-07',
      source: 'https://www.ambassadorbridge.com/hazardous-materials/',
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
  'detroit-windsor-tunnel': {
    tolls: {
      rows: [
        {
          label: 'car, to windsor', usd: 9.0, cad: null, // operator posts usd on the detroit side
          as_of: '2026-07-07',
          source: 'https://www.dwtunnel.com/toll-rates/',
        },
        {
          label: 'car, to detroit', usd: null, cad: 8.25, // operator posts cad on the windsor side
          as_of: '2026-07-07',
          source: 'https://www.dwtunnel.com/toll-rates/',
        },
      ],
    },
    // the tunnel is not "cars only": trucks under its size limits are allowed.
    limits: {
      text: 'max height 12\'8" · max width 8\'6"',
      detail: ['no motorcycles, scooters, bicycles, or pedestrians'],
      as_of: '2026-07-07',
      source: 'https://www.dwtunnel.com/faqs/',
    },
    hours: {
      text: 'open 24 hours, every day',
      as_of: '2026-07-07',
      source: 'https://www.dwtunnel.com/faqs/', // "open 24 hours a day, 7 days a week" barring special events/maintenance
    },
    hazmat: {
      status: 'prohibited',
      detail: ['no vehicles displaying hazardous material placards'],
      last_verified: '2026-07-07', // operator's posted faq, checked this date
      source: 'https://www.dwtunnel.com/faqs/',
    },
  },
  'blue-water-bridge': {
    place: 'port huron–sarnia, about 60 miles north of detroit–windsor',
    tolls: {
      rows: [
        {
          label: 'car, to sarnia', usd: null, cad: 7.0, // fbcl posts cad only
          note: 'with connexion pre-paid: $4.50 cad',
          as_of: '2026-07-07',
          source: 'https://bluewaterbridge.ca/toll-rates/',
        },
        {
          label: 'car, to port huron', usd: 5.0, cad: null, // mdot posts usd only
          note: 'edge pass account: $0.50 off',
          as_of: '2026-07-07',
          source: 'https://www.michigan.gov/mdot/programs/bridges-and-structures/blue-water-bridge/toll-rates',
        },
        {
          label: 'truck per axle, to sarnia', usd: null, cad: 7.0,
          note: 'with connexion pre-paid: $5.00 cad',
          as_of: '2026-07-07',
          source: 'https://bluewaterbridge.ca/toll-rates/',
        },
        {
          label: 'truck per axle, to port huron', usd: 5.25, cad: null,
          as_of: '2026-07-07',
          source: 'https://www.michigan.gov/mdot/programs/bridges-and-structures/blue-water-bridge/toll-rates',
        },
      ],
    },
    hours: {
      text: 'open 24 hours, every day',
      as_of: '2026-07-07',
      source: 'https://www.cbp.gov/about/contact/ports/port-huron-michigan-3802', // cbp lists the crossing as 24h, seven days
    },
    hazmat: { status: null, last_verified: null, source: null }, // NOT VERIFIED — do not guess
  },
};
