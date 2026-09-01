# Cyber unit tests: live on the site, distinct from the bundle, one bad key

2026-09-01, Claude Code. Question asked: are the Cyber Unit Tests available to
students on the site now, and do they differ from the teacher bundle?

## What changed

Nothing on the storefront or in the API. This was a read-only pass. Two docs:

- `docs/cyber-unit-tests-availability.md`, new, carries the whole answer.
- `docs/cyber-unit1-bundle-vs-online.md`, updated, so its open "What is still not
  checked" section no longer claims Units 2 through 5 are unexamined when the
  unit-test half of that is now done.

## The answer

**Available: yes, all five.** `ap-cyber-unit-{1..5}-exam` are published, return
200 anonymously, and each serves 20 multiple-choice items. No login wall, no
entitlement gate.

**Distinct from the bundle: yes, all five, zero shared items.** Unit 1 was
already proven; this pass closes 2 through 5 against `_Unit_N_Test_KEY.docx` in
Drive. Bundle instruments run 26, 24, 22 and 24 items plus 3 FRQs; every online
one is 20 MCQ. The bundle is CED-anchored with EK citations on every item, the
online exams are a Vantex running case study. Twenty-six verbatim probes of the
Unit 2 bundle stems against the online stems returned one hit, "insurance", and
that pair is one concept in two different scenarios.

## What the question surfaced

Three things nobody asked about, in the order they matter.

**1. The Unit 3 exam key is guessable.** `BBBCCBBBBBCBBBABBBBB`: 16 B, 3 C, 1 A,
no D at all, longest run 5. Clicking B twenty times scores 16/20, which is 80
percent, without reading a stem. Confirmed twice off the live body, from
`var CORR=[...]` and from the fourth argument of the eighty
`qzu3exam(this,n,idx,correct)` handlers; the two agree. No single item is
mis-keyed, so this is a distribution defect, not a correctness one. The other
four keys are fine, and 4 and 5 are perfectly balanced at 5/5/5/5.

**2. `verify-exam-key.js` cannot see three of the five.** It looks for
`var ANSWERS = {"q1":"D"}` and reports "no letter key" for anything else. Unit 3
keys on `CORR` indices and Units 4 and 5 key in their click handlers, so all
three are skipped silently. The one page with the worst key is a page the
checker structurally cannot audit. That is why this went unnoticed: the audit
ran and passed.

**3. Four of five unit hubs do not link their own exam.** Only Unit 4's hub does.
All five are linked from the course guide, which is the sole path for the other
four. A student working down a unit page never reaches its test.

Also recorded, not new: Units 3, 4 and 5 record completion only and no score,
because they lack `id="score-display"` and do not use the
`.answered-correct` / `.answered-wrong` convention, so `activityScorePct`
correctly returns null. `scripts/seed-cyber-denominators.js` documented this on
2026-08-25 and it still holds on bodies fetched today.

## Evidence

- Shopify Admin API for published state and `updatedAt` on all five handles.
- `curl` against `www.apcsexamprep.com`, anonymous, 200 on all five.
- `scripts/fetch-page-bodies.js` for the five exam bodies and six hub bodies, so
  no page body passed through a model's context.
- Keys extracted by script from those bodies, cross-checked against a second
  in-body source wherever one exists.
- `_Unit_{2,3,4,5}_Test_KEY.docx` read from the `AP Cybersecurity Course` Drive
  folder.

## Still open

- Whether to rebalance the Unit 3 key. Content decision, and it ships as a
  Matrixify sheet if taken.
- Teaching `verify-exam-key.js` the `CORR` and click-handler shapes, so the
  audit covers five pages instead of two. This is the fix that keeps the class
  of defect from recurring, and it is the one worth doing first.
- Whether the unit hubs should link their own exams.
- Off-CED drift in the online exams, worst in Units 4 and 5 (CIS Benchmarks,
  DISA STIGs, FedRAMP, NIST 800-53, MDM/MAM, PKI, secure boot, NIST SP 800-61,
  Pyramid of Pain). Board #136 already tracks the same thing for Unit 1.
- The per-lesson quiz comparison for Units 2 through 5, which is a different pass
  from this one and is still untouched.
