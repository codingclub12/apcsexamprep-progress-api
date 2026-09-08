# Cyber quiz migration, units 2 to 5

Seventeen quiz pages move onto the server render path. What that buys is the
thing a teacher asked for on 2026-09-06 and did not get: a locked quiz that is
actually locked. Until now the lock hid a column while the page kept handing out
the questions and the key, so `lock_enforceable` read false and the gradebook had
to carry a caveat explaining that some padlocks are decoration.

Two defects came out of the work that matter more than the migration does.

## The lesson a bank files under was being read out of the handle

The extractor took `ap-cyber-unit-3-lesson-5-quiz` and called it lesson 3.5. That
is the obvious reading and it is wrong for every page in Unit 3.

Unit 3 was renumbered onto the Fall 2026 CED. The renumbering shipped to the page
BODIES; the handles are Shopify URLs and stayed where they were. So the handle
carries the site number and the page carries the CED number, and across the unit
they differ by one:

    ap-cyber-unit-3-lesson-2-quiz   handle 3.2   really 3.1b
    ap-cyber-unit-3-lesson-3-quiz   handle 3.3   really 3.2
    ap-cyber-unit-3-lesson-4-quiz   handle 3.4   really 3.3
    ap-cyber-unit-3-lesson-5-quiz   handle 3.5   really 3.4
    ap-cyber-unit-3-lesson-6-quiz   handle 3.6   really 3.5

Six banks were about to be filed one lesson too high, and topic 3.1 (which is
taught over two pages and keys two columns, 3.1a and 3.1b) would have collapsed
into one, letting a better score on one part mask the other.

Nothing throws when this happens. Every id is well formed, the seed runs clean,
the smoke suites stay green, and a teacher opens a gradebook column of firewall
questions labelled Segmentation. It is the same class of defect CLAUDE.md records
as "Unit 3 filed under retired lesson ids", and it was caught the same way: by
making two implementations agree rather than by reading one of them.

`lib/cyber-quiz-lesson.js` is the fix. It takes the answer from
`config/cyber-topics.json` (built from the CED text extracts) and cross-checks it
against the topic number the page prints in its own h1. Where both are available
they must agree; a disagreement is a refusal, because a mismatch means one of them
has moved and either answer would be a guess. Unit 2's lesson pages use
descriptive handles that the taxonomy does not know, so those fall back to the
handle digits and require the page to corroborate them.

`smoke/cyber-quiz-lesson.js` pins it against `utils.pageFromHandle`, which is the
resolver production actually keys on. 20 of 20 agree, all six Unit 3 pages
included. The suite also asserts that the handle-digit reading DIFFERS, so it
cannot go green against a resolver that never left home.

## One rule, two copies, and the narrower one was doing the work

`smoke/quiz-bank-authoring.js` refused the word CED in a student-facing field.
`scripts/extract-cyber-quizzes.js` had its own copy that refused only a numbered
code such as `2.3.B.8`. Its comment said it was enforcing the repo's rule.

So four Unit 4 stems extracted clean:

    Which of the following statements about malware are TRUE according to the AP CED?
    Each pairing below matches a device exploitation vector with a valid CED defense EXCEPT:
    Using the CED High/Moderate/Low device-risk framework, ...
    ... which CIA principle does the CED most directly associate with it?

They were seeded, and the suite that exists to catch exactly this did not, because
its section 1 is scoped to `ap-cybersecurity` / `unit-1` for the render assertions
and the seventeen new banks were outside it. Section 1b now sweeps every bank the
repo seeds, and it is what found these.

`lib/quiz-citation.js` is now the only definition, read by both. This is the same
shape as the Matrixify preflight keeping three hardcoded mojibake leads of its own:
a guard and its test sharing one blind spot and agreeing with each other.

## What shipped, and what did not

Seventeen banks, 85 questions, keyed on the lessons above. Three pages were held
back rather than seeded:

