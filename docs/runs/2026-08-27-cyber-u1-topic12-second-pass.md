# Topic 1.2, second pass: the AP claims that survived the first one

**Agent:** Claude Code
**Branch:** `claude/ap-cyber-unit1-handoff-b10iwk`
**Page:** `ap-cybersecurity-unit-1-password-attacks` (id 132157374679)
**Sheet:** `out/topic12.csv`, one row, Command MERGE. Built, not imported.

## What happened

The first pass rebuilt Topic 1.2's graded items and its objectives, came back
clean through every check that existed, and reported the page realigned. A read
of the built sheet found ten defects. This pass fixes those ten, plus four more
the new check found on its own.

The ten were all one shape, and it is worth naming because it is not the shape
the gate was built to catch. The gate verified that off-CED sections were
LABELLED as enrichment. They were. What nothing checked was whether some OTHER
part of the page turned around and told a student that same material is
required. A banner on 1.2.5 reading "not assessed in this topic" does nothing
while 1.2.6 opens with "each illustrates a specific, testable AP exam concept",
the FAQ answers "how do password attacks appear on the AP exam" with a list made
of rainbow tables and password spraying, and three chips in the defense table
read "Exam Trap". A label loses to a claim, every time, and the page carried
nine claims.

## The two checks this added

**`apClaimsNear` (lib/cyber-page-gate.js).** Any of AP, exam, examined,
testable, assessed, assessment within 500 characters of an off-CED term is a
failure, whatever the enclosing banner says. Distance, not section membership,
because a reader carries a framing sentence about two paragraphs.

