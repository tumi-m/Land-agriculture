# Asbonge: the 1000x plan

Make land reform execute.

Reviewed against the product as of 14 September 2026, at commit `5bbf781`. Read
against the 100x plan (`docs/PLAN-100X.md`, the register of record) and the
atlas plan (`docs/PLAN.md`). This document does not replace 100x. It changes the
physics. Figures cited below come from `src/content/`, which carries its own
sources and a review date (`CONTENT_REVIEWED`, `src/content/meta.ts`).

---

## 0. The short version

10x makes Asbonge a better object: a map a person in Vhembe can inspect, with sources on every layer.

100x makes Asbonge a better institution: the register DLRRD, DoA, the Land Bank and the Appeals Committee cannot work without.

Neither is enough. A register that still scores in a spreadsheet, still cannot lend against a lease, still writes business plans for last decade's rain, still splits land from support, still watches group farms collapse on governance — that is a digitised 1996.

1000x is a physics change. The rules run. The land argues about the next decade, not the last. A lease can be pledged without the state giving up the title. A determination is a proof the Auditor-General can verify without a login. Capture has to break cryptography and a published function, not a provincial inbox. The applicant in Tshivenda on a weak signal is the design centre, not a localisation ticket.

10x   = a map people trust
100x  = a file the state cannot work without
1000x = a physics the state cannot work around

100x asks: can the Director-General sign from the same farm file?

1000x asks: can the award be reconstructed by a stranger, the lessee borrow against the lease, the business plan fail honestly before it is printed, and the unsuccessful applicant hold a proof of the reasons — without anyone inventing a hectare to look finished?

---

## 1. Why 100x is not 1000x

100x is the correct next construction of the state we have. Execute it. Coverage, lodging, SLA clocks, stacked finance, officer Mondays, POPIA, PAJA, PFMA. That sequence stands.

It still leaves the failure modes that actually kill allocations:

| Failure | What 100x does | What still happens |
|---|---|---|
| Scoring in the dark | A live pipeline, written reasons as a button | The function that produced the score is still a person in a spreadsheet. Appeals argue about memory. |
| The PLAS trap | Names it. Prices CASP and BFS next to the lease. | The lease is still not collateral. Commercial credit stays closed. Grants remain the only oxygen. |
| Business plans for the wrong climate | A site report with source, date, resolution | The report describes the last decade. The farm has to live in the next one. Water licences expire in silence. |
| The 2024 split | A shared file; a status of "opened" | Two departments can still sign in the wrong order. A lease without a CASP file is still issuable if someone is in a hurry. |
| Group collapse | Field photos; post-settlement flags | Governance remains a PDF constitution in a drawer. Tswelopele had to fail before it was restructured. |
| Unused land as a rumour | Recapitalisation as a later phase | Underutilisation is noticed at the quarterly audit, or not. Termination clauses fire without a prior offer of help. |
| English, fibre, Pretoria | Eleven languages, WhatsApp, USSD, as a phase | The canonical system is still the website. USSD is a courtesy. Voice is a dream. |
| Capture as darkness | Dual control, public ledger of awards | The ledger shows who won. It does not let a stranger recompute why. Darkness moves into the function. |

A more complete register does not touch the physics of those eight. The 1000x plan does.

Human Atlas is the right inspiration for the object. Estonia's X-Road is the right inspiration for the institution. Neither is the inspiration for 1000x.

The inspirations that survive contact with a farm in Sekhukhune:

- **Brazil's CPR (Cédula de Produto Rural)** — a farmer can borrow against a future crop without surrendering the land. Steal the instrument. Do not steal the commodity-speculation culture around it.
- **Certificate Transparency** — an append-only log that anyone can audit, used for TLS, applicable to determinations. Steal the log. Do not steal the assumption of always-on fibre.
- **M-Pesa** — the protocol is the feature; the app is a view. Steal the nerve. Do not steal the telco toll.
- **Tswelopele itself** — individual plots on shared infrastructure. Steal the lesson. Encode it before the next co-operative eats itself.

