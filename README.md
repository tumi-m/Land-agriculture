# Asbonge Land Locator

An interactive map of state agricultural land released for farming in South Africa. Click a
province to isolate it; every parcel opens to its extent, tenure, enterprise mix, eligibility
rules, the full application process, the office that handles it, and a keyboard-navigable set of
site plates.

## What is real and what is not

The **geography is real**: 52 district municipalities merged into the nine provinces, every parcel
coordinate verified to fall inside the district it claims, rainfall figures drawn from the regional
climate.

The **parcels are not**. The bundled dataset is a sample: titles, references, contact people, phone
numbers and email addresses are placeholders, flagged `Sample` on every card and behind a banner on
the page. Nothing here should be treated as a live government offer. Point the app at a real feed
before anyone applies to anything.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build
npm run typecheck
```

## Connecting a live source

The app reads its listings through one function, `loadDataset()` in `src/lib/source.ts`. With no
configuration it serves the bundled seed. Set `LAND_DATA_URL` and it reads that instead — a CMS, a
Sheets-backed function, a Supabase view, anything that returns JSON in this shape:

```json
{
  "revision": "2026-09-08T10:15:00Z",
  "updatedAt": "2026-09-08T10:15:00Z",
  "listings": [ { "id": "...", "title": "...", "province": "LP", "coordinates": [30.16, -23.83] } ]
}
```

Records are validated on arrival; anything malformed is dropped rather than crashing the page, and a
feed that cannot be read falls back to the seed with the reason shown on the page. The full record
shape is `Listing` in `src/lib/types.ts`.

### How an update reaches an open browser

Three mechanisms, in order of how quickly they fire:

1. **The webhook.** When your source changes, call the revalidation endpoint. It flushes the cached
   feed read immediately:

   ```bash
   curl -X POST https://<your-host>/api/revalidate -H "x-webhook-secret: $REVALIDATE_SECRET"
   ```

2. **Client polling.** Every open browser re-checks `/api/parcels` every 30 seconds, sending the
   ETag it last saw. An unchanged dataset costs a `304` and nothing re-renders. When the revision
   does change the page swaps in the new data in place and the status dot reads *Updated just now*.
   Polling pauses while the tab is hidden and fires once the moment it comes back.

3. **Revalidation on a timer.** The page itself revalidates every 60 seconds, so even without the
   webhook a new visitor is at most a minute behind.

### Environment

Copy `.env.example` to `.env.local`. All three variables are optional; without them the app runs on
the seed and the webhook returns `501`.

## Deploying to Vercel

Import the repository, framework preset **Next.js**, no build overrides needed. Set
`LAND_DATA_URL`, `LAND_DATA_TOKEN` and `REVALIDATE_SECRET` in project settings if you are using a
live feed, then point your publishing system's webhook at `/api/revalidate`.

## Rebuilding the data

```bash
npm run data:topo        # district boundaries -> src/data/sa-districts.topo.json
npm run data:listings    # sample listings     -> src/data/listings.json
```

`data:topo` downloads the district boundary source on first run, simplifies it to roughly 5% of its
points (23 400 points, 177 KB, 47 KB over the wire) and quantises the coordinates. Province outlines
are not stored separately — they are merged from the district arcs at runtime, so shared borders
stay exact and there is one file to ship.

`data:listings` regenerates the sample dataset and fails the build if any coordinate falls outside
the district its record names.

## Interaction notes

- **Map** — scroll to zoom around the cursor, drag to pan, click a province to isolate it. Provinces
  are reachable by keyboard: tab to one and press Enter. Shading is by hectares released, not parcel
  count.
- **Carousel** — focus it and use <kbd>←</kbd> / <kbd>→</kbd>, <kbd>Home</kbd>, <kbd>End</kbd>. Click
  an image for the lightbox, where the arrows keep working and <kbd>Esc</kbd> closes.
- **Shortlist** — stored in the browser only; nothing is sent anywhere.
- **URL** — the isolated province is written to `?province=`, so a view is shareable.
- Dark mode is designed rather than inverted, and applied before first paint.

## Structure

```
src/
  app/            routes, the API endpoints, global styling
  components/     map, province panel, parcel cards, carousel, filters
  lib/            geometry, data source, formatting, live-data hook
  data/           district topology + sample listings
scripts/          data build scripts
```
