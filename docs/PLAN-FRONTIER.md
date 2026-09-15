# Asbonge: the frontier plan

Seventeen inventions for state agricultural land allocation, and the discipline that keeps them
honest.

Checked against the repository at commit `046b119` (15 Sep 2026). Every claim about the app names
the file it came from. Every number about the land comes from `src/content/`, which carries its own
sources and a review date (`CONTENT_REVIEWED = '2026-09-08'`). Numbers this plan introduces are
**targets or hypotheses**, and are labelled. Rule 1 in `AGENTS.md` — no invented data — is not
suspended for a plan about invention. It is the reason most of these are possible.

---

## 0. What counts as novel here

Most "innovation" in civic software is a new arrangement of the same affordances: a nicer form, a
map where a table was, a chatbot over a PDF. None of it changes what anybody is *able to do*. So
every entry below has to pass four tests, and the ones that fail are in §19 where they belong.

| Test | The question |
|---|---|
| **New mechanism** | Is this a different mechanism, not a different interface over the same mechanism? |
| **New capability** | After it exists, can somebody do something they simply could not do before? |
| **Works in the real constraint** | Does it survive no internet, no title deed, no trust, and R10 of airtime? |
| **Falsifiable** | Is there a measurement that would show it does not work? |

And one negative test, which matters more than the four: **does it survive being wrong in public?**
An invention in this domain can cost somebody a farm. Every entry names how it fails and what it is
forbidden from doing.

Three constraints in the domain generate almost all the invention space. They are worth stating
plainly, because each one is a wall that everybody else treats as the end of the road.

1. **No title.** PLAS keeps the title deed in the national register, so the lease cannot be pledged
   and ordinary production credit is closed (`src/content/risks.ts`, `'tenure'`). Every financing
   idea in agriculture assumes land as collateral. This one cannot.
2. **No connection.** The land is remote, the applicant is on a feature phone, and the office is
   90 km away. Every idea that begins "the user opens the app" has already excluded the majority.
3. **No trust.** "Selection has been captured before" is the repository's own finding
   (`src/content/risks.ts`, `'capture'`). An unverifiable process cannot be fixed by promising
   harder.

Inventions that route *around* those three walls are interesting. Inventions that turn a wall into
a mechanism are the ones in Part I.

### The seventeen, ranked

Readiness: **Ship** — buildable now with what exists. **Prove** — needs a measured pilot before it
can be trusted. **Research** — an open problem with a named fallback if it fails.

| # | Invention | Attacks | Readiness |
|---|---|---|---|
| 1 | Verifiable allocation | No trust | Ship (commitment layer) · Research (the sealed-score proof) |
| 2 | Proof of production | No title | Prove |
| 3 | The advert horizon | The 21-day scramble | Prove |
| 4 | The re-runnable business plan | Compliance and comparability | Ship |
| 5 | Symmetric evidence | Arbitrary termination | Prove |
| 6 | Paper as a database | No connection | Ship |
| 7 | The consent-preserving courier | Distance and delegation | Ship |
| 8 | The phrase bank voice rail | Literacy and language | Prove |
| 9 | One codec, three carriers | No data | Ship |
| 10 | Offline-verifiable credentials | Certified-copy attrition | Prove (needs issuers) |
| 11 | The parcel oracle | Unrecorded land | Ship (posteriors) · Prove (asserted boundaries) |
| 12 | The field survey protocol | No comparable ground truth | Ship |
| 13 | Provenance as a compile-time property | Our own credibility | Ship |
| 14 | The quota ledger | Unexplained losses | Prove (needs a partner) |
| 15 | Scheme governance as a protocol | Group failure | Ship |
| 16 | Standing candidacy and cohort formation | One-shot lotteries | Prove |
| 17 | The allocation simulator | Policy blindness | Research |

---

# Part I · The five that change the physics

---

## 1 · Verifiable allocation

**Readiness: Ship the commitment layer. Research the sealed-score proof.**

### Attacks

Selection capture. Earlier rounds "lacked an open points-based adjudication, and well-resourced or
connected applicants secured prime farms ahead of farm workers, labour tenants and resource-poor
smallholders" (`src/content/risks.ts`, `'capture'`). The chain runs district → provincial →
national → lease over about 87 days (`STAGES`, `TOTAL_DAYS` in `src/content/process.ts`). An
applicant sees none of it and, in practice, often gets no reasons.

### The invention

Borrow end-to-end verifiability from election cryptography and apply it to land adjudication. The
result: **every unsuccessful applicant holds a receipt that proves their application was in the set
that was adjudicated, and anyone can re-derive the published ranking from the published rubric.**

Not "we promise it was fair". *Check it yourself.*

### How it works

1. **Rubric commitment, at advert time.** The scoring rubric is written as executable, versioned
   code. Before applications open, publish `H(rubric_code ‖ weights ‖ scenario_set ‖ salt)` in the
   notice and append it to a public transparency log — a Merkle tree with signed tree heads, in the
   shape Certificate Transparency uses. The rubric cannot be retrofitted to a preferred winner,
   because the commitment predates the applications.
2. **Application commitment, at close.** Each application is committed as
   `leaf = H(applicant_salt ‖ application_digest)`. The Merkle root over all leaves is published at
   the moment the advert closes. Nothing can be added, removed or swapped afterwards without
   changing the root.
3. **The receipt.** Each applicant receives their leaf, their salt and their inclusion path —
   printed on the pack, sent by SMS, and readable by the verifier in §9's codec. They can prove
   their own application was in the adjudicated set. Critically, they can also prove it *if it was
   not*.
4. **Open tally.** After determination, publish the rubric code in the clear, the salt, the
   per-criterion scores against anonymised leaves, and the ranking. Anyone re-runs the rubric over
   the published scores and gets the published ranking, or the discrepancy is public.
5. **Scoring attribution.** Every score carries who entered it and when, as an event in the
   hash-chained case log. A changed score is a visible event, never an edit.

### The trust boundary, stated honestly

This makes the **tally** verifiable. It does not make a human's judgement of "farming experience"
verifiable — a committee member who scores a friend generously is still scoring a friend
generously. What changes is that the score is attributed, committed, published and comparable
across applicants in the same round, so a pattern of generosity becomes visible in a way it is not
today.

The research question is whether the scores can be proved to derive from the sealed application
content without revealing it — a zero-knowledge statement over committed inputs. **Named fallback:
if that proves impractical, the commitment layer alone delivers most of the value and ships
without it.** We build the fallback first and treat the proof as an upgrade.

### Why we believe it is novel