What not to copy:

- Georgia's "blockchain land registry" — marketing around a database.
- Aadhaar as a chokepoint — identity that becomes a condition of eating.
- Social credit — a state-owned score that follows a person into every room.
- Predictive eviction — a model that terminates a lease from orbit.

1000x is named after a multiplier. It is built from refusals as much as from inventions.

---

## 2. The product: one farm, one farmer, one clock, one proof

100x thickens a single farm file from notice to appeal. Keep that spine.

1000x adds three objects the file is not:

```
FARM        the parcel and everything that is true of it
            (cadastre, water, climate trajectory, advert, lease, PFMA number)

FARMER      the person or entity, owning their own history
            (credentials they disclose, not a score the state computes about them)

CLOCK       the PAJA timer, started by a bearer receipt
            (hash-chained; survives Asbonge being down)

PROOF       the publicly recomputable why of an award
            (published function + published facts + Merkle inclusion)
```

If a field is unknown, the object says Not recorded, with the source that was asked. Inventing a water right to look finished is how the next Tswelopele fails. Inventing a yield to train a model is how the next capture learns to speak fluently.

The four objects compose. They do not merge. A farmer is not a farm. A proof is not a press release. A clock is not a dashboard widget.

---

## 3. Twelve inventions

Each invention is "10× on one 100x axis". Twelve of them, in this order, is the 1000× on the physics. They are numbered so they can be argued with. They are not a roadmap of tickets.

### 01 — Executable BSLAP

From: A policy PDF that officers interpret into a spreadsheet.

To: The Beneficiary Selection and Land Allocation Policy, compiled to a pure function. Same annexures in, same score and same written-reasons template out, forever.

Why this is the first invention. Capture does not need to steal a farm if it can adjust a cell. An appeal that cannot re-run the function is an argument about memory. Publish the function. Version it. Date it. When the Minister changes a weight, that is a new version with a name, not a quiet edit. The DG pack is the trace of the function against the live estate, not a Word document assembled on Sunday night.

The function is allowed to say cannot score: missing annexure, unconfirmed SG code, expired TCS PIN. "Cannot score" is a first-class output. Forcing a number is how the next captured round will look legitimate.

### 02 — The Lease Pledge

From: A 100x file that names the PLAS trap and then still cannot borrow.

To: A registered, dual-control lease interest that the Land Bank and accredited development-finance institutions can take as security — without the state surrendering the title deed.

Why. PLAS keeps the title with the Republic. That is a political choice: it blocks speculative resale and keeps a productive asset intact. It is also why ordinary production credit is closed. Lessees pour their own money into soil on a contract the department can terminate on its own assessment of underutilisation. Banks are not confused. They are reading the clause.

The Lease Pledge is a statutory instrument, not a feature:

- The state remains owner.
- A pledge may be registered against the lease, visible on the farm file, dual-controlled (DLRRD + Land Bank).
- Default on the loan does not transfer the land. It transfers the remaining lease term, to a qualified Category 3 or 4 operator, through the same selection function, not through a private sale.
- Termination for underutilisation cannot fire until a public unused-land finding and a recapitalisation offer the lessee refused or ignored. The satellite (invention 06) can start that clock. It cannot finish it.

Brazil's CPR lets a farmer borrow against a future bag of soya. South Africa can let a farmer borrow against a remaining term on a state lease. The title stays where the politics put it. The working capital finally arrives.

Without this invention, 100x's stacked file is a more polite way of saying "apply for another grant".

### 03 — Hash-chained PAJA

From: Written reasons as a button, an audit log, a public ledger of awards.

To: Every receipt, score, interview attendance, determination and reasons document is appended to an append-only log. The public ledger is a Merkle tree of awards. Unsuccessful applicants hold a personal inclusion proof of their file and the reasons; their identity never appears on the public tree.

