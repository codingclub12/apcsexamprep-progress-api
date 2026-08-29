# 2026-08-28, Claude Code: Topic 3.2 rebuilt to the Unit 3 template

Topic 3.2 now teaches its topic AND looks like the unit it lives in. Sheet
generated and gated; not yet imported. Reasoning, measurements and the CED text:
`docs/cyber-topic32-gold-rebuild.md`.

## What changed

`ap-cyber-unit-3-lesson-3` (id 132524769495), one page, one row, 152,008 to
196,007 bytes.

The page was rebuilt to the shape the other five Unit 3 lessons share: eleven
numbered sections, ten checks (one per teaching section), three case studies, two
worked examples, four exam-strategy cards, six FAQ entries, Common AP Exam
Mistakes and Continue Learning. Roughly 3,900 words of new writing.

The 91 KB of protocol material (TLS, SSH, SFTP, DNSSEC, certificates) is kept
whole in a collapsed appendix. Its ten checks did not come with it, because the
template carries exactly ten and a second graded set in a collapsed panel would
score a student who answered everything as 10 out of 20.

Four defects inherited from the body's old home at lesson-6 went with it: an H1
disagreeing with the page title, a footer nav pointing at lesson-5 and lesson-6's
exercise, a JSON-LD breadcrumb resolving to lesson-6, and nine EK codes in
student-visible prose.

This supersedes the additive pass from earlier the same day. That build added the
CED content and left the page structurally foreign to its unit, so its module,
generator, smoke suite and sheet are removed rather than left as a second way to
build the same page.

## Evidence

- Gate clean against the LIVE body: stylesheet and unit rail carried through
  byte-identical, all six protocol prose probes still present, tag balance
  unchanged on thirteen tags, 13 icon sections numbered 1-10 plus `?`/`!`/`+`,
  every component count inside the measured sibling range, 10 checks all well
  formed and answerable, student-visible EK codes 9 to 0, coverage table still
  holding all 8.
- `validate_csv.py --baseline` exit 0, `PASS ap-cyber-unit-3-lesson-3`. Exit code
  read directly, never through a pipe.
- `npm run smoke:cybertopic32` exit 0, 67 assertions.
- Browser run against the generated body in headless Chromium, exit 0, 17
  assertions: all ten checks graded, score reaches 10 / 10, a wrong answer
  scores 0 and opens its own distractor feedback, both collapsed panels open,
  no page or console errors. Harness `tools/ap-cyber-ced/cfu_browser_check.js`.
- All 141 offline suites pass.
- Sheet: `imports/2026-08-28/cyber-topic32-gold.csv`, 198,788 bytes, 1 row,
  `Command: MERGE`, md5 `a65f7a18aa933af06a5206003517441f`.

Four gates confirmed by breaking them on purpose: a dropped case study, an MCQ
key naming an absent option, an EK code in authored copy, and the stylesheet
dropped during assembly. None wrote a CSV.

## What was learned

**Ask whether the thing matches its neighbours, not just its spec.** The first
pass satisfied the CED and produced a page structurally unlike every other
lesson in its unit. That was caught by a question, not by a gate, and the fix
was 2.5 times the size of the original work. Matching the local file is a safe
default and "consistent with the wrong thing" is still wrong.

**Measure before estimating.** Prose overlap between siblings runs 0.002 to
0.006 on every section except Continue Learning at 0.880. That single number is
what turned "mostly mechanical" into "3,900 words of authoring", and it was
cheap to compute.

**The gold standard has rot in it.** Five sibling pages tell a Unit 3 student to
continue to Unit 1 material, and one has a lab titled "Security Audit Labtion".
Copying the template verbatim would have propagated four broken links into a
sixth page. The template is the shape, not the text.

**A rebuild fails differently from a splice.** A splice that stops matching
no-ops; a rebuild silently omits a region. The gate therefore checks the
stylesheet, the rail and the protocol prose by content rather than by tag, which
is why a sabotaged assembly is caught by a byte comparison.

**Test the property, not the word.** The smoke test first banned "invisible"
outright and failed on correct content: it appears nine times and every one is a
refutation. It now checks each occurrence has a refutation in its own window.

**The score nobody could see.** Driving the checks in a real browser, rather
than reasoning about the markup, found that 3.2 was missing `#cfu-score-tracker`,
`#cfu-score-num`, `#apcyber-progress-bar` and `#apcyber-back-top`, all of which
every sibling carries and all of whose CSS was already in 3.2's stylesheet. The
grader null-guards the tracker, so it computed a running score on every answer
and wrote it nowhere: a student answered ten questions and saw no score, silently,
on the one page in the unit that did not show one. Same harness against the live
body reads `(no tracker)`; against the rebuild it reaches 10 / 10.

## Still open

1. **The four activity pages** still teach protocols end to end and all report as
   lesson `3.2`. A student now reads a policy lesson in the unit's shape and is
   assessed on TLS. Four instruments to author, not sections. Denominators
   unaffected.
2. **Denominators for the renumbering**: 8 adds (`3.1a|*`, `3.1b|*`), 8 removes
   (`3.1|*`, `3.6|*`), no value changes. Needs Railway or admin auth.
3. **The rename sweep** across Unit 3: dns spoofing on 10 pages, arp spoofing on
   4, packet sniffing on 3, event log on 2, kill chain and input validation on 1
   each, plus off-CED SCADA, RADIUS, 3DES and botnet.
4. **The siblings' Continue Learning rot**, worth its own pass across five pages.
5. **Filing these as board tasks.** This session has read-only board access.
