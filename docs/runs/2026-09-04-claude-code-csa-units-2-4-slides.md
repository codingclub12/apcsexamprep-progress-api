# 2026-09-04 claude code: the AP CSA Units 2-4 decks, and the ones that already existed

Board task 206, claim #92. Tanner asked to "create the AP CSA slide decks",
said he was "pretty sure I have unit 1 but need 2-4 but not positive", and
wanted them on Google Drive and on each lesson page the way AP CSP does it.

Both halves of the uncertainty resolved to "it already exists", and the second
one nearly cost a session.

## What was established, not assumed

- **Unit 1 exists.** Google Drive, `AP CSA Unit 1 Preview`
  (`1F7NcKUp3okZTgd11ukASJr8m9zS3BqSr`): 15 lesson folders, each with
  `Slide_Decks/Day<N>_Deck_TEACHER.pptx` and `_STUDENT.pptx`, plus guided notes,
  quizzes and a teacher guide. Its own `COURSE-MATERIALS-INDEX.txt` states "15
  topics, 35 instructional days at a 60 minute period".
- **Units 2-4 do not exist in Drive.** Every `Lesson_2.*`, `Lesson_3.*` and
  `Lesson_4.*` folder that came back belongs to AP Cybersecurity or AP
  Networking. Checked by enumeration, not by inference from the folder names.
- **The AP CSA presentations shared with Tanner are CodeHS's**, owned by
  `jkeesh@codehs.com` and `evelyn@codehs.com`. They are somebody else's
  copyrighted decks and are not usable in a paid bundle. Worth naming so no
  future session finds them in a Drive search and treats them as source.
- **Units 2-4 were already authored in this repo.** All 38 lessons live in
  `scripts/csa_kit/content_unit{2,3,4}*.py`, roughly 9,000 lines, and
  `scripts/build-csa-teacher-kit.py` turns them into 418 files. That landed
  2026-08-24. Its run note says why it stopped: "Nothing has been uploaded to
  Drive. The 419 generated files sit in `build/csa-kit/` and are gitignored;
  putting them beside the Unit 1 folders is a decision for Tanner, not a
  default."

So the task was never authoring. It was the publishing step that decision was
waiting on, plus the wiring behind it.

## The near miss, because it is the whole lesson

A generator (`tools/csa-decks/generate_deck.py`), a content schema, and a
complete two-day lesson of Unit 2 content were written before
`scripts/build-csa-teacher-kit.py` was found. All of it was deleted rather than
shipped, because a second implementation of a thing this repo already does well
is worse than none.

This is the failure CLAUDE.md already records twice, in its own words: "a
session spent an afternoon rebuilding the mojibake detector that another
session had already rebuilt better, on this same branch, because it read the
code and not the log." The search that would have caught it immediately was
`ls scripts/*.py`, and it was run only after a grep for slide tooling came back
with `scripts/build-csa-teacher-kit.py` by accident.

**What to do differently: before building anything for a course, list
`scripts/` and `docs/runs/` for that course by name.** Grepping for the thing
you are about to build finds it only if you guess its vocabulary. The Unit 1
decks say "Slide_Decks" and the builder says "teacher kit", so no grep for
"slide" or "deck" was ever going to surface it.

## What shipped

`claude/ap-csa-slide-decks-d6fuwp`, commit `2c0b436`, draft PR #513.

- `config/csa-slide-manifest.js`: all 53 lessons instead of the Unit 1 pilot's
  15. Units 2-4 read `config/csa-slide-days.json`.
- `config/csa-slide-days.json` and `scripts/csa-deck-days-from-content.py`:
  day counts derived from the authored content, never from `build/csa-kit`,
  which is gitignored and would make them reproducible only on the machine that
  ran the build. `--check` refuses a drift, wired as `smoke:csadeckdays`.
- `scripts/csa-slide-embeds-from-csv.js`: adapted from
  `scripts/cyber-slide-embeds-from-csv.js`, not rewritten.
- `scripts/csa-slides-conversion.gs`: the Apps Script for upload, conversion and
  sharing.
- `smoke/csa-slide-gate.js`: updated for the new scope, 28 assertions to 38.
- `package.json`: registered `smoke:csaslides` and `smoke:csadeckdays`.
- `docs/csa-deck-pacing-vs-ced.md` and `docs/csa-ced-course-at-a-glance.txt`.

The built kit itself was handed to Tanner as a 17 MB zip, 418 files, since the
agent cannot put it in Drive (see below).

## Evidence

Against the 152 built decks:

