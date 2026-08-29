# Cyber Topic 3.2: rebuilt to the Unit 3 template

Topic 3.2 is `ap-cyber-unit-3-lesson-3`. It came out of the 2026-08-27
renumbering with the right number, the wrong body, and a shape no other page in
its unit shares. This is what was rebuilt, what was measured first, and what is
still open.

Renumbering context: `docs/cyber-unit3-renumbering-spec.md`.
Transform: `lib/cyber-u3-topic32-gold.js`. Sheet: `scripts/cyber-u3-topic32-gold-csv.js`.
Test: `smoke/cyber-topic32-gold.js` (`npm run smoke:cybertopic32`).

## Two defects, found in that order

**The content gap.** The page shipped with a collapsed Essential Knowledge panel
listing all eight of Topic 3.2's EKs against "Section 2 - Network Security
Policies" and "Section 3 - Wireless Security Controls". Neither section existed.
The body underneath was TLS, SSH, SFTP, DNSSEC and the certificate trust model.
The table was not describing the page; it was describing a page someone intended
to write. **A citation is not coverage.**

**The shape gap**, found only because the question was asked directly. Measured
across all six Unit 3 lesson pages:

| Page | Numbered sections | Cards | FAQ | Case studies | Vantex | Bytes |
|---|---|---|---|---|---|---|
| 3.1a | 13 | 16 | 6 | 3 | 20 | 197,575 |
| 3.1b | 13 | 16 | 6 | 3 | 30 | 195,789 |
| **3.2 (before)** | **5 plain** | **4** | **0** | **0** | **0** | **152,008** |
| 3.3 | 13 | 16 | 6 | 3 | 25 | 186,326 |
| 3.4 | 13 | 16 | 6 | 3 | 23 | 189,619 |
| 3.5 | 13 | 16 | 6 | 3 | 25 | 197,339 |

Five of six are the same page, near-identically. 3.2 was not, and this predated
the CED work: it arrived with the old lesson-6 body, which was authored to a
different pattern. Vantex Financial Group, the organization a student meets in
3.1a and follows to 3.5, appeared on 3.2 **zero times**.

## The template is authored content, not boilerplate

Before assuming a reformat would do, prose overlap between the five siblings was
measured section by section (4-word shingle Jaccard, averaged over all page
pairs):

| Section | Overlap | Reading |
|---|---|---|
| Essential Vocabulary & Exam Tips | 0.003 | written per topic |
| Real-World Case Studies | 0.002 | written per topic |
| Worked Examples | 0.002 | written per topic |
| AP Exam Strategy | 0.004 | written per topic |
| Frequently Asked Questions | 0.006 | written per topic |
| Common AP Exam Mistakes | 0.081 | written per topic |
| **Continue Learning** | **0.880** | **genuinely boilerplate** |

One section of thirteen is copyable. So this was roughly 3,900 words of new
subject-matter writing, not a formatting pass, and saying so before starting was
the difference between an estimate and a guess.

The activity pages do not compensate: exercise-1, exercise-2, lab and quiz carry
no vocabulary table, no case studies, no worked examples and no FAQ between them.

## The template, as measured

    1  Learning Objectives
    2  Why <the topic> matters              + check 1
    3  Essential Vocabulary & Exam Tips     + check 2
    4-7  the teaching sections              + checks 3-6
    8  Real-World Case Studies              + check 7
    9  Worked Examples: Predict First       + check 8
    10 AP Exam Strategy                     + check 9
    11 Frequently Asked Questions           + check 10
    !  Common AP Exam Mistakes
    +  Continue Learning

**One check per teaching section, so there are exactly ten.** That rule is what
sets the number, and it is why the rebuild has ten rather than the fifteen an
additive pass would have produced.

## What the rebuild contains

Sections 3.2.1 to 3.2.11 covering all eight EKs, ten checks, three case studies
(two documented incidents plus the recurring Vantex audit the siblings all
carry), two worked examples, four exam-strategy cards, six FAQ entries, and a
Continue Learning block.

Also fixed, all inherited from the body's old home at lesson-6:

- H1 read "Lesson 3.2: Secure Network Protocols" while the page title read
  "Network Security Policies & Wireless"
- the footer nav pointed back at `lesson-5` and forward at
  `lesson-6-exercise-1`, a link that resolves, renders, and files a student's
  visit under Topic 3.5
- the JSON-LD breadcrumb still resolved to `/pages/ap-cyber-unit-3-lesson-6`
- nine EK codes sat in student-visible prose

**Continue Learning was rebuilt rather than copied.** The siblings' version
carries copy-paste rot from a Unit 1 template: 3.3's reads "the next topic in
Unit 1" and links a Topic 1.1 quiz, a Unit 1 project and a Unit 1 exam, and its
lab is titled "...Security Audit Labtion". Copying the gold standard verbatim
would have propagated four broken links into a sixth page. **The template is the
shape, not the text.**

## What happened to the protocol material

TLS, SSH, SFTP, DNSSEC and the certificate trust model are good writing and are
not Topic 3.2. All 91 KB moves into a **collapsed appendix**, whole, with its
headings renumbered Background 1 to 5. Nothing is deleted.

**Its ten checks do not come with it.** The template carries exactly ten, one per
teaching section, and a second graded set inside a collapsed panel would report a
student who answered every question on the page as 10 out of 20. Protocol
assessment is not lost by this: all four activity pages test protocols end to end.

