# Site assistant Phase 0: problem reports

**Ask:** start building Phase 0 of `docs/site-assistant-spec.md`.

**Outcome:** shipped. `POST /api/assistant/report`, the context endpoint the form
reads first, and the affordance itself at `/apcs-report.js`. No model, no chat,
no transcripts, no token spend.

## What changed

| File | Why |
| --- | --- |
| `db.js` | `chat_escalations` plus three indexes. `session_id` nullable, because a Phase 0 report has no chat session and a synthetic one would be a fake row every later reader has to learn to ignore |
| `lib/assistant/scope.js` | URL to page scope, and the retention rule. Calls `utils.trailingActivity` rather than reimplementing it |
| `lib/assistant/report.js` | Store, file on the board, mail. Caps, dedupe, ceilings |
| `routes/assistant.js` | The three routes. Root mounted, like `routes/practice.js`, because it owns two namespaces |
| `public/apcs-report.js` | The affordance. Shadow DOM, pure ASCII, no build step |
| `smoke/assistant-report.js` | 86 assertions, offline and secret-free |
| `docs/site-assistant-phase0.md` | How it works and how to deploy it |

## The decision worth recording

The spec says the report affordance is available to every role, and it says a
student's typed text is never stored. Those two together decide the shape: a
student gets the form with **no text box at all**, and the server drops any
description sent regardless.

The form asks `GET /api/assistant/report/context` before it renders, so someone
whose words will not be kept is told before they type rather than after they
submit. Inviting a child to describe their problem and then silently discarding
it is worse behaviour than not offering the box, even though the privacy outcome
is identical.

An anonymous caller on a coursework page is treated as a student. A signed-out
minor on a lesson page is the likely case, and guessing the other way stores text
typed by a child.

## Evidence

Offline suite: 92 assertions, 0 failed. It pins the privacy rule from three
directions, including a payload that lies about its role, scope, retention flag,
user id, contact email and user agent. All six lies are ignored.

Full regression: all 50 offline suites exit 0, including `command-center` (95)
and `admingates` (43), which are the two that share the tables this touches.

Driven in Chromium against a stand-in lesson page that throws on load:

```
[student on lesson]     no textarea, honest note, filed esc_d385de...
[anonymous on pricing]  textarea present, prose stored
[quiz page]             widget absent entirely
console captured:  "Uncaught ReferenceError: notAFunction is not defined @ ...:5"
PROSE_MARKER in stored rows:        true  (anonymous on commerce, correct)
"THE ANSWER IS B" in stored rows:   false (page content never leaves the page)
```

## Two things the browser found that tests did not

**A script tag cannot catch an error that fired while it was downloading.** The
first run captured an empty console from a page that had definitely thrown. The
widget now adopts `window.APCS_ERRORS` from a three-line stub the theme puts in
`<head>`, and the docs carry the snippet. Without it the feature still works and
still misses the most valuable error on any page that breaks on load.

**The widget defaults its API base to production.** Correct for the storefront,
and it silently removed itself when pointed at a local harness. Worth knowing
before anyone debugs it against a branch.

## Hardening applied after re-reading the diff

- One email per distinct failure. A report that dedupes onto an existing task
  sends none, so thirty students on one broken page is one message.
- A separate, much lower per-day ceiling on NEW board tasks (25) than on rows
  (500). The row cap protects the disk; the board is a person's working surface.
- Control characters stripped from the mail subject, which carries a
  caller-supplied URL.
- Checked the console renders task detail escaped (`public/command.html:416`), so
  a report cannot inject markup into the admin view. It does.

## Still open

- ~~`RESEND_API_KEY` is unset~~ **Resolved during this session.** Tanner tested a
  real password reset and received it, and production answers
  `mail_configured: true`. The Phase 0 prerequisite is done and the
  password-reset cluster is retired.

  That moved the risk rather than removing it: mail sending and having a
  recipient are different facts, and either alone means an escalation is stored,
  filed, and never seen. `/api/health` now carries an `assistant` block with
  `mail_configured`, `recipient_set` and `can_notify`, booleans only, for the
  same reason `integrity`, `reporters` and `seed` are there. **Check `can_notify`
  after deploy**; if it is false, set `ASSISTANT_ALERT_EMAIL`.
- **The theme tag is not placed.** One script tag, plus the optional error stub.
  Not on quiz, exam or practice-test templates. The theme's published branch is
  `claude/site-linking-audit-yhufjk`, not `main`.
- **No retention sweep.** Spec section 8 wants bodies deleted at 90 days. The
  rows that could hold text typed by a minor do not exist, so what ages is adult
  text. Deleting on a schedule against the live database deserves its own pass.
