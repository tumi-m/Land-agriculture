# Map 10x upgrade — execution plan

The map plan agreed in the session of 15 September 2026, written down so it
survives the session. Executed one task at a time; each task's **Check** decides
done. When several owners work in parallel, `docs/milestone-status.md` is the
occupancy list: claim a file set there before the first edit.

**Decisions:** round-specific QC metrics · map first, photos deferred · no new
dependencies · this plan lives in `docs/PLAN-MAP-10X.md`.

**Read of the repo today (checked, not assumed):** the store
(`src/state/explorer.ts`), URL grammar (`src/state/url.ts`), layer registry
(`src/map/layers.ts`), UI primitives (`src/components/ui/*`), token system and
part of the raster pipeline (untracked `scripts/data/`, `src/lib/raster.ts`,
`public/data/layers/*.color.png`) already exist. The weak points are the maps
themselves: colliding labels (visible in `test-results/shots/phone-light.png`),
12+ floating controls, four flat-colour slices even though colour rasters are
baked, and a Land view with no place names, no parcel coverage, no measure and
no profile. This plan wires what exists, then executes `docs/PLAN.md` P3/P4 in a
map-first order with a measured quality loop.

## Standing constraints (from AGENTS.md, unchanged)

No invented data · every number carries source + date (rasters also resolution)
· no AI attribution or branch names anywhere · secrets from env only · no
upgrades to next/react/three/maplibre · one task, one small diff ·
`npm run check` after every change; `npm run build && npm run e2e && npm run
shots` before a commit · new data pipelines declared in `scripts/pipelines.json`,
run by `npm run data:all`.

---

## Phase M0 — Unbreak and measure (no product change except one commit)

| ID | Task | Size | Files | Do | Check |
|---|---|---|---|---|---|
| M0.1 | Commit the loose raster work | S | `public/data/layers/`, `scripts/data/`, `src/lib/raster.ts` | Commit the untracked P2.2 artifacts as their own diff before anything else touches them. | `git status` clean; `npm run check` passes |
| M0.2 | Finish the bake (P2.2 closeout) | M | `scripts/data/bake-rasters.mjs`, `tests/raster.test.ts`, `scripts/data/sources.json` | Add `soil-ph`, `soil-clay` via the already-declared SoilGrids URLs; add the relational test (rain Upington < Pietermaritzburg, land cover at Johannesburg is built-up, top-up pH Upington > Pietermaritzburg); each file < 600 KB | `npm run data:all` runs raster → stats chain; `npm test -- raster` passes |
| M0.3 | **Quality harness** (the measurement device) | M | new `e2e/quality.spec.ts`, new `e2e/helpers/quality.ts`, new `scripts/quality.mjs`, new `docs/map-quality-baseline.md` | Collect at 390×844 and 1440×900, at depth 0/0.33/0.66/1, with sheet closed/open and light/dark: (1) visible `[data-overlay]` count and boxes, (2) overlapping text pairs among labels/chrome, (3) touch-target < 44 px, (4) computed contrast of text vs its background, (5) accessibility names missing, (6) `undefined`/`NaN` in cards. Write JSON + a human table. | Two runs produce identical numbers; manual spot-check matches; zero product change |
| M0.4 | Perf baseline | S | new `e2e/perf.spec.ts`, new `scripts/perf.mjs`, `test-results/perf/baseline.json` | Record median first-frame ms, frame count through a depth sweep, JS heap, console WebGL errors, at phone throttle and desktop. | Baseline file written and committed |
| M0.5 | Land-view behaviour inventory | S | new `e2e/land.spec.ts` | Pin what the Land view does today: control inventory, tap → district vs point, tile-error states. Becomes M3's acceptance surface. | Spec passes unchanged on today's build |

**QC0 record:** `docs/map-quality-baseline.md` is the fixed 0-point. Every later
"30%" is computed from it.

---

## Phase M1 — One journey: model and land

