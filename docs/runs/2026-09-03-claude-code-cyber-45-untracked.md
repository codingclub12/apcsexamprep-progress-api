# Cyber 4.5 stops being a lesson

Board 188. 2026-09-03, Claude Code, branch `claude/new-session-xpj22t`.

## What was wrong

`ap-cyber-unit-4-lesson-5` is live. `utils.pageFromHandle` derived a lesson 4.5
from the handle arithmetic, `utils.COURSES` declared a 4.5 column to match, and
`scripts/seed-cyber-denominators.js` priced three of its activities. So a teacher
running AP Cybersecurity had a gradebook column for a topic the exam does not
have: the CED's Unit 4 is 4.1 through 4.4, and there is no 4.5.

Nothing was broken in the sense of throwing. Every piece agreed with every other
piece, which is why it survived: the config listed the lesson the denominators
priced, and the denominators priced the lesson the config listed. The only thing
that disagreed was College Board.

## What changed

Two repos, because the number that reaches the gradebook is not chosen in this one.

**apcsexamprep-progress-api**

- `utils.js`: `4.5` joins `2.5` in `CYBER_NOT_IN_COURSE`, and Unit 4's `lessons`
  drops to `['4.1','4.2','4.3','4.4']`.
- `scripts/seed-cyber-denominators.js`: the three `4.5|*` keys come out. They are
  kept as a comment with their values, because the measurements were correct and
  would be needed again if the page is renumbered.
- `smoke/cyber-denominators.js`: the assertions that 4.5 IS authored become
  assertions that it is not, the same shape 3.6 got when Unit 3 was renumbered.
- `smoke/cyber-topics.js`: a new two-way check that every cyber lesson column
  matches a CED lesson id and every lesson id has a column.
- `smoke/cyber-unit3-lessons.js`: the theme transcription grows unit-2 and unit-4
  tables, and a new check 6b that every handle the server refuses is refused by
  the storefront rule too.

**APCSExamPrep-theme**

- `snippets/apcs-cyber-lesson-map.liquid`: `unit-4` is listed as ordinals 1 to 4,
  so ordinal 5 returns null and both callers leave the page untracked. `unit-2`
  is listed for the same reason (below).

## The half that mattered, and nearly got missed

Untracking on the server is not enough on its own. `POST /api/student/score`
takes an explicit `lesson` over the handle, deliberately and correctly, and the
storefront sends an explicit lesson: `quiz-tracker-wiring.liquid` sets
`window.APCS_PAGE` from `APCS_CYBER_LESSON(unit, ordinal)`, which fell through to
`4` + `.` + `5` for any unit with no override table. So a server-only change would
have left `pageFromHandle` returning null while the theme kept posting 4.5, and
every offline suite would have been green.

The existing drift check could not have caught it either. It compares theme
against server only for handles the SERVER maps, and skips the rest, so it goes
quiet on exactly the handles an untracking change is about. That is what check 6b
is for.

## What the new check found while it was being written

The theme's retired-page fence is `/^ap-cyber-unit-2-lesson-5-/`, a literal regex
in two snippets, and the trailing hyphen means it catches the four 2.5 activity
pages and would miss a bare landing page at `ap-cyber-unit-2-lesson-5`. No such
page is live, which is the only reason nothing has filed under 2.5 through that
route since the 2.5 decision was made. Listing unit-2's four real ordinals in the
map closes it whether or not the page ever appears. One line, and it is pinned by
its own mutation.

## Evidence

`deploy-gates/2026-09-03-cyber-45-untracked.json`, four kinds:

- **suite**: `smoke:cyberunit3`, `smoke:cyberdenoms`, `smoke:cybertopics`. All 177
  offline suites pass.
- **mutation**: five, each red on its own named assertion. Re-adding the column
  trips the CED comparison; restoring a denominator trips the ban; removing 4.5
  from `CYBER_NOT_IN_COURSE` trips all five handles; removing either fence from
  the theme transcription trips 6b, the unit-2 one on the bare handle
  specifically.
- **rederive**: Unit 4's four topics counted out of
  `CED-UNITS-2-5-EXTRACT.txt` directly, not out of the generated
  `config/cyber-topics.json`, and compared to the config.
- **live**: `/api/health` reports `cyber_denominators.total`. It read 98 on commit
  7d21df3 before this and must read 95 after. A count that moves, rather than a
  status that was already true.

## What is open, and it is a decision rather than a task

The page is on-syllabus. It is titled "4.5 Securing IoT and Embedded Devices", and
the CED covers embedded computers and IoT devices at 4.1.A.4 and 4.1.A.5, inside
topic 4.1. So this is NOT the 2.5 case, where content had left the course. It is
a real lesson with no topic number.

Unit 3 has already answered the same question once, in the other direction: CED
3.1 is taught over two pages and carries two lesson ids, 3.1a and 3.1b, precisely
so both halves keep their own gradebook cells. Doing that here would make this
page 4.1b and give it a column again without inventing a topic.

That is Tanner's call, not an agent's, and it is why nothing here deletes
anything. Stored rows are untouched, the seeder is insert-or-ignore so no
denominator row was removed from production, and re-adding a lesson id restores
the previous behaviour exactly.

**What could not be checked from this session.** Whether any class has real work
already filed under cyber 4.5. `GET /api/admin/class/:id/gradebook` is
fail-closed and this session holds no admin key, so the honest statement is that
the exposure is unknown and reversible, not that it is zero. If a class does have
work there, it is still in the ledger; it stops rendering until a lesson id
points at it again.

## Housekeeping

A probe of the claim endpoint left a check row on the command center,
`smoke | probe-claim-502 | pass`. It is a passing row so it does not surface in
the digest, and there is no agent path to delete a check. Removing it needs a
hand at the database.
