# AP CSA teacher-kit pacing against the College Board CED

Written 2026-09-04, when Tanner asked for the Units 2-4 slide decks and said to
check the official CED and try to match it.

The short answer is that the kit already does, and the way that nearly got
reported wrongly is the part worth keeping.

## The first-party numbers

From College Board's own *AP Computer Science A Course at a Glance*,
<https://apcentral.collegeboard.org/media/pdf/ap-computer-science-a-course-at-a-glance.pdf>,
fetched 2026-09-04 and extracted verbatim to `docs/csa-ced-course-at-a-glance.txt`
beside this file, so the next session can re-derive every number without a
network call.

| Unit | CED class periods | Exam weighting |
|---|---|---|
| 1 Using Objects and Methods | ~32-34 | 15-25% |
| 2 Selection and Iteration | ~29-31 | 25-35% |
| 3 Class Creation | ~20-22 | 10-18% |
| 4 Data Collections | ~50-52 | 30-40% |

The CED states the basis in the same breath, and it is the whole story here:
"pacing is based on 45-minute class periods, meeting five days each week for a
full academic year."

## Two ways to get this wrong, both of which were tried first

**Exam weighting is not instructional time.** Unit 2 carries a higher exam
weight than Unit 1 (25-35% against 15-25%) and *fewer* class periods (~30
against ~33). Allocating days in proportion to exam weight puts Unit 2 at
roughly 45 days and is wrong by half a month. Read the class-period band, never
compute it from the weighting.

**A day is not a period.** The teacher kit is built on 60-minute days: every
`schedule` in `scripts/csa_kit/content_unit<N>.py` sums to 60. The CED's bands
are 45-minute periods. Comparing 76 kit days against ~99-105 CED periods looks
like a 25-day shortfall and is an artifact of the units, not a gap in the
content.

## What the kit actually delivers, normalised to minutes

| Unit | Kit days | Kit minutes | CED periods | CED minutes | Kit vs CED midpoint |
|---|---|---|---|---|---|
| 2 | 24 | 1440 | ~29-31 | 1305-1395 | +7% |
| 3 | 18 | 1080 | ~20-22 | 900-990 | +14% |
| 4 | 34 | 2040 | ~50-52 | 2250-2340 | -11% |
| **2-4** | **76** | **4560** | **~99-105** | **4455-4725** | **-1%** |

Units 2 to 4 together land inside the CED band and within one percent of its
midpoint. Nothing needs re-pacing to call this CED-aligned.

Unit 1 is the outlier and it is not in the kit: its 35 days are read off the
decks already in Google Drive (`AP CSA Unit 1 Preview`, whose own
`COURSE-MATERIALS-INDEX.txt` states "15 topics, 35 instructional days at a 60
minute period"). That is 2100 minutes against a CED midpoint of 1485, so Unit 1
runs 41% long. For a first unit that also serves as the free preview, spending
extra time on objects, methods and the compile-run loop is defensible, but it
is a deliberate choice rather than CED pacing and should be named as one.

## The one real gap

Unit 4 is the only unit that runs light against the CED, at about 11% under.
It is also the CED's heaviest unit by both measures, ~50-52 periods and 30-40%
of the exam, covering arrays, ArrayLists, 2D arrays, searching, sorting and
recursion across 17 topics at two days each.

Two days for `4.15 Sorting Algorithms` or `4.17 Recursive Searching and
Sorting` is tight in a way that two days for `2.12 Informal Run-Time Analysis`
is not. If any content gets added, it belongs in the back half of Unit 4, and
adding roughly four more days there would close the gap exactly. That is a
content decision, not a defect, and nothing in the pipeline blocks on it.

## How to re-derive this

    python3 scripts/csa-deck-days-from-content.py       # kit days per lesson
    npm run smoke:csadeckdays                           # refuses a drift

The kit day counts come from the authored content, never from `build/csa-kit`,
which is gitignored and would make the number reproducible only on the machine
that ran the build.