The receipt is a bearer instrument. QR on paper, SMS, USSD retrieval, printed at the PSSC. It starts the PAJA clock when it is issued, even if Asbonge is down for a week. A system of record that cannot issue a receipt without itself is not a system of record. It is a website.

The Auditor-General does not "get a login". The Auditor-General verifies a proof. The Appeals Committee re-runs invention 01 against the log, not against a reconstructed email chain.

Certificate Transparency proved that an append-only log can discipline a global system of certificates. Administrative justice is a smaller problem with a harder constituency. Do it anyway.

### 04 — Zero-knowledge eligibility

From: POPIA as a notice stapled to a folder of bank statements that every clerk can open.

To: An applicant proves, to every inbox that does not need the underlying documents, the predicates the law actually requires: not a serving public servant; cooling-off elapsed; assets under the advertised bar; category claimed. The DBSC and the PTC still receive what they must receive to score and to test feasibility. A district officer who is not on the file does not.

Why. POPIA by construction, not by policy PDF. The current leak surface is not a hacker. It is a shared drive. ZK does not hide disqualifying facts from the lawful decision-maker. It hides them from everyone else. If a predicate cannot be proved, the function (invention 01) returns cannot score, not a wink.

Refuse the Aadhaar pattern: eligibility proofs are not a condition of existing. They are a condition of this application. No national identity platform is implied, and none should be built from this file.

### 05 — The land argues about the next decade

From: A site report of land cover, soil, rainfall, slope, water, grid — each with source, date, resolution.

To: A single honest sentence about viability forward: given this parcel, this remaining DWS licence (or its absence), this CMIP rainfall trajectory, this slope, this soil or the recorded absence of soil, these enterprises remain viable with stated confidence, and these do not.

A business plan written for 1998 rain fails before it is printed. A Category 4 citrus proposal on a parcel whose water licence expired in 2021 fails as cannot score, not as a charming interview.

Unknown layers stay Not recorded. The sentence is allowed to be short: "Rainfall trajectory is sourced; soil is not; water right is not on the DWS extract we have. Do not pretend." That caption is the product.

This is not a recommendation engine. It does not pick a winner. It refuses physically impossible ones, and it says why, with the date of the climate run and the date of the licence extract.

### 06 — Satellite as witness, never as sheriff

From: Post-settlement photos and unused-land flags as a later phase.

To: Sentinel-2 (and any later public constellation) may notice that a field has not been worked. That notice has exactly one legal effect: it opens a recapitalisation file and books a human visit. It cannot terminate a lease. It cannot score a farmer. It cannot be sold. It cannot run on a farm file that lacks a POPIA purpose notice the occupier can read.

Why this constraint is the invention. Remote sensing applied to land reform has a natural vice: it wants to become an eviction machine. The unused-land clause in SLLDP is real; so is the history of people pouring their own money into soil on verbal caretaker agreements. A pixel is not a finding of underutilisation. A pixel is a reason to show up, with an offer of help, in daylight.

The Anti-Tswelopele battery (see §4) may read the witness. It may not sentence from it.

### 07 — Voice is the form

From: Eleven official languages as a localisation pass on an English website.

To: Form ALA is a conversation. The applicant speaks. The structured record is the artefact. English is a projection for the committee, produced by the same function that produced the conversation, with the original audio (or the original isiXhosa / Sepedi / Tshivenda / Afrikaans / isiZulu / Setswana / Xitsonga / siSwati / isiNdebele / Sesotho text) retained as the source.

Mid-range Android, offline-first, weak signal. If it cannot be completed by voice in Tshivenda at the edge of a network, it is not national. Literacy is not a proxy for the right to apply. English fluency is not a scoring criterion in BSLAP, and it must not become one by interface.

The model that transcribes and structures is forbidden to invent a yield, a water right, a closing date or a hectare. When it is unsure, the field stays Not recorded and the applicant is asked again. Fluent hallucination is worse than a blank.

