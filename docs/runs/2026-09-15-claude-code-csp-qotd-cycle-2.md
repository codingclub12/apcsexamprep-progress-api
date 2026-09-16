# CSP daily questions stopped at day 30, and wore the wrong CSS getting there

2026-09-15, Claude Code. Board 334. Theme PR
https://github.com/codingclub12/APCSExamPrep-theme/pull/116

## What arrived

Rona Williams, Gwinnett County Public Schools, by email:

> I am have my APCSP students using the site for the daily questions. It seems as
> though the format of the site has changed.
> We can not figure out how to get the 2nd cycle or next set of questions after
> the 1st 31.

Two observations, and it is worth reading them as two. The second one is the
one that gets acted on, because it is the one phrased as a question. The first
one is a whole separate defect that nobody would have found from the second.

## What was true

Both are `assets/ap-csp-qotd-hub.js`, and they have one cause.

`/pages/ap-csp-question-of-the-day` carries its own copy of the hub in its Body
HTML, with a hardcoded 60 day map and two cycles. `layout/theme.liquid` also
loads the theme asset on that exact path. Both write `#dp-accordion`. The asset
runs last, after three fetches, so whatever it renders is what the student
keeps, and it was rendering the wrong thing twice over.

**Too short.** `MAX_DAY` was pinned at 30. Measured live through
`lib/storefront-fetch.js`:

```
blog=ap-csp-daily-practice  pages=3  total=111
c1: 30 posts, days 1-30
c2: 30 posts, days 31-60
articles the hub could render: 42
articles live but UNREACHABLE from the hub grid: 69
```

All 30 cycle 2 posts are published. Days 31, 32, 45 and 60 sampled end to end:
200, and a four option question on each. Nothing on the page linked to any.

**Wrong clothes.** The asset emitted `dp-day-tile`, `dp-day-num`,
`dp-day-topic`, `dp-day-grid`, `dp-cycle-title`, `dp-cycle-body`. The page's
inline stylesheet has rules for none of those. It styles `dp-schedule-day`,
`dp-schedule-day-num`, `dp-schedule-day-topic`, `dp-schedule-grid`,
`dp-cycle-inner`, `dp-cycle-content`, because those are what the copy in the
page body builds. So a six across grid rendered as a bare column of underlined
links, under a heading that came out white on light grey.

That is the format change. It was live and nobody had reported it until she
mentioned it in passing, in the sentence before the one that asks a question.

## Evidence

Chromium could not reach the live origin from this container: the egress proxy
re-terminates TLS and its CA is not in Playwright's browser trust store.
Disabling verification was not on the table, so the browser evidence is a
replay. Every byte in it came off the live storefront today: the page HTML, the
blog's `qotd-json` view (all three pages) and the deployed CDN asset. Only the
asset's host is rewritten to localhost, so script order and defer semantics,
which are the thing under test, are untouched.

| | cycles | day tiles | links into cycle 2 | badge | styled |
|---|---|---|---|---|---|
| deployed asset | 1 | 30 | 0 | Day 13 of 30 | no |
| this change | 2 | 60 | 30 | Day 13 of 60 | yes |

A live check against the real page is still owed after the merge. That is the
one that matters and it is not this.

## The part worth keeping

**The suite was green for this the whole time, and the fixture always had the
answer in it.** `tests/qotd/assert.js` claimed `builds all 30 day tiles` and
`badge reads Day N of 30` against `fixture-articles.json`, which carries 111
articles across days 1 to 60, 30 of them cycle 2. The defect did not slip past
the tests. The tests asserted it. Had anyone proposed this fix before today,
the suite would have gone red and read as the fix being wrong.

So the claims are derived from the fixture now rather than from a typed number,
a second reading of that same fixture keyed off the handle instead of the title
scoring has to agree on all 60 URLs, and the emitted classes are diffed against
the set the page actually styles, in both directions. 24 claims.

**Mutation testing found two hollow guards, and both were mine.** The
`PREFERRED_HANDLE_PREFIXES` bonus and the canonical title bonus cover for each
other: the duplicates in the fixture are titled "Day 31 Procedure Abstraction",
with no colon, so the title rules already beat them 95 to 15 and the handle rule
never decides anything. Deleting either left the suite green.

Two rivals now exist for that, on two different days, each tying on every rule
but one:

- day 31, a good title on a non-canonical handle, so only the handle rule saves it
- day 45, a canonical handle with a sloppy title, so only the title rule saves it

Each mutation now turns exactly one claim red, verified by running them and
reading the failure list rather than the exit code. 11 of 11 caught.

The general lesson is the one CLAUDE.md already states and this is another
instance of: a guard nobody has seen fail is not known to work, and two rules
that overlap will each report the other's coverage as their own.

## Still open

- **The page body still carries a second copy of this hub**, with its own
  hardcoded 60 day map. Today the two agree. The day they disagree, the asset
  wins silently and nothing says so. Removing the inline copy is Body HTML, so
  it ships as a Matrixify sheet, deliberately and on its own.
- **`/pages/daily-practice` does not mount this hub at all** (`dp-accordion` is
  absent from its live body). It is linked from the main nav as "Daily Practice"
  while the hub lives at `/pages/ap-csp-question-of-the-day`. Not looked at
  further today.
- **The nine posts with no day number** in their titles (`internet-fault-tolerance`,
  `binary-to-decimal-conversion`, and seven more) are invisible to the hub by
  design, since it keys on the day. Whether they are meant to be in the rotation
  is a content question.
- **42 duplicate posts** carry day numbers 18 to 60 under bare `day-<n>-` handles,
  competing with the canonical series. The scoring picks the canonical one on
  every day, verified against both live data and the fixture. They are not a
  bug today; they are why the scoring exists.

## Not done here

Nothing was marked verified. The live check after deploy has not run at the time
of writing, and the session that made the change is not the one that should say
it is true.
