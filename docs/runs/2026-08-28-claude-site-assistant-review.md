# Site Assistant handoff review

**Ask:** decide how accurate `SiteAssistantClaudeCodeHandoff.md` (2026-08-28) is,
using repo knowledge the authoring chat did not have.

**Outcome:** review written to `docs/site-assistant-review.md`. No code changed.

## What changed

`docs/site-assistant-review.md`, new. Nothing else.

## Evidence

Every claim in the review is pinned to a file and line in the tree at `284c03f`:

| Handoff claim | Reality | Evidence |
|---|---|---|
| `GET /api/class/:code/exists` returns 404, may be removed | Present; 404 is its answer for an unknown or inactive code | `server.js:517` |
| `/api/shopify/*` 404, branch never merged | Merged and mounted; webhook is POST only | `server.js:50`, `routes/shopify.js:104`, `npm run smoke:shopify` |
| No working password reset | Full token flow exists; `RESEND_API_KEY` is unset | `routes/teacher.js:151,200`, `lib/password-reset.js`, `lib/mailer.js:37` |
| Rate limiting unconfirmed on student auth | Wired | `routes/student.js:57,121`, `routes/teacher.js:151,200,1553` |
| Access code is one shared bearer credential | Per code, per course, single redemption, revocable | `db.js:387`, `lib/entitlements.js:59-134` |
| Redeem-before-account is the root cause | Shopify path self-heals via claim on register | `db.js:405`, `routes/teacher.js:register` |
| Confirm ACAH includes `authorization` | `cors@2.8.6`, no `allowedHeaders`, reflects the request | `server.js:41` |

Verified true: teacher register takes no access code and no email verification
(`routes/teacher.js:55`); the CORS origin allowlist is correct (`server.js:34`).

## The finding that matters

`chat_messages.content` plus an admin full-transcript browser plus full
conversations in escalation email, from a widget section 7 loads on lesson pages,
is a second zero-PII exception covering text typed by minors. `CLAUDE.md` says a
second exception is a decision, not a patch. `docs/sandbox.md` lists the bounds
that made the first one acceptable and the handoff inverts all of them.
`lib/wire-log.js` is the house precedent for the opposite posture.

Second finding: the flagship acceptance criterion ("why is my quiz greyed out")
is the ticket resolved in `docs/runs/2026-08-28-claude-cyber-1-1-quiz-gating.md`.
It needed per-class gate state, and three causes share one symptom. A KB-only
assistant answers it wrongly. `GET /api/teacher/classes/:code/gates` and
`GET /api/admin/class/:id/gates` already exist as read tools.

## Still open

- The PII decision in section 2 of the review is Tanner's, not an implementer's.
- `RESEND_API_KEY` and `MAIL_FROM` in Railway are unverified from here. They gate
  both password reset and the assistant's entire escalation path.
- No Slack integration exists in this repo. Section 8's Slack DM has no transport.
- Whether the production probe account `probe@example.invalid` still exists could
  not be checked without database access.

## Learned

Probing production over HTTP cannot distinguish a removed route from a route
answering correctly. Four of the handoff's four "known broken" items are that
mistake: a 404 that is a contract, a GET against a POST-only webhook, an
anti-enumeration 200, and a limiter that is wired but invisible from outside.
A handoff assembled that way needs its facts re-derived from the tree before any
of its conclusions are trusted.
