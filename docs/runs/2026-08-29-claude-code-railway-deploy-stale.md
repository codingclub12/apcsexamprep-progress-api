# Production has not deployed since yesterday afternoon

Found by hand, after merging PR #400, because CLAUDE.md says a merge is a deploy
and to check the boot afterwards. The check said the boot was fine. It was the
same boot as the day before.

**Read the correction below before the rest of this note.** The first version
said no automated check was watching for this. One was, and had been failing for
two days. What follows is accurate about the outage; the section on "the check"
is the part that was rewritten.

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

## CORRECTION, 2026-08-31: a check already existed

**This section originally read "The check that would have caught it" and claimed
`scripts/site-crawl.js` had parsed the commit for a year and compared it to
nothing. That was wrong.**

`.github/workflows/deploy-drift.yml` has been on main since 2026-08-18. It runs
every thirty minutes, compares `/api/health`'s commit against main, and is the
better implementation of the two. Its own comments record the insight the first
version of this note presented as a discovery:

> the clock has to run from the OLDEST undeployed commit, not from main's head.
> Head age resets on every merge, so on a busy repo it is almost always inside
> the grace window and the alarm can only fire when the repo is quiet, which is
> the opposite of what is wanted.

It learned that on its first day and fixed it. It also separates *behind* from
*rollback* from *a commit this repository does not contain*, which `deployLag`
does not.

The mistake was method, not luck: the search was for how `site-crawl.js` used
`commit`, and `.github/workflows/` was never opened. Writing a check is the last
step, not the first.

### What was actually broken

**1. `RAILWAY_TOKEN` was never set.** `railway-deploy.yml` exists to fix a stall
by running `railway up` on every merge, and it ran for #400, #404, #406 and #410.
All four report `success`. The steps say why:

```
Is a Railway token configured   success
Install the Railway CLI         skipped
Deploy                          skipped
Confirm the new commit serving  skipped
```

Green while deploying nothing. The skip is deliberate (a job that reddens over a
missing setup step gets muted) but the merge checklist reads fine while nothing
ships. **Still unset as of 2026-08-31 20:00Z. Board task 142.**

**2. The alarm fires where nobody looks, and it flaps.** Runs 299-304 red,
305-307 green, 308-310 red, 311-312 green, then red from 313 (2026-08-28 19:17Z)
through 330. An alarm intermittently red for a week is one a person stops
opening. That is a delivery and signal-to-noise problem, not a missing check.

### So what `api-stale-deploy` is for

Delivery, and only delivery. `deploy-drift` reports into GitHub Actions; a
`site-crawl` finding lands in the nightly report that reaches a person. It is a
SECOND detector of the same condition and does not supersede the first: a change
to the grace window belongs in both, and the comment in `scripts/site-crawl.js`
says so at the call site.

Mechanics, unchanged and still true:

- The **gate** is the age of main's tip, so the deploy window after a merge is
  never a finding. Grace 30 minutes.
- The **number reported** is the age of the commit production serves. Firing for
  real, main's tip was 47 minutes old and the deploy was 23.1 hours dead;
  reporting the tip age would have said "0.8h".
- Silent in five cases where a finding would be a lie: served sha `unknown`,
  checkout is not main, inside the grace window, git unavailable, commit date
  unreadable.
- `site-audit.yml` now uses `fetch-depth: 0` so the served commit's date is
  resolvable. `deploy-drift.yml` already did this, for the same reason.

P1 and not P0 on purpose. Being behind is not itself an outage; what it costs
depends on what is in the gap.

Twenty assertions in `smoke/site-crawl.js`, both directions, git and clock
injected so every branch runs offline. 142 offline suites pass.

## How it ended

Production came current at some point between 12:42Z and 14:31Z on 2026-08-31,
serving `ff8409a` with `status: ok`, `integrity.ok`, and all five Unit 1 quiz
endpoints at `total=5`. The stall ran about 68 hours.

**It was not fixed.** `railway-deploy.yml` run 59, for the #410 merge at 14:31Z,
still shows Deploy skipped. Either Railway's own GitHub integration picked the
push back up or a human pressed Redeploy; which of those is not visible from a
Claude Code session. The fixer that exists for this is still inert, so the next
stall behaves exactly the same way.

## Still open, and needs a human

**Set `RAILWAY_TOKEN` and `RAILWAY_SERVICE`.** This is the one that closes the
loop. `railway-deploy.yml` already knows how to recover a stall; it has never
been allowed to. A repository secret holding a Railway PROJECT token (not an
account token, which would reach every project on the account) and a repository
variable naming the service is the whole setup. Board task 142.

**Why Railway stopped in the first place** is still unanswered, and is not
visible from a Claude Code session. Candidates: the deploy branch config
(CLAUDE.md already warns "verify the deploy branch config"), a failing build,
or auto-deploy switched off. Someone has to open the dashboard and read the
build log. Note that this matters less once the token is set, because the fix
stops depending on the diagnosis.

**Whether an alarm that flaps gets read.** `deploy-drift` was correct and
ignored for two days. Adding `api-stale-deploy` moves one copy of the signal to
a channel a person opens; it does nothing about the underlying flapping, and if
the nightly report starts carrying a red line every morning it will be tuned out
the same way. Worth revisiting the grace window or the flap itself rather than
adding a third place to look.

Until the token is set, a merge is not evidence a change shipped. Check
`/api/health`'s `commit`.
