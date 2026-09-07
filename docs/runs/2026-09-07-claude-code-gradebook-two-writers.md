# One run reported by two writers, and a price that outlived its page

Date: 2026-09-07
Agent: Claude Code (session 2353de81)
Board: #270
Branch: claude/new-session-41sg9k

## What was reported

Michelle, AP Cybersecurity teacher, emailed three things. The third was the one
with a defect under it:

> the scores seem to be off in the grade book... 1.1 Ex 1 is out of 7... but
> scores are out of 14? Ex 2 is out of 8, but scores show out of 15?

Her screenshot shows four students on 1.1 Exercise 1, every one of them 14/14
under a column header reading /7.

Two different causes, and neither is a corrupted ledger. Both are real, both
were live, and one of them was moving grades.

## Exercise 1: two writers, one run, summed

`ap-cyber-unit-1-lesson-1-exercise-1` has TWO score reporters, and they do not
know about each other.

    the page body        posts item 'redflags', out of FLAGS.length, which is 7
    the shared reporter  assets/apcs-score-reporter.js reads #finalScore, whose
                         parent renders "7 out of 7 red flags found", and hands
                         the pair to window.APCS_saveLessonScore in
                         apcs-tracker.js, which posts item 'score'

Both land on the same (student, unit, lesson, activity), and every reader of
`score_events` sums per distinct item. So the pair doubled: 7 + 7 out of 7 + 7.

The PERCENTAGE survived, which is why nothing inside the system looked wrong:
both halves doubled together and 100 percent stayed 100 percent. The POINTS did
not. Measured on a scratch database through the real routes, that column
contributed 14 of a student's 29 graded points, so one exercise weighed twice
what the teacher had priced it at, and the overall grade moved with it. Before
and after the fix, same fixture:

    before   earned 26 / graded 29   89.7 percent
    after    earned 19 / graded 22   86.4 percent

### Why the obvious fix is wrong

'score' cannot simply be excluded the way 'lesson-score' is. On most pages it is
the ONLY writer. 1.1 Exercise 2 records 12 out of 15 through it and nothing
else, so excluding it would delete that grade outright. The mutation battery has
that as a named case, because it is the fix somebody reaches for next.

The rule shipped instead: a page that reports for itself has already said what
the run was worth, so where named items exist they win and the scraped carrier
is dropped; where the carrier is alone, it is the grade. Stated once in
`scoring.js` beside `LESSON_SCORE_ITEM`, as two SQL fragments, and imported by
the three readers of this ledger:

    lib/gradebook-contract.js   what every view reads
    scoring.js                  what progress.score is written from
    lib/admin-denominators.js   what the re-pricing proposal is derived from

The third one is not tidiness. `POST /api/admin/denominators/adopt` AUTHORS from
those observed maxima, so an unfixed 14 could have been written into
`course_denominators` as the official price of a 7 point exercise, turning a
reporting artifact into a real regrade. That is the same trap the lesson-score
exclusion was added to close in August, sprung a second time by a different
carrier.

Because the ledger is append-only and this is a READ-time rule, every already
recorded double is repaired on the next read. No migration, no backfill, nothing
for a student to resubmit.

## Exercise 2: the page was rebuilt and the price was not

Read off the live page body today: `var Q` holds 15 question objects across
three parts, the score bar renders "0 / 15" in three places, and `check()` sets
the score to `pts + ' / ' + Q.length`. The authored price in
`course_denominators` was 8, measured against an earlier version of the page
whose `ANSWERS[]` had 8 entries.

So the CELL was right and the HEADER was stale, which is the opposite of
Exercise 1 and looks identical to a teacher.

Re-priced to 15. Nobody is regraded: `score_events` carries earned and
max_points per submission and the contract prices an attempted cell from the
ledger, so a student who sat the 8 question version still reads 5 out of 8 in
the same column as one reading 12 out of 15. That is asserted in both
directions in `smoke/denominator-corrections.js`.

### Getting a corrected price into a running container

The boot seed is insert-or-ignore on purpose, so that a value an operator
authored by hand is never clobbered. The cost of that showed up here: the
corrected number could be committed and would still never land, because the row
already existed, and the fix would wait on somebody remembering to run the seed
with `--update` in a Railway shell.

