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

## The map

The map is the page, and it is a solid. Each province is extruded to the measure you pick, in
three.js:

- **Height is linear.** North West's 300 000 ha really does tower over KwaZulu-Natal's 3 684 rather
  than being flattened into comparability — that disproportion is the story of the October 2020
  release. Colour carries the same value on a square-rooted step so small provinces stay
  distinguishable from empty ones, and the reading survives a flat viewing angle.
- **Three measures**, switched live: hectares advertised (Oct 2020), hectares released (Feb 2020),
  and the share of each province already owned by the state. Heights tween between them.
- **Orbit, zoom, hover, click.** Hovering lifts a province and opens a readout; clicking flies the
  camera in, ghosts the rest, and slides in that province's figures, farming systems and shared
  service centre. Escape closes it. The framing is offset so the province centres in the space the
  panel leaves.
- **Province outlines are simplified for the solid** (Douglas–Peucker, ~2 km) — the flat detail that
  suits a map turns each extruded wall into a moiré fan.
- Tweens run on the wall clock rather than accumulated frame deltas, so a slow renderer plays them
  at the right speed instead of in slow motion. Labels are written straight to the DOM each frame
  rather than through React state.
- If WebGL will not start, the map says so and the rest of the page still works.

## Other interactive tools
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

The long-form reference — your route, applying, money, history, what goes wrong, offices — sits
below the map behind tabs, so only one section's text is on screen at a time.

## 3D land explorer

The default map opens a regional view of Limpopo with satellite imagery draped over actual elevation. Select another province to fly to its landscape. Map controls provide zoom, rotation, 2D/3D pitch, satellite/relief, rivers and a provincial data overlay. The separate Compare area view uses statistical extrusion for the selected historical measure. It does not represent terrain elevation.

The workspace uses Manrope and Inter with mint accents and supports light/dark themes. On phones, the map comes first and province selection and details follow below. Desktop details sit beside the map. Selecting a province carries it into the route planner; changing reference tabs preserves answers.

`npm test` checks ranking, search and feed-state presentation. `npm run build:sites` builds the
same Next.js application through OpenNext and stages a Cloudflare Worker plus public assets
for a private Sites preview. The existing Next.js development/build/start commands and Vercel
configuration remain supported. The preview has no advert feed until the existing environment
variables are configured. OpenNext's default cache overrides do not provide durable ISR;
production deployments that use the feed should configure the appropriate cache bindings or
continue using the existing Vercel deployment.

### Geographic data

Elevation uses Mapzen Terrain Tiles on AWS (global SRTM / GMTED data courtesy of USGS), accessed 2026-09-08. Terrarium elevation is displayed with 1.6× relief; centre readouts remove that exaggeration. Elevation is approximate, not a site survey. Satellite imagery is EOX Sentinel 2016–17. The river overlay is a regional subset of Natural Earth 1:50m rivers and lake centerlines (public domain); it does not indicate irrigation rights or availability. Provincial statistics retain their original reporting dates, and the map does not invent individual farm boundaries or listings.
