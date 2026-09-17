# The AP CSA FRQ pages, audited against live bodies

2026-09-17. Measured, not reviewed: every number below comes from the live page
bodies pulled through `lib/storefront-fetch.js`, and every Java claim comes from
running the code rather than reading it.

Scope: **117 live pages**. 86 past-paper question pages (2004 to 2025), 22 year
index pages, the archive hub, the strategy guide, the bootcamp page, the by-topic
page and four pattern pages. The 53 lesson FRQ practice pages are a different set
with a different owner and are out of scope here; see `docs/csa-frq.md`.

## The headline

**The 2026 exam changed the free-response scoring and 74 of the 86 archive pages
have not been told.** Every question from 2004 through 2025 was worth 9 points
and the section was 36. The 2026 questions are worth 7, 7, 5 and 6, the section
is 25, and only question 1 has parts. Section I moved to 42 questions at 55
percent.

The 2023 to 2025 pages already carry a correct callout saying so, and it says
exactly the right thing. The other 74 do not, and a student who self-grades a
2019 question out of 9 and carries that arithmetic into May is being taught a
denominator that no longer exists.

Verified independently of the site: point totals read from
`ap26-sg-computer-science-a.pdf` (sha256 `e62e4c8d...`, 434,415 bytes), section
weightings from College Board's AP Computer Science A exam page, both read
2026-09-17.

## What was broken, ranked by what it costs a student

### 1. Eleven pages promise a Complete Solution and deliver a comment

| page | what its solution block actually contains |
|---|---|
| ap-csa-2004-frq-3 | "This FRQ required knowledge of the Marine Biology Case Study which has been removed" |
| ap-csa-2005-frq-3 | same |
| ap-csa-2006-frq-3 | same |
| ap-csa-2007-frq-2 | same |
| ap-csa-2008-frq-3 | same, GridWorld |
| ap-csa-2009-frq-2 | GridWorld |
| ap-csa-2010-frq-4 | GridWorld |
| ap-csa-2011-frq-2 | GridWorld |
| ap-csa-2012-frq-4 | GridWorld |
| ap-csa-2013-frq-4 | GridWorld |
| ap-csa-2014-frq-2-gameoflife | GridWorld |

The titles say "Complete Solution". Three of them are titled `Fish` in three
different years, and 2006 FRQ 3 and 2007 FRQ 2 have a 0.78 Jaccard similarity on
their visible text, which is near-duplicate content on two indexed pages.

Withdrawing the case studies was College Board's decision and there is nothing
to solve. The defect is the promise in the title and the absence of a page-level
caveat where a reader arrives, not the missing Java.

### 2. Sixteen titles read as machine output

    Ap Csa 2018 Frq 1 Frogsimulation
    Ap Csa 2022 Frq 3 Reviewanalysis

All of 2018 (three of four), 2019 (three of four), 2020, 2021 and 2022. A
slug-to-title pass title-cased the whole handle, so `AP` became `Ap`, `FRQ`
became `Frq`, and the class name lost its internal capital. Ten more pages in
2014 to 2017 have correct `AP CSA` casing and still print `Gameoflife`,
`Seatingchart`, `Diversearray`, `Randomstringchooser`.

This is the SERP title. A teacher deciding whether the site is worth trusting
reads it before anything else on the page, and it is the exact failure the
house rule about nothing reading as machine-written exists to prevent.

### 3. Six pages contradict themselves on which unit the question belongs to

| page | Curriculum Alignment says | Study This Topic links to |
|---|---|---|
| ap-csa-2004-frq-3 | Unit 4 | Unit 1 |
| ap-csa-2004-frq-4 | Unit 2 | Unit 4 |
| ap-csa-2005-frq-3 | Unit 4 | Unit 1 |
| ap-csa-2005-frq-4 | Unit 2 | Unit 4 |
| ap-csa-2006-frq-3 | Unit 4 | Unit 2 |
| ap-csa-2007-frq-2 | Unit 4 | Unit 2 |

Both statements are on the same screen, four lines apart.

### 4. Stale dates on live pages, four months after the date

- 13 pages name **May 15, 2026** as a future exam date, including all twelve of
  the 2023 to 2025 pages and 2019 FRQ 2.
