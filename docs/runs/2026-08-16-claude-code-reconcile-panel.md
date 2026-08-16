# 2026-08-16 - a reconcile button where the verify click already is

Agent: Claude Code. Branch: `claude/board-reconcile-button-vaw0hu`, off `main`.

Answering "should this be a button on my /admin/command page?" - yes for the
button, no for the work.

## The split, and why

The button belongs on the board because that is where the verify click already
is. Going to GitHub for evidence and back to the board to click verify is exactly
the friction that parked the Command Center in the first place.

The WORK does not belong on Railway:

- `scripts/verify-artifact.js` paces at 1.2s between fetches and backs off up to
  16s on a 429. Twelve tasks is potentially minutes of a request held open on a
  1 vCPU / 1GB box that also serves students. The $169 leak is the standing
  reminder about things that hold resources longer than expected.
- Outbound fetches from the API put the PRODUCTION API's IP in front of
  Cloudflare's rate limiter. Getting throttled there couples a maintenance task
  to the thing students use.
- A GitHub runner is isolated, free, and already has the network path.

So: the runner fetches, the page points at it.

## What was added

A `reconcilecard` panel on `/admin/command`, mirroring the `chatcard` above it:
a "Run it on GitHub" link to the `verify-board.yml` workflow, a "Last run" link,
and a line saying when it last ran and whether it passed.

The last-run lookup runs in the BROWSER against GitHub's public API, not from the
server. Three reasons: the repo is public so no credential is needed, nothing is
added to this page's render path, and the rate limit spent is the operator's
rather than one shared by every request the server handles. It degrades to a
plain working button if GitHub cannot be reached.

## The XSS discipline, because this page has form

Every value in that panel comes from an external API, and `utils.js` records that
this product already shipped one stored-XSS hole through interpolation into
`innerHTML` behind an escaper that was a no-op. So:

- all external values go through `textContent`, never interpolation
- `run.html_url` is pattern-checked against `^https://github\.com/` BEFORE it is
  assigned to an `href`, because an href is executable surface and a
  `javascript:` URL there runs

Both are asserted in `smoke/command-center.js` rather than left to review.

## What was NOT built, deliberately

**Triggering the workflow from the page.** That needs a GitHub token with
`actions:write` stored on the API: a new credential with write access to the repo,
living on the box, purely to save one tap. Against a fail-closed posture that is
a bad trade.

**Findings rendered inline next to each task.** That is the better UX and it
needs a design decision I should not make alone: `POST /api/command/checks`
exists and fingerprints on `(source, check_id)`, but checks auto-CREATE tasks,
while a verify-board finding is evidence about a task that already exists.
Recording "banner still ships" as a check would open a second task beside #70
rather than annotating it. Worth designing against real findings rather than
imagined ones, which means pressing the button first.

## Evidence

```
npm run smoke:command   64 passed, 0 failed   (was 58; six new panel assertions)
all 59 offline suites   pass
```

The new assertions cover: the panel exists and points at the workflow, it says
the work runs on a runner rather than here, it says it writes nothing and that
`verified` stays a human click, external values use `textContent`, the href is
validated before assignment, and the panel degrades to a working button when
GitHub is unreachable.

Booting the real server and fetching `/admin/command` without a session returns
the login page and no panel, which is the existing access rule working rather
than a fault.

## Still not done

The pass itself. Two buttons now exist and neither has been pressed. Every
measurement in this note is local.
