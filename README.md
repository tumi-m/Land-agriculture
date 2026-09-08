# Asbonge Land Locator

A guide to getting state agricultural land in South Africa: where it is, which of the four
beneficiary categories you fall into, what lease and rent that carries, whether you can ever own
the land, what finance you qualify for, which office takes your form, and what tends to go wrong.

## What this is, and what it is not

It is a **reference and routing tool**, not a listings site. Every figure on the page — hectares
advertised per province, the share of each province that is state land, committee timings, rental
formulas, blended-finance splits, office addresses and officials — is real content, compiled from
South African government policy documents and departmental directories.

There is **no sample data in this repository**. Nothing invents a farm, a closing date or a contact
person. Live adverts appear only when `LAND_DATA_URL` points at a feed; without one the page says
so and points people at the department.

Departmental structures, officials and telephone numbers change. `src/content/meta.ts` carries the
review date shown in the footer, and the page tells readers to confirm before acting.

## The content layer

`src/content/` is the substance of the site, kept apart from the components that draw it:

| File | What it holds |
|---|---|
| `provinces.ts` | Per province: hectares advertised (Oct 2020), released (Feb 2020), the share of registered surface that is state land, dominant farming systems and commodities, and the Provincial Shared Service Centre with its officials |
| `categories.ts` | The four SLLDP/BSLAP beneficiary categories — profile, tenure, rent, purchase option — and the rental formula |
| `process.ts` | The committee pipeline with durations, Form ALA's sections, the annexure list, the statutory exclusions and cooling-off periods, the residence rule |
| `finance.ts` | Blended Finance Scheme tiers, qualifying criteria, CASP / Ilima-Letsema / Agro Energy Fund, and why the grants exist at all |
| `policy.ts` | SLAG → LRAD → PLAS → SLLDP → BSLAP → the 2024 departmental split, plus the national figures |
| `departments.ts` | DLRRD and DoA — who does what since the split, with head-office contacts |
| `cases.ts`, `risks.ts` | What has worked on state land, and what keeps failing |

Change a fact in one of these files and it updates everywhere it appears.

## Generative UI

Section 02 composes a personalised route rather than rendering a fixed template.

- `src/lib/blocks.ts` defines the block vocabulary — `verdict`, `blocker`, `tenure`, `finance`,
  `office`, `checklist`, `timeline`, `province-fit`, `caution`, `note`.
- `src/lib/pathfinder.ts` is the engine. It takes four answers and returns typed blocks. It
  composes no markup, and it is deterministic: the same answers always produce the same route.
- `src/components/blocks/BlockView.tsx` is the registry — one component per kind. A kind the
  registry does not recognise renders as nothing rather than breaking the answer.

That separation is the point: swapping the engine for a model later changes the source of the
blocks, not a single renderer.

## Interactive tools

- **Map** — a choropleth of hectares advertised, one sequential hue, with a hover readout and a
  legend. Click a province to isolate it: the map flies to its bounds, dims the rest, and reveals
  district outlines and labels. Provinces are keyboard-reachable. Map furniture is sized in screen
  pixels, so labels stay legible from 350px to full width.
- **Form ALA pre-flight** — a working checklist of the annexures, switching on whether you apply in
  your own name or through an entity, remembered in the browser.
- **SG code check** — validates the length of a 21-character Surveyor-General code and says where to
  get one. Format only; there is no lookup wired in and the app does not pretend otherwise.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build
npm run typecheck
```

## Connecting an advert feed

All listings come through `loadDataset()` in `src/lib/source.ts`. Set `LAND_DATA_URL` to any JSON
endpoint shaped like this:

```json
{
  "revision": "2026-09-08T10:15:00Z",
  "updatedAt": "2026-09-08T10:15:00Z",
  "listings": [{ "id": "...", "title": "...", "province": "NC", "coordinates": [21.25, -28.45] }]
}
```

Records are validated on arrival and anything malformed is dropped. A feed that cannot be read
leaves the page empty and shows the reason. The full record shape is `Listing` in
`src/lib/types.ts`.

### Keeping open browsers current

1. **Webhook** — call it when your source changes and the cached read is flushed at once:

   ```bash
   curl -X POST https://<host>/api/revalidate -H "x-webhook-secret: $REVALIDATE_SECRET"
   ```

2. **Polling** — every open browser re-checks `/api/parcels` every 30 seconds with the ETag it last
   saw; an unchanged dataset costs a `304` and nothing re-renders. Polling pauses on a hidden tab
   and fires once when it comes back.

3. **Revalidation** — the page itself revalidates every 60 seconds, so a new visitor is at most a
   minute behind even without the webhook.

## Deploying to Vercel

Import the repository, framework preset **Next.js**, no build overrides. Set `LAND_DATA_URL`,
`LAND_DATA_TOKEN` and `REVALIDATE_SECRET` in project settings if you are running a feed, then point
your publishing webhook at `/api/revalidate`.

## Rebuilding the boundaries

```bash
npm run data:topo
```

Downloads the district boundary source on first run, simplifies it to about 5% of its points
(23 400 points, 177 KB, 47 KB over the wire) and quantises the coordinates. Province outlines are
merged from the district arcs at runtime, so shared borders stay exact and there is one file to
ship.

## Design notes

- One display serif (Fraunces), one grotesque (Inter), one mono (IBM Plex) — mono is reserved for
  figures in tables, codes and phone numbers, never for running prose.
- Green is a **sequential ramp for magnitude only**, never for identity; clay is the single accent
  for selection and emphasis. Both ramps were validated for lightness monotonicity, step separation
  and contrast in light and dark, and every text token clears WCAG AA on both surfaces.
- Dark mode is re-stepped for the dark surface rather than inverted, and applied before first paint.
- Number formatting and dates avoid `Intl` on purpose: ICU data differs between the Node build that
  renders the HTML and the browser that hydrates it.