End-to-end verifiable tallying is well established in elections. We are not aware of it being
applied to public land adjudication anywhere, and the fit is unusually good: a fixed candidate set,
a published rubric, a small number of adjudicators, high capture risk, and participants who already
have a statutory right to reasons.

### Smallest testable version

The rubric commitment plus receipts, run alongside one paper round on a single advert, changing
nothing about how the committee works.

**Check:** a script anybody can run takes the published rubric, scores and root, and reproduces the
ranking; an altered score fails verification and names the criterion; a receipt for an application
not in the set fails with a distinguishable error.

### Forbidden

No automated shortlisting. No ranking displayed without the rubric that produced it. No rubric
committed after applications have been seen.

---

## 2 · Proof of production

**Readiness: Prove.**

### Attacks

The wall: no title, therefore no collateral, therefore no credit. "Banks will not accept the lease
as security, so ordinary production credit is closed to you" (`src/content/risks.ts`, `'tenure'`).
Blended Finance offers a grant matched with concessional Land Bank debt — 70/30, 50/50 and 30/70
with caps of R500 000, R1m and R1.5m (`src/content/finance.ts`) — and still needs a business plan
and evidence of own contribution.

### The invention

Stop trying to make the lease bankable. **Make the production bankable instead.**

A lender who cannot take the land as security can still take a registered cession of the off-take
proceeds — *if* somebody can verify that the production is real. Nobody can, today, for a
smallholder on state land. So: a multi-source, adversarially designed production attestation, plus
a public notice-filing register for cessions against it.

### How it works

An attestation is a **corroboration matrix**, not a score. Four independent evidence classes, each
of which can be absent, and none of which we generate:

| Class | Evidence | Why it is hard to fake |
|---|---|---|
| **Ground** | Photos from the §12 protocol, geotagged and time-stamped, signed by a hardware-backed device key | The key attests the capture happened on a real device at a place and time; a re-photographed screen fails the protocol's scale and bearing requirements |
| **Orbital** | Sentinel-2 greenness over the parcel polygon, tested against the crop calendar the claim asserts | A planted field has a signature; an empty one does not, and the claimant does not control the satellite |
| **Transactional** | Input purchases and off-take delivery notes, hashed, counter-signed by the counterparty where they will cooperate | Requires a second party to lie in a way that is recorded |
| **Institutional** | Extension visit records, veterinary dipping and vaccination records, formal auction sales — the Taung small-stock producers already sell into regional auctions (`src/content/cases.ts`) | Third-party records the farmer cannot write |

The output is the matrix itself: which classes agree, which are absent, and over what period. The
lender prices it. **We publish no composite score**, for the reason in §18: a score we invent
becomes a reason to decline a loan, and nobody can appeal a number whose derivation is ours.

Then the instrument. The register acts as a **public notice-filing system for cessions of off-take
proceeds**, indexed by register ID: who has registered an interest in which parcel's production,
from when, to what value. A lender can search it before lending, which is the whole function a
collateral registry performs — priority and notice — applied to a receivable instead of land.

### Why we believe it is novel

Satellite-verified lending exists for commercial agriculture with title. Movable-asset registries
exist. Neither has been combined into a corroborated production attestation for a smallholder
without title, and we are not aware of a public-interest cession registry for agricultural
receivables in South Africa. The specific novelty is the **adversarial corroboration design**: no
single party, us included, can manufacture an attestation, and the absences are as visible as the
agreements.

### Smallest testable version

Twenty lessees, one commodity, one season. Build the matrix. Take it to two credit officers and one
development financier and ask a narrow question: *does this change your decision, and what is
missing?* Publish the answer even if it is no.

**Check:** for each of the twenty, at least three evidence classes present or an explicit reason for
each absence; a written response from each lender on the record.

### How it fails

Off-take counterparties refuse to counter-sign. Greenness cannot distinguish a planted crop from
volunteer growth at the resolution available. Lenders say the constraint was never information, it
was recovery cost on a small loan. All three are findable in the smallest version, which is the
point of running it first.

### Forbidden

No composite score. No export without the lessee's live, scoped, revocable consent. No attestation
that hides an absent class.

---

## 3 · The advert horizon

**Readiness: Prove.**

### Attacks

The scramble. Fifteen Northern Cape notices were read and **every one had already closed**
(`src/content/notice-coverage.json`). Even a perfectly delivered notice leaves weeks to produce a
five-year business plan, a cash-flow projection, a SARS Tax Compliance Status PIN and proof of own
contribution (`src/content/process.ts`). The deadline is not the problem. The *lead time* is.

### The invention

**Forecast which parcels will be advertised, before they are advertised.**

A farm does not appear on the index from nowhere. It arrives in state hands through a traceable
event and then waits. The waiting is the opportunity: an applicant who knows a parcel is 6 to 18
months from advert has time to do everything that currently cannot be done in 21 days.

### How it works

- **Signals, all public.** Deeds Office transfers where the transferee is the state. Government
  Gazette notices. Inter-departmental transfers — `src/content/policy.ts` records 125 parcels and
  25 549 ha from Public Works and Infrastructure and 44 parcels and 2 424 ha from Human
  Settlements since 2019. Departmental annual reports and annual performance plan targets. Lease
  expiry dates, once the lease register exists. Withdrawals and re-advertisements, which usually
  return — the reviewed file list already contains a withdrawal notice.
- **Model.** Time-to-advert as a survival problem per parcel: features are acquisition date and
  route, province, district, extent, stated use, and prior advert history. Output is a **window**
  and a calibrated probability, never a date.
- **Published calibration.** Of the parcels we said were 60% likely, roughly 60% must actually be
  advertised. A reliability diagram ships with the forecast and updates itself. Publishing your own
  calibration is the honesty mechanism, and it is what separates a forecast from a rumour.
- **A separate surface.** The horizon is visually distinct from the register, is never styled as a
  notice, and carries its evidence list. A forecast that can be mistaken for a notice is a defect,
  not a feature.

### Why we believe it is novel

Land market analytics forecast prices. Procurement tools track published tenders. We are not aware
of anything that forecasts *the publication event itself* for public land disposal, and it is the
one prediction that converts directly into a person having time to prepare.

### Smallest testable version

One province, backtested. Fit on adverts up to a cut-off date, predict the adverts after it, and
publish the calibration before shipping anything to a user.

**Check:** on held-out data, the reliability diagram is within a stated tolerance across
probability bands, and the report names every parcel the model missed entirely.

### How it fails

