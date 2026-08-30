# A teacher's four questions about the CSP bundle, answered against live sources

2026-08-30, Claude Code. A paying CSP teacher (grade 10, 4 periods a week, one of
them a 100 minute block) emailed four questions. Tanner asked what we actually
have and what we do not. Nothing was modified: this is an investigation.

Report artifact: https://claude.ai/code/artifact/0f62bf13-0041-41f1-b48b-ff8680e35386

## The short version

Three of the four questions have good answers the materials already contain and
fail to surface. The fourth is a real defect and it is systemic.

## 1. The bell ringers exist. Nothing is named "bell ringer".

Every CSP lesson day has one, in three places, with identical text:

- deck slide 3, in all four editions (TEACHER/Student x CB/DeepDive)
- guided notes packet, section 2, with three write-in lines
- the live site notes page, as a card under the objectives

There is **no standalone bell ringer file**, and that absence is the whole source
of the doubt. Verified two ways: the Shopify Admin API returns 25 files for
`AP-CSP_1-3` and none matches bell/ringer/warmup; the label inventory across all
446 entries of `seed/csp-teacher-files.json` has 26 resource types and none is a
bell ringer.

The Lesson Map's "In this folder" list does not mention the bell ringer either,
so a teacher scanning it concludes there is not one. One line would have
prevented the email.

Second warm-up surface he had not found: the Teacher Guide pacing opens both days
with "QOTD + bell ringer", and `/pages/ap-csp-question-of-the-day` is live.

## 2. THE DEFECT: one Teacher Guide, two decks, one off-by-one

He asked where the "June Mystery" teaser was on Day 1. It is there, as the last
line of the last slide, on the End of Day 1 slide under TODAY YOU LEARNED and UP
NEXT. Day 2 slide 3 pays it off and its notes say "this is yesterday's teaser".
The chain is intact.

The map is wrong, not the territory. There is ONE TeacherGuide.docx per topic but
TWO decks, and the guide's slide numbers are written against the Deep Dive deck,
which is one slide longer. He teaches CB Standard.

For 1.3: CB deck is 17 slides, Deep Dive is 18. The guide says the deep dive is
slide 17 and the day close is slide 18. On the CB deck slide 17 IS the day close
and there is no 18. Slides 1 through 16 are identical in both decks, so the guide
reads perfectly until the Deep Dive row and is off by one for the last two rows,
one of which carries the teaser he was hunting for.

Sampled 8 topics across all five Big Ideas. **6 of 8** have a guide whose Day 1
numbers run past the end of the CB deck, and in every one the guide's maximum
equals the Deep Dive slide count exactly:

| topic | CB | DeepDive | guide max Day 1 | CB teacher misled |
|---|---|---|---|---|
| 1.1 | 18 | 19 | 19 | yes |
| 1.2 | 15 | 16 | 16 | yes |
| 1.3 | 17 | 18 | 18 | yes |
| 1.4 | 14 | 15 | 15 | yes |
| 2.1 | 15 | 15 | 15 | no |
| 3.1 | 17 | 17 | 17 | no |
| 4.1 | 15 | 16 | 16 | yes |
| 5.1 | 14 | 15 | 15 | yes |

Where the two decks are the same length there is no mismatch. Day 2 shows the
same shape (CB 16, DeepDive 17, guide cites 16-17 for the close).

Same family as ledger #98, #99 and #100, which are Cyber teacher guide defects.
This is the CSP instance and it is worse, because it hits the DEFAULT track.

## 3. PINs already work

Students self-serve at `/pages/join`: class code, name, own 4-digit PIN. Teacher
assigns nothing. Live page is 36,378 bytes carrying `joinCode`, `joinName` and
`p1`-`p4`, plus a sign-in block on `lp1`-`lp4`. Identity is (name, PIN) across
courses per `docs/student-accounts.md`.

PIN reset DOES exist, contrary to what CLAUDE.md's endpoint list implies: it is a
`pin` field on `PATCH /classes/:code/students/:studentId` in `routes/teacher.js`,
not a `POST .../reset-pin` route. Worth confirming the dashboard exposes a button.

## 4. THE GAP: no lesson page links to its guided notes

Pulled all 17 non-BI3 CSP lesson page bodies live.

| checked | pages | result |
|---|---|---|
| lesson pages linking to guided notes | 17 | **0 of 17** |
| BI3 lesson page linking to notes | 1 | links correctly |
| lesson pages with a graded quiz | 17 | 6 items each |
| lesson pages with CFUs | 17 | **0 CFUs anywhere** |

BI3 is fine because those pages were generated here by `lib/csp-course-pages.js`,
which wires the link. The other 17 came through the earlier pipeline.

Two consequences:

- Tanner's note to the teacher says students "do the guided notes and CFUs on the
  site". The notes are there. **The CFUs are not**, on any CSP lesson page.
- The notes pages tell students four times per page to "check yourself with the
  matching CFUs on the Topic 1.3 page". Those CFUs do not exist there.

## 5. Flow: the Lesson Map already answers it

`AP-CSP_1-3_LessonMap.docx` has a section headed "How the three surfaces fit
together": slides are the daily instruction, the folder is private scaffolding,
the website is "student practice that paper cannot do". So the lesson page is a
practice and review surface, after the deck and notes. The teacher's own instinct
(end of hour, homework, warm-up on quiz day) matches it exactly.

The Lesson Map also lists the student URLs, including the notes page he could not
find. One flaw: Exercise 1 and Exercise 2 both print the TOPIC page URL instead
of `/pages/ap-csp-topic-1-3-exercise-{1,2}`. Both exercise pages are live and
auto-graded and the lesson page links them correctly, so nobody is stuck.

Timing: the guide budgets Day 1 at 58 min and Day 2 at 56. Without the optional
Deep Dive slide it is 53 and 51 against his 50 minute periods, which matches what
he reports.

## Recommended fixes, ranked

1. **Add a guided notes link to 17 lesson pages.** Highest value, closes his
   actual question, same one-line addition BI3 already has. Matrixify sheet.
2. **Fix the Teacher Guide slide numbers or split the guide per track.** Hits ~6
   of 8 topics and misleads every CB Standard teacher. Cheapest adequate fix is a
   note in each guide saying the numbers follow the Deep Dive deck.
3. **Reconcile the CFU promise.** Either add CFUs or stop the notes pages sending
   students to look for them. Rewording is far cheaper and ships with fix 1.
4. **Name the bell ringer in the Lesson Map's "In this folder" list.** All 35.
5. **Correct the Lesson Map exercise URLs.**

## Method

- Shopify Admin API for the file inventory and page existence.
- pptx and docx read directly off the Shopify CDN and parsed from their XML
  internals, so slide counts come from `ppt/slides/slideN.xml` and not from
  filenames or documentation.
- Live page bodies via `scripts/fetch-page-bodies.js`, which writes each body to
  disk so no page body passes through a model's context.
- Storefront curl was rate limited (429) from this container's proxy IP; the
  repo's own fetcher and the Admin API were used instead.

Nothing in Drive, the theme, Shopify or the manifest was modified.
