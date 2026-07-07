# xing.report — design spec v1.2

Live border-crossing utility, Detroit–Windsor corridor.
One question: **which crossing do I take right now?**
Audience: everyday travelers plus truck drivers and dispatchers — phone in a car or cab, sunlight, seconds.
Design language: Otl Aicher / Ulm / Munich 1972 wayfinding. Signage, not a website. Warmth comes from copy, never decoration.

Date: 07 jul 2026 · v1.2 adds: three crossings, "fastest right now" summary, traveler-first hierarchy, friendly copy register, best-time-to-cross chart.
v1.3 adds (approved on preview, jul 2026): the one-glance layout — verdict line, truck/car toggle, comparison board, folded rows — plus the sources footer and national-flag pictograms, the single sanctioned color exception.

---

## 1 · Color

### Base — day (default)

| token | hex | use |
|---|---|---|
| paper | `#F2F1ED` | page + card background |
| ink | `#141414` | text, structural rules, bars |
| hairline | `#C9C7C2` | 1px dividers |
| muted | `#6B6963` | labels, meta text |
| receded | `#A5A29B` | easing/steady trend, "no incidents" |

### Base — night (full inversion, not a dimming)

| token | hex | use |
|---|---|---|
| bg | `#121212` | page + card background |
| text | `#EDEBE6` | text, structural rules |
| hairline | `#3A3A38` | 1px dividers |
| muted | `#99968F` | labels, meta text |
| receded | `#6E6C66` | easing/steady trend, "no incidents" |

### Signal (traffic semantics, HMI-calibrated)

| state | day | night | rendering |
|---|---|---|---|
| moving | text `#008A43` | text `#3FD37F` | **no fill** — quiet green word, weight 400 |
| slow | fill `#F5A300`, text `#141414` | fill `#FFAF1F`, text `#121212` | filled field, weight 700 |
| backed up | fill `#E8291C`, text `#FFFFFF` | fill `#FF6047`, text `#121212` | filled field, weight 700 |

Rules:
- Calm is quiet. "moving" and "no incidents" render unfilled and muted so the screen is near-silent when all is well. Filled color fields are reserved for abnormal states — amber and red jump by contrast because they are rare.
- Color never carries meaning alone. Every signal field contains its status word.

### Accent

| | day | night |
|---|---|---|
| brand accent | `#0E71B8` | `#4BA3DC` |

Appears once per screen, in the wordmark (`.report`). Never in UI states, never on data.

### National flags — the one sanctioned exception (Mark, jul 2026)

The US and Canada flags render as small pictograms in their **real colors** — the only break from "color means status only." Nothing else on the page may use color for identity or decoration.

| flag | colors |
|---|---|
| us | stripes `#B22234` · canton `#3C3B6E` · white field |
| canada | bars + maple leaf `#D52B1E` · white field |

Rules: 22×14 viewBox, white field, 1px ink hairline border so they sit crisply on paper in both light and dark mode. Defined once in SVG `<defs>` (`#flag-us` / `#flag-ca`). They appear in exactly two places: the sources footer (one per agency row) and after the destination in the verdict line.

---

## 2 · Type

- **Family:** `"Helvetica Neue", Helvetica, Arial, sans-serif`
- **Weights:** 400 and 700. No others. No italics, ever.
- **Case:** everything lowercase.

| role | size / line | weight | notes |
|---|---|---|---|
| wait numeral (trucker view) | 96 / 91 | 700 | `font-variant-numeric: tabular-nums`, tracking −0.02em, `white-space: nowrap` |
| wait numeral (3-crossing view) | 72 / 68 | 700 | same rules; smaller so three cards fit one scroll |
| nexus numeral | 40 / 40 | 700 | tabular-nums |
| crossing name | 28 / 32 (single card) · 22 / 26 (3-crossing list) | 700 | |
| summary strip | label 13 · name + numeral 28 / 32, 700 | | "fastest right now" |
| status word | 20 (single card) · 16 (3-crossing list) | 700 on fill · 400 unfilled (moving) | lowercase, inside signal field |
| trend line | 15 / 16 | 700 climbing · 400 easing/steady | one word only: ▲ climbing · ▼ easing · — steady |
| meta / body | 15 / 20 | 400 | tolls, direction, source line |
| label | 13 / 16 | 400 | tracking +0.08em, lowercase (truck / car / nexus) |
| unit suffix (" min") | 16 | 400 | muted color |

