# Site audit: positioning, architecture and hub-page SEO

Crawled and written 2026-08-26. Planning document, no changes shipped.

Everything in the Evidence section was measured against the live storefront on
that date. Everything in the Plan section is a proposal. The two are kept apart
on purpose: findings decay slowly, recommendations decay fast.

## What could not be measured, and why it matters

Two data sources that should drive this work were unavailable:

- **Ahrefs index data.** The workspace is on a trial with `units_limit_workspace: 0`.
  Every Site Explorer call returns `API units limit reached`. So there is no
  ranking, backlink or competitor data in this audit.
- **Google Search Console.** Not connected to either Ahrefs project (9205271,
  9205272). `gsc-keywords` returns `No GSC data available`.

This has one hard consequence, and it is the most important sentence in this
document: **the consolidation proposed in section 3 must not be executed until
GSC is connected.** Consolidating a cannibalised cluster means picking one URL
to keep and 301-ing the others into it. Picking that URL without click and
impression data is guessing, and a wrong guess redirects away the page that was
actually earning the traffic. Connect GSC first. It is free and it is step zero.

Everything else below stands on its own: it was measured directly from the live
HTML, the sitemaps and public search results.

## 1. The positioning gap

### What the site says it is

The homepage `<meta name="description">`, live today:

> Free AP Computer Science A and CSP exam prep including practice tests, FRQs,
> study guides, and create task resources. Built to help you score a 4 or 5.

Two courses. Student audience. Exam-prep framing. A single outcome promise
pinned to test day.

### What the business actually is

From `/api/command/digest` on the same morning:

| Signal | Value |
|---|---|
| Active classes | 393 |
| Active students | 940 |
| Manifest items | 908 |
| Attempts recorded in 24h | 272 |
| Score events in 24h | 1,140 |
| Courses with page inventory | 4 (CSA, CSP, Cybersecurity, Networking) plus Intro Java |

That is not a study-aids shop. That is a full-year courseware platform with an
attempt-level gradebook, in daily use by teachers, monetised through teacher
bundles.

### The three costs of the gap

**Wrong audience.** The description sells a score to a student. The person who
creates a class, brings thirty students, returns next August and buys a bundle
is a teacher. Teachers are not addressed anywhere in the site's own summary of
itself.

**Wrong breadth.** The homepage `<title>` names four courses. The description
names two. Cybersecurity and Networking, which is where the growth is, are
absent from the description entirely and absent from the collection structure
entirely (section 2).

**Wrong season.** Exam prep is a March-to-May business. Curriculum and gradebook
is an August-to-June business. This audit was run on 26 August, the peak week
for teachers choosing what they will teach all year, and the site is dressed for
April.

### The market fact that should decide this

Researched 2026-08-26 against College Board and trade press:

- **AP Cybersecurity goes nationwide in 2026-27**, which is now. It piloted in
  2025-26 with roughly 3,100 students across 183 schools in 30 states. It is part
  of the new AP Career Kickstart family and carries a Cisco partnership. First
  exam May 2027.
- **AP Networking is an invite-only pilot in 2026-27**, restricted to schools
  that already piloted Networking or Cybersecurity, and goes nationwide in
  2027-28.

So there is a national cohort of teachers who must choose AP Cybersecurity
materials in the next few weeks, and there is no entrenched incumbent, because
the course did not exist at national scale until this year.

This site already has 92 `ap-cybersecurity-*` pages, 147 `ap-cyber-*` practice
pages, a Command Center, and a founding teacher bundle. It is further ahead than
anyone has any right to be, and its own homepage does not mention the course.

### Recommended positioning

> **The free full-year AP computer science curriculum. Four courses, a built-in
> gradebook, no license.**

Primary audience: AP CS teachers. Secondary: self-study students.

The exam-prep assets do not go away. They stop being the identity and become the
practice layer inside the course. "Score a 5" is a proof point, not a promise.

**On the domain name.** `apcsexamprep.com` says exam prep, and that is a real
constraint. Do not rebrand the domain: the cost is high and whatever authority
the domain has is the only compounding asset here. Treat the name as a legacy
label and carry the positioning in the brand line instead, for example
"APCSExamPrep: full-year AP CS courses and gradebook". Revisit only if the
teacher business becomes the whole business.

## 2. Architecture

### Inventory, measured from the sitemaps

| Sitemap | URLs |
|---|---|
| Pages | 1,326 |
| Blog posts | 654 |
| Products | 51 |
| Collections | 10 |
| **Total** | **2,041** |

Page handles by course family: `ap-csa` 543, `ap-csp` 299, `ap-cyber` 147,
`ap-cybersecurity` 92, `ap-networking` 67, `intro-java` 109, other 170.

