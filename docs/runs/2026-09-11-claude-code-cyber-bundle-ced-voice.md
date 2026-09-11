# AP Cyber Teacher Bundle: the framework comes out of the student instruments

Board 319. 2026-09-11.

Tanner, on the way to a flight: every quiz, test, exercise and maybe discussion in
the cyber bundle says "according to CED" or "pick the 4 CB types", and that is not
something students are learning.

He is right, and it is bigger than the phrase he quoted. Across the 101
student-facing documents there were **1066 references to the course framework**,
and they are now at zero. 1196 edits across 174 files.

| Unit | edits |
|---|---|
| 1 Introduction to Security | 303 |
| 2 Securing Spaces | 214 |
| 3 Securing Networks | 220 |
| 4 Securing Devices | 205 |
| 5 Securing Applications and Data | 254 |

The tool is `tools/cyber-bundle-ced-voice/`, and its README carries the design.
What follows is what a future session needs that the README does not say.

## The bundle is already carrying damage from a previous strip

This is the finding worth reading. Somebody has run a naive citation strip over
part of this bundle before, and the wreckage is LIVE right now in Drive:

    2.2 Q7   ... Which statement(s) correctly reflect?        verb, no object
    2.2 Q9   9. Lists the common ways an asset can be compromised.   no subject
    2.2 Q27  27. Describes what an adversary can do after ...        no subject
    2.2 Q8   8. According to, a vulnerability is best defined as which of the following?
    1.2 Q?   D. — logging in successfully from a known device

A student sitting that quiz today is reading questions that are not sentences.
Twelve option lines start with a bare em-dash and thirteen stems open with
"According to,".

The part that stings: repairs for several of these were **already written**, a
week and a half ago, in `tools/bundle-quiz-relabel/plan.py` under `STUDENT_REPAIRS`
and `SHARED_REPAIRS`. They never reached Drive. That is exactly the sentence
`config/drive-bundles.json` was created to stop anyone saying again, that a bundle
which has been repaired in a zip is not a bundle that has been fixed, and it has now
cost the same defect twice.

I did not read those tables before authoring mine. Several came out word for word
identical anyway ("A vulnerability is best defined as which of the following?"),
which is a pleasant accident and also the reason I trust them.

## Lesson 2.1 has four files where it should have two

`Quiz_KEY.docx` and `Quiz_STUDENT.docx` each exist TWICE in
`Unit_2/Lesson_2.1_Cyber_Foundations/Quiz/`, same names, different file ids. Two of
the four are **corrupt** and will not open. Not a bad download: byte-identical
across two fetches, and the other 331 files in the bundle are clean:

    1JLInbLND-lt_bBlOPtWX4XnEupdq0fyh  Quiz_KEY.docx      18264 b  CORRUPT
    1ljo5dmnJZkuo70Waaaz04x50VdGfXgN8  Quiz_KEY.docx      18248 b  opens
    1rPQt_NVXdfVtfOuge-wUpFobB_2ygpN4  Quiz_STUDENT.docx  15230 b  CORRUPT
    1ULgtwqy3rmZDmYPcMKS3bhBoM_4caPZ_  Quiz_STUDENT.docx  15244 b  opens

A teacher opening that folder sees the same filename twice and a coin flip decides
whether their quiz opens. The good copies are the ones repaired here. Deleting the
other two is a Drive action and Tanner's. Separate board item.

## What was deliberately not touched

4531 framework citations, all of them in the teacher's half of a KEY: the
`Why C:` rationales and the `CED: EK 4.1.A.5` lines. CLAUDE.md names a
teacher-facing answer key as a placement where the code earns its place, and a run
that stripped those would have reported a bigger number and destroyed the product.

The line between the two halves is derived from the KEY/STUDENT pair on every run,
not from a list of line prefixes. The prefix version I wrote first missed
`KEY: Case 1 is a virus (EK 4.1.B.2)` and `Q1 [EK 4.1.B.2] (6 pts)` and would have
taken 2377 teacher annotations with it.

Slide decks and guided notes are untouched: Tanner named four categories. They
carry the same language (1699 marker hits in `Day*_Notes_KEY`, 248 in the STUDENT
notes) and are the obvious next pass, but widening scope on my own is how a
"remove a phrase" job becomes a rewrite of the course.

## Evidence

Three kinds, per CLAUDE.md, and the mutation run is the one that did work.

    suite      verify.py, 688 checks, 0 failures. Package integrity, framework
               voice, content loss, KEY/STUDENT sync, teacher citations intact.
    rederive   rederive.py. python-docx walking the OPC package instead of my own
               ElementTree walk, and a literal word list instead of voice.py's
               regexes. 1066 references before, 0 after, across 101 documents.
               It shares no code and no pattern with the tool.
    mutation   mutate.py. 12 defects re-introduced one at a time; 12 caught by the
               check that was supposed to catch them. Tripping a DIFFERENT check
               counts as a failure here, not a pass.

Also: all 178 outputs open through python-docx, and every correct-answer checkmark
is still on the option it was on.

**The mutation run found a hollow check on its first pass.** The KEY/STUDENT sync
check counted how many paragraphs still paired, and a mutation that replaced a KEY
stem outright did not move the count, because the student's wording was still in
the paragraph to match against. Counting pairs is not checking they agree. The
rewritten check compares the two copies, and it immediately found three real
divergences my own tool had introduced and I had not seen. Had I shipped on the
first green verify, a teacher would have marked a question whose wording no longer
matched the one the class answered.

The same check is why the sync pass exists at all. The old strip damaged STUDENT
copies and left KEYs intact, so repairing a KEY pulls the pair apart on a line the
detector cannot see. The student half reads "What explains why disrupting power
causes this outcome?", which is grammatical, carries no framework voice, and is
simply a different question from the KEY's. `analyze._sync_pass` propagates the
repaired KEY wording to its twin.

## Still open

- **Nothing is fixed in Drive yet.** The connector still exposes `update_file` for
  title and parent only, re-confirmed today, the same wall as
  `docs/cyber-teacher-guide-audit.md` on 2026-08-20. Five per-unit zips went to
  Tanner; until one is uploaded the bundle is unchanged. Verify by re-running
  `rederive.py` against a fresh walk, not by reading this file.
- The two corrupt duplicate files in Lesson 2.1.
- Decks and guided notes, if Tanner wants the same pass there.
- `Unit 3 day splits - 3.3 and 3.4 - FOR REVIEW` is not link-shared, so the walker
  cannot read it and neither can a customer. Left alone on purpose.

## What I would tell the next session

Run the verifier before you believe the tool, and run the mutation test before you
believe the verifier. My first verify was green on a build whose sync check did
nothing, and the difference between "688 checks passed" and "688 checks passed and
12 deliberate defects were caught" was three real bugs in the shipped output.
