# Asbonge: implementation plan for South Africa’s agricultural land information resource

**Prepared:** 19 September 2026  
**Updated after change analysis:** 19 September 2026  
**Review scope:** 38 newer commits on the remote default branch; source inspection, not a fresh runtime certification  
**For:** DeepSeek V4.1 Flash in OpenCode  
**Repository:** `https://github.com/tumi-m/Land-agriculture`  
**Execution workspace:** existing Codespace, typically `/workspaces/Land-agriculture`  
**Original baseline:** `beb2245993b3c9faf57dcffd9832ec16ded5828d`  
**Current reviewed commit:** `404d91f0654db5c1e8c286c24fb0b8553686f93b`  
**Current site:** <https://asbonge-land-explorer.tumeloxnordic.chatgpt.site/>

This is an implementation brief, not a claim that the proposed capabilities exist. “100x” describes the ambition: turn an attractive explorer into an indispensable, trustworthy decision tool. Measure the improvement through information coverage, successful user journeys, reliability and speed; do not advertise an unmeasured multiplier.

## 1. Product outcome

A prospective farmer should be able to answer:

1. Which government agricultural opportunities are accepting applications, and which are historical or unconfirmed?
2. Where is the land, how accurately is it located, and what does it actually look like?
3. What is known about its soil, climate, terrain, water, electricity and access?
4. Which enterprises could be plausible, under which assumptions, and what information is still missing?
5. How much startup capital and working capital might be required, and what happens in a bad season?
6. What are the requirements, deadline, documents, official contact and next action?
7. Where did each important claim come from, when was it checked, and how can an error be corrected?

Preserve the explodable 3D province/district experience as the visual entry point. Connect it to real aerial terrain, an accessible list and detailed opportunity dossiers. The map should help users make decisions, with every marker and layer explaining something useful.

**Priority order:** reliable inventory → useful search and dossiers → responsive maps → agricultural decision tools → alerts and application support → wider public distribution → grounded AI assistance.

## 2. Updated baseline and change analysis

### Review scope and how to use this revision

The original local checkout is clean but still at `beb2245`. GitHub `main` contains **38 subsequent commits**, ending at `404d91f` on 17 September. This revision inspects that exact remote tree through GitHub, including implementation files, tests, data outputs, configuration and milestone documents. It does not assume that the live site has deployed that commit. No application changes, merge, deployment or fresh full test run were performed for this planning update. Repository recovery/refactoring is a separate requested workstream; its outcome must be reconciled before executing potentially overlapping roadmap tasks.

Keep the P00–P28 IDs in this document for continuity. They are capability work packages, not replacements for the repository's existing task numbering. The current map execution sequence lives in [docs/PLAN-MAP-10X.md](https://github.com/tumi-m/Land-agriculture/blob/404d91f0654db5c1e8c286c24fb0b8553686f93b/docs/PLAN-MAP-10X.md); claims and ownership live in [docs/milestone-status.md](https://github.com/tumi-m/Land-agriculture/blob/404d91f0654db5c1e8c286c24fb0b8553686f93b/docs/milestone-status.md). The repository also has `PLAN.md`, `PLAN-100X.md`, `PLAN-1000X.md` and `PLAN-FRONTIER.md`. Reconcile these rather than starting a sixth competing execution ledger. Update the existing milestone ledger with capability cross-references and evidence.

### Implemented foundations to reuse

