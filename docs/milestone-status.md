# Milestone status — for owners claiming work

Recorded 18 Sep 2026 against the M1.3 landing; reconciled 19 Sep 2026 by the
P00 pass (see "P00 reconciliation" below). The plan and its checks live in
`docs/PLAN-MAP-10X.md`; this page is the live occupancy list so two owners
never edit the same files. Update it in the same commit that starts or lands
a task. The capability roadmap (P00–P28) now lives in
`docs/ASBONGE_IMPLEMENTATION_PLAN.md`; the P/M cross-reference is below.

## P00 reconciliation — evidence recorded 19 Sep 2026

The recovery pass (`docs/ASBONGE_REPOSITORY_RECOVERY.md`) ran in this
Codespace against local `main` at `3d3f481` (one commit ahead of
origin/main `404d91f`):

- **Working tree clean.** No staged, unstaged or untracked files. The
  reported "uncommitted work in an expired session" is not present as
  filesystem work; nothing needed a private backup.
- **M1.3 resolved.** The full scene split exists as local commit `3d3f481`
  (all claimed files present: `src/scene/{camera,core,labels,picking,pieces}.ts`,
  `src/components/explorer/ModelView.tsx`, `ExplodedMap.tsx` deleted,
  `e2e/model.spec.ts`, three scene test files). It was a **push gap**, not
  lost work. Backup branch `recovery/m13-scene-split` now holds it on the
  remote. Origin/main stays at `404d91f` until the owner says push.
- **Stash `M1.3 wip` is subsumed** by `3d3f481` (every overlapping file
  byte-identical). Kept, not dropped.
- **Branches need no merge.** `origin/codex/agriculture-experience` has zero
  commits not on main (an ancestor). The session branch had two unique plan
  commits whose content was already copied byte-identical onto main by
  `918ec16`.
- **Isolated verification on `3d3f481`** (2-core Codespace, Node 24.20.0,
  no concurrent builds): results recorded below in "P00 checks actually run".

### P/M cross-reference (capability plan → this ledger)

| Capability plan | Existing M tasks | State |
|---|---|---|
| P00 reconcile | (this pass) | complete 19 Sep 2026 |
| P01 feed safety | none — new slice | next: `src/lib/source.ts`, `src/lib/types.ts` |
| P11 store/URL wiring | M1.2 (codecs) done; integration open | `LandLocator.tsx` |
| P15 budgets + initial-load resilience | M0.3–M0.5, QC1 done; initial-imagery debt open | `e2e/land.spec.ts`, Land view |
| P16 terrain/scene | M1.3 landed; M1.4–M1.7, M2.1 open | scene set |
| P04/P06/P13 notices + cadastral | M2.5 owns files | unclaimed |
| P19 soil honesty | M2.2 data done; UI wiring open | inspect cards |
| P26 verifier trust | M5.0–M5.5 done; log binding open | `/verify` |

### P00 checks actually run (19 Sep 2026, this 2-core Codespace, Node 24.20.0)

- `npm run check`: green — typecheck, lint, graph, 150/150 unit tests.
- `npm run build`: green — `/` 85.3 kB route size, 188 kB First Load JS
  (historical baseline row 197.1 kB preserved untouched in `docs/baseline.md`).
- `npm run budget`: green — `/` first-load 185.4 kB gzip of the 230 kB limit.
- `npm run e2e` (full, isolated): 18 passed, 4 failed — `e2e/model.spec.ts:11`,
  both light screens baselines, `e2e/shots.spec.ts`.
- Reruns confirm the **software-GL stall**, not regressions: model:11 passes
  alone (as the M1.3 note records), the screens failures are screenshot
  compositing timeouts (`net::ERR_ABORTED` / 20 s timeout), and shots died
  mid-screenshot. The failing set differs run to run. Three of four shot
  PNGs were captured today with healthy rendered content (variance-checked;
  the owner should still eyeball `test-results/shots/` — the agent could not
  view them). This box had ~400 MB free RAM during the run; QC2 on a machine
  with more cores and memory remains the gate for these four.
- No application logic changed in this slice. Baselines preserved.

**Owner decisions recorded:** the M1.3 commit is backed up on
`origin/recovery/m13-scene-split`; origin/main stays at `404d91f` until the
owner says push (Vercel may auto-deploy main).

## Occupied — do not touch these files until released