Advert timing is driven by internal budget and committee dynamics no public signal reflects, and
the model is no better than a base rate. That is a publishable finding, and the signal inventory it
produces is valuable on its own.

### Forbidden

Never shown to anyone in a position to influence what gets advertised, in any form that could shape
it. Public and free to everyone simultaneously, or not at all — a forecast available to some
applicants and not others is exactly the advantage this system already suffers from.

---

## 4 · The re-runnable business plan

**Readiness: Ship.**

### Attacks

Form ALA requires a five-year agricultural business plan, enterprise budgets, cash-flow
projections, environmental management, an irrigation water source, labour requirements and market
off-take arrangements (`src/content/process.ts`). Most applications die here. And the committee
receives a stack of prose documents built on unstated assumptions, which cannot be compared.

### The invention

A business plan that is **a model, not a document**. Submitted as an executable file that anyone —
the applicant, the committee, a lender, the applicant's mentor — can re-run with their own
assumptions.

And then the part that makes it a standard rather than a feature: **every plan in a round carries
the same mandated stress scenarios**, committed at advert time under §1. A 1-in-10 drought year. A
price shock. The same ones for everybody, published, so a committee compares like with like for the
first time.

### How it works

- **The file.** A `.plan.json` carrying the parcel, the enterprise, and every assumption with its
  provenance: agronomic assumptions sourced, price assumptions sourced and dated, and the
  applicant's own inputs explicitly labelled as theirs.
- **Grounded starting points, not answers.** Notices already state what the department itself
  claims — one Northern Cape advert states 2 400 ha natural grazing and a capacity of 85 large-stock
  units at 80% stocking; a Limpopo notice states seven poultry houses at 3 500 birds each
  (`src/content/farm-notices.ts`). Rainfall comes from the baked CHIRPS cell, slope from the DEM,
  and distance to market, abattoir or silo from the infrastructure layer the app already loads
  (`src/lib/infrastructure.ts`).
- **Monte Carlo, over the things that actually kill farms.** Rainfall drawn from the distribution
  for that cell, price volatility, yield and mortality variance. The headline output is not profit,
  it is the **working-capital trough**: the largest cumulative cash deficit and the month it
  arrives. That single number is what sinks new entrants, and no business plan template in this
  process surfaces it.
- **Outputs.** The distribution of net cash flow, the probability of a negative year, the
  break-even stocking rate, and the trough — each rendered with what the model cannot tell you as
  prominently as what it can.

We supply structure, arithmetic, sourced enterprise budgets and scenarios. We never write the plan
and never invent a figure. Every number is either entered by the applicant, and labelled as theirs,
or traceable to a cited source.

### Why we believe it is novel

Farm budgeting tools exist. Development-finance appraisal models exist. We are not aware of an
application process anywhere that accepts business plans as re-runnable models under a **shared,
pre-committed stress standard** — and the standard is the innovation, because it makes comparison
possible without making anybody's judgement automatic.

### Smallest testable version

One enterprise, one province, one advert. Generate plans for five real applicants and put them in
front of a district officer with the re-run control working.

**Check:** a golden-file test pins the arithmetic; a test proves no output figure exists that is
neither user-entered nor source-traced; the officer can change one assumption and see every
downstream number move.

### Forbidden

No suitability verdict without soil tests — the app's existing stance, kept. No plan written for
the applicant. No scenario in a round that was not committed before applications opened.

---

## 5 · Symmetric evidence

**Readiness: Prove.**

### Attacks

"Leases carry termination clauses triggered by a departmental assessment of underutilisation"
(`src/content/risks.ts`, `'tenure'`). That assessment is a human visit and a judgement. A lessee
who disagrees has nothing to disagree *with*.

### The invention

Build the remote-sensing instrument **for the lessee as well as the state, out of the same code and
the same public inputs.** Both parties can run it. Either can produce an evidence bundle. Neither
gets a version the other cannot check.

This is the inversion that matters. The default application of satellites to tenure is
surveillance: the state watches, the occupier is assessed. Here the same instrument is *due
process*.

### How it works

- **Rainfall-normalised productivity, not raw greenness.** Naive greenness decline punishes a
  farmer for a drought. The instrument models expected greenness given rainfall, land-cover class
  and district, fitted on neighbouring parcels in the same rainfall regime, and reports the
  **residual** — this parcel against its peers under the same weather. A bad year for everybody
  reads as a bad year, not as neglect.
- **Published, versioned, and runnable.** The algorithm, its inputs and its version ship publicly.
  A lessee runs it on their own parcel and sees what an assessor would see.
- **Continuous, and early.** The lessee sees their own residual as it moves, months before anybody
  writes a termination letter. A signal that arrives early is support; the same signal arriving
  with a letter is enforcement.
- **Rebuttable by construction.** A termination process cites an evidence bundle. The lessee answers
  with a counter-bundle: §12 photographs, input receipts, veterinary records, an off-take note. The
  residual is one input a human weighs, and its confidence interval is always shown.

### Why we believe it is novel

Remote monitoring of agricultural land use is routine. Designing the instrument so that the
*subject* of the assessment holds the same instrument, with an explicit rebuttal path and a
published method, is something we have not seen. Call the general principle **algorithmic due
process**: if an algorithm is going to be evidence against a person, that person gets the algorithm.

### Smallest testable version

Thirty parcels with known histories — some genuinely fallow, some drought-affected, some productive.
Does the residual separate neglect from drought?

**Check:** on the labelled set, the residual separates the drought group from the fallow group at a
stated confidence; every case where it does not is published in the method note.

### How it fails

Cloud cover and cadastral error swamp the signal at parcel scale. Peer parcels are too few in
sparsely farmed districts. Then the honest answer is that the instrument is not fit for individual
assessment, which is itself a finding worth publishing loudly — because it means the assessments
being made today on weaker evidence are unsafe.

### Forbidden

No automated termination, ever. No indicator without its confidence interval. No use by the state
that the lessee cannot see and answer.

---

# Part II · Five that reach people nobody reaches

The constraint here is not connectivity in the abstract. It is a specific person: on a feature
phone, with R10 of airtime, 90 km from an office, in a language the department does not publish in,
being asked to produce certified copies of documents from three institutions. Every invention in
this part is designed for that person and works backwards.

---

## 6 · Paper as a database

**Readiness: Ship.**

### Attacks

The law wants paper. "Applications are sealed in an envelope endorsed on the outside with the farm
name, and deposited in the tender box at the relevant office" (`SUBMISSION_RULE`,
`src/content/process.ts`). So a digital pack has to become paper, and then the district office has
to retype it — losing fidelity, adding errors, and taking days.

