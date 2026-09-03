# 2026-09-03 auditor sweep: CSP Big Idea 3, Create Task scaffolding, slides, CSA bundle

Agent: read-only auditor. Verified nothing, merged nothing, edited nothing.
Every claim below was checked against the live storefront (`www.apcsexamprep.com`)
today, 2026-09-03, or against the progress API's read-only command digest.

**Instrument note.** `lib/storefront-fetch.js` does not exist in this repo under
that name. The equivalent, already-vetted pattern this sweep used instead is
`scripts/site-crawl.js`'s `fetchOnce`/`polite` (browser User-Agent, single
threaded, 1000ms floor, manual redirect following with hop counting,
exponential backoff on 429/503, 5-strike abort) plus `lib/site-crawl.js`'s
`looksLikeChallenge` / `stripCode` / `parse` for Cloudflare-interstitial and
script-block safety. Reimplemented verbatim in the scratchpad rather than
inventing a new fetch path. Roughly 420 live requests total across the sweep,
single threaded, one 503 encountered (see WITHDRAWN).

---

## RANKED FINDINGS

### 1. PROVEN, P0-class, money-adjacent: the CSA Teacher Superpack's own headline promises "Slides" that do not exist anywhere on the site, gated or not

**Evidence.** `/pages/ap-csa-teacher-superpack` (200, confirmed live) carries the
H1 **"AP CSA Teacher Superpack | Slides + Resources for All 4 Units"** and body
copy "Each unit includes slides and lesson resources aligned to every lesson,"
plus a per-unit breakdown line for each of the 4 units starting with the word
"Slides" (e.g. "Slides - Primitive types - String methods - Math class -
Obje[ct...]"). `/pages/ap-csa-teacher-resources`, the page that would naturally
host a download/gate for that promise, is not a second page: it 301-redirects
to the same `ap-csa-teacher-superpack` URL (confirmed: `redirects:1,
finalUrl: .../ap-csa-teacher-superpack`). That one page contains **zero**
`.pptx` links, **zero** `docs.google.com/presentation` links, and **zero**
`data-apcs-slides` gate containers (all three counted at 0 by direct string
count against the raw body). There is no `config/csa-slide-manifest.js` or
`config/csa-slide-embeds.js` in this repo (confirmed by directory listing), no
CSA path condition in the theme's `layout/theme.liquid` (confirmed by reading
the connected branch's file directly), and a live CSA lesson page
(`ap-csa-lesson-1-1-intro-algorithms`) loads no `apcs-slides-gate.js` and no
slide container.

**Contrast.** CSP's parallel sales page, `ap-csp-teacher-superpack`, uses the
identical marketing template and promise ("Slides + Resources for All 5 Big
Ideas"), and for CSP that promise is backed: `ap-csp-teacher-resources` is a
**separate, non-redirecting** live page (confirmed: `redirects:0`) carrying 35
explicit `data-apcs-slides` gate containers, and the backend
(`config/csp-slide-embeds.js`) has a Google Slides `embedUrl` for **224 of 224**
possible deck slots (35 lessons x day-count x 2 variants x 2 tracks), i.e. 100%
converted.

**Blast radius.** Every teacher who has already bought, or is considering
buying, the AP CSA Teacher Superpack. It is the bundle's own H1, not a buried
line.

**Confidence: PROVEN.** Both the absence (git-level: no manifest, no theme
condition, no files on the one candidate page) and the promise (live page
title, H1, and body text, fetched today) are directly observed, not inferred.

**What this instrument cannot see:** whether slide decks for CSA exist as
*raw files* somewhere Tanner distributes by hand outside the storefront (email,
Drive share sent after purchase). This sweep can only say the storefront itself
carries no delivery path, gated or ungated, for what its own sales copy
promises.

### 2. PROVEN, P0-class, money-adjacent: the CSP bundle's "free" button is a live redirect straight to the $249 paywall

**Evidence.** `/pages/ap-csp-teacher-superpack` carries a banner ("Free Big Idea
1 Superpack, no purchase needed") and two buttons ("Free BI1 Preview, no
purchase needed") all pointing at `/products/ap-csp-big-idea-1-superpack-free`.
That URL now answers HTTP 200 (it was flagged dead, board task 160, as of
2026-09-02's sweep) **but only because it 301-redirects** to
`/products/ap-csp-teacher-superpack` (confirmed: `redirects:1, finalUrl:
.../ap-csp-teacher-superpack`, title "AP CSP Teacher Bundle: All 5 Big Ideas,
Full Course", H1 "AP CSP Teacher Course Bundle") -- the full-price product, not
a free preview. A teacher who clicks "no purchase needed" lands on the page
asking for the purchase.

**Contrast, and the asymmetry Tanner's question was aimed at.** CSA's
equivalent button on `ap-csa-teacher-superpack` ("Free Unit 1 Preview") points
at `/products/ap-csa-teacher-superpack-free-preview`, which is a genuinely
distinct, non-redirecting, live, free product (confirmed: `redirects:0`, title
"Free AP CSA Teacher Bundle: Unit 1 Lessons & Quizzes", H1 "AP CSA Unit 1
Teacher Course Bundle - Free Preview"). **CSA's version of this defect was
already fixed** (round 2 of `docs/runs/2026-09-02-claude-code-dead-internal-links.md`,
"3 buttons... all three 404... exactly one live product is that free preview").
**CSP's has not been**, and it is the mirror image of what board #91 asked
about: this is CSP's bundle page, not CSA's, that currently misleads a buyer.

**Blast radius.** Every prospective CSP-bundle buyer who clicks the free-preview
affordance; 3 occurrences on one page.

**Confidence: PROVEN.** Status, redirect count, and destination title/H1 all
read live, today.

### 3. PROVEN, high confidence: board #163 (CSP exercise-2) shipped live; two of its claims are stale ledger debris

**Evidence.** All 35 `ap-csp-course-bi{N}-{slug}-exercise-2` handles now return
200 (fetched live, just now). Board #163's own 2026-09-02 report listed exactly
17 as 404 (bi-1 x4, bi-2 x4, bi-4 x3, bi-5 x6); every one of those 17 is 200
now. The command digest (`GET /api/command/digest/r/<token>`) independently
confirms: task 163 is `status: done, bucket: closed`, artifact
`https://www.apcsexamprep.com/pages/ap-csp-course-bi1-collaboration` (one of the
previously-dead handles, now live). **This answers the "is #163 stale" question
directly: it is not stale in outcome, it shipped**, sometime between
2026-09-02's report and this sweep.

What IS stale: the digest's own `stale` bucket lists two claims (55 and 56)
against task 163, ages 1210 and 1205 minutes (~20 hours, matching the brief's
"claims 20h silent" almost exactly), still holding file locks on
`scripts/csp-pages-csv.js`, `scripts/csp-exercise-2-live-status.js`,
`smoke/csp-course-pages.js`, and two deploy-gate/fixture files. The task is
done; the ledger has not been told to release it.

**Blast radius.** Not a student-facing defect. Costs the NEXT session that
needs to touch any of those 4 locked files and gets a 409 naming a claim whose
work already landed.

**Confidence: PROVEN** (live handle re-check plus independent digest read,
two sources agreeing).

### 4. PROVEN, medium confidence on severity: the CSP Create Task Bridge and Rescue Kit are unreachable from every navigation surface a student would use

**Evidence.** There are 5 live Create Task URLs: `ap-csp-course-create-task`
(the interactive Builder, 3-language code checker), `ap-csp-create-task-practice`
(the "bridge," 4 ramp-up problems), `ap-csp-create-task-ultimate-guide` (the
rubric walkthrough), `ap-csp-create-task-rescue-kit`, and
`ap-csp-create-task-guide` (confirmed a 301 to `-ultimate-guide`, not a
duplicate). Checked the outbound Create-Task links on every page a student or
teacher would plausibly start from: `ap-csp-course` (hub), `csp-command-center`,
`ap-csp-teacher-resources`, a Big Idea 3 lesson page
(`ap-csp-course-bi3-undecidable-problems`), a Big Idea 3 coding page
(`ap-csp-topic-3-18-code`), the Builder page itself, and the Ultimate Guide page
itself. **Every one of the seven links to the Builder and/or the Ultimate
Guide. None link to `-practice` or `-rescue-kit`.** This reconfirms, unchanged
16 days later, the "still open" item in
`docs/runs/2026-08-20-claude-code-create-task-bridge.md`.

**On content, this is a smaller gap than the framing implies.** Between the
Builder (6-requirement live code checker in Python/JavaScript/Java) and the
Ultimate Guide (explicit "Row 1" through "Row 6" sections, three full worked
sample projects each with live embedded code and a rubric analysis, a written-response
worked example for Row 5 and Row 6, a pre-submission checklist, and project
ideas), all five components Tanner named -- program purpose, data abstraction,
procedural abstraction, algorithm implementation, testing -- are covered with
real depth (confirmed via targeted text search: "Row 2: Data Abstraction," "Row
4: Procedural Abstraction," "Program Purpose and Function," "Testing Response
Example (Row 6)" all present verbatim). The gap is that two of the four pages
are orphaned, not that the content is thin.

**Blast radius.** Every CSP student doing the Create Task who does not already
know the bridge/rescue-kit URLs. The bridge in particular is the one page
purpose-built to ramp a student from "simple problem" to "the six-requirement
program," so its unreachability costs exactly the students who need the ramp
most.

**Confidence: PROVEN** for the link absence (7 pages checked, 0 links found).
**Judgement call, not measured here:** whether that constitutes "no scaffolding"
(Tanner's framing) or "scaffolding that exists but is badly linked" (what was
found). Recommend a human read the two orphaned pages before deciding.

### 5. PROVEN, low severity, honestly labeled: 62 of 70 CSP topic-exercise handout pages are still mirror-only, and Big Idea 3 carries the majority of them

**Evidence.** Handle `ap-csp-topic-{U}-{L}-exercise-{1,2}`, the online companion
to the printed Teacher Course Bundle handouts (a SEPARATE page family from the
course-bi exercise-2 above; see the naming-trap note below). All 70 return 200,
live, right now -- no 404s. Of those, only Big Idea 1's 8 pages (4 topics x 2)
carry an auto-graded MCQ check; the remaining 62, **including all 36 of Big
Idea 3's**, render the honest disclosure text confirmed present on sampled live
pages: "the auto-graded half is not written for this topic yet. Nothing on this
page is scored or sent to your teacher."

    Big Idea 1 (4 topics, 8 pages):   8 graded, 0 mirror-only
    Big Idea 2 (4 topics, 8 pages):   0 graded, 8 mirror-only
    Big Idea 3 (18 topics, 36 pages): 0 graded, 36 mirror-only
    Big Idea 4 (3 topics, 6 pages):   0 graded, 6 mirror-only
    Big Idea 5 (6 topics, 12 pages):  0 graded, 12 mirror-only

**This is not a Big-Idea-3-specific gap** -- BI2, BI4 and BI5 are equally 100%
mirror-only, and only BI1 has any authored checks. What makes BI3 the
reasonable one to name is size: it alone is 36 of the 62 (58%) mirror-only
pages, because it is 18 of the course's 35 topics.

**Blast radius.** Every student following the printed handout's "also available
online, auto-graded" line on any topic outside Big Idea 1. Low severity because
the page tells the student plainly that nothing is scored, rather than silently
failing to record a grade.

**Confidence: PROVEN**, all 70 fetched live.

---

## THE FULL PER-LESSON GAP TABLE, ITEM 1 (CSP Big Idea 3 vs. the other four)

Every page type inventoried, all 35 lessons, fetched live today. NB: two
different generators both use the string "exercise-1" informally; the REAL
live handle for BI3's guided code problems is `ap-csp-topic-3-{N}-code`, not
`ap-csp-course-bi3-{slug}-exercise-1` (that guess 404s 18/18 -- see WITHDRAWN,
this was almost filed as a defect and is not one). Guided notes also split into
two handle schemes exactly on the BI3 boundary; both were spot-checked before
the full sweep, per the "find the function that resolves the naming" rule.

| page type | handle scheme | BI1 (4) | BI2 (4) | BI3 (18) | BI4 (3) | BI5 (6) |
|---|---|---|---|---|---|---|
| lesson | `ap-csp-course-bi{N}-{slug}` | 4/4 live | 4/4 live | 18/18 live | 3/3 live | 6/6 live |
| exercise-1 / "code" (BI3 only, by design) | `ap-csp-topic-3-{N}-code` | n/a | n/a | **18/18 live, 4 problems each** | n/a | n/a |
| exercise-2 (practice game, gradebook column) | `ap-csp-course-bi{N}-{slug}-exercise-2` | 4/4 live | 4/4 live | 18/18 live | 3/3 live | 6/6 live |
| guided notes | course-bi scheme (BI1/2/4/5) or topic scheme (BI3) | 4/4 live | 4/4 live | 18/18 live | 3/3 live | 6/6 live |
| unit test / exam | `ap-csp-course-bi{N}-unit-test[-part-a/b]` | 1/1 live | 1/1 live | 2/2 live (part A+B) | 1/1 live | 1/1 live |
| topic handout companion, auto-graded | `ap-csp-topic-{U}-{L}-exercise-{1,2}` | 8/8 graded | 0/8 graded | 0/36 graded | 0/6 graded | 0/12 graded |
| topic handout companion, live at all | same | 8/8 live | 8/8 live | 36/36 live | 6/6 live | 12/12 live |
| slides (by-day gate, self-mounted) | theme script, all `ap-csp-course-bi*` paths | yes | yes | yes | yes | yes |

**Net verdict on item 1: on every dimension actually inventoried, Big Idea 3 is
at least as complete as, and on exercise-2 specifically now MORE complete than,
the other four Big Ideas.** The one real, live, confirmed gap (auto-graded
checks on the topic-handout pages) is shared identically across BI2/3/4/5; BI3
is simply the largest slice of it by lesson count.

---

## ITEM 3: SLIDES, MECHANISM AND COVERAGE

**The mechanism** (confirmed by reading the theme repo's connected branch
directly, and cross-checked against 35 live page fetches):

1. A client-side component, `assets/apcs-slides-gate.js` in the
   `APCSExamPrep-theme` repo, mounts on any `[data-apcs-slides]` container, or
   self-mounts onto a `.lesson-page[data-course="ap-csp"]` wrapper by parsing
   `ap-csp-course-bi<N>-<slug>` out of the URL and resolving the slug against a
   hardcoded `CSP_TOPICS` table.
2. On demand (button click, not page load) it calls
   `GET https://progress.apcsexamprep.com/api/slides/:course/:lessonId`
   (`routes/slides.js`, this repo), which re-verifies a teacher or student JWT
   itself and returns `locked` unless `lib/entitlements.js` says the caller is
   entitled to that course's bundle.
3. Unlocked decks come from a hand-maintained manifest
   (`config/csp-slide-manifest.js`, filename-derived Shopify CDN `.pptx` URLs)
   plus an optional Google Slides `embedUrl`
   (`config/csp-slide-embeds.js`, opaque IDs from a Drive conversion sheet).
   A deck with an `embedUrl` renders inline in one reused iframe viewer with
   fullscreen and a download link; a deck without one is download-only.
4. `config/slide-manifests.js` selects a manifest by course
   (`ap-csp` and `ap-cybersecurity` only) so the route never branches on course
   name itself; an absent course 404s.

**Where it is wired live, confirmed both in git and by fetching live pages
today:**

`layout/theme.liquid` on the connected branch (`claude/site-linking-audit-yhufjk`,
which IS what serves production -- checked directly, not inferred) includes the
script only when `request.path == '/pages/ap-csp-teacher-resources'` **or**
`request.path contains '/pages/ap-csp-course-bi'`. Fetched all 35 CSP lesson
pages live: **35/35 load `apcs-slides-gate.js`.** `ap-csp-teacher-resources`
carries 35 explicit containers (counted directly in the body). Backend
conversion for CSP is **224 of 224** possible deck slots with a Google Slides
`embedUrl` -- 100%.

Minor, unmeasured note: because the Liquid condition is a path-prefix match,
the script also loads on the 35 exercise-2 pages and 6 exam pages under the
same `ap-csp-course-bi` prefix (confirmed by the same fetch). Whether it mounts
anything there (those pages likely lack the `.lesson-page[data-course=ap-csp]`
wrapper the JS checks for) was not click-tested; flagged as NOT MEASURABLE from
here.

**Coverage numbers, the deliverable this item asked for:**

| course | lesson pages with the gate script | backend manifest | backend conversion |
|---|---|---|---|
| **CSP** | 35 of 35 (100%) | all 35 lessons, all days/variants/tracks | 224 of 224 embeds (100%) |
| **Cyber** | **0 of N** (confirmed 0/1 sampled live lesson page, 0 by construction per theme.liquid: no cyber path condition exists) | Units 1-2 only, 9 of 24 lessons, by design (`config/cyber-slide-manifest.js`'s own comment: Units 3-5 use one whole-lesson deck each, incompatible with the by-day model) | 70 of 70 embeds for the 9 covered lessons (100% of that scope) |
| **CSA** | 0 of 53 (confirmed 0/1 sampled live lesson page; 0 by construction: no `config/csa-slide-manifest.js` exists at all) | none | none |

**If the mechanism differs between pages, report each variant -- it did:**

- **CSP variant**: fully wired end to end, live today. Finishing "the rest of
  CSP" is essentially done (100%/100%).
- **Cyber variant**: the backend is fully built and fully converted for its
  planned scope (Units 1-2), and `routes/slides.js` already serves it under
  `ap-cybersecurity` -- but **nothing on the live storefront ever calls it.**
  No theme.liquid condition, no lesson page markup, no `data-apcs-slides`
  container anywhere (confirmed on the bundle page and a live Unit 1 lesson
  page). Because Units 1-2's content work is already done, closing this is a
  **small, well-scoped engineering task**: add a cyber path condition to
  `theme.liquid` and either self-mount logic or explicit containers on cyber
  lesson pages, mirroring the CSP pattern already proven live. Units 3-5 need a
  **content/product decision first** (whole-lesson decks do not fit the by-day
  shape at all -- that is not a bug to fix, it is a format that has to be
  decided).
- **CSA variant**: does not exist on either side. This is both a content job
  (slide decks do not appear to exist for CSA at all, so far as the storefront
  or this repo shows -- see finding #1 above, where CSA's own bundle page
  promises them) and a full engineering job (manifest, route wiring, theme
  condition, lesson-page markup all from zero).

---

## ITEM 4: BUNDLE COMPLETENESS, SIDE BY SIDE (no pricing touched, none proposed)

**Per-lesson web content** (the graded/visit pages a class code actually
unlocks), measured against each course's own declared contract:

- **CSA**: ran `scripts/csa-activity-page-gap.js` against
  `smoke/fixtures/live-page-handles.txt` (captured today, ~1 hour before this
  sweep; spot-checked two cells against a fresh live fetch and both matched).
  **Result: 0 of 318 expected gradebook columns lack a live page, across all
  four units.** A code comment in `utils.js` claiming Unit 4's `debug` activity
  is "only authored for 4.4" is stale: live-checked `4.1-debug` and `4.4-debug`
  just now, both 200. **CSA's own declared per-lesson web content is
  complete**, contradicting a literal reading of "needs finishing" -- if
  anything is thin, it is not this.
- **The one quantified thinness found by that tool**: the manifest
  (`seed/csa-course-manifest.js`) prices Unit 1 `exercise-2` for all 15 lessons
  (90 of 1007 total points, 8.9%) even though `COURSES['ap-csa'].units['unit-1'].activities`
  deliberately excludes `exercise-2` and no such page exists (spot-checked live:
  `ap-csa-lesson-1-1-intro-algorithms-exercise-2` is 404). Likely low blast
  radius on any individual grade (nothing can ever be attempted at a page that
  does not exist, and this repo's gradebook contract scores earned/attempted,
  never earned/possible), but it inflates the course's nominal total-points
  figure by 90 points relative to what is actually achievable. This is a
  manifest/config cleanup item, not a student-facing outage.
- **CSP and Cyber**: no equivalent gap-detection tool exists for these courses
  in this repo; not run. CSP's per-lesson structure was independently verified
  live in item 1 above (100% complete). Cyber was not audited to this depth
  (out of scope for what was asked).

**Resource-KIND comparison** (what exists at all, not just whether a declared
column has a page):

| resource | CSA | CSP | Cyber |
|---|---|---|---|
| lesson pages | yes, all 53 | yes, all 35 | yes (not fully re-audited here) |
| guided notes | not part of CSA's config at all | yes, all 35, two handle schemes | not checked |
| dedicated "exercise/practice" pages | yes (exercise-1, exercise-3/FRQ, debug; all units) | yes (exercise-2 practice game, all 35; "code" ramp pages, BI3's 18) | not checked here |
| Create-Task-style exam scaffolding | not applicable (CSA's exam has no Create PT) | yes, 5 live pages, content comprehensive, 2 of 5 poorly linked (finding #4) | not applicable |
| by-day slide decks, gated | **advertised on the bundle page; does not exist** (finding #1) | yes, 100% | backend ready for 2/5 units; 0% delivered on the storefront |
| free preview product | yes, genuine, live | **advertised; redirects to the paid product instead** (finding #2) | not checked |

**Board #91** ("CSP bundle links to exercise pages that do not exist"):
re-checked live today, a third independent time (after 2026-08-17 and
2026-08-26). Extracted all body-content links (nav chrome excluded) from
`ap-csp-teacher-superpack`: 63 unique targets, dominated by a cross-sell
footer shared verbatim across the CSA, CSP, and Cyber bundle pages (confirmed:
62 of 63 targets on the CSP page also appear on the CSA and Cyber pages). **Zero
of them are `/pages/ap-csp-topic-*` or exercise/notes-family links.** Separately,
all 70 topic-scheme handout pages the *original* form of this claim referred to
(the printed `.docx` handouts pointing at pages that did not exist as of
2026-08-18) are now live, 70/70, confirmed moments ago. The digest shows #91
still `status: in_progress`, `state: untouched_7d`. Factually, this looks
closeable on every surface checked; closing it is a board/human decision, not
this sweep's to make.

---

## WITHDRAWN (my own false positives, caught before filing)

1. **"18 dead exercise-1 pages, BI3."** First guess used handle
   `ap-csp-course-bi3-{slug}-exercise-1`, which is 18/18 404. Wrong handle, not
   a missing feature: `lib/csp-course-pages.js`'s own header lists only 53
   pages it builds (35 exercise-2 + 18 notes), never exercise-1. Cross-checked
   against `seed/csp-code-pages/` and `scripts/verify-csp-code-pages.js`; the
   real handle is `ap-csp-topic-3-{N}-code`, and all 18 are live with 4 problems
   each. Caught before writing it up as a finding.
2. **Three CSA/CSP "dead" bundle links.** `ap-csa-teacher-superpack-free-preview`,
   `ap-csa-unit-1-superpack-free`, and `ap-csp-complete-study-bundle` all 404'd
   when fetched under `/pages/`. They are **product** handles
   (`/products/...`), confirmed live (200) once fetched correctly. Root cause:
   I built the request list from strings grepped out of this repo without
   checking which Shopify section they belonged to. `scripts/dead-internal-link-repair.js`
   already documents this exact class of mistake ("a page and a product can
   share a handle... keying the body snapshot by handle alone... briefly hid
   the free-preview finding entirely").
3. **`/pages/ap-csa-2025-practice-mcq` "dead."** One HEAD request in a 64-link
   batch came back 503 mid-crawl. Per the "distinguish rate-limited from
   broken" rule, re-checked single-threaded with a fresh GET immediately after:
   200, 461KB body. Transient throttle, not a defect. Not filed.

---

## NOT MEASURABLE FROM HERE

- Whether `apcs-slides-gate.js` actually **mounts** a panel on the 35
  exercise-2/exam pages that load the script incidentally (path-prefix match),
  or stays inert there. Needs a real browser / headless run, not a fetch.
- Whether CSA slide decks exist anywhere off-storefront (email, a Drive folder
  shared post-purchase). This sweep can only speak to what the storefront
  itself delivers.
- Whether cyber's Unit 3-5 whole-lesson decks are delivered to a buyer by some
  channel other than the storefront gate. Same limit as above.
- Judgement calls: whether the Create Task Bridge/Rescue Kit's *content* is
  good enough once found (a human read), and whether closing board #91 is
  warranted given this sweep cannot see the printed `.docx` handouts' current
  wording, only the pages they point at.
- Board task 160's stored status: it appears in none of the digest's curated
  buckets (checked `changed_since`, `stale`, `bleeding`, `needs_verification`,
  etc.), so its board-recorded state is unknown from the read token; only its
  live behavior (finding #2) was checked.

---

## Memory for the next sweep

- **Naming traps found this run**, to save the next sweep from re-discovering
  them: (a) CSP "exercise-1" is `ap-csp-topic-{U}-{L}-code`, not a
  `-exercise-1` suffix; (b) CSP guided notes split into two handle schemes
  exactly on the BI3 boundary (`ap-csp-course-bi{N}-{slug}-notes` for
  BI1/2/4/5, `ap-csp-topic-{U}-{L}-guided-notes` for BI3); (c) "exercise-2"
  names TWO unrelated page families (the course-bi practice game vs. the
  topic-scheme handout companion) that do not share a gradebook column; (d) a
  page and a product can share a name-shaped string across `/pages/` and
  `/products/` -- always check the section before calling something dead.
- **Headline counts, 2026-09-03**: CSP course-bi exercise-2: 35/35 live (was
  18/35 on 2026-09-02). CSP topic-handout pages: 70/70 live, 8/70 auto-graded.
  CSP guided notes: 35/35 live. CSP slide-gate coverage: 35/35 lesson pages,
  224/224 embeds. Cyber slide backend: 70/70 embeds for its 9-lesson scope,
  0 storefront delivery. CSA slide coverage: 0/53, despite the bundle's own
  sales copy promising it. CSA activity/page gap: 0 of 318 columns missing a
  page; 90 of 1007 manifest points (8.9%) priced with no page. CSP free-preview
  button: live redirect to the $249 product, not a free page.

---

## ADDENDUM: a concurrent, uncommitted claim that would invalidate this whole sweep, tested and not reproducing

While finalizing this report, `git status` showed this checkout is shared with
at least one other concurrent session: staged but uncommitted are
`lib/storefront-fetch.js` and `tools/scan-inline-scripts.js`, and untracked are
two sibling reports (`docs/runs/2026-09-03-auditor-csa-integrity.md`,
`docs/runs/2026-09-03-auditor-cyber-sweep.md`) this sweep did not write. None of
this was touched, staged, or committed here, per the read-only mandate.

The new `lib/storefront-fetch.js`'s own header claims a same-day incident: that
Cloudflare bot management has **inverted**, now blocking a browser
User-Agent (403, a 4.5KB "Verifying your connection..." body) and allowing an
unmodified client UA (200) -- the exact opposite of the rule this sweep was
told to follow and did follow throughout
(`Mozilla/5.0 (compatible; apcse-nightly-crawl/1.0) Chrome/120...`, per
`scripts/site-crawl.js`'s own established UA).

If true and if it applied to this sweep, every finding above would need to be
thrown out: hundreds of "200"s could have been 403 challenge pages misread as
real content. **This was tested directly, live, before accepting or rejecting
it**, per this file's own rule against filing or trusting an unverified claim:

    GET /pages/ap-csp-course-bi1-collaboration, browser UA (this sweep's UA):
      200, 462064 bytes, contains "Shopify.theme": true
    GET /pages/ap-csp-course-bi1-collaboration, no UA override:
      200, 462064 bytes, contains "Shopify.theme": true

**Both succeed, identically, right now.** The claimed inversion is not
reproducing. Independently, this sweep's own ~420 requests already argue
against having been silently challenge-paged throughout: fetched bodies varied
correctly in size (368KB to 484KB across the bundle/create-task pages alone,
not a single repeated size), carried distinct, page-appropriate titles and H1s,
and produced internally consistent structured data (MCQ counts, script lists,
link sets) that varied exactly as expected page to page. A 4.5KB static
challenge body could not have produced any of that.

**This is reported, not dismissed.** The concurrent session may have measured
something real and narrower than its own comment states (a specific path, a
specific rate, a specific moment), or a Cloudflare rule may have flapped and
since reverted. Either way: **do not take this sweep's UA choice as
contradicted, and do not take the other file's claim as refuted either** --
both are stated with their evidence and their timestamp so the next session can
tell which one is stale.
