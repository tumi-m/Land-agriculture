# Phase 0.6: Cloud Builder alignment — execution plan

User request: plan a 10x improvement in all aspects per the Cloud Builder standard.
Audit done (read-only). Gaps found: devcontainer cold start, zero-warning lint,
two-speed e2e, single-test runs, a single measure command, an undeclared data
pipeline DAG, and an engine↔registry parity gap. Approved decisions: implement
now after recording the phase in docs/PLAN.md; include CB6; Dockerfile only
(no GHCR publish).

## Deliverables

### Record the phase (do first)
- Insert "Phase 0.6: Cloud Builder alignment" in docs/PLAN.md after Phase 0.5,
  tasks CB1–CB7 in the file's task style, with an audit note: what the standard
  already holds (non-negotiables, loops, graph, generative-UI registry) and the
  seven gaps.

### CB1 · Devcontainer cold start · S
- Files: new `.devcontainer/Dockerfile`; edit `.devcontainer/devcontainer.json`.
- Do: gdal-bin and poppler-utils install in a Dockerfile `RUN` (layer-cached,
  survives npm lock changes); devcontainer references `build.dockerFile`;
  postCreateCommand becomes `npm ci && npx playwright install --with-deps
  chromium && npm run hooks`. No image publication.
- Check: postCreate no longer calls apt-get; a rebuild of the container layer
  doesn't redo gdal/poppler. Record before/after rebuild notes in baseline.md.

### CB2 · Zero-warning lint · S
- Files: `src/components/LandDossier.tsx`, `src/components/LandLocator.tsx`,
  `package.json` (lint script).
- Do: remove the two unused imports (NOTICE_CHECKED, NOTICE_INDEX,
  FARM_NOTICES); extract the `point.coordinates` expression in LandDossier's
  useEffect dependency into a variable per the lint's own suggestion; lint
  script becomes `eslint src --max-warnings 0`.
- Check: `npm run lint` exits 0 with no output; `npm run check` still passes.

### CB3 · Two-speed e2e · S
- Files: `package.json` scripts.
- Do: `e2e:fast` runs smoke + chrome specs only (the fast half of the loop);
  `e2e` keeps the full 9-test suite for ship/CI.
- Check: `npm run e2e:fast` passes in well under half the current 3.9 min.

### CB4 · Single-test runs · S
- Files: `scripts/test.mjs`.
- Do: accept an argv substring filter; when given, only test files whose path
  matches are bundled and run. No filter keeps today's behaviour.
- Check: `npm test -- format` runs exactly one file in under 2 s; bare
  `npm test` still runs 31 tests.

### CB5 · `npm run measure` · S
- Files: `scripts/measure.mjs` (new), `package.json` script.
- Do: run the four fast checks with wall-clock timing, read the bundle size
  from the last build's manifest, and rewrite the check table in
  docs/baseline.md with a date stamp (update in place, never append).
- Check: two consecutive runs produce one table, second run has fresh date.

### CB6 · Explicit data DAG · M
- Files: new `scripts/pipelines.json`, new `scripts/run-pipeline.mjs`,
  `package.json` script `data:all`.
- Do: declare the build-time pipelines as a DAG:
  nodes = build-topo (outputs src/data/sa-districts.topo.json),
  build-dem (outputs public/data/sa-dem.png + .json);
  edges = none today (parallel), the structure accepts P2's raster → stats →
  district-stats chain. Runner executes in topological order, hashing each
  declared output and skipping a node whose inputs' hashes are unchanged
  (hash manifest in .pipeline-cache/, gitignored). Each node's command comes
  from the JSON, not the runner.
- Check: `npm run data:all` runs both pipelines; an immediate second run
  reports both skipped; editing sources.json-like input forces a re-run.

### CB7 · Engine↔registry parity test · S
- Files: new `tests/block-parity.test.ts`.
- Do: enumerate every `kind` the pathfinder engine can emit (from the Block
  type union and, where the engine constructs blocks, from the constructors)
  and assert BlockView renders each sample block with meaningful output and
  no "undefined", "NaN", or empty string in the markup.
- Check: test passes; deleting a BlockView case (probe) fails it; probe removed.

## Constraints honoured
- No new npm dependencies (all work uses existing tooling).
- No product behaviour changes; data files untouched (CB6 only adds runners).
- No secrets involved; nothing fabricated; branch names nowhere.
- `npm run check` stays the fast loop; ship stays build + e2e + shots + budget.

## Verification at the end
1. `npm run check` passes with zero lint warnings.
2. `npm test -- format` runs one file; bare `npm test` runs 31.
3. `npm run e2e:fast` passes; duration recorded.
4. `npm run data:all` runs both pipelines, second run skips both.
5. `npm run build && npm run budget` still green.
6. `npm run measure` rewrites baseline.md with fresh numbers.

## Order
Record phase → CB1 → CB2 → CB3 → CB4 → CB5 → CB6 → CB7 → full verification.
One task, one small diff each; no commits unless asked.