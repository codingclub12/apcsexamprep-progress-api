# 2026-08-24 - The CED watcher's first run, and the two things it exposed

## The premise held

I built this watcher claiming Actions runners reach College Board and never
verified it. The first scheduled run, 2026-08-24 10:12 UTC, read **15 of 16
sources**, including all three multi-megabyte PDFs, and wrote a complete baseline:
13 files, 1,680 insertions on branch `ced-watch/snapshot`.

A useful cross-check fell out of it. The networking framework PDF came back at
2,101,433 bytes, byte-identical to the copy the EK extraction was sha-pinned to
in August. The framework has not moved.

## What failed, and why it should not have taken the run with it

```
pull request create failed: GraphQL: GitHub Actions is not permitted
to create or approve pull requests (createPullRequest)
```

A repo setting, off by default. The branch had already pushed and the report was
already in the job summary, and the run still went red having delivered nothing
legible, because one `gh pr create` under `set -e` took the job down on its last
line.

The PR step now catches the failure and treats two cases differently on purpose:

- **Permission refused**: warn, print the fix and a compare link into the job
  summary, exit green. The run genuinely succeeded; only its delivery was
  refused, and a red tick every Monday trains people to ignore Mondays.
- **Anything else**: still red, still exit 1.

Both branches were tested against a stubbed `gh`: permission error exits 0 with a
nine-line explanation, an unrelated error exits 1, success exits 0.

The real fix is one tick in **Settings > Actions > General > Workflow
permissions**, and the summary now says so in the place someone will read it.

## The missing source: csa-future-revisions

`https://apcentral.collegeboard.org/courses/ap-computer-science-a/future-revisions`
returns 403 and College Board's own branded page: "Sorry, this page isn't
available." It announced the CSA 10-unit to 4-unit rebuild; the rebuild shipped,
and the page retired with it.

Established rather than assumed: through the same transport and the same host,
`csa-course` returns 200 and this one returns 403, so it is the page and not the
egress.

**Removed rather than repointed**, because its job is covered twice over:
`course-changes-overview` is the program-wide announcement page, is already
marked critical, and already names Computer Science A; `csa-course` is the course
page itself. A dead critical source left in the list means every future run
reports an unreachable critical page, which is exactly how a real one stops being
noticed.

## A correction I made and then had to unmake

Testing by hand with `curl`, I found 15 of 16 sources returning 200 from this
session and concluded the workflow's "16 of 16 forbidden from a session" comment
was stale. I edited the comment to say so.

That was wrong. Same URL, same user-agent, one session:

```
curl        200
node fetch  403
```

`scripts/ced-watch.js` uses `fetch`. The original comment was correct and my
probe was measuring a transport the script does not use. The comment is restored,
with the per-transport split written into it, because the next person to check
this by hand will reach for curl and conclude the opposite of the truth.

It is not a user-agent block either: the script's own UA returns 200 through curl.

The source diagnosis above survives this, because curl does reach College Board,
so a 200-vs-403 comparison between two pages over curl is still a valid probe for
which page is dead.

## Evidence

```
full offline suite            ALL 101 SUITES PASS
node scripts/ced-watch.js --dry-run --only csa-future-revisions
                              HTTP 403 Forbidden, nothing written
PR step, stubbed gh           permission -> exit 0 + summary
                              other error -> exit 1
                              success    -> exit 0
```

## Still open

- **The Actions permission is not ticked.** Until it is, the watcher will keep
  saving snapshots and reporting into the job summary, and will not open PRs.
- **The first baseline is unmerged**, sitting on `ced-watch/snapshot`. Merging it
  accepts it as the comparison point for next Monday. Until something merges it,
  every week re-diffs against an empty baseline.
