---
description: Full checks, screenshot review, then commit
---
Run in order and stop at the first failure: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run e2e`, `npm run shots`.
If a step fails, fix it and restart from that step. After three failed attempts on one step, stop and report what you tried.
Review the new screenshots against section 5 of @docs/PLAN.md and fix any defect you find, then rerun the checks.
When everything passes, run `git add -A` and commit with an imperative one-line summary and a short body saying why. No trailers, no AI attribution, no branch names.