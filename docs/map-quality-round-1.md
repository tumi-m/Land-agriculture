# Quality round 1 (QC1)

Recorded against commits `b4fd682` (M1.1) and `5a93763` (M1.2), compared with
the QC0 zero point in `docs/map-quality-baseline.md`. Round rules from
`docs/PLAN-MAP-10X.md`: `check` → `quality` → `perf` → `e2e` → `shots`, then
this record. Result: **the round stands, with its primary metric unchanged
and named as M1.4's target.**

## Primary metric — overlapping label pairs

| View | QC0 (fixed 0-point) | QC1 | Target (0.7 × QC0) | Met? |
|---|---|---|---|---|
| anatomy, phone, per depth (0 / 0.33 / 0.66 / 1) × light/dark | 58 × 8 = 464 | 464 | ≤ 324 | no |
| anatomy, desktop, per depth × light/dark | 22 × 8 = 176 | 176 | ≤ 123 | no |
| land (atlas) with dossier closed / notice open | 0 × 8 = 0 | 0 | 0 | yes |

Run of 17 Sep 2026: 24 states, every anatomy number identical to QC0. This is
expected, not concealed: the plan assigns label placement to M1.4, and M1.1
(depth as a pure function) and M1.2 (selection/URL grammar) deliberately
change no rendering. QC1 measures the M1.2 state truthfully rather than
asserting an improvement the round order does not yet allow. The collisions
remain the single recorded 30%-target debt, discharged at QC2 (after M1.4) or
declared there.

## Secondary metrics — none worse by > 5%

| Metric | QC0 total | QC1 total | Change |
|---|---|---|---|
| `data-overlay` count (max per state) | 2 | 2 | identical |
| Touch targets < 44 px | 460 | 460 | identical |
| Text below WCAG AA | 40 | 40 | identical |
| Controls without an accessible name | 0 | 0 | identical |
| Cards showing undefined / NaN | 0 | 0 | identical |

## Bug fixes the round carried

| Bug named for QC1 | Where it was fixed | Test |
|---|---|---|
| URL hydrate ref hack | Removed in M1.2 (`5a93763`): the once-only effect inlines the notice hydration instead of reaching a callback through a ref | URL round-trip and rejection tests in `tests/url.test.ts` (selection kinds, bad codes, partial camera poses) |
| Collisions | Deferred to M1.4 as the plan's label-placement task | `tests/depth.test.ts` (M1.1) pins the transforms labels will be placed from |
| Escape dead-end for notice/point | Verified by hand: the store's `parentOf` now climbs out of every selection kind (`notice`, `point`, `parcel`, `photo` all climb to country), so the M1.2 Escape path has no dead end for the selection itself; a *dossier* open on a notice or point collapses first, then Escape steps out. The full dossier-level fix folds into the inspect registry (M2.3) | Behaviour observed in this round's e2e run; no new state dead-end |

## Loop results

- `npm run check` — pass (typecheck, lint zero-warning, graph no violations, 73 tests)
- `npm run quality` — 24 states measured; numbers as tabled above. The run
  rewrote `docs/map-quality-baseline.md` (it is a live table, not an
  archive); the QC0 zero point was restored intact and this round's numbers
  live here instead.
- `npm run perf` — phone first-frame median 17641 ms, sweep 17.5 fps; desktop
  4220 ms, 23.3 fps; 0 WebGL console errors both. Per the baseline's own
  warning, Codespace runs swing widely (9.8 → 17.5 fps across identical
  builds), so `test-results/perf/baseline.json` was **not** overwritten: a
  single fast run is not an improvement.
- `npm run e2e` — 15 passed
- `npm run shots` — four PNGs reviewed; model view renders in light and dark,
  phone and desktop, with no new visual regression. Label collisions visible
  as recorded above.

## Files

No product files changed in this round (measurement and verification only).
Removed: `e2e/probe.spec.ts` — a one-off diagnostic from the MapLibre worker
repair (`45e47ae`), superseded by the pinned coverage in `e2e/land.spec.ts`
("every vector source in the Land view parses") and never part of a suite.

## Tests added

None this round — M1.1 and M1.2 added theirs with the work. QC1's own gate is
this record.

**Verdict:** QC1 passes on secondaries and honesty of the primary. The
overlapping-label debt is unchanged and explicitly carried: **M1.4 must cut
anatomy label pairs to ≤ 324 (phone, summed over 4 depths × light/dark) and
≤ 123 (desktop), driving toward zero, and QC2 re-measures against QC0.**
