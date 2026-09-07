# Nightly crawl, 2026-09-07

No crawl completed tonight. This is an operator failure, not a rate-limit abort,
and it produced zero usable crawl data. Untested, not clean.

## What happened

`apcs digest` ran fine: 71 open, 1 bleeding (#85, the gradebook points-model
question, already tracked and not re-litigated here), one P0 already on the
board from prior nights (see below).

Baseline restore from `claude/nightly-crawl-log` worked: last valid state is
still 2026-09-06 (589 findings, 1 P0, 153 P1, 355 P2, 80 P3, oldest finding 4
nights).

The crawl itself failed for a reason that is on me, not the site. I wrapped
`node scripts/site-crawl.js --previous ... --out ... --json` in a shell-level
`timeout 900` (15 minutes) as an external safety bound, without first checking
that the script already has its own wall-clock cap, `--max-minutes`, defaulting
to 25 minutes (`scripts/site-crawl.js:114`). My 15-minute external timeout fired
first and killed the process with `SIGTERM` at exactly 900s (exit 124), before
the script's own deadline could either finish the run or trigger its own
graceful truncation. Because `OUT` is only written once, at the very end
(`scripts/site-crawl.js:588`, after the whole crawl loop returns), a hard kill
mid-run leaves no partial file. `/tmp/crawl.json` and the intended
`/tmp/crawl-state-new.json` are both empty or absent. There is no way to tell
from this alone whether the run was almost done, still mid-shard, or being
slowed by throttling backoff; the process left no trace of its progress.

While diagnosing that, I made it worse. I ran `node scripts/site-crawl.js
--help` to check whether a wall-clock override flag existed, not realizing the
script has no `--help` handling at all (confirmed: no `help`, `usage`, or
`Usage` string anywhere in `scripts/site-crawl.js`). Any unrecognized flag is
silently ignored by the `flag()`/`opt()` parsers
(`scripts/site-crawl.js:99-103`), so `--help` did not print usage, it launched
a full live crawl against the storefront with every default: 400-request
budget, 7-shard rotation, no `--previous`, no `--out`. I caught this in a
couple of minutes when the command didn't return, and killed it with
`TaskStop` once I understood what it was doing. It had been running roughly
2-3 minutes at that point, sequentially after the first attempt had already
been killed (not concurrent with it, so this was not two crawls hammering the
site at once, but it is a second, unplanned round of live requests in one
night with no findings to show for it).

Net effect: two live crawl attempts tonight, roughly 15 minutes and 2-3
minutes respectively, sequential, zero usable output from either, and no
visibility into whether the storefront was ever throttled during either one.

## Decision: no third attempt tonight

The playbook's rule for a rate-limit abort is "do not re-run with a bigger
budget to compensate," and the reasoning behind it, protecting real students on
shared school IPs from repeated challenge-triggering traffic, applies here even
though tonight's failure was mine rather than the crawler's own backoff logic.
I had already sent two rounds of live requests before I understood what had
gone wrong. Sending a third tonight, even with a correctly sized external
bound this time, adds more load on top of an unknown amount already sent, and
buys one night of data against a background of not knowing whether the site
noticed the first two rounds. Not worth it. Tomorrow's shard rotation catches
up on schedule, same as any other aborted night.

`docs/runs/crawl-state.json` on this branch is left untouched at 2026-09-06's
content, so tomorrow's run still diffs against real data instead of nothing.

## What I would fix

1. **`scripts/site-crawl.js` should reject an unrecognized flag instead of
   silently ignoring it.** `--help`, or any typo of a real flag, currently
   starts a full live crawl with defaults rather than erroring. One or two
   lines in the `argv` parsing block (`scripts/site-crawl.js:98-119`): collect
   recognized flag names, and if `argv` contains a `--xxx` token not in that
   set, print usage (the `Run:` block already at the top of the file, lines
   72-76) and exit non-zero before any network activity starts. This is a
   real hazard for the next human or agent who reaches for `--help` the way I
   did.
2. **This playbook, or the crawl script itself, should say plainly what the
   safe way to bound the run externally is.** The comment at
   `scripts/site-crawl.js:109-114` explains why `MAX_MINUTES` exists but
   nothing tells an operator not to wrap the process in a tighter external
   timeout. A one-line note in `docs/nightly-crawl-playbook.md`, "if you must
   bound this externally, give it more headroom than `--max-minutes`, which
   defaults to 25," would have stopped tonight before it started.

Both are process/tooling findings from tonight's failure, not new site
findings, so I have not opened a board task for either; whether either is
worth a task is a judgment call for a human, and the fix is small enough to
describe here.

## Still open (last confirmed 2026-09-06, not re-verified tonight)

Carried over from last night's baseline, unchanged since nothing was
recrawled:

- **P0, 2 nights as of last night, now untested a 3rd night**:
  `ap-cyber-unit-1-frq-practice` has a graded widget and no working score
  path (`apcs-score-reporter.js` not loaded). Traced in the 2026-09-05 and
  2026-09-06 notes to the activity-name resolver in
  `snippets/apcs-grade-reporter.liquid` not recognizing the `-frq-practice`
  handle suffix. Not on the board under any task I could find, same as the
  last two nights. Theme-repo work, human's call to claim.
- **P1, checker false positive, unresolved in code since 2026-09-05**: the
  `stale-year` check in `lib/site-crawl.js` (`staleSchoolYears`) still can't
  tell "aligned to the 2025-2026 CED" (evergreen, protected wording) from an
  actual stale-year claim. 142-151 of the nightly `stale-year` hits each of
  the last two nights have been this same false positive. Proposed fix
  unchanged from 2026-09-05's note: narrow the pattern to require an
  administration-specific phrase near the year rather than firing on any
  "2025-2026" substring.
- **P1, checker false positive, unresolved in code since 2026-09-05**:
  `deployLag` in `scripts/site-crawl.js` compares against `origin/main`
  without fetching first, so it reports a stale deploy against a local clone
  that is itself stale. Proposed fix unchanged: `git fetch origin main --quiet`
  before the `rev-parse`.
- **P1, real, found 2026-09-06, not yet on the board**: 9 product/content
  pages (cram kits, flashcards, reference sheets) have an updated
  "2026-27" SEO title but an un-updated "2025-2026" H1 or meta description,
  a checkout-page inconsistency on paid products. Full list and evidence in
  `docs/runs/2026-09-06-nightly-crawl.md`. Not verified again tonight; status
  unchanged from last night's finding until the next shard confirms it.

Nothing was at 5 nights or older as of last night, so nothing crosses that
threshold tonight either, since nothing aged (no crawl ran).

## Resolved since last night

None. Nothing was recrawled tonight to confirm a resolution.

## Coverage

Zero URLs crawled. Two live-crawl attempts, both aborted before completion by
operator error (see above), producing no shard coverage and no findings.
Tonight does not count toward the weekly shard rotation; whichever shard was
due tonight is still due.

## Auto-fix score

Not run. `scripts/autofix-scan.js` scores a crawl state file, and there is no
new one tonight.

## What was learned

An external timeout wrapped around a long-running script needs to know that
script's own internal deadline, not just guess a round number. 900 seconds
felt generous next to last night's 14-minute run, and it was still 400
seconds short of the script's own 25-minute ceiling, which is the number that
actually matters. And a CLI that silently accepts any flag it doesn't
recognize is one habit, "try `--help` when confused", away from starting the
exact expensive operation the operator was trying to avoid triggering by
asking first.
