# xing.report — design spec v1.1

Live border-crossing utility, Detroit–Windsor corridor.
One question: **which bridge do I take right now?**
Audience: truck drivers and dispatchers, phone in a cab, sunlight, seconds.
Design language: Otl Aicher / Ulm / Munich 1972 wayfinding. Signage, not a website.

Date: 06 jul 2026

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

---

## 2 · Type

- **Family:** `"Helvetica Neue", Helvetica, Arial, sans-serif`
- **Weights:** 400 and 700. No others. No italics, ever.
- **Case:** everything lowercase.

| role | size / line | weight | notes |
|---|---|---|---|
| wait numeral | 96 / 91 | 700 | `font-variant-numeric: tabular-nums`, tracking −0.02em, `white-space: nowrap` |
| nexus numeral | 40 / 40 | 700 | tabular-nums |
| bridge name | 28 / 32 | 700 | |
| status word | 20 | 700 on fill · 400 unfilled (moving) | lowercase, inside signal field |
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

- **Status thresholds** (by truck wait): < 20 min = moving · 20–59 = slow · ≥ 60 = backed up.
- **Trend:** every lane always shows exactly one word next to its wait — ▲ climbing · ▼ easing · — steady — based on the last 15–30 min. Never a number, never blank. Climbing is ink-dark 700; easing and steady recede.
- **Hierarchy:** nothing on a card renders larger than the wait numeral.
- **Freshness:** "updated n min ago" is mandatory on every live view; stale > 10 min shows a warning strip.
- **Alert strip:** one line per card. With an incident: ink field, paper text, 700. Without: "no incidents" unfilled in receded color, 400.
- **Direction toggle:** two cells, det → win / win → det; active cell is inverted (ink fill, paper text). One toggle drives all cards.
- **Night mode:** same geometry, swapped palette per §1.

---

## 6 · Chart style ("corridor by the numbers")

- Bars in ink only — signal colors never fill data.
- One reference line (1px hairline) with a right-aligned tabular label.
- Baseline is a 2px ink rule.
- Axis labels 13px lowercase, single-letter months.
- Bar gap 8px (1u). No gridlines beyond the single reference line.
- One callout row max (e.g. "peak · april 2026 — 251k"), 15px, value 700 tabular.

---

## 7 · Forbidden

Gradients, drop shadows, glassmorphism, rounded corners, emoji, stock illustration, hero images, decorative anything. If it looks like a template or a startup landing page, it is wrong.
