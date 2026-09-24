# The new homepage, the two-door nav, and three missing pages

2026-09-24. Board 409. Follows board 405, which produced the spec.

## What changed

**Theme, PR codingclub12/APCSExamPrep-theme#131, left UNMERGED on purpose.**
Tanner asked to preview it on an unpublished theme before it goes live. Merging
it into `claude/site-linking-audit-yhufjk` deploys it within a minute.

- `sections/apcs-home.liquid`: the new homepage, built from
  `docs/homepage-redesign-spec.md` in the theme repo and a clickable mockup he
  approved. Two doors on every course (Full course, Exam prep), the 2027 exam
  table from `docs/ced-snapshot`, teachers, a bio with three testimonials quoted
  as the old homepage had them, six FAQs. A theme editor setting, Season, swaps
  whether Exam Prep or Full Courses comes first.
- `templates/index.json` points at it; the old custom-liquid section file is
  untouched.
- `sections/header.liquid`: the hidden legacy header's homepage-only `h1`
  became a `div`, so the homepage has one H1.
- `snippets/apcs-nav-source.liquid`: the four per-course menus became two
  full-width menus, Full Courses and Exam Prep, each listing all four courses,
  on desktop and in the mobile drawer. Teacher bundles moved from the top of
  every student course menu into Teachers. No script changed.

**This repo.** Three new page bodies and the sheet that creates them:

    shopify/ap-csp-exam-format.html     was 404
    shopify/ap-networking-labs.html     was 404
    shopify/about.html                  was a 301 to the tutor page
    imports/2026-09-24-new-pages/new-pages.csv
    scripts/build-2026-09-24-new-pages-sheet.js   (+ new-pages-2026-09-24.json)
    scripts/verify-new-pages-0924-live.js         the post-import check
    smoke/new-pages-2026-09-24.js                 npm run smoke:newpages0924

The homepage and nav link these three pages only once they exist
(`pages[handle].id` in Liquid), so the sheet and the theme PR can land in either
order without a 404.

## Evidence

- Every link in the homepage and nav resolves: 91 of 98 mockup links were in
  the live sitemap, and the other 7 are the cart, search, collections/all, the
  about redirect and three noindexed pages that answer 200 when fetched.
- Theme: pure ASCII, `mojibake-rederive` agrees, and `verify:ad-gate`,
  `verify:nav-role`, `verify:qotd`, `verify:csa-x2` and `verify:csa-slides`
  pass locally. JSON-LD parses. Rendered in Chromium at 1366/1440 and 390px:
  no horizontal overflow, each menu opens, opening one closes the other,
  Escape closes, no script errors. Those renders approximate the Liquid; the
  preview theme is the real check.
- Sheet: 3 rows, parsed back byte for byte, `matrixify-preflight` clear,
  md5 `9167592131fba63bb564733b60462365`. Each builder rule was broken on
  purpose and went red on its own (eleven of them); that run is now the smoke.
- `verify-new-pages-0924-live.js` FAILS today on all three pages (404, 404,
  301), which is the point: it asserts what the import makes true.

## What was learned

- **The builder earned its keep twice before anything shipped.** The page bodies
  written by a subagent copied an old rule that hides
  `.template-page h1:first-of-type`, which can hide the page's own H1. The
  scoping rule refused it. The theme already hides Shopify's title sitewide in
  `layout/theme.liquid`, so no page body needs that rule.
- **Two sources disagree about the testimonials.** The homepage labels Kamal and
  Mimi AP CSP, the tutor page labels them AP CSA, and the Emily quote is worded
  differently on the two. The homepage keeps the old homepage wording; Mimi's
  caption no longer names a course. Worth settling against Wyzant.
- **The results numbers were dropped everywhere**, not only on the homepage:
  54.5% and 34.8% fives, 1,845+ hours, 451 reviews. None carries a year, which
  the spec asks for. They can come back with a source and a year.
- A missing-page scan found almost nothing truly 404: 29 of 30 sampled dead
  links now 301 to a live page, because a bulk redirect set landed after the
  2026-09-02 audit. `/pages/intro-java` and an index for the 41
  `intro-java-help-*` pages are the remaining candidates; not built here.

## Still open

- Tanner: preview theme PR #131, then merge it; import the sheet; run
  `node scripts/verify-new-pages-0924-live.js`; set the homepage title and
  description in Online Store > Preferences; delete the now-inert
  `/pages/about` redirect.
- The sitewide footer from the spec is not built yet.
- Boards 406 (Drive answer key on the Cyber teacher resources page) and 407
  (two prices) are unchanged by this work, though the new nav and homepage no
  longer link the first or print the second.