- **Engineering checks:** ESLint 9 with zero-warning enforcement, dependency-cruiser, multi-file unit tests, Playwright smoke/screenshots, CI, a devcontainer, bundle budgets and an explicit data pipeline now exist. `npm run check` runs typecheck, lint, graph and tests. Do not repeat the old “install lint/test infrastructure” work. [Scripts and dependencies](https://github.com/tumi-m/Land-agriculture/blob/404d91f0654db5c1e8c286c24fb0b8553686f93b/package.json).
- **Design foundation:** styles are split, CSS tokens and data ramps exist, and nine UI primitives include Sheet, Stat, SourceNote, Legend and IconButton. Refactor remaining screens onto these; component existence does not prove every old control uses them.
- **Navigation foundation:** Zustand state and URL codecs exist in `src/state/`. The canonical views are now **Model** and **Land**; legacy anatomy/atlas/data URLs are accepted. The grammar includes eight selection kinds, depth, layers and land camera pose. End-to-end integration remains incomplete, as described below. [Store](https://github.com/tumi-m/Land-agriculture/blob/404d91f0654db5c1e8c286c24fb0b8553686f93b/src/state/explorer.ts) and [URL grammar](https://github.com/tumi-m/Land-agriculture/blob/404d91f0654db5c1e8c286c24fb0b8553686f93b/src/state/url.ts).
- **Map reliability:** `src/map/layers.ts` supplies the layer registry, insertion order was repaired, and MapLibre worker files are served explicitly. `e2e/land.spec.ts` checks that vector sources parse and district fills render. Keep those regressions covered.
- **Regional evidence:** WorldCover land cover, CHIRPS rainfall, SoilGrids pH/clay and hillshade have a bake pipeline, PNG assets and metadata. `src/data/district-stats.json` now contains **52 district summaries**, with provenance, nodata and honest notice/parcel counts. Soil is no longer wholly absent. [Raster definitions](https://github.com/tumi-m/Land-agriculture/blob/404d91f0654db5c1e8c286c24fb0b8553686f93b/scripts/data/sources.json) and [Statistics pipeline](https://github.com/tumi-m/Land-agriculture/blob/404d91f0654db5c1e8c286c24fb0b8553686f93b/scripts/data/district-stats.mjs).
- **Reference content:** `/guide` exists. Do not recreate that route or put the long reference back over the map.
- **Security cleanup:** query-string webhook secrets and the broad remote-image host allowance have been removed. Preserve these completed fixes; the wider source-validation and authorisation work remains.
- **Verification capability:** `/verify` and `src/lib/adjudication/` contain canonicalisation, hashing, Merkle proofs, rubric scoring and log/signature functions. The published log is deliberately empty. This is a verifier foundation, not evidence of any real government allocation round. [Receipt UI](https://github.com/tumi-m/Land-agriculture/blob/404d91f0654db5c1e8c286c24fb0b8553686f93b/src/app/verify/ReceiptChecker.tsx) and [Published log](https://github.com/tumi-m/Land-agriculture/blob/404d91f0654db5c1e8c286c24fb0b8553686f93b/public/adjudication/log.json).

### Information coverage has not expanded with the new graphics work

The reviewed `farm-notices.ts`, Northern Cape notices and coverage JSON are byte-identical to the original baseline. There are still **22 notices across four provinces**, including **15 Northern Cape records**, checked on **9 September 2026**. The cadastral JSON changed formatting, but its parsed contents are unchanged: **two matched polygons**.

District statistics describe those same reviewed notices; 52 district summaries do not mean 52 districts have new available government farms. Coverage, deadline freshness, a maintained national register and new verified parcel matches remain the principal information gap. [Coverage evidence](https://github.com/tumi-m/Land-agriculture/blob/404d91f0654db5c1e8c286c24fb0b8553686f93b/src/content/notice-coverage.json).

The optional remote feed is also unchanged: weak validation, absent status defaulting to `open`, no explicit fetch timeout and empty-dataset fallback still exist in [src/lib/source.ts](https://github.com/tumi-m/Land-agriculture/blob/404d91f0654db5c1e8c286c24fb0b8553686f93b/src/lib/source.ts). This is an immediate correctness task, not completed groundwork.

### Integration gaps that change the next tasks

**1. The scene-refactor completion claim is not supported by this remote tree.** The milestone ledger says M1.3 landed and `ExplodedMap.tsx` was deleted. At `404d91f`, `src/scene/` contains only `depth.ts`; `ExplodedMap.tsx` remains and `LandLocator.tsx` imports it. The claimed `ModelView.tsx`, scene core/camera/pieces/picking/labels and camera tests are absent from the reviewed paths. The pure depth module exists but the live component does not import it. Treat M1.3 as **unconfirmed/missing from the reviewed default branch**, not complete. Locate the actual work or correct the ledger before dependent scene tasks. The owner has since reported uncommitted agent work in an expired Codespaces/VS Code session. That may explain this discrepancy, but this review cannot identify or certify those files. Recover and inventory that workspace in a separate repository-recovery pass before reimplementing or discarding the scene work.

**2. URL codecs are ahead of the running UI.** `LandLocator` reads only `at`, `view` and `metric` during hydration and writes only selection/view/metric. It does not wire depth, layer visibility or camera pose into that cycle. Notice clicks set province rather than notice selection; point clicks update local inspection without selecting the point in the store. Layer/parcel/photo routes are not hydrated there. The current writer can also discard unrelated parameters when a nonempty app state is written; there is no `popstate` handler in this component. Extend the existing store rather than adding another one. Test real clicks and reload/Back behaviour, not just codec round trips. [Integration evidence](https://github.com/tumi-m/Land-agriculture/blob/404d91f0654db5c1e8c286c24fb0b8553686f93b/src/components/LandLocator.tsx).

**3. New rasters and statistics are not yet the promised map experience.** The inspected live map/dossier wiring does not consume the district-statistics output or connect thematic rasters to the anatomy slabs. `depth.ts` is similarly ahead of its renderer integration. M2.1/M2.3/M2.4 remain material work. Keep native source resolution, baked display grid and analytical method distinct; CHIRPS displayed on a finer grid still has its native information scale.

**4. Land-view outage handling still needs repair.** Vector-layer setup occurs in the initial map `load` handler. The existing Land e2e spec explicitly records an initial-imagery failure that can leave the map loading indefinitely; it tests a mid-session failure but leaves the initial failure as known debt. Fix and add an assertion for the initial failure path. `InfrastructureOverlay.tsx` also still adds layers directly, so registry migration is partial. [Recorded behaviour and defects](https://github.com/tumi-m/Land-agriculture/blob/404d91f0654db5c1e8c286c24fb0b8553686f93b/e2e/land.spec.ts).

**5. Verification must distinguish consistency from authenticity.** The receipt checker runs three internal receipt checks, while its fetched log is used to show an entry count/empty state. It does not call `verifyLog` to bind the supplied receipt to a trusted signed history. The lower-level log/signature code exists. Before presenting an official-round verification result, connect the round ID, commitment, root and released artefacts to a verified log and an independently trusted organiser key, and define the publication-time trust model. Keep a separate “internally consistent, not authenticated” outcome. Do not generate a signing key or publish a sample round to make the screen look complete.

### Recorded performance and quality: evidence, not a pass claim

- The committed performance baseline reports phone first frame **19,756 ms** and depth sweep **9.8 FPS**; desktop **4,763 ms** and **23.6 FPS**. These are repository harness results from a Codespace, including a throttled phone profile, not field Core Web Vitals or a current physical-device benchmark. [Recorded baseline](https://github.com/tumi-m/Land-agriculture/blob/404d91f0654db5c1e8c286c24fb0b8553686f93b/test-results/perf/baseline.json).
- QC1 reports phone **17,641 ms / 17.5 FPS**, but the report warns of wide run-to-run variation. Do not claim a reliable speed improvement from that one run. Re-measure the same committed tree on a quiet machine with repeated samples. [QC1 evidence](https://github.com/tumi-m/Land-agriculture/blob/404d91f0654db5c1e8c286c24fb0b8553686f93b/docs/map-quality-round-1.md).
- QC1 retains **58 overlapping text pairs per phone anatomy state** and **22 per desktop anatomy state**, plus undersized controls and contrast debt. Across its 24 measured states it records 460 undersized-target occurrences and 40 low-contrast occurrences; these are repeated observations, not counts of unique controls. M1.4 and shell work remain important.
- The root first-load bundle budget is **230 kB** under the repository's existing measurement method. Preserve that gate. The baseline note about missing lint is stale; the current package uses ESLint. Do not overwrite historical baseline measurements to make a new run pass.
- The ledger reports up to 149 unit tests and selected build/e2e passes, but some notes include the scene refactor absent from this commit and acknowledge concurrent-workspace test failures. Treat those claims as reported, not a clean full-suite certification of `404d91f`. Run the current tree in isolation before release.

### Revised next sequence

1. **P00 reconciliation slice:** work from the current remote tree, inspect any unpushed work, reconcile the M1.3 claim, preserve ownership claims and run the existing checks. Fix documentation without rebuilding the foundation.
2. **P01 correctness slice:** remove the remote feed's unknown → open behaviour; validate bounded input and expose truthful failures. Claim this as an explicit data-safety task alongside the map roadmap.
3. **P11 integration slice:** wire real notice/point clicks and complete URL state to the existing store, with reload/history regressions. Keep unsupported parcel/photo interactions explicitly unavailable until their features exist.
4. **P15 resilience slice:** repair initial imagery failure and keep vector/list information available; verify the worker and layer-order fixes remain intact.
5. **Map sequence:** establish M1.3 parity, then M1.4 labels → M1.5 shell → M1.6 search/outline → M1.7 poster/first run → QC2. Follow with M2.1 textures, reuse completed M2.2 statistics, then M2.3 inspect cards and M2.4 lenses. Claims and file ownership still apply.
6. **Data sequence:** extend the existing source register and carry out M2.5 notice/cadastral work, mapped to P04–P09/P13 here. Add actual reviewed records before declaring national availability coverage.
7. **Decision tools:** integrate the existing climate/soil outputs before new sources; then add enterprise modules and accountable comparisons. Keep institutional adjudication/public signing optional and separate from discovery.

## 3. Non-negotiable information rules

1. Government-owned land, an advertised lease, a municipal commonage programme, a private sale and an allocated farm are different things. Label and filter them separately.
2. Missing records mean **coverage unknown or incomplete**, not “zero land available.” A zero search result must describe its scope and freshness.
3. Never default an unknown availability status to open. Passing a deadline means the advertised application window ended; it does not prove allocation.
4. Keep source facts, modelled estimates, user assumptions and illustrative examples visually distinguishable.
5. Every published critical fact needs evidence: official source, document version, page or section where applicable, extraction/review dates and reviewer status.
6. A district centroid is a district marker, never a farm coordinate. An approximate location must say so before a user acts on it.
7. A parcel boundary does not automatically equal the area offered for lease. Preserve the distinction between cadastral parcel, advertised portions and lease unit.
8. A river or dam nearby does not establish usable water, a water right or current storage. A transmission line does not establish an affordable electricity connection or available capacity.
9. Regional climate and modelled soil are screening evidence. Do not present them as field measurements or guaranteed enterprise suitability.
10. Synthetic records belong in test fixtures only. No invented government offers, prices, yields, boundaries, deadlines or contact details in production.
11. Publish as an independent information resource. Do not imply official government endorsement or guaranteed access to land or finance.
12. Source failures must preserve the last verified data with a visible timestamp. Do not silently turn a failed fetch into an empty national catalogue.

## 4. Success measures and performance budgets

Treat these as **target outcomes**, compared with the recorded baselines in Section 2 and an isolated current-tree run. They are not achieved metrics; the existing phone first-frame and label-overlap results show a substantial gap.

### Information quality

- All nine provinces have a public coverage record, a named source owner and an explicit known-source inventory.
- At least 95% of scheduled checks against registered priority sources complete within their expected daily window. Report failures and exceptions; do not hide them from the denominator.
- Publish reviewed critical changes within one business day of detection; surface urgent withdrawals and imminent deadline corrections immediately to reviewers.
- Every public opportunity has a primary-source citation, source-check date, availability state, and location-confidence state.
- No unreviewed extraction automatically becomes an advertised-open opportunity.
- Track separately: documents discovered, notices reviewed, distinct opportunities, cadastral matches, currently advertised application windows, and unresolved records.
- Measure extraction precision on a human-labelled validation set. A province coverage percentage must name its denominator; registered-source coverage is not the percentage of all government land found.

### User outcomes

- At least 8 of 10 pilot users can find relevant notices, understand their status, open evidence and identify the next step without coaching.
- A user can dismiss any sheet or modal with a visible control; browser Back restores meaningful previous map/search state.
- Search, dossiers and official document links remain usable without WebGL.
- Comparison works for up to three opportunities, with missing values explicitly shown.
- Track successful official-source visits, saved opportunities and return usage; avoid treating time spent spinning the map as the primary success metric.

### Performance and resilience

- Mobile p75 targets: LCP ≤ 2.5 seconds, INP ≤ 200 ms, CLS ≤ 0.1. Establish lab runs on a documented midrange Android profile and field measurements when there is sufficient traffic.
- Useful text and search appear before optional imagery, elevation or infrastructure finishes. Aim for map interaction within 3 seconds on the agreed test connection.
- Active map interaction targets ≥ 30 FPS on the reference phone; idle anatomy rendering settles rather than running continuously.
- Load only the active heavy renderer. High-detail aerial imagery remains opt-in; never preload the country at full resolution.
- Record compressed JS, initial tiles, textures, draw calls and memory separately. Reject unexplained increases above 10% in the agreed baseline budgets.
- Keep existing bounded infrastructure requests, cancellation and geometry caps. Establish equivalent limits for every new endpoint.
- Target warm catalogue search p95 ≤ 500 ms on representative data. Search must not wait for live third-party GIS requests.
- Catalogue browsing remains usable during an upstream outage. Expired cache age and unavailable enrichments are explicit.
- Log external request counts and cost per 1,000 sessions. Set operating limits before launching expensive OCR, imagery or AI features.

## 5. Recommended architecture

Keep the current frontend, Zustand store, UI primitives, data pipeline and map-layer registry. Introduce a canonical catalogue behind them incrementally; do not rewrite the application or add microservices before measurement justifies them.

### Data flow

```text
Registered official sources
  → bounded scheduled/manual fetch
  → immutable original + checksum + fetch metadata
  → deterministic parsing / OCR when needed
  → schema validation + duplicate candidates + change detection
  → human review of critical facts and ambiguous locations
  → versioned catalogue publication
  → cached search / dossiers / map features / opted-in alerts
```

### Storage and execution

- **Catalogue:** use a relational schema and repository interface. The repository now documents Vercel deployment as well as the OpenNext/Sites build, and its longer-term plans discuss additional backend services. Select one primary catalogue in a recorded decision before provisioning. D1 is an option for a supported Cloudflare deployment; managed PostgreSQL/PostGIS is an option when the chosen deployment and spatial needs justify it. Do not accidentally create competing catalogue databases. Use a local adapter for development.
- **Evidence archive:** use object storage such as R2 for permitted source documents, extracted text and versioned derived assets. Store hashes and metadata in the catalogue. Confirm redistribution rights before making archived documents public.
- **Ingestion:** implement an idempotent CLI first, then a scheduled worker or job runner. Large PDFs, OCR and geoprocessing belong in a suitable background runtime, outside interactive requests.
- **Jobs:** introduce a queue when operationally needed, with retries, deduplication and a dead-letter queue. Assume at-least-once execution; make writes and notifications idempotent.
- **Maps:** serve simplified features or tiles by extent and zoom. Precompute district relationships and basic spatial summaries. Never send all national full-resolution polygons to a phone.
- **Spatial database:** do not pretend D1 is PostGIS. If measured query requirements need complex, frequent spatial joins, document a deliberate move to PostgreSQL/PostGIS instead of maintaining two primary catalogues.
- **Caching:** key data by publication version and enrichment version; retain last-good snapshots. Test actual persistent caching in the deployed OpenNext environment. Framework cache directives alone do not establish durable caching.
- **Authentication:** catalogue reading can remain independent of accounts. Protect editorial operations with an established authentication provider, roles and an audit trail. Add user accounts only when syncing or alerts need them.

The reviewed Cloudflare `wrangler.jsonc` still has only an assets binding; repository documentation also supports Vercel. This review does not establish the live hosting configuration. Provisioning, secrets, storage, scheduled jobs and database backup support are explicit dependencies. Do not claim success after adding configuration for services that were never provisioned. See [D1 documentation](https://developers.cloudflare.com/d1/) and [R2 documentation](https://developers.cloudflare.com/r2/).

### Suggested additions, introduced only as tasks need them

```text
src/domain/                 canonical types, status rules, units, validation
src/server/catalogue/       repository interfaces, queries, publication
src/server/sources/         source adapters and fetch policies
src/server/enrichment/      climate, soil, infrastructure, derived evidence
src/components/opportunity/ dossier and comparison components
src/components/search/      shared map/list filters and results
scripts/ingest/             idempotent acquisition and extraction commands
migrations/                 forward migrations and recovery instructions
fixtures/                   clearly synthetic or permissioned test evidence
src/app/api/v1/             versioned read contracts
src/app/admin/              authenticated editorial interface
docs/decisions/             architecture decisions
docs/milestone-status.md
```

Except for the existing milestone ledger, these are proposals. Reuse `src/state/`, `src/map/layers.ts`, `src/components/ui/`, `scripts/data/`, `scripts/pipelines.json` and `docs/data/sources.md`. Add new directories only when the corresponding package needs them; do not duplicate those responsibilities.

## 6. Canonical data model and API contracts

### Main entities

- **Source:** authority, URL, source type, province coverage, licence/terms, check cadence, responsible reviewer, last attempt/success and health state.
- **SourceDocumentVersion:** original URL, content hash, publication date if known, fetched time, archive reference, parser version, extracted text and page references. A changed file at the same URL is a new version.
- **Notice:** issuing authority, official reference, notice type, document versions, publication event and correction/replacement relationships.
- **Opportunity:** advertised lease or programme unit, tenure category, enterprise restrictions, advertised area, application window, source assertions and lifecycle events.
- **CadastralParcel:** authoritative identifier, geometry version, coordinate system, source, cadastral area and matching evidence.
- **OpportunityParcelLink:** many-to-many relationship, advertised portion, match method, confidence category, area discrepancy and reviewer decision.
- **Observation:** subject, attribute, value, unit, spatial support, observed/modelled period, source, uncertainty, method and freshness. Unknown values remain nullable.
- **Review/Correction:** before/after values, reason, evidence, actor and publication version.
- **UserScenario:** enterprise, units, dated assumptions, inputs, calculation version and deterministic outputs. Separate user input from catalogue facts.
- **SavedSearch/Subscription:** filters, consent, destination, delivery preferences and last processed event, introduced with alerts.

### Separate status dimensions

- Publication review: `draft`, `needs_review`, `verified`, `rejected`.
- Official lifecycle: `advertised`, `withdrawn`, `awarded`, `superseded`, `unknown`; only use a value when evidence supports it.
- Application window: `not_started`, `accepting`, `deadline_passed`, `unknown`, calculated with the source’s date precision and timezone.
- Freshness: `fresh`, `check_due`, `source_unavailable`, based on the source’s expected cadence.
- Location: `verified_lease_geometry`, `matched_cadastral_parcel`, `approximate_point`, `district_only`, `unlocated`.

Never collapse these into one green “available” badge. Example: “Advertised lease · deadline passed · checked 9 September · district location only.” Show a current acceptance claim only when its official lifecycle, application window and freshness satisfy a documented rule.

Store original date text, parsed value, precision and timezone. South African time is the default interpretation only when appropriate to the issuing source. A notice with a date but no closing time should say “closing time not stated”; do not invent a precise deadline. Extensions append events and retain the previous deadline.

### Proposed public contracts

- `GET /api/v1/opportunities`: stable pagination, province/district/bbox, enterprise, tenure, lifecycle, application window, area range and location confidence.
- `GET /api/v1/opportunities/:id`: dossier, evidence, history and explicitly available enrichments.
- `GET /api/v1/coverage`: source scope, last successful checks, unresolved records and province summaries.
- `GET /api/v1/map`: zoom-appropriate clusters or geometry; feature IDs match list and dossier IDs.
- `GET /api/v1/opportunities/:id/analysis`: versioned precomputed screening results, model metadata and missing-input explanations.

Responses include `datasetVersion`, `asOf`, `coverage`, `warnings` and stable IDs. Facets, counts, exports and map features must use the same filter semantics. Enforce input validation, limits, timeouts and parameterised queries. Preserve compatibility while retiring the old feed path.

## 7. Source acquisition strategy

### Start with Northern Cape and Limpopo, then all nine provinces

Northern Cape directly addresses the earlier empty-map problem. Limpopo exercises existing cadastral and map functionality. Build reusable source adapters in these pilots, then expand the register systematically.

- Start from the existing [DLRRD application-to-lease-state-farms index](https://www.dlrrd.gov.za/index.php/component/content/article/235-application-to-lease-state-farms?Itemid=437&catid=79). Recheck the current index and documents during implementation; the existing 53-document review was a bounded September snapshot.
- Add verified provincial department pages, relevant municipal lease/commonage notices and other official channels with a named scope and review owner.
- Track tender notices, leases, commonage and historic allocations separately. Social posts or third-party listings can trigger investigation but cannot silently become authoritative availability evidence.
- Support HTML, text PDFs and scanned PDFs. Store the original and extraction method; OCR output is a draft needing review of critical fields.
- Deduplicate by official reference, authority, document hash and parcel identifiers. Similar farm names alone are insufficient.
- Record unlocated opportunities so they are discoverable in a list and district grouping without fake coordinates.

### Spatial and agricultural evidence

- Use authoritative cadastral identifiers and reviewed matching. Existing source: [CSG cadastral layer hosted by DFFE](https://dffeportal.environment.gov.za/hosting/rest/services/CSG_Cadaster/CSG_Cadastral_Data/MapServer/1). Verify availability and terms; repair certificate/access problems or use an authorised alternative, never disable TLS checks in production.
- Reuse existing DWS/NGI river and dam services and transmission-line overlays with source metadata, feature limits and partial-result disclosure. Audit service freshness; a service edit timestamp is not necessarily each feature’s survey date.
- Regional climate: [NASA POWER API](https://power.larc.nasa.gov/docs/services/api/). Preserve grid scale, period, missing-data handling and distinction between climatology and current conditions.
- Modelled soil: extend the existing SoilGrids pH/clay bake and metadata, documented in `scripts/data/sources.json`. Verify uncertainty, coverage and depth intervals before exposing new interpretations. Use [ISRIC documentation](https://docs.isric.org/globaldata/soilgrids/) when changing acquisition, and avoid an unreliable per-click dependency.
- Aerial context: retain [NGI imagery service](https://imagery.esri-southafrica.com/server/rest/services/NGI/RSA_NGI_AERIAL/ImageServer) with available acquisition metadata. Its service grid size does not establish universal capture accuracy; existing catalogue dates are historical, not live imagery.
- Roads, markets, rainfall trends, flood/fire exposure and land cover are later enrichments. Each requires an approved source, spatial scale, update policy and licensing decision before a UI promise.

## 8. User experience specification

### Discover

Open with useful counts, search and the map. Make “currently advertised,” “historical notices” and “coverage unknown” unmistakable. Province and district selections should update both map and results immediately. Search by farm name, official reference, municipality, district and province.

Preserve filters, selected opportunity and meaningful view state in the URL. Avoid serialising every camera animation frame. Users can share a filtered view and return to the same opportunity.

### Inspect

A tap opens a compact summary with name, status, area, location confidence, deadline and two primary actions: **View land** and **View requirements**. Expand into a dossier containing evidence, terrain, water/power context, agriculture, scenario and application steps.

On mobile, use one active bottom sheet with explicit compact/expanded states, a persistent close button and safe-area spacing. On desktop, use a side panel that leaves map context visible. Collapsing a region restores crisp surrounding geometry. Selection must not depend on hover or colour alone.

### Analyse

The dossier starts with “known,” “estimated” and “still to verify.” Use local parcel data when available and clearly bounded district context otherwise. Let users compare three properties without treating missing soil or water information as a low numeric score.

### Act and return

Offer the official notice, application checklist, contact details and saved opportunity. Reminders require opt-in. Provide printable dossiers and a corrections link. Track important changes so a returning user sees a deadline extension or withdrawal instead of stale advice.

## 9. Terrain detail without slow or misleading graphics

Use three levels of detail:

1. **National/provincial overview:** simplified boundaries, lightweight anatomy relief, labelled district summaries and opportunity clusters.
2. **Regional inspection:** tiled terrain, modest imagery detail, rivers/dams/lines and selected district context.
3. **Opportunity inspection:** verified parcel outline where available, optional high-detail aerial imagery, focused infrastructure queries and source details.

Keep anatomy and atlas as complementary experiences. The anatomy view communicates geography and themes; the atlas shows real-world context. A selected exploded region must retain a clear geographic reference when transitioning to the atlas.

Only load extra detail after the user selects a place or enables it. Cancel obsolete requests during navigation, reuse caches, simplify geometry by zoom, dispose textures/geometries on teardown and recover from WebGL context loss. Keep a 2D/list fallback.

Do not add dense procedural vegetation, animated water or photorealistic farms that imply real observed conditions. If illustrative 3D renders are ever used, label them as illustrations and keep them outside the evidentiary map. Do not upsample a coarse DEM and call it higher-resolution land data.

Never bulk-cache third-party tiles or build offline imagery packs without checking provider terms. Offline support can first cover saved text dossiers and user scenarios.

## 10. Agriculture and enterprise planning

### Screening, not unsupported certainty

Build a transparent screening pipeline: verified restrictions → location confidence → climate/soil/terrain evidence → water/access constraints → enterprise assumptions. Explain every exclusion and every missing input. Do not issue a single authoritative suitability score when coverage is incomplete.

For polygons, calculate summaries only if the source resolution supports them; show covered area and nodata fraction. For district-only records, show district context, not fabricated farm values. Crop calendars and hazard information need regional validation.

### Enterprise coverage

Support an extensible taxonomy covering field crops, vegetables, orchards/perennials, cattle, sheep/goats, dairy, poultry and mixed enterprises. Add protected cropping, aquaculture or other specialised modules only with suitable reviewed assumptions. “All enterprises” means extensible breadth with visible support status, not one generic formula pretending to fit everything.

Each module defines physical units, production cycle, area/capacity limits, establishment period, operating costs, sales timing, replacement costs and biological/production risks. Distinguish per-hectare, per-animal, per-batch and annual values.

Calculate startup capital, maximum cumulative cash deficit, working capital, operating margin, break-even price/yield and year-by-year cash flows. Add debt service and financing assumptions explicitly. Model establishment years for perennials and mortality/feed cycles for livestock. Prevent double-counting setup costs and reserve cash.

Support independent yield, price, input-cost and loss shocks; avoid coupling yield and price to one factor. Start with deterministic pessimistic/base/optimistic scenarios; introduce probability simulations only with defensible distributions.

Benchmarks must identify region, date, enterprise, source and whether tax/transport/owner labour are included. They remain editable and distinguishable from user quotations. Outputs should be called scenarios, not guaranteed profits or verified financing eligibility.

## 11. Implementation work packages

Implement one bounded package at a time. Split packages into smaller pull requests when they cross unrelated systems. Every package requires a short completion record: files changed, behaviour, evidence, tests, remaining risks and rollback. Feature flags and compatibility adapters are preferred for replacing live paths.

### Milestone A — reconcile the existing foundation and close correctness gaps

#### P00 — Reconcile the current tree and existing execution ledger

**Reviewed status:** Foundation largely implemented; reconciliation and isolated verification required. Reuse existing M0/QC tooling.

- **Depends on:** nothing.
- Inspect repository instructions, working tree, current routes and runtime configuration; record actual installed versions.
- Reconcile the existing `docs/milestone-status.md` with committed files, especially M1.3. Retain ownership information, add P/M cross-references and correct stale README/baseline notes. Keep the working ESLint command and existing measurement infrastructure.
- Run `npm run check`, then isolated `npm run build`, `npm run budget`, `npm run e2e` and `npm run shots` as applicable. Review screenshots. Re-measure quality/performance against preserved baselines on a quiet machine; record environment and variability.
- **Done when:** checks are reproducible, existing failures are distinguished from changes, and unknown performance metrics remain marked unmeasured.

#### P01 — Make feed validation and availability safe

**Reviewed status:** Open and urgent: the unsafe feed default and weak validation remain unchanged.

- **Depends on:** P00.
- Work in `src/lib/source.ts`, shared types and relevant API tests. Replace permissive normalisation with explicit schemas, finite coordinate/range validation, nullable unknowns, bounded payloads and fetch timeouts.
- Remove the missing-status → open default. Preserve last-good data where durable storage exists; otherwise show a truthful unavailable state until P03 supplies persistence.
- **Done when:** malformed, missing-status, oversized and timed-out feeds cannot produce false open opportunities or erase a good snapshot.

#### P02 — Define canonical entities and lifecycle rules

**Reviewed status:** Open: explorer selection types exist, but a canonical opportunity/evidence lifecycle does not.

- **Depends on:** P01.
- Add versioned domain schemas for Section 6, stable IDs, units, date precision and source assertions. Document an ADR for status and opportunity/parcel separation.
- Implement pure lifecycle functions with an injected clock.
- **Done when:** fixtures cover extensions, withdrawal, re-advertisement, date-only deadlines, duplicate farm names and unknown status without inference of allocation.

#### P03 — Add durable catalogue and evidence storage

**Reviewed status:** Open: no durable catalogue/evidence storage is configured in the reviewed tree; hosting decision required.

- **Depends on:** P02.
- Validate hosting bindings, select the persistence adapter, create migrations, a local setup, evidence object references and publication snapshots.
- Establish backup/export and restoration procedures. Isolate secrets from frontend bundles and fixtures.
- **Done when:** an interrupted import leaves the previous published version intact; a tested restore reproduces record counts and evidence references.

#### P04 — Migrate the existing catalogue without inventing completeness

**Reviewed status:** Open migration; existing 22 records and two polygons are unchanged. Coordinate with M2.5, not a second importer.

- **Depends on:** P03.
- Import the 22 reviewed notices, current coverage metadata and two cadastral matches, preserving IDs/redirects, citations, dates and explicit uncertainty.
- Cross-district notices count once as opportunities while remaining discoverable in each relevant district. Keep historical status separate from current checks.
- **Done when:** map/list/dossier counts reconcile, known matches survive, ambiguous Northern Cape boundaries remain unverified, and no synthetic open listings appear.

### Milestone B — a maintainable national information supply

#### P05 — Build the source register and coverage page

**Reviewed status:** Partly implemented: docs/data/sources.md and raster-source configuration exist; operational coverage and public source health remain.

- **Depends on:** P02–P04.
- Extend `docs/data/sources.md` and existing raster metadata with operational official-notice source records: scope, cadence, terms, reviewer and health. Verify its currently documented but absent `src/content/sources.ts` integration. Add public coverage and district messages from one shared record.
- **Done when:** “no results,” “source unavailable” and “not yet reviewed” are distinguishable; each count has a stated scope and timestamp.

#### P06 — Implement deterministic notice ingestion

**Reviewed status:** Open for notices. Reuse the existing pipeline runner; raster baking is not notice ingestion. Overlaps M2.5.

- **Depends on:** P03, P05.
- Add notice acquisition nodes to the existing pipeline and source-adapter architecture: HTML/PDF, checksums, conditional fetches, parser versions, size limits and evidence retention. Reconcile M2.5 file ownership and start with DLRRD/Northern Cape/Limpopo; do not duplicate the raster pipeline runner.
- Extract critical fields into drafts; OCR and optional model extraction cannot bypass validation/review.
- **Done when:** running twice creates no duplicates, a changed PDF at the same URL generates a reviewable diff, and extraction failures retain evidence for repair.

#### P07 — Add authenticated editorial review

**Reviewed status:** Open: no authenticated editorial workflow found in the reviewed application structure.

- **Depends on:** P06.
- Build a focused review queue showing extracted values beside source page references; allow approve, reject, correct, merge-candidate and escalate-location actions.
- Use real authentication, roles, server-side authorisation, CSRF protection where applicable and immutable audit events.
- **Done when:** anonymous users cannot mutate records, conflicting critical assertions require resolution, and every publication can identify its reviewer and evidence.

#### P08 — Publish updates and manage source health

**Reviewed status:** Open for catalogue publication. Data-build tooling exists; durable source monitoring/publication does not.

- **Depends on:** P07.
- Add versioned publication, cache invalidation, retries/backoff, source-health alerts and an idempotent scheduled runner where supported.
- Keep stale verified data visible with its age; withdrawn opportunities lose accepting status immediately after publication.
- **Done when:** upstream outage, job retries, duplicate execution and a rollback are exercised without data loss or duplicate publications.

#### P09 — Expand and audit all provinces

**Reviewed status:** Open: notice coverage remains four provinces, despite 52 district environmental summaries.

- **Depends on:** P05–P08.
- Add remaining provincial/municipal source adapters in small batches. Use a labelled sample to measure extraction precision and review backlog.
- Separate historic records from new advertisements, and record excluded channels explicitly.
- **Done when:** all nine provinces have useful coverage explanations and functioning registered-source checks. Do not gate this on finding an arbitrary minimum of open farms.

### Milestone C — coherent discovery and parcel dossiers

#### P10 — Unify read APIs and retire divergent data paths

**Reviewed status:** Open: optional Listing feed and embedded FarmNotice paths are still separate.

- **Depends on:** P04, P08.
- Implement paginated Section 6 contracts and shared filter semantics. Adapt current components gradually through a compatibility layer.
- Remove unnecessary polling for static/no-feed states; use dataset versions and conditional requests.
- **Done when:** the same filter produces matching map, list, facet and export counts, with bounded response size and stable pagination.

#### P11 — Add search, shareable state and useful empty states

**Reviewed status:** Partly implemented: M1.2 store/codecs exist; live selection, complete URL hydration/writing and history need integration.

- **Depends on:** P00 for the immediate store/URL repair slice; P10 for full catalogue filtering.
- Finish wiring `LandLocator.tsx` to `src/state/explorer.ts` and `src/state/url.ts`. Notice and point clicks must update canonical selection; restore/write depth, layers and land camera; support Back/Forward and preserve unrelated parameters. Hydrate each supported selection kind and derive province for layer selections correctly.
- Add status, enterprise, area, tenure and confidence filters with reset controls.
- **Done when:** shared links restore selection, Back/Forward works, and a zero-result screen offers clear scope and useful alternatives without asserting no land exists.

#### P12 — Build the evidence-first opportunity dossier

**Reviewed status:** Partly implemented: LandDossier and /guide exist; reuse them for M2.3 inspect cards and the richer evidence dossier.

- **Depends on:** P10, P11.
- Evolve existing `LandDossier.tsx` into the M2.3 inspect-card registry with summary, official evidence, history, location, agricultural context and application sections. Reuse `/guide` and shared UI primitives. Load expensive sections progressively.
- Add printable output and a correction action. Make external source links and missing information obvious.
- **Done when:** users can identify status, location certainty, deadline and official next step within one screen; a source failure does not blank the dossier.

#### P13 — Improve cadastral matching and map placement

**Reviewed status:** Open expansion: two cadastral matches only; overlaps the notice/matching work in M2.5.

- **Depends on:** P07, P12.
- Build a reviewer-assisted matching workflow using official identifiers, advertised portions, administrative boundaries and area discrepancies.
- Store candidate matches and rejection reasons; keep lease geometry distinct from cadastral geometry.
- **Done when:** exact matches, ambiguous names, cross-district units and partial-parcel leases are handled; uncertain records never receive misleading precise boundaries.

### Milestone D — fast, accessible maps on real devices

#### P14 — Make mobile interaction consistent

**Reviewed status:** Partly implemented: tokens/primitives exist; QC1 still records label, target-size and contrast debt. Align with M1.4/M1.5/M3.3.

- **Depends on:** P11, P12.
- Standardise compact/expanded sheets, close controls, safe areas, focus return and one active overlay. Maintain 44 px minimum design targets for important touch controls.
- Add keyboard-equivalent navigation and reduced-motion behaviour. Keep surrounding regions crisp when collapsing selections.
- **Done when:** 360 px phones, landscape phones, tablets and desktop work at normal and enlarged text sizes without hidden controls or scroll traps.

#### P15 — Profile and enforce rendering budgets

**Reviewed status:** Partly implemented: quality/performance/budget tooling and worker fix exist; measured targets and initial-load resilience remain unmet.

- **Depends on:** P00 for the immediate initial-load resilience slice; P14 for full interaction-budget verification.
- Reuse `quality`, `perf`, `budget` and existing baseline files. Measure repeated runs on the same commit/environment. Repair initial-imagery failure so vector layers and useful information do not depend on successful basemap loading; test first-request failure as well as mid-session failure. Keep lazy renderers, demand rendering and quality caps.
- Fix only measured bottlenecks; dispose resources and handle context loss. Add bounded caches and cancellation tests where missing.
- **Done when:** representative mobile journeys meet agreed budgets or have a documented blocking measurement; optional high detail never delays core information.

#### P16 — Improve terrain and imagery by scale

**Reviewed status:** Partly implemented: regional DEM, real terrain and optional aerial imagery exist. Scene refactor claim is unconfirmed; M2.1/M3 integration remains.

- **Depends on:** P13, P15.
- Resolve the missing M1.3 scene implementation before M1.4/M2.1 work. Integrate existing `depth.ts`, implement Section 9 detail levels and the Model-to-Land handoff, and add clear resolution/acquisition labels. Preserve the worker fix and verified layer order.
- Verify actual imagery footprint and fallback behaviour; keep historical imagery date visible.
- **Done when:** a parcel can be inspected at useful detail without fetching high-resolution national data, and no coarse geometry is advertised as survey detail.

#### P17 — Make infrastructure actionable and honest

**Reviewed status:** Partly implemented: real bounded overlays exist, but direct layer additions remain and actionable proximity/coverage need work.

- **Depends on:** P12, P13, P15.
- Finish migrating `InfrastructureOverlay.tsx` direct layer additions into the existing registry before extending river/dam/power cards with source, feature date if known, distance method and verification questions. Surface partial/truncated queries.
- Precompute permitted proximity summaries for verified locations; distinguish straight-line distance from a route or a feasible connection.
- **Done when:** users understand mapped presence versus usable access, and unavailable/truncated layers cannot falsely report “no water/power nearby.”

### Milestone E — agricultural decisions and financial scenarios

#### P18 — Version climate and terrain analysis

**Reviewed status:** Partly implemented: NASA POWER endpoint, CHIRPS bake and M2.2 district summaries exist. Integrate/version; do not recreate them.

- **Depends on:** P12, P13.
- Reuse the existing CHIRPS bake, district-statistics output and NASA POWER endpoint. Connect M2.2 output through M2.3/M2.4, then expose versioned observations while preserving units, temporal periods, sample counts and nodata.
- Add elevation/slope only from an appropriate elevation source; label location scope and source resolution.
- **Done when:** an unknown location cannot receive parcel-specific analysis, repeated visits reuse results, and partial inputs remain explicit.

#### P19 — Add modelled soil with uncertainty

**Reviewed status:** Partly implemented: SoilGrids pH/clay rasters and district means exist. UI wiring, coverage/uncertainty and analytical validation remain.

- **Depends on:** P18.
- Reuse the committed SoilGrids pH/clay bake and district summaries. Wire them into inspect cards and thematic slices, then add uncertainty/coverage metadata. Audit resampling and depth-weighting; show native resolution and actual baked grid separately. Fix the source-note conversion: 5 g/kg clay is 0.5 percentage points, not one twentieth of a percent. Existing district percent conversion uses g/kg ÷ 10 and should remain correct.
- Label current means as modelled regional context. District land-cover shares are shares of classified grid cells; rainfall p10/p90 describe spatial variation across climatological cells, not year-to-year drought probability. Add valid/total coverage and test whether area weighting is needed before using these summaries for parcel decisions. Show a soil-testing checklist; keep later lab results separate.
- **Done when:** missing tiles, unsupported depth and source outage produce honest unavailable states, and outputs never masquerade as sampled farm soil.

#### P20 — Introduce transparent enterprise screening

**Reviewed status:** Open: no complete evidence-driven enterprise-screening engine was established by this review.

- **Depends on:** P17–P19.
- Implement explainable, versioned constraints using evidence and explicitly entered assumptions. Begin with reviewed rules for a small enterprise set, then expand.
- Separate prohibited, potentially plausible and insufficient-information outcomes; allow users to inspect the reason.
- **Done when:** missing water evidence does not silently qualify irrigated crops, and every conclusion points to rules and supporting inputs.

#### P21 — Replace generic budgets with enterprise modules

**Reviewed status:** Open expansion: five existing templates remain the starting point, not a comprehensive enterprise engine.

- **Depends on:** P02, P12.
- Evolve `src/lib/farm-budget.ts` behind a compatible interface. Add units, production cycles, dated assumptions and module-specific calculations for the enterprise families in Section 10.
- Deliver crops, grazing livestock, poultry, dairy and perennials as separate reviewed increments; show planned modules as unavailable until real calculations exist.
- **Done when:** unit checks, establishment years, working capital, mortality/production losses and cash timing are tested against independently calculated examples.

#### P22 — Add comparison, sensitivity and exports

**Reviewed status:** Open for opportunity/scenario comparison. Existing historical Compare controls are not this capability.

- **Depends on:** P20, P21.
- Compare up to three dossiers and scenarios with identical units and explicit gaps. Add independent yield/price/input shocks and readable cash-flow views.
- Export assumptions, sources, calculation version and results together. Prevent CSV formula injection where exports include source/user text.
- **Done when:** users can reproduce a result from exported inputs and distinguish factual property differences from chosen assumptions.

### Milestone F — repeat use, trust and public readiness

#### P23 — Add saved opportunities and application workspaces

**Reviewed status:** Partly implemented only at checklist level: existing Preflight is reusable; saved opportunity workspaces/account sync are not established.

- **Depends on:** P12, P21.
- Start with local saved items and checklists; add account syncing only when required. Link to official forms and requirements with checked dates.
- Avoid collecting identity documents in the first release. Never automatically submit applications or contact officials.
- **Done when:** saved items survive reload, changes are highlighted and export/delete controls work; no checklist implies government approval.

#### P24 — Deliver opt-in change alerts

**Reviewed status:** Open: no verified opt-in change-alert pipeline identified.

- **Depends on:** P08, P23.
- Add saved-search matches, deadline changes and withdrawals with explicit consent, unsubscribe and event deduplication.
- Record deliveries, retry safely and prevent reminders after a withdrawal or superseding notice.
- **Done when:** a repeated job sends one alert, changed deadlines update schedules, and unsubscribed users receive no further deliveries.

#### P25 — Add low-data and offline text support

**Reviewed status:** Open: no offline dossier/scenario delivery identified.

- **Depends on:** P12, P14, P23.
- Save selected text dossiers/scenarios with source dates and an offline indicator. Refresh on reconnect without overwriting unsaved user edits.
- Do not cache authenticated admin responses, private application content or bulk imagery through a broad service-worker rule.
- **Done when:** an offline user can read saved information and clearly sees that availability requires reconfirmation.

#### P26 — Harden security and production operations

**Reviewed status:** Partly implemented: webhook query secrets and broad image hosts removed. Remaining source, editorial, runtime and verifier trust checks are required.

- **Depends on:** P03, P07, P10; required before exposing new write capabilities.
- Preserve the completed header-only webhook secret and removed broad image-host configuration. Add regression coverage if missing; complete appropriate authentication and bounded-source protections without reimplementing those fixes.
- Enforce source URL allowlists, redirect revalidation, SSRF protections, bounded file processing, rate limits and secret-safe logs. Treat PDF/HTML/model text as untrusted input.
- For `/verify`, distinguish internal consistency from signed-log authentication. Bind receipts to verified log entries and a trusted organiser key before claiming an authenticated round; define key distribution/rotation, time/order guarantees and privacy. Keep the real log empty until an authorised real round exists. Add tampered-log, substituted-key and receipt/log-mismatch cases. This is a separate slice, not a reason to block ordinary map browsing.
- **Done when:** abuse cases are tested, restore is rehearsed, production errors are observable, editor permissions hold server-side and verification labels match what is actually checked.

#### P27 — Launch a measured public pilot

**Reviewed status:** Partly implemented tooling/routes only: CI, screenshots, /guide and /verify exist; public readiness and deployed parity need evidence.

- **Depends on:** P09–P17, P26; agricultural modules may launch incrementally with their own gates.
- Test with prospective farmers, extension practitioners and a land-information reviewer. Include low-data users and assistive technology.
- Add server-rendered opportunity/district pages, metadata, sitemap and clear independent-resource branding when public publishing is authorised. Avoid indexing private data or thin empty pages.
- **Done when:** key user outcomes and performance targets are demonstrated, corrections have an owner, and deployment/audience changes are deliberate and documented.

#### P28 — Add grounded assistance and partner access

**Reviewed status:** Not implemented as grounded assistance/partner service. Existing cryptographic verification is a separate capability to preserve and constrain.

- **Depends on:** P27 and sufficient reviewed evidence; optional after core value is proven.
- A question-answering assistant retrieves published evidence and cites it. It uses deterministic scenario tools, explains missing information and never changes availability or suitability by invention.
- Add rate-limited, documented read APIs and licensed exports for partners. Establish correction/verification relationships with extension services and publishers.
- **Done when:** evaluation questions test stale notices, conflicting evidence and missing locations; unsupported answers abstain, and AI cannot publish records or submit applications.

## 12. Release sequence, staffing and cost discipline

**Immediate stabilisation:** the revised sequence in Section 2, starting with P00 reconciliation, P01 safety and P11/P15 integration. Do not repeat completed engineering setup.

**First reliable catalogue release:** the remaining P02–P08/P10–P12 work and relevant P26 controls. Deliver trustworthy Northern Cape/Limpopo coverage, current/historical distinctions, evidence and usable dossiers before more visual effects.

**National discovery release:** remaining P09/P13–P17 work, coordinated with M1/M2/M3 in `docs/PLAN-MAP-10X.md`. Deliver all-province coverage reporting, better location matching and reliable mobile terrain inspection.

**Decision-support release:** P18–P22, with enterprise modules released separately after review. Do not hold catalogue improvements hostage to completing every enterprise model.

**Retention/public expansion:** P23–P28 after the applicable privacy, reliability and publishing gates.

Plan work by demonstrable packages, not by a promise that one model can deliver the entire system in a weekend. Estimate remaining calendar time after reconciliation and the pilot adapter establish actual complexity; completed foundations reduce setup work but do not remove ongoing source-review effort. Database access, licences, source instability and human review can dominate the schedule.

Budget separately for hosting/database, evidence storage, background OCR, imagery/geodata requests, email delivery, observability and optional AI. Record unit costs rather than guessing a fixed monthly figure. Start with manual review and a small source set; expand only when backlog and spending are visible.

Assign an owner for source review and corrections. Coding alone cannot sustain a trusted national resource. Daily ingestion checks, weekly unresolved-record review, periodic policy/finance-content review and scheduled data-quality audits need real ownership.

## 13. Cross-cutting acceptance and regression checks

Use synthetic fixtures only in tests, clearly marked. Add meaningful tests for new logic; do not inflate coverage with assertions that repeat implementation details.

### Catalogue and evidence

- Unknown status never becomes open; expired notices never automatically become allocated.
- A withdrawal overrides an earlier acceptance window; extensions preserve history.
- Re-advertised land is traceable without collapsing different opportunities.
- A multi-district notice counts once provincially and is discoverable in both districts.
- Two farms with the same name are not automatically merged.
- A PDF changing at the same URL creates a new document version.
- A source outage preserves a labelled last-good publication.
- Conflicting areas or identifiers remain in review and cannot generate precise misleading geometry.

### Maps and accessibility

- Select province → district → opportunity → terrain → close → Back works on a phone.
- District-only notices appear in district groups, not fake farm pins.
- Switching views disposes the previous renderer and aborts obsolete requests.
- No WebGL, context loss, missing imagery and partial infrastructure results preserve list/dossier use.
- Closed sheets release focus correctly; Escape, touch and screen-reader labels work.
- Text zoom, landscape and safe-area layouts do not hide primary controls.

### Analysis and security

- Rainfall/temperature units, date periods and nodata remain correct; model resolution is visible.
- Scenario units cannot mix hectares, head and batches; independent shocks behave as specified.
- Exports reproduce the calculation version and original assumptions.
- Anonymous mutations, forged webhooks, hostile source URLs and oversized uploads fail safely.
- Notification retries do not duplicate messages; unsubscribe works.
- Production logs and analytics contain no secrets, application documents or unnecessary personal data.

Follow the existing `AGENTS.md` loop: `npm run check` after changes, and build/e2e/shots with screenshot review before code commits; run budget and relevant quality/performance checks for map changes. Avoid concurrent builds or shared-port test runs. For this Markdown-only update, those application checks were not rerun. Production build success alone is not proof of data accuracy, mobile usability or deployed runtime compatibility.

## 14. DeepSeek V4.1 Flash in OpenCode: execution workflow

### Run inside the existing Codespace

The owner wants recovery and application commands to stay inside Codespaces. Do not request local Mac Terminal commands or a broader personal Codespaces token. For uncommitted work, run `docs/ASBONGE_REPOSITORY_RECOVERY.md` in the original workspace first. Publishing these documents does not recover that workspace or change the app.

### Confirm the installed tools and model identifier

The repository now has `opencode.json` with model entries for `ollama-cloud` (`deepseek-v4.1-flash:cloud`) and `clinepass` (`deepseek-v4.1-flash`). Preserve that provider setup and inspect the installed model list; configuration presence does not prove authentication or version compatibility. The direct DeepSeek API uses `deepseek-flash`, which is not a reason to overwrite a working intermediary-provider model ID. OpenCode selection uses the exact installed `provider/model` identifier. See [DeepSeek’s release announcement](https://api-docs.deepseek.com/news/news260910/) and [model documentation](https://api-docs.deepseek.com/quick_start/pricing/).

```sh
cd /workspaces/Land-agriculture
opencode --version
opencode models --refresh
```

Use your existing authenticated provider. If setup is needed, follow the installed version’s provider documentation; keep credentials outside the repository. OpenCode supports model selection and attached files for `run`; confirm flags against `opencode run --help` if your version differs. [OpenCode CLI documentation](https://opencode.ai/docs/cli/).

Example, replacing the model placeholder with the exact listed identifier:

```sh
opencode run \
  --model 'EXACT_PROVIDER/MODEL_FROM_OPENCODE_MODELS' \
  --file 'docs/ASBONGE_IMPLEMENTATION_PLAN.md' \
  'Perform the P00 reconciliation slice only. Compare milestone claims with committed files and reuse the existing checks.'
```

### Execution contract for the coding agent

- Read applicable repository instructions and inspect `git status` before editing. Preserve unrelated work.
- Reconcile this remote baseline with the actual working tree and any unpushed changes. Do not run against the stale local baseline or assume M1.3 exists because the ledger says so. Check existing file ownership before editing.
- Work on one package or one clearly bounded slice per session. Keep domain/data, frontend and infrastructure changes separable.
- Before editing, state the task ID, relevant files, intended behaviour and acceptance checks.
- Prefer existing dependencies and patterns. Check actual installed APIs before adding version-sensitive configuration.
- Use primary-source documentation for new integrations. Save source URLs, fetch dates and limitations in task notes.
- Keep extraction and generated recommendations subordinate to evidence and deterministic validation.
- Run the checks relevant to the change; never claim a test or deployment ran if it did not.
- Update the existing `docs/milestone-status.md` with the task claim, P/M cross-reference, exact commit and actual checks. Keep one occupancy/continuation ledger; do not create a rival status document.
- When a service or credential is unavailable, implement/test the interface with isolated fixtures, expose a truthful unavailable state and record the exact blocker. Do not manufacture production data to make the demo look complete.
- Do not run destructive migrations, change public visibility or deploy merely because an implementation task passed. Follow the owner’s actual release instruction and the established hosting path.

The repository already has `AGENTS.md` with one-task diffs, file claims, dependency boundaries and check/build/e2e/shots requirements. Read and follow it; do not replace it with a new generic rules file. [OpenCode rules documentation](https://opencode.ai/docs/rules/).

### Keep Flash sessions focused

Provide the current task, necessary files, domain rules and latest checkpoint. Avoid sending the full repository, repeated large logs or full PDF collections into every prompt. Break a large package into one vertical slice with an observable result, then review it before expanding.

Use a short inspect → implement → test → review → checkpoint loop. If the same failure repeats, stop broad edits, isolate a reproduction and inspect the actual error. Do not fix failing assertions by removing evidence requirements or weakening validation.

If using four agents later, give them distinct responsibilities and file ownership: data/domain, maps/mobile, agricultural calculations, and validation/review. Agree on shared types first. Run data migrations, shared contract edits and integration sequentially; do not have four agents rewrite `LandLocator.tsx` concurrently.

### Checkpoint template

```markdown
## Pxx — Task name
Status: not_started | in_progress | blocked | complete
Baseline commit:
Scope completed:
Files changed:
Source evidence / decisions:
Checks run and actual results:
Remaining acceptance criteria:
Blockers and exact required dependency:
Rollback / recovery:
Next bounded action:
```

### Ready-to-paste master prompt

```text
You are implementing Asbonge in the existing Land-agriculture repository.
Read ASBONGE_IMPLEMENTATION_PLAN.md and applicable repository instructions.
Inspect git status, package.json, AGENTS.md, docs/milestone-status.md and
docs/PLAN-MAP-10X.md. Compare the actual files with this reviewed commit.
Reconcile the plan with the current code before making changes.

Start with the Section 2 reconciliation slice of P00, unless its evidence is
already recorded against the actual current commit. Cross-reference the existing
M-task plan and file claims. Never infer completion from the status ledger alone.
Implement one bounded, reviewable slice; do not attempt the whole roadmap.
Preserve the existing explodable 3D map, atlas, mobile behaviour and useful work.

Treat official facts, estimates and user assumptions separately. Never invent
open government land, farm coordinates, boundaries, soil values or profits.
Unknown availability must never default to open. Cite source evidence and dates.
Keep ordinary search/dossiers independent of slow third-party GIS requests.

Before editing, state the task ID, files, acceptance criteria and verification.
Then implement, run relevant checks, inspect the diff and fix regressions.
Update docs/milestone-status.md with actual results and the next action.
If an external dependency blocks completion, record it precisely and complete
independent work without pretending the dependency exists.

Finish with behaviour changed, checks actually run, unresolved risks and the
next task. Do not deploy or change visibility as an incidental side effect.
```

### First implementation prompt after this update

```text
Perform only the P00 reconciliation slice from the updated plan.
Read AGENTS.md, docs/milestone-status.md and docs/PLAN-MAP-10X.md.
Inspect the current commit, working tree and any work already in progress.
The reviewed remote commit is 404d91f0654db5c1e8c286c24fb0b8553686f93b;
the earlier local checkout was still beb2245. Preserve uncommitted work.

Verify the M1.3 claim against actual files: ModelView.tsx, scene core/camera/
pieces/picking/labels, deleted ExplodedMap.tsx and scene tests. If the work
exists elsewhere, record its actual location and commit rather than guessing
or rebuilding it. If absent, mark M1.3 unconfirmed and preserve owner claims.

Reuse the existing ESLint, graph, unit, Playwright and budget tooling.
Run the available checks in isolation and record actual results, including
any missing browser/runtime dependency. Preserve historical QC/perf baselines.
Correct stale documentation and add P/M cross-references to the existing
milestone ledger. Do not change application logic or provision infrastructure.
Finish with the next dependency-ready task and precise remaining blockers.
```

### Subsequent task prompt

```text
Continue from docs/milestone-status.md. Implement the next dependency-ready
slice of Pxx in ASBONGE_IMPLEMENTATION_PLAN.md. First confirm the prior slice's
acceptance evidence and inspect current code. Change only what this slice needs.
Use meaningful tests and update the checkpoint with actual results. Keep unknown
or unavailable production information explicit. Report what remains before Pxx
can be marked complete.
```

## 15. Definition of success

Asbonge becomes the resource people return to when it reliably connects official opportunities, honest location evidence, useful agricultural context and clear next steps. The distinctive map helps people explore; the maintained evidence, corrections and practical decisions earn their trust.

The next action is the **P00 reconciliation slice**, followed by **P01 availability safety** and **P11/P15 integration/resilience**. Reuse the engineering foundation, regional rasters and statistics already committed; verify the missing M1.3 claim before dependent scene work. The highest-value early outcome is a trustworthy, searchable catalogue with dossiers and transparent coverage. Build the richer terrain, enterprise analysis and AI on that foundation.