### The invention

Make the printed pack and the digital case **the same object in two media**, losslessly, in both
directions.

### How it works

- Every page of a printed pack carries a QR: pack ID, register ID, schema version, page number and
  a content digest for that page.
- The cover carries the whole structured application, compressed with the §9 codec — a
  domain-specific dictionary plus varint field codes — across as many QR codes as it takes, with
  Reed–Solomon parity blocks so a smudged, folded or photocopied code still reconstructs.
- A district office scans the cover with any phone camera, **offline**, and the case reconstitutes
  exactly: no retyping, no transcription error, and a digest mismatch that names the page that does
  not match its record.
- The reverse holds: a digital case prints to a byte-identical pack. Neither medium is the
  authoritative copy; the digest is.

### Why we believe it is novel

Government digitisation is almost always one-way: paper in, OCR, hope. A bidirectional, digest-
verified, error-corrected paper representation of a statutory submission — designed so paper is a
transport layer rather than a degradation — is not something we have seen in this context.

### Smallest testable version

Print a pack, photocopy it twice, fold it, scan it with a low-end phone, and reconstruct.

**Check:** reconstruction is byte-identical after two photocopy generations and a fold through the
code; a deliberately altered page fails with the page named.

---

## 7 · The consent-preserving courier

**Readiness: Ship.**

### Attacks

The office is far. The applicant has no transport. So somebody else goes — a neighbour, a relative,
an extension officer — and today that means handing over your identity documents and trusting them
with your application.

### The invention

**Delegate the errand without delegating the identity.** A cryptographic capability, scoped to one
pack, one office, one action and seven days.

### How it works

- The applicant generates a courier token: a signature over `(pack_id, office_id, submit_only,
  expiry)`, printed as a QR on the pack cover and sendable by SMS.
- The applicant keeps a six-digit code that the token does not contain.
- The office verifies the token's signature **offline**, against a cached public key. The
  submission receipt binds to the applicant's key, not the courier's — the courier never becomes
  the applicant.
- The applicant gets an SMS when the office logs it, with the receipt from §1.
- The token cannot be used to withdraw, amend, or read anything. It carries one verb.

### Why we believe it is novel

Capability-based delegation is old and well understood in computing. Applying it to a physical
errand in a low-trust, low-connectivity public process — so that "please hand this in for me" stops
requiring "here is my ID" — is a use we have not seen, and it is exactly the kind of idea that only
appears if you start from the person rather than the platform.

### Smallest testable version

One office, ten packs, offline verification on a phone with aeroplane mode on.

**Check:** verification succeeds offline; an expired token fails; a token for a different office
fails; the receipt resolves to the applicant, not the courier.

---

## 8 · The phrase bank voice rail

**Readiness: Prove.**

### Attacks

South Africa has twelve official languages since the 2023 constitutional amendment. Notices are
published in English, as PDFs. Some of the people this matters most to cannot comfortably read any
long document in any language. And the stakes of a mistranslation are not cosmetic: a wrong
deadline, a wrong exclusion, a wrong statement of the right to appeal.

### The invention

A telephone rail — dial a number, hear the notices — where **nothing legal is ever synthesised**.

Legal strings come from a **phrase bank**: a fixed vocabulary, recorded by a named human speaker
per language, with separately recorded numerals, months, place names and farm names, composed at
runtime by a grammar. A deadline is assembled from recorded parts. It cannot be hallucinated,
mistranslated at inference time, or drift between releases, because there is no model in the path.

Non-legal content — a description, a general explanation — may use synthesis, clearly bounded and
marked.

### How it works

- A composition grammar per language for the sentence forms that carry legal meaning: closing date
  and time, extent in hectares, category and rent, exclusions, appeal rights and office contact.
- Recording sessions produce the vocabulary once per language, versioned, with the speaker named and
  a reviewer recorded. A new legal string cannot ship until it is recorded and reviewed.
- IVR: province, district, open notices, one notice's essentials, "SMS me this" — reaching a notice
  in four keypresses. The same tree serves USSD.
- Under-resourced-language text-to-speech is not good enough for a legal deadline, and this design
  means we never need it to be.

### Why we believe it is novel

Interactive voice response is ancient. A **hard synthesis boundary** enforced by a composition
grammar — so the highest-stakes multilingual content in the system is provably free of generative
error while the rest is not constrained — is a technique we have not seen applied deliberately to
public-interest voice services in under-resourced languages.

### Smallest testable version

Two languages, one province, notices only, with native-speaker review of every composed sentence
form.

**Check:** a test enumerates every composable legal sentence and asserts each has a recorded,
reviewed audio realisation in every published language; a missing recording blocks the release.

---

## 9 · One codec, three carriers

**Readiness: Ship.**

### Attacks

A notice that needs a data connection to read is a notice that does not reach the person on the
land. The current app's first load is 197.1 kB (`docs/baseline.md`), which is a good number for a
WebGL explorer and an impossible one for R10 of airtime.

### The invention

One purpose-built micro-codec for civic records, carried over **SMS, QR and USSD** — three carriers
that need no data connection at all, sharing a single encoding.

### How it works

- A domain dictionary: province codes, district names, land uses, office IDs, category names and
  common farm-name tokens are all small integers, because the vocabulary of this domain is finite
  and known.
- Varint field codes, delta-encoded dates, and hectares as a scaled integer. The essentials of a
  notice — register ID, farm, district, extent, closing date and time, use, office number — fit in
  a single 160-character GSM-7 message in the common case.
- Longer records segment with parity, so a lost segment still reconstructs.
- The same bytes are the QR payload in §6 and the state blob in the USSD session. **One codec,
  three carriers, one decoder to test.**

### Why we believe it is novel

Not the compression — that is engineering. The novelty is the decision to treat SMS, QR and USSD as
*one wire format for the register* rather than three afterthought export paths, so a record that
reaches a feature phone, a printed page and a menu session is provably the same record.

### Smallest testable version

Encode all 22 notices in the repository and measure.

**Check:** the median notice fits one SMS; every notice round-trips byte-exactly through all three
carriers; a corrupted segment is detected rather than silently mis-decoded.

---

## 10 · Offline-verifiable credentials

**Readiness: Prove — needs issuers.**

### Attacks

Nine document requirements, several of which are certified copies obtained by standing in a queue:
a certified ID, proof of address, a SARS Tax Compliance Status PIN, an unabridged CIPC registration
certificate, certified IDs of every director, member or trustee, and a formal resolution
(`DOCUMENTS` in `src/content/process.ts`). Each is a trip, a fee and a chance to be turned away.
Attrition here is invisible, because a person who gives up never appears in any statistic.