**M1.3 · Scene split and camera** — landed 18 Sep 2026 in local commit
`3d3f481` (not yet on origin/main; backed up on
`origin/recovery/m13-scene-split`). **P00 reconciliation confirmed the files
exist on this tree and are internally consistent** — the remote review at
`404d91f` saw none of this because the commit was never pushed, not because
the work was lost. The committed set:

- `src/scene/` (`camera.ts`, `core.ts`, `labels.ts`, `picking.ts`,
  `pieces.ts`) and `src/components/explorer/ModelView.tsx`
- `src/components/ExplodedMap.tsx` deleted at parity; `LandLocator.tsx`,
  `src/state/explorer.ts`, `src/styles/anatomy.css`
- `.dependency-cruiser.cjs`, `e2e/perf.spec.ts`, `e2e/quality.spec.ts`,
  `scripts/test-explorer.tsx`, `e2e/model.spec.ts`, `tests/camera.test.ts`,
  `tests/explorer.test.ts`, `tests/scene-core.test.ts`

Verified with `npm run check` (150 tests green), `npm run build` green, and
`npm run shots` green. The full e2e suite reads 20/22 on this 2-core box:
`e2e/model.spec.ts:11` and one screens baseline fail, and both pass when
run alone. Chasing those two isolated the cause to Chromium's software-GL
frame scheduler: under `--use-angle=swiftshader` it stalls permanently (or
the renderer crashes with "Target crashed") at random points once the WebGL
scene is mid-interaction, so Playwright actionability and screenshot waits
never see a frame. It reproduces against both `next dev` and `next start`,
with and without antialias and shadows. Three real faults came out of that
chase and are fixed in this commit: the camera bar's `backdrop-filter`
livelocked headless screenshot compositing over the live canvas (it is now
a plain opaque panel), the ResizeObserver rebuilt the GL surface on no-op
resizes (now skipped), and software rasterisers now skip antialias and
shadows so cheap devices and CI get frames they can actually produce
(`softwareRenderer` in `src/scene/core.ts`, pinned in
`tests/scene-core.test.ts`). QC2 should re-run the full loop on a machine
with more cores and confirm the two flaky specs are green there.

**M5.3 · Rubric scorer** — landed 17 Sep 2026. The committed set:

- `src/lib/adjudication/rubric.ts`, `tests/adjudication-rubric.test.ts`

Verified at unit level: the ranking re-derives from published scores,
reordering a score changes the verdict, ties break on the leaf digest, and
the commitment moves with each input (`npm run check` green).

**M5.4 · Append-only log + signature** — landed 17 Sep 2026. The committed
set:

- `src/lib/adjudication/log.ts`, `src/lib/adjudication/signature.ts`,
  `public/adjudication/log.json`, `tests/adjudication-log.test.ts`

Verified at unit level (132 tests, `npm run check` green). `build`/`e2e`/
`shots` were skipped in this commit because a concurrent M1.3 loop shares the
workspace and two `next build` runs clobber `.next`; M5.4 adds no UI. Re-run
the full loop with M5.5, which mounts the first page that uses these modules.

**M2.2 · District statistics pipeline** — landed 17 Sep 2026. The committed
set: `scripts/data/district-stats.mjs`, `src/data/district-stats.json`,
`tests/district-stats.test.ts`, and the additive `district-stats` node in
`scripts/pipelines.json`. 52 districts, every stat with source, date and
resolution; `npm run check` green with 6 new tests. `build`/`e2e`/`shots`
skipped as for M5.4: data-only, no UI, and a concurrent M1.3 loop holds port
3100. QC3 and M2.3 exercise it.

**M5.5 · The three t4 statements on /verify** — landed 17 Sep 2026. The
committed set:

- `src/lib/adjudication/verify.ts`, `tests/adjudication-verify.test.ts`
- `src/app/verify/page.tsx`, `src/app/verify/ReceiptChecker.tsx`,
  `e2e/verify.spec.ts`, `src/app/sitemap.ts`

Verified with `npm run check` (149 tests green), `npm run build` green
(`/verify` 5.57 kB, 112 kB First Load JS), and `e2e/verify.spec.ts` 4/4 green
on a warm server: empty state (never a sample round), a generated test vector
passes 3 of 3, a tampered total fails loudly with its reason, and unreadable
text is refused with a message. The mixed-tree full suite was not a clean
signal while M1.3 staged its refactor in the same working tree (see M1.3's
note); the first single-task QC2 run should re-run the full loop.

