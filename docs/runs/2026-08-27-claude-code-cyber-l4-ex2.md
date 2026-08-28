# Topic 1.4 Exercise 2: mostly fine, and that is the finding

Page `ap-cyber-unit-1-lesson-4-exercise-2`, id 132673634519, 63,450 chars.

## What the audit found

Exercise 1 keyed two credited answers to vocabulary the CED does not contain and
offered no correct option at all for one 12-point scenario. **Exercise 2 does
not.** Its seven credited answers:

```
p1a-cap='deepfake'      the plain name for what 1.4.A.1 describes
p1a-oob='yes'           a yes/no about verification, no label involved
p1b-why='trust'         why a recognised voice bypasses skepticism
p1b-defense='policy'    a process control, correct and CED-compatible
p1c-lesson='dual'       dual-use risk, conceptual
p2-attack='travel'      picks a scenario, names nothing
p3b-response='refuse'   conceptual
```

Not one names a legacy term. The free-text answers are graded by keyword lists
and those are clean too: scenario specifics (sarah, cfo, chicago, sage) and
CED-compatible concepts (osint, evade, out-of-band, dual). A student writing the
CED vocabulary is not penalised anywhere.

Saying so is the point. Manufacturing a rebuild where the graded content is
already sound would be the wrong outcome.

## The six things that did need changing

1. Part 2 was **titled** "OSINT & Spear Phishing Construction (6 pts)". A heading
   naming a six-point graded section after the legacy term is the strongest hit
   on the page.
2. The scenario setup told the student the attacker is building "an
   AI-personalized spear phishing email".
3. The question stem under it repeated it.
4. One graded feedback string explained a credited answer using the term.
5. One distractor label, changed only so the two exercises name the same wrong
   answer the same way. A legacy name in a wrong answer is permitted.
6. **The answer key now accepts the CED word.** Removing the legacy term is half
   the job; the other half is making sure the CED term earns credit. The keyword
   list for "why do filters fail" accepted `osint` and nothing resembling
   reconnaissance, so a student writing "AI reconnaissance gathered the details"
   scored lower than one writing OSINT. Both count now. Nothing was removed:
   OSINT is still the industry word and a student who writes it is still right.

## A false positive I caught before it drove a bad edit

The first version of the legacy-term check was a substring match, and `authority`
was on the list because Exercise 1 credited an option reading "Authority
(impersonating a trusted figure in power)". Run against this page it flagged:

```
Sarah M. is new CFO (authority source)
Travel timing + missed invoice + CFO authority = most effective combination
```

Those are the ordinary English noun, not the Unit 2 tactic taught as vocabulary.
Acting on the flag would have meant editing prose that was never broken.

The ambiguous words (authority, consensus, scarcity, familiarity, pretexting,
tailgating) now match only in **term position**: opening a label, or immediately
followed by a parenthesised gloss, which is how a vocabulary list presents a word
it is teaching. The unambiguous ones still match anywhere, because there is no
innocent use of "vishing".

Known gap, recorded in the code and in a test rather than papered over: a
mid-sentence teaching use with no gloss ("the attacker exploited authority")
reads as ordinary English and passes. Tightening further trades one false
negative for false positives on prose that is fine, which is the worse failure
because it drives edits. The human position audit stays the measurement.

## Shared, not copied

`lib/cyber-exercise-gate.js` now holds every exercise-shaped check and both
exercises use it. Exercise 1 was rewired to it and its sheet rebuilds
byte-identical to the one already handed over, which was the constraint.

`scripts/cyber-exercise-grade-check.cjs` replaces the Exercise 1 specific
version. It reads the credited answers out of the page rather than hardcoding
them, so it runs unedited on the lab and quiz when those are rebuilt. Both
exercises score 12 correct and 0 wrong in Chromium with no page errors.

New in the shared gate, and both tested in `smoke:exgate`:

- **keyword lists may grow, never shrink.** Dropping an accepted keyword
  silently marks down every student who used that word and nothing on the page
  shows it happened.
- the ambiguous-word distinction above.

## Still open

- Sheet built, not imported: `out/l4ex2.csv`, 64,480 bytes, one row, MERGE.
- The lab (`if(t==='spear'){pts+=2`) and the quiz still carry the defect.
