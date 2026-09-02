# AP CSA: the gradebook and the site disagree about what the course contains

Board 165. 2026-09-02, Claude Code. Findings only; nothing was changed.

## How this was found

`GET /api/health` has been reporting `reporters.ok: false` on production. That
check asks a narrow question: are there graded activities students complete where
no score has ever arrived? It listed 11, and four of them were AP CSA Unit 1:

    ap-csa unit-1 1.1 exercise-2
    ap-csa unit-1 1.2 exercise-3
    ap-csa unit-1 1.5 exercise-3
    ap-csa unit-1 1.7 debug

Three of those name an activity with **no page on the storefront**. The check
joins `course_denominators`, so a denominator exists for each. That is what
started this.

## What the measurement says

`node scripts/csa-activity-page-gap.js`, which reads the three authorities and
prints where they disagree:

- `COURSES['ap-csa'].units[*].activities` decides which COLUMNS render
- `seed/csa-course-manifest.js` decides what each column is WORTH
- `smoke/fixtures/live-page-handles.txt`, captured off the storefront, is what a
  student can actually open

### 1. Every AP CSA gradebook renders 53 Exercise 3 columns for an activity that exists nowhere

`exercise-3` is listed in the config for all four units, so a teacher sees the
column on all 53 lessons. There is not one `exercise-3` page in AP CSA. Verified
three ways: zero handles anywhere contain `exercise-3`, and three constructed
URLs return 404.

### 2. 302 of 1007 course points, 30 percent, are priced against work with no page

    unit-1 exercise-2   15 entries    90 points
    unit-1 exercise-3   15 entries    60 points
    unit-2 exercise-3   12 entries    48 points
    unit-3 exercise-3    9 entries    36 points
    unit-4 exercise-3   17 entries    68 points

The `exercise-2` row is board 162 seen from the other side: 38 of the 53 pages
exist and all 15 missing are Unit 1. Unit 1's config correctly omits
`exercise-2`, so those do not render as columns, but their 90 points still
inflate the course total.

`possible` is the whole-course denominator, so pace reads about 30 percent low
for every AP CSA student. The GRADE is not affected:
`lib/gradebook-contract.js` computes `earned / graded` over attempted work only,
and that rule is what contains this to pace and columns.

### 3. The gap runs the other way too: 53 live FRQ pages are priced at nothing

Every one of the 53 lessons has a live `-frq` page. Not one appears in the
manifest, so no FRQ a student writes can ever reach a gradebook. This was not
what the search was for and is the more surprising half.

## What this does NOT establish

Which correction is right. An expected column that renders blank is a legitimate
way to say "planned, not built yet", and `lib/gradebook-contract.js` endorses
exactly that: an activity that never reports "shows up as a column of blanks
instead of silently not existing". So `exercise-3` may be a deliberate
placeholder for work Tanner intends to author, in which case the column belongs
there and only the FRQ half is a defect.

That is a product decision and it belongs to a human, which is why nothing here
was changed. The two candidate corrections are:

- drop `exercise-3` from the CSA course config and the manifest, which removes 53
  phantom columns and 212 phantom points from every gradebook
- keep it and build the pages

The FRQ half has no such ambiguity in one direction: the pages exist and students
can do the work. Whether an FRQ is auto-gradeable at all is the open question
there, since an FRQ is free-response and the zero-PII rule forbids storing what a
student types.

## Also worth knowing

Removing a denominator that already exists in production is not a seed-file edit.
Seeding is insert-or-ignore, so the rows persist; `POST /api/admin/denominators/remove`
is the path, and `smoke/manifest-prune.js` documents the equivalent rule for
`course_manifest`: a prune must REFUSE to delete any item with recorded attempts,
because attempts are gradebook data and the manifest row is what makes one
legible.
