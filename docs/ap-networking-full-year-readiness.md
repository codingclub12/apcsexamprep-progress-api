# Is AP Networking a full year, and what is missing

Measured 2026-08-19 against College Board's published course framework
(102 pages, sha256 pinned in `config/networking-framework-skills.json`) and
against the course's own seeded manifest.

## What College Board actually says

Three things from the framework matter more than anything on the site.

**It is a one-semester college course, taught over a high school year.** The
framework states the course "is designed to be the equivalent of a one-semester
college introduction to networking course," on "a schedule in which the class
meets five days a week for 45 minutes each day." There are no prerequisites.

**College Board has not published the pacing.** The framework says "Topics in
Unit 1-4 typically require [X-Y] class periods of instruction." That is a literal
unfilled placeholder in the published PDF. Nobody, including College Board, has
said how long a topic should take. Anyone claiming to match AP pacing right now
is guessing.

**Every topic is mandatory.** "To receive authorization to label this course
'Advanced Placement,' all topics must be included in the course." Teachers may
reorder, but may not drop. So the 22 topics are a floor, not a menu, which is a
second and independent reason not to add speculative pages.

## The structural arithmetic

A year on College Board's own stated schedule is about 180 class periods. The
course has 22 instructional topics. That is roughly **8 class periods per topic**,
against pages measuring about 2,000 words each.

Two thousand words is twenty minutes of reading. Six hours of class time per
topic is the gap, and it is not a content-coverage gap; it is an activity gap.
This is the same conclusion the depth audit reached from the other direction:
the pages are not too short for what they do, they are too few things to do.

That 8 periods is derived, not College Board's figure, and it assumes every
period is instructional. Treat it as an order of magnitude.

## What the framework asks students to DO

The real finding is not in the knowledge, it is in the verbs. Every skill in the
framework resolves to one of four, and only the first two survive contact with a
web page.

| Verb | Meaning | Share of the 55 skill assignments |
|------|---------|----------------------------------:|
| .A | Identify or explain | 47% |
| .B | Determine or analyse | 29% |
| **.C** | **Implement and document** | **18%** |
| **.D** | **Verify** | **5%** |

By category:

| Skill | Share |
|-------|------:|
| 1 Connect and Configure | 42% |
| 2 Secure | 31% |
| 3 Troubleshoot | 22% |
| 4 Collaborate | 5% |

## The two real gaps

**Hands-on is 45 percent of the topics and 7 percent of the grade.**

Ten of the 22 topics carry an implement or verify skill: 1.4, 2.2, 2.4, 2.6,
3.3, 3.4, 3.5, 4.3, 4.4, 4.5. The course answers that with four labs, one per
unit, worth 32 of 448 points.

So a student can finish this course with a strong grade having configured almost
nothing. The framework's verbs for those ten topics are "implement and document"
and "verify," and a multiple-choice item cannot assess either.

**Collaborate is 0 percent of the grade and has no asset at all.**

Skill category 4 is required in topics 1.4 and 2.4: develop shared team
objectives, determine roles and responsibilities, use AI as a collaboration tool,
complete assigned work as part of a team. The course has no collaborative
activity, no team structure and no way to record one.

This is the one gap that self-paced delivery cannot close by working harder. It
needs a teacher-facing artifact: a paired or small-group task with defined roles,
a deliverable, and something the gradebook can hold.

## What is NOT missing

Worth stating plainly, because the instinct is to build more:

- **Topic coverage is complete.** 22 of 22, matching the framework exactly.
- **Structure matches.** Four units, correct titles, correct sequence.
- **No invented content.** Every EK identifier cited on the site is real.
- **Assessment volume is reasonable.** 55 graded events, 448 points.

The course is not short of pages. It is short of things students do.

## What this suggests, in order

1. **Lift hands-on from 7 percent.** Ten topics ask for it and four labs answer.
   Per-topic configuration activities on those ten would move the course from
   "read and be quizzed" to something that matches the framework's verbs.
2. **Build one collaborative task.** Topics 1.4 and 2.4 require it and nothing
   in the product addresses it. One well-built team task with roles and a
   deliverable closes a category currently at zero.
3. **Then the annotation pass** from the depth audit, which lifts EK coverage
   from 58.5 percent without new content.

## Reproducing this

```
node scripts/networking-skill-coverage.js          # demand vs assets
node scripts/networking-skill-coverage.js --json
```

The skill map is `config/networking-framework-skills.json`, extracted from the
Suggested Skills rail on all 22 topic pages of the framework. The asset side is
read out of `scripts/seed-manifest.js` rather than restated, so it cannot drift
from what is actually seeded.

Every number here is measured. Whether it adds up to a full year is a teaching
judgement, and that one is not mine to make.
