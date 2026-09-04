# 2026-09-04, Claude Code: site assistant Phase 2, chat on the teacher portal

Branch `claude/assistant-design-feedback-n3w29v`. Phase 0, 0.5 and 1 are merged
and live; this is the phase that first spends money and first puts a model next
to an assessment product.

## What changed

`POST /api/assistant/chat`, teacher auth, behind `ASSISTANT_ENABLED`. Six layers
from `docs/site-assistant-spec.md` section 5, all of them implemented, plus
`smoke/assistant-exfiltration.js` with 159 assertions. Full write-up in
`docs/site-assistant-phase2.md`.

Also merged PR #518 (Phase 1) on `3571b63`, the SHA its CI passed on, guarded
with `expectedHeadSha`. Production confirmed serving `c2fdbd5` at 04:17:16Z,
polled for that exact SHA rather than for "the commit changed", which is the
mistake that made an earlier verification in this session report a false
negative.

## Evidence

- `smoke:assistantexfil` 159 passed, 0 failed
- `smoke:assistantdiag` 61 passed, 0 failed (was 48; the guard grew)
- `smoke:assistantreport` 92, `smoke:assistantkb` 47, `smoke:posthog` 53
- production `/api/health` reported `c2fdbd5` after the #518 merge

## Four things worth keeping

### A guard going red was the useful event, and deleting it would have been the bug

`smoke/assistant-diagnostics.js` greps `reads.js` for the words `prompt`,
`options` and `explanation`, on the rule that the read layer must never select
them. Phase 2's layer 6 tripwire has to COMPARE a candidate response against
exactly those columns, so the guard went red on a change that was correct.

The tempting move is to delete the assertion. The next tempting move is to move
`scanForSecrets` into its own file so the grep stops seeing it, which is the same
thing wearing a hat: the check would come back clean while the code it was
written to watch carried on unwatched.

What it got instead: the file is split at the tripwire's heading, the DTO half is
held to the original rule unchanged, and the tripwire half is held to one a grep
can actually check, which is that every `SELECT` in it returns `COUNT(*)` and
nothing else. Then both halves are checked behaviourally, by handing the tripwire
each sentinel and asserting its whole return value contains no character of what
it matched. Net effect: 61 assertions where there were 48, and the rule is
stricter than it was.

### The spec's own output-filter rule would have made the tripwire useless

Section 5 layer 6 says to flag "a bare letter sequence of length 3 or more". That
blocks CSA, CSP, PIN, FAQ, API and PDF. Nearly every correct answer this
assistant will ever give contains at least one of those, so the tripwire would
have fired on ordinary traffic from the first hour and been switched off by the
end of the day.

Narrowed to runs drawn from A-E, which is the option alphabet on every activity
in this repo. CSA fails that on the S; ACBD does not. The length 3 threshold is
kept. Both directions are asserted, and this is the case for asserting both:
a filter tested only on the attacks it was written for reports success at any
threshold, including "refuse everything".

The same rule was then wrong in a second, more interesting way, and this one is
the finding worth carrying forward. The spaced form matches single letters
separated by punctuation, and written the obvious way the separator excludes
letters and digits. That misses `1. A  2. C  3. B` and `Q1 A, Q2 C, Q3 B`, which
are how a key is usually written out: the gap holds a digit, or a Q.

Every test in the suite passed over it, because every test case had been written
from the same mental image as the rule. It was found by sitting down with the
finished regex and asking what shapes a key actually takes, which is a different
question from what shapes the rule was built for, and it is the question the
mutation tests could not ask on their own. A mutation built from the author's own
example is green either way.

The same shape appeared a third time in the minimum-length constants. The first draft
used 40 characters for a quiz prompt, picked by eye, and the diagnostics suite
found the gap immediately: its sentinel prompt is 36 characters and went
undetected. Plenty of real stems are shorter than 40 ("What is a firewall used
for?" is 28), so the rule was blind to exactly the short questions a model is
most able to restate from training. Now 30, which still requires verbatim
containment of a whole stored field.

### The IP rate limiter would have throttled a school

`lib/rate-limit.js` keys on the client IP and the spec says to use it and not
write a second limiter. Both true, and following them literally on a signed-in
route produces a bug: a school is one NAT address, so thirty teachers in one
building share the window and one busy teacher throttles the department at
lunchtime. It reads as the site being down and it would have been diagnosed as
anything but a rate limit.

The limiter takes an optional `keyFn` now, defaulting to the IP so no existing
caller changes, and the chat route mounts two windows of the same module: a
generous IP one in front of the auth check as the flood brake, and a tight
per-teacher one behind it for fairness. That is not a second limiter, which is
what the spec was actually protecting against.

### On Opus 5, omitting `thinking` buys extended thinking

Worth writing down because it is the opposite of the older models and it is
silent. On Claude Opus 5 thinking is ON by default, so a request that simply does
not mention the field gets adaptive thinking and pays for it. `provider.js`
disables it explicitly, and validates that against the effort level, because
`{type:'disabled'}` is rejected at `xhigh` and `max`.

For a desk that answers from typed DTOs in two sentences, on a box with a $169
incident on record, that is the difference between a support feature and a line
item.

## The invariant that was written down wrongly

`reads.js` opened with "the only module in the assistant tree permitted to touch
the database". That is the spec's wording, and it was already false when Phase 0
shipped: `report.js` inserts an escalation row.

Corrected in place, with the correction explained rather than quietly applied.
The property that protects the answer keys is about what goes INTO a prompt, not
about who holds a handle. Stating a rule the code visibly breaks is how a header
stops being read, and this repo has already paid for a check whose comment
described something it did not do.

## Still open

- **`ASSISTANT_ALERT_EMAIL` is unset.** Chat escalations store and file to the
  board correctly; the mail step returns `no_recipient`. Visible on
  `/api/health` under `assistant.can_notify`. Tanner's to set, in Railway.
- **`ANTHROPIC_API_KEY` and `ASSISTANT_ENABLED` are unset**, so the endpoint is
  live and answering from live state and the knowledge base with no model call.
  That is the intended launch state: the degraded path is worth running on its
  own for a while before anything spends.
- **The KB is empty in production** until the next deploy carries the boot seed
  added here. `/help` will list nothing before then, which is correct behaviour
  for an empty corpus but reads as broken.
- **No operator view** on `chat_sessions` yet, and no 90 day body sweep. Both are
  spec section 8 and 11 items and neither is urgent while the only sessions are
  teacher ones from today.
- Phases 3 (anonymous, Turnstile) and 4 (students) are not started.