### 08 — USSD is the protocol

From: WhatsApp and USSD as channels bolted onto a website.

To: Every state change in Asbonge has a 160-character encoding. Status of a file. Close-date of a watched farm. Retrieval of a bearer receipt. "Your interview is Tuesday at the PSSC." The web is a rich view of the same machine. WhatsApp is a transport. The app is a transport. The PSSC counter is a transport.

If an action cannot survive *120*123#, it is a privilege, not a public function. Design the state machine first. Draw the screens second. This is the M-Pesa nerve applied to administrative justice, without the telco toll as a chokepoint — USSD short codes can be zero-rated as a public service; that is a ministerial choice the product should make cheap.

### 09 — Farmer-owned credentials

From: A state file that accumulates facts about a person.

To: Training, mentorship hours, auction lots, repayment, yields the farmer chooses to disclose — held in a wallet the farmer takes to the next lease, the Land Bank, the FPSU, the provincial auction. The state may read, with a purpose recorded on the clock. The state does not own.

This is the opposite of a social credit score. A social credit score is computed about you, stored on you, used against you in rooms you did not enter. A credential is something you present, the way you present a tractor licence. Absence of a credential is not a finding. Category 1 household producers are not required to have an auction history. The function (invention 01) is forbidden from treating silence as a score of zero unless the advertised criterion explicitly required the document — in which case the output is cannot score, which is honest, not punitive.

### 10 — Governance as a protocol

From: A warning essay that communal property associations and co-operatives split into factions.

To: The Tswelopele lesson, encoded as the default group template: individual production plots on shared infrastructure. Plot assignment is a record. Labour contribution has a clock. Dividend versus operating reserve is a rule with a number, not a feeling. Disputes have an SLA. Meetings produce signed minutes that hash into the farm file (invention 03).

Collapse becomes visible while the pump still turns. The department's restructuring of Tswelopele — 49 producers, individual responsibility, bulk irrigation shared — stopped being a case study and became the preset. Groups may choose a different constitution. They may not choose an invisible one.

Where a group structure is unavoidable, this protocol is the condition of allocation, the way a TCS PIN is. That is a policy choice. Write it down. Version it. Do not hide it in a mentorship visit.

### 11 — Atomic land and support

From: A 100x rule that CASP and BFS "cannot lag the lease by a season", recorded as a status.

To: A two-phase commit across the 2024 split. A lease cannot issue unless the DoA file is in {opened, not applicable}, signed by a DoA principal, hashed onto the clock. The Inter-Ministerial Committee opens Asbonge. It does not open two packs of slides.

Pricing of BFS + CASP + Agro Energy against the named farm happens in the same week as the pledge (invention 02) is offered. Land without working capital is not a sad outcome. It is a forbidden state of the machine.

"Not applicable" is a real value: a Category 4 operator who does not want an operating grant. It must be recorded, not assumed. Silence is not "not applicable". Silence is cannot issue.

### 12 — Counterfactual NSAC

From: A DG pack of geographic targets, demographic balances and a determination, generated as a document.

To: Before determination, the DG sees the other choice. Award this farm to Category 2 in this district, or Category 4 in that one, and the published statutory balances move this way. The pack is a simulation of invention 01 against the live estate. Time-to-first-hectare — advert to keys in the occupier's hand — is the public KPI, by province and by category. What is measured is staffed. What is not measured becomes a speech.

The counterfactual is not a recommendation. Ministers still decide. They decide in front of a number they cannot later claim they never saw. That is the point.

---

## 4. How they compose

The twelve inventions are not a menu. Several of them are dangerous if shipped alone.

