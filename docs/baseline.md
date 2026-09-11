# Baseline (commit 9db1d95, 11 Sep 2026)

Measured on a Codespace (4-core, 16 GB, Node 24.20.0). Later tasks compare
bundle size against this table.

| Check | Result |
|---|---|
| `npm ci` | Pass |
| `npm run typecheck` | Pass |
| `npm test` | Pass (28 tests) |
| `npm run build` | Pass, 62 s wall |

## Routes

| Route | Size | First Load JS | Kind |
|---|---|---|---|
| `/` | 97.1 kB | 200 kB | Static, revalidate 1m |
| `/_not-found` | 994 B | 104 kB | Static |
| `/api/climate` | 134 B | 103 kB | Dynamic |
| `/api/infrastructure` | 134 B | 103 kB | Dynamic |
| `/api/parcels` | 134 B | 103 kB | Dynamic |
| `/api/revalidate` | 134 B | 103 kB | Dynamic |
| `/icon.svg` | 0 B | 0 B | Static |

Shared by all routes: 103 kB (chunks/255 46.4 kB, chunks/4bd1b696 54.2 kB,
other shared 2.15 kB).

## Notes

- Lint has no ESLint config or dependency yet (`next lint` is a no-op shell);
  P0.6 adds it.
- Build compiles with `Linting and checking validity of types` as part of
  `next build`, so the 62 s includes typecheck.