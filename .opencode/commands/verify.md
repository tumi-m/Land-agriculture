---
description: Fast checks: types, lint, unit tests
---
Typecheck:
!`npm run typecheck 2>&1 | tail -40`

Lint:
!`npm run lint 2>&1 | tail -40`

Unit tests:
!`npm test 2>&1 | tail -60`

Say pass or fail for each. If anything failed, fix the first failure only, then run that check again.