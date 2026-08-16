# Where Jarvis lives

Written because the question "is it the same Claude Code session every time, or a
new one, or a file on GitHub?" had no answer anywhere in the repo, and the next
person to ask will be a fresh session with no chat history to scroll.

## There is no Jarvis session

Sessions are disposable. A Claude Code session is a pair of hands: it boots,
reads the state, does one job, writes the result back, and dies. Nothing
important is inside it, and that is deliberate. A session that mattered would be
a single point of failure, and the whole point of the ledger is that institutional
memory lives in the repo rather than in a chat history.

So the answer to "same session or new one" is: **always a new one**, and it does
not matter, because Jarvis is three things that outlive every session.

## The three homes

### 1. The ledger - the state

The database behind `progress.apcsexamprep.com`. Tasks, buckets, claims,
artifacts, what is verified. This is the memory. It survives sessions, deploys,
devices, and people.

Reached through `/api/command/*` and `/api/todo/*` with the `TODO_KEY` bearer, or
through the browser at `/admin/command` with the session cookie.

### 2. This repo - the brain

| File | What it is |
|---|---|
| `lib/command-hazards.js` | The rules. Injected verbatim into every compiled prompt. |
| `lib/command-router.js` | Where work goes, which model, and what may run unattended. |
| `lib/command-dispatch.js` | The queue: what is eligible to run with no human. |
| `lib/command-write.js` | The write guard. `verified` is not an agent's to set. |
| `scripts/apcs.js` | The CLI. `digest`, `claim`, `done --artifact`. |
| `scripts/verify-artifact.js` | The checker. Reports evidence, never a verdict. |
| `scripts/verify-board.js` | Reconciliation: runs the checker over the whole board. |
| `.claude/agents/verifier.md` | The verifier agent definition. |
| `CLAUDE.md` | The protocol every session reads on boot. |
| `docs/runs/` | What past sessions learned, and the evidence they left. |

### 3. GitHub Actions - the clock

| Workflow | When | What it does |
|---|---|---|
| `auto-dispatch.yml` | 06:00 UTC daily | Reads the dispatch queue, reports what it WOULD have handed out. Executes nothing. |
| `verify-board.yml` | On demand | Runs the verifier across `needs_verification`, reports the evidence. Writes nothing. |
| `tests.yml` | Every PR | Every offline smoke suite. |

## Why a fresh session is not clueless

Claude Code loads `CLAUDE.md` automatically for any session opened in this repo.
That is the bootstrap, and it is why the session protocol lives there rather than
in someone's notes.

The same mechanism carries agents: `.claude/agents/verifier.md` became a live
agent the moment it was committed, with nothing configured session-side.

That is the whole trick. **Committing a file is how you change what every future
session knows.** There is nothing to install and nothing to remember.

## What to open

| You want | Open |
|---|---|
| The board | `progress.apcsexamprep.com/admin/command` (built for 380px, works on a phone) |
| Last night's dispatch report | GitHub > Actions > Overnight dispatch check |
| To reconcile the board | GitHub > Actions > Reconcile the board > Run workflow |
| To get work done | A NEW Claude Code session on this repo. Say "read the digest and tell me what is next" |
| From a terminal | `apcs digest` |

## What to save

Nothing. It is all committed. The only things not in git are the two secrets, and
they are the same value in two places:

- **Railway** environment variable `TODO_KEY` - what the API checks against.
- **GitHub** repository secret `TODO_KEY` - what the workflows send.

If they disagree, every workflow read comes back 401 and says so.

## What is NOT true yet

Worth stating plainly so nobody reads this page and assumes more than exists.

- **Nothing executes on its own.** The overnight job reads and reports. The
  execute half of dispatch is not built. `DISPATCH_EXECUTE` gates a step that
  does not exist.
- **The board has not been reconciled.** Phase 0.3 was still outstanding when
  `verify-board.js` was written. The button exists; the pass has not been done.
- **`verified` will never be automatic.** Cookie auth only, forever. That is not
  an unfinished edge, it is the reason the number means anything.