- **2.3** and **4.1**, for the CED citations above. Refusing is all-or-nothing per
  quiz: seeding the rest would leave a student taking a four-question instrument
  where the page gives five, which changes the assessment while reporting success.
  These need a reword, not a strip: deleting "according to the AP CED" changes what
  the stem claims while looking like a migration. Three of the four are trivial
  and the fourth ("which CIA principle does the CED most directly associate with
  it") genuinely leans on the CED as an authority. That is a content call.
- **3.5**, because its page carries TEN questions. Every web quiz measured on this
  site is five or six; the teacher bundle instruments are 9 to 24. That is the one
  cheap discriminator available, since the .docx files are not in this repo and no
  diff against them is possible, and it is now a standing refusal in the extractor
  rather than a judgement made once. A human should say what that page is before
  it is migrated.

## Evidence

- `deploy-gates/2026-09-08-cyber-quiz-migration.json`, `--pre` green: two suites,
  four mutations, each red for its own named assertion.
- The mount sheet reproduces byte-identically from the live page bodies, and the
  Batch A (unit 1) sheet is unchanged by every generator edit in this pass, checked
  by md5 after each one.
- Parse-back: the CSV was re-read as CSV and all 17 bodies checked for the mount
  triple, the absence of every key idiom, div balance against the source, hero
  survival and the preserved scenario cards. 17 clean.
- `scripts/matrixify-preflight.js --carrying`: clear to import, 3 emoji and 363
  non-ASCII characters all carried through rather than introduced.
- Seeded into a throwaway database and served over loopback: all 17 URLs the mount
  will request answer 200 with 5 questions and no `correct_index` or `explanation`.
- The mount asset was fetched from the CDN and read: it builds its URL from
  `data-course` / `data-unit` / `data-lesson`, with no hardcoded unit, and
  URL-encodes, so `3.1a` and `3.1b` work.

Three mutations of the mount generator, run by hand rather than in the gate
because no suite drives that script:

    drop the scenario-card preserve   assertion 5b refuses all 8 unit 2/3 pages
    emit a fixed single </div>        assertion 6 refuses unit 4 and 5 on balance
    hardcode data-unit="unit-1"       PASSED, and that is a finding

The third one shipped a clean sheet with all seventeen mounts pointing at unit 1.
Those pages would have asked for `/api/quiz/ap-cybersecurity/unit-1/3.3/quiz`, got
a 404 and rendered nothing where the quiz used to be. Assertion 3 checks the unit
and the course now, and the mutation goes red.

## After the deploy

Merged as 9bc4004. Railway served it and the boot seed converged:

    9bc4004  total=112  inserted=85  updated=27  retired=0

`retired=0` is the load-bearing number there. Converging is destructive to any
location this file owns that stops appearing in it, so a dropped bank would have
shown up as retirements rather than as an error.

**One live check failed, and it was the CHECK that was wrong.** It asserted that
an anonymous request receives five questions from each of the seventeen. Every one
answered `200 {"locked":true,"reason":"anonymous-closed-for-lesson"}` instead,
which is the anonymous gate working: an anonymous caller who GOT five questions
would be the defect, and closing that hole is what PR #585 was for. The loopback
rehearsal passed only because a throwaway database has no classes, so it had no
gate rows and nothing to lock.

That is the same shape as the assertion this repo keeps re-learning: a check that
cannot pass against a correct production is not a weak check, it is a check
pointed at the wrong thing. Rehearsing it offline hid that, because the offline
fixture lacked the very state the assertion depended on.

The corrected one asserts what is anonymously visible and still false yesterday.
`routes/quiz.js:249` looks the bank up BEFORE the gate and 404s an empty one, and
the locked response still reports `pool: rows.length`. So `pool` proves the bank
landed without needing a student token:

    pool5=17/17 missing=0 leaked=0

It is false before the deploy in both directions: these locations 404'd entirely,
and the wrong reading of the handle would have put unit 3's pools on 3.2 to 3.5
rather than 3.1a to 3.4.

Gate satisfied on three independent kinds: suite, mutation, live.

## Still open

- The Matrixify sheet is NOT imported. It is a human action and MERGE has no undo.
  Until it lands, the pages still carry their keys and these banks change nothing
  a student sees.

## The order these two land in, checked rather than assumed

The merge has to come FIRST and the imports second, and both halves of that were
worth verifying because the repo disagreed with itself about one of them.

`db.js` said the quiz bank is "seeded manually (never on boot), so a fresh deploy
stays empty". `scripts/seed-quiz-bank.js` said "a deploy already does it". The
second is right: `server.js:270` runs it as the `quiz_bank` boot seed, and
production's own `/api/health` reports the result, `{"ok":true,"inserted":0,
"updated":27}`. So merging IS what puts the banks live, and the stale comment is
fixed in this pass.

The other direction is worse than a wrong badge. The mount script wraps its
entire render in `if (r.status !== 404)`, so a page that mounts before its bank
exists shows NOTHING where the quiz used to be. Importing first would take
seventeen quizzes off the site until someone noticed.

So: merge, let Railway deploy and the boot seed converge, then import both
sheets. Between those two steps seventeen columns report `lock_enforceable: true`
while their pages still ship keys, which is a lie the gradebook tells for as long
as the gap lasts. Keep the gap short. It is the lesser of the two, because the
alternative is students staring at an empty page.
- **The banks and the sheet have to land together.** Seeding alone makes
  `lock_enforceable` read TRUE for seventeen columns while the page still renders
  its own questions, which is a worse lie than the current honest warning.
- 2.3, 4.1 and 3.5, above.
- Unit 2's scenario cards cite EK codes in student-visible text ("social
  engineering tactics (2.1.A), types of adversaries (2.1.B)"). Not introduced here
  and not touched here, but it is the rule this repo cares most about and those
  cards are preserved verbatim by the sheet.