### The collections are two years behind the business

All ten, verbatim: `ap-csa`, `ap-csp`, `ap-csa-premium-frq-solutions`, `frq`,
`practice-exams`, `flashcards`, `quick-reference`, `bundles`, `tutoring`,
`live-events`.

There is no collection for AP Cybersecurity, AP Networking, Intro Java, or
teacher bundles, even though `ap-cybersecurity-founding-teacher-bundle`,
`ap-networking-teacher-bundle`, `ap-csa-teacher-superpack` and
`ap-csp-teacher-superpack` all exist as products. The collection layer, which is
the storefront's browse spine, describes the 2024 product line.

All three collections checked (`ap-csa`, `ap-csp`, `bundles`) have **no meta
description at all** and an H1 of the form `Collection: AP CSA`.

### Hub sprawl, the central architectural defect

The problem is not missing content. It is that one intent is spread across many
URLs, so no single URL accumulates authority and the site competes with itself.

**AP Cybersecurity, overview intent, eight live URLs:**

| URL | Live `<title>` |
|---|---|
| `/pages/ap-cybersecurity` | AP Cybersecurity \| APCSExamPrep.com |
| `/pages/ap-cybersecurity-course` | What Is AP Cybersecurity? 2026-27 Course & Exam Guide |
| `/pages/ap-cybersecurity-complete-course-guide` | AP Cybersecurity Course Guide \| All 5 Units Live \| APCSExamPrep.com \| APCSExamPrep.com |
| `/pages/ap-cybersecurity-curriculum` | AP Cybersecurity Curriculum \| AP Exam Prep |
| `/pages/ap-cybersecurity-curriculum-units-guide` | AP Cybersecurity Curriculum & Units (2026-27): What to Teach + How to |
| `/pages/ap-cybersecurity-ced-explained` | AP Cybersecurity CED Explained \| Course Guide |
| `/pages/ap-cybersecurity-topics` | AP Cybersecurity Topics Index \| All 5 Units & Every Concept |
| `/pages/ap-cybersecurity-study-guide` | AP Cybersecurity Study Guide \| All 5 Units |

