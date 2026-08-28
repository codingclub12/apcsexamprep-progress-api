# Site Assistant: the rewrite

**Ask:** rewrite the assistant design to be as effective, cheating-resistant and
helpful as possible.

**Outcome:** `docs/site-assistant-spec.md`, superseding
`SiteAssistantClaudeCodeHandoff.md`. No code. The review that argued for the
rewrite is `docs/site-assistant-review.md`, merged in #403.

## What changed and why

**From knowledge base to typed state reads.** The support clusters that generate
mail are state problems, not prose problems: an entitlement that has not
appeared, a quiz that is locked, a student who cannot join. An article cannot
answer any of them. `getGateState` wraps the gate endpoints that already exist
and resolves through the same `resolveGate` students hit, so the answer cannot
drift from student reality.

**Anti-cheating became the spine, not a section.** The decisive fact:
`quiz_bank.correct_index` and `quiz_bank.explanation` are in the same SQLite
file every route opens, annotated `NEVER sent before submit`. Answer-key
exposure is this board's recurring failure: task 137 (1.1 leaks 10 CFU answers),
task 130 (three Cyber quizzes share key ABCDB), open decision 12 (answer review
as a key exposure route). A model with a database handle is the most efficient
version of that leak.

Six layers, each independently sufficient: corpus isolation; typed read tools
whose return types have no field for a question or an answer; no page content in
context ever; hard script exclusion on assessment templates; a pre-filter before
any spend; an output tripwire scanning for codes and key shapes.

The layer that does the work is the second. The assistant issues no SQL and
receives no rows. `lib/assistant/reads.js` is the only assistant-side module
permitted to touch `db`, and it selects named columns.

**The test is the deliverable, not the promise.** `smoke/assistant-exfiltration.js`
seeds sentinel answer strings, runs hostile prompts through the real assembly
path, and asserts on the assembled CONTEXT, not just the output. Proving the key
was never in context is stronger than proving the model declined to say it. This
follows the house sabotage pattern in `scripts/cyber-exercise-gate-sabotage.js`.

**The privacy question is designed out rather than escalated.** Student sessions
store classification, matched article, flag, scope and a content hash, and no
message body. Teachers and anonymous adults store bodies. An anonymous session
that turns out to be a student is downgraded and its stored bodies deleted. So
no second zero-PII exception is requested, and if Tanner later wants student
transcripts that stays an explicit decision with its own bounds.

**Severity is deterministic where it matters.** `assessment_visibility` from a
verified teacher token pages by rule with no classifier in the path. A pager
that can be argued out of firing is not a pager.

**Slack is dropped from v1** because there is no Slack integration in this repo.
Specifying a transport that does not exist and then failing an acceptance test
on it is how a spec loses credibility.

## Sequencing

Four phases, each useful alone. Phase 0 is mail config plus the report endpoint
with no model at all: it retires the password-reset cluster and makes every
later phase debuggable. Phase 2 is teacher-only, so the privacy question gates
nothing until Phase 4.

## Still open

- Whether a successful redeem reflects immediately in the dashboard, or whether
  the UI caches a stale entitlement. The `access_not_showing` flow leads with a
  state read specifically because that bug is suspected and unconfirmed.
- Provider and model choice are deliberately unspecified beyond a `complete()`
  adapter.

## Learned

Two production facts found while writing this, both already on the board and
neither part of the assistant work. Task 133: `railway-deploy.yml` skips
silently until `RAILWAY_TOKEN` is set, so nothing auto-recovers a stalled Railway
build. Today that produced 105 minutes of drift, confirmed by dispatching
`deploy-drift.yml` (run 313), and it cleared only because a later merge triggered
a fresh build. Separately, GitHub is throttling that drift monitor's `*/30`
schedule to a few runs a day, so the alarm written to catch this inside the hour
did not fire.
