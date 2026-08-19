# 2026-08-19 - Is it a full year? The gap is verbs, not pages

Agent: Claude Code. Branch: `claude/course-networking-strategy-8chhni`, off `main`.

## The question

Not "does the course cite the content" (58.5 percent, already measured) but
"does it reach a full-year structure, and what is missing".

## Three things the framework says that change the answer

1. **It is a one-semester college course** taught on a schedule of five 45-minute
   periods a week. No prerequisites.
2. **College Board has not published the pacing.** The framework literally reads
   "Topics in Unit 1-4 typically require [X-Y] class periods of instruction."
   An unfilled placeholder in the published PDF. Nobody has said how long a topic
   should take, so nobody can claim to match AP pacing yet.
3. **Every topic is mandatory** to use the Advanced Placement label. Teachers may
   reorder but not drop. A second, independent reason not to add pages.

## The finding: the gap is in the verbs

Every framework skill resolves to one of four verbs, and only the first two
survive contact with a web page.

| Verb | Share of the 55 skill assignments |
|------|----------------------------------:|
| .A Identify or explain | 47% |
| .B Determine or analyse | 29% |
| .C Implement and document | 18% |
| .D Verify | 5% |

Set against what the course has:

- **Hands-on: 45 percent of topics, 7 percent of the grade.** Ten of 22 topics
  carry an implement or verify skill. The course answers with four labs, one per
  unit, 32 of 448 points. A student can finish with a strong grade having
  configured almost nothing.
- **Collaborate: 0 percent, no asset.** Skill category 4 is required in topics
  1.4 and 2.4 and the product has no team task, no roles, nothing the gradebook
  can hold. This is the one gap self-paced delivery cannot close by trying
  harder.

## Structural arithmetic

About 180 class periods a year against 22 topics is roughly 8 periods per topic,
against pages of about 2,000 words. Twenty minutes of reading per six hours of
class. Derived rather than College Board's number, and assumes every period is
instructional, so it is an order of magnitude and is labelled as such.

## What is deliberately NOT called a gap

Topic coverage is complete at 22 of 22, structure and titles match, no invented
identifiers, and 55 graded events is a reasonable assessment volume. The course
is not short of pages. It is short of things students do.

## What shipped

- `config/networking-framework-skills.json` - the per-topic Suggested Skills for
  all 22 topics, plus the 16 sub-skills, sha-pinned to the framework PDF.
- `scripts/networking-skill-coverage.js` - demand versus assets. Reads the asset
  side out of `seed-manifest.js` rather than restating it, so it cannot drift
  from what is actually seeded.
- `docs/ap-networking-full-year-readiness.md` - the analysis.

## Extraction note

The Suggested Skills rail moves horizontally between page geometries, the same
problem that cost three rounds on the EK extraction. Anchoring on the position of
the SUGGESTED SKILLS label rather than a fixed x coordinate got 22 of 22 on the
first try; a fixed threshold had got 7.

Sub-skill wording for 1.B, 2.A and 3.B is reconstructed from topic pages rather
than lifted from one skills table, and is labelled paraphrase in the data. The
codes and their per-topic assignment are exact.

## Still open

- The recommendation itself is a teaching judgement and is left to Tanner. The
  numbers are measured; whether they add up to a full year is not mine to call.
- CED watcher still never run. First scheduled 2026-08-24 09:30 UTC.
