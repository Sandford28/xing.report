# CLAUDE.md — xing.report

This file is the standing brief for building xing.report. Read it before making changes. When something here conflicts with a one-off request, ask me rather than guessing.

## What we're building

A free, live border-crossing utility for the Detroit–Windsor corridor. It answers one question: **which bridge do I take right now?** The user is often a truck driver or dispatcher glancing at a phone in a cab, in sunlight, in a hurry. Every decision serves that person.

Two bridges are compared: the **Gordie Howe International Bridge** and the **Ambassador Bridge**, in both directions (Detroit → Windsor and Windsor → Detroit).

## Priorities, in order

1. **Trust** — a wrong or stale number is worse than no number. Never show old data as if it were current.
2. **Glanceability** — readable at arm's length, understandable in one second.
3. **Simplicity of the build** — I am not an engineer. Prefer boring, well-documented, widely-used tools over clever ones. Explain any choice in plain language before doing it.
4. **Low cost** — this should run on free tiers wherever possible.

## The plan, in phases

Build only the current phase. Do not build ahead.

- **Phase 0 (now):** Live Ambassador Bridge wait times + approach-road alerts + tolls, plus a "Gordie Howe status" section (is it open yet?). **The data archive must be recording from the very first deploy** — see below.
- **Phase 1 (bridge opens):** Turn on the full two-bridge comparison.
- **Phase 2 (later):** A directory of customs brokers, carriers, warehouses.
- **Phase 3 (only if traffic justifies):** A freight-matching board.

## The data archive — do this from day one

The site shows *current* wait times. But every reading the site fetches must also be **saved permanently** with a timestamp, building a historical record over time. This archive is the long-term value of the project and it cannot be backfilled — so it must work from the first deploy, even before we display any charts.

## Where the data comes from (all free, public, government sources)

**Design rule: the database schema supports N crossings, not 2.** Gordie Howe and Ambassador launch first, but the Detroit-Windsor Tunnel (passenger cars, already present in the CBP/CBSA feeds as its own port) and the Blue Water Bridge (Port Huron–Sarnia, same feeds) must slot in without schema changes. Any future corridor should too.

