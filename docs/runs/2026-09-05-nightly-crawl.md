# Nightly crawl, 2026-09-05

Shard 4/7, 395 URLs crawled, 672 requests, 14 minutes, not aborted, not truncated.
Baseline restored from `claude/nightly-crawl-log` (2 nights of prior state, max
observed age on any current finding is 3 nights).

## On fire

One real thing. AP Cybersecurity Unit 1's FRQ practice page grades students and
never tells the server.

## New tonight

**P0. `ap-cyber-unit-1-frq-practice` has a gradeable widget and no working score
path.** The page carries `data-item-id="unit-1-frq"` and a `.check-btn`, so a
student works through "Credential Compromise at a Public Library" believing it
counts. It does not reach `/api/student/progress` at all.

Reproduced live and traced to cause. The scoring logic that the crawler expects
under the name `apcs-score-reporter.js` actually lives inline, injected by
`snippets/apcs-grade-reporter.liquid` in the theme repo (APCSExamPrep-theme),
gated on `page.handle contains 'ap-cyber-unit-'`. Inside that script, `activity`
is resolved from the handle by three patterns only:

- `^ap-cyber-unit-(\d+)-exam$` (activity = exam)
- `^ap-cyber-unit-(\d+)-lesson-(\d+)$` (activity = lesson, via `APCS_CYBER_LESSON`)
- `^ap-cybersecurity-unit-\d+-[a-z0-9-]+$` excluding `-exercise-N`, `-lab`,
  `-quiz`, `-exam` suffixes (activity = lesson, via `data-lesson-id`)

`ap-cyber-unit-1-frq-practice` matches none of the three, so `activity` stays
null and the function returns at its own guard (`if (!activity) return;`)
before any listener is attached. Nothing throws, nothing logs. The script's own
header comment only documents LESSON and EXAM activity types, so this was
likely never wired for FRQ practice rather than broken by a later change.

`apcs-frq-device-security-analysis` (the main, non-unit-scoped FRQ practice
page) almost certainly shares this gap since it is built from the same snippet
and handle convention, but it was not in tonight's shard and I am not claiming
it broken without having looked tonight.

What I would do: add an `-frq-practice` (or the exact convention Tanner wants)
branch to the activity resolver in `snippets/apcs-grade-reporter.liquid`,
mirroring the `exam` branch (report once every check-btn on the page has been
answered), then verify live that a completed practice page posts to
`/api/student/progress`. This is theme-repo code and a storefront deploy the
moment it merges, so it is a human's call, not mine tonight.

Not on the board under any task I could find (checked for "frq", "unit-1-frq",
"apcs-grade-reporter", "activity" — closest are #81, #136, #196, none of which
are this).

## A checker bug, not a site problem

