# Nightly site crawl: the agent's playbook

This is what the nightly Routine runs. It lives in the repo rather than in the
Routine's stored prompt for the reason CLAUDE.md gives about everything else
here: committing a file is how you change what every future session knows. The
Routine's prompt is three lines and points at this file. Improve the behaviour by
editing this document, not by editing the trigger.

Read `CLAUDE.md` first. Everything below assumes its four rules.

## What this job is

A senior developer walking the site once a night and saying what is wrong, worst
first. Not a test suite: `smoke/` already has 113 of those and they check things
somebody knew to check. This one is the broad sweep over roughly 2,000 live URLs
looking for what nobody thought to write a test for.

**It reads. It changes nothing.** No ledger write, no page edit, no theme push,
no fix committed. Same posture as `.github/workflows/nightly-sweep.yml`, and for
the same stated reason: reading unattended and changing things unattended are
different risks, and only the first one is being taken overnight. If the crawl
finds something that needs fixing, the report says so and a human decides.

The one thing it does write is its own record: the run note and the baseline
state file, both under `docs/runs/`. Those are the crawl's own output, not
changes to the system it is watching.

## The run

```bash
# 1. Board state first, per CLAUDE.md rule 1. A finding already on the board as
#    a known task is not news, and reporting it as new is how this job teaches
#    someone to skim it.
apcs digest

# 2. Tonight's crawl, against last night's baseline.
node scripts/site-crawl.js \
  --previous /tmp/crawl-baseline.json \
  --out /tmp/crawl-state-new.json \
  --json > /tmp/crawl.json
```

Defaults are a seven-shard rotation with a 400-request cap, which covers the
whole site weekly and never costs more than about twelve minutes. Do not raise
the budget to "get it all done tonight". The reason is in the next section.

## The rate limit is not advisory

Board task 79 is `46 pages returned 429 during crawl - re-verify single-threaded`.
`.github/workflows/smoke.yml` records rapid runs making the storefront serve
empty pages. `scripts/grade-path-audit.js` chose ten requests over a 250-page
crawl for the same reason.

The crawler backs off on the first throttled response and stops after five. If a
run aborts, that is the correct outcome and the report should say so plainly.
**Do not re-run it with a bigger budget to compensate.** The cost of pushing
through is the storefront serving challenges to real students on shared school
IPs, which is a worse outcome than a night of partial coverage.

If a night aborts, say so, and let the next night's shard rotation catch up.

## Verify before reporting

The crawler produces candidates. Your job is to decide which are real. A report
that relays script output unchecked is not worth a nightly agent.

For **every P0 and every P1**:

1. **Reproduce it.** Fetch the URL yourself. A 404 that answers 200 on a second
   look was an edge-cache artifact, not a dead page. `server.js` records the day
   a Cloudflare-cached 500 cost most of a day and four repeat diagnoses of the
   same stale response.
2. **Check it is not intentional.** The CSA course hub marks unshipped topics
   COMING SOON on purpose. A page can be deliberately thin. Read enough of the
   page to tell the difference between broken and unfinished.
3. **Check the board.** If `apcs digest` already carries a task for it, it is not
   a finding, it is a status line. Report it as "still open, N nights" and move
   on.
4. **Trace it to a cause.** You have the repo. A broken link is a symptom; the
   `<a>` that emits it lives in a seed module or a theme snippet, and naming the
   file is most of the value. Where the cause is in the theme repo rather than
   this one, say so, and remember the deploy branch trap in CLAUDE.md: the
   published theme tracks `claude/site-linking-audit-yhufjk`, not `main`.
5. **Look across findings, not just at them.** Twelve broken links that all point
   into CSP Big Idea 3 are one bug in one nav partial, not twelve bugs. The
   crawler groups by identical evidence; it cannot see that twelve different URLs
   share a cause. You can.

For **P2 and P3**: do not verify individually. Report the counts, the pattern,
and the two or three worst examples. A hundred pages missing meta descriptions is
one line and a pointer to `docs/meta-description-gaps.md`.

## What the report says

Lead with the answer to "is anything on fire". Then:

- **New tonight.** The only section that always matters. Each item: what broke,
  who it hurts, the probable cause with a file path, and what you would do.