```
                    ┌──────────── voice ALA (07)
                    │            USSD protocol (08)
                    ▼
Notice ──► farm object ──► executable BSLAP (01) ──► hash-chained PAJA (03)
               │                    ▲                         │
               │                    │                         ▼
               │            ZK eligibility (04)         bearer receipt
               │            farmer wallet (09)          public Merkle awards
               │
               ├── land argues forward (05)
               ├── satellite witness (06) ──► recap file only
               ├── governance protocol (10)
               └── atomic DoA commit (11) ──► lease may issue
                                                  │
                                                  ├── Lease Pledge (02)
                                                  └── counterfactual NSAC (12)
```

Hard coupling rules:

- 01 without 03 is a scoring engine with no memory. Do not ship it.
- 06 without the "never as sheriff" constraint is an eviction machine. Do not ship it.
- 09 without the silence rule is social credit. Do not ship it.
- 02 without 11 is a loan against a farm that has no working-capital plan. Do not ship it.
- 07 without the hallucination ban is a fluent liar in eleven languages. Do not ship it.
- 12 without a published 01 is a more impressive Word document. Do not ship it.

The Anti-Tswelopele battery is the pre-issue checklist the machine runs. It is not an invention of its own because it is composed from the others. A lease may not issue if any of these is true:

- SG code unconfirmed.
- Water right Not recorded and the advertised use requires irrigation, with no recorded dryland alternative.
- DoA file not in {opened, not applicable}.
- Group allocation with no governance protocol (10) on the file.
- Occupier on a verbal caretaker agreement, putting private money into soil — flag, do not silently convert into a finding of "already farming well".
- Score produced by a function version that is not the published one on the close date.
- Satellite witness present without a recapitalisation offer on the clock, if unused-land is being alleged.

Failing the battery is cannot issue, with reasons. It is not a vibe.

---

## 5. Scorecard

| Measure | 10x (atlas) | 100x (register) | 1000x (physics) |
|---|---|---|---|
| Role | Atlas you can inspect | National operating system | Executable, auditable, borrowable land reform |
| What the law is | Text you can read | Text the officers work in | A versioned function anyone can re-run |
| Notices | All index PDFs, weekly | Every advert, same day | Every advert, plus a viability-forward sentence |
| Application | Pre-flight + shareable route | Digital lodge, receipt, scoring | Voice-native lodge; USSD-canonical; bearer receipt |
| Eligibility | Self-declared, paper | Folder of documents at the PSSC | ZK predicates to the wrong inboxes; full file to the lawful ones |
| Committee | Timeline on the farm card | SLA clocks, dual-control, DG pack | Hash-chained determination; counterfactual pack; public KPI |
| Finance | Calculator | Stacked file with Land Bank and CASP | Lease Pledge + atomic DoA commit; grant is no longer the only oxygen |
| The land | Inspectable layers | Site report with sources | Climate-conditioned viability; water as a first-class object |
| Post-settlement | Field photos | Performance, recap, unused-land flags | Satellite as witness; recap-first; never an orbital eviction |
| Groups | A warning | A flag | A protocol: individual plots, shared capital, visible clocks |
| The farmer | A category | A file the state holds | A wallet the farmer holds |
| Languages / channels | English, phone-first | 11 languages, WhatsApp, USSD, offline | Voice is the form; USSD is the protocol; the web is a view |
| Lawful record | Shareable URLs | POPIA + PAJA + PFMA + audit log | Append-only log, Merkle awards, AG verifies a proof |
| North-star number | Completeness of the map | Completeness of the register | Time-to-first-hectare, public, by province and category |
| What the DG opens on Monday | A better map | Asbonge | The counterfactual, the clock, and the proofs from Friday |

---

## 6. How a public physics becomes the government's physics

Do not wait for a tender. Sequence so that each invention makes the next one cheaper than going back — and so that the dangerous ones cannot ship before their guards.