**Baseline tooling fixes** (not a plan task; from the 17 Sep tooling review) —
committed 17 Sep 2026 in its own commit. Owns:

- `scripts/quality.mjs` (baseline write gated behind `--write-baseline`),
  `scripts/measure.mjs` (truthful Pass/Fail, no write on failure),
  `scripts/budget.mjs` + `scripts/budget-baseline.mjs` (new; the limit reads
  from `docs/baseline.md`'s budget row instead of a constant),
  `package.json` (`quality:baseline` script)

## Free to claim now — no overlap with the locked set

| Task | Scope | Files it owns |
|---|---|---|
| M2.5 | Notices + cadastral match | `scripts/notices/*`, `src/content/notices/*`, `docs/data/match-report.md` |

M1.3 has landed, which frees M1.4 (label placement), M1.5 (explorer shell),
M1.6 (search and outline), M1.7 (poster and first run), M2.1 (textures on the
slices), M2.3 (inspect card registry) and M2.4 (layers panel, lenses). Claim
each from `docs/PLAN-MAP-10X.md`'s Files column, one at a time and in that
order; M2.3 and M2.4 also wait on M2.1's `pieces.ts` edits.

## The plan order still applies

- M3 and M4 follow the plan's order of work (`docs/PLAN-MAP-10X.md`).
- M5.6 is the one task that will stop and ask for the organiser's key
  (`ADJUDICATION_SIGNING_KEY`).

## How to claim

1. Say which task and which files before the first edit, in the task thread.
2. If a needed file is in the locked list, wait for M1.3 to land, then rebase.
3. The loop after every change: `npm run check`. Before a commit:
   `npm run build && npm run e2e && npm run shots`, then look at the PNGs.
4. Standing rules apply (`AGENTS.md`): no invented data, every number carries
   source and date, secrets from the environment only, one task one small
   diff.

## Current phase state (checked against the tree, not assumed)

| Phase | State |
|---|---|
| M0, M1.1–M1.3 | committed |
| M1.4–M1.7, M2 except M2.2, M3, M4 | open |
| M2.2 | committed |
| M5.0–M5.2 | committed (`b48b3be`) |
| M5.3 | committed |
| M5.4 | committed |
| M5.5 | committed |
| M5.6 | will stop and ask for `ADJUDICATION_SIGNING_KEY` |

## Landed 19 Sep 2026 — four correctness slices

Applied from the 19 September patch series onto `b5f2dad`. The series was
written against `404d91f`, before the M1.3 scene split reached the remote, so
two of its assumptions were stale and are recorded here rather than carried:

- **Its ledger commit was dropped.** It declared M1.3 "claimed but not in this
  repository" and told owners not to rebuild it. The P00 pass above had already
  resolved that: M1.3 was a push gap, is commit `3d3f481`, and is on main.
  Applying the commit would have written a falsehood into this file. Its other
  change — the stale baseline lint note — `b5f2dad` had already made.
- **Two conflicts in `LandLocator.tsx`**, both because M1.3 wired `depth`
  through the URL while the series rewrote the reader and the writer. Resolved
  by keeping both: `applySelection` and `mergeUrlSearch` now carry `depth`.

### The slices

**P01 · Feed safety** — `src/lib/source.ts`, `src/lib/types.ts`,
`LiveStatus.tsx`, `ParcelCard.tsx`, `tests/source.test.ts` (12 tests).
A feed record needs an id, a title, a known province, a point inside South
Africa and an extent above zero, or it is dropped and counted. An unstated
status is `unknown` and reads "Status not stated" — it no longer becomes
`open`, which advertised an application window nobody published. Only http(s)
links survive. 10 s timeout, 2 MB cap, 500-record cap. A configured feed that
fails says "Advert feed unavailable" with its reason.

**P11 (part) · The link carries the selection** — `src/state/url.ts`,
`LandLocator.tsx`, `tests/url-merge.test.ts` (5 tests), `e2e/land.spec.ts`.
`mergeUrlSearch` owns seven keys and leaves the rest of a link alone. A notice
click selects the notice; a point click selects the point. One
`applySelection` serves first paint and `popstate`.
Still open: the writer replaces the history entry rather than pushing one, so
Back still leaves the page, and no renderer consumes `layers` or `cam`.

**P15 (part) · The Land view survives failing imagery** — `AtlasMap.tsx`,
`e2e/land.spec.ts`. Map setup moved out of the `load` handler into a `setup()`
that runs on `load` or on an 8 s watchdog, whichever is first. MapLibre only
fires `load` after a visually complete render, so failing tiles used to hold
the boundaries, notices and controls with them.

**M2.5 (first half) · The rest of the 2026 index** —
`src/content/notices-2026.json` (27 records), `farm-notices.ts`,
`notice-coverage.json`, `LandDossier.tsx`, `LandLocator.tsx`,
`tests/notices.test.ts` (7 tests), `scripts/test-explorer.tsx`.
22 notices in four provinces become **49 in all nine**. Four documents are
excluded with a stated reason. Three notices print their own coordinates and
carry them; `placedBy` records what placed every indirectly located farm.
Two follow-ons this tree needed and the series did not carry:
`src/data/district-stats.json` is derived from the notices and was rebuilt
(49 notices, 2 awaiting a district, 2 parcels), and `scripts/pipelines.json`
did not list `notices-2026.json` among the district-stats inputs, so the DAG
would have skipped that rebuild. Both are in the commit.
Still open: the cadastral matching half. Mapped boundaries stay at two.

### Checks actually run (19 Sep 2026, 4-core sandbox, Node 22.22.2)

- `npm run check`: **green** — typecheck, lint, graph, **174/174** unit tests
  (150 on `b5f2dad` plus the 24 these slices add).
- `npm run build`: green. `npm run budget`: green — `/` first-load 189.8 kB
  gzip of the 230 kB limit, up from 185.4 kB.
- `npm run e2e`: **19 passed, 4 failed.** Both new assertions pass: the
  country-scale tap writes `at=point:lng,lat`, and imagery blocked from the
  first request still leaves parsed boundaries and a stated reason.
- `npm run shots`: green, and the four PNGs were reviewed.

**The four e2e failures, each checked against `b5f2dad` in the same sandbox
rather than assumed:**

1. `land.spec.ts` "a district tap inside a province selects the district" —
   **fails on main here too**, earlier in fact (the vector sources never
   finish loading). This sandbox cannot reach the tile services reliably.
   Environmental, not a regression.
2. `screens.spec.ts` phone-dark and desktop-dark — **fail on main here too**,
   at the same 0.24 pixel ratio. The sandbox's Chromium is build 1194
   (141.0.7390.37); Playwright 1.63 pins 1243, and the binaries had to be
   bridged to run at all. Left untouched: regenerating them would bake a
   non-pinned browser's dark rendering into the repo.
3. `screens.spec.ts` phone-light — **the one real visual change.** 0.03 of
   pixels, just over the 0.02 tolerance, and the diff is entirely the province
   advert labels and the government-land chip reading 49 where they read 22.
   phone-light *passed* on main with this same bridged browser, so this state
   renders the same here as on the pinned build; the baseline was regenerated
   for that state only and re-run twice to confirm it is stable.

QC2 on a machine with the pinned browser and working network should re-run the
full suite and confirm 1 and 2.

### Two defects found while verifying, neither introduced here

- **Hydration mismatch on `/`.** "Hydration failed because the server rendered
  text didn't match the client" fires on first load. Reproduced identically on
  `b5f2dad`, so it predates this series. Unowned; worth a slice of its own.
- **Phone labels overlap badly.** The reviewed `phone-light.png` stacks
  Limpopo, North West, Mpumalanga, Northern Cape, Western Cape and Natal over
  each other. This is the known M1.4 defect, and these notices make it more
  visible: more provinces now carry advert counts to draw.

## Landed 19 Sep 2026 — T3 (part): Back stops leaving the page

`src/state/url.ts`, `src/components/LandLocator.tsx`, `tests/url-merge.test.ts`
(6 tests), `e2e/model.spec.ts`.

Every URL write replaced the current history entry, so the first Back left the
site — measured, not inferred: with the change reverted, Back lands on
`about:blank`.

`isNavigation(previous, next)` is the whole decision, and it is pure: a change
of `at` or `view` is a place and gets its own entry; the measure, the depth and
the camera pose adjust the same place and replace, so a slider drag leaves one
entry rather than one per tick. The first write of a session replaces, so
arriving on a link leaves nothing behind the page you arrived on.

The trap, and the reason `written` is a ref: `popstate` adopts the restored
entry *before* the debounced write runs. Without that the write would see a
changed place, push a new entry, and Back would land where it started and
never leave. `popstate` also restores `depth` now, which it previously read
and dropped.

**Checks:** `npm run check` green, 180/180 (174 + 6). `build` and `budget`
green — 189.9 kB of 230 kB. The new e2e walks country → province → district,
presses Back twice, and asserts the app is still there; it was run against a
reverted writer first to confirm it fails (`about:blank`), then the probe was
removed.

**Still open in T3**, and deliberately not started here: `cam` is emitted by
the codec but nothing writes it — `setCamera` exists in the store and no
component calls it, so the Land camera pose is neither captured on `moveend`
nor restored on load. That needs MapLibre, and the check for it ("a land link
with `cam=` reopens at that pose") needs working tile services, which this
sandbox does not have. The plan's point step in the Back walk is deferred for
the same reason; the walk here is model-only.

## T2 (cadastral matching) is blocked in this environment, not skipped

The CSG MapServer that `src/lib/cadastre.ts` points at refuses connections
from this sandbox (immediate failure, not a timeout). Matching 49 notices to
cadastral parcels cannot be done without querying it, and Rule 1 forbids
writing matches that were not read from the service. T2 needs a machine that
can reach `dffeportal.environment.gov.za`. Mapped boundaries stay at two.

## Landed 20 Sep 2026 — T4, T3 and M1.4

**T4 · The map keeps its layers when a toggle changes** — `src/map/layers.ts`,
`src/components/InfrastructureOverlay.tsx`, `tests/map-layers.test.ts`.
The plan framed this as moving inline `addLayer` calls into the registry.
`AtlasMap` was already clean (the grep hit was a comment); the real find was
that the effect creating three sources and three layers was keyed on the
toggles, so every rivers/power switch tore all six down and rebuilt them —
a flicker, and it discarded tiles the map had already rasterised. Layers now
belong to the map; toggles only change the data in them. The specs moved to
the registry as three `LayerDef`s carrying the credit, licence and date the
inline versions only half-carried.

**T3 (second half) · A shared land link opens where the sharer was looking**
— `AtlasMap.tsx`, `LandLocator.tsx`, `tests/url-merge.test.ts`.
`cam` had round-tripped through the codec since M1.2 with nothing writing
one: `setCamera` had no caller. The map now reports its pose on `moveend`
and is *built* at an arriving pose rather than flown to it. T3 is complete.

**M1.4 (T5) · Labels stop stacking** — `src/scene/labels.ts`,
`ModelView.tsx`, `src/styles/anatomy.css`, `e2e/helpers/overlap.ts`,
`tests/labels.test.ts`, `e2e/labels.spec.ts`.
`placeLabels` is greedy by rank (selected → hovered → area), ties broken on
id so a frame always resolves the same way and labels cannot flicker between
two equally good arrangements. Overflow becomes a dot that keeps a 44 px
target and its name in the accessible tree. `clampLabelPoint` pulls edge
labels back on stage. The notice sub-line is gone at country scale, where it
doubled the height of nine labels already competing for the same space.

Three faults came out of building it, none of which a unit test would have
caught:

- A dot's 44 px target is mostly transparent, and it was **swallowing taps
  meant for a full label underneath**. Dots now sit at `z-index: 2`, under
  the labels that won their place. The e2e caught this, not review.
- `panels.css` carries `.anatomy-stage .anatomy-label` and loads after
  `anatomy.css`, so a plain `.anatomy-label.is-dot` tied on specificity and
  lost on order: dots kept `font-size: .875rem` and their **names spilled
  across the map as loose text**. The box-level overlap assertion could not
  see it — the boxes were 44 px and correct; only the screenshot showed it.
  The dot rules now match that depth, with `overflow: hidden` behind them.
- Measuring a dot would say it fits, which would turn it back into a name,
  which would collide, which would turn it back into a dot. Sizes are cached
  from the full form only, so that loop cannot start.

`expectNoOverlap` now skips fully transparent elements: the model parks
unused labels at `opacity: 0` rather than unmounting them, and counting
those was reporting collisions nobody could see.

**Checks:** `npm run check` green, 200 tests. Build and budget green.
`e2e/labels.spec.ts` asserts no two readable labels overlap at 390 px and
1440 px across depths 0, 0.33, 0.66 and 1, and that an overflow dot stays a
named, enabled, 44 px control. Screenshots reviewed.

**Known and not fixed here:** a label can still pass under a floating
control — "Limpopo" sits beneath the Orbit button at 390 px. That is
label-versus-chrome, which is the explorer shell's scope
(`[data-overlay], [data-chrome]`), not label-versus-label.

**Still blocked:** T2 cadastral matching. The CSG MapServer refuses
connections from the sandbox this ran in, and matching without querying it
would mean inventing data. Mapped boundaries stay at two.

## Fixed 27 Sep 2026 — the homepage was throwing away its own server HTML

CI had been red on `a7602db` for a week: the two dark screenshot baselines.
Chasing why the sandbox rendered the dark state as a light page led to a
production defect, not a test one.

**The fault.** `GovernmentNotices` rendered two kinds of text that the
server and the browser compute differently:

- **Clock-dependent.** "N with a deadline ahead", the per-notice
  "Deadline ahead" / "Past advert" badge and the "deadlines have passed" note
  were judged against `Date.now()` during the server render. `/` is static
  and revalidated, so the server's clock can be well behind the reader's;
  whenever a deadline passed in between, the two disagreed.
- **Runtime-locale-dependent.** `toLocaleString("en-ZA")` formatted
  21.4154 ha as `21,4` in Node and `21.4` in Chromium. The ICU data each
  runtime ships disagrees for en-ZA, so this mismatched on *every* load for
  any visitor whose browser differs from the server — Safari, Firefox, older
  Chrome, Samsung Internet.

React answers a hydration mismatch (minified error #418) by discarding the
server-rendered tree and drawing the whole root again on the client. That
threw away the SSR work, flashed the layout, and reset `<html>`'s class — so
the `dark` class the pre-hydration script had added was lost, and visitors
who prefer dark got a light page. Dark mode was a casualty, not the bug.

**Why CI never showed it.** CI builds and tests within minutes on one
Chromium whose en-ZA data happens to match Node's. The sandbox had a week-old
build and an older Chromium, so it hit both causes at once. An earlier entry
here called the dark failure a sandbox artifact; that was wrong — it is real,
and browser-dependent.

**Found by** installing a fake browser clock a month ahead of the server in
a dev build, which makes React name the mismatching text instead of throwing
the minified error. Two mismatches surfaced, one at a time.

**The fix.**

- Clock-dependent notice text waits for `useMountedNow`, the hook the repo
  already had for exactly this. The first paint carries only what is true at
  any instant; the counts and badges arrive a frame later. `GovernmentNotices`
  takes an optional `now` so the judged state can still be tested.
- Every runtime-locale format in components goes through new deterministic
  helpers in `src/lib/format.ts`: `decimal`, `rand`, `sastDate`,
  `sastDateTime`. South Africa is UTC+2 all year, so deadlines read in SAST
  with a fixed offset — the same string on a server and a browser in any
  zone. Six call sites across four components.
- **A lint gate.** `format.ts` already said Intl was forbidden for this
  reason, in a comment, and six call sites had drifted past it. ESLint now
  rejects `toLocale*String` and `new Intl.*` in `src/components` and
  `src/app`, with a message naming the replacements. Proven to fire on a
  probe file, then the probe was removed.

**Tests.** 204 unit tests. The two notice tests had asserted that the
*server* render contained the time-dependent claims — pinning the bug in
place. One now asserts the opposite invariant: the server render makes no
clock-dependent claim. The original intent (an expired deadline reads as
expired, never as available) is kept and judged at a fixed instant through
the `now` prop. The singular/plural test had matched a trailing space that
came from the deferred count; it now matches the rule, not the punctuation.

**Verified.** With the browser clock a month ahead, a dev build reports no
hydration mismatch. A production build now keeps `dark` through hydration
(`rgb(14, 21, 19)` for both a system preference and a stored one). All four
screenshot baselines regenerated against a fresh server — dark ones for the
first time from a page that is actually dark — and pass twice more with no
retries.

**Sandbox note for the next person.** `pkill -f "next start"` matches the
shell running it and kills that shell; every unexplained exit 144 in this
log was that. Use `pkill -f "[n]ext start"`. And with
`reuseExistingServer: true`, a server left on port 3100 silently serves
whatever build it started with — kill it before trusting a local e2e run.

## Landed 27 Sep 2026 — the model's slices now say something

Pick a district and the Land, Soil or Water slice, and the panel used to
show one static sentence about what the slab represents. The measurements
for all 52 districts were already baked in `src/data/district-stats.json`
and nothing read them.

**The district card** — `src/components/explorer/DistrictLayerCard.tsx`,
`src/lib/district-data.ts`, `src/styles/district-card.css`,
`tests/district-data.test.ts`, `tests/district-card.test.tsx`.

- **Land:** the dominant cover in words ("Mostly grassland — 87% of the
  district"), a stacked WorldCover bar with a direct legend (classes under
  2% folded into "Other"), area and average height with its range.
- **Soil:** pH to one fixed place with its band in words, on a 4–9 scale
  painted with the raster's own ramp; clay percentage on the clay ramp.
- **Water:** mean yearly rainfall on a national 0–max scale, with the band
  the middle 80% of the district's land falls in (spatial p10–p90 of a
  1991–2020 average, not year-to-year variation — the caption says so).
- Each figure is ranked against the other 51 districts ("Wetter than 14 of
  the other 51 districts"), ties sharing a place.
- Every block carries source · date · resolution · licence from the stats
  file, and each slice ends with what the numbers cannot tell you: cover is
  not ownership or leasability, a 250 m soil average is not a soil test,
  rainfall is not a water-use licence.
- `WORLDCOVER` and `RASTER_RAMPS` moved into `src/design/ramps.ts`, pinned
  by test to `scripts/data/raster-colors.json`, so a colour on the card and
  the same value on the map cannot drift apart.

**Slice links work.** The URL grammar had accepted `at=layer:…` since M1.2
and nothing applied it: the open slice was local state, so a shared Soil
link opened on Government land. The slice is now read from the store,
`LandLocator` applies layer links, and choosing a slice writes one. Reading
another slice of the same district replaces the history entry (Back leaves
the district, not each slice read); moving to a neighbour keeps the slice,
so the card's numbers travel from one district to the next.

**Motion** — `src/lib/useTween.ts`, `src/styles/motion.css`, the card CSS,
`ModelView.tsx`. Each movement answers "what changed":

- Figures count to their value and glide between districts; scale needles
  sweep to the reading; the land-cover bar wipes in and its segments resize
  in place; the rainfall band opens outward from the mean.
- The heading rises word by word when the level changes; the panel slides
  in from its edge; notice cards arrive in reading order.
- On first load the provinces settle onto the floor west to east.
- The moving copy of every figure is `aria-hidden`; the final value is in
  the accessible text once. Under `prefers-reduced-motion` all of it is off
  and the page is simply in its final state, the WebGL entrance included.
  The screenshot spec now emulates reduced motion, so baselines are the
  settled page rather than wherever a timer caught the entrance.

**Checks:** 222 unit tests, typecheck, lint, build, budget (191.1 of 230 kB
— the card ships in the lazily loaded model chunk). Full e2e against the
production build: 26 of 27 pass; the failure is `land.spec` "a district tap
inside a province selects the district", which needs map tiles this sandbox
cannot reach and passes in CI. A new e2e, run with the model and screen
specs afterwards (all pass): a slice link opens that slice's measurements,
and switching slice adds no history entry. The four screenshot
baselines pass unchanged. Card reviewed at 1440 px and 390 px.

## Landed 28 Sep 2026 — round 1: one bar, and a grid over the model

**The bar.** Above the stage there were three stacked bars — page title with
the measure switch, the view switch, and the map actions — so the stage ran
past the fold and the model's own console was cut off on a 1440×900 screen.
They are one row now (`.explorer-bar` in `LandLocator.tsx`): the title, a
segmented view switch whose thumb slides to the chosen view, and on the land
views the measure and map actions. On a phone the title steps back to screen
readers and the switch takes the row. The stage is sized to what is left of
the viewport (`--header-h`, `--bar-h` in `src/styles/shell.css`).

**The HUD.** Every control on the model stage was absolutely positioned on
its own, and they took turns covering each other: on desktop the dock hid
the fourth zoom tool; on a phone the camera switch sat over the zoom tools
and the hint text. They now live in one CSS grid (`.anatomy-hud`) with a
named area each, so two cannot occupy one place at any width. On a phone
the camera presets move into the controls sheet, the duplicate "View real
terrain" leaves the dock (the bar's "3D terrain" is right above), and the
dossier and the controls share one sheet area above the dock.

**Also fixed on the way:**
- The district name dropped out of the breadcrumb below 1100 px.
- The sheet-aware camera framing measured the open panel in page
  coordinates and the stage in its own, so the model was framed against a
  panel a header's height from where it really was.
- Header targets (theme toggle, brand, route link) are 44 px.
- The kicker "Explore the land, layer by layer" repeated the page title and
  is gone; the relief attribution moved to the stage's bottom edge.

**Measurement corrections.** `e2e/helpers/quality.ts` counted text at
opacity 0 (parked slice labels) and overflow dots (names kept at font-size 0
for screen readers) as colliding text, and measured text on the dark stage
against the white page because the stage background is a gradient. Both
fixed. Latest run: text overlaps 464 → 0, low contrast 72 → 0, small
targets 668 → 428; what remains is almost all in the land view.

**Checks:** `npm run check` green (222 tests), build and budget (191.2 of
230 kB). Full e2e against the production build: 23 pass; the four screen
baselines failed as intended and are regenerated (and pass again with no
retries); the fifth failure is the tile-dependent `land.spec` tap that
passes in CI.

## Landed 28 Sep 2026 — round 2: bugs from the audit

- **Land-view notice groups piled into a stack.** At country zoom two
  dozen district notice groups and nine province names drew on top of each
  other. They now go through the same greedy placement the model uses
  (`placeLabels`), moved into `src/lib/placement.ts` so the map can use it
  without pulling three.js; `src/scene/labels.ts` re-exports it. Losers
  become 44 px dots that keep their names for screen readers. Exact
  cadastral parcels outrank province names, which outrank notice groups.
- **Land-view controls sat on each other.** The tile-error notice covered
  "Click to inspect"; the readout ran under the attribution; on a phone the
  navigation stretched across the map and the credits covered the aerial
  button. The land view now has the same kind of grid HUD as the model
  (`.terrain-hud`), the navigation is two columns on a phone, and while the
  credits are expanded (until the first drag) the bottom row stands above
  them.
- **The "sandbox-only" land e2e failure was a real bug.** Its log said the
  sticky header intercepted the click on "Click to inspect": the stage ran
  past the fold, so the control scrolled under the header. With the stage
  fitted under the bar (round 1) it passes here too.
- **Reassemble at country scale** wrote a province selection holding null
  (a non-null assertion on `selected`), which the URL carried as
  `province:null`.
- **Compare view** cut off the tallest bar at the top of a viewport-sized
  stage, and its reset landed closer than the intro; both stand back by the
  same `pullFor(width)`. Its province labels declutter the same way on a
  phone.
- **Targets:** model labels, slice labels, breadcrumb, sliders, the land
  browser's filter, search and source link are 44 px.

**Checks:** 222 unit tests, build, budget (191.2 of 230 kB), full e2e
28/28 against the production build. Quality harness: small targets
428 → 88; what remains is the hidden skip link and the map's inline credit
links.

## Landed 28 Sep 2026 — round 3: a stage you stand in

All in `ModelView.tsx`, `src/design/ramps.ts` (`SCENE.fog`, `SCENE.glow`)
and `src/styles/shell.css`; everything that moves is off under
`prefers-reduced-motion`.

- **The opening shot.** On first load the camera glides in from high over
  the west while the light rises and the provinces settle, and lands on the
  same ¾ view it used to start at. It is an ordinary camera flight, so any
  drag, zoom or preset cancels it; the mount effect that re-frames the same
  place no longer cuts it short.
- **Sunrise.** The sun swings up from a low angle over 2.4 s, so shadows
  sweep across the relief.
- **A floor, not a tile.** The ground grid is twice as wide and fades into
  a fog matched to the backdrop. The fog is measured from what the camera
  is looking at: fixed distances fogged the whole country on a portrait
  phone, where the camera stands much further back — the regenerated phone
  baseline caught it before it shipped.
- **A pool of light** under the country and a soft vignette at the stage
  edges keep the eye on the land.
- **Hover lift.** The province (country view) or district (province view)
  under the pointer rises slightly and glows, so what a click will pick is
  visible before the click. Added to the lerp target, not the position.

**Checks:** 222 unit tests, build, budget unchanged at 191.2 kB (all of
this is in the lazily loaded model chunk). Full e2e: 26 pass, the two phone
baselines failed as intended; all four regenerated after the fog fix and
the layout-sensitive specs re-run green.