### Tier 1 — real-time border wait times (the core feeds)
- **CBP Border Wait Times** — Canada → US direction. XML/RSS. Feed at `bwt.cbp.gov/xml/bwt.xml`; developer notes at `bwt.cbp.gov/assets/bwt_help.pdf`. Covers Ambassador, the tunnel, and Blue Water as separate ports.
- **CBSA Border Wait Times** — US → Canada direction. Continually updated CSV at `www.cbsa-asfc.gc.ca/bwt-taf/bwt-eng.csv` (also catalogued on Canada's Open Government Portal).
- **WDBA (Gordie Howe)** — feed pending the bridge's operational opening. Build the schema to accept a third standard wait-time payload so this slots in the day it appears.
- Verify all endpoint URLs at build time before relying on them; agencies occasionally move feeds.

### Tier 2 — approach logistics and friction (the "true wait")
- **Ontario 511 API** — live traffic, incidents, cameras for the 401 / Huron Church approach. JSON REST; register for a free developer key at `511on.ca/developers/resources`.
- **MDOT Mi Drive / GIS Open Data** — crashes, lane closures, weigh stations on I-75/I-96. ArcGIS REST services via `gis-mdot.opendata.arcgis.com`.
- **National Weather Service API** — `api.weather.gov`, no key needed (just a User-Agent header). Query `/alerts/active` for the Detroit River grid; high-wind alerts are the trigger for Ambassador wind restrictions.
- **Environment and Climate Change Canada (ECCC)** — the Canadian mirror of NWS (GeoMet / public alert feeds) for weather affecting the Ontario approach.

### Tier 3 — directory, analytics, and strategic data
- **FMCSA SAFER** — every licensed US carrier. REST API (developer WebKey via `mobile.fmcsa.dot.gov/QCDevsite`) or monthly bulk `.zip` flat files via Data.gov. Seeds the Detroit-area carrier directory.
- **CBP licensed customs broker lists (by port)** and **CBSA licensed customs brokers list** — Phase 2 directory seeds for both sides of the river.
- **BTS TransBorder + Border Crossing/Entry data** — monthly port-by-port truck volumes and freight values, CSV/Excel at `bts.gov/transborder`. Powers the "corridor by the numbers" charts, including the Detroit vs. Port Huron rerouting story.
- **Statistics Canada trade data** — the Canadian mirror of BTS, for two-country chart comparisons.
- **USITC Harmonized Tariff Schedule + CBP CROSS rulings** — downloadable; reserved for a future duty-lookup tool. Do not build before Phase 2.
- **Bank of Canada daily exchange rate API** — official CAD/USD rate so tolls can display in both currencies. A driver should never have to do currency math.
- Tolls, hours, lane info: entered by hand, updated when they change.

### Hazmat routing — hand-maintained, never scraped
"Can I take this load across?" has a different answer per crossing and the rules have been in flux: the Ambassador banned Class 3/8 hazmat for decades, the truck ferry that carried it ceased operating in 2023, a permit to allow hazmat on the Ambassador has been under MDOT review, and the Gordie Howe is built to carry hazmat. Each crossing therefore carries a hazmat status field that is **manually verified against current MDOT/WDBA/operator guidance before every change** — this is safety-relevant information, so it is never inferred, never scraped, and always shows the date it was last verified.

If any source is unreachable, the site shows the last known reading clearly labelled with how old it is — never a blank, never a stale number pretending to be live.

## Recommended tech (keep it simple)

Use one vendor so there's one account and one dashboard to understand:

- **Cloudflare Pages** hosts the website
- **A scheduled Cloudflare Worker** fetches the wait-time feeds every 5 minutes
- **Cloudflare D1** (a simple database) stores every reading for the archive

This whole stack has a generous free tier. If you recommend a different stack, explain in plain language why, and keep it to equally boring, mainstream tools. No accounts, no user logins, no ads, no third-party trackers. Basic anonymous visitor counting (e.g. Plausible) is fine.

## Keeping the product easy to grow

Keep the part that **collects and stores the data** separate from the part that **shows the website**. Think of two boxes: one quietly fetches the border numbers every few minutes and files them away; the other is the website people look at. Because they're kept separate, adding a second crossing — or later showing the same data a new way — means plugging into the box that already holds the data, not untangling it from the Detroit–Windsor page. This is the single most important habit for keeping the product scalable, and it costs nothing to follow from the start.

## Design rules (from the xing.report spec + high-performance HMI principles)

The look is Otl Aicher / road-sign wayfinding, sharpened by industrial control-room (HP HMI) thinking: a calm screen means all is well; color is reserved for when something needs attention.

- **Mobile-first.** Design for a phone in a cab first, desktop second.
- **Color:** near-colorless base (cream paper `#F2F1ED`, near-black ink `#141414`; full dark "night cab" mode inverts this). Three signal colors mean status and nothing else — green = moving, amber = slow, red = backed up — and they are bright and saturated so they stand out against the calm background.
- **Color never carries meaning alone.** Every status always shows a **word** ("moving," "slow," "backed up") next to the color.
- **The wait-time numerals are the hero** — huge, bold, tabular. Bigger than feels comfortable.
- **Trend in plain words**, next to each wait time: "climbing," "steady," or "easing." Never a bare number, never blank — always one of the three.
- **Type:** Helvetica/Arial family, two weights only (400 and 700). Everything lowercase, no italics.
- **Hard edges only.** No rounded corners, no shadows, no gradients, no decorative anything.
- **Tap targets big enough for work gloves** (roughly 56px minimum).
- **"updated X min ago" is mandatory** on every live view. If data is more than 10 minutes old, show a warning strip.
- The accent color appears **once**, in the wordmark, and nowhere else.

(The full spec sheet from Claude Design — exact hex values, type sizes, spacing — should live alongside this file and be treated as the source of truth for those details.)

## How to work with me

- I'm not a computer scientist. Explain what you're about to do in plain language first.
- Prefer small, working steps I can see over large invisible ones.
- When there's a choice to make, give me 2–3 options with a plain-language recommendation.
- Flag anything that would cost money before doing it.
