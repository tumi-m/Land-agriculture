# Asbonge repository recovery and version-control cleanup

Prepared 19 September 2026. Separate from `ASBONGE_IMPLEMENTATION_PLAN.md`.

## Current evidence

- The separate local review checkout is clean at `beb2245993b3c9faf57dcffd9832ec16ded5828d`. It does not contain the Codespace's uncommitted work.
- The remote default branch was reviewed at `404d91f0654db5c1e8c286c24fb0b8553686f93b`, 38 subsequent commits.
- The owner reports additional uncommitted work by several agents in a Codespaces/VS Code session that expired.
- The remote milestone ledger says M1.3 scene splitting landed, but the reviewed remote tree still contains `ExplodedMap.tsx` and only `src/scene/depth.ts`. The claimed scene modules and `ModelView.tsx` are absent there. This is a reconciliation problem, not proof that the work was lost.
- The reviewed remote also has two other branches. Their existence is not a reason to merge them; establish ancestry and inspect unique changes first.
- No remote workspace files were recovered, refactored, committed or merged during the Markdown update.

## Execution environment: use the original Codespace

The owner does not want to run commands in the Mac's Terminal or grant broader local CLI access. Keep recovery, Git operations and application tests inside the existing Codespace.

A screenshot shows the original repository open at `/workspaces/Land-agriculture`. Use the coding agent already running in that workspace. It can inspect files directly; it does not need a personal `codespace` OAuth scope just to inspect its current filesystem. Use existing repository credentials only for ordinary fetch/push operations, and report any actual permission failure without requesting token contents.

The earlier `gh auth refresh` guidance is superseded. Its error happened because the Codespace supplies `GITHUB_TOKEN`. Do not clear that token, replace credentials or authenticate the Mac to proceed with this recovery route.

### Give the in-Codespace agent the brief safely

The intended repository locations are `docs/ASBONGE_REPOSITORY_RECOVERY.md` and `docs/ASBONGE_IMPLEMENTATION_PLAN.md`. They have been prepared as Markdown deliverables but publication through the external repository connection failed with HTTP 403. Until committed, upload the two documents into the Codespace through VS Code's file interface, preserving any existing files with the same names. The in-workspace agent should inventory and back up current work before changing the checkout, then publish the documents as a separate reviewed documentation commit using existing repository access. If the documents have since been published, fetch remote refs and read them directly from that commit; no pull or checkout is required.

Do not run an automatic pull, stash, reset, clean, container rebuild or checkout to obtain these documents. Do not create a replacement Codespace or delete the original one. Unsaved editor buffers need separate preservation through the existing editor.

### What can be done through the repository connection

The repository connection can read and publish committed files and review branches. It cannot see unstaged files, untracked files or editor buffers that exist only inside Codespaces. Repository documentation being published is not evidence those files have been recovered.

If direct recovery by an external agent is preferred, opening the existing Codespace in an authenticated browser is another access route. It requires the owner to sign into that browser; it does not require Mac Terminal commands. Use the already-running in-Codespace agent first.

## Recovery order

### 1. Locate the original work

Confirm that the current workspace is the original Codespace for `tumi-m/Land-agriculture`. Record its identity, state and repository path without displaying tokens or other secret environment values. Check whether other agents are still running before touching shared files.

Inside the correct workspace, inspect repository instructions and collect:

```sh
git status --short --branch
git branch -avv
git worktree list
git log -20 --oneline --decorate
git reflog -30 --date=iso
git stash list
git diff --stat
git diff --cached --stat
git ls-files --others --exclude-standard
```

Inspect only relevant project directories. Check saved files, staged work, untracked source/tests and VS Code recovery/local-history facilities if required. Unsaved editor buffers are not represented by Git diffs. An expired session does not by itself establish whether the persistent filesystem survived.

### 2. Preserve before modifying

Create a timestamped private recovery directory outside the checkout. Preserve repository metadata/committed history, staged and unstaged binary patches, and a manifest of relevant untracked files. A Git bundle preserves committed objects and refs; it does not preserve uncommitted or untracked work on its own.

Copy reviewed untracked source, tests and documentation into the private backup. Keep environment files, credentials, personal data and large caches out of commits and public uploads. Do not blindly archive or stage the entire workspace.

