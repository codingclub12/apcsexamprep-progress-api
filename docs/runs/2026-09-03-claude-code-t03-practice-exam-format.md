# 2026-09-03: T-0.3, the practice exam page advertised a shape the exam does not have

Board 171, open, bucket now. Sheet generated and gated. **Not imported**: the
import is the approval point, and the task is auto-dispatch eligible only once
the copy is approved.

## What was actually wrong

Live, before this change:

    page title      AP Cybersecurity Practice Exam | Full Practice Test | APCSExamPrep.com
    SEO title       AP Cybersecurity Practice Exam | 40 MCQ + 3 Free Response
    source comment  AP CYBERSECURITY PRACTICE EXAM - FULL LENGTH
    H1              AP Cybersecurity Practice Exam
    schema headline AP Cybersecurity Practice Exam: 40 MCQ + 3 Free Response ...
    breadcrumb      Practice Exam

The real exam is 60 multiple choice questions and ONE free-response question,
Device Security Analysis. The page carries 40 and 3. A teacher pacing a class
against "full length" was preparing students for a shape that does not exist.

## The task was smaller than the handoff implies, and that is worth recording

The handoff says to relabel the set as a sampler that is explicitly not
exam-shaped. Half of that had already been done by somebody and never noted:

- the meta description already reads "how the real exam is built: 60 MCQ and one
  Device Security Analysis"
- the body already carries a format note stating the real 60 + 1 shape and saying
  the set is "deliberately shaped for study rather than as a replica"
- the FRQ section already says "They are not a replica of the single question you
  will sit"
- the hero badge already says "Practice Set"

All of that is correct and was left untouched. What had never been corrected was
the LABELLING, above, including the strongest claim on the page. So the fix is
ten exact string edits, not a rewrite.

The remaining defect was also positional: the correction lived about 1200 pixels
down the page while the false claim was in the title and the H1. One clause was
added to the hero paragraph so the shape is stated where the claim is.

## What this is NOT

A rebuild to 60 + 1. That is board 176 and belongs to another session. All 43
question cards, 160 options and every question stem are carried through byte for
byte, which the suite asserts and a mutation proves.

## Evidence

    npm run smoke:practiceexamformat      OK - all 18 checks passed
    matrixify-preflight --carrying        clear to import
    deploy-gate --pre                     11 checks, suite + mutation
    170 offline smoke suites              all pass

The sheet is PARSED BACK and diffed against the source rather than trusted
because it was generated. Generation is not evidence that generation worked.

Nine mutations, each killed on the assertion naming the guard it targets, across
two layers:

    GENERATOR  full-length left in place        refuses the write
    GENERATOR  H1 left as an exam               refuses the write
    GENERATOR  a question card dropped          refuses the write
    GENERATOR  an em-dash this edit adds        refuses the write
    GENERATOR  a stale live title               stops the run
    GENERATOR  an edit matching nothing         stops the run
    SHEET      a question deleted from the CSV  the suite catches it
    SHEET      the H1 reverted in the CSV       the suite catches it
    SHEET      a wrong Title in the CSV         the suite catches it

**The two layers had to be separated, and the first draft did not.** Every
mutation aimed at the suite was caught by the generator first, because the
generator refuses to write a sheet failing its own result guards. The gate
reported those four as "the suite went red, but NOT for the reason you named",
which is exactly the hollow-guard report it exists to produce. The generator
mutations now expect the generator's refusal, and a second family corrupts the
committed CSV directly so the suite is shown to catch a bad sheet however it was
produced.

**The live check fails 6 of 9 right now, and that is the point.** Six assertions
describe the change and are false until the sheet is imported; three are the
unchanged invariants and pass already. An assertion that would have passed
yesterday is decoration.

## Two things found on the way, neither in scope here

- **59 em-dashes in the question text**, against the repo convention. Pre-existing,
  inside the item set board 176 rebuilds, and rewriting them here would mean
  editing questions during a relabel. Left alone deliberately. The guard was
  changed from an absolute check to a before/after comparison for this reason:
  checked absolutely it made this script responsible for the whole page's history
  and refused to write at all.
- **The nav and the course hub still advertise the old shape**, "Practice Exam
  40 MCQ + 3 FRQ, Full-length" and "Full Practice Exam (43 Qs)". Those are theme
  and hub surfaces, not this page body, and count reconciliation across nav and
  hub is T-0.4 with its own lock. Named here so it is not lost.

## Method notes

- Claimed #171 as claim #80 with lock `sheet:matrixify/cyber-practice-exam-format`.
- The body was taken from the Shopify Admin API, which CLAUDE.md names the
  authority, and the scraped copy was confirmed byte-identical to it before
  anything was rewritten.
- The source record is committed at
  `shopify/page-snapshots/ap-cybersecurity-practice-exam.before-format-relabel.json`
  so the generator, the suite and every mutation run offline and reproducibly.
- A 3 character difference between two readings of the same body was checked and
  is a measurement artifact: Node counts UTF-16 units and Python counts code
  points, and the page carries 3 astral emoji. The preflight independently
  reports "3 emoji carried through, none added".

## What is still open

The sheet is generated and clear to import. It has NOT been imported: importing
is the copy approval point. After the import, run
`node scripts/deploy-gate.js deploy-gates/2026-09-03-practice-exam-format.json`
without `--pre` so the live check runs, and the gate is not satisfied until it
passes.
