# The list of 17 was wrong about nine of them

2026-09-04. Board 233, following board 228 the same afternoon. The ask was "now
do the other 17 pages", meaning the group filed in
`docs/meta-description-gaps.md` under "Internal, gated, or test pages (17)".

Seven of them are being hidden. Nine must not be, and one is not a page.

## What the seventeen actually are

Measured live, no User-Agent, through `lib/storefront-fetch.js`. Sixteen return
200 with no robots meta and sit in `sitemap_pages_1.xml`. The seventeenth,
`cyber-teacher-teaching-hub`, is a 301 to `/pages/cyber-command-center`.

The split that matters is not what the pages are FOR, it is whether anyone has
invested in them ranking. `layout/theme.liquid` renders
`page.metafields.global.title_tag` when it is set and otherwise appends
` | APCSExamPrep.com`, so a title that does not end in the brand suffix is proof
that somebody set a custom SEO title by hand. That is a signal a session can
re-derive from the live HTML without an Ahrefs key or a GSC property, which
matters because this repo has neither working right now.

Nine of the seventeen carry one, or carry a written SEO page title:

    AP CSA Pacing Guide 2026-27: Full-Year Course Map        csa-command-center
    AP CSP Pacing Guide 2026-27: Full-Year Course Map        csp-command-center
    AP Cybersecurity Pacing Guide 2026-27: Full-Year Map     cyber-command-center
    AP Networking Pacing Guide: Full-Year Course Map         ap-networking-command-center
    AP CS Teacher Portal: Free Class Codes & Gradebook       cyber-class
    ... | Free Class Gradebook                               the three -teacher-dashboard pages
    AP Cybersecurity Study Resources | Free Practice...      ap-cybersecurity-supplemental-resources

"Command center" reads like an internal tool and four of them are pacing guides
competing for a teacher query with the exam year in the title. The name is what
made them look internal, and the name is not evidence.

The seven with no such investment:

    admin-tracker              prompts for the admin key
    ap-csa-code-editor-test    a shakedown checklist
    java-editor-test           no meta description at all
    cyber-dashboard            the teacher APP: gradebook, exports, join codes
    join                       student sign-in wall
    my-progress                student sign-in wall
    ap-csp-teacher-resources   premium content, its own page says the files
                               marked KEY are answer keys, for your eyes only

`cyber-dashboard` and `cyber-teacher-dashboard` are the pair worth pausing on,
because the handles differ by one word and the answers are opposite. The first
is the running application behind a sign-in. The second is its marketing page,
titled "Free Class Gradebook". Hiding the wrong one either exposes a gradebook
or deletes an acquisition page.

## Why the 301 had to be excluded rather than merely omitted

A MERGE on a handle Shopify cannot find CREATES a blank page at that handle.
`cyber-teacher-teaching-hub` currently redirects, so a sheet carrying it would
publish an empty record over a working redirect. `config/noindex-pages.json`
records it under `excluded.not-a-page`, and the generator refuses to build a
sheet if an excluded handle ever appears in a group.

That refusal is the point of naming exclusions in config rather than leaving
them absent. A future session will find the list of 17 again. "These ten are
missing" should be answerable without re-measuring the site.

## Evidence

    parse-back      2 sheets, 12 rows, MERGE, seo.hidden = 1, headers matched
    preflight       both clear to import
    mutation        24 of 24 red, each for its own rule
    live (pre)      24 assertions fail, exactly the 24 the two imports flip
    refactor        the cyber sheet is byte-identical to the merged version

That last line is the one that made the rename safe.
`scripts/cyber-unit-exam-noindex-csv.js` became `scripts/noindex-sheets.js` and
learned to loop over groups; the cyber sheet coming back byte-for-byte identical
is what says the generalisation changed no output.

The live verifier found a bug in itself on its first run, which is the second
time in two days a check has failed against its own logic rather than the world.
It reported `cyber-teacher-teaching-hub: expected a redirect, got 200`, because
`sf.raw` follows redirects by default and was reporting the destination's status.
It passes `follow: false` now. A checker that chases the redirect cannot tell a
working redirect from the blank page it exists to catch.

## What is still open

- **Neither sheet is imported.** `matrixify/internal-pages-noindex-pages.csv`
  and, from board 228, `matrixify/cyber-unit-exam-noindex-pages.csv`. Both are
  MERGE, both are Tanner's, and `node scripts/verify-noindex-live.js` goes green
  only after both land. It takes a group id to check one at a time.
- **The nine SEO pages have a real problem, just not this one.** They are the
  application and its landing page on one URL: `csa-command-center` ranks for a
  pacing-guide query AND holds a sign-in. `docs/site-audit-2026-08-positioning.md`
  already recommends the split, a marketing page plus a noindexed tool. That is
  content work, not an indexing patch, and nobody has scoped it.
- **`ap-csp-teacher-resources` has no marketing counterpart.** Hiding it removes
  the only page describing what the CSP teacher bundle contains. Worth a public
  page that sells it, with the file list and the keys behind the gate.
