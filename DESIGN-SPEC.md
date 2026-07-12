# xing.report — design spec v2.2

Live border-crossing utility, Detroit–Windsor corridor.
One question: **which crossing do I take right now?**
Audience: everyday travelers plus truck drivers and dispatchers — phone in a car or cab, sunlight, seconds.
Design language: **high-vis industrial** — Otl Aicher / Ulm wayfinding bones, sharpened by control-room HMI thinking and freight-yard signage. Blueprint-when-calm: a moving lane is stark ink on paper; color arrives only when something needs attention. Warmth comes from copy, never decoration.

Date: 07 jul 2026 · **v2.0** is the "high-vis industrial" design system, imported from Claude Design (project `03994fb7…`, file `xing.report.dc.html`, board "turn 7") and approved on preview. It is a whole-system visual overhaul applied over the full v1.x site with no features dropped.

Changelog:
- v1.2 — three crossings, "fastest right now" summary, traveler-first hierarchy, best-time-to-cross chart.
- v1.3 — one-glance layout: verdict line, truck/car toggle, comparison board, folded rows, sources footer, national-flag pictograms.
- v1.4 — copy warmed for everyday crossers; per-vehicle status thresholds.
- v1.5 — hourly "best time to cross" charts with a ≥7-day honesty gate (§6).
- v1.6 — approach cameras, one curated still per crossing behind a tap (§5, §7).
- **v2.0 — high-vis industrial system.** New palette (whiter paper, blacker ink, cobalt, one acid-volt highlight); 4px ink grid; 112px/900 hero numeral; three weights (400/700/900); the verdict becomes the acid-volt **fastest box**; the separate comparison board is retired — the detail cards *are* the comparison, ordered fastest-first; alerts render UPPERCASE on the grid; a global "checked n min ago" sits in the header while each card carries the border's own "reported {clock}"; night mode is a strict 1:1 inversion. Everything from v1.x (toggles, charts, cameras, folds, tolls, signup, sources, all honesty logic) is retained under the new skin.
- **v2.1 — the mark (§8).** Adopted the CI manual's jeweled-junction ✕ (concept b): the plain crossed-bars mark gains a volt jewel set in the joint. Replaces the header mark, the SVG favicon, and the 192/512 PWA tiles from one drawing. Imported from Claude Design file `xing.report CI manual.dc.html`.
- **v2.2 — Univers evaluated, then declined (§2).** Built and proved a full Univers implementation (self-hosted subset woff2; text 400/700, hero in Univers Condensed Bold) but **chose not to license the commercial face** — production commits to Helvetica, and the font work was removed from the shipped tree. Decision final 2026-07-11. The mark, toggles, and tolls work below shipped independently.
- **v2.2 — the mark, clearer toggles, decluttered tolls.** Shipped to prod: the jeweled-junction mark (§8) as header/favicon/PWA tiles; the toggle selected-state fix + direction flags (§5); and the tolls-fold declutter with per-operator source links (§5).

---

## 1 · Color

### Base — day (default)

| token | hex | use |
|---|---|---|
| paper | `#F4F4F0` | page + card background |
| ink | `#050505` | text, the 4px structural grid, chart bars |
| muted | `#7C7C74` | labels, meta text, receded "no incidents" |

### Base — night (strict 1:1 inversion, not a dimming)

| token | hex | use |
|---|---|---|
| paper | `#050505` | page + card background |
| ink | `#F4F4F0` | text, the 4px grid (now white) |
| muted | `#8C8C84` | labels, meta text |

### Signal (traffic semantics, HMI-calibrated)

| state | day | night | rendering |
|---|---|---|---|
| moving | text `#00A355` | text `#33D17A` | **no fill** — quiet green word, no block |
| slow | fill `#FFC200`, text `#050505` | same fill | filled field, weight 900 |
| backed up | fill `#FF2A00`, text `#F4F4F0` | same fill | filled field, weight 900 |
| closed | fill ink, text paper | inverts | filled ink field (e.g. "lanes closed") |

Rules:
- Calm is quiet. "moving" and "no incidents" render unfilled so the screen is near-silent when all is well. Hazard fills (amber/red) keep their vivid punch in both modes and jump by contrast because they are rare.
- Color never carries meaning alone. Every signal field contains its status word.