### The invention

Make the facts those documents carry **presentable as signed attestations and verifiable offline**,
so a district office with no internet can check a SARS or CIPC fact against a cached issuer key in
a second.

### How it works

- Define a credential profile for South African agricultural applications: which facts, which
  claims, which validity periods, in a standard shape — verifiable credentials or mobile-document
  style, not a format we invent.
- Build and publish **the verifier** — offline, open source, a phone camera and a cached key set.
- Accept both forms from day one: a signed credential where it exists, a certified paper copy where
  it does not. The paper route never closes.
- Publishing a working verifier and a profile is how issuers get a reason to issue. You cannot ask
  SARS to adopt a format that has no consumer.

### Why we believe it is novel

Verifiable credentials are an established standard with almost no deployment in this domain. The
specific contribution is the **offline verifier plus a sector profile published in advance of
issuers** — building the demand side first, which is the only order that works when you cannot
compel the supply side.

### Smallest testable version

The verifier, a self-issued test credential, and a district office desk test with the network
switched off.

**Check:** verification succeeds offline in under a second on a low-end phone; a tampered credential
fails; an expired one fails with a distinguishable reason.

---

# Part III · Four that make the record better than the state's own

---

## 11 · The parcel oracle

**Readiness: Ship the posteriors. Prove the asserted boundaries.**

### Attacks

Two notices are matched to cadastral boundaries (`src/data/notice-parcels.json`). One Northern Cape
notice records, correctly, that "a similarly named cadastral property has a substantially different
area", and its location is withheld rather than guessed. Nationally, of 121.97m ha, about 14% is
registered state land and "roughly 7% is unrecorded or unsurveyed"
(`NATIONAL_FIGURES`, `src/content/policy.ts`). You cannot put a pin in land that has no record.

### The invention

Two inventions, and they must not be confused with each other — which is itself the third
invention.

**A public Bayesian cadastre.** Matching stops being a boolean. Publish a **ranked hypothesis set**
with a posterior for each candidate parcel, the evidence behind each, and an explicit `insufficient`
state. Local knowledge — an extension officer, a neighbour, a district clerk — can submit evidence
that updates the posterior, logged with who and when.

**Two-tier boundaries.** A `surveyed` boundary comes from the Chief Surveyor-General. An `asserted`
boundary comes from people walking the fence with a phone: three or more independent GNSS tracks,
fused, rendered **as an uncertainty band rather than a line**, labelled as asserted everywhere it
appears, and never exported as cadastral. The two tiers share no styling, no field name and no
export path.

### How it works

- Match features: farm name similarity, portion number, LPID, registration division, district, and
  extent agreement within a stated tolerance. Each contributes a likelihood; the posterior is
  published with the contributions itemised.
- Reason codes when nothing wins: `area-conflict`, `name-conflict`, `no-candidate`,
  `insufficient-evidence`. The repository's Aasvogelpan case resolves to `area-conflict` and stays
  unlocated, as it should.
- Community evidence is a typed submission — a photograph of a beacon, a title deed extract, a
  district clerk's confirmation — that moves the posterior and is visible in the record.
- Fence-walk fusion: cluster the tracks, take the medial line, and report the spread as the band.
  Three tracks that disagree produce a wide band and an honest one.

### Why we believe it is novel

Probabilistic record linkage is standard practice. **Publishing the posteriors and letting the
public contribute evidence against them** — a contestable cadastre with an audit trail — is not,
and neither is the deliberate two-tier epistemology that refuses to let community assertion
masquerade as survey. The uncertainty band is the honest rendering that almost every mapping product
gets wrong.

### Smallest testable version

Run it over the 22 notices in the repository.

**Check:** the two existing confirmed matches reproduce exactly; Aasvogelpan resolves to
`area-conflict` and no location; every unmatched notice carries a reason code; the match rate and
the reasons are published including the failures.

### Forbidden

An asserted boundary is never styled, named or exported as a cadastral one. A posterior below the
publication threshold yields no pin on any map.

---

## 12 · The field survey protocol

**Readiness: Ship.**

### Attacks

An applicant is expected to commit to a farm, and a lease, having never been able to see it. And the
photographs people do take are unusable as data: different angles, no scale, no bearing, no way to
compare two farms or the same farm two years apart.

### The invention

A **fixed twelve-shot protocol** that turns amateur photography into a comparable national dataset.
The comparability is the invention. The photographs are just photographs.

### How it works

- Twelve required captures, each with a specified compass bearing and a scale reference: the gate
  with the farm sign, three boundary corners, the water source, fencing condition at three points,
  structures and sheds, a dug soil face with a scale card, dominant vegetation, and the access road.
  One conditional capture: erosion, where present.
- Each capture carries GPS, time, bearing and a hardware-backed device signature — which is what
  makes the set usable as evidence in §2 and rebuttal evidence in §5.
- A printed one-page protocol so an extension officer or an applicant can follow it with no app at
  all, and a guided camera flow for those who can.
- Because every farm is captured the same way, a person deciding between two farms sees the same
  twelve views of each, and a farm in 2027 is comparable to the same farm in 2029.

### Why we believe it is novel

Citizen science protocols exist for biodiversity and infrastructure. We are not aware of a
standardised agricultural site-inspection protocol designed so that untrained captures aggregate
into a machine-usable, longitudinally comparable dataset — and it is the cheapest of the seventeen
inventions while being load-bearing for three others.

### Smallest testable version

Two farms, two people each, following the printed protocol without help.

**Check:** the four sets are mutually comparable — same views, same bearings, scale reference
present in every soil and fencing shot; a review names every instruction that was misread, and the
one-pager is rewritten until nobody misreads it.

### Forbidden

Faces and vehicle registrations blurred. No capture of a dwelling's interior. Moderation before
publication, consent recorded, takedown honoured — the photo rules in `docs/PLAN.md` Phase 5, kept.

---

## 13 · Provenance as a compile-time property

**Readiness: Ship.**

### Attacks

Our own credibility, which every other invention depends on. `AGENTS.md` Rule 1 says no invented
data, Rule 2 says every number carries its source and date. Today those rules are enforced by
discipline and code review. Discipline does not scale to a register with thousands of facts and
several contributors, and the first fabricated hectare figure that reaches an official ends the
project.

### The invention

**Make it impossible to render an unsourced number**, enforced by the type system, the linter and
the build — and then publish our own epistemic state as a machine-readable API so anybody can audit
our honesty continuously, without asking us.

