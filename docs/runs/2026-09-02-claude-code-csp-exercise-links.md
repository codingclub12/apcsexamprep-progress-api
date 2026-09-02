# The CSP block that could never be run again, and 18 graded exercises nobody could reach

2026-09-02, Claude Code. Board 161. Branch `claude/ceo-agent-setup-sv4e61`.

## What I filed, and what was actually true

Board 161 said AP CSP had no activity listing. It has one. All 35 CSP lesson
pages carry a managed block, `<!-- apcs-exercises (managed) -->`, written by
`scripts/csp-lesson-exercise-links.js` on 2026-08-24, listing the two handout
exercises for the topic. Those 70 pages are reachable.

What is unreachable is a different set. `seed/csp-exercise-2` declares **35
graded exercise-2 banks**, `lib/csp-course-pages.js` renders them as
`ap-csp-course-bi{N}-{slug}-exercise-2`, and `scripts/seed-csp-denominators.js`
seeds a manifest denominator for **every one of the 35**. Eighteen of the pages
are published, all in Big Idea 3. Every one says on itself:

> Applied Practice. 6 questions, scenario driven, every answer is recorded for
> your teacher.

and no page on the site links any of them. A teacher paying for CSP has a
gradebook column with a denominator behind it for work no student can reach.

## Why it stayed that way

**The generator was a one-shot.** It refused any page that already carried its
block:

```js
if (body.includes(MARKER)) { problems.push(`${topic}: the block is already on this page`); continue; }
```

That is a sound guard against appending a second block, and it also meant that
once the 35 pages went live, no change to the block could ever reach them again.
The Applied Challenge pages went live after the block did, so there was no way
to add them.

It strips the fenced region back and rebuilds now, which is what
`docs/internal-linking.md` prescribes and which the suite states more strongly
than the refusal ever did: **running twice equals running once, byte for byte**,
and so does running three times.

`unmark()` refuses rather than guesses in three cases, each with a test: two
managed blocks on one page (an earlier run nested inside its own region),
anything appended after the block (cutting to the end would eat it), and a
marker not followed by this block.

## What ships

`imports/2026-09-02/csp-exercise-links-pages.csv`, **21 of the 35 pages**:

| | |
|---|---|
| 18 | gain the graded Applied Challenge card |
| 3 | correct a subtitle that currently says "not graded" on a page that grades |
| 14 | rebuild **byte for byte** as published, so they are not in the sheet at all |

Those three are topics 1.2, 1.3 and 1.4. They gained auto-graded checks after
the block was written, and because the generator could never run again the card
still tells a student their work is not recorded. That is the generator's own
documented behaviour finally being allowed to happen.

## The card is not authored, and it is not numbered

The href, the question count and the label all come from
`lib/csp-course-pages.js` and `seed/csp-exercise-2`, the same source of truth
that renders the page. The subtitle is the page's own promise with its own count
in it: "6 questions, and every answer is recorded for your teacher".

It is labelled **Applied Challenge**, not Exercise 3, and that is deliberate.
Both sets call themselves Exercise 2: the handout mirror
`/pages/ap-csp-topic-3-11-exercise-2` reads "Topic 3.11, Exercise 2, Sorted or
Not?" and the graded page reads "Topic 3.11, Exercise 2, Binary Search: Applied
Challenge". Two cards labelled Exercise 2 in one row is the confusion this whole
pass exists to remove, and numbering the second one 3 would contradict the page
it opens. There is a mutation for it.

## The 14 byte-identical rebuilds are the evidence

The generator is run against the 35 CSP lesson bodies exactly as the storefront
serves them. Fourteen come back identical to what Shopify is publishing today.
That is a stronger statement about the rebuild than a synthetic fixture can
make, and it is why the wide-card CSS rule is emitted only on a block that has
an applied card: emitting it on all 35 would rewrite 17 live bodies to change
nothing a reader could see, and would destroy the check.

A row that changes nothing is not written.

## One check was narrower than the rule it enforces

`scripts/matrixify-preflight.js` refused this sheet: it accepted `Published At`
only as the bare string `2026-03-01`, and this generator has written
`2026-03-01 12:00:00` since August with live imports behind it. The rule is that
Published At must not be a LIVE SERVER TIME. A fixed time on the fixed date is
the same fixed value with more precision. The check now allows that and still
refuses a fixed time on any other date, and today's date with a fixed time, both
with tests.

## Evidence

- **suite** 43 assertions on this generator, 53 on the preflight, offline
- **mutation** 8 of 8, each tripping the assertion it targets
- **rederive** the byte-for-byte rebuild against the live bodies
- **rederive** the preflight over the finished file, live bodies as `--carrying`
- **live** deferred; both halves false today

## Still open

- **17 of the 35 graded exercise-2 pages do not exist**, in Big Ideas 1, 2, 4
  and 5, while the manifest carries a denominator for each. A teacher sees the
  column; there is no page behind it. Board 163.

## Verified after the import

Both sheets were imported and both were re-checked by refetching live state.

**CSP, 21 of 21 byte-identical to the sheet.** 18 pages now show an Applied
Challenge card and 3 now say "auto-graded check" where they said "not graded".
**Cyber Unit 1, 5 of 5 byte-identical.** All six deploy gates from today pass
all four kinds, live included.

The course-wide measurement that started this, re-run against live bodies:

| course | activity pages | reachable from nowhere |
|---|---|---|
| AP CSA | 197 | 0 |
| AP CSP | 124 | **1** |
| AP Cyber | 112 | 0 |

432 of 433. The one left is `ap-csp-course-bi5-summary-quiz`, a real auto-scored
8-question checkpoint that nothing links, and it is the only summary quiz in the
course: Big Ideas 1 to 4 have none. Board 164, because where a one-off belongs is
a decision rather than a missing link.