---

## 3 · Grid + spacing

- **Base unit:** 8px. Every dimension is a multiple.
- **Mobile margin:** 16px (2u) · content 358px on a 390px viewport.
- **Card padding:** 24px (3u) · internal gaps 16px (2u).
- **Rules:** structural borders 2px ink · dividers 1px hairline.
- **Tap targets:** ≥ 56px (7u) — glove-sized. Direction toggle cells are 56px tall.
- **Radius / shadow:** 0 / none. Hard edges only.
- **Pictograms:** 48×30 viewBox, 2.5 stroke, no fill, `stroke="currentColor"`. Truck = box + cab + two wheels. Car = single cab silhouette + two wheels. Nexus = diamond outline.

---

## 4 · Wordmark

- ✕ mark (two crossed 7px bars at ±45°) + `xing` (700, ink) + `.report` (400, accent).
- Mark and text sit on a solid plate (paper, ink, or accent) — never floated over imagery.
- On accent plate: all-white text, `.report` at 72% opacity.

---

## 5 · Behavior rules

- **Status thresholds** — trucker view (by truck wait): < 20 min = moving · 20–59 = slow · ≥ 60 = backed up. Traveler view (by car wait): < 15 = moving · 15–44 = slow · ≥ 45 = backed up.
- **The verdict:** one line above everything, 28px 700, that names the winner for the chosen direction and vehicle — "take the tunnel to windsor — 5 min vs 12 min for cars" — with the destination wearing its country's flag. It answers the whole question for people who won't read further. Recomputes with both toggles. Never crowned on a closed lane or data older than 10 min.
- **Comparison board:** one bordered signboard under the toggles — ambassador and tunnel, fastest first, a "fastest" tag on a strict winner only (no tag on a tie). 72px numerals. Blue water (a 60-mile diversion) and gordie howe (not open yet) fold to single tap-to-expand rows below the detail cards; an active incident shows through the fold.
- **Crossings:** ambassador, detroit–windsor tunnel, blue water bridge. The tunnel is a passenger crossing first — the car wait leads its card — but it does take small trucks (under 12′8″ tall, operator faq); wherever a trucker might act on a tunnel number, the caveat "small trucks only — under 12′8″ tall" appears with it.
- **Hierarchy (traveler view):** car wait is the hero numeral; truck + nexus waits move to a 15px sub-line.
- **Trend:** every lane always shows exactly one word next to its wait — ▲ climbing · ▼ easing · — steady — based on the last 15–30 min. Never a number, never blank. Climbing is ink-dark 700; easing and steady recede.
- **Hierarchy:** nothing on a card renders larger than the wait numeral.
- **Freshness:** "updated n min ago" is mandatory on every live view; stale > 10 min shows a warning strip.
- **Alert strip:** one line per card. With an incident: ink field, paper text, 700. Without: "no incidents" unfilled in receded color, 400.
- **Toggles:** two side-by-side — direction ("det → win" / "win → det") and vehicle ("truck" / "car"). Cells 56px tall; active cell is inverted (ink fill, paper text). Together they drive the verdict, the board, and every card; both choices persist across reloads. The chosen vehicle leads every card, so the eye finds the same thing in the same place.
- **Copy register (traveler warmth):** "checked 2 min ago" over "updated", "min by car" over bare units, "safe travels · data from cbsa + cbp lane sensors" as the footer. Warmth is words only — geometry, color, and edges never soften.
- **Night mode:** same geometry, swapped palette per §1.

---

## 6 · Chart styles

Shared rules — bars in ink only (signal colors never fill data), one reference line (1px hairline, right-aligned tabular label), baseline 2px ink rule, axis labels 13px lowercase, no gridlines beyond the reference line.

**"corridor by the numbers"** (monthly volume): 12 bars, gap 8px (1u), single-letter months. One callout row max (e.g. "peak · april 2026 — 251k"), 15px, value 700 tabular.

**"best time to cross"** (hourly wait): 24 bars, gap 4px, sparse hour ticks (12a · 6a · 12p · 6p · 11p). Two callout rows: quietest window in quiet-green text (`#008A43` day / `#3FD37F` night, 400) and busiest window in ink 700 — color always paired with words.

---

## 7 · Forbidden

Gradients, drop shadows, glassmorphism, rounded corners, emoji, stock illustration, hero images, decorative anything. If it looks like a template or a startup landing page, it is wrong.
