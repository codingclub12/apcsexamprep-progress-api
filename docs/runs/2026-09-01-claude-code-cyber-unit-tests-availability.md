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

**2. `verify-exam-key.js` could not see three of the five.** It looked for
`var ANSWERS = {"q1":"D"}` and reported "no letter key" for anything else. Unit 3
keys on `CORR` indices and Units 4 and 5 key in their click handlers, so all
three were skipped silently. The one page with the worst key was a page the
checker structurally could not audit. That is why this went unnoticed: the audit
ran and passed.

**Fixed in a follow-up commit on this branch.** All three shapes are read now,
guessability is a defect rather than a printed number, and
`smoke/exam-key-shapes.js` pins the behaviour in CI. See the note at the end.

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
  Matrixify sheet if taken. The checker now fails on it, so this is visible
  rather than silent, but nothing about the live page has changed.
- Whether the unit hubs should link their own exams.
- Off-CED drift in the online exams, worst in Units 4 and 5 (CIS Benchmarks,
  DISA STIGs, FedRAMP, NIST 800-53, MDM/MAM, PKI, secure boot, NIST SP 800-61,
  Pyramid of Pain). Board #136 already tracks the same thing for Unit 1.
- The per-lesson quiz comparison for Units 2 through 5, which is a different pass
  from this one and is still untouched.

## Follow-up, same session: the checker now reads all three shapes

`scripts/one-off/verify-exam-key.js` understood one key shape and reported the
other two as "no letter key", which is a skip rather than a failure and does not
move the exit code. It now detects three:

```
answers-object  var ANSWERS = {"e1":"D"}            cyber unit 1, 2
corr-index      4th arg of qzNAME(this,q,idx,corr)  cyber unit 3
check-mcq       2nd arg of checkMCQ('qN','C',...)   cyber unit 4, 5
```

Against the five live bodies it now audits 5 and skips 0, where it audited 2 and
skipped 3. Unit 1's existing 5 missing-explanation defects are unchanged.

Two design points worth keeping:

**The distractor checks do not run on all three.** They need one explanation per
OPTION, which only the answers-object pages have; the other two carry a single
explanation per question. Forcing them through would report 60 invented defects
a page. So each shape declares which checks it supports and every result prints
that, because an unstated coverage claim is what went wrong the first time.

**A skewed key is now a defect, not a number.** The distribution and longest run
were already being printed, and Unit 3 shipped anyway, so printing is not
working. The bound is not invented: the bundle generator's own keys record a cap
per letter of 9 over 26 items, 8 over 24 and 7 over 22, and `Math.round(n / 3)`
reproduces all three. Below 12 items the check is withheld, because a 5-item
quiz cannot use four letters and firing there would be noise.

Validated three ways. The saved snapshot trio is an unplanned regression test:
`ap-cyber-unit-1-exam.before-rebalance` is flagged guessable and both
`after-rebalance` and `current-live` are clean, which is the historical record
agreeing with the new check on data it was not tuned against. Across 72 saved
bodies there are no new false positives. And five mutations of the checker were
each confirmed to turn `smoke/exam-key-shapes.js` red.

Still unhandled, and now named in the script header: `var DATA={...}` and
`var sel={...}`, both with a `window.checkQ` handler, on the per-lesson quizzes.