- `ap-csa-frq-archive` prints a countdown to May 15, 2026 with the static text
  **"46 days left"** beside it.
- `ap-csa-frq-bootcamp-2026` is **live and still selling tiers** for a Zoom
  event on **April 16, 2026**, under the banner "29 days until the AP CSA Exam
  (May 15)". It answered 200 today.

The next exam is **Wednesday, May 12, 2027, Session 2**.

The bootcamp page is the one to look at first, because it is the only item in
this report that can take money for something that cannot be delivered. Pricing
is on the `NEVER_AUTO` list, so what to do with it is a decision rather than a
patch, and it is flagged here rather than changed.

### 5. The archive hub's own summary numbers are wrong

`ap-csa-frq-archive` states **"88 FRQs Total"**, **"Every released exam"** and
**"45% Of Your AP Score, 36 points, 90 min"**.

- 86 question pages exist, not 88, and the hub's own question links agree with
  the 86: it lists two for 2020 where every other year has four. 88 is 22 years
  times 4. Why 2020 has two was NOT established here: the usual COVID-year
  explanation is plausible and `ap20-frq-computer-science-a.pdf` answers 404, so
  the count has no first-party source behind it in this session. What is
  measured is that the hub advertises two pages it does not link and that do not
  exist.
- "Every released exam" stopped being true in May 2026.
- 36 points is the retired section total. The strategy guide, updated
  2026-08-20, already says 25.

### 6. Structured data

- `ap-csa-2016-frq-3-crossword` ships a JSON-LD block that **does not parse**
  (bad escaped character at position 596). Google discards the whole block.
- 10 pages carry **no JSON-LD at all**: the year index pages for 2006 through
  2013, plus `ap-csa-frq-bootcamp-2026` and `ap-csa-frqs-by-topic`.

### 7. House conventions

- **67 of the 117 pages carry an em-dash**, 943 in total, against a repo
  convention of none in authored prose. Concentrated in the newest pages: the
  2023 to 2025 set averages 30 each.
- **Every one of the 117 pages carries non-ASCII characters**, against the
  theme's pure-ASCII rule. Mostly the same handful of typographic characters.
- **No mojibake anywhere**, checked through `lib/mojibake.js` rather than a
  pasted pattern. That is the one convention holding perfectly.
- The 2023 to 2025 bodies open with a **6,535-byte HTML comment** headed
  `REPLACE THESE TOKENS THROUGHOUT`, carrying the template's authoring
  instructions and version history. It is published on twelve public pages and
  is roughly 10 percent of each body.

### 8. Links

Better than expected. Nothing is hard-broken: every internal link across the 117
pages resolves, and the ones that look wrong are carried by redirects.

    /pages/ap-csa-2025-frq-4-sumorssamegame  301 -> .../ap-csa-2025-frq-4-sumorsame
    /pages/ap-csa-2020-frq-3                 301 -> .../ap-csa-frq-2020
    /pages/ap-computer-science-tutor         301 -> .../ap-computer-science-a-tutor

The first is the one to notice. The archive hub links the most recent year's
question 4 at a **misspelled handle**, `sumorssamegame` for `sumorsame`, and it
works only because a redirect exists. The year index pages also link bare
`/ap-csa-2014-frq-1-scrambler` without the `/pages/` prefix, which likewise 301s.

Redirect hops are cheap and they are not free: they cost a round trip on every
click and they hide the typo that caused them, so the next generated sheet
inherits it. Worth fixing when the hub is edited for the numbers above, not
worth an import of its own.

The archive hub links **22 year index pages**, one per year from 2004 to 2025.
It will need a 23rd.

### 9. The Java

249 code blocks across the 86 pages, extracted and compiled. **No page carries a
malformed solution.** The blocks that do not parse standalone are illustrative
one-line fragments (`for (int i = 0; i < secret.length(); i++)  // too far!`)
and constructors lifted out of their class, which is legitimate on a page and a
false positive of any harness that compiles every block in isolation.

Worth stating plainly, since it is the check most likely to have found something
alarming and did not: the archive's Java is sound.

## What the 86 pages have in common: nobody generates them

Four distinct page formats, grouped exactly by when they were built:

