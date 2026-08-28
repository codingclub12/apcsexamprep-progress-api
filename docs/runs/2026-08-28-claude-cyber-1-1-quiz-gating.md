# AP Cyber 1.1 quiz "greyed out" for a live class: what it actually is

> **RESOLVED.** A screenshot settled it: the box read "This quiz could not be
> loaded." That is the error branch, not the lock branch, and the cause was in
> this repo. `optionalStudent` answered 401 to any bad credential on the RENDER
> path, and `apcs-quiz-mount.js` prints that banner for any non-200. The quiz
> therefore failed for people who HAD signed in and worked for everyone who had
> not. Because the mount reads `apcse_teacher_token` first, every signed-in
> teacher previewing a quiz hit it every time. Fixed below. Sections 1 and 2 are
> kept because ruling them out is what located the real bug.

Reported by Peter Vo (Klein Cain HS, Klein ISD) on 2026-08-28: students finished
Exercise 1 and Exercise 2 on Lesson 1.1, but the Quiz is still greyed out.

## The finding, first

**The quiz gate has no dependency on exercise completion. None. Anywhere.**

Nothing in `lib/activity-gate.js`, `routes/quiz.js`, the lesson page, or the quiz
page reads exercise progress to decide whether the quiz opens. So "the completion
posts are not landing, therefore the gate never opens" cannot be the cause,
because there is no such gate to leave closed. That theory was the most expensive
part of the ticket and it was ruled out by reading one function.

What is real is a structural asymmetry that produces this exact symptom:

`DEFAULT_GATED` in `lib/activity-gate.js` is `{quiz, exam}`. A class whose
`quiz_lock_default` is `1` therefore leaves exercises and labs open and closes
only the quiz. Verified directly:

```
exercise-1  {"open":true,"reason":"class-default-not-gated-type"}
exercise-2  {"open":true,"reason":"class-default-not-gated-type"}
lab         {"open":true,"reason":"class-default-not-gated-type"}
quiz        {"open":false,"reason":"class-default-locked"}
exam        {"open":false,"reason":"class-default-locked"}
```

"Exercises work, quiz is locked" is not a broken reporter. It is what a locked
class is supposed to look like.

## Second mechanism, same symptom, different cause

The 1.1 quiz has been migrated onto the server render path, so its questions are
fetched from `progress.apcsexamprep.com` at page load. The exercises have not:

- `GET /api/quiz/ap-cybersecurity/unit-1/1.1/quiz` -> 200, `locked:false`, 5 questions
- `GET /api/quiz/ap-cybersecurity/unit-1/1.1/exercise-1` -> 404, not in the bank
- the live Exercise 1 page carries **zero** `data-apcs-quiz` mounts; its widgets
  are entirely page-baked and never touch the API

So the quiz is the only one of the three that needs the API to render at all. Any
network path that cannot reach that host produces the same report: exercises
complete normally, quiz never appears. The Chromebook-filtering theory survives,
but not for the reason it was proposed. It is not the completion posts. It is the
questions.

## Telling them apart in one question

The three candidates print different text into the mount container
(`apcs-quiz-mount.js`):

| what the student sees | cause |
|---|---|
| "This quiz is not open yet. Your teacher opens it when the class is ready." | teacher gate: `quiz_lock_default=1` or a closed `activity_gates` row |
| "Please reload the page. If it keeps happening, tell your teacher." | the API was unreachable or timed out (12s) |
| an empty box, no message at all | a 404: no bank rows for that location |

Asking Peter which of those three his students see resolves it immediately. This
is cheaper than any amount of further code reading.

Ruled out separately: **not being signed in does not lock the quiz.** An
anonymous caller gets `locked:false` and the full question set, because a student
with no class is self-study and self-study is never gated. A signed-out class
would see an *open* quiz that silently records nothing, which is a different and
quieter problem.

## What was built

`GET /api/admin/class/:id/gates` (`routes/admin.js`), behind the existing
fail-closed admin auth. The whole reason this ticket cost an afternoon is that
the only gate listing in the codebase was `GET /api/teacher/classes/:code/gates`,
which needs the reporting teacher's own login. There was no way to answer "is
this class's quiz locked?" without opening the database.

It calls `resolveGate`, the same function the render and submit paths call,
rather than reimplementing the rule. Same posture as
`/api/admin/class/:id/gradebook/as-teacher`: an operator view that reimplements a
rule is one that eventually disagrees with what students get, silently.

