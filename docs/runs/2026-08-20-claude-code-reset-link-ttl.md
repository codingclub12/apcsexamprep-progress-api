# Reset link TTL raised from 45 minutes to 24 hours

## What changed

`RESET_TTL_MIN` in `lib/password-reset.js` moved from 45 to `24 * 60`. Both minting
paths read that one constant, so the emailed link and the owner-generated link stay
identical in strength, which is the invariant that module exists to hold.

Added `RESET_TTL_LABEL` beside the constant. Everything user-facing now renders the
label instead of interpolating raw minutes, otherwise the reset email would have told
teachers to act within "1440 minutes". Updated consumers:

- `routes/teacher.js` reset email, both the text and HTML bodies
- `public/teacher-forgot.html` hardcoded "45 minutes" in the page copy
- `smoke/admin-teacher-admin.js` asserted the literal 45, now reads the constant so
  the next TTL change does not silently rot the test

`mintResetLink` also returns `ttl_label` alongside `ttl_minutes`.

## Why

Requested by Tanner on 2026-08-20. Three manual resets in three days were all landing
on the owner because email delivery is not configured, and a 45 minute window kept
closing before the teacher looked at her phone.

The concern was raised before making the change and Tanner confirmed one day. Recording
it here so the tradeoff is legible later rather than looking like an accident: the link
is a full account takeover for whoever holds it, it travels over email or text, and TTL
is the only bound on that exposure. Teacher accounts reach student rosters and gradebooks
for minors. 24 hours is a real widening of that window, chosen deliberately against the
support cost of expired links.

## Evidence

- `node smoke/password-reset.js` -> OK, all 31 checks passed, including expiry
  enforcement and single-use
- `node smoke/admin-teacher-admin.js` -> OK, all 45 checks passed
- `RESET_TTL_LABEL` resolves to "24 hours" at 1440 minutes

Not yet verified against production. This needs a deploy plus one real minted link
showing a `expires_at` about 24 hours out. `verified` is not the implementing agent's
to set.

## Still open

- `RESEND_API_KEY` and `MAIL_FROM` are both absent from the Railway service variables,
  confirmed from the variables list on 2026-08-20. `mailerConfigured()` is exported from
  `lib/mailer.js` and called nowhere, so `/api/teacher/forgot-password` returns "a reset
  link is on its way" whether or not anything was sent. Every teacher reset request so
  far has been written to the Railway logs instead of delivered. This TTL change does not
  address that and the manual resets continue until it is fixed.
- Suggested and not yet done: have the forgot-password page report honestly when the
  mailer is unconfigured. It leaks nothing about which addresses have accounts because it
  reports server config, not account existence.
- `ADMIN_KEY` was pasted into a chat transcript during this session and is live. Rotate.