| years | bytes per page | what the format has |
|---|---|---|
| 2004-2007 | 11 to 14 KB | breadcrumb, alignment strip, part solutions |
| 2008-2013 | 8 to 9 KB | the same, thinner |
| 2014-2022 | 22 to 38 KB | adds key concepts and common mistakes |
| 2023-2025 | 61 to 64 KB | the v2.5 template: PDF embed, editors, reveal panel, three JSON-LD blocks |

Every defect above is a drift defect, and drift is never in the page you are
looking at. The house rule covers this exactly: any page set larger than about
three ships as canonical data, a generator, a validator and a Matrixify sheet.
The archive has none of the four.

## And 2026 did not exist

The set stopped at 2025. College Board published both 2026 PDFs after the May
administration and they were reachable today:

    ap26-frq-computer-science-a.pdf   200, 277,439 bytes, sha256 1ff0e5de...
    ap26-sg-computer-science-a.pdf    200, 434,415 bytes, sha256 e62e4c8d...

That is the first exam of the new course, the only released question set that
matches the rubric students will be scored against next May, and the archive's
strongest claim is "every released exam".

## What shipped with this report

Five generated pages, built from the two PDFs: four questions and the 2026 year
index, in the v2.5 format the 2023 to 2025 pages use.

| handle | question | points |
|---|---|---|
| ap-csa-2026-frq-1-account | Account, constructor plus a String method | 7, split 4 and 3 |
| ap-csa-2026-frq-2-bottle | Bottle, write the whole class | 7 |
| ap-csa-2026-frq-3-attendance | Attendance, two ArrayLists compared | 5 |
| ap-csa-2026-frq-4-gameboard | GameBoard, one row of a 2D array | 6 |
| ap-csa-frq-2026 | the year index | |

Evidence, all re-derivable:

```
$ npm run csa:2026frq
  9 of 9 solution run(s) reproduce the question's own examples, 4 of 4 mutants caught

$ npm run smoke:csa2026frq
  70 passed, 0 failed
  20 sheet rules broken on purpose, each caught BY NAME; 2 controls stay green

$ node scripts/csa-past-frq-pages-csv.js imports/2026-09-17/csa-2026-frq-pages.csv
  wrote 5 page(s), 236 KB of body
  parsed back and diffed clean against the renderer, every cell
```

The verifier earned its place on the first run. College Board's scoring
guidelines PDF extracts an EN DASH where `j - 1` belongs in one of the Q1
alternate solutions, because that is what PDF extraction does to a minus sign. A
file nobody executes would have shipped that to a student as an answer key.

## Recommended order, by cost of leaving it

1. **The bootcamp page.** It can take money for a past event. Decision, not a
   patch: unpublish, repoint at 2027, or leave with a banner.
2. **The archive hub's numbers and countdown.** It is the entry point to all 86
   pages and three of its five headline statistics are wrong.
3. **Import the 2026 set.** The sheet is generated and checked; five pages, one
   import.
4. **A 2026 scoring note on the 74 pages that lack one.** The same shape as the
   caveat banner built for the 49 removed-curriculum articles: a Matrixify MERGE
   carrying an added block, non-destructive, keeps the SEO. The 2023 to 2025
   callout copy already exists and is correct.
5. **The sixteen mangled titles.** Title-only column in a sheet, no body change,
   no risk.
6. **The eleven stub pages.** Either a page-level caveat matching their titles,
   or retitle away from "Complete Solution". Not unpublishing: it is on the
   `NEVER_AUTO` list and throws away the traffic.
7. **The six unit contradictions**, the one invalid JSON-LD block, and the ten
   pages with none.
8. **Em-dashes and non-ASCII**, whenever a page is being touched for another
   reason. Not worth an import of its own.

## What this report does not establish

- Whether any of the 86 pages rank, and for what. Nothing here reads analytics,
  so the ordering above is by harm rather than by traffic.
- Whether the 2004 to 2013 question TEXT matches the real exams. The Java was
  checked; the prompts were not, and the three `Fish` pages are the reason to
  doubt at least those.
- How many free-response questions the 2020 exam actually had. College Board's
  2020 FRQ PDF is not at the URL every other year uses, so this went unverified
  rather than guessed.
- Whether the archive should get a generator retro-fitted. That is 86 indexed
  bodies regenerated at once and it needs its own plan.
- Anything about the 53 lesson FRQ practice pages, which were out of scope.