### How it works

- A `Sourced<T>` type: `{ value: T; sourceId: string; retrievedAt: string; method: 'transcribed' |
  'extracted' | 'submitted' | 'computed' | 'matched'; confidence?: number }`. Data-rendering
  components accept `Sourced<T>` and **cannot** accept a bare `number` — enforced in the type
  signature, so the mistake is a compile error rather than a review comment.
- A custom ESLint rule in `eslint.config.mjs` that fails on a numeric literal reaching a data slot
  outside the content seeds. `npm run lint` already runs at `--max-warnings 0`, so this is a gate,
  not a suggestion.
- A **claim ledger** in CI: extract every rendered claim from the build, diff it against the
  previous release, and fail on any new claim without a source. The diff is reviewed like a code
  diff, because that is what it is.
- `/.well-known/epistemic-state.json`: claim counts by method, the confidence distribution, the
  unverified count, coverage gaps by province and year, and the fields currently below the
  verification floor. Served, versioned, and updated by the build.

### Why we believe it is novel

Data lineage tools exist for warehouses. Provenance metadata standards exist for datasets. We are
not aware of an application that makes provenance a **compile-time property of its own user
interface** and then publishes its own uncertainty as a monitorable endpoint. It inverts the usual
posture: instead of asking to be trusted, publish the instrument by which you could be caught.

### Smallest testable version

The type, the lint rule, and the endpoint over the existing content layer.

**Check:** a deliberate bare number in a component fails `npm run check` and names the file and line;
the probe is removed; the endpoint's counts match a direct query over the content files.

---

## 14 · The quota ledger

**Readiness: Prove — needs a partner.**

### Attacks

At national level the process applies "geographic targets, demographic quotas and transformation
balances" before the determination goes to the Director-General and Minister (`NSAC` in
`src/content/process.ts`). Those are legitimate policy instruments. They are also invisible, so an
applicant who was scored well and lost has no way to distinguish a quota from a favour — and
neither does anybody watching.

### The invention

Publish the **state of every quota and what each allocation consumed of it.** Hectares against the
200 000 ha 2024–2029 target (`NATIONAL_FIGURES`). Category mix. Province distribution. The
February 2020 round allocated 135 117 ha to 275 producers — 160 women, 114 young people and one
person with a disability — so the reporting categories already exist; what is missing is the
running ledger.

Then: when an application loses to a balancing decision rather than to its score, **say so**, and
show the quota's state at that moment.

### How it works

- Every allocation writes a ledger entry: which targets it consumed and by how much.
- The ledger is public, cumulative and reconcilable against the register's own allocation records.
- A losing applicant's reasons distinguish score from balancing, and link to the ledger entry.
- The obvious second-order effect is intended: a quota whose state is public is a quota that can be
  questioned, including by the people it is meant to serve.

### Why we believe it is novel

Affirmative allocation targets are widespread; published, per-decision consumption ledgers for them
are not something we have found. It converts a source of suspicion into a source of accountability
without weakening the policy.

### Smallest testable version

Reconstruct the ledger retrospectively from published allocation data for one round, and show it to
a portfolio committee researcher and a farmer organisation.

**Check:** the reconstructed totals reconcile with the published figures, and every gap is named.

### Forbidden

No individual applicant's personal characteristics are published. The ledger reports aggregates and
per-decision consumption, never a person's demographic record.

---

# Part IV · Three that act on the failure after the farm is won

Getting the land is not the outcome. Farming it is. Three of the seventeen sit entirely after
allocation, because that is where the repository's own case studies say the losses are.

---

## 15 · Scheme governance as a protocol

**Readiness: Ship.**

### Attacks

The clearest finding in the repository: "Collective farming keeps failing on governance."
Communal Property Associations and co-operatives "split into factions, argue over dividends against
operating reserves, and carry uneven labour contributions — leading to deferred maintenance and
asset stripping" (`src/content/risks.ts`, `'groups'`). And the fix is already documented:
Tswelopele Irrigation Scheme, 470 ha and 49 producers, was turned around by restructuring so "each
of the 49 members carries individual responsibility for a designated plot while the bulk irrigation
infrastructure stays shared". The lesson, in the repository's words: "Group farming fails on
governance far more often than on agronomy" (`src/content/cases.ts`).

Everybody knows the answer. Nobody has built the thing that runs it.

### The invention

**Ship the Tswelopele structure as software.** Individual plot responsibility and shared
infrastructure, operated as a protocol over USSD and SMS, with a ledger.

The insight: group failure is not a values problem, it is a **coordination and record-keeping
problem** — whose turn is it at the pump, who paid the levy, who fixed the fence, what was decided
and when. Those are exactly the things software is good at, and exactly the things nobody has
built for an irrigation scheme in a district with no broadband.

### How it works

- **A machine-readable scheme constitution:** plots and their holders, shared assets, the levy, the
  quorum, the dispute path and its escalation timers, and the succession and exit rules. Adopted by
  recorded vote, versioned, and amendable only by the same route.
- **The water-turn scheduler**, the single highest-value piece: a rotational irrigation roster over
  USSD. Whose turn, for how long, from when. Swap requests, and a **turn ledger** that records what
  actually happened, so the argument about who over-abstracted last February has an answer.
- **A sinking fund tracker** for the shared pump and the bulk line — contributions, balance,
  planned replacement date and the shortfall against it. Deferred maintenance is how these schemes
  die, and it dies quietly because nobody is holding the number.
- **A dispute log** with escalation timers: raised, heard, decided, by whom, on what basis. An
  unheard dispute escalates by the constitution's own clock rather than by whoever shouts loudest.
- **Separated performance:** individual plot performance and shared-infrastructure performance are
  reported apart, so one member's failure is not the scheme's failure and the scheme's failure is
  not blamed on a member. This is the Tswelopele principle expressed as a data model.

### Why we believe it is novel

There is co-operative management software, and there is irrigation scheduling software for
commercial farms with pressure sensors and connectivity. We are not aware of a governance protocol
for a smallholder shared-infrastructure scheme delivered over USSD, with a turn ledger and a
sinking fund, built from a documented turnaround case. It is also the invention most likely to
change an outcome in the first year, because the failure it attacks is already happening on farms
that have already been allocated.

### Smallest testable version

One scheme, the water-turn scheduler only, over SMS, for one season.

**Check:** every turn in the season is in the ledger; the scheme can answer "whose turn was it on
this date" without an argument; a swap request leaves a record both parties can see.

### Forbidden

We do not adjudicate a scheme's disputes. The constitution is theirs, the decisions are theirs, and
the log is theirs to export and take elsewhere.