Tuned against the real page and its false positives, each one recorded in the
suite: "tested" is not a claim word (an attacker tests a password; six of the
first run's twenty-two reports were that verb), a course name is not a claim
("AP Cybersecurity", "AP CS Exam Prep"), a URL is not a claim (every path on
apcsexamprep.com contains both "ap" and "exam", which produced fourteen reports
from the structured-data block alone). Exemptions exist for sentences whose
whole job is to say a term is NOT examined, they are listed by the caller, and
one 600 characters away does not launder a claim.

**`unwiredSplices` (lib/cyber-page-gate.js).** Reads the module's SOURCE and
fails on any `const X_HTML` that never appears in the SPLICES array. This is the
cfu-5 defect below, and no check that reads output could ever have seen it.

Both are proven in the failing direction in `smoke/cyber-ap-claim-gate.js`
(`npm run smoke:apclaimgate`, 17 checks, offline). One of them confirms no other
Unit 1 splice module has an unwired constant.

## The ten, and what each got

1. **1.2.2 "AP Exam Tip - Match the Defense to the Root Cause"** taught rainbow
   tables and rate limiting as exam technique, and cited "root cause 4" on a
   page that defines three. Rewritten around the three causes that exist and the
   controls that answer them.
2. **1.2.6 "a specific, testable AP exam concept"** over an unsalted-SHA-1
   case study. Section gets the not-assessed banner and an honest intro; the
   three "AP Lesson" chips become "What this case shows".
3. **1.2.7 "the prerequisite for selecting the correct defense on the AP exam"**
   over fifteen organizational controls. Banner names the three protections this
   topic asks for; the three "Exam Trap" chips become the fact each pointed at.
4. **The FAQ answer** listing spraying, rainbow tables, bcrypt and rate limiting
   as exam patterns. Replaced with what the topic covers. The same answer also
   sat verbatim in the FAQPage structured data 70KB above it, which nothing
   renders and search results quote; replaced there too.
5. **cfu-9** graded NIST SP 800-63B rotation and complexity under the label "AP
   Exam Strategy Check". Rebuilt piece by piece onto 1.2.C: a policy that tells
   staff to use a pet's name and reuse it on two systems. Widget ids and
   handlers were never inside a replaced region, so they cannot have drifted.
6. **cfu-5 feedback, the release blocker.** The question had been rebuilt onto
   the targeted-dictionary chain and the feedback still explained the salting
   sequence, so a student who answered correctly was told the answer was "random
   salt, plaintext password, slow hash function". Cause: `C5_FB_FROM/TO/HTML`
   were written and never added to SPLICES, and the anchor as written
   (`<div class="cfu-feedback-explain">`) could never have been unique anyway,
   since all ten CFUs have one. Rewired onto its own opening sentence with
   `toExclusive`, which also keeps the div balance.
7. **cfu-10** asked which "attack types available to this attacker" the
   resources open, while keyed D enumerates only the login routes; option C
   ("all the routes are usable") was the better answer to the question as
   printed. Stem now asks what D answers, and the stolen hash database becomes
   the thing to rule out. Key stays D. Nothing else changed.
8. **cfu-7** was half-repaired: stem, predict, feedback and step 3 had moved to
   the three signs while steps 2, 4 and 5 still graded lockout thresholds,
   30-to-60-minute delays and a compromise rate. Text only; every
   `data-step-id` and `data-correct-order="1,2,3,4,5"` untouched.
9. **The hero subtitle** promised brute force, rainbow tables and salting above
   every banner that then argued with it.
10. **"Exam Weight: ~15-20%"** is not a number the CED publishes; weighting is
    given by skill category, and the badge beside it already names the skill.
    Badge removed rather than corrected to another guess.

## Four more the new check found

- A classification cue at the end of an attack-block description: "For the AP
  exam: if the scenario mentions a wordlist ... classify as dictionary attack."
- The Article structured data `description`: "Master AP Cybersecurity password
  attacks: brute force ... rainbow tables ... and AP exam strategy."
- Two EK codes in painted text (`1.1.C.2` in a worked-example answers line, and
  `CED 1.2.B.2` in an answer key). The other seven are inside the collapsed
  coverage table, which the house rule allows.

## Two mistakes of my own, caught by reading the output

- The 1.2.6 banner first said "two of these three breaches" are the offline
  story. Only one is; the other two (credential reuse, one common password
  across many accounts) are exactly this topic. Rewritten.
- Both passes introduced British spellings into a page that is American
  throughout. The page had 71 instances of the -se defense spelling, 11 of the
  -ze organization spelling, and zero of either British form before I touched
  it. Normalized, along with "memorising" and two uses of "revision" where an
  American student would read "study".

Also worth recording: the first probe for painted EK codes walked the DOM,
filtered to leaf elements, and reported one of the two painted codes as hidden,
because it sits in a div that also holds a `<strong>`. `document.body.innerText`
had both. The render check now reads innerText, which is what a reader sees.

## Evidence

```
59 splices resolved, 270476 -> 275514 bytes
gate:    0 failures
render:  feedback hidden 9/9, leaked none, coverage table collapsed,
         EK codes in painted text 0, answer-key phrases none
grade:   9 graded items driven in a browser, every keyed answer grades correct,
         every blank-fill feedback names its own chips
suites:  apclaimgate ekprotect gatesabotage exsabotage exgate cyberquizgate
         quizgate all pass
claims about what the exam does, on the built body: 0 (was 3)
```

`scripts/cyber-u1-topic12-grade-check.cjs` is new. It answers every item the way
the key says to, in Chromium, and asserts the widget agrees. For fill-in-the-
blank it also asserts that every phrase the feedback puts in bold is a chip in
that item's own word bank, which is the exact defect in item 6 above and the one
thing a static check cannot see.

## One live defect found and deliberately not fixed

`updateTracker()` is declared inside the IIFE that defines `cfuSubmit`, while
`matchSubmit`, `dtbSubmit`, `seqSubmit` and `crSubmit` are declared after that
IIFE closes. All four throw `ReferenceError` on the line after they set the
verdict. Grading, the verdict and the feedback all happen first and are correct;
what is lost is the running score display and the scroll to the feedback.

It reproduces identically on the live body with no splices applied, and on Topic
1.4, which carries the same widget block. Left alone because it is shared page
JS, it predates this work, and fixing it on one of the two pages that have it
would be worse than reporting it. `npm run` nothing: it surfaces as PAGE ERROR
lines in the grade check.

## Still open on 1.2

- The thinning sheet. Seven EK codes remain in the collapsed coverage table,
  which the rule permits, and "the CED" still appears in student prose. That
  phrasing is a decision Tanner has open across all five pages.
- The sheet is built and not imported. Matrixify MERGE writes the whole Body
  HTML, so this sheet must be imported before any other sheet is built against
  this page.

## Lead for the next pass, measured not guessed

The term-independent half of the new check (a sentence that tells a student what
the exam DOES) run across every built after-snapshot:

```
1  ap-cyber-unit-1-lesson-1-exercise-1     "one of the most frequently tested skills on the AP Cybersecurity exam"
2  ap-cyber-unit-1-lesson-4-exercise-1     "The three skills tested most on the AP exam for Topic 1.4"
1  ap-cyber-unit-1-lesson-4-exercise-2     "AI-based attacks on the AP exam always involve THREE elements"
1  ap-cyber-unit-1-lesson-4-lab            "Multi-stage AI attack questions on ..."
0  ap-cyber-unit-1-lesson-4-quiz
3  ap-cybersecurity-unit-1-ai-cyber-defense (1.5)   "The AP exam specifically tests whether ...", "Example AP question", "The AP exam angle:"
3  ap-cybersecurity-unit-1-ai-driven-threats (1.4)  three "AP Exam Tip" boxes asserting what questions do
0  ap-cybersecurity-unit-1-password-attacks (1.2)   was 3 before this pass
3  ap-cybersecurity-unit-1-social-engineering (1.1) "Exam signal: a stated bad outcome", "Exam signal: a clock"
0  ap-cybersecurity-unit-1-wireless-security (1.3)
```

Fourteen claims across five pages. 1.3 and the 1.4 quiz are clean.

Painted EK codes on the stored after-snapshots, same method: 1.3 nine, 1.4
sixteen, 1.5 eight, 1.1 two hundred and thirteen. Read that as a lead, not a
verdict: those snapshots are splice-only for pages whose thinning sheet was a
separate build, and 1.1's is from before the WO-3 rebuild. Worth re-measuring
against live bodies before acting.