| ID | Task | Size | Files | Do | Check |
|---|---|---|---|---|---|
| M1.1 | Depth as a pure function | M | new `src/scene/depth.ts`, `tests/depth.test.ts` | `pieceTransforms({depth, selection, provinces, districts}) → {offsetX, offsetZ, lift, layerGap, ghost}`; stage A provinces, B districts, C layers, smoothstep inside each, reusing `explosionOffset`/`sliceHeight` | Ported P3.2 checks: zero at 0, full at stage ends, monotonic every 0.05, ghosted pieces don't move |
| M1.2 | Final selection/URL grammar | L | `src/state/explorer.ts`, `src/state/url.ts`, `LandLocator.tsx`, `tests/url.test.ts` | `Selection` gains `parcel`/`photo`; `view` becomes `model`/`land`; add `depth`, `layers`, `cam`; backward-compat mapping for `?view=anatomy|atlas|data` and `?metric=`; `LandLocator` ≤ 3 `useState`; remove the once-only hydrate ref hack | Round-trip tests for every kind + rejections; old links still resolve; smoke passes |
| M1.3 | Scene split and camera | L | new `src/scene/{core,pieces,picking,camera,labels}.ts`, new `src/components/explorer/ModelView.tsx`; delete `ExplodedMap.tsx` at parity | Extract renderer, controls, lights, render-on-demand, wall-clock tweens; presets ¾/Top/Side/Rotate; isolate; frame the selection in the area a sheet leaves via `camera.setViewOffset` | Smoke green; depth 1 shows four slabs per district; scene chunk ≤ +10% of baseline |
| M1.4 | Label placement | M | `src/scene/labels.ts`, `tests/labels.test.ts`, `src/components/explorer/ModelView.tsx` | Priority (selected → hovered → area), collision box test, cap 10 phone / 20 desktop, leftovers become dots, leader lines kept for slices; drop the per-label notice sub-line at country scale (the current collision source) | Unit: no overlap, selected always shows, deterministic; `expectNoOverlap(".scene-label")` at 4 depths |
| M1.5 | Explorer shell | L | new `src/components/explorer/{ExplorerShell,TopBar,CameraPill,Dock,DepthSlider,ViewSwitch}.tsx`, new `src/components/ui/icons.tsx`, `src/styles/shell.css`; edit `LandLocator.tsx` | Full-bleed stage; 64 px top bar; one dock (depth slider + Model/Land + Layers); sheets via the existing `Sheet` primitive; delete the metric switch, two-slider console, focus/collapse buttons and notice browser; inline SVG icons replace every unicode glyph (⌕ ⌖ ↶ ↷ ⛶ ☾ ● ×) | ≤ 5 visible `[data-overlay]` at 390 px; `expectNoOverlap("[data-overlay], [data-chrome]")` passes; screenshots reviewed |
| M1.6 | Search and outline | M | new `src/lib/search.ts`, `tests/search.test.ts`, new `SearchSheet.tsx`, `Outline.tsx` | Local index (provinces, districts, notices, rivers), pattern detection for 21-char SG codes and coordinates; `/` opens, arrows + Enter; Outline view is the full no-3D/no-mouse path | "vhembe" → district first; "poultry" → notices; coordinates → point; code → lookup |
| M1.7 | Poster, first run, failure | S | new `scripts/poster.mjs`, `public/poster/`, `ModelView.tsx` | `npm run poster` captures the assembled model (1200×900, light/dark); poster until first WebGL frame; hint "Drag to open the land" in `localStorage` try/catch; failure → poster + "Open the outline" | WebGL disabled: fallback shows and outline works |

**QC1 (after M1.1–M1.2):** primary metric = **overlapping label pairs per view**
(phone + desktop, 4 depths). Target ≥ 30% below QC0. Secondary: `data-overlay`
count, touch targets, a11y names — none worse by > 5%.

---

## Phase M2 — Make it real: data in the pieces