### Cobalt + acid volt

| token | day | night | use |
|---|---|---|---|
| cobalt | `#0033FF` | `#4D75FF` | the `.report` wordmark tld + links. Never on UI states or data. |
| acid volt | `#E1FF00` | `#E1FF00` | **the one structural highlight** — the "fastest right now" box, and nowhere else. |

### National flags — the one sanctioned exception (Mark, jul 2026)

The US and Canada flags render as small pictograms in their **real colors** — the only break from "color means status only." Nothing else uses color for identity or decoration.

| flag | colors |
|---|---|
| us | stripes `#B22234` · canton `#3C3B6E` · white field |
| canada | bars + maple leaf `#D52B1E` · white field |

Rules: 22×14 viewBox, white field, 1px ink hairline border so they sit crisply on paper in both modes. Defined once in SVG `<defs>` (`#flag-us` / `#flag-ca`). They appear in two places only: the **direction toggle** (origin→destination, §5) and the **sources footer** (one per agency row). The hairline follows `currentColor`, so on the selected toggle cell it's paper, on the muted cell it's grey.

---

## 2 · Type

- **Family:** `"Helvetica Neue", Helvetica, Arial, sans-serif`.
- **Weights:** 400, 700, 900. No others. No italics, ever.
- **Case:** everything lowercase — **except emergency alert banners, which are UPPERCASE.**
- **Helvetica is the face — final.** A full Univers implementation was built and proven on preview, but it was **declined** (2026-07-11) rather than take on commercial web-embedding licensing. The Helvetica/Arial stack is the system's typeface, not a placeholder. Two weights carry everything (three counting 900); the wayfinding character comes from weight, spacing, and case, not the specific face.

| role | size / line | weight | notes |
|---|---|---|---|
| wait numeral (hero) | 112 / 100 | 900 | `tabular-nums`, tracking −0.04em, `white-space: nowrap`. Drops to 92/84 under 400px. |
| nexus / car minor numeral | 40 / 40 | 900 | tabular-nums, tracking −0.02em |
| fastest box name + min | 28 / 30 | 900 | on acid volt; label above is 13px 700 +0.08em |
| crossing name | 24 / 26 | 900 | in the card head, beside the status word |
| status word | 16 | 900 on fill · green word unfilled (moving) | lowercase, inside signal field |
| trend line | 15 / 18 | 900 climbing · 400 easing/steady | one word: ▲ climbing · ▼ easing · — steady |
| meta / body | 15 / 20 | 400 | "reported {clock}", source line |
| label | 13 / 16 | 400–700 | tracking +0.08em, lowercase (truck wait / car / nexus) |
| unit suffix (" min") | 22 (hero) · 14 (minor) | 400 | tracking 0 |
| alert banner | 13 | 900 | UPPERCASE, +0.08em, on a signal fill |

---

## 3 · Grid + spacing

- **Base unit:** 8px. Most dimensions are a multiple.
- **Mobile margin:** 16px (2u) · `main` max-width 440px.
- **The grid:** structural borders and cell divisions are **4px ink**; internal row dividers within a card are **2px ink**. No hairlines — every edge is a hard ink rule.
- **Card:** no outer padding; each row insets 16px. Rows are separated by 2px ink rules (minor lanes, fresh line, alert, folds).
- **Tap targets:** ≥ 56px (7u). Toggle cells are 60px tall; fold summaries ≥ 60px.
- **Radius / shadow:** 0 / none. Hard edges only.
- **Pictograms:** 48×30 viewBox, 2.5 stroke, no fill, `stroke="currentColor"`. Truck = box + cab + two wheels. Car = single cab silhouette + two wheels. Nexus = diamond outline.

---

## 4 · Wordmark

- The **jeweled-junction mark** (see §8) + `xing` (900, ink) + `.report` (400, cobalt).
- Left of the header; the global "checked n min ago" freshness sits at the right.
- Mark and text sit on the paper plate — never floated over imagery.

---

## 5 · Behavior rules

