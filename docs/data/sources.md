# Data sources

Every dataset the app shows, with its licence, resolution and where it is used.
The About sheet (P3.1) reads the same facts from `src/content/sources.ts`; this
file is the human-readable register. Status: what is in the app today, and what
a pipeline task will add.

| Dataset | Used for | Licence or terms | Resolution | Status |
|---|---|---|---|---|
| DLRRD state farm lease notices, 2026 index | Notices, deadlines, officers | Public government notices | Per farm | 22 of 53 PDFs in the app (P2.4 adds the rest) |
| CSG cadastre (DFFE portal MapServer) | Parcels, SG lookup | Public service; confirm terms in P2.5 | Parcel | 2 notices matched (P2.5 re-runs the match) |
| Terrain tiles, Terrarium (AWS) | Relief, profiles, slope | Attribution per Tilezen | About 30 m, varies | In the app |
| EOX Sentinel-2 cloudless 2016 | Satellite basemap | CC BY 4.0 | About 10 m | In the app |
| EOX Sentinel-2 cloudless 2024 | Then and now (P4.9) | CC BY-NC-SA 4.0, non-commercial | About 10 m | Planned |
| NGI aerial via Esri South Africa | Aerial close-up | As documented in `src/lib/aerial.ts` | Sub-metre, dates vary | In the app |
| DWS rivers and dams 1:50,000; Eskom transmission lines | Water and power layers, distances | As documented in `src/lib/infrastructure.ts` | Vector | In the app |
| NASA POWER | Climate at a point | NASA open data | About 0.5° | In the app; more parameters in P4.7 |
| ESA WorldCover 2021 v200 | Land-cover slice and statistics | CC BY 4.0 | 10 m, baked to under 2 km | P2.2 |
| SoilGrids 2.0 (ISRIC) | Soil slice and statistics | CC BY 4.0 | 250 m, baked | P2.2; REST API is beta, 5 calls a minute |
| CHIRPS (UCSB Climate Hazards Center) | Rain slice and statistics | Public domain | 0.05° | P2.2; v2 production ends December 2026, v3 available |
| ORNL DAAC MODIS subsets (MOD13Q1) | Vegetation history (P4.8) | Free; citation requested | 250 m, 16-day | Planned; 10 dates per request |
| OpenFreeMap (OpenMapTiles, OpenStreetMap) | Place names and roads (P4.2) | Free, attribution required | Vector | Planned |
| Natural Earth rivers | Rivers on the model and atlas | Public domain | 1:50m | In the app |
| Municipal Demarcation Board boundaries | Provinces and districts | Public government data | District | In the app |

## Bake pipeline outputs (P2.2–P2.3)

Baked rasters land in `public/data/layers/` as `<layer>.values.png` plus a
`.json` sidecar carrying bounds, size, step, offset, nodata, units, legend,
source, licence and date. District statistics aggregate those grids per
district into `src/data/district-stats.json`. Both run through the declared
DAG: `npm run data:all` (`scripts/pipelines.json`).