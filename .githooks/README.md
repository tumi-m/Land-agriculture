# Git hooks

Run once after cloning:

```bash
npm run hooks
```

That sets `core.hooksPath` to this directory, so `git commit` runs the fast
checks (typecheck, lint, unit tests) before anything is committed. Build, e2e
and screenshots stay in `/ship`.

Skip the hook when intentional with `git commit --no-verify`.