Returns the class's `quiz_lock_default`, every activity that exists in
`quiz_bank` for the course, and per activity `{open, reason, explicit_row}`, with
the closed ones pulled out into `closed_activities` so the answer is readable
without scanning the list.

`smoke/admin-gates.js`, 25 assertions, offline and secret-free, registered as
`npm run smoke:admingates` so CI derives it from package.json with no workflow
edit. The first assertions pin the symptom shape itself (locked class keeps
exercises open, closes quizzes), and the operator view is cross-checked against
what `routes/quiz.js` actually serves the student rather than asserted twice.

## Also found, not fixed here

1. **Question counts on the quiz pages are wrong.** The 1.1 quiz page tells
   students "9 questions, about 15 minutes"; the bank holds 5 and serves 5. The
   1.2 page says 12; the bank holds 5. Pages for 1.3, 1.4 and 1.5 state no count.
   This is Shopify page body copy, so it ships as a Matrixify sheet, not from
   here.
2. **A 404 renders nothing at all.** In `apcs-quiz-mount.js` the entire render is
   inside `if (r.status !== 404)`, so an unseeded location leaves a silent empty
   box with no explanation. That fallback is deliberate for pages that still have
   baked questions underneath, but the migrated quiz pages have nothing
   underneath, so there the student just sees a gap. The mount is served from
   Shopify Files, so changing it is a theme-side action.
3. **The Unit 1 exam is not in the bank.**
   `GET /api/quiz/ap-cybersecurity/unit-1/unit-1/exam` 404s. If its page carries
   a mount, it is showing the silent empty box from (2). Worth checking before
   any class reaches it.

## Evidence

All five Unit 1 quizzes are seeded and currently open to an unauthenticated
caller, `total=5 pool=5` each. Health at commit `3e64bb8`. Gate resolution table
above produced by running `lib/activity-gate.js` directly.

## The actual cause

The reported box read **"This quiz could not be loaded. Please reload the page."**
That is `renderError`, reached when the fetch rejects or the response is not 200.
Everything environmental was ruled out from here first:

- CORS correct on both `www` and apex origins, including the `OPTIONS` preflight
  (the mount sets `Content-Type: application/json` on a GET, so one is always sent)
- 8/8 requests, 0.28s to 0.61s, nowhere near the mount's 12s timeout
- `trust proxy` set, and the render path carries no rate limit at all

Then the middleware:

```js
function optionalStudent(req, res, next) {
  ...
  if (payload.role !== 'student') throw new Error('not a student token');
  if (!student) return res.status(401).json({ error: 'Student not found' });
  ...
  catch (e) { return res.status(401).json({ error: 'Invalid or expired student session' }); }
}
```

It is not optional about a bad token, and it guarded the render path. Confirmed
against production:

```
no token                -> HTTP 200, questions served
stale/garbage token     -> HTTP 401 {"error":"Invalid or expired student session"}
```

So a signed-out visitor got the quiz and a signed-in one got the error banner.
And the mount reads the teacher key first:

```js
var t = localStorage.getItem(TEACHER_TOKEN_KEY);   // apcse_teacher_token
return t || localStorage.getItem(STUDENT_TOKEN_KEY);
```

A teacher token fails the `role !== 'student'` check, so **every signed-in
teacher previewing any quiz got this error, every time, on every network.** That
is almost certainly the screenshot, and it is what Peter would hit the moment he
checked the quiz himself.

Student tokens last 180d, so expiry is not yet the common trigger for students;
a deleted or re-created student row hits the same 401.

## The fix

`routes/quiz.js` now has two middlewares instead of one, which is what the
original comment's reasoning actually implied:

- `optionalStudent` (unchanged, **strict**) still guards `POST /submit`.
  Tolerating a bad token there would score a student's work as anonymous and
  lose it from the gradebook, which is worse than an honest error.
- `renderStudent` (**tolerant**) guards the GET. A bad, expired, or wrong-role
  token degrades to anonymous self-study.

Safe on this route specifically because the render releases no key and
attributes nothing: it returns exactly what a signed-out visitor already gets.
The class gate is untouched, because a VALID student token still resolves it, so
a locked class stays locked. A bad token lands where a signed-out browser already
landed, which is where clearing site data has always led.

Covered by 11 new assertions in `smoke/admin-gates.js`, including the two guards
that matter: a locked class still locks a valid student and still withholds the
questions, and submit still rejects a malformed token and a deleted student. All
138 offline suites pass.

## Still open

Nothing on the cause. Worth confirming after deploy that Peter's students can
open the quiz, and the three defects above still belong to the theme and
page-copy pipelines.