---

## 16 · Standing candidacy and cohort formation

**Readiness: Prove.**

### Attacks

The October 2020 drive advertised about 700 000 ha across 896 farms; the February 2020 round
allocated 135 117 ha to 275 producers (`NATIONAL_FIGURES`, `src/content/policy.ts`). Most
applicants lose, and a loss is total: the business plan, the TCS PIN, the certified copies and the
months of effort are spent, and the next advert starts from zero.

### The invention

**Candidacy that persists, and complementarity that can be seen.**

With explicit, revocable consent, a compliant but unsuccessful application becomes a **standing
candidacy** matched against future adverts and the §3 horizon. The applicant is told when something
fits and can activate it with one step instead of twelve. The state gets a warm, pre-compliant
pipeline instead of a fresh scramble every round.

And second: when an applicant has experience but no capital, and another has capital but no
experience, and a farm needs both — the register can **show them each other**, with the Tswelopele
structure from §15 as the default template rather than an undifferentiated co-operative.

### How it works

- Candidacy carries an expiry, a scope (province, district, enterprise, scale) and a one-step
  withdrawal. It is opt-in, and opting out never disadvantages a future application.
- Matching is transparent: the applicant sees the criteria that produced the match and can correct
  the profile behind it.
- Cohort suggestions are **introductions, never assignments**. Both parties opt in, they form their
  own entity on their own terms, and the committee decides as it always would.
- Consent is per-purpose and logged: being matched to adverts is not consent to be introduced to
  other applicants.

### Why we believe it is novel

Matching markets are well studied; standing candidacy is used in some housing allocation systems.
Combining persistent candidacy with **complementarity matching against a documented governance
template**, in a process where group failure is the known killer, is a combination we have not
seen. The novelty is less the matching than the refusal to match people into a structure that the
evidence says fails.

### Forbidden

We never rank candidates for officials. We never broker, take a fee, or hold a position in any
entity formed. We never introduce two people without both having consented to introductions
specifically. The committee decides; we only reduce the cost of being ready.

---

## 17 · The allocation simulator

**Readiness: Research.**

### Attacks

The 30% redistribution target for 2015 was missed at an estimated 5.5–8% transferred
(`src/content/policy.ts`, LRAD). The current target is 200 000 ha for 2024–2029. Nobody — inside
the state or outside it — can answer the question that matters: *at this rate, with this process,
when does the target arrive, and which part of the process is the binding constraint?*

### The invention

A simulator over the register: the available parcels, the applicant pool, the committee timings from
`STAGES`, and the policy's own published objectives. Not to allocate. **To price the process.**

Run the counterfactuals that cannot be run today. If the district stage took two weeks instead of
three. If packs arrived compliant. If the horizon in §3 gave applicants six months instead of
twenty-one days. If the same farms were allocated under a different sequencing rule. How many
hectares, how many producers, how many years.

### How it works

- The objective function is published, and it is the policy's own — hectares, category mix,
  provincial spread and the demographic categories the February 2020 round already reported
  against. We do not invent an objective.
- Timings come from the register's measured case events once Phase 11 of `docs/PLAN-100X.md`
  exists, and from `STAGES` until then, labelled as the published estimate rather than an
  observation.
- Output is a range with its assumptions itemised, and a sensitivity ranking: which single stage,
  changed, moves the target date most.
- It runs in public, with its code and assumptions open, for a portfolio committee researcher or a
  journalist as readily as for a department.

### Why we believe it is novel

Land reform modelling exists in academic literature, usually at national aggregate level and
usually retrospective. A **parcel-level, process-timed, open simulator wired to a live register**,
whose purpose is to identify the binding constraint in an administrative pipeline, is not something
we have found — and the reason it becomes possible is the register itself. This invention is
downstream of everything else, which is why it is last and marked Research.

### Forbidden

It never proposes who should get a farm. It models rules and timings, never individuals. Any output
naming a person or an application is a defect.

---

# Sequencing

Seventeen inventions is not a backlog, it is a portfolio. Three rules order it.

**Rule one: build the ones that make the others credible, first.** §13 (provenance as a compile-time
property) and §12 (the field survey protocol) are the cheapest two on the list and they are
load-bearing for §2, §5 and §11. Nothing else should start before them.

**Rule two: build the ones that accrue value while you sleep, next.** §3's signal inventory and the
notice archive start compounding the day they ship and **cannot be caught up later** — a month not
watched is a month lost permanently. §9's codec unlocks §6 and §8 and takes days.

**Rule three: never run two Prove-tier pilots at once.** A pilot that fails should fail
legibly. Two at once and you learn nothing from either.

### The first six months

| Order | Invention | Why here |
|---|---|---|
| 1 | §13 Provenance as a compile-time property | Every other invention's credibility depends on it, and it is a week's work |
| 2 | §9 One codec, three carriers | Days of work; unlocks §6, §7 and §8 |
| 3 | §12 The field survey protocol | A printed page and a camera flow; load-bearing for §2 and §5 |
| 4 | §11 The parcel oracle, posteriors only | Runs over the existing 22 notices; publishes a rate including its failures |
| 5 | §1 Verifiable allocation, commitment layer | No committee change required; can shadow one real advert |
| 6 | §6 Paper as a database | Makes every later officer-side invention deployable into a paper process |

Then exactly one Prove-tier pilot: **§3, the advert horizon**, backtested and calibrated before a
single user sees it, because it is the invention that most changes what a person's year looks like.

§4 (the re-runnable business plan) ships alongside, because it needs nobody's permission and it is
the thing an applicant asks for first.

---

# The ethical frontier

Four of these inventions can hurt people. Stating how, and constraining them, is part of the
engineering.

**Satellite assessment of a person's livelihood.** §5 exists because this is already being done to
lessees, with worse instruments and no right of reply. The constraint is not "use it carefully",
it is structural: the subject holds the same instrument, the method is published, the confidence
interval is always shown, and automated termination is forbidden outright. If we cannot hold those
four, we do not ship it.

**Prediction as privilege.** §3 creates an informational advantage. An advantage held by some
applicants and not others reproduces precisely the capture this system already suffers from.
Therefore: public, free, simultaneous, and never shown to anybody positioned to influence what gets
advertised.

**Scores as verdicts.** §2 could trivially be a credit score, and a credit score would be adopted
faster. It is refused. A number whose derivation is ours becomes a reason to decline a loan that
nobody can appeal. The corroboration matrix is harder to sell and honest.

