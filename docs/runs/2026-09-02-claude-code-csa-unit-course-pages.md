# Can a teacher work through the whole course? Measuring it, and 41 fixes

2026-09-02, Claude Code. Branch `claude/ceo-agent-setup-sv4e61`.

## What changed about the question

The brief moved off SEO. The thing that matters at the start of a school year is
a teacher getting through the course without hitting an error or a dead end, in
the bundle and on the site. So this pass asks one question of the live content:
**walk the course as a teacher would, and see what breaks.**

## The measurement

Every activity page in the four courses, and whether anything links to it. Read
off 1,311 stored page bodies, scripts and styles excluded.

| course | activity pages | reachable from nowhere |
|---|---|---|
| AP CSA | 197 | **32** |
| AP CSP | 36 | **19** |
| AP Cyber | 112 | 0 |
| AP Networking | 3 | 0 |

The 32 CSA ones are all `-exercise-2`. They are published, they are paid
content, and no page on the site links them.

**Why an omission there is invisible rather than inconvenient.** No CSA lesson
page links its own activities. Exercise 1, Debug and FRQ are reachable ONLY from
the unit course page:

| activity | exists | linked from its lesson | linked from its unit page |
|---|---|---|---|
| exercise-1 | 53 | 21 | 53 |
| debug | 53 | **0** | 53 |
| frq | 53 | **0** | 53 |
| exercise-2 | 38 | 6 | **6** |

So the unit course page is the whole map. If it omits a row, that work does not
exist as far as a teacher is concerned.

## The second thing, which is worse

**Nine rows on the unit pages name a lesson that is not the one they open**, and
six of them name a completely different topic:

| the unit page says | the lesson it opens says |
|---|---|
| 4.6 Arrays as Parameters and Return Values | Lesson 4.6: Using Text Files |
| 4.7 ArrayList Introduction | Lesson 4.7: Wrapper Classes |
| 4.13 Searching and Sorting | Lesson 4.13: Implementing 2D Array Algorithms |
| 4.14 Reading Data from Files | Lesson 4.14: Searching Algorithms |
| 4.15 Using Data Sets with Arrays and ArrayLists | Lesson 4.15: Sorting Algorithms |
| 4.17 Informal Code Analysis | Lesson 4.17: Recursive Searching and Sorting |

A teacher planning from the Unit 4 page writes "4.7 ArrayList Introduction" into
their calendar and opens Wrapper Classes. Two of the six, "Arrays as Parameters
and Return Values" and "Informal Code Analysis", are topics the 2025-2026 CED
removed, so the page is advertising retired curriculum. Three more rows (1.3,
3.6, 3.9) differ only in wording and are corrected the same way, because a unit
page and a lesson page disagreeing at all costs a teacher time.

## What ships

`imports/2026-09-02/csa-unit-course-pages.csv`, the four unit pages:

- **32 Exercise 2 pills added**, so 32 paid pages become reachable
- **9 titles corrected, in 18 places**, because every unit page says each title
  twice and in a different shape per unit

Neither edit authors anything. The pill is the row's OWN Exercise 1 anchor with
two substitutions, `-exercise-1` to `-exercise-2` in the href and `Exercise 1` to
`Exercise 2` in the label, so it cannot introduce a style, a word or an attribute
the page did not already have. The title is whatever the lesson page states in
its own h1.

## Four things this got wrong first, all caught by an assertion

1. **It fixed half the page.** Every unit page carries each title twice: a card
   listing above and a row strip below. The first version repaired only the strip,
   which would have left "Lesson 4.7 ArrayList Introduction" in the card that
   opens Wrapper Classes. A suite assertion caught it; reading the page did not.
2. **The second listing is a different shape on every unit.** `u1-lesson-card`,
   `u4-lesson-card`, `u3-topic-row`. Chasing markup would have missed Unit 3, so
   the repair stopped chasing markup: it replaces every occurrence of the exact
   stale title that sits within 400 characters of a link to that very lesson.
3. **A substring replace would have eaten a correct title.** "Searching and
   Sorting" is row 4.13's stale title and also sits inside row 4.17's correct one,
   "Recursive Searching and Sorting". The match is a whole text node now. The
   live fixture does not contain that collision yet, so the mutation battery
   reported the guard as untested until a synthetic case was written for it.
4. **Three Unit 3 lesson pages head themselves differently**, "AP CSA 3.3:
   Anatomy of a Class" rather than "Lesson 3.3:". Both state the number and the
   title, so both are accepted; the inconsistency is left alone rather than fixed
   in passing.

## Evidence

- **suite** 71 assertions, offline, against the four live unit pages in full and
  each lesson page's h1 verbatim
- **mutation** 8 of 8, each tripping the assertion it targets
- **rederive** the preflight over the finished file, live bodies as `--carrying`
- **live** deferred; every assertion in it is false today

## Found and NOT fixed

- **AP CSP has no activity strip at all.** 19 of its 36 activity pages are
  reachable from nowhere, and unlike CSA there is no unit page listing them to
  add a pill to. That needs a listing built, not a link added. Board 161.
- **AP CSA Unit 1 has no Exercise 2 at all**, on any of its 15 lessons, while
  Units 2, 3 and 4 have one on 38 of 38. Unit 1 is the free preview and the first
  week of the year, and it is the thinnest unit in the course. Board 162.
