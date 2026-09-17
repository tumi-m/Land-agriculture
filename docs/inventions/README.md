# Invention records

One record per invention the repository claims. Each record is numbered with a
two-digit prefix (`01-verifiable-adjudication-receipts.md`) and keeps the name
it was filed under; renames are new records, not edits of history.

A record is **updated when a check runs**, not when a view changes. The
Measurements block at the bottom is rewritten in place by `npm run
inventions:check` with the date and the result of that record's falsification
check, the same way `npm run measure` rewrites `docs/baseline.md`. Nothing else
in a record changes on a check run.

## Template

```markdown
# NN · <name>

Readiness · Owner · Last prior-art search (date)

## Attacks
The failure, with the file or source that evidences it.

## Mechanism
How it works, describable without naming a technology.

## New capability
"Before this, ___ could not ___."

## Prior art
What exists, what is closest, and how this differs. With dates.

## Smallest testable version
And the Check that decides it.

## Failure modes
How it breaks, and what we do then.

## Forbidden
What this invention may never be used for, even if asked.

## Measurements
The falsification check, when it was last run, and what it returned.
```

The template is verbatim from `docs/PLAN-FRONTIER.md` Appendix C. Records live
alongside the plan that generated them; the plan's M5 table says which record
each build task implements.
