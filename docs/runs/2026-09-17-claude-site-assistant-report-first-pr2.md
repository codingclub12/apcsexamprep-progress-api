# Site Assistant report-first rescope, PR 2: the widget and the page index

2026-09-17. Board 350. Sections 4 and 5 of
`docs/handoffs/Site-Assistant-Report-First.md`. PR 1 (sections 2 and 3) merged
earlier today as #705 and is live on `fc70ccd`.

## What changed

- `lib/assistant/page-index.js`, new. A table of every page and article on the
  storefront, built from the sitemap through `lib/storefront-fetch.js`. It
  refuses to prune below a credibility floor, because a Cloudflare challenge
  served with a 200 parses as a sitemap with zero URLs and would empty the index
  without erroring.
- `lib/assistant/find.js`, new. "Help me find a page". The model is handed a
  NUMBERED shortlist and may return integers; it never emits a URL. Every path is
  re-checked against the index on the way out, after ranking.
- `lib/assistant/thanks.js`, new. Section 5. One thank-you per report, ever,
  claimed by stamping `thanked_at` before the send rather than after.
- `public/apcs-widget.js`, new. Shadow DOM, three choices, one follow-up question
  on a vague report and never more than one.
- `public/apcs-flag.js`, new. "Flag this question", separate file on purpose.
- `scripts/build-page-index.js`, new, plus `npm run pageindex`.
- Theme: `snippets/apcs-site-assistant.liquid` and one line in `theme.liquid`.

## The thing worth reading: the widget was going to load on 62 assessment pages

`public/apcs-report.js` has carried this guard since Phase 0:

    /\/(unit-test|practice-exam|practice-test)/

It requires a SLASH before the term. The storefront does not name pages that
way. Measured against the live sitemap on 2026-09-17, sixty-two pages carry one
of those three words after a HYPHEN:

    /pages/ap-csa-practice-test-2d-arrays
    /pages/ap-csa-practice-test-arraylist
    /pages/ap-csa-array-practice-exam
    /pages/ap-computer-science-principles-practice-exam-2025
    ... 58 more

Every one of them is a page the widget would have mounted on, which is the exact
thing acceptance check 5 forbids. The rule is now anchored on a slash OR a
hyphen, and the new guard blocks 88 of the 91 assessment-shaped pages in the live
index with zero false positives on ordinary pages. The three it leaves open are
`practice-tests-by-topic` and `unit-tests-hub`, which are indexes OF tests rather
than tests, and that exception is asserted rather than left to be rediscovered.

**This was never live.** `apcs-report.js` is not referenced from any Liquid file
in the theme, which matches the handoff's own section 0 finding that no assistant
loader is on the storefront. So this is a latent defect caught before its first
deploy rather than an incident. `apcs-report.js` still carries the narrow guard;
it is Phase 0's file and nothing mounts it, and widening it was left out of this
PR rather than done quietly in passing.

## Two classification gaps the live crawl found

Both were found by running the build against the real sitemap rather than by
reading the classifier, and neither would have thrown:

- **The site spells the cyber course two ways.** `ap-cybersecurity-...` for
  lesson pages and `ap-cyber-...` for the quizzes. Listing only the long prefix
  left 27 cyber quizzes with no course at all.
- **An article's course is on its blog, not its handle.** A QOTD article is
  called `unit-2-cycle-2-day-7` and names no course anywhere in itself. Reading
  the handle alone left all 351 of them uncoursed; reading the blog
  (`/blogs/ap-csa-daily-practice/`) fixes every one. 33 remain uncoursed and
  should be: they are `/blogs/news`.

## Ranking had to be fixed too, and the measurement is why

"Where is the CSA loops lesson" returned three QOTD articles before type weights
existed, because 430 daily-practice articles carry "loops" in their titles and
each lesson page carries it once. A person asking where a lesson is does not want
a practice question about it. Lessons and hubs now score up, practice items and
assessments score down, and asking for a quiz explicitly scores quizzes back up.

## Evidence

    suite     smoke:assistantwidget    54 passed, 0 failed   (new)
              smoke:assistantrouting   87 passed, 0 failed
              smoke:assistantreport    95 passed, 0 failed
              assistantkb, diag, exfil, anon, student, reset, encoding,
              volumepaths, storefront: all green
    live      the page index built against the real sitemap: 2054 rows across
              five courses, and the 62-page finding above came out of it
    rederive  the assessment guard was run against every assessment-shaped page
              in that live index rather than against a list written by hand

`live` for the deployed endpoints is deferred until after the merge, where it can
observe something. The assertion to make then is that
`GET /api/assistant/widget-version` answers with a 12 hex character token, which
does not exist on the current build at all.

## What is NOT done

- **The theme PR is open and NOT merged**, on purpose. Merging it deploys to the
  live storefront with nothing between the click and a student's page.
- The page index has no nightly trigger yet. `npm run pageindex` builds it and
  the boot seed does not. Wiring it to the nightly sweep belongs with PR 3, which
  is where the scheduled work lives.
- Section 5 ships as a function rather than an endpoint. `thanks.markFixed()` is
  what PR 3's `PATCH /api/assistant/reports/:id` will call; putting the HTTP
  surface here would have taken it out of PR 3, where the handoff puts it.
- `REPORTS_TO` is still unset in Railway, so nothing delivers yet. Unchanged from
  PR 1 and still the one manual step.
