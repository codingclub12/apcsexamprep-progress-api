# Restoring self-study, and the guard that would have saved it

Date: 2026-08-22
Agent: Claude Code
Board: #112
Follows: docs/runs/2026-08-22-claude-code-self-study-signin-audit.md (PR #284)

The audit found that the 2026-08-22 import of `shopify/join.html` deleted the
self-study half of `/pages/join`, and that no revision of that file had ever
contained it. This is the repair, the two smaller live defects found while doing
it, and the check that stops the next import doing the same thing.

## What went back on the page

Restored into the current multi-course `join.html` from
`shopify/page-snapshots/join.2026-08-22.before-multi-course.html`:

- the Self-Study tab, `#step-solo`, `completeSolo()` and `POST /api/student/solo-init`
- the personal-code box, `copyCode()`, and the warning that a lost ME- code
  cannot be recovered because these accounts have no email
- the ME- branch in `doLogin()`, which is the difference between a self-study
  student signing in and being told their name is not in the class
- `?mode=solo`, the login placeholder and the hint that the name is optional
  for a personal code
- the signed-in banner reading "Self-study - Your code ME-XXXX"
- `continueCourseBtn` and `COURSE_HOME`, which the same import also deleted
- `_show()` and `_hide()`, which turn out to be load-bearing (below)

The multi-course work is untouched: `addClass`, `/enroll`, `name_pin_taken` and
`signInAndAdd` are all still there, and the two features now sit on one page.

## Two live defects nobody had reported yet

Both are the same deleted pair of helpers, and both are why "the sign in is
acting unusual" was a fair description of a page whose sign-in code was correct.

`.apjoin-error`, `.apjoin-class-preview` and `.apjoin-logged` are each declared
`display:none!important` in the page's own stylesheet. The imported file showed
them with `el.style.display = 'block'`, an inline style with no priority, which
loses to `!important` in the cascade. The snapshot used `_show()`, which sets it
WITH priority. So on the live page since the import:

1. **No error message could ever appear.** Wrong PIN, wrong name, class not
   found, connection failure: `showError()` set the text and then failed to
   reveal the box. A student typing a wrong PIN saw the button say "Signing
   in...", return to "Sign In", and nothing else. Silence, not an error.
2. **The signed-in panel could never appear**, and neither could the class
   preview that confirms which class a code belongs to.

Everything now goes through the helpers. `grep 'style.display' shopify/join.html`
returns nothing.

## The guard

`scripts/page-body-csv.js` gets a fifth check, and it is the one the other four
imply but none of them makes. They ask whether the handle exists, whether the
title matches, and whether the live body ALREADY matches the file. None asks what
the live body has that the file does not, which is the only question that decides
whether replacing a body destroys anything. Byte diffing cannot answer it: every
import differs from the live body by design.

`contentLoss()` compares three inventories, chosen because they are what a page
is made of and what a reviewer actually misses: element ids, the script's own
function names, and the API paths it calls. Anything present live and absent in
the file stops the build and is named. A deliberate removal still passes, but it
has to say so with `--accept-loss` instead of happening in silence.

EVIDENCE, by replay rather than assertion. The pre-import snapshot was turned
into a live dump and the file that actually shipped was run against it:

```
join: this import would DELETE 17 thing(s) the live page has and
shopify/join.html does not (element id continueCourseBtn, element id step-solo,
element id soloName, element id sp1 ... function _show, and 5 more).
exit=1, no file written
```

That is the import of 2026-08-22, refused. The restored file against the same
live body reports no loss and builds the sheet.

`smoke/page-import-guard.js` is new: 18 assertions. Three prove the mechanism on
a synthetic pair, two prove it does not fire when an import only ADDS (a guard
that cries wolf gets switched off, which is how this happened), and the rest lock
the real content in place. The last group runs the committed snapshot against the
current `join.html` on every CI run, so if self-study leaves that file again it
fails in CI rather than on a live page.

## Finding 5 got a route instead of a guess

`GET /api/admin/identity-collisions`, behind the existing fail-closed admin auth.
The audit could not settle whether two students had already been merged into one
account, because that needs a database read. This answers it without reading a
single name: bucket counts, a `multi_course` count, and a `clear` boolean.

Proven locally against a seeded collision rather than an empty table: with two
pre-accounts students sharing a name and two accounts sharing a `name_key`, it
returns `clear:false` with both buckets at 2 and no name anywhere in the payload.
403 with no key and with a wrong key.

Note what it does and does not claim. A shared name is not a collision; two
students called Avery M. with different PINs are two accounts and always were,
which is why `name_key` is deliberately not unique. Only a shared name AND a
shared PIN merges them, and confirming that needs the PIN. So the route reports
the EXPOSURE, and `clear:true` is the real all-clear: no name is shared by two
accounts and no unlinked row shares one either, so no PIN comparison can put two
students together. If it comes back false, the merge itself is a per-bucket
question and unlinking is a data repair for a human.

## Evidence

- Full offline suite: 97 of 97 green, including the new one.
- The sheet was parsed back and each Body HTML cell compared to its file:
  33,556 and 33,691 chars, byte-identical, md5 `7ecba22db5fe` and `730bd5e9a144`.
  Nothing was retyped, so nothing can have been mistyped.
- Both pages pass all five guards against a live dump pulled today.
- `my-progress.html` differs from its live body by exactly one edit, the `solo`
  entry in `formatCourse`. The other 17 diff lines are Shopify's entity decoding
  and normalise away.

## Still open

The sheet is built but NOT imported. Matrixify takes a file and a human, and the
Admin API token in Railway still answers 401, so shipping is Tanner's step:

```
node scripts/live-pages-dump.js /tmp/live.json "join=Join a Class" "my-progress=My Progress"
node scripts/page-body-csv.js /tmp/pages.csv --only join,my-progress --live /tmp/live.json
```

Re-run the dump immediately before importing rather than reusing today's: the
guard is only as current as the dump it is given.

Nothing here changes the API's behaviour for existing students. `solo-init` and
`solo-login` were live and correct throughout; only the page that called them was
missing.