**Location as exposure.** A published parcel boundary can expose infrastructure to theft and land to
speculation or invasion. §11's posteriors gate this: geometry is public only where the notice itself
is public and the match is confirmed, an `insufficient` posterior yields no pin, infrastructure
detail on an occupied farm is authenticated, and a takedown route exists.

And one principle over all of them: **contestability**. Every instrument here that produces a
judgement about a person must be one that person can run, read, and answer. An algorithm used as
evidence against somebody who cannot inspect it is not evidence. It is an accusation with
arithmetic.

---

# 18 · What we refuse to invent

Listing the refusals is part of the design, because each one is a thing that would make adoption
easier and the system worse.

- **Automated allocation or shortlisting.** Not a slow version, not a "decision support" version
  that ranks. The committee decides, with a published rubric.
- **A composite credit or bankability score.** Fields and provenance only. §2's matrix, never a
  number.
- **Suitability or valuation verdicts** for a parcel without soil tests. The app's existing stance,
  kept.
- **Biometric gating** of any application path. Identity verification never becomes a reason a
  person cannot apply.
- **A mandatory digital route.** The paper route stays printed, the office stays named on every
  notice, and no exclusive intake agreement is ever signed.
- **Engagement mechanics.** No streaks, no notifications designed to be re-opened, no metric that
  rewards us for more applications rather than better ones.
- **Synthesised legal text or audio.** §8's hard boundary applies to every surface: a deadline, an
  exclusion or a right of appeal is never generated.
- **Anything that pays us more when more people apply.** The incentive has to be indifferent to
  volume, or every guardrail above will eventually bend.

---

# How we would know we are fooling ourselves

Novelty is easy to feel and hard to verify. Five checks, run quarterly, written down.

1. **The prior art check.** For each invention, search again. Write down what we found, including
   anything that is close. "We are not aware of" is a statement with a date on it, and it expires.
2. **The mechanism check.** Can the invention be described without naming a technology? If the only
   description is "it uses X", it is a technology, not an invention.
3. **The capability check.** Name the person and the sentence: "before this, ___ could not ___." If
   the sentence is vague, the invention is decoration.
4. **The constraint check.** Does it still work with no internet, no title and no trust? Every
   invention that quietly assumed one of those away has drifted.
5. **The falsification check.** Has the measurement that would show it failing actually been run?
   An unmeasured invention is a belief.

Anything that fails two of the five moves to §19's list or out of the plan. Publishing that
movement is how the plan stays honest — a plan that only ever grows is a wish list.

---

# 19 · Rejected, and why

Ideas that were considered and do not meet §0's tests. Kept on the record so they are not
reinvented enthusiastically in six months.

| Idea | Why not |
|---|---|
| Tokenising land rights on a blockchain | The binding constraint is that the state holds the title by policy design. A token does not change the Deeds Registry, and it invents a tradable claim where the policy deliberately prevents one. §1 and §2 use cryptography where it does something — commitment and verification — not as a ledger for rights nobody has granted |
| An AI chatbot over the policy documents | A different interface to the same mechanism. Fails the new-capability test. The grounded, citation-only assistant in `docs/PLAN-100X.md` is the bounded version, and it is a feature, not an invention |
| Drone survey of every advertised farm | Cost per hectare, airspace rules and the fact that §12's twelve shots answer the applicant's actual questions — is there water, is there fencing, can a truck get in — for the price of a walk |
| A marketplace or sublease exchange | State land, allocated on policy criteria. Any transferable interest we create is a capture surface, and building one would be the most damaging thing on this list |
| Gamified applicant onboarding | Engagement mechanics on a statutory process with a deadline. Refused in §18 |
| Automatic translation of notices at publication | Fails §8's synthesis boundary. A mistranslated closing date costs somebody a farm |
| Predicting which applicants will succeed | Technically straightforward and ethically indefensible. It would become a screening tool, and its training data is the captured history in `risks.ts` |

---

# Appendix A · The plan model file

The §4 submission format. Every assumption carries provenance or is labelled as the applicant's own.

```jsonc
{
  "schemaVersion": "1.0.0",
  "parcel": { "registerId": "za.notice.2026.california-507lt-p27", "hectares": 21.4154 },
  "enterprise": "poultry",
  "round": {
    "advertId": "za.notice.2026.california-507lt-p27",
    "scenarioSetHash": "…"            // committed at advert time; see §1
  },
  "assumptions": [
    { "id": "house.capacity", "value": 3500, "unit": "birds",
      "origin": "notice", "sourceId": "…" },
    { "id": "feed.price", "value": null, "unit": "R/t",
      "origin": "applicant", "enteredAt": "2026-09-20" }
  ],
  "scenarios": ["baseline", "drought-1in10", "price-shock"],
  "outputs": {
    "workingCapitalTrough": { "value": null, "unit": "R", "month": null },
    "negativeYearProbability": null,
    "breakEvenStockingRate": null
  },
  "cannotTellYou": [
    "Soil chemistry — no test on record for this parcel",
    "Borehole yield — not stated in the notice"
  ]
}
```

`origin` is the load-bearing field. `notice` and `source` values are traceable; `applicant` values
are the applicant's own commercial judgement and are labelled as theirs wherever they are shown. A
figure with no `origin` fails validation, which is §13 enforced at the file level.

# Appendix B · The commitment and receipt scheme

The §1 layer, in the order it happens.

```
t0  advert opens
    publish  R = H(rubric_code ‖ weights ‖ scenario_set ‖ salt_r)
    append   R to the transparency log; log emits a signed tree head

t1  applicant submits
    leaf_i = H(salt_i ‖ digest(application_i))
    applicant keeps salt_i and receives leaf_i

t2  advert closes
    publish  root = MerkleRoot({leaf_i})
    append   root to the log
    issue    each applicant their inclusion path to root   ← the receipt

t3  determination
    publish  rubric_code, weights, scenario_set, salt_r    (R now verifiable)
    publish  per-criterion scores against anonymised leaves
    publish  ranking

t4  anyone verifies
    H(published rubric inputs) == R                        rubric was not retrofitted
    inclusion path resolves to root                        the application was adjudicated
    rubric_code(scores) == ranking                         the tally is correct
```

Residual trust boundary, stated in §1 and repeated here because it matters: the **entry** of a score
by a human is not proved by this scheme. What the scheme provides is attribution, immutability,
comparability across a round and public re-derivation of the tally. The sealed-score proof that
would close the remaining gap is the Research half of §1.

# Appendix C · Invention record template

One per invention, in `docs/inventions/`. Updated when a check runs, not when a view changes.

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
