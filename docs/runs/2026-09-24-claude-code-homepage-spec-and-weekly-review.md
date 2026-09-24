# Homepage redesign spec, and a weekly SEO and traffic review

2026-09-24. Board 405.

## What changed

- The homepage redesign requirements spec is in the theme repo as
  `docs/homepage-redesign-spec.md`: PR codingclub12/APCSExamPrep-theme#130, merged
  into `claude/site-linking-audit-yhufjk` as `2b61061`. It is docs only. Nothing
  under `docs/` syncs to Shopify, and the diff against `434ac6b` is that one file,
  md5 `9d948a03` on both sides. The theme repo is private, which is why the traffic
  figures and page findings live in the spec and not in this note.
- Three board tasks came out of it. 406 is a tier-separation finding on a public
  teacher page; the details are on the board and are left out here because this
  repo is public. 407 is two prices on the site that disagree with the store, which
  is NEVER_AUTO and Tanner's. 408 is the daily check described below, ready for an
  agent.
- A Routine, "Weekly SEO and traffic review" (`trig_01HGuvZLUhG1jnBF1DpzJYKG`),
  Mondays at 11:00 UTC, first run 2026-09-28. It reads and reports, and keeps its
  log on `claude/weekly-audit-log` in the theme repo.

## Why weekly and not daily

Tanner asked whether the research pass should run every day. It should not. It
cost about 1.6M subagent tokens and an hour, and what it measures (traffic mix,
search position, competitors) moves week to week, so six runs in seven would
repeat the seventh. It would also add a third morning fetch of a storefront that
the Actions audit and the Nightly site crawl already hit every day, when the Daily
site audit's own prompt says never to drive it twice in one morning.

Part of it does belong in the daily run: prices printed on pages against the
store, and file-host links on public pages. Those are cheap and deterministic, so
they should be crawler rules with mutation tests rather than a model reading
pages. That is board 408, and the weekly routine covers them by hand until it
lands.

## What was learned

**A routine created with `create_trigger` from a session gets no connectors and
may get no repos.** The create call came back with `sources: []` and a warning
that its sessions will run without connector tools, because this session had no
connector grants it could pass on. So the weekly routine cannot read Shopify
analytics until the Shopify connector is added to it in the claude.ai routines
UI. Its prompt opens with an `add_repo` step in case the repos are missing too.
Anyone making a routine that needs a connector should create it in the UI, or
finish it there.

**Both daily routines passed the stale prices and the public Drive link because
nothing in them compares what a page claims with what is true somewhere else.**
The crawler checks structure: status codes, headings, links. A price is only
wrong relative to the product, and a link is only a leak relative to what it
points at.

## Still open

- The Shopify connector on the weekly routine, which only Tanner can add. Until
  then its traffic section will say the connector is not available.
- Search Console is still not reachable. Ahrefs projects 9205271 and 9205272 have
  no GSC data, and the BigQuery project id is written down nowhere in this repo.
  It is the biggest gap in the SEO picture.
- The spec's "Decisions for Tanner" section, and board 406, 407 and 408.
