# Map quality baseline

Recorded by `npm run quality` (M0.3). One row per measured state at
390x844 and 1440x900 in light and dark: anatomy at four explode depths,
atlas with the dossier closed, atlas with a notice open. Numbers are the
fixed QC0 zero point; later "30% fewer" claims are computed from them.

| State | Overlays | Overlapping text pairs | Touch targets < 44 px | Text below WCAG AA | Controls without an accessible name | Cards showing undefined / NaN |
|---|---|---|---|---|---|---|
| phone-light anatomy depth 0 | 2 | 58 | 7 | 5 | 0 | 0 |
| phone-light anatomy depth 0.33 | 2 | 58 | 7 | 5 | 0 | 0 |
| phone-light anatomy depth 0.66 | 2 | 58 | 7 | 5 | 0 | 0 |
| phone-light anatomy depth 1 | 2 | 58 | 7 | 5 | 0 | 0 |
| phone-light atlas | 0 | 0 | 37 | 0 | 0 | 0 |
| phone-light atlas notice | 1 | 0 | 30 | 0 | 0 | 0 |
| phone-dark anatomy depth 0 | 2 | 58 | 7 | 0 | 0 | 0 |
| phone-dark anatomy depth 0.33 | 2 | 58 | 7 | 0 | 0 | 0 |
| phone-dark anatomy depth 0.66 | 2 | 58 | 7 | 0 | 0 | 0 |
| phone-dark anatomy depth 1 | 2 | 58 | 7 | 0 | 0 | 0 |
| phone-dark atlas | 0 | 0 | 37 | 0 | 0 | 0 |
| phone-dark atlas notice | 1 | 0 | 30 | 0 | 0 | 0 |
| desktop-light anatomy depth 0 | 2 | 22 | 15 | 5 | 0 | 0 |
| desktop-light anatomy depth 0.33 | 2 | 22 | 15 | 5 | 0 | 0 |
| desktop-light anatomy depth 0.66 | 2 | 22 | 15 | 5 | 0 | 0 |
| desktop-light anatomy depth 1 | 2 | 22 | 15 | 5 | 0 | 0 |
| desktop-light atlas | 0 | 0 | 41 | 0 | 0 | 0 |
| desktop-light atlas notice | 1 | 0 | 34 | 0 | 0 | 0 |
| desktop-dark anatomy depth 0 | 2 | 22 | 15 | 0 | 0 | 0 |
| desktop-dark anatomy depth 0.33 | 2 | 22 | 15 | 0 | 0 | 0 |
| desktop-dark anatomy depth 0.66 | 2 | 22 | 15 | 0 | 0 | 0 |
| desktop-dark anatomy depth 1 | 2 | 22 | 15 | 0 | 0 | 0 |
| desktop-dark atlas | 0 | 0 | 41 | 0 | 0 | 0 |
| desktop-dark atlas notice | 1 | 0 | 34 | 0 | 0 | 0 |

## Re-verified 2026-09-15

Re-run after the Land view repairs (registry stacking and the MapLibre
worker). Every number is identical to the table above, which is the point:
the harness is deterministic, and the repairs changed what the canvas draws,
not the measured chrome, text, targets or contrast.

The perf zero point in `test-results/perf/baseline.json` (M0.4) stands
unchanged. Repeat runs on this Codespace swing widely between identical
builds — phone depth-sweep throughput moved 9.8 to 23.5 to 13.2 fps across
three runs — so a single run is not a fair basis for a 30% claim. Later QC
rounds must either average several perf runs or compare like-for-like
medians recorded back to back.