- **Publish the function before you run it.** Invention 01 as a readable spec, with the current BSLAP weights, before a single live score is produced. Officials who disagree will disagree in public, which is the point.
- **Issue bearer receipts on paper the same week digital lodging ships.** Invention 03's receipt is the wedge. Applicants will cite a number. Officers will look it up. The clock starts.
- **Zero-rate the USSD codes.** Invention 08 is a ministerial instruction and a telco meeting, not a sprint. Start the meeting in P2 of the 100x plan, not after the website is pretty.
- **Pilot the Lease Pledge on a closed set of Category 3 leases with Land Bank, in one province.** Do not announce a national credit market. Announce thirty farms, dual control, a public report at month six. Steal Brazil's instrument, not Brazil's scale, until the termination-guard has been seen to hold.
- **Turn satellite on in recap-only mode, in writing, in the farm file's POPIA notice, before the first pixel is read.** If the legal effect cannot be printed in one sentence, the constellation stays off.
- **Keep the public copy adversarial.** Anyone can recompute an award from the published function and the published facts. If the state's number diverges, that is the front page, not an IT ticket. The original repo's "no invented data" rule is the constitutional culture of the 1000x system.

What not to do: ship a scoring engine to officers and a charming chatbot to applicants and call the gap "phased rollout". One physics. Two permission sets. The same function.

---

## 7. Phasing

Task-level construction for the atlas remains in `docs/PLAN.md`. The institutional sequence remains in `docs/PLAN-100X.md` (products P1–P5, phases 7–14). This is the physics sequence. It starts after P1 is real. It does not wait for P5.

| Phase | Window | Outcome | Exit test | Guards that must already be true |
|---|---|---|---|---|
| P0–P1 | Now → 30 days | Hold the line. Cover the 2026 index. | Namakwa can open every NC notice without a second website. | No invented data. |
| P2† | 90 days | Digital lodge + bearer receipt (03, paper/SMS/USSD). Voice ALA (07) in two languages, offline. USSD status of a file (08). | A PSSC can list every lodged file on closing day and an applicant can retrieve the receipt by USSD after a power cut. | Receipt starts PAJA even if Asbonge is down. Model cannot invent a yield. |
| P3† | 6 months | Published BSLAP function (01). Hash-chained scores and reasons (03). ZK predicates for the wrong inboxes (04). Counterfactual DG pack (12) as a report, not yet a live sim. | An appeal re-runs the function. A stranger recomputes one award from published facts. | 01 not shipped without 03. Silence in the farmer wallet is not a zero. |
| P4† | 9 months | Atomic DoA commit (11). Governance protocol (10) as default on any group allocation. Anti-Tswelopele battery as cannot issue. | No new lease issues without DoA {opened, not applicable} and a confirmed SG code. | "Not applicable" cannot be the default. |
| P5† | 12 months | Lease Pledge pilot (02) with Land Bank, one province, Category 3, ≤ 30 farms. Viability-forward site sentence (05) on every new advert. | At least one production loan issued against a pledged lease, and at least one cannot score on an expired water licence, both public. | Termination still requires unused-land finding + refused recap. No private sale of a defaulted pledge. |
| P6 | 18 months | Satellite witness in recap-only mode (06), POPIA notice on the file. Farmer wallet (09) portable to Land Bank. Time-to-first-hectare published. Eleven languages on voice ALA. | A recap file opened from a pixel, followed by a visit, followed by an offer — and zero terminations initiated by the constellation. | Pixel ≠ finding. Occupier can read the purpose notice. |
| P7 | 24 months | Counterfactual NSAC live (12). Adversarial public copy. Auditor-General verifies from proofs. Pledge offered nationally for Categories 3 and 4. | The AG reconstructs an award from Asbonge without a login. Time-to-first-hectare is on the DG's Monday printout. | Public tree contains awards, never unsuccessful identities. |

† P2–P5 here extend the 100x phases of the same names. The 100x outcomes still have to be true. The 1000x column is additional, not instead.

If time is short: P2† bearer receipts + USSD status, then P3† the published function. Coverage (P1) remains the wedge. Proof and credit are the first physics. Constellations come last, on purpose.

---

## 8. Architecture, in one page

