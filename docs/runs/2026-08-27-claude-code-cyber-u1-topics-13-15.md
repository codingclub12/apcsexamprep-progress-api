# Topics 1.3 and 1.5: the handoff's premise was wrong about two of five pages

Worth leading with, because it is the finding.

The handoff said Unit 1 taught a legacy cyber taxonomy as exam vocabulary. That
was true of 1.1, 1.2 and 1.4, and each needed real work: 30 splices on 1.4, 30 on
1.2, and a rebuild of 1.1 before that. **1.3 and 1.5 do not have that problem at
all**, and saying so is part of the job.

## What the audit found

**1.3 (wireless).** Its three attack types, evil twin, jamming and war driving,
are the CED's own three. Its three protections, verify the SSID, avoid open
networks, use a VPN, are the CED's own three. Every credited answer in every
graded item is CED content, checked one at a time, and not one names an off-CED
term.

**1.5 (AI defense).** Same. All ten graded items credit CED content: the scale
problem, signature versus anomaly detection, code vulnerability analysis, false
positives, and the human-review caveat that attaches to all three 1.5.A areas.

So no realignment. What both needed was the OTHER house rule: EK codes in front
of students.

```
        visible EK citations     protected
1.3         18  ->  0            17  (coverage table 8, card tags 6, exit key 3)
1.5         17  ->  3            12  (coverage table 7, exit key 5)
```

## What shipped

One sheet per page, splices then the thinning pass in a single build. Two sheets
per page would each be built against the live body and the second would undo the
first, which is the same Matrixify ordering constraint that governs 1.4.

**1.3**, five splices: the meta-bar badge reading "LO 1.3.A - 1.3.C", the section
heading "Individual Protections (CED 1.3.C)", one sentence claiming "Understanding
which protection works against which attack is a high-frequency AP exam pattern",
and two box labels that asserted what an exam contains. The content in both boxes
is correct and stays; only the labels change, from a claim about the exam to a
description of what is in the box.

**1.5**, three splices: an objective reading "Recognize the three most common AP
exam traps on AI defense questions", an AP Exam Focus bullet citing codes, and a
Common Mistakes row headed with a bare code.

Every MCQ key on both pages is unchanged and the gate asserts it.

## Three tool defects these pages found

Each one was a module written against 1.1 or 1.4 meeting a page it had not seen.
That is now the most common bug class in this work, and every instance has been
the tool crying wolf or silently doing nothing, never the page being wrong.

**1. Card tags were matched by prefix.** `cyber-ek-density.js` protected a card
tag only if it opened with "EK " or "Mechanism:", which is how 1.1 writes them.
1.3 writes a bare code. All six of its card tags counted as unprotected
decoration and would have been stripped. Now matched by position: a span with
class `atk-tag` containing a code is a card tag, whatever the punctuation.

**2. The render check pinned the coverage table to `#ek14-body`.** On 1.2, 1.3
and 1.5 it returned an empty array, which reads the same as "not collapsed".

**3. "CED &lt;code&gt;" doubled up.** The subject-position rule turns a bare code
into "the CED". Where the word CED was already in front of it, that left the
original standing: "CED 1.5.B.3 covers both alerting and corrective action"
became **"CED the CED covers both alerting and corrective action"**. Four of the
five lesson pages carry that shape. Fixed by consuming the pair as one unit,
placed first in the rule list because order is what decides it.

Found by reading the changed sentences. No check would have caught it, which is
the reason the build refuses to write without `--show-changes`.

All three are regression-tested in `smoke:ekprotect`, and 1.1's thinned output is
byte-identical after every one of them, which was the constraint since 1.1 has
already shipped through this transform.

## One question left open, deliberately

Both pages still say "the CED" to students in prose: "The CED identifies six
motivations", "this is the CED definition of an evil twin attack", "Name the
three ways the CED says AI assists cyber defenders". Roughly 23 on 1.3.

That phrasing is what `cyber-ek-thin.js` PRODUCES by design, and it is what
shipped on 1.1 and was accepted. Stripping it on 1.3 and 1.5 while 1.1 keeps it
would leave the unit inconsistent, which is worse than either choice on its own.
It is one decision across all five pages, and it is not mine.

## Still open

- Sheets built, not imported: `out/topic13.csv` 161,130 bytes and
  `out/topic15.csv` 262,170 bytes, one row each, MERGE.
- **Eight sheets now built and none imported**: 1.2, 1.3, 1.4, 1.5, and 1.4's
  exercise 1, exercise 2, lab and quiz.
- The "the CED" phrasing decision above.