- **Status thresholds** — judged per lane kind, because a routine truck wait is a miserable car wait. Truck lanes: < 20 min = moving · 20–59 = slow · ≥ 60 = backed up. Car and nexus lanes: < 15 = moving · 15–44 = slow · ≥ 45 = backed up.
- **The fastest box:** one acid-volt block at the top — the single saturated element on the page. A 13px label ("fastest for freight right now" / "fastest for cars right now", following the vehicle toggle) over the winner's name and minutes at 28px/900. Names a strict winner, or "either crossing" on a tie. Never crowned on a closed lane or data older than 10 min; hidden entirely when nothing qualifies. When the tunnel wins for trucks, the "small trucks only — under 12′8″ tall" caveat rides beneath.
- **The cards are the comparison.** There is no separate board (retired in v2.0). Ambassador and tunnel render as full detail cards, **ordered fastest-first**, a "fastest" tag on a strict winner only (no tag on a tie). Each card head is the crossing name + its status word. Blue water (a 60-mile diversion) and gordie howe (not open yet) fold to single tap-to-expand rows below; blue water's collapsed summary carries its status word so an incident is flagged without opening.
- **Card body order:** name + status → vehicle lane label ("truck wait") → 112px hero numeral → "reported {clock}" + trend → minor lanes (the other vehicle + nexus, split by a 2px rule) → alert row → camera / best-times / tolls folds. The chosen vehicle leads every card, so the eye finds the same thing in the same place.
- **Crossings:** ambassador, detroit–windsor tunnel, blue water bridge. The tunnel takes small trucks (under 12′8″ tall, operator faq); wherever a trucker might act on a tunnel number, the caveat appears with it.
- **Trend:** every lane always shows exactly one word next to its wait — ▲ climbing · ▼ easing · — steady — based on the last 15–30 min. Never a number, never blank. Climbing is ink 900; easing and steady recede.
- **Hierarchy:** nothing on a card renders larger than the hero wait numeral.
- **Freshness — two clocks, told apart:** a global "checked n min ago" in the header is *our* pipeline (collector runs every 5 min); each card's "reported {clock}" is the *border's own* time. Our pipeline stale > 10 min shows the amber warning strip.
- **Alert row:** one incident per card, UPPERCASE on a signal fill (amber = lanes affected, red = full closure), separated by a 2px rule. Without an incident: "no incidents" in muted, unfilled. If our alert collection isn't current (> 15 min), we say "we can't check road incidents right now" rather than claim none. Text wraps to stay fully readable — never clipped; a safety alert you can't finish reading fails the trust rule, which outranks the calm ideal.
- **Toggles:** two stacked full-width bars — direction ("det → win" / "win → det") and vehicle ("truck" / "car"), 60px cells. **The selected cell is the only ink block and the only bold text; the unselected cell recedes to muted grey at regular weight** — so which one is active is unmistakable at a glance (a screenshot-tested fix, jul 2026). The **direction cells carry the national flags** origin→destination: det→win shows 🇺🇸→🇨🇦, win→det shows 🇨🇦→🇺🇸 (see §1 flag exception). Both drive the fastest box and every card; both persist across reloads.
- **Approach camera:** one curated live still per crossing, behind a "see the approach camera" tap. Follows the direction toggle — heading into Canada you queue on the U.S. side, so that side shows. Loaded straight from the publishing agency (never stored or re-hosted), captioned with location + source, agencies named in the footer. A down camera shows a calm "camera temporarily unavailable" line — never a broken-image icon, and never a vendor's own down-notice. MDOT serves a 1920×1080 "stream not available" placeholder with a 200 status when a camera is offline (a real load, so the error handler misses it); since its live frames are small thumbnails (≤ ~350px), `bindCameras()` treats an oversized MDOT image as down. Ontario 511 frames are legitimately large (to 1280px), so only MDOT is size-checked. Curated + verified by hand in `cameras.js`; never scraped.
- **Tolls & rules fold:** every figure is one tap from its authority — the operator's `source` URL renders as an ink-underlined link (cobalt stays the wordmark's alone), labelled with the source's own domain (e.g. `bluewaterbridge.ca`), shown **once per operator** (rows are ordered so an operator's prices group together). The **posted** price leads in bold; a currency the operator doesn't post is *our* estimate at the Bank of Canada rate — shown muted with a `≈` and never bold, so a real price and a conversion never look alike. Repeated dates collapse: when every row shares one "posted" date it becomes a single footnote (with "bank of canada" linked); per-row dates stay only when they genuinely differ (e.g. the Ambassador's three effective dates). Hours, limits, and hazmat each carry their own source link. Declutter + provenance were a direct fix (Mark, jul 2026): the fold read as a wall of equal-weight numbers with no way to check any of them.
- **Night mode:** same geometry, strict palette inversion per §1.

