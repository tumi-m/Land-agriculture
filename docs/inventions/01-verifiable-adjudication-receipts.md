# 01 · Verifiable adjudication receipts

Ship (commitment layer) · Research (sealed-score proof) · Owner: the repository ·
Last prior-art search: 15 Sep 2026

## Attacks

Selection capture. Earlier land-reform rounds "lacked an open points-based
adjudication, and well-resourced or connected applicants secured prime farms
ahead of farm workers, labour tenants and resource-poor smallholders"
(`src/content/risks.ts`, `'capture'`). The adjudication chain runs district →
provincial → national → lease over about 87 days (`STAGES`, `TOTAL_DAYS` in
`src/content/process.ts`), and an applicant sees none of it and, in practice,
often gets no reasons.

## Mechanism

Two append-only Merkle structures on the Certificate Transparency model, with
RFC 6962-style domain separation carried into this repository's own domain:

- A **round tree** over application leaves, `leaf = H(salt_i ‖
  digest(application_i))`. At advert close the root is published; each
  applicant's inclusion path to that root is their receipt.
- An **append-only log** over published artefacts: the rubric commitment `R`
  at advert open (t0), the round root at close (t2), the rubric release at
  determination (t3). The log emits a signed tree head, so a client with only
  the organiser's public key can verify the log is one history, not a fork.

The t4 verifier runs three statements entirely in the browser, nothing leaves
the device:

1. `H(published rubric inputs) == R` — the rubric was not retrofitted.
2. The applicant's inclusion path resolves to the published root — the
   application was in the adjudicated set.
3. `rubric_code(scores) == ranking` — the tally is correct.

## New capability

"Before this, an unsuccessful applicant could not prove — to themselves or to
anyone else — that their application was in the set that was adjudicated, nor
re-derive the published ranking from the published rubric."

## Prior art

- **RFC 6962, Certificate Transparency** (June 2013): Merkle tree over log
  entries, signed tree heads, domain separation between leaf and node hashing.
  This record reuses the shapes and re-namespaces them; it does not claim the
  construction.
- **Trillian** (Google, 2017): the general-purpose transparency log the CT
  model is built on in production.
- **Helios** (Adida, 2008): end-to-end verifiable elections — the voter holds a
  receipt and re-derives the tally. This record is the Helios posture applied
  to adjudication rather than voting.
- **VRF-based cryptographic sortition** (Algorand, 2017): verifiable random
  committee selection. A different primitive for a different step; adjudication
  here is a scored tally, not a lottery.
- **Zero-knowledge scoring proofs** (zkSNARK families, Groth 2016 onward): the
  Research half of §1 in `docs/PLAN-FRONTIER.md`. Not shipped here.

The difference from all of the above: none of them is applied to public land
adjudication, where a fixed candidate set, a published rubric, a small number
of adjudicators and a statutory right to reasons make the fit unusually direct.

## Smallest testable version

The commitment layer in this repository: canonical hashing, the round tree, the
log with signed heads, and a `/verify` page that runs the three t4 statements
on a published round. Run alongside one paper round on a single advert,
changing nothing about how the committee works.

The Check that decides it: the QC5 round in `docs/PLAN-MAP-10X.md` — the three
t4 statements re-derived from a published round, 3 of 3, with a tamper test for
each.

## Failure modes

- **The score a human types is not proved by this scheme.** Stated in
  `docs/PLAN-FRONTIER.md` §1 and repeated here because it is the boundary
  that matters: *the entry of a score by a human is not proved by this
  scheme.* What the scheme provides is attribution, immutability,
  comparability across a round and public re-derivation of the tally. The
  sealed-score proof that would close the remaining gap is the Research half
  of PLAN-FRONTIER §1, and it is external to this record.
- **The organiser's key is compromised** → every signed head is suspect. The
  key lives outside the app; `scripts/adjudication/sign-head.mjs` stops and
  names `ADJUDICATION_SIGNING_KEY` when it is absent. Rotation is a new head,
  published.
- **A browser without WebCrypto** → `/verify` says "check unavailable" and
  never silently passes.
- **No round has been published** → `/verify` shows an empty state. Never a
  sample round: an empty state is the design, per the standing rules.

## Forbidden

No automated shortlisting. No ranking displayed without the rubric that
produced it. No rubric committed after applications have been seen. This
mechanism is never a gate that decides who farms; it is a receipt that lets
anyone check the humans who decided.

## Measurements

`npm run inventions:check` · not yet run
