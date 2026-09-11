---
description: Do one task from docs/PLAN.md, e.g. /task P1.3
---
Read @AGENTS.md and task $ARGUMENTS in @docs/PLAN.md. If the task touches the interface, also read section 5 (Design spec). If it touches photos, also read section 6.

1. Restate the task's goal and its Check in five lines or fewer.
2. Read every file the task names before changing anything.
3. Make the smallest change that meets the task. Note anything else you spot under "Later" instead of doing it.
4. Run `npm run typecheck && npm run lint && npm test` and fix until they pass.
5. Run every command in the task's Check.
6. Reply with the files changed, each check and its result, and anything unresolved. Don't commit.