| ID | Task | Size | Files | Do | Check |
|---|---|---|---|---|---|
| M2.1 | Textures on the slices | L | new `src/scene/textures.ts`, `tests/uv.test.ts`; edit `pieces.ts` | Drape the baked `<layer>.color.png` on cap faces only (`ExtrudeGeometry` gives two material groups → `[capMaterial, sideMaterial]`); land→landcover, soil→soil-ph, climate→rain + draped rivers, government→neutral slate with markers; `NearestFilter` for categorical; load only past depth 0.6 or on inspect; caption becomes "measured estimates on a grid under 2 km; thickness is not soil depth" | UV corners 0/1; depth-1 screenshot shows four distinct textured layers; no WebGL console errors |
| M2.2 | District statistics (P2.3) | M | new `scripts/data/district-stats.mjs`, `src/data/district-stats.json`, `tests/district-stats.test.ts` | Per district: area km², rain mean/p10/p90, land-cover shares, pH/clay means, elevation mean/min/max, notice and parcel counts, each with a source block | 52 districts; shares 0.98–1.02; no NaN except nodata; physical ranges |
| M2.3 | Inspect card registry | L | new `src/components/explorer/inspect/*` + `index.ts` | One card per selection kind (province, district, layer, notice, parcel, point, photo), top→bottom: chip, plain title, one sentence, 2–4 `Stat` + `SourceNote`, mini chart (direct labels, unit axis, numbers as a SR table), one primary action, secondaries, "What this doesn't tell you" | Render tests: source present, no `undefined`/`NaN`, nulls read "Not recorded" |
| M2.4 | Layers panel, lenses, outline | M | new `LayersPanel.tsx`; delete `LandScene.tsx` | One row per layer with colour dot, count, show-only, switch; presets; "N pieces visible"; "Height shows" lenses (real relief, hectares advertised/released, state share, rain, notices) with the "statistics, not elevation" caption; Outline tab | Store test toggles pieces off; lens mapping unit test; build has no LandScene chunk |
| M2.5 | Notices and parcels (P2.4 a–e, P2.5) | L, deep | `scripts/notices/*`, `src/content/notices/*`, `docs/data/match-report.md` | Fetch/extract/schema/transcribe/validate every 2026-index PDF (or mark "needs OCR"); cadastral match writes exact matches only; probable matches stay in the report | `npm run notices:check` passes; NC test still finds 15; layer counts match data |

**QC2 (after M1.3–M1.7):** primary metric = **`data-overlay` controls + chrome
overlap pairs** at 390×844 including sheet-open states. Target: ≤ 5 controls and
≥ 30% fewer overlap pairs than QC0.

---

## Phase M3 — Make it live: the real land

| ID | Task | Size | Files | Do | Check |
|---|---|---|---|---|---|
| M3.1 | Registry-complete Land view | M | `src/map/layers/*`, `useMapLayers.ts`, `AtlasMap.tsx`, delete inline calls in `InfrastructureOverlay.tsx` | Place names and main roads from OpenFreeMap vector labels (styled with tokens, dark halo), all basemaps/overlays as `LayerDef`s; no `addLayer` in any component | Screenshot at zoom 8 and 13 shows town/road names + attribution; infra overlay still works |
| M3.2 | Hand-off (P4.1) | M, deep | new `src/scene/handoff.ts`, `tests/handoff.test.ts`, `LandView.tsx` | Mount the map under the model at `opacity:0` on district select; on "Go to the land", `getAzimuthalAngle()`/`getPolarAngle()` → bearing `−azimuth` (0–360), pitch clamped; `fitBounds` with sheet padding; 400 ms crossfade; Back keeps depth/selection | Unit: camera east → bearing 270; top-down → pitch 0; before/after screenshot pair same orientation |
| M3.3 | Phone declutter (P4.10) | M | `AtlasMap.tsx`, `shell.css` | Allowed floating controls: zoom in, zoom out, 2D/3D, locate, layers; quality/aerial/relief move into Layers; status becomes toasts that clear after 4 s; attribution never under the dock; remove the inspect toggle (tap = point; low zoom tap = district) | `expectNoOverlap` + ≤ 5 controls at 390 px; M0.5 land spec still passes |
| M3.4 | Every farm clickable + SG lookup (P4.3, P4.4) | L | new `src/app/api/cadastre/route.ts`, `sg/[code]/route.ts`, `src/lib/cadastre-query.ts`, `tests/cadastre.test.ts`, registry def | bbox ≤ 0.1°/side inside SA, zoom ≥ 13, 9 s timeout, capped payload, 12 h cache; Esri→GeoJSON conversion tested; SG route `^[A-Z0-9]{21}$` (blocks `where` injection), returns geometry; parcel card with copyable SG code | Unit: bbox + ring conversion + bad codes rejected; e2e with mocked route flies to a parcel |
| M3.5 | Measure and profile (P4.5 no-dep, P4.6) | M | new `src/lib/measure.ts`, `tests/measure.test.ts`, `ProfileChart.tsx` | Line (distance, d3-geo) and polygon (shoelace area, ha) drawn on MapLibre events; running figure card with Clear and "Use as photo location"; on a line, 128-sample profile via `queryTerrainElevation` → `groundElevation`, falling back to the baked DEM **and saying so with its 2.3 km spacing**; chart with min/max/climb/steepest slope + SR table | 1 km × 1 km at SA latitude ≈ 100 ha within 2%; sampling/slope units for flat and 45° north planes |
| M3.6 | Site report for any point (P4.7) | L | `src/app/api/climate/route.ts`, new `src/lib/site.ts`, `tests/site.test.ts`, Point card | Slope/aspect from 3×3 samples ~30 m apart; pH/clay/landcover from baked grids with "regional estimate, not a soil test"; extra NASA POWER params (spike names first: `T2M_MAX`, `T2M_MIN`, `ALLSKY_SFC_SW_DWN`); frost/heat months; nearest mapped river/dam/line distance with "a mapped line is not a connection or a water right"; drop the SoilGrids live-lookup path | Synthetic plane tests (flat, 45° north); every shown number render-tested for source |

