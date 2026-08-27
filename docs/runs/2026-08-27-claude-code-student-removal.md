# "I can't remove a student from the course"

2026-08-27, Claude Code. A teacher reported that removing a student from their
class does not work. Every layer disagreed with them. The `DELETE` returned 200,
the database row read `active = 0`, and the student really could no longer sign
in. The teacher was right anyway, because the only thing a teacher can see is
the roster, and the roster never changed.

## What was actually happening

The removal was real everywhere except the one place it had to be visible.

| Layer | Behaviour | Verdict |
|---|---|---|
| `DELETE /classes/:code/students/:id` | sets `active = 0`, keeps every score | correct, and deliberate |
| `POST /api/student/login` | refuses a deactivated student, 403 | correct |
| `GET /classes/:code/progress` | returns EVERY student row, active or not | correct, see below |
| `cyber-dashboard.html` `buildModel()` | passed every row straight through | **the defect** |

`buildModel` mapped `resp.summary` into the model and did not carry `active` at
all, so a removed student rendered identically to an active one: same grid row,
same entry in the student picker, same report tab, same Remove button. The
teacher clicked Remove, the page reloaded, and the student was still sitting
there. Clicking again did the same thing again.

The confirm dialog then made it considerably worse. It said:

> This permanently deletes their progress and cannot be undone.

The server does not do that and must not: attempt history is gradebook data.
A teacher who read that sentence, clicked OK, and then saw the student still on
the roster had every reason to conclude the delete had failed.

## Why the server was not the thing to fix

The obvious patch is `WHERE active = 1` on the progress query, and it is wrong.
Drop the row server-side and a mis-clicked student is unreachable forever: there
is no roster entry left to click, so `PATCH {active:true}` can never be reached
from the UI, and the DELETE route's own comment pointing at that reactivation
path becomes a lie. The payload is the only place the removed student still
exists for the client, so it has to keep carrying them.

That makes this a rendering defect, and the fix belongs in the view.

## The fix

`buildModel` now splits one list into two:

```js
const roster=(resp.summary||[]).map(rec=>({ ..., active:rec.student.active!==0, ... }));
const students=roster.filter(s=>s.active), removed=roster.filter(s=>!s.active);
```

Everything downstream already reads `model.students`, so one filter takes the
removed student out of all of it at once: the grid, the stat cards, the header
count, the student picker, the report tab and the gradebook CSV. Nothing else
needed changing to make the button work.

`model.removed` is what a hard delete could never have offered. Settings grows a
Removed students section listing them with a Restore button, which `PATCH`es
`{active:true}`. Nothing is recovered there because nothing was destroyed.

The dialog now says what the server does, and names the way back:

> They can no longer sign in, and they come off the gradebook, the grid and
> every export. Their scores are kept, and you can restore them from Settings.

After a successful removal the page lands on Overview rather than staying on the
By Student tab, whose index now belongs to a different student.

## Evidence

`smoke/student-removal.js`, 37 checks, registered as `npm run smoke:removal` so
`tests.yml` picks it up with no workflow edit. Two halves:

- **Server**, real routes against a temp database: the row survives with
  `active = 0`, its `progress`, `score_events` and `attempts` rows all survive,
  sign-in is refused for the removed student and still works for the one who
  stayed, the row is still sent with `active: 0`, and `PATCH {active:true}`
  restores both the row and sign-in.
- **Page**, the shipped file's own `buildModel` run in a `vm` with a stub DOM,
  fed the payload the real API just produced rather than a hand-written one: the
  removed student is gone from `model.students`, present in `model.removed` with
  their detail intact, absent from the gradebook CSV, and back on the roster
  after a restore.

Checked against the unfixed file, the suite fails on exactly the teacher's
complaint: `the removed student is gone from model.students
["Ada Analyst","Grace Grader"]`.

All 130 offline suites pass, run the way `tests.yml` runs them.

## What is still open

**The fix is merged and the API is deployed, but the page is not.** The Railway
deploy needed a manual redeploy (see below) and now serves `6f9b051`. That ships
the API and nothing else: `server.js` only serves from `public/`, so
`shopify/cyber-dashboard.html` reaches the storefront ONLY through a Matrixify
Pages import, which is a human step. Confirmed against the live page after the
deploy: `permanently deletes their progress` is still there and none of the fix
markers are.

The sheet was generated with a real live dump, pulled from the Admin API:

```
node scripts/page-body-csv.js out.csv --only cyber-dashboard --live pages.json
```

All five guards passed, including the content-loss check. Worth recording why
that check was clean: the live body and the repo mirror differed by exactly four
lines before the fix, and all four are entity decodings Shopify does on store
(`&#9662;` to the character, `&ndash;` to the dash), which is the behaviour the
script's own header documents. The mirror was otherwise byte-identical to live,
so the import changes this fix and nothing else. If a future sheet shows any
OTHER difference, somebody edited the live page by hand and the import would
clobber it.

**Only the cyber dashboard was fixed.** `/pages/cyber-dashboard` is the teacher
dashboard for every course, so this covers the reported case, but the same
`active`-blind pattern is worth a look anywhere else a roster is rendered.

**Railway deploys were stalled for about ten hours, and the safety net hid it.**
Board task #133. `/api/health` was serving `b7a31f8` (PR #364, 00:39 UTC) while
main had moved twice; PR #365 merged at 01:09 UTC and never deployed. Three
things lined up: Railway's GitHub integration stalled, `deploy-drift.yml`
correctly alarmed at 05:18 UTC into an empty room, and `railway-deploy.yml`,
written to auto-fix exactly this, reported GREEN in eleven seconds with its
`Install the Railway CLI`, `Deploy` and `Confirm the new commit is serving`
steps all SKIPPED, because `RAILWAY_TOKEN` was never set. Tanner cleared it with
a manual redeploy. The cause stands: until the token and `RAILWAY_SERVICE` exist,
every merge will keep showing a green deploy check that deployed nothing.

## What this taught

A write that succeeds everywhere except on screen is indistinguishable from a
write that failed, and the user is the one who is right about it. Three layers
of correct behaviour did not add up to a working feature, and the bug report
that sounded like a broken endpoint was a missing `filter`.

The dialog copy was the second half of the defect, not a cosmetic footnote. It
told the teacher to expect a permanent delete, so when the roster did not change
the only available conclusion was failure. Copy that overstates what the server
does turns a visual bug into a trust problem.