That was safe to decide only after checking the tracker. `apcs-tracker.js` counts
`.check-btn`, and **no Unit 3 lesson page carries one** (verified on 3.2, 3.3 and
3.5). These pages record a visit and never a score, so the number of checks
changes what a student sees on the page and nothing that reaches the gradebook.

## The score nobody could see

Asked whether the checks would work outside the preview, the honest answer was
that it needed testing rather than reasoning. Driving all ten in headless
Chromium found a defect that no amount of markup inspection would have shown.

Every sibling carries three page widgets and 3.2 carried none of them:
`#cfu-score-tracker`, `#cfu-score-num`, `#apcyber-progress-bar` and
`#apcyber-back-top`. The stylesheet already defined all eight rules for them,
because the CSS is shared unit-wide and only the markup diverged.

The score tracker is the one that mattered. `updateScoreTracker()` null-guards
both elements, so on 3.2 the grader computed a running score every time a student
answered and then wrote it nowhere. Nothing threw. Nothing looked broken. A
student answered ten questions and never saw a score, on the one page in the unit
that did not show one.

Confirmed by running the same harness against both bodies:

| | live page today | rebuilt page |
|---|---|---|
| All ten answered correctly | `(no tracker)` | **10 / 10** |
| Tracker becomes visible | FAIL, element missing | ok |
| Feedback opens on all ten | ok | ok |
| Buttons disable after use | ok | ok |

Harness: `tools/ap-cyber-ced/cfu_browser_check.js`, run by hand against a
generated body. It reads every answer off the page's own `data-answer` rather
than carrying its own copy, so it cannot pass by grading a key it supplied
itself. It is deliberately not an npm smoke script: it needs a browser and a
built page, and CI's suite list is derived from `package.json`, so adding it
there would break every CI run. The offline suite asserts the widgets are
present instead.

## Evidence

- Gate clean against the **live** body: 152,008 to 196,007 bytes; stylesheet and
  unit rail carried through byte-identical; all six protocol prose probes still
  present; tag balance unchanged on thirteen tags; 13 icon sections numbered
  1-10 plus `?`, `!`, `+`; every component count inside the measured sibling
  range; 10 checks all well formed and answerable; student-visible EK codes 9 to
  0; coverage table still holding all 8.
- `validate_csv.py --baseline`: `PASS ap-cyber-unit-3-lesson-3`, exit 0, read
  directly and never through a pipe.
- `npm run smoke:cybertopic32`: 67 assertions, exit 0.
- All 141 offline suites pass, derived from `package.json` as CI derives them.
- Browser run: 17 assertions, exit 0. All ten checks graded, score reaches
  10 / 10, a wrong answer scores 0 and opens its own distractor feedback, both
  collapsed panels open, no page or console errors.
- Sheet: `imports/2026-08-28/cyber-topic32-gold.csv`, 198,788 bytes, 1 row,
  `Command: MERGE`, md5 `a65f7a18aa933af06a5206003517441f`.

Four gates were confirmed by breaking them on purpose. A dropped case study:
`case-block count 2 is outside the sibling range 3-3`. An MCQ key naming an
absent option: `check 4: key E is not among options [ABCD]`. An EK code in
authored copy: caught by the visible-citation counter. The stylesheet dropped
during assembly: `body shrank` and `the stylesheet changed`. **None wrote a CSV.**

## What was learned

**A rebuild fails differently from a splice.** A splice that stops matching
no-ops. A rebuild silently omits a region, and the regions at risk here were the
stylesheet, the unit rail, the collapsed coverage table and 91 KB of prose:
things a reader would not immediately miss and whose loss is permanent after
import. So the gate checks each **by content**, not by presence of a tag, which
is why the stylesheet is compared byte for byte rather than merely counted.

**A question is worth more than an inspection.** "Will the checks work outside
the preview" could not be answered by reading markup, and answering it properly
found a live defect that had nothing to do with this rebuild.

**Test the property, not the word.** The smoke test first banned "invisible"
from authored copy, and failed on correct content: the word appears nine times
and every one is a refutation or a claim a worked example sets up to knock down.
It now checks that each occurrence has a refutation in its own window, which is
the property that actually matters.

## Still open

**The four activity pages.** exercise-1, exercise-2, lab and quiz moved here with
the body, all report as lesson `3.2`, and all still teach secure protocols end to
end: "Secure Protocol Analysis", "Protocol Migration Planning", "Operation Cipher
Sweep", and a quiz headed "Secure Network Protocols". A student now reads a
policy lesson, in the unit's own shape, and is assessed on TLS. That is the last
piece of this topic and it is a bigger job than this one: four instruments, not
sections. Denominators do not change when it happens (`3.2|exercise-1` is 6,
`-2` is 24, lab 30, quiz 5, each measured from the page's own score readout).

**Denominators for the renumbering** are still unapplied: 8 adds (`3.1a|*`,
`3.1b|*`), 8 removes (`3.1|*`, `3.6|*`), no value changes. Needs Railway or admin
auth.

**The rename sweep** across Unit 3: dns spoofing on 10 pages, arp spoofing on 4,
packet sniffing on 3, event log on 2, kill chain and input validation on 1 each,
plus off-CED SCADA, RADIUS, 3DES and botnet.

**The siblings' own Continue Learning rot** is worth a separate pass: five pages
point students at Unit 1 material from Unit 3.