Verify backup checksums and that patches can be inspected/applied in an isolated scratch checkout before any reset, checkout, stash manipulation or merge. Keep the original workspace intact throughout recovery.

### 3. Reconcile the actual changes

Compare recovered work with remote `404d91f` or the newer remote head found during recovery. Classify each file as:

- Already committed remotely.
- New source work, with its associated tests and intended task.
- An incomplete/conflicting implementation needing inspection.
- Generated artefacts reproducible from a pipeline.
- Temporary output that should remain outside version control.

For M1.3 specifically, locate scene core/camera/pieces/picking/labels, `ModelView.tsx`, renderer removal, store changes, graph changes and scene tests. Compare them as one feature set, not unrelated files. Correlate claimed test results with the actual tree they tested.

Reconcile `docs/milestone-status.md` with this evidence and the current owners. Do not erase legitimate claims or declare the refactor complete based on prose alone.

### 4. Establish recoverable checkpoints

Prepare a dedicated recovery branch in an isolated checkout. Apply recovered changes selectively, preserving their staged/unstaged provenance in private recovery notes. Review for secrets before any commit or push.

Save recovered work in coherent checkpoints rather than mixing scene refactoring, financial logic, data records and tooling fixes into one unexplained commit. If an incomplete checkpoint must be retained, keep it away from the production merge path and label its state clearly; do not claim it passes the release gates.

Use normal commits, not force pushes. Do not rewrite shared history or merge branch names without reviewing their actual unique diffs. Preserve existing author information when recovering existing commits.

### 5. Refactor only after recovery

Use the recovered implementation where sound. Avoid recreating the missing scene work merely because it was absent from the remote default branch.

Priorities for a bounded cleanup:

1. Restore a truthful task/ownership ledger and a reproducible working tree.
2. Establish whether the recovered scene split has functional parity; finish or separate incomplete portions with regression evidence.
3. Complete existing state/URL integration rather than introducing another state system.
4. Remove duplicated map-layer setup through the existing registry.
5. Resolve divergent source-data paths through the capability roadmap, as a separate feature change.
6. Remove dead code only after dependency analysis and behaviour checks establish that it is unused.

Do not upgrade frameworks, replace the deployment platform or collapse all existing plans as an incidental cleanup.

### 6. Verify and integrate

Follow the repository's `AGENTS.md` requirements. Run checks against one isolated tree, with one build/server owner:

```sh
npm run check
npm run build
npm run budget
npm run e2e
npm run shots
```

Inspect screenshots, and run relevant `quality` and `perf` checks for map changes. Preserve historical baselines; write new result records instead of overwriting the reference to make a regression pass. Record missing dependencies and real failures.

Merge only the verified, reviewed work under the owner's release instructions. Do not automatically deploy or change audience as part of recovery. Report recovered files, checkpoints, unique changes merged, unresolved work and the exact final commit.

## Prevent recurrence

- Keep one canonical milestone/ownership ledger with task, files, owner, actual commit and checks.
- Use one isolated worktree per concurrent editing task where practical; agree shared interfaces first.
- One task owns a given source file set and build output directory at a time.
- Commit small coherent, verified slices throughout a session; record a checkpoint before handing off or stopping.
- Push safe recovery checkpoints to an appropriate non-production branch when backup is intended; never assume a local commit alone survives workspace deletion.
- Keep generated data tied to pipeline inputs and source versions, and distinguish committed assets from temporary build/test output.
- Do not have several agents run Next builds or browser suites against the same `.next` directory and server port.

## Resume prompt

```text
Perform the repository-recovery pass in ASBONGE_REPOSITORY_RECOVERY.md.
Work only inside this original Codespace. Inspect its actual Git/editor state.
No Mac Terminal commands, personal tokens or authentication changes are needed.
Read the uploaded recovery and implementation briefs. Inventory and back up
first. Publish the documents in a separate documentation commit using existing
repository access; do not mix uncommitted application work into that commit.
Preserve staged, unstaged and relevant untracked work in a private verified
backup before any modifying Git operation. Do not reset, clean, rebuild or
delete the original workspace. Reconcile the M1.3 claim with real files and
remote history. Keep this recovery separate from feature-roadmap execution.
Then prepare small reviewed checkpoints and run the repository's existing
checks in an isolated tree. Report recovery evidence and remaining gaps.
```