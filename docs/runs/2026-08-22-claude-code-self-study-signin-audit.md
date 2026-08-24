# Self-study sign-in audit

Date: 2026-08-22
Agent: Claude Code
Trigger: "The student self-study is gone. The sign in is acting unusual."
Scope: audit only. Nothing was changed on the storefront or in the API by this
pass; the findings below are ordered by what a student loses.

## What happened, in one line

`/pages/join` was overwritten on 2026-08-22 with `shopify/join.html`, and that
file has never contained the self-study half of the page. The self-study tab
existed only on the live page, so the import deleted it.

## Evidence

The live page was fetched and its body recovered with the repo's own
`scripts/extract-live-body.js`, the same recovery that was used to prove the
import safe before it ran:

    GET https://www.apcsexamprep.com/pages/join   200, 368,862 bytes rendered
    recovered body                                25,024 bytes
    shopify/join.html                             25,042 bytes

`diff` between the two is SEVEN lines, and every one of them is Shopify's own
entity decoding on import (`&rarr;` stored as the character, one collapsed
`</div>`, trailing newline). No content difference. The live page IS the repo
file. Grepped against the recovered body:

    self-study / switchTab('solo') / solo-init      0 hits
    "ME-"                                           0 hits
    addClass / student/enroll / name_pin_taken      3 hits  (the new multi-course code)

And against `shopify/page-snapshots/join.2026-08-22.before-multi-course.html`,
the snapshot of the live body taken minutes before the import:

    a third tab, `switchTab('solo')`, labelled Self-Study
    `#step-solo` with its own name + PIN form and `completeSolo()`
    POST /api/student/solo-init, the ME- code reveal box and the copy button
    `?mode=solo` deep link handling
    login placeholder "CYBER-XXXX or ME-XXXX" and the hint about blank names
    `isSolo = code.startsWith('ME-')` routing sign-in to /api/student/solo-login
    the logged-in banner reading "Self-study - Your code ME-XXXX"

File history says the same thing from the other side. `git log --follow
shopify/join.html` reaches back to 8e2a7f9 and NO revision of that file has ever
contained the string `solo`. The self-study tab was authored in the Shopify
admin, never in this repo, so the repo copy was not a stale version of the live
page: it was a different page that happened to share a handle.

## Why the guards passed

`scripts/page-body-csv.js` ran with a live dump and all four checks were green.
They are the wrong four for this failure. The checks ask: does the handle exist,
does the title match, and does the live body ALREADY match the file. The third
one is a no-op guard: it drops a page that needs no import. Nothing in that
script asks the question that mattered here, which is what the live body
contains that the file does not. A body-replacing import with no content-loss
check will delete hand-authored live work every time, silently, and the operator
sees four green checks while it happens.

## Findings

### 1. Self-study account creation is unreachable (student-facing, live)

There is no longer any path on the site to create an account without a teacher's
class code. The Join tab demands a class code; the Return Student tab demands a
class code. The theme's global nav offers "Create Account" (`/pages/join#create`)
in the desktop dropdown, the mobile menu and the account menu, and it lands on
"Join Your Class".

The marketing copy still sells the thing that no longer exists: the CSA hub says
"A full year-long AP CSA curriculum and free self-study course".

The API is untouched and fine. `POST /api/student/solo-init` and
`POST /api/student/solo-login` are both live in `routes/student.js`, rate
limited, and account-linked. Only the page that called them is gone.

### 2. Existing ME- students cannot sign in (student-facing, live)

This is the "acting unusual" half, and it hits students who already have
accounts.

The old page branched on the code: `ME-` went to `/api/student/solo-login` with
`{ login_code, pin }`, and the name field was explicitly optional for that
branch. The new page has no branch. Every sign-in posts `{ class_code,
display_name, pin }` to `/api/student/login`, and the client refuses to submit
without a name.

A ME- code does reach `/api/student/login`, because that route looks up
`classes WHERE class_code = ?` with no course filter and a solo class row is a
class row. It then fails on the name:

    SELECT * FROM students WHERE class_id = ? AND lower(display_name) = lower(?)
    -> 401 "Name not found in this class"