**120 of tonight's 121 P1 findings are the same false positive.** The
`stale-year` check flags "2025-2026" and its variants as a school year that
ended, using text pulled from title, meta description, and H1. Sampled about a
dozen of the 120 across CSA, CSP, blog, product, and two completely unrelated
utility pages (`/pages/contact`, `/pages/data-sharing-opt-out`) and every one
is the phrase "aligned to the 2025-2026 [4-unit curriculum / CED / exam format /
Big Ideas curriculum]". That is the CED-vintage label this repo's own CLAUDE.md
says to use permanently ("AP CSA references use the 2025-2026 4-unit structure
exclusively"), not a claim about the current calendar year. The check in
`lib/site-crawl.js` (`staleSchoolYears`) has no way to tell "aligned to the
2025-2026 curriculum" (evergreen) from "prep for the 2025-2026 school year"
(genuinely stale now that we're in 2026-2027). None of the dozen sampled were
the second kind.

What I would do: in `staleSchoolYears` (or its caller in `checkPage`), skip a
match when it is immediately preceded by "aligned to the", "covering", or
similar curriculum-label phrasing, or keep a short allowlist of the exact
boilerplate phrases this site uses for CED vintage. This needs a mutation test
of its own once it lands, per repo convention: inject a genuine "get ready for
the 2025-2026 exam season" style claim and confirm it still fires.

Also incidentally noticed while sampling: the exact fallback meta description
("AP CSA practice questions, study guides, and exam tips covering this topic.
Aligned to the 2025-2026 4-unit curriculum...") is served verbatim on pages that
are not CSA content at all, including `/pages/contact` and
`/pages/data-sharing-opt-out`. Not a crawler finding (grammatically fine text,
so nothing in `lib/site-crawl.js` catches it) and not independently verified
beyond the two pages above, but worth a human's look: a generic/default meta
description appears to be applying somewhere it should not.

**The `api-stale-deploy` P1 is also a false positive, and it is mine, not the
site's.** It compared production's served commit (`b84635e`) against the
session's locally cached `origin/main` ref, which was stale at crawl time
(`5282fc5`, an ancestor of `b84635e`). A `git fetch origin main` run minutes
later, plus `/api/health` fetched fresh, both confirm `b84635e` is in fact the
current tip of `origin/main`: production is fully current, not behind. The
check itself (`deployLag` in `scripts/site-crawl.js`) trusts whatever
`origin/main` already resolves to locally rather than fetching it fresh before
comparing, so any night where the container's clone predates a same-evening
merge to main will produce this same false alarm. Worth a `git fetch origin
main --quiet` immediately before the `rev-parse` in `deployLag`.

**Net for tonight: 1 real finding (the P0), 0 real P1s.**

## Still open

Nothing older than 3 nights: this baseline only goes back that far, so there is
no long-standing crawl finding to call out by name yet.

## Resolved since last night

- `h1-duplicate` on `/pages/ap-networking-command-center` (2 nights open). Not
  independently re-verified beyond the recrawl; the page now has one H1.

## Coverage

Shard 4/7, 395 of 2,095 sitemap URLs (full rotation is 7 nights), 672 requests,
~14 minutes, no throttling, no abort.

## Auto-fix score

`scripts/autofix-scan.js`: 0 of 565 findings scored eligible. Top blocking
reason: `h1-duplicate` (290x) is not on the allow list, followed by `stale-year`
(120x, though see above, this whole kind needs a checker fix before it is worth
scoring) and `title-overlong` (102x). The one P0 is blocked as theme-repo work,
which the router already refuses to route around.

## P2 / P3, counts only

- `h1-duplicate` (P2): 291 total, 194 fresh tonight. Not verified individually
  per playbook. Two worked examples where the duplicate looks like a real
  authoring pattern rather than noise: FRQ solution pages carry both a
  navigation-style H1 ("2021 AP CSA FRQ 3: ClubMembers") and a second, shorter
  content H1 ("2021 AP CSA FRQ 3: ClubMembers - Complete Solution") — seen on
  both `ap-csa-2021-frq-3` and `ap-csa-2024-frq-3`, so probably a shared FRQ
  template rather than two isolated authoring mistakes.
- `title-overlong` (P3): 102 total, 94 fresh. Worth a name: two separate blog
  handles, `unit-4-cycle-2-day-18-arraylist-autoboxing` and
  `unit4-cycle2-day-18-arraylist-autoboxing`, serve byte-identical titles and
  content under different hyphenation. That is duplicate content on two URLs,
  not just a long title, and is the one `duplicate-title` finding tonight.
- `h1-is-title` (P2): 33 total, 26 fresh. Pattern: pipe-delimited SEO titles
  reused verbatim as the H1 (e.g. "2016 AP CSA Free Response Questions | All
  Solutions & Scoring").
- `meta-scraped` (P2): 13 total, 8 fresh. Pattern: meta description built from
  concatenated page furniture (breadcrumbs, "Practice Question", entity-escaped
  ampersands) rather than authored copy, mostly on `ap-csp-daily-practice` blog
  posts.
- `brand-doubled` (P2): 3 total, all fresh, all AP CSP game pages
  (`ap-csp-game-binary-conversion-race`, `-spot-the-bias`, `-two-sides`): title
  ends "... | APCSExamPrep.com | APCSExamPrep.com".

## What was learned

A checker producing 120 same-shaped false P1s in one night is worse than
producing none: it is exactly the "wallpaper" failure mode the playbook warns
about, just arrived early instead of after a week. Worth fixing the check
before tomorrow night repeats the same 120 (plus whatever the next shard adds)
under a fresh "nights: 1" count that actually means nothing changed.
