# Production has not deployed since yesterday afternoon

Found by hand, after merging PR #400, because CLAUDE.md says a merge is a deploy
and to check the boot afterwards. The check said the boot was fine. It was the
same boot as the day before.

## What is true

`GET https://progress.apcsexamprep.com/api/health` reports
`commit: 1bebfd0`. That is the merge of PR #403, **2026-08-28 14:15 Central**.
`BUILD_COMMIT` in `server.js` reads `RAILWAY_GIT_COMMIT_SHA`, which Railway
injects per build, so this is the commit Railway last built, not a cached value.

Merged to `main` since, none of it deployed:

```
10ba9e1  #406  ap-cyber-ced-alignment          today 13:2x
809c532  #404  assistant design feedback       today 12:37
bc5df77  #400  Unit 1 citations and claims     today 12:37
821f4de  #405  Cyber Unit 3 renumbering        yesterday 17:11
9814bbf  #397  confident-euler                 yesterday 14:36
cea3935  #399  ap-cyber-ced-alignment          yesterday 14:36
---
1bebfd0  #403  what production is running      yesterday 14:15
```

Watched `/api/health` for 43 minutes after the #400 merge. It never moved.

## Why nobody noticed, and why that is the finding

Nothing that runs changed in the gap. `git diff 1bebfd0..main` over `server.js`,
`db.js`, `routes/`, `public/` and `seed/` is empty. The 41 changed files are the
`lib/cyber-*` sheet builders and gates (build-time tooling; no server-side file
requires any of them), docs, import sheets, and one line in `package.json`
adding the `smoke:quiztogradebook` script.

So there is no outage and no student impact. Every Unit 1 quiz endpoint serves
`total=5`, and `integrity` reads clean.

That is exactly what makes it worth writing down. The pipeline broke at the
first merge after #403 and stayed broken through five more, invisibly, because
none of those merges happened to touch a route. The merge that reveals it is
whichever one first does, and by then the question "did my change ship?" will
have had a wrong answer for a while.

## The check that would have caught it

`scripts/site-crawl.js` has fetched `/api/health` and parsed its `commit` every
night for a year, and returned it in the run record. It never compared it to
anything. The comment above that code reads "the commit sha is the answer to the
question the status code cannot reach", which was true, and nobody asked the
question.

Added `api-stale-deploy`, P1:

- The **gate** is the age of main's tip, so the deploy window right after a
  merge is never a finding. Grace is 30 minutes.
- The **number reported** is the age of the commit production is serving. These
  are different numbers and confusing them is not hypothetical: when this fired
  for real, main's tip was 47 minutes old and the deploy was 23.1 hours dead.
  Reporting the tip age would have said "0.8h".
- Silent, deliberately, in five cases where a finding would be a lie: served sha
  `unknown` (no `RAILWAY_GIT_COMMIT_SHA`), checkout is not main, inside the
  grace window, git unavailable, commit date unreadable.
- `actions/checkout` defaults to depth 1 and cannot resolve the served commit's
  date, so `site-audit.yml` now asks for `fetch-depth: 0`. Without it the check
  still fires; it just cannot say how old the deployed code is, and it says so
  rather than implying a number.

P1 and not P0 on purpose. Being behind is not itself an outage; what it costs
depends on what is in the gap. The kind's `why` says so, so nobody has to
rediscover the reasoning to argue with the tier.

Twenty new assertions in `smoke/site-crawl.js`, both directions. `deployLag`
takes its git and its clock by injection so every branch runs offline with no
repo state. Verified against the live condition: fires, and reads
`production serves 1bebfd0, which is 23.1h old; main is 10ba9e1`.

142 offline suites pass.

## Still open, and needs a human

**Why Railway stopped.** Not visible from here: no Railway access from this
session. The candidates are the deploy branch config (CLAUDE.md already warns
"verify the deploy branch config"), a failing build, or auto-deploy switched
off. Someone has to open the Railway dashboard and read the build log.

Until that is answered, treat every merge as not-shipped, and check
`/api/health`'s `commit` before believing otherwise.