**Exam format intent, two URLs that are the same page:**
`/pages/ap-cybersecurity-exam-format` ("AP Cybersecurity Exam Format & Scoring
Guide") and `/pages/ap-cybersecurity-exam-format-scoring` ("AP Cybersecurity
Exam Format (May 2027)...").

**Practice intent, three URLs:** `-practice`, `-practice-exam`,
`-practice-questions`.

Two of these pages, `/pages/ap-cybersecurity-curriculum` and
`/pages/ap-cybersecurity-practice-questions`, serve a **byte-identical meta
description**:

> AP Cybersecurity study guide covering security concepts, attack
> classification, and defense strategies. Part of the complete AP Cyber course
> on...

The same pattern holds elsewhere. AP CSA has six competing surfaces
(`/pages/ap-csa`, `-course`, `-topics`, `-exam-prep-hub`, `/pages/csa-command-center`,
`/collections/ap-csa`). AP CSP has six (`/pages/ap-csp`, `-course`, `-topics`,
`-info`, `/pages/csp-command-center`, `/collections/ap-csp`).

**This is observable in live search results.** A search for `"AP Cybersecurity"
curriculum teachers pacing guide resources 2026` returned five separate
apcsexamprep.com URLs on one results page: the `ap-cybersecurity` blog, the
`-curriculum` page, the `-complete-course-guide` page, the
`-teacher-course-planning` post and the `-course` page. Dominating a SERP with
five self-competing URLs is not five times the win. It splits link equity and
lets Google choose the canonical instead of the site choosing it.

The one competitor visible in that same SERP: `csplusplus.com/cyber-curriculum/`,
offering a free five-unit AP Cybersecurity curriculum.

### Naming is inconsistent across the same course

`ap-cyber-*` (147 pages) holds practice, labs, quizzes and exercises.
`ap-cybersecurity-*` (92 pages) holds lessons and overviews. Command centers are
split too: `cyber-command-center` and `cyber-dashboard` against
`ap-networking-command-center`. Same course, two prefixes; same object type, two
conventions.

There are also same-thing-twice handles, for example
`ap-csa-primitives-and-casting-practice-test`,
`ap-csa-primitives-casting-practice-test` and
`ap-csa-practice-test-primitives-casting`. `docs/meta-description-gaps.md`
separately records duplicate lesson handles at CSA 2.9, 2.10 and 2.12.

### The blog is inverted against the opportunity

| Blog | Posts |
|---|---|
| `ap-csa-daily-practice` | 430 |
| `ap-csp-daily-practice` | 112 |
| `news` | 87 |
| `ap-cybersecurity` | 10 |
| `ap-networking` | 5 |
| `ap-csp` | 5 |
| `ap-csa` | 5 |

83 percent of all blog output is daily-practice questions for the two mature
courses. The course going nationwide this year has ten posts.

Note that the daily-practice posts are **not** thin content, and should not be
pruned reflexively. Spot-checked handles are specific and topical, for example
`unit-4-day-17-arraylist-remove-traversal`. The issue is allocation of new
output, not the quality of what exists.

## 3. Technical SEO findings

Measured on 2026-08-26 across 32 fetched pages plus targeted checks.

### P0: `robots.txt` is empty

`https://www.apcsexamprep.com/robots.txt` returns HTTP 200 with a
**one-byte body** (a single newline). Same on the apex domain.

Shopify serves a substantial default `robots.txt` with roughly thirty `Disallow`
rules plus a `Sitemap:` directive. Something has overridden it with an empty
`robots.txt.liquid`. Consequences on a 2,041-URL site:

- No `Sitemap:` directive pointing crawlers at `/sitemap.xml`.
- `/cart`, `/search`, `/account`, `/checkout` and every faceted collection
  permutation are crawlable, which wastes crawl budget.
- Internal tooling is crawlable (below).

One file. Highest ratio of impact to effort on this list.

### P0: duplicate H1 on effectively every page

**29 of 32** fetched pages carry a second `<h1>Get in Touch</h1>`, emitted by a
contact section in the shared page template. The three exceptions are the
collections, which use a different template.

Several pages are worse than duplicated. Measured H1 counts and contents:

| Page | H1 count | H1s |
|---|---|---|
| `/pages/ap-csa-topics` | 5 | `AP CSA Topics (2026)`, `AP CSA Topics (2026) \| Practice by Unit and Skill \| APCSExamPrep.com`, `AP Computer Science A Topics (2026) ...` |
| `/pages/ap-csa-course` | 3 | `AP CSA Course \| Full Curriculum \| APCSExamPrep.com`, `AP Computer Science A: Complete Curriculum`, `Get in Touch` |
| `/` | 3 | `AP CS Exam Prep`, `AP Computer Science Exam Prep`, `Get in Touch` |

Note the pattern in the first two: a **full title string, brand suffix included,
is being rendered as an H1**. That is a copy-paste artifact from whatever
generated these pages, and it puts pipe-delimited brand boilerplate into the
strongest on-page heading signal.

Fixing the template contact section (`h1` to `h2` or a `div`) is one theme edit
that corrects roughly 1,300 pages. The multi-H1 pages need a separate content
pass.

### P1: the money pages advertise last school year

Today is 26 August 2026. The current year is 2026-27 and the next exam is May
2027.

| Page | Year shown | Where | Correct? |
|---|---|---|---|
| `/pages/ap-csa-exam-prep-hub` | 2025-2026 | title **and** H1 **and** description | No |
| `/pages/ap-csp-course` | 2025-2026 | title | No |
| `/pages/ap-csp-topics` | 2025-2026 | description, H1 | No |
| `/pages/ap-csp-info` | 2025-2026 | description | No |
| `/pages/ap-csp` | 2025-2026 | description | No |
| `/pages/ap-csa-topics` | 2025-2026 | description (title says 2026) | Mixed |
| `/pages/ap-csa-course` | May 2027 | title, description | Yes |
| `/pages/ap-cybersecurity` | 2026-2027 | description | Yes |

The newer pages are correct and the established CSA and CSP hubs are a year
stale, in the title tag, during the week teachers are choosing curricula.

Related staleness: `/pages/csp-command-center` still renders "CSA soon" in its
description text. The CSA Command Center is live.

### P1: title tag defects

- `/pages/ap-cybersecurity-complete-course-guide` ends
  `... | APCSExamPrep.com | APCSExamPrep.com`. **The brand suffix is appended
  twice.** 86 characters, so it truncates in results.
- Over 60 characters, will truncate: `/` (89),
  `-exam-format-scoring` (89), `-curriculum-units-guide` (88),
  `-complete-course-guide` (86), `/pages/ap-csa-course` (72).
- Under-used and content-free: `/pages/ap-csp` is `AP CSP | APCSExamPrep.com`
  (25 characters, of which 17 are brand). `/collections/ap-csa` is
  `AP CSA | APCSExamPrep.com` (25).

### P1: meta descriptions fall back to scraped body text

Shopify renders body text as the description when the `global.description_tag`
metafield is unset. Live examples, all 319 to 320 characters of navigation
run-on:

- `/pages/csa-command-center`: `HubsCyberCSPCSANetworkingGradebook -&gt; CSA AP Computer Science A Command Center ...`
- `/pages/cyber-command-center`, `/pages/csp-command-center`,
  `/pages/ap-networking-command-center`: same shape.
- `/pages/join`: `AP APCSExamPrep.com Student Class Portal You're signed in as ...`
- `/pages/ap-csa-lesson-2-7-while-loops`: `AP CSA› Course› Unit 2: Selection &amp;amp; Iteration› Lesson 2.7 ...`

Two independent measurements agree on the scale. `docs/meta-description-gaps.md`
swept 1,121 pages on 2026-08-17 and found 151 with no description (13.5 percent).
A fresh random sample of 14 lesson pages on 2026-08-26 found 2 scraped
(14 percent).

Note the double-escaping in those examples: `&amp;amp;` and `-&gt;`. Entities
are being escaped twice somewhere in the fallback path.

**The inversion worth knowing:** the newer generated content is better optimised
than the core lesson pages. Every sampled exercise, FRQ and debug page had a
properly authored 94-to-128 character description. The scraped ones were the
canonical lesson pages.

### P1: structured data was built once and never propagated

| Page | Schema types present |
|---|---|
| `/pages/ap-csa-course` | Course, CourseInstance, Syllabus, LearningResource, EducationalAudience, FAQPage, Organization, Person, ItemList, BreadcrumbList |
| `/pages/ap-networking` | Course, CourseInstance, FAQPage, Organization, BreadcrumbList |
| `/` | Organization, WebSite, HighSchool, FAQPage, Person, BreadcrumbList |
| `/pages/ap-csa-exam-prep-hub` | Article, FAQPage, Organization, Person, BreadcrumbList |
| `/pages/ap-csp-course` | **BreadcrumbList only** |
| `/pages/ap-cybersecurity` | **BreadcrumbList only** |
| all four Command Centers | **BreadcrumbList only** |
| all three collections | **BreadcrumbList only** |

`ap-csa-course` is the gold standard and the template already exists. It was
simply never applied to the other three courses. `Course` schema is the exact
type Google uses for course rich results, and the three courses missing it
include the two with no competition.

### P2: internal tooling is fully indexable

All return HTTP 200, carry no `robots` meta tag, and sit in the public sitemap:
`admin-tracker`, `my-progress`, `join`, `confirm-csa`, `confirm-csp`,
`confirm-both`, `csa-teacher-dashboard`, `csp-teacher-dashboard`,
`cyber-teacher-dashboard`, `cyber-dashboard`, `java-editor-test`,
`java-sandbox-embed`, `ap-csa-code-editor-test`.

Draw the line by function, not by folder:

- **Dashboards, trackers, confirm pages and test pages: `noindex`.** They are
  application surfaces. `csa-teacher-dashboard` currently carries the title
  `AP CSA Teacher Dashboard | Free Class Gradebook`, which is a genuinely good
  landing-page title attached to a logged-in tool. Move that message to a real
  marketing page and `noindex` the tool.
- **Command Centers: keep indexed, and optimise them properly.** A teacher
  searching "AP Cybersecurity pacing guide" wants exactly that page. They are
  currently indexed with scraped descriptions and no Course schema, which is the
  worst of both.

### Not a finding, checked and cleared

- **Sitemap hygiene is sound.** 12 of 12 randomly sampled page URLs returned
  200.
- **The 53 `-debug` lesson pages are not duplicates.** Spot-checked,
  `ap-csa-lesson-2-7-while-loops-debug` is a distinct debugging exercise with its
  own authored title and description. Leave them indexed.
- **Canonical tags are correct** and self-referential on every page checked.

## 4. Proposed architecture

One template, applied identically to all four courses. Every course gets a hub
and four intent spokes, and nothing else competes at that level.

```
/pages/ap-{course}                  Course hub. Canonical for the head term.
  |
  +- /pages/ap-{course}-curriculum   Teacher intent: units, pacing, syllabus
  +- /pages/ap-{course}-course       Student intent: the free lessons
  +- /pages/ap-{course}-practice     Practice intent: MCQ, FRQ, labs, exams
  +- /pages/ap-{course}-exam-format  Exam intent: format, scoring, dates
       |
       +- /pages/ap-{course}-topics  Index of every topic page (long tail)
            |
            +- units -> lessons -> exercises
```

Plus two audience hubs that cut across all four courses, which is where the new
positioning actually lives:

- **`/pages/for-teachers`** the platform pitch: free full-year curriculum, class
  codes, gradebook, pacing, bundles. This page does not exist today and is the
  single biggest content gap on the site.
- **`/pages/for-students`** self-study entry: join a class, my progress,
  practice.

Supporting moves:

- **Collections:** add `ap-cybersecurity`, `ap-networking`, `teacher-bundles`.
  Give all of them an authored meta description, an intro paragraph, and an H1
  that is not `Collection: X`.
- **Command Centers** attach under `/pages/for-teachers` and under each course
  hub, indexed and properly optimised.
- **Handle convention:** standardise on `ap-cybersecurity-*`. Do not bulk-rename
  the 147 existing `ap-cyber-*` URLs, since a rename of that size for tidiness
  is risk with no upside. Apply the convention to new pages and revisit only if
  a page is being rewritten anyway.

### Hub page template

Apply to all four course hubs and both audience hubs.

- **One H1.** Head term, no brand suffix, no pipes.
- **Title, 50 to 60 characters.** Primary keyword first, qualifier, school year
  for freshness. Brand only if it fits. Example:
  `AP Cybersecurity Curriculum 2026-27: All 5 Units & Pacing` (56).
- **Meta description, 140 to 160 characters, authored.** What it is, the proof,
  the differentiator. Never let Shopify fall back.
- **Schema:** the `ap-csa-course` stack, Course plus CourseInstance plus
  FAQPage, with `Person` for the teacher. The 11-years-and-a-54.5-percent-5-rate
  credential is a genuine trust signal and it belongs in structured data, not
  only in prose.
- **Internal links:** hub to all four spokes, spokes back to hub, spokes across
  to each other. Breadcrumbs already render correctly.
- **Freshness:** the school year appears in title, H1 and description, and it is
  rolled over every August. Section 3 shows what happens when that is manual and
  gets missed.

## 5. Sequenced plan

Ordered by impact over effort, not by interest.

### Phase 0: instrumentation, this week

1. **Connect Google Search Console** to Ahrefs project 9205271, or at minimum
   get direct GSC access. Nothing in Phase 2 is safe without it.
2. Decide whether the Ahrefs trial becomes a paid plan. Without units there is
   no rank tracking or competitor visibility.

### Phase 1: site-wide fixes, no data dependency

Each of these is safe to ship now, and each is one edit with site-wide reach.

3. Restore a real `robots.txt`, including the `Sitemap:` directive.
4. Change the template contact-section `h1` to `h2`. Corrects roughly 1,300
   pages.
5. Rewrite the homepage title and description to the new positioning.
6. Roll 2025-2026 to 2026-27 across the CSA and CSP hub titles, H1s and
   descriptions. Fix the "CSA soon" string on the CSP Command Center.
7. Fix the doubled brand suffix on `ap-cybersecurity-complete-course-guide`, and
   trim the five titles over 60 characters.
8. Add `noindex` to dashboards, trackers, confirm pages and test pages.

### Phase 2: the Cybersecurity land-grab, once GSC is connected

This is where the return is, and the window is this autumn.

9. Pull GSC clicks and impressions for every `ap-cybersecurity-*` URL. For each
   of the three clusters (overview, exam format, practice), keep the URL with
   the most non-brand clicks and 301 the rest into it. Preserve
   `-topics` as a distinct index.
10. Build `/pages/for-teachers`. This is the missing page in the whole
    architecture.
11. Propagate the `ap-csa-course` schema stack to the Cybersecurity, Networking
    and CSP hubs.
12. Create `/collections/ap-cybersecurity`, `/collections/ap-networking` and
    `/collections/teacher-bundles`, with authored descriptions.
13. Author descriptions for the four Command Centers, then work the rest of the
    `docs/meta-description-gaps.md` list.

### Phase 3: compounding

14. Rebalance blog output toward AP Cybersecurity and AP Networking teacher
    topics. The daily-practice engine is working; it is pointed at the two
    courses that need it least.
15. Apply the hub template to CSA and CSP, consolidating their six surfaces
    each into hub plus four spokes.
16. Roll the multi-H1 cleanup through the generated page inventory.

## Method notes

Crawled at roughly one request per second with backoff, per the constraints in
`docs/site-crawl.md`: this storefront has served challenges to fast crawlers
before, and school IPs are shared. Total requests for this audit were about 80.
No credential was sent to the storefront. Nothing was written to the ledger and
no page was modified.

Sources for the market claims in section 1: College Board AP Career Kickstart
and AP Networking pilot pages on apcentral.collegeboard.org, plus trade
coverage of the Cisco partnership and the nationwide 2026-27 expansion.
