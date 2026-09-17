# Milestone status — for owners claiming work

Recorded 17 Sep 2026 against commit `b48b3be`. The plan and its checks live in
`docs/PLAN-MAP-10X.md`; this page is the live occupancy list so two owners
never edit the same files. Update it in the same commit that starts or lands a
task.

## Occupied — do not touch these files until released

**M1.3 · Scene split and camera** — landed 17 Sep 2026. The committed set:

- `src/scene/` (`camera.ts`, `core.ts`, `labels.ts`, `picking.ts`,
  `pieces.ts`) and `src/components/explorer/ModelView.tsx`
- `src/components/ExplodedMap.tsx` deleted at parity; `LandLocator.tsx`,
  `src/state/explorer.ts`, `src/styles/anatomy.css`
- `.dependency-cruiser.cjs`, `e2e/perf.spec.ts`, `e2e/quality.spec.ts`,
  `scripts/test-explorer.tsx`, `e2e/model.spec.ts`, `tests/camera.test.ts`,
  `tests/explorer.test.ts`

Verified with `npm run check` (149 tests green), `npm run build` green, and a
scripted browser walk on a quiet server: province select enables the slider,
depth 1 separates the model, a district opens four slice labels, Reassemble
returns depth 0, and isolate toggles both ways. The full e2e suite could not
finish on this box while concurrent sessions held the port and saturated the
two CPUs (Chromium crashed with "Target crashed"); the M1.3 spec itself
passes when the machine is quiet. Re-run the full loop at the first QC2 task.

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
