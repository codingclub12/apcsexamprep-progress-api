# Topic 1.4 Exercise 1: the legacy taxonomy was the answer key

Page `ap-cyber-unit-1-lesson-4-exercise-1`, id 132673732823, 74,239 chars.

## How this differs from the lesson page

On the 1.4 lesson the legacy taxonomy sat in cue tables: surfaces that tell a
student what the exam wants. Here it was the credited answer itself, in the
scoring JavaScript.

```
if(a1t==='personalized'){pts++; ... Correct. AI-personalized spear phishing
if(a1p==='authority'){pts++;    ... Correct. Impersonating Dr. Martinez exploits authority.
```

Part 1 is a 12-point graded classification. For Incident A the credited technique
was "AI-personalized spear phishing", which the CED does not contain, and the
credited tactic was "Authority", which is Unit 2 content keyed as the answer
inside a Unit 1 exercise.

Worse than either: of the four technique options offered for Incident A, exactly
one named a CED attack type and it was not the credited one. Measured against the
CED, Incident A is AI phishing standing on AI reconnaissance. **Neither was on
the list.** The item had no correct answer available.

## What shipped

`lib/cyber-u1-l4-ex1-ced.js`, 11 splices, 74,239 -> 75,158 chars.

Option VALUES are left alone wherever possible. They are internal tokens the
student never sees, and every one is compared by string against the scoring code,
so `value="personalized"` now reads "AI phishing built on AI reconnaissance" and
still grades through the untouched `a1t==='personalized'`. Cosmetically odd,
provably safe.

Two selects do change their key:

- **p1a-tactic becomes p1a-defense.** Topic 1.4 does not assess psychological
  tactics at all; that vocabulary belongs to 1.1 and 2.1. Rather than delete the
  dropdown and lose a point, it now asks what 1.4 does assess: which defense
  answers the attack. Credited answer is a secret agreed in advance.
- **p3b-control credits a shared secret** instead of out-of-band verification.
  Out-of-band stays as a strong distractor whose label says it works for the same
  reason and is not the named control. This matches the call made on the lesson
  page's cfu-5, and matching matters: a student who meets both should not be
  graded two different ways.

Both wrong-answer branches move with their right-answer branch. The B technique
feedback said "voice cloning" on a miss while the correct branch now says "AI
deepfake", which would have named the same thing two ways depending on whether
the student got it right.

## Gates

`scripts/cyber-u1-l4-ex1-ced-csv.js` adds what a lesson gate does not need. This
page grades in JavaScript: a `<select>` holds option values and the scoring code
compares them as strings, and nothing connects the two except that they happen to
spell the same thing.

- every `x==='...'` comparison is walked back to the select it reads, and fails
  if the value is not among that select's options. An ungettable key means the
  student cannot score the point however well they understand it, silently.
- every `getElementById` target that the body used to provide and no longer does
- option values unique, none unlabelled, arity matching the page's own convention
- no credited answer, and no "Correct" feedback, may name a legacy term
- point awards and score scaling unchanged

`scripts/cyber-u1-l4-ex1-gate-sabotage.js`, registered as `smoke:l4ex1gate` so
CI runs it, breaks the built output fourteen ways and asserts the gate says so.

It found a gap on its first run. The option-count check compared each select
against its own id in the before, so a select whose id was NEW had nothing to
diff and a dropped option rode straight through. That was not hypothetical:
p1a-tactic became p1a-defense in this very change. Arity is now checked against
the page's own convention (every select offers the same number of real options)
rather than against a number picked here.

## The browser check

`scripts/cyber-u1-l4-ex1-grade-check.cjs` drives the rebuilt page in Chromium:

```
all-correct run   Part 1 score 12 (expected 12), 7 scoring lines, no page errors
all-wrong   run   Part 1 score  0 (expected 0)
```

Both directions, because a handler that always awarded full marks would pass the
first check alone. Proven in the failing direction too: break one key and it
reports 11 instead of 12.

Not in CI, because it needs Chromium. Same reason as the 1.4 render check.

## Still open

- The sheet is built and not imported: `out/l4ex1.csv`, 76,175 bytes, one row,
  Command MERGE.
- **The 1.4 lesson sheet is still unimported, and order matters.** Matrixify
  MERGE writes the whole Body HTML and every sheet is built against whatever is
  live at build time. The EK thinning pass on 1.4 must therefore be built AFTER
  the realignment sheet is imported, or it would be built on the pre-realignment
  body and undo the realignment when it lands. That is a hard sequencing
  constraint, not a preference.
- Three more Topic 1.4 artifacts carry the same defect in the same shape:
  exercise 2, the lab (`if(t==='spear'){pts+=2`), and the quiz. The module and
  gate here are the pattern for all three.