**QC3 (after M2):** primary metric = **inspect cards missing sourced stats**
(count across all card kinds; target ≥ 30% below QC0's unsourced-number count
with every card ≥ 2 sourced `Stat`s, zero `undefined`/`NaN`). Secondary: texture
coverage test, notices coverage.

---

## Phase M4 — Make it reach

| ID | Task | Size | Files | Do | Check |
|---|---|---|---|---|---|
| M4.1 | Share, farm pages, timeline (P4.11, P4.12) | M | new `src/app/farm/[id]/page.tsx` + `opengraph-image.tsx`, `ShareButton.tsx` | Web Share with copy-link fallback; server-rendered farm page with `generateStaticParams`, SVG district silhouette preview, print stylesheet; decision date **range** labelled "estimate from typical committee timings. Not a promise." | Build lists farm routes; print ≤ 2 A4 pages; date arithmetic test |
| M4.2 | Then and now (P4.9) | M | `AtlasMap.tsx`, `LayersPanel.tsx` | EOX 2016 vs 2024 swipe with `clip-path`, terrain off, both attributions; non-commercial licence noted in About | e2e drags the divider; both years credited |
| M4.3 | Greenness history (P4.8) | M | new `src/app/api/ndvi/route.ts`, `src/lib/ndvi.ts`, `tests/ndvi.test.ts` | ORNL MODIS MOD13Q1, 10 dates/request chunking, reliability-band filtering (spike band names), 30-day cache; "Greenness, not yield." | Chunking/parsing test on a saved fixture |
| M4.4 | Guided stories (P6.3) | M | new `src/content/stories.json`, `src/components/explorer/StoryPlayer.tsx` | JSON camera paths (selection + depth + caption) rendered through the block-registry pattern: "Where the 2020 hectares went", "Rivers and irrigation", "Northern Cape's 15 notices" | Player walks all steps with no missing selection; captions carry sources |
| M4.5 | Reach polish (P6.1, P6.2, P6.4) | M | `scripts/budget.mjs`, new `scripts/contrast.mjs`, `src/app/manifest.ts`, service worker | Budget: three.js and MapLibre in separate lazy chunks; contrast script over all token pairs (AA); full keyboard path; reduced motion turns flights into cuts; installable shell caching posters, layers and the last viewed farm | Budget passes; contrast exits 0; offline test opens the last farm |
| — | **Photos (Phase 5) deferred** | you | — | Not in this plan. When greenlit: P5.0 (Supabase project, SMTP, POPIA review, upload policy) stops and asks for keys — never invented, never committed. | — |

