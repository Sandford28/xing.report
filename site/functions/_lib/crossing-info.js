// Hand-maintained facts: tolls, hours, size limits, hazmat.
// This file is edited by a human, verified against the operator/agency
// listed in `source`, and never scraped. Every block carries the date it
// was last checked (as_of / last_verified) — the page always shows it.
//
// Every toll row carries `veh: 'car' | 'truck'` — the site shows only the fares
// (and, for trucks, the size limits + hazmat rules) that apply to the vehicle
// the visitor has selected. Oversize/over-height fares are truck fares.
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
          veh: 'car', label: 'car', usd: 10.0, cad: 14.0, // both posted by the operator
          as_of: '2026-04-19',
          source: 'https://www.ambassadorbridge.com/auto-toll-rates/',
        },
        {
          veh: 'truck', label: 'truck, per axle', usd: 20.0, cad: null, // operator posts USD only
          note: 'with a-pass or e-zpass: $15.00 usd or less',
          as_of: '2026-03-15', // operator's posted effective date; re-verified unchanged 2026-07-07
          source: 'https://www.ambassadorbridge.com/commercial/commercial-toll-rates/',
        },
        {
          veh: 'truck', label: 'oversize load', usd: 125.0, cad: 178.0, // both posted in the operator's faq
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
  // opened to traffic 2026-07-27. the operator (wdba) posts every rate in both
  // currencies, so no row here is a calculated estimate.
  'gordie-howe-bridge': {
    tolls: {
      rows: [
        {
          veh: 'car', label: 'car', usd: 5.75, cad: 8.0,
          note: 'breakaway account: $4.35 usd / $6.00 cad',
          as_of: '2026-07-27',
          source: 'https://gordiehoweinternationalbridge.com/toll/toll-rates/',
        },
        {
          veh: 'truck', label: 'truck, per axle', usd: 8.6, cad: 12.0,
          note: 'breakaway account: $6.90 usd / $9.60 cad',
          as_of: '2026-07-27',
          source: 'https://gordiehoweinternationalbridge.com/toll/toll-rates/',
        },
        {
          veh: 'truck', label: 'hazmat or oversize, per axle', usd: 8.75, cad: 12.0,
          note: 'special-handling fees may be added',
          as_of: '2026-07-27',
          source: 'https://gordiehoweinternationalbridge.com/toll/toll-rates/',
        },
      ],
    },
    hours: {
      text: 'open 24 hours, every day',
      as_of: '2026-07-27',
      source: 'https://bwt.cbp.gov/', // cbp lists the port's hours as "24 hrs/day"
    },
    limits: {
      text: 'oversize loads by permit',
      detail: [
        'up to 17\'3" high · 11\'8" wide · 99\' long · 153,000 lbs',
        'no oversize travel 7–9 am or 3–6 pm',
        'permit from mto (ontario) or mdot (michigan)',
      ],
      phone: '+18002043616',
      phone_label: 'call 1-800-204-3616 — 24 hr notice required',
      as_of: '2026-07-27',
      source: 'https://gordiehoweinternationalbridge.com/toll/specialized-loads/',
    },
    // verified against wdba's own specialized-loads page on opening day: the
    // bridge takes all nine classes with no permit and no advance notification.
    // this is the operational difference from the ambassador, which bans
    // classes 1, 6.2 and 7 outright and escorts 3 and 8.
    hazmat: {
      status: 'all nine classes allowed',
      detail: [
        'no permit and no advance notice required',
        'oversize hazmat still needs an mto/mdot permit',
      ],
      last_verified: '2026-07-27',
      source: 'https://gordiehoweinternationalbridge.com/toll/specialized-loads/',
    },
  },
  'detroit-windsor-tunnel': {
    tolls: {
      rows: [
        {
          veh: 'car', label: 'car, to windsor', usd: 9.0, cad: null, // operator posts usd on the detroit side
          as_of: '2026-07-07',
          source: 'https://www.dwtunnel.com/toll-rates/',
        },
        {
          veh: 'car', label: 'car, to detroit', usd: null, cad: 8.25, // operator posts cad on the windsor side
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
    // ordered by destination so the two operators group together: both sarnia
    // rows (FBCL, cad) then both port huron rows (MDOT, usd). the site shows the
    // operator's source link once per group.
    tolls: {
      rows: [
        {
          veh: 'car', label: 'car, to sarnia', usd: null, cad: 7.0, // fbcl posts cad only
          note: 'with connexion pre-paid: $4.50 cad',
          as_of: '2026-07-07',
          source: 'https://bluewaterbridge.ca/toll-rates/',
        },
        {
          veh: 'truck', label: 'truck per axle, to sarnia', usd: null, cad: 7.0,
          note: 'with connexion pre-paid: $5.00 cad',
          as_of: '2026-07-07',
          source: 'https://bluewaterbridge.ca/toll-rates/',
        },
        {
          veh: 'car', label: 'car, to port huron', usd: 5.0, cad: null, // mdot posts usd only
          note: 'edge pass account: $0.50 off',
          as_of: '2026-07-07',
          source: 'https://www.michigan.gov/mdot/programs/bridges-and-structures/blue-water-bridge/toll-rates',
        },
        {
          veh: 'truck', label: 'truck per axle, to port huron', usd: 5.25, cad: null,
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