So corrections now name the value they replace and apply only while the stored
row still equals it. A hand edit since then wins and is left alone, which keeps
the safety the ignore mode was protecting, and a second run is a no-op forever.

## The detector this replaces was an email

Both halves of her report have the same signature: the number the column header
prints disagrees with the number the students' own submissions carried. Nothing
looked at that.

`/api/health` now carries a `prices` block, on the same terms as the `reporters`
block beside it: PII-free, cached, never throws, names a page and two totals.
Against a fixture reproducing her class it reports

    ap-cybersecurity 1.1 exercise-2  authored 8, observed 15, 4 students

and reports nothing for the two-writer case, because the carrier rule removed
the disagreement rather than papering over it.

## Her other question, answered from live state rather than from memory

She locked all quizzes and Unit Tests and asked what students see. Measured
against production today, unauthenticated:

    GET /api/quiz/ap-cybersecurity/unit-1/1.1..1.5/quiz
      -> locked:true, questions:null, pool:5   all five, enforced
    GET /api/quiz/ap-cybersecurity/unit-{1..5}/exam/exam
      -> "No server-scored quiz for this location"
    GET /api/quiz/ap-cybersecurity/unit-{2..5}/<lesson>/quiz
      -> same

The five Unit 1 lesson quizzes are real locks: the questions are never put on
the wire, and the reasons came back `anonymous-closed-for-activity` and
`anonymous-closed-for-lesson`, so signing out or opening incognito does not
defeat them either. The deployed `apcs-quiz-mount.js` renders "This quiz is not
open yet. Your teacher opens it when the class is ready to take it."

The Unit Tests are not locks at all. `ap-cyber-unit-1-exam` carries all 20
questions AND `var ANSWERS = {"e1": "B", ...}` in its page body, so a student
with the link has the test and the key regardless of what the gradebook says.
That is board #248 stated in one page's markup.

## Evidence

- Reproduction and repair on a scratch database through the real routes:
  `npm run smoke:carrier` (14 assertions).
- The rule is not hollow: `npm run smoke:carriermutation` (19 assertions, five
  mutations, each required to redden its OWN assertion). Two hollow spots were
  found and closed while writing it: a mutation that was really a
  ReferenceError and scored as "red", and an assertion that passed under the
  blunt fix because the contract rebuilt the same pair from progress.score
  against the authored price. The battery now proves the suite ran to a verdict
  before believing a red.
- `npm run smoke:denomcorrections` (12 assertions), `npm run smoke:healthintegrity`
  (42 assertions).
- The full offline set, 216 suites.
- Live storefront reads through `lib/storefront-fetch.js`, no User-Agent.

## Still open

- **The page still writes twice.** The read-time rule makes it harmless and
  repairs the history, but `ap-cyber-unit-1-lesson-1-exercise-1` continues to
  post two events per submission. Fixing that is a Matrixify sheet against the
  page body, and it is the only page in Unit 1 with both writers: swept all 20
  Unit 1 activity pages, one hit.
- **The rule assumes a page's named items cover the whole run.** They do on the
  one page that has both writers: 'redflags' is out of FLAGS.length, which is
  the whole exercise. A page that reported only PART of itself by name while the
  scraped carrier read the full total would now be understated. No such page is
  known, and the new `prices` block on /api/health is the alarm for it, because
  that is exactly the shape it reports: a column priced at one number while its
  students were served another.
- **Units 2-5 were not swept** for the same shape, and the sweep costs 60+ page
  fetches. The `prices` block on /api/health will now name any of them that are
  actually recording, which is cheaper and better targeted.
- **Unit 1 denominators beyond 1.1 were not re-measured.** A crude extraction
  suggested 1.5 lab might read /24 against an authored 30, but the extraction
  window also picked up "3 Parts . 24 pts" badges from neighbouring markup, so
  it is not evidence. Re-pricing a column off a bad read is exactly what put an
  8 there in the first place. Needs a per-page read.
- **The Unit Tests are ungated and ship their answer key.** Not new, and bigger
  than this pass.