---

## 6 · Chart styles

Shared rules — bars in ink only (signal colors never fill data), baseline 2px ink rule, axis labels 13px lowercase, no gridlines.

**"best time to cross"** (hourly wait): 24 bars, gap 4px, sparse hour ticks (12a · 6a · 12p · 6p · 11p). Two callout rows: quietest window in quiet-green text (`#00A355` day / `#33D17A` night, 400) and busiest window in ink 900 — color always paired with words. Follows the direction + vehicle toggles; lives behind a "best times to cross" tap so the glance screen stays calm.

**"corridor by the numbers"** (future, monthly volume): 12 bars, gap 8px, single-letter months. One callout row max, value 900 tabular.

**Honesty gate:** the chart is only drawn once the archive holds at least 7 days of history (built from a 90-day lookback of the readings table, bucketed to local hour). Below that, the card shows one calm muted line — "gathering data … about N days to go" — never a confident-looking chart from thin data. An hour with no history renders as a gap, not a zero. Served by the read-only `/api/patterns` endpoint, cached an hour.

---

## 7 · Forbidden

Gradients, drop shadows, glassmorphism, rounded corners, emoji, stock illustration, hero images, decorative anything. If it looks like a template or a startup landing page, it is wrong.

The one image exception: a live approach camera (§5) is data, not decoration — allowed, but only credited, only behind a tap, and only one per crossing. No other photography.

---

## 8 · The mark

Adopted from the CI manual (Claude Design project `03994fb7…`, file `xing.report CI manual.dc.html`, **concept b · "jeweled junction"** — chosen over concept a "radiant" and concept c "two masses"). The ✕ is the corridor itself: two paths meeting at a junction, with a single acid-volt point where the crossing happens — the same volt as the "fastest" box, so brand and function are the same pixel.

**Geometry** (drawn on a 120×120 field, `viewBox="0 0 120 120"`):
- Two spans: `<rect>` 92×22, one at `rotate(45 60 60)`, one at `rotate(-45 60 60)` — heavy bars (ink-900 weight) crossing corner-to-corner at ±45° exactly.
- The jewel: `<circle r="11">` reveal (the page ground, a true cut-out) under `<circle r="6.5">` in volt, both at centre (60,60). The reveal was enlarged from the manual's 8.5 to **11** (Mark, jul 2026): the manual's 2-unit ring reads as a poster but collapses to nothing at header size, leaving the volt stuck on the ink. At r=11 the jewel sits in a generous, visible paper socket at every scale — the reference look.
- Radius 0 — razor edges only.

**Color, two placements:**
- *On paper* (header, day): bars ink `#050505`, reveal paper `#F4F4F0`, jewel volt `#E1FF00`. At night the bars invert to paper and the reveal to ink (they follow `--ink`/`--paper`); the jewel holds volt in both modes.
- *On ink* (favicon, PWA tiles, dark plates): a full-bleed ink `#050505` ground, bars paper `#F4F4F0`, reveal ink, jewel volt. The mark sits at 60% scale centred, which keeps it inside the maskable safe zone.

**Sizes & minimums:** clear space on every side = one jewel width. Minimum 16px on screen / 6mm in print; below that the volt reveal collapses — drop to the solid ink ✕ without the jewel. Geometry never changes across scales — only the reveal inverts for dark placements. The lockup always sits on a solid plate (paper or ink), never floated over imagery.

**Where it lives:** the inline header mark (theme-aware via CSS classes `.bar`/`.reveal`/`.jewel`), the SVG favicon data-URI, and the 192/512 PNG tiles in `manifest.json`. Concepts a and c are kept in the manual as alternates; switching the lead re-drives all three placements from the same drawing.
