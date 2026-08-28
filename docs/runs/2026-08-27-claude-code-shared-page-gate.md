# One gate for every page sheet, instead of three copies of it

Groundwork before rebuilding the Topic 1.4 exercises. A fourth copy of the same
five checks was about to get written, so it got written once instead.

## Why

Three build scripts each carried their own copy of: tag balance, scripts
compile, JSON-LD parses, no new non-ASCII, nothing that was hidden became
visible. Copies drift, and both drifts that actually happened were silent:

- `stayed_hidden` in the 1.1 gate printed its warning and returned 0. It
  reported a leak and passed anyway. It was a copy of a check that worked.
- the 1.4 gate's classification-mapping check used `\bPrediction:\b`. A word
  boundary between a colon and a space never matches, so the marker was
  unmatchable and the check was partly inert.

Neither was found by reading. The first was found by a live page serving its
answer key; the second by a sabotage suite.

## What moved

`lib/cyber-page-gate.js`: `hiddenIds`, `nothingUnhidden`, `balancedTags`,
`scriptsParse`, `noNewNonAscii`, `changedSentences`, `csvCell`, `csvRow`.

`flat()` deliberately did NOT move. The three callers had genuinely different
versions, and which entities a caller strips changes which sentences it reports
as changed, so each still passes its own in. Everything page-shaped stayed put
too: the widget checks, the exam-cue table rules, the EK density rules.

## Proof it changed nothing

Each of the three scripts was run against a fixed input before and after, and
the full stdout diffed:

```
cyber-u1-topic14-ced-csv.js   IDENTICAL output
cyber-ek-thin-csv.js          IDENTICAL output
cyber-u1-ex1-ced-csv.js       IDENTICAL output
```

And the 1.4 sheet already handed to Tanner is byte-identical after the refactor,
md5 `884af0cb18d9c6a5abdea984b24429b8`, 237,064 bytes. That was the constraint
that mattered: the deliverable in flight must not move.

Passing-direction equivalence is only half of it. The sabotage suite drives five
of the extracted checks in the FAILING direction through the refactored path
(broken script, broken JSON-LD, unclosed div, new non-ASCII, unhidden feedback
box) and still catches all fifteen.

## Now enforced by CI

Both suites are registered in `package.json`, which is how
`.github/workflows/tests.yml` discovers them:

- `smoke:ekprotect` - the EK coverage table survives thinning on every topic
- `smoke:gatesabotage` - the 1.4 gate fails when it should, fifteen ways

The second one matters more than it looks. The gate's own correctness was
previously something someone ran once by hand. Two inert checks shipped that
way. It is now a fact CI enforces on every pull request.

Offline, no network, no secrets, no browser. The render check stays out of CI on
purpose: it needs Chromium.

## Still open

- The 1.4 realignment sheet is built and not imported.
- The Topic 1.4 exercises are diagnosed and not started. See below.

## What the 1.4 exercises turn out to be

Worse than the lesson page, and a different shape of problem. On the lesson the
legacy taxonomy sat in cue tables. In the exercises it is the credited answer
inside the scoring JavaScript:

```
exercise 1  if(a1t==='personalized'){pts++; ... Correct. AI-personalized spear phishing
exercise 1  if(a1p==='authority'){pts++;  ... Correct. Impersonating Dr. Martinez exploits authority
lab         if(t==='spear'){pts+=2;      ... Correct. AI-personalized spear phishing
```

Exercise 1 Part 1 is a 12-point graded classification. For Incident A the
credited AI technique is "AI-personalized spear phishing" and the credited
tactic is "Authority", which is Unit 2 content (2.1.A.3) keyed as the answer in
a Unit 1 exercise. Of the four AI-technique options offered, exactly one names a
CED attack type, and it is not the credited one.

Measured against the CED, Incident A is AI phishing built on AI reconnaissance.
**Neither is on the list of options.** The exercise has no correct answer
available for its own scenario.

Four artifacts carry this: exercise 1, exercise 2, the lab, the quiz. All four
grade in JavaScript, so every edit has to keep `value` attributes and the
`if(x==='...')` comparisons moving together, the same failure mode as the
fill-in-the-blank widget on the lesson page but across a whole answer key.