```
76    worked examples compile under a real javac and match their OUTPUT panels
152   decks, 2360 slides, render with nothing outside the slide
0     of 228 teacher-only strings appear in any student deck
0     student decks carry speaker notes (teacher decks carry 94,251 chars)
0     em-dashes and 0 mojibake across 35,692 text shapes
38    assertions pass in smoke:csaslides, up from 28
```

Each guard in the CSV generator was fired rather than read: a duplicate file id
straddling a teacher and a student slot, a lesson outside the 53, a day beyond
the manifest's count, and a CSP sheet passed by mistake. All four refuse.

**The instrument was wrong before it was right, twice.**

`libreoffice-impress` is not installed in this container, so the render
verifier reported 112 decks as "source file could not be loaded" and would have
been reported as 112 broken decks. A trivial one-slide deck built by
python-pptx failed identically, which is what proved it was the tool rather
than the content. After installing it, all 152 render clean.

The teacher/student leak check first reported 152 leaks. They were generic
captions ("The CED learning objectives for this topic, with their codes") that
appear as both a speaker note and a visible caption. Reading `csa_kit/deck.py`
settled it: "Teacher and student editions are the same deck. The teacher
edition adds [notes and callouts]; the student edition omits both. Nothing else
differs." Re-run against only the genuinely teacher-only fields: 0 of 228.

## Pacing, and the unit conversion that inverts the answer

Tanner asked to check the official CED and match it. Two ways to get it wrong,
both tried first:

- **Exam weighting is not instructional time.** Unit 2 has a higher exam weight
  than Unit 1 (25-35% against 15-25%) and *fewer* class periods (~30 against
  ~33). Allocating days by weight puts Unit 2 at ~45 days, wrong by half a
  month.
- **A day is not a period.** The kit is built on 60-minute days; every
  `schedule` in the content sums to 60. The CED's bands are 45-minute periods.
  Compared raw, 76 kit days against ~99-105 CED periods reads as a 25-day
  shortfall.

Normalised to minutes, Units 2-4 are 4,560 against a CED band of 4,455-4,725:
within 1% of the midpoint. The kit is already CED-paced. Unit 4 is the only
real gap at 11% under, and it is the CED's heaviest unit.

Unit 1 runs 41% over the CED midpoint. Defensible for an intro unit that is
also the free preview, but it is a choice rather than CED pacing.

## Still open

- **Nothing is live.** Every lesson resolves 200 with zero decks. Decks appear
  only after the Apps Script runs and its sheet goes through
  `scripts/csa-slide-embeds-from-csv.js --write`. Both steps need Tanner's
  Google account: the Drive connector cannot set "anyone with the link"
  sharing, and 9 MB of decks is roughly 3M tokens of base64 through tool calls.
  That split is not new, it is the one CSP and cyber already use.
- **Unit 1's day counts are still placeholders.** All 15 report one day where
  Drive holds 35 days across 15 lessons. A day count that is too LOW silently
  hides decks, so converting Unit 1 before fixing this drops every Day 2 and
  Day 3 deck on the floor. Enumerating the 15 `Slide_Decks` folders is about 30
  Drive calls and was not spent this session. Fix it before converting Unit 1.
- **The theme side is untouched.** `layout/theme.liquid` loads the slide gate
  only for `/pages/ap-csa-lesson-1-`, so Units 2-4 lesson pages do not mount it.
  Separate PR in the theme repo, against `claude/site-linking-audit-yhufjk`,
  never `main`. That repo is not in this session's GitHub scope.
- **Unit 4's 11% pacing gap**, if Tanner wants it closed. Roughly four days in
  the back half, around sorting and recursion.
- **`scripts/csa_kit/__pycache__/*.pyc` is tracked in git**, so running the kit
  builder dirties the working tree for every session. Restored rather than
  committed here. Gitignoring it is a small separate change.

## Memory for the next session

- **"Create X" may mean "publish X".** Two of the three things asked for
  already existed, and the only way to find that out was to look before
  building. The cost of looking is minutes; the cost of not looking was very
  nearly a duplicate generator plus 38 lessons of redundant content.
- **A stopped piece of work usually names its own next step.** The 2026-08-24
  run note said exactly what it was waiting on, in one sentence, under "Still
  open". Reading that sentence was worth more than any amount of code reading.
- **When a check reports mass failure, suspect the instrument first.** 112
  broken decks and 152 leaks were both false, and both took one control
  experiment to disprove: a trivial deck through the same converter, and a read
  of the generator's own stated contract.
- **Normalise units before comparing pacing.** 60-minute days against
  45-minute periods inverted the conclusion from "25 days short" to "within 1%".