A self-study student was never told their display name was a sign-in credential;
under the old page it was not one. Worse, `solo-init` defaults a blank name to
the literal string `Student`, so every student who skipped the optional name
field now needs to guess `Student` to get in. The failure presents as a wrong
name or a wrong PIN, which is why it reads as unusual rather than as broken.

### 3. `solo` renders as the course name (cosmetic, live, both pages)

`formatCourse()` in `shopify/join.html` maps three courses and
`shopify/my-progress.html` maps four; neither maps `solo`, and both fall through
to returning the input. The old page special-cased it to "Self-study - Your code
ME-XXXX". A self-study student who still holds a session sees "Class ME-4KP2 -
solo". `my-progress.html` has no solo handling at all and never did.

### 4. `#create` and `#signin` have never been honoured (pre-existing)

The nav links to `/pages/join#create` and `/pages/join#signin` from six places.
No revision of the join page, live or repo, old or new, reads `location.hash`.
The old page read `?mode=solo` only. Both links land on the default tab. This
predates the import, but it is why "Create Account" in the nav has always been
the wrong door and is now a dead end.

### 5. Sign-in can merge two students into one account (data risk, not yet observed)

Not caused by the import. Found while reading the sign-in path around it, and it
is the one finding here with a blast radius beyond a single student.

`lib/student-accounts.js` makes (name, PIN) an identity. `POST /api/student/join`
refuses a pair that is already taken, which closes the door going forward. It
does not close the door behind. Every row written before `student_accounts`
existed has `account_id NULL`, and `ensureAccountForStudent()` links it on the
owner's next sign-in by calling `findAccountByNameAndPin(display_name, pin)`. If
two DIFFERENT students already share a name and a PIN, which nothing prevented
before this shipped, the second one to sign in is linked into the first one's
account. From that moment `GET /api/student/enrollments` lists the other
student's classes and `POST /api/student/switch` will mint a token for one,
because switch trusts account membership and asks for no PIN. Each has read
access to the other's progress and can write attempts as them.

The concentration risk is the self-study default name: every student who left
the field blank is stored as `Student`, so `name_key` is `student` for all of
them and only the 4 PIN digits separate them.

`MAX_PIN_CANDIDATES = 8` bounds the bcrypt cost and is right for that, but it
also bounds correctness. Beyond eight accounts sharing a name the collision
check and the link lookup both stop early, ordered by `last_active`, so whether
two students collide depends on who signed in recently. For `name_key = student`
that ordering is doing real work.

No merged account was observed. This is a read of the code, not an incident.
Confirming it needs a query the read-only board token cannot make:

    SELECT name_key, COUNT(*) FROM student_accounts GROUP BY name_key HAVING COUNT(*) > 1;
    SELECT lower(display_name), COUNT(*) FROM students WHERE account_id IS NULL
      GROUP BY 1 HAVING COUNT(*) > 1;

### 6. Two unescaped names in innerHTML (hygiene)

`completeJoin()` writes `d.class.name` and `d.student.name` into `innerHTML`
without `esc()`, where `doLogin()` escapes both. Not exploitable today:
`sanitize()` in `utils.js` strips tag characters from student names on the way
in. It is one edit away from mattering and the escape function is already there.

## What I would fix, in order

1. Restore self-study to `shopify/join.html`. Port the third tab, `completeSolo`,
   the ME- branch in `doLogin`, the `?mode=solo` deep link and the solo banner
   from the committed snapshot into the current multi-course page, then ship it
   through `page-body-csv.js` the way this repo ships pages. The API needs no
   change.
2. While that page is open: map `solo` in both `formatCourse()` tables, honour
   `#create` and `#signin`, and escape the two names in `completeJoin()`.
3. Add the missing guard to `scripts/page-body-csv.js`. Given a live dump, a page
   whose live body contains an id, a function name or a fetch path that the file
   does not should stop the build and name what would be deleted. The check the
   script needs is not "do these differ" but "does this import LOSE anything".
4. Answer finding 5 with the two queries above before deciding anything. If the
   count is zero, add a uniqueness constraint on the pair going forward and move
   on. If it is not zero, unlinking is a data repair and needs a human.

## Still open

Nothing here is fixed. Finding 1 and finding 2 are live and student-facing right
now: self-study cannot be created and existing ME- students cannot sign in.
