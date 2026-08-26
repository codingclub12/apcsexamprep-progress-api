# Forgot password link on teacher sign-in, and an honest mailer

Board task #127, claim #31.

## The ask

A teacher asked to have her password reset by hand, and there was no self-service
path from the sign-in form. Add the link.

## What was already there

All of the backend. `/teacher/forgot` and `/teacher/reset-password` are live and
return 200 in production, tokens are SHA-256 hashed, single use, 24 hour TTL, and
`lib/password-reset.js` already holds one contract for both the emailed link and
the owner-generated one. Nothing about the reset mechanism needed building.

Two things were missing. The sign-in form had no link to any of it, and the box
cannot send email.

## The trap this closes

`RESEND_API_KEY` and `MAIL_FROM` are absent from Railway, recorded in the
2026-08-20 TTL run note and unchanged since. `lib/mailer.js` falls back to writing
the message to the log, and `/api/teacher/forgot-password` returned "a reset link
is on its way" either way, because that copy is deliberately identical whether or
not the address is registered.

So shipping the link on its own would have been worse than shipping nothing: a
locked-out teacher clicks it, is told mail is coming, and waits on an email that
only ever reached the Railway logs. Today she emails Tanner and gets unblocked.
That was already flagged on the board as suggested-and-not-done; this does it.

`mailerConfigured()` was exported and called nowhere. It is now the thing the
route branches on.

## What changed

- `routes/teacher.js` - `FORGOT_NO_MAIL` beside `FORGOT_GENERIC`, and the route
  resolves which one to use ONCE, up front, from `mailer.mailerConfigured()`.
  Every return path uses it, error path included.
- `public/teacher-forgot.html` - renders an unconfigured mailer as a warning
  rather than a success, re-enables the submit button in that case (nothing is in
  flight to wait for), and reveals a panel after submit for the teacher who has
  no account or used a different address.
- `shopify/cyber-class.html` - the link itself, under the Sign In button, plus a
  second line for "not sure which email I signed up with". Scoped `.tcp-help`
  styles, every colour paired with `-webkit-text-fill-color` and pinned on
  `:link`/`:visited`, per CONVENTIONS.md.
- `smoke/password-reset.js` - the stub delivered mail while `mailerConfigured()`
  reported false, so the harness contradicted itself. It now stubs both, and a new
  section covers the unconfigured path.

## The anti-enumeration invariant

The reason this is safe to branch on: what separates the two responses is SERVER
config, never whether an address has an account. Two callers on the same server
always get the same bytes. The smoke test asserts that directly now, comparing an
unknown address against a known one under an unconfigured mailer, rather than
matching a copy string that rots the next time the wording changes.

The "no account" help lives on the page, after submit, and not in any endpoint.
Nothing server-side ever says whether an address is registered.

## Evidence

- `node smoke/password-reset.js` -> OK, all 37 checks passed (was 31)
- `node --check` clean on `routes/teacher.js`, `smoke/password-reset.js`, and the
  extracted `teacher-forgot.html` page script
- No em-dashes and no non-ASCII in the diff, per repo convention
- Repo mirror verified against the LIVE page body before generating any sheet:
  164 of 164 substantial mirror lines present in live, and the isolated live body
  span is byte-identical to the mirror at 19302 chars. My change is the only
  delta, so the import cannot revert live content.
- `node scripts/page-body-csv.js` passed all five guards and wrote a 1 row sheet

## Still open

- NOT verified against production. Needs a deploy, then `RESEND_API_KEY` and
  `MAIL_FROM` set in Railway against a VERIFIED Resend domain, then one real
  forgot-password request delivering actual mail. `verified` is not the
  implementing agent's to set.
- A brand-new Resend account has no verified domain and can only send to the
  signup address via `onboarding@resend.dev`. Until a domain is verified, real
  teachers get nothing, and the page will correctly say email is not set up only
  if the key is ALSO still unset. Key set plus domain unverified is the one state
  that still fails silently, because Resend accepts the call and drops delivery.
- Student PIN recovery does not exist. `reset-pin` is in the CLAUDE.md build order
  and was never built, so a student who forgets a PIN still has no path at all.
- `trust proxy` is `true` in server.js, so a client controls `X-Forwarded-For` and
  therefore its own rate-limit bucket. Pre-existing, and lib/rate-limit.js already
  calls itself a courtesy brake rather than a boundary. Noted, not changed.
