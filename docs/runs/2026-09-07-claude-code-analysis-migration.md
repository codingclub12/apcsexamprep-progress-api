# The 1.1 lab moves to the server, so its lock can be real

**Board:** 264. Follows 246, 256, 258 and 260, and answers the question Tanner
asked at the end of them: "Can we not update that html page so it does work?"

## What was actually wrong

He locked the 1.1 Lab column, opened the page as a signed-in student, and found
it open. Nothing was broken. That activity kept its four email specimens, its six
answer fields, its grader AND its answer key in the Shopify page body, so the
browser had all of it before any server code ran. No server-side lock can
withhold what the page already carries.

The gradebook knew. It drew that padlock tinted orange, meaning "cannot be
enforced", and said so in a hover tooltip nobody can read on a phone. That half
is board 260.

There was a second thing nobody had reported, found while scoping this:

    senderKey: ['g00gle','zero','0','00'],
    tactic: 'urgency',

The answer key was in View Source, live, for all four emails.

## What moved

    config/analysis/ap-cybersecurity-1.1-lab.json   the activity AND the key
    lib/analysis-spec.js                            load, validate, strip
    lib/analysis-grade.js                           the grader
    routes/analysis.js                              gated delivery and grading
    public/analysis-player.js                       the renderer
    shopify/ap-cyber-unit-1-lesson-1-lab.html       now a mount point

21,232 bytes of activity, grader and answer key left the page body. What stayed
is what a student reads: the intro, the badges, the scoring rubric, the progress
bar and the nav footer.

`forBrowser()` is the security boundary and works on a WHITELIST of what may go
out, not a blacklist of what must not, so a new field in a spec is withheld by
default rather than shipped by accident.

## Nothing was retyped

`scripts/extract-analysis-spec.js` PARSES the spec out of the authored page:
specimens, fields, dropdown options, the four length thresholds, the score bands
and every feedback sentence. `--check` re-derives it and refuses a hand edit.

That is not fastidiousness, it is what caught the first real problem.
`backup/ap-cyber-unit-1-lesson-1-lab.html` is STALE: its field 4 is "Attack
Classification" with phishing/spear/whaling options, and the live page long ago
replaced it with "Victim Impact Category" and the CED impact categories.
Extracting from the backup produced a spec whose specimen 4 answer was `bec`, a
value no dropdown offers, and the spec validator refused to load it. Without that
refusal the migration would have shipped a question no student could answer.

The fixture, `smoke/fixtures/ap-cyber-unit-1-lesson-1-lab.admin-body.html`, is
the real source: its answer object is byte-identical to the live page's, verified
by md5. The only difference anywhere in the activity is that Cloudflare rewrites
the From: and To: addresses on live into `[email protected]` placeholders, which
`scripts/fix-cyber-lab11-palette.js` had already recorded in August. Worth
knowing on its own: for a phishing lab whose first specimen turns on spotting
`g00gle.com`, an email obfuscator is not a neutral feature. Serving the specimens
as JSON from the API takes them out of its reach.

## The PII line

Four of the six fields are free text, so a student's prose now reaches the
server. It is graded in transit and discarded when the response is written:
never stored, never logged, never placed in an attempt's detail.
`detailForStorage()` returns per-field booleans and points only.

That is the contract graded code already runs under here, so it is **not** a new
PII exception. The sandbox exception covers work that is KEPT; nothing here is
kept. A mutation puts the submission back in the response and the suite goes red.

## The score does not move

The strongest check in this pass is `smoke:analysisparity`. It executes the
ORIGINAL page's own `checkEmail()` from the fixture under a stub DOM, runs
`lib/analysis-grade.js` over the same inputs, and requires the per-field points to
match. 600 generated submissions, all identical, and the run is required to have
exercised both full marks and zero so a case set that never scored could not
pass.

Three porting bugs would have moved a real student's grade and are now mutations:
a case-sensitive matcher, a dropped minimum-length rule, and a select scoring on
a loose match.

## Two of my own checks were hollow

- **The page-body refusal compared the output to itself.** It asserted
  `out.slice(0, head.length) === head`, which is true however wrong `head` is. My
  first cut started at the score bar, and the scoring rubric sits between the
  score bar and the first specimen, so that cut silently deleted the rubric and
  the check passed. `KEEP_MARKERS` plus a table-row count replaced it, and
  reintroducing the exact bug now fails with the rubric named.
- **The parity stub answered the wrong question.** `e1-feedback` matched the
  field-id pattern before the feedback branch, so the page wrote its score line
  into a value box and all 600 comparisons read `null`. A stub that silently
  answers the wrong question makes every case look broken rather than looking
  wrong.

## Evidence

- `smoke:analysisgate` 29/29, `smoke:analysisparity` 2/2 over 600 cases,
  `smoke:analysismutation` **73/73 across 14 mutations**
- `deploy-gates/2026-09-07-analysis-migration.json` passes `--pre` with THREE
  kinds agreeing: suite, rederive, mutation
- The sheet parses back byte-identical (38381) and the Matrixify preflight says
  clear to import, with 1 emoji carried through and none added

## Still open

- **The page half needs a human import.** Until that sheet lands, the API serves
  the activity correctly and the page still carries the old copy, so nothing is
  locked and the key is still in View Source. `verify-analysis-live.js` checks
  both halves separately and says which one is behind.
  The preflight needs the original body for its emoji round trip:
  `node -e "const f=require('fs');f.writeFileSync('/tmp/carrying.json',JSON.stringify({'ap-cyber-unit-1-lesson-1-lab':f.readFileSync('smoke/fixtures/ap-cyber-unit-1-lesson-1-lab.admin-body.html','utf8')}))"`
- **Five more cyber activity pages are this shape**, by a textarea count over the
  local backups. Doing them one at a time is the wrong move: the second one
  should turn this into canonical data plus a generator plus a validator plus a
  sheet, which is the pattern the repo already uses for a page set.
- **Two fields both report as "Impact:"** in the feedback, because two fields are
  named that in the authored page. Carried across unchanged on purpose: a
  migration that also edits copy cannot be verified as a migration.
- Board 264 goes to `needs_verification`. The check is Tanner's original one:
  lock the 1.1 Lab, open it in a private window, and fail to reach it.