**QC4 (after M3, re-run after M4):** primary metric = **phone first-frame ms**
from the quality/perf harness (target ≥ 30% below QC3's recorded number, with
three.js/MapLibre chunk separation proven). Secondary: a11y failures, overlap
pairs, touch targets, console errors, bundle budget.

---

## Phase M5 — Verifiable adjudication (verifier-first)

Added after the t0–t4 scheme was agreed; its own QC round (QC5). Design: **the
app verifies, the organiser signs.** Two Merkle structures on the Certificate
Transparency model (RFC 6962 domain separation) — a **round tree** over
application leaves, where the applicant's inclusion path is the receipt, and an
**append-only log** over published artefacts (`R` at t0, round roots at t2, the
rubric release at t3), anchored by a signed tree head. No accounts, no
submission intake, no server secrets in the app. Until a real round is
published, `/verify` shows an empty state — never a sample round.

| ID | Files | Check |
|---|---|---|
| M5.0 | `docs/inventions/README.md` (template verbatim + numbering + "updated when a check runs"), `docs/inventions/01-verifiable-adjudication-receipts.md` (attacks, mechanism, prior art with dates — RFC 6962 / Trillian, Helios, VRF sortition, ZK scoring — forbidden uses, measurements), quoting the boundary sentence and flagging the external §1 | A probe check that must fail does fail, then is removed |
| M5.1 | `src/lib/adjudication/canonical.ts`, `hash.ts` — deterministic serialisation, WebCrypto SHA-256, no `node:crypto` | Published hash vectors pass |
| M5.2 | `merkle.ts` — leaf/node domain separation, root, inclusion path, verification, consistency | Valid path passes; altered leaf, altered path, wrong root each fail with a named reason |
| M5.3 | `rubric.ts` — versioned data-driven scorer, deterministic tie-break; reproduces `R = H(rubric_code ‖ weights ‖ scenario_set ‖ salt_r)` | Ranking re-derives from published scores; reordering a score changes the verdict |
| M5.4 | `log.ts`, `signature.ts`, `public/adjudication/log.json` (empty, with a note) | Ed25519 heads verified in-app; unsupported browser says "check unavailable", never passes; tampered entry and wrong tree size rejected |
| M5.5 | `src/app/verify/page.tsx`, `src/lib/adjudication/verify.ts`, `src/app/sitemap.ts` | The three t4 statements run client-side with exact failure reasons, SR tables, nothing leaves the device; e2e: test-vector round verifies, tampered receipt fails loudly |
| M5.6 | `scripts/adjudication/build-round.mjs`, `sign-head.mjs` | Stops and names `ADJUDICATION_SIGNING_KEY` when absent; never writes the key anywhere (**you** supply the key) |
| M5.7 | `scripts/inventions.mjs`, `package.json` `inventions:check` | Runs each record's falsification check, rewrites the Measurements block with date and result like `npm run measure` does for `docs/baseline.md`; two runs leave one block |
| M5.8 | `docs/inventions/02–04` — exploded depth model, raster pipeline, generative-UI route | Each record's check runs green |

**QC5** (after M5, fifth round, same rules as QC1–QC4): primary metric = t4
statements re-derived from a published round — 3 of 3 with a tamper test for
each; secondaries = `/verify` a11y, empty state, no network egress, bundle
within baseline + 15%.

---

## The four QC rounds (bug fixes + quality control, 30% each)

Every round: `npm run check` → `npm run build` → `npm run data:all` (when data
touched) → `npm run quality` → `npm run perf` → `npm run e2e` → `npm run shots` →
record `docs/map-quality-round-N.md` (metrics before/after, files, tests added).
A round fails if the primary metric improves < 30%, any secondary worsens > 5%,
e2e is not green, a changed behaviour has no new test, or the graph reports
orphans.

