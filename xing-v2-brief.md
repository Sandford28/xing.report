# xing.report — v2 expansion brief

Read alongside CLAUDE.md and DESIGN-SPEC.md, which still govern. This brief adds to them; it doesn't replace them. All the old rules still hold: honest data, calm/glanceable screen, the two boxes stay separate (the collector stores data, the site only reads), mobile-first, and nothing goes live at xing.report until I've checked it on the preview address.

## What v2 is

Three changes that fit together: show all three crossings (not just the Ambassador), make the page welcoming to everyday people crossing (not only truckers), and add a few genuinely useful tools. The look warms up slightly but stays clean — same road-sign bones, a little friendlier.

**Do these one at a time, in this order, and stop and show me each on the preview before starting the next.** Don't build them all at once.

## Step 1 — turn on the other two crossings

We already archive the Detroit–Windsor Tunnel and the Blue Water Bridge every five minutes, so this is mostly display work, not new plumbing.

- Add a card for each, in the same style as the Ambassador card.
- Because there are now three crossings, add a short summary at the very top that answers the everyday question in one line: **"fastest right now: [crossing]."** Simple crossers just read that and stop; pros scroll to the detailed cards.
- Keep each crossing honest about what it does and doesn't offer (the Tunnel is cars only, etc.) — don't show a lane type a crossing doesn't have.

## Step 2 — warm the tone for everyday crossers

A trucker knows what "FAST lane" and "per axle" mean; someone driving over for dinner doesn't. Widen the welcome without dumbing down the data the pros rely on.

- Layer it: the plain-language answer up top, the detailed lane-by-lane breakdown still there below for anyone who wants it. Don't remove detail — just lead with simplicity.
- Warm the wording a touch (plain, human, still terse). No jargon in the top-level summary.
- **Keep the screen calm.** If warming the tone starts adding clutter, stop — the calm, uncluttered feel is the point, and it beats "friendly but busy."
- This step is mostly words and tone, not a redesign. If a visual change is needed, it should be small.

## Step 3 — "best time to cross" charts

This uses the history we've been recording from day one — it's the tool that's uniquely ours.

- A simple chart per crossing showing typical waits by hour and day, so someone can plan ("mornings are clear, Friday evenings are bad").
- Style it to DESIGN-SPEC.md — same restraint as the "corridor by the numbers" chart: minimal axes, no decoration.
- Honesty note: if there isn't enough history yet for a reliable pattern, say so plainly rather than drawing a confident-looking chart from thin data. It gets better as the archive grows.

## Step 4 — border cameras

Ontario 511 and the bridge operators publish live camera stills.

- Show or link the relevant approach cameras per crossing, clearly credited to their source.
- Use their published feeds cleanly — don't scrape — and handle a camera being temporarily down gracefully (say "camera unavailable," don't show a broken image).
- Add each camera source to the credits footer, same as every other source.

## Step 5 — a live map (optional, do last or skip)

A map is the heaviest thing here to build and keep tidy, and the most likely to drift from our clean look toward a busy generic-map feel. Treat it as optional. Only build it if steps 1–4 are solid and it still feels needed — and if we do, keep it restrained and on-brand, not a default map dump.

## How I work (please follow)

- I'm not an engineer. Explain what you're about to do in plain language first.
- When there's a choice, give me 2–3 options with a plain-language recommendation and the tradeoff.
- Flag anything that costs money or needs my action before doing it.
- Prefer small, working steps I can see over big invisible ones.
- Everything happens on the preview address first; production (xing.report) doesn't change until I say go.