Keep the original's two rules, and the 100x three. They survive 1000x.

- **Heavy global data is baked.** Land cover, soil, rainfall, elevation, climate trajectories — grids at build time, with source, date, resolution, model name. Do not depend on a slow third party for the inspect card or the viability sentence.
- **Point data goes through a bounded API.** Climate at a point, parcels, photos, lodged forms, DWS extracts: validate South African bounds, time out in 10 s, cap payload, cache, return a sentence a person can act on.
- **The farm file is the aggregate.** Notices, cadastre, applications, scores, leases, grants, pledges are projections of one identifier (SG code + portion, or a notice id until the match is confirmed).
- **Public and officer views are permissions, not products.** Same record, two query scopes.
- **Empty states are part of the design.** A missing soil grid is a caption, not a spinner, and not a made-up number.

Add five more for 1000x:

- **The function is the policy.** BSLAP lives as versioned code with a human-readable spec generated from it, not the other way around. A weight change is a release.
- **The log is the law.** If it is not on the hash chain, it did not happen. Side channels (WhatsApp groups, "the director said") are not inputs to invention 01.
- **Four objects, not one table.** Farm, farmer, clock, proof. Mixing them is how a person becomes a parcel and a parcel becomes a score.
- **Legal effect is a typed field.** Every automated notice declares what it is allowed to do. Satellite: {opens: recap_file, books: visit, cannot: [terminate, score, sell]}. If a new sensor cannot declare this, it does not connect.
- **Offline is a replica, not a degraded mode.** PSSC offices sync through opportunistic replication. A form lodged at a satellite office with no fibre is a first-class lodge. The bearer receipt is issued locally and reconciles. CRDTs for the queue; the log remains append-only after reconciliation. Conflicts surface as cannot score until dual control resolves them. They never silently pick a winner.

---

## 9. Never

The 100x nevers still hold. 1000x adds the ones that exist only because the inventions do.

From 100x, without apology:

- Invent a farm, a closing date, a contact, a soil number or a water right.
- Show a cadastral match that has not been confirmed. Null stays null.
- Take a fee from an applicant. This is a public function.
- Surveil occupiers without a lawful purpose and a POPIA notice.
- Let an officer see another district's scoring before determination, except under dual control.
- Ship English-only and call it national.
- Hide the 700 000 ha vs provincial-sum gap.

From 1000x, because the physics can wound:

- Let a model invent a yield, a water right, a hectare or a closing date. Fluent hallucination is a rights failure.
- Treat silence in a farmer wallet as a score of zero.
- Terminate, score, or sell from a satellite pixel.
- Ship executable scoring without the hash chain.
- Ship a Lease Pledge that can transfer land, or that can fire termination without a recapitalisation offer.
- Build a national identity platform out of eligibility proofs.
- Put unsuccessful applicants on the public Merkle tree.
- Let "not applicable" on a DoA file be the default, the empty state, or a radio button with no signature.
- Make USSD a courtesy and the website the real system.
- Tokenise the land, sell applicant data, or take a success fee from a lender.
- Call a database a blockchain and hold a press conference.

---

## 10. What would have to be true

Software cannot legislate. Several inventions require a ministerial instrument, a regulation, or a Land Bank product. Name them so they can be asked for, instead of being quietly faked.

