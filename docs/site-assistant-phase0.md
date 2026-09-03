# Site assistant, Phase 0: problem reports

Ships the half of `docs/site-assistant-spec.md` that needs no model. Nothing here
calls an LLM, stores a transcript, or costs a token.

## What it is

A "report a problem with this page" affordance, and the endpoint behind it. It
turns a support email that says "the quiz is broken" into a record that names the
page, the browser, and the errors the page actually threw, filed on the command
board and mailed to the owner.

```
GET  /apcs-report.js                  the affordance (Shadow DOM, no build step)
GET  /api/assistant/report/context    what the form may offer this caller
POST /api/assistant/report            file one
```

## The rule that shapes everything else

`CLAUDE.md` permits exactly one table of free text a student typed
(`sandbox_programs`) and lists the bounds that made that exception grantable. A
public report form on lesson pages is the obvious way a second exception arrives
by accident, so it does not.

- A **student** never has typed text stored. The form does not even render a text
  box for them.
- An **anonymous caller on a coursework page** is treated as a student. A
  signed-out minor on a lesson page is the likely case, and guessing the other
  way stores text typed by a child.
- **Teachers**, and anonymous callers on commerce and general pages, are adults.
  Their text is stored.

What survives for everyone is the category, the page, the browser, and the
console output, which is the part that reproduces the bug anyway.

`chat_escalations.bodies_retained` records which of those happened, so the
posture of a row is readable from the row rather than re-derived by whoever
reads it next.

## Why the form asks the server first

`GET /api/assistant/report/context` returns the category list and `textStored`
for this caller on this page, and the widget renders from that. Someone whose
words will not be kept is told so **before** they type, not after they submit.
Inviting a child to describe their problem and then silently discarding the
description is worse behaviour than not offering the box, even though the
privacy outcome is identical.

## Identity and scope are server-side, always

Role comes from the bearer token, and a teacher's contact details are read from
the `teachers` row rather than from the token, because a token carries whatever
was true when it was signed. Page scope is derived from the URL by
`lib/assistant/scope.js`, which calls the same `trailingActivity` the grading
path uses, so a page that grades as a quiz is an assessment page here too.

Nothing about who the caller is, or what kind of page they are on, comes from the
request body. The suite asserts this directly by sending a payload that lies
about all of it.

## Abuse and cost

A public write endpoint on a 1 vCPU / 1 GB box.

- Per IP: 5 reports per 15 minutes, tunable by env. Refused requests count.
- Per day: 500 rows. Per-IP does nothing against a distributed flood, so this is
  the disk guard.
- Per day: 25 **new board tasks**, a far lower ceiling, because the board is a
  human's working surface and it is the thing that actually degrades when it
  fills with junk. Past that, reports are still stored and still mailed; they
  just stop opening tasks.
- Every string is truncated at the edge before it reaches the database.
- Board tasks dedupe on a fingerprint of page, category and error shape, so one
  broken page reported by a whole class is one task that ages rather than thirty
  that arrive. A genuinely different failure on the same page still opens its
  own.
- **One email per distinct failure.** A report that dedupes onto an existing task
  sends no mail, because the owner has already been told. Thirty students on one
  broken page is one message.
- The escalation email subject is stripped of control characters, since the page
  URL in it is caller-supplied.

Stored report text reaches the command console, which escapes it
(`public/command.html`), so a report cannot inject markup into the admin view.

### Known gap

Section 8 of the spec calls for a 90 day retention sweep on stored bodies. That
sweep is **not** built here. It matters less than it sounds, because the rows
that could contain text typed by a minor do not exist: students and anonymous
callers on coursework pages store none. What ages without a sweep is text typed
by teachers and pre-sale visitors. Deleting rows on a schedule against the live
database deserves its own pass rather than a boot-time side effect bolted onto
this one.

## Deploying it

The endpoint works with nothing configured: reports are stored and filed on the
board either way. Mail is the part that needs config.

| Env | Effect if unset |
| --- | --- |
| `RESEND_API_KEY` | `lib/mailer.js` logs the mail instead of sending it |
| `ASSISTANT_ALERT_EMAIL` | falls back to `COMMAND_OWNER_EMAIL`; with neither, no mail |

**`RESEND_API_KEY` is set, and the whole reset path works.** Verified in
production on 2026-09-03 by Tanner, end to end and not just at the send: request
a reset, receive the email, open the link, set a new password, sign in with it.
That exercises every part that could have been broken independently, since
`mintResetLink`, the delivery, and the single-use consume in
`POST /api/teacher/reset-password` each fail in their own way. Separately,
production answers `mail_configured: true`, which is readable any time without
mailing a real person by probing an address that has no account.

This was the Phase 0 prerequisite from the spec, and it retires the
password-reset support cluster: three manual resets in three days, caused by
reset links reaching the Railway log instead of an inbox. Board task 127 covers
that work and is the item this evidence closes.

What remains is the **recipient**. Mail sending and having somewhere to send are
two different facts, and either one alone means an escalation is recorded and
never seen. So `/api/health` reports both:

```json
"assistant": { "mail_configured": true, "recipient_set": true, "can_notify": true }
```

Booleans only, no addresses. This block exists for the same reason `integrity`,
`reporters` and `seed` do: without it the failure is silent by construction. A
report with no recipient is stored, filed on the board, and then quietly never
mailed, with nothing anywhere saying so. Check `can_notify` after deploying; if
it is false, set `ASSISTANT_ALERT_EMAIL`.

## The theme side

One tag, on lessons, labs, hubs, commerce, the portal and the 404. **Not** on
quiz, exam or practice-test templates: the tag must be absent there, not
disabled, so a page next to a graded item has no endpoint to reach from. The
widget also refuses to render on an assessment URL, as a second line of defence
for a mis-templated page.

```html
<script src="https://progress.apcsexamprep.com/apcs-report.js" defer></script>
```

Optional, and worth it, in `<head>` ahead of everything else:

```html
<script>window.APCS_ERRORS=[];addEventListener('error',function(e){
if(window.APCS_ERRORS.length<10)window.APCS_ERRORS.push((e.message||'error')
+' @ '+(e.filename||'')+':'+(e.lineno||0));},true);</script>
```

A script tag cannot catch an error that fired while it was still downloading.
Verified in a browser: a page that throws 10 ms after parse reports an empty
console to a widget still in flight, and reports the real error once the stub is
present. On a page that is broken on load, that is the only error worth having.

Per `CLAUDE.md`, the theme's published branch is
`claude/site-linking-audit-yhufjk`, not `main`.

## Tests

`npm run smoke:assistantreport`, 92 assertions, offline and secret-free. It pins
the privacy rule from three directions (as a student, as an anonymous caller on a
lesson page, and as a client that lies about its role), plus the closed category
set, truncation, dedupe, the per-IP brake, and that the served widget is pure
ASCII and contains no path that reads page content.

## What Phase 0 is not

No chat, no model, no knowledge base, no read tools, no transcripts. Those are
Phases 0.5 through 4 in `docs/site-assistant-spec.md`. `chat_escalations` is
created now with the column names the later phases use, so they add rows rather
than a second table.
