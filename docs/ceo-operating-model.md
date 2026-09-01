# The CEO operating model

Written for the person running this, not for the agents. It answers the question
"there are a lot of agents and a board with 27 open tasks, what do I actually
do", which is a different question from "what can the system do".

The short answer: you do the three things no agent is allowed to do, and you
stop doing everything else.

## The three things only you can do

The system is built so that these cannot be delegated, on purpose. They are not
gaps waiting to be automated.

1. **Decide.** Bucket `decision` tasks are not work, they are questions. An
   agent can compile the options and recommend one. It cannot pick, because
   picking is what an owner does.
2. **Verify.** `verified` is cookie-auth only. The agent that did the work can
   never be the agent that certifies it. That is the whole reason the number
   means anything, and `apcs verify` exists purely to say so and hand you the
   URL.
3. **Hold credentials.** `RAILWAY_TOKEN`, the Actions secrets, the Shopify
   admin. An agent can tell you a token is missing. It cannot add one.

Everything else is delegable, and most of it is currently not delegated. On
2026-09-01 the board held 60 items waiting on your verify click, 5 open
decisions, 12 of 14 quick wins assigned to you, and zero in-flight agent work.
The agents were idle. You were the queue.

That is the problem the CEO agent is pointed at. Not agent capability. Your
throughput.

## What the CEO agent does

`.claude/agents/ceo.md`. Invoke it at the top of a session when the question is
"what should we be doing" rather than "do this".

It does four things in order, and the first one is the one that matters:

1. **Reconciles.** Tests the board against live: what commit is serving, what
   is red on GitHub, whether every red signal actually reaches the board. It
   opens by looking for places the board is wrong, because a ranked list built
   on a wrong board is confidently wrong.
2. **Ranks by consequence.** Signal integrity first, then wrong-in-front-of-a-
   student, then wrong-in-a-gradebook, then money, then blocked humans, then
   everything else by size. This is deliberately not the board's own ordering.
3. **Delegates** through `lib/command-router.js`, which already decides surface
   and model. It does not invent routing.
4. **Batches what is left for you** into one sitting, each item with a
   recommendation rather than an open question.

It never edits production code, never merges, never deploys, and never marks
anything verified.

## Why reconciliation comes first

This is the part that is easy to skip and expensive to skip.

On 2026-09-01 every one of these was true at the same moment:

| Signal | Said | Was |
|---|---|---|
| Board health | `checks: {total: 1, failing: 0}` | one red check it could not see |
| `railway-deploy.yml` | 70 runs, all green | 0 deploys, every run skipped |
| `/api/health` | `ce613c7` | `main` was `2768fcb`, 7 commits ahead |
| `deploy-drift.yml` | red since 2026-08-28 | correct, and read by nobody |

Nothing here was a bug in isolation. The deploy workflow skips rather than fails
by design, and the design is defensible: a workflow that goes red because a human
has not done a setup step is a workflow people mute. `deploy-drift.yml` caught
the drift exactly as intended. The board reported only what was reported to it,
and only `tests.yml` reports.

Four correct components produced one confident wrong answer, for four days.

No individual agent could have caught this, because each was right about its own
piece. Catching it requires someone whose job is to ask whether the signals agree
with each other. That is the job.

## The loop

**Start of session.** The `SessionStart` hook already puts the digest in context
before your first message. Then:

    Use the ceo agent. Reconcile and tell me what to do.

Read the RECONCILIATION block first. If it is empty, the board is trustworthy
today and you can act on the ranking directly. If it is not empty, the top of the
ranking will usually be a signal problem rather than a feature.

**During.** Answer the batched decisions in FOR TANNER ONLY. Each arrives with a
recommendation, so the common case is agreeing in one word.

**End of session.** Two things, both cheap and both load-bearing:

- Click verify on whatever the verifier prepared evidence for. It is the only
  bottleneck that cannot be moved off you, so it is the one to keep short.
- Confirm a run note landed in `docs/runs/`. Institutional memory lives in the
  repo, not in a chat history, and the note is what makes the next session start
  informed instead of starting over.

## Who does what

| Work | Goes to | Why |
|---|---|---|
| "What should we be doing" | `ceo` | Ranking and delegation |
| "Is this actually done" | `verifier` | Evidence collection, read-only |
| API code, `surface: api` | Claude Code | 21 offline smoke suites, auto-merge on green |
| Theme code, `surface: theme` | Claude Code, gated | No CI in the theme repo, so merging IS deploying |
| Shopify pages under 58KB | Chat, via MCP | Single-push ceiling |
| Decisions | You | Not delegable |
| Verification | You | Not delegable |
| Credentials | You | Not delegable |

`lib/command-router.js` is the authority on the middle rows and recomputes on
every read. Do not memorise this table; ask the router.

## How to tell the CEO agent is wrong

It is a model, it will be confidently wrong sometimes, and you are the only
check on it. Push back when you see any of these:

- **A ranking with no cost attached.** If it cannot say what an item costs per
  day that it sits, it does not understand the item well enough to rank it.
- **Evidence that is a summary.** "Confirmed working" is not evidence. A status
  code, a commit sha, or a run conclusion is. Ask for the raw output; it is
  required to be in the EVIDENCE block.
- **A survey instead of an answer.** You asked what to do. Three options with
  balanced tradeoffs is the agent declining to decide.
- **Silence about what it skipped.** DELIBERATELY NOT DOING is a required
  section. An empty one on a 27-task board is not credible.
- **Any move toward doing the work itself.** If it is editing `routes/`, it has
  stopped ranking and you have lost the thing you invoked it for.

## Anti-patterns

Written down because each of these is a natural thing to do and each makes the
system worse.

- **Opening the file you think needs changing.** Rule 1 in CLAUDE.md. The board
  exists because your instinct about what matters today is worse than the ledger
  plus a reconciliation pass.
- **Treating a green check as a fact.** Ask what the check would do if its
  precondition were missing. If the honest answer is "pass", it is not a check.
  Seventy green deploy runs shipped nothing.
- **Accepting `owner: tanner` at face value.** It is frequently just where the
  task landed. Most of those 12 quick wins did not need you, they needed hands.
- **Letting the verify queue grow.** It is the one queue that cannot be moved off
  you, so it is the one that must be kept short. Sixty is already too many.
- **Adding a second exception to a bounded rule.** The zero-PII posture has
  exactly one named exception, the sandbox. A second one is a decision with a
  written justification, never a patch.
- **Widening a task to fit a fix.** If the right fix is bigger than the ticket,
  that is a new ticket and your call to make, not something to absorb quietly.

## What is still yours after all this

Deciding, verifying, and holding credentials. That is the intended end state,
not a transitional one. The system is built so those three stay with a human,
and the CEO agent's success condition is that they are the only three left.
