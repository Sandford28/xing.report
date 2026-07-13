# Gordie Howe International Bridge — activation runbook

The day the bridge opens, this is the whole checklist. The plumbing is already
built: the schema supports N crossings, the CBP/CBSA parsers are data-driven,
and there's already an (inactive) `gordie-howe-bridge` row. **The collector needs
no code change** — activation is data plus a few small site edits.

Estimated time: ~30 minutes once the feed carries the bridge.

---

## 0 · Precondition — is Gordie Howe in the feeds yet?

Gordie Howe is a US–Canada crossing, so it will appear in the CBP and CBSA
wait-time feeds as a new port/office, exactly like the Ambassador and the
tunnel. Check for it (run occasionally, or when you hear it's opening):

```
cd collector && node scripts/find-crossings.mjs
```

Look for a `★ GORDIE HOWE?` line. **Copy its exact strings** — `port_name` +
`crossing_name` (CBP) and `office` (CBSA). You need them verbatim in step 2.
If nothing shows, the feed isn't carrying it yet — stop here.

---

## 1 · Verify the safety-critical facts (do this first, by hand)

Per CLAUDE.md, hazmat is safety information and is **never** guessed. Gordie
Howe is built to carry hazmat, but confirm the current rule against WDBA /
MDOT guidance and record the date. Also gather: toll rates (both currencies if
the operator posts both), hours, height/weight limits, and the WDBA camera URLs.

**What the official opening release already confirms** (canada.ca, Housing,
Infrastructure and Communities Canada, dated 2026-07-10 — the source cited in
the site's gordie status):
- A **full opening on July 27** — a six-lane cable-stayed bridge (853 m main
  span), modern ports of entry both sides, serving "commuters, tourists, and
  businesses" (i.e. cars **and** trucks). No phased or one-direction opening is
  mentioned.
- **Tolls will apply** — it is not free-to-start. The release describes toll
  governance, a 15-year economic-development fund tied to a portion of bridge
  profits, and the **Windsor-Detroit Bridge Authority (WDBA) setting the toll
  rates** (with U.S. concurrence for certain non-market changes).
- It does **not** publish the actual toll rates, the hazmat rule, height/weight
  limits, hours, or the opening time of day — so all of those still need
  hand-verification against WDBA at opening. Start at the operator site (the
  release's "Associated links" points to the Gordie Howe official website).

---

## 2 · Activate in the database (no deploy needed)

Fill the exact strings from step 0. This makes both the collector (writes
readings for the new port next tick) and `/api/now` (serves it) pick it up,
because both select `WHERE active = 1`.

```
cd collector
node_modules/.bin/wrangler d1 execute xing-report --remote --command \
"UPDATE crossings SET active = 1,
   cbp_port_name = 'PASTE',        -- e.g. 'Detroit'
   cbp_crossing_name = 'PASTE',    -- e.g. 'Gordie Howe Intl Bridge'
   cbsa_office_name = 'PASTE'      -- e.g. 'Gordie Howe International Bridge'
 WHERE slug = 'gordie-howe-bridge';"
```

Within ~5 minutes the wait-time worker will archive the first Gordie Howe
reading. Confirm:

```
node_modules/.bin/wrangler d1 execute xing-report --remote --command \
"SELECT direction, lane_category, lane_type, wait_minutes, fetched_at
 FROM readings WHERE crossing_id = 2 ORDER BY id DESC LIMIT 8;"
```

If nothing lands, the identifier strings don't match the feed — re-check step 0.

---

## 3 · Show it on the site (`site/`)

Small edits, all on the preview branch first (nothing to prod until you've
looked at it):

- **`public/index.html`**
  - Add `'gordie-howe-bridge'` to `COMPARE_POOL` (it becomes a full comparison
    card, fastest-first, automatically).
  - Add to `SHORT_NAME`: `'gordie-howe-bridge': 'gordie howe'` (the fastest box).
  - Add to `SIDE_LABELS`: `'gordie-howe-bridge': { ca: 'windsor', us: 'detroit' }`.
  - Retire the "not open yet" fold: the `gordieFoldHtml` + `#gordie` status
    section has done its job — remove it (or keep a one-line "now open" note
    briefly). The crossing now renders as a normal card.
- **`functions/_lib/crossing-info.js`** — add a `'gordie-howe-bridge'` block:
  `tolls`, `hours`, `limits`, and the **verified** `hazmat` (with `last_verified`).
  Remove the old `.status` block (the status fold is gone).
- **`functions/_lib/cameras.js`** — add `'gordie-howe-bridge'` cameras: WDBA's
  own if published, else the nearest MDOT (US side) and Ontario 511 (CA side)
  approach cams, mapped `to_canada → US side`, `to_us → CA side` (same pattern
  as the others). Verify each URL returns a live JPEG.

Deploy to preview, check it, then to prod (same commands as the reskin ship).

---

## 4 · Housekeeping

- This is the **Phase 0 → Phase 1** milestone (CLAUDE.md): the full two/three-way
  comparison is now live. Update CLAUDE.md's phase note and DESIGN-SPEC if the
  crossing list text changes.
- Keep `scripts/find-crossings.mjs`'s `KNOWN_CBP` / `KNOWN_CBSA` sets in sync so
  future additions still stand out.
