# Phase 0.5: Loop and graph engineering — execution plan

User request: "add loop engineering and graph engineering". The repo already has a
check loop (`npm run check` = typecheck → lint → graph → tests, enforced in CI and
in AGENTS.md) and a dependency-cruiser rule set (`.dependency-cruiser.cjs`). This
plan hardens both. Approved decisions: implement now after recording the phase in
`docs/PLAN.md`; pre-commit hook runs fast checks only; screenshot regression is
enforced in CI.

## Deliverables

### Record the phase (do first)
- Insert a "Phase 0.5: Loop and graph engineering" section in `docs/PLAN.md`
  between Phase 0 and Phase 1, task style matching the existing file
  (ID · title · size, Files / Do / Check / Done when). Tasks: P0.5a…P0.5g.

### Loop engineering

**P0.5a · Pre-commit hook · S**
- Files: new `.githooks/pre-commit` (executable), new `.githooks/README.md`;
  `package.json` script `hooks`; update `.opencode/commands/verify.md` to include
  `npm run graph`.
- Do: the hook runs the fast checks (`npm run typecheck && npm run lint && npm
  test`) and nothing else; build and e2e stay in `/ship`. `npm run hooks` runs
  `git config core.hooksPath .githooks` (Git has no native install step). README
  says to run it once after cloning and that `--no-verify` skips it when
  intentional.
- Check: `npm run hooks` prints the active path; a staged change with a type
  error is refused.

**P0.5b · Overlap check wired · S**
- Files: `e2e/chrome.spec.ts` (new).
- Do: use the existing `e2e/helpers/overlap.ts` (currently an orphan, so it also
  clears a `no-orphan-files` warning). Scope to what passes today at 390×844 and
  1440×900; the full `[data-overlay], [data-chrome]` scope stays with P3.1.
- Check: `npm run e2e` passes with the new spec.

**P0.5c · Screenshot regression · M**
- Files: `e2e/shots.spec.ts` (or a new assert spec), `playwright.config.ts`,
  `package.json` script `shots:update`.
- Do: the four states get `toHaveScreenshot` with small `maxDiffPixelRatio`
  tolerance and `animations: "disabled"`, baselines committed under
  `e2e/shots.spec.ts-snapshots/`. WebGL canvas regions are masked if they prove
  nondeterministic under swiftshader. `npm run shots` keeps writing
  human-review PNGs; the assertion spec runs in `npm run e2e`; `shots:update`
  refreshes baselines.
- Check: `npm run e2e` passes twice in a row unchanged; an intentional visual
  change fails until refreshed.

**P0.5d · Bundle budget gate · S**
- Files: new `scripts/budget.mjs`; `package.json` script `budget`;
  `.github/workflows/ci.yml` runs `npm run budget` after `npm run build`.
- Do: parse the build output's first-load JS for `/`; fail above the baseline
  in `docs/baseline.md` plus 15% (230 kB). Limit at the top of the script with a
  comment pointing at the baseline.
- Check: passes on the current build; a lowered limit exits 1 naming the route.

**P0.5e · CI hygiene · S**
- Files: `.github/workflows/ci.yml`.
- Do: `concurrency` group cancelling superseded runs on the same ref; pin the CI
  Node version explicitly (22.x, matching the devcontainer).
- Check: workflow YAML parses; a push to an already-running branch cancels it.

**P0.5f · Graph rules for what comes next · M**
- Files: `.dependency-cruiser.cjs`.
- Do: rules the later phases rely on, at `warn` until their phase lands then
  promoted to `error`:
  - browser code never imports Node builtins (`fs`, `path`, `os`, `child_process`);
  - `src/app/api` is not imported from outside `src/app` (callers use `fetch`);
  - `scripts` reach only `src/lib`, `src/content`, `src/data` (carve-out:
    `scripts/test-explorer.tsx`);
  - one state library: `zustand` only inside `src/state` (future-proofing P1.3).
- Check: `npm run graph` passes; a deliberate violation names the right rule,
  then is removed.

**P0.5g · Graph reporter · S**
- Files: `package.json` script `graph:svg`.
- Do: dependency-cruiser `archi`/`dot` reporter output into gitignored
  `test-results/graph/`. Nothing committed.
- Check: the graph file is produced; `git status` stays clean.

## Constraints honoured
- No new npm dependencies (Playwright, dependency-cruiser, pngjs already present).
- No data, content or component behaviour changes; empty feed still renders.
- Secrets: none involved. Rule 4 unaffected.
- `npm run check` stays the loop after every change; build+e2e stay in `/ship`.

## Verification at the end
1. `npm run check` passes (typecheck, lint, graph, tests).
2. `npm run e2e` passes twice consecutively with the new chrome and screenshot
   specs; baselines committed once.
3. `npm run build && npm run budget` passes; deliberate 1 kB-over limit exits 1.
4. `npm run hooks`, then a staged type error is refused by the hook.
5. `npm run graph:svg` produces output; `git status` clean of graph files.

## Order
Record phase → P0.5a → P0.5b → P0.5c → P0.5d → P0.5e → P0.5f → P0.5g →
full verification. One task, one small diff each; no commits unless asked.