| Round | After | Primary metric (target: ≥30% better than previous record) | Bug fixes carried in the round (each with a test) |
|---|---|---|---|
| QC1 | M1.1–M1.2 | Overlapping label pairs, phone + desktop, 4 depths | Collisions; Escape dead-end for notice/point; URL hydrate ref hack |
| QC2 | M1.3–M1.7 | Floating controls + chrome overlap pairs at 390 px | `LandLocator` 8 → ≤3 `useState`; unicode-glyph icons; duplicate view switches; mislabelled "Province selector" aria-label; footnote claims vs data |
| QC3 | M2 | Inspect cards missing sourced stats; `undefined`/`NaN` = 0 | Plural bugs ("1 reviewed adverts"); empty/error/too-much states in every card; legend captions |
| QC4 | M3 (re-check after M4) | Phone first-frame ms | Inline `addLayer` in overlay; attribution/status overlap; duplicate accessible names; WebGL error leaks |

**30% is measured, not asserted:** each round's target is `0.7 ×` the previous
recorded value in `docs/map-quality-round-N.md`, with collisions driven toward
zero as the floor.

## Order of work

M0.1 → M0.2 → M0.3 → M0.4 → M0.5 → **QC0 record** → M1.1 → M1.2 → **QC1** →
M1.3 → M1.4 → M1.5 → M1.6 → M1.7 → **QC2** → M2.1 → M2.2 → M2.3 → M2.4 → M2.5 →
**QC3** → M3.1 → M3.2 → M3.3 → M3.4 → M3.5 → M3.6 → **QC4** → M4.1 → M4.2 →
M4.3 → M4.4 → M4.5 → final QC4 re-run. Then M5.0 → M5.1 → M5.2 → M5.3 → M5.4 →
M5.5 → M5.7 → M5.6 (asks you for the key) → M5.8 → **QC5**. One task, one small
diff, one commit where asked.

## Where the new files land (graph rules honoured)

`src/scene/` pure functions (depth, labels, handoff, uv, textures) with unit
tests and thin React wrappers · `src/components/explorer/` shell, sheets,
inspect registry · `src/map/layers/` every Land layer as a `LayerDef`,
`addLayer` nowhere else · `src/state/` remains the only zustand holder ·
`src/app/api/` every external call with SA-bounds validation, ≤10 s timeout,
bounded payload, cache header · `src/content/` and `src/data/` facts only, each
with a source.

---

## Appendix · t0–t4 verifiable adjudication scheme

```
t0  advert opens
    publish  R = H(rubric_code ‖ weights ‖ scenario_set ‖ salt_r)
    append   R to the transparency log; log emits a signed tree head

t1  applicant submits
    leaf_i = H(salt_i ‖ digest(application_i))
    applicant keeps salt_i and receives leaf_i

t2  advert closes
    publish  root = MerkleRoot({leaf_i})
    append   root to the log
    issue    each applicant their inclusion path to root   ← the receipt

t3  determination
    publish  rubric_code, weights, scenario_set, salt_r    (R now verifiable)
    publish  per-criterion scores against anonymised leaves
    publish  ranking

t4  anyone verifies
    H(published rubric inputs) == R                        rubric was not retrofitted
    inclusion path resolves to root                        the application was adjudicated
    rubric_code(scores) == ranking                         the tally is correct
```

Residual trust boundary, stated in PLAN-FRONTIER.md §1 and repeated here because
it matters: the **entry** of a score by a human is not proved by this scheme.
What the scheme provides is attribution, immutability, comparability across a
round and public re-derivation of the tally. The sealed-score proof that would
close the remaining gap is the Research half of PLAN-FRONTIER.md §1.

## Appendix C · Invention record template

One per invention, in `docs/inventions/`. Updated when a check runs, not when a
view changes. (Verbatim from PLAN-FRONTIER.md Appendix C.)

```markdown
# NN · <name>

Readiness · Owner · Last prior-art search (date)

## Attacks
The failure, with the file or source that evidences it.

## Mechanism
How it works, describable without naming a technology.

## New capability
"Before this, ___ could not ___."

## Prior art
What exists, what is closest, and how this differs. With dates.

## Smallest testable version
And the Check that decides it.

## Failure modes
How it breaks, and what we do then.

## Forbidden
What this invention may never be used for, even if asked.

## Measurements
The falsification check, when it was last run, and what it returned.
```