| Invention | What the code can do alone | What it needs from the state |
|---|---|---|
| 01 Executable BSLAP | Publish a function that matches the current policy | A circular that the published version is the one officers must use |
| 02 Lease Pledge | Register a pledge on the farm file, dual-control it | A statutory instrument; a Land Bank product; a rule that default ≠ sale of title |
| 03 Hash-chained PAJA | Issue receipts, keep a log, publish a tree | Acceptance of the receipt as the start of PAJA time, including paper receipts issued offline |
| 04 ZK eligibility | Prove predicates to the wrong inboxes | Confirmation that the DBSC still receives what PAJA requires — ZK is a narrowing, not a hiding |
| 05 Viability-forward | Bake climate runs and DWS extracts | DWS bulk extract; a rule that expired irrigation rights fail advertised irrigated use |
| 06 Satellite witness | Read public constellations | A published legal-effect sentence; POPIA notices; recap-first standing instruction |
| 07 Voice ALA | Converse, structure, retain source language | Recognition of the structured record as Form ALA; two-language pilot in a named province |
| 08 USSD protocol | Encode every state change in 160 characters | Zero-rated short code; a gazetted channel of record |
| 09 Farmer wallet | Hold and present credentials | Land Bank and FPSUs accept a presented credential; no mandate that absence is a finding |
| 10 Governance protocol | Encode Tswelopele as a template | Condition of allocation for group structures, written into the advert |
| 11 Atomic land+support | Refuse to issue a lease | DoA principal on the file; IMC uses the same screen |
| 12 Counterfactual NSAC | Simulate balances | DG pack format accepted as the Monday artefact; time-to-first-hectare published |

Where the column on the right is "no", the invention stays a pilot or a public spec. It does not pretend to be the law.

---

## 11. How 1000x itself fails

A plan that will not name its own vices is a brochure. The vices of this one:

The function becomes the capture. A published BSLAP with quietly wrong weights is worse than a spreadsheet, because it launders the wrong into the appearance of math. Guard: versioning in the log, a public comment window on weight changes, and the Appeals Committee's right to re-run and to reject the function version itself.

The pledge becomes a back door to title. A lender who can force a transfer of the remaining term to an allied operator has reinvented dispossession with better UX. Guard: the transferee must pass invention 01; related-party flags are cannot issue; default never sells the land.

The wallet becomes a passbook the poor cannot fill. Category 1 and 2 producers will have thinner credentials. If the function starts to love thickness, the poor lose. Guard: the silence rule, and advertised criteria that cannot smuggle "has a wallet history" in through the back.

The constellation becomes a sheriff the moment a minister is angry. Legal effect is a typed field until it is not. Guard: the effect is printed on the farm file, hashed, and changing it is a function-version release, not a phone call.

Voice becomes a fluent liar. A model that invents a 12-ton yield in Sepedi has committed a rights failure in a language the committee may not read. Guard: source-language retention, Not recorded under uncertainty, and a human at the PSSC who can play the audio back.

USSD becomes a telco chokepoint. A public function that dies when a network operator changes a tariff is not public. Guard: zero-rating as a condition of the channel-of-record gazette; paper receipts as the backup that does not need a tower.

The adversarial public copy is starved. If the published facts are the press-release subset, strangers recompute a fiction. Guard: the public farm object is the officer farm object, minus POPIA-identified fields. Two products that drift are forbidden, as in 100x; 1000x makes the drift visible as a hash mismatch.

If those guards fail, turn the inventions off. A register that does not pretend to be physics is better than a physics that pretends to be just.

---

## 12. What this build already is, and what it is not

The app in this workspace is P0 of the 100x plan and the public desk of the 1000x physics: sourced notices, a pathfinder that composes blocks, a committee clock drawn to scale, a finance stack that names the PLAS trap, a policy memory that includes the 2024 split, and both plans as documents in `docs/`. It does not score. It does not lend. It does not look at a pixel. It does not invent.

That restraint is not a lack of ambition. It is the culture the 1000x system has to keep when it can finally run the function.

Next, in order, and not in another order:

- Cover the rest of the index. Match parcels. (100x P1)
- Lodge, and put a bearer receipt in the applicant's hand. (P2†)
- Publish the function. (P3†)
- Refuse to issue a lease the battery fails. (P4†)
- Pledge one province's Category 3 leases, in daylight. (P5†)

The constellation waits. The chatbot waits. The press conference waits. The farmer in Vhembe, on a weak signal, with a paper receipt, does not.

Asbonge. State agricultural land, from advert to a lease that can work.
