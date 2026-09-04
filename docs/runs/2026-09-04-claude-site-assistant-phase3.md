# 2026-09-04, Claude Code: site assistant Phase 3, the anonymous path

Branch `claude/assistant-design-feedback-n3w29v`, restarted from `main` after
#525 merged. Phases 0, 0.5, 1 and 2 are live and verified in production.

## What changed

The anonymous path on commerce and marketing pages: Turnstile, the free
knowledge-base path, `getPageStatus`, and a Shadow DOM widget. Full write-up in
`docs/site-assistant-phase3.md`.

Off by default. `ASSISTANT_ANON_ENABLED` unset means this endpoint behaves
exactly as Phase 2 did, teacher token or 401, and that is an assertion rather
than a claim.

## Evidence

- `smoke:assistantanon` 100 passed, 0 failed
- `smoke:assistantexfil` 159, `smoke:assistantdiag` 61, `smoke:assistantreport` 92,
  `smoke:assistantkb` 47, `smoke:posthog` 53, all unchanged and green
- the anonymous suite seeds a teacher, a class, a roster, an entitlement and an
  access code, then asserts none of them appear in any anonymous context

## Three things worth keeping

### A guard that matched its own documentation

The widget must not be able to read the page. The first version of that check
looked for the bare word `innerText` and went red on the widget's own comment
saying it never sends innerText, and on `textContent =`, which is the safe WRITE
that renders a reply without parsing it as HTML.

Both hits were the check being crude, not the widget being wrong, and both
tempting fixes are bad. Deleting the assertions loses the guard. Loosening them
until they stop complaining leaves something that reports clean over code nobody
is watching, which is the failure this repo keeps finding in its own validators.

What it got instead: dot-prefixed patterns that match EXPRESSIONS rather than
words (`.innerText`, `.outerHTML`, `getSelection(`), a count assertion that
`document.body` appears exactly once and only to append the host, and a mutation
that rewrites the widget to send `document.body.innerText` and requires the
guard to catch it. A guard that has never been shown to fail is not evidence.

### The suite was asserting against its own stub

The first draft reassigned `turnstile.verify` on the module to simulate the four
failure modes. Further down, the suite then tested the real Turnstile module,
except it was not real any more: `require` returns the same singleton, so three
assertions passed against the stub while reading as though they had exercised
the module.

The fix is in the production code rather than the test. `respondAnonymous` takes
`verifyTurnstile` as an injected parameter, defaulting to the real one, exactly
as it already takes `provider`. Both seams are parameters now and no test mutates
a real module.

That is worth writing down because the failure was invisible in the right
direction: everything was green, and the green came from the test's own fixture.

### A tokenizer that dropped the only word that mattered

The free path matches a question against the knowledge base by term coverage. The
first tokenizer kept words of three or more letters, which on this site drops
`W-9` (it splits into `w` and `9`, neither kept) and `PO` (two characters).

Those are the two terms a purchasing office actually asks about, so the one
article that answers a procurement question could never win the path built to
serve it. Two passes now, raw and de-hyphenated, unioned.

Found by printing the tokenizer's output for real questions rather than by
reading it. The regex looked correct, and it was correct, for a corpus that does
not include a tax form.

## A place the spec was followed by not following it

`getPageStatus` is specified to return `{exists, published, template,
has_widgets}`. Two of those are Shopify state this server has no read of.

Returning `published: true` because a row exists in `page_links` would have been
the easy implementation and a confidently wrong answer about site mechanics,
which spec section 4 forbids, in the direction that sends a buyer hunting for a
page that is not there. It returns `null` for both, meaning not observable from
here, and the system prompt tells the model to say it cannot tell rather than
guess. The suite asserts that line is in the context.

## Still open

- **`ASSISTANT_ANON_ENABLED` and both Turnstile keys are unset**, which is the
  intended landing state. Nothing is public until Tanner sets them.
- **`ASSISTANT_ALERT_EMAIL` is still unset**, unchanged since Phase 0. Chat can
  now raise `key_leak_blocked` at `immediate` from two roles and the mail step
  still returns `no_recipient`.
- **The 13 KB article bodies are still drafts.** Phase 3 is the phase that most
  needs them: the free path can only answer from a published article, so until
  they are written every pre-sale question costs a model call or gets a pointer
  to `/help`. The free path is built and tested; it has nothing to serve.
- **The 90 day body sweep** (spec section 8) is not built, and anonymous commerce
  sessions are the first rows that retain text. Nothing is old enough to delete
  yet, which is exactly when it is easy to forget.
- Phase 4 (students) is not started.