- **Still open.** One line each, with how many nights. Anything at five nights or
  more gets called out by name: either it is not actually important, or it is
  being ignored, and both are worth saying out loud.
- **Resolved since last night.** One line. Only for URLs actually recrawled: the
  crawler already refuses to claim a resolution on a page it did not look at, and
  neither should you.
- **Coverage.** Which shard, how many URLs, whether the run aborted. A night that
  collected nothing must never read like a quiet night.

If nothing is wrong, say that in one line and stop. `board-delta.js` earned this
rule: a job that reprints the same fourteen items every morning is wallpaper
inside a week. "Nothing changed" is the honest answer most mornings and it should
be short.

No em-dashes, per repo convention.

## The baseline lives on its own branch

The crawl needs last night's state to say what changed, and a fresh session each
night starts from a clean clone of the default branch. So the baseline lives on
one long-lived branch, `claude/nightly-crawl-log`, which carries nothing but the
crawl's own bookkeeping.

Read it before the run, without switching branches, so the crawler you execute is
always the version on the default branch rather than whatever the log branch last
saw. **Stage it outside the repo**, in `/tmp`, not in `docs/runs/`:

```bash
git fetch origin claude/nightly-crawl-log 2>/dev/null || true
git show origin/claude/nightly-crawl-log:docs/runs/crawl-state.json \
  > /tmp/crawl-baseline.json 2>/dev/null || echo "no baseline yet, first run"
```

The `/tmp` part is not fussiness. Restoring the baseline into `docs/runs/` leaves
an untracked file in the working tree for the whole run, on whatever branch you
happen to be standing on. This repo's stop hook flags untracked files, and the
next agent to see that flag is one `git add -A` away from committing the crawl's
private bookkeeping onto a feature branch. Keep the state file out of the repo
until the moment it is committed to the log branch, and that cannot happen.

A miss is normal on the first run. `board-delta.js` earned the rule the crawler
follows here: report "no baseline" rather than treating every finding as new,
because a false alarm on the one morning with nothing to compare against is how
someone learns to ignore mornings.

## Closing the run

Switch to the log branch FIRST, then copy the state in from `/tmp`. Doing it in
that order means the file only ever exists inside the repo on the branch it
belongs to.

```bash
git fetch origin claude/nightly-crawl-log 2>/dev/null \
  && git checkout -B claude/nightly-crawl-log origin/claude/nightly-crawl-log \
  || git checkout -B claude/nightly-crawl-log

mkdir -p docs/runs
cp /tmp/crawl-state-new.json docs/runs/crawl-state.json
# write the run note here, then:

# name both paths explicitly. never `git add -A` on this branch: the working
# tree may still carry scratch files from the run, and the log branch is for
# the crawl's own bookkeeping and nothing else.
git add docs/runs/crawl-state.json "docs/runs/$(date +%F)-nightly-crawl.md"
git commit -m "nightly crawl: <one line on what changed>"
git push -u origin claude/nightly-crawl-log
```

Write the note to `docs/runs/YYYY-MM-DD-nightly-crawl.md`: what was found, the
evidence, what is still open, what was learned. The state file is the next
night's baseline, so a night that does not commit it makes the next morning
report "no baseline" and every finding look new.

**Commit nothing else.** If the crawl happened to leave other files modified,
they are not part of this and must not ride along.

Do not open a pull request. The log branch is a ledger, not a change proposal:
merging it into the default branch is a Railway deploy, and a nightly deploy of
bookkeeping is exactly the kind of unattended change this job refuses to make.

## What is explicitly not this job

- **Fixing anything.** Even an obvious one-line fix. Report it with the file and
  the proposed change, and let a human take it.
- **Writing to the ledger.** `auto_dispatch` consent is Tanner ticking a box, and
  a crawl finding is not that box. Read the board, never write to it.
- **Setting `verified`.** Cookie-auth only, by design, so the agent that did the
  work is never the one that closes the loop on it.
- **Touching Shopify.** Every page change ships as a Matrixify sheet a human
  imports. A crawl never edits a page, and never uses the publish endpoints.
- **External link checking.** Real, but it means hammering third parties nightly,
  which is somebody else's rate limit to blow.
