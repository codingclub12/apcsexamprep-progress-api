# The agent roster, and what the second half of 2026-09-02 proved about method

Date: 2026-09-02
Agent: Claude Code (session: CEO agent setup)
Boards: 153, 158, 163, 165, 166, 167, 168, and seven closed as stale
PRs: 469 through 475, all merged. Production on 2264d03.

## The number that started the second half

Tanner said he felt lost. The board had 37 open items and **30 of them were
assigned to him**.

That is not a staffing shortage. It is a routing failure, and most of it was
mislabelled: roughly 19 of the 30 were work an agent could take to a reviewed
artifact with only an import left. Items land on `owner: tanner` by where they
were filed, not by a judgement, and nobody had ever re-read the pile.

Six were closed the same afternoon as already done, duplicated, or wrong. The
board being untrustworthy is what made it unreadable, not its length.

## The roster

`.claude/agents/` now holds five. `ceo` and `verifier` already existed and were
not being used; `inbox`, `builder` and `auditor` were written today.

    ceo       what should we be doing. Reconciles, ranks, dispatches.
    builder   one item to a reviewed artifact with a gate behind it.
    auditor   can a teacher get through the whole course.
    inbox     read the mail, check the claim against live, draft, never send.
    verifier  collect the proof so the verify click takes ten seconds.

They are files in this repo, so every session that opens it already has them.
There is no install step and no session per agent: a subagent runs inside a
conversation with its own context and hands back a summary. The point is
context isolation, not organisation. The auditor can read 1,300 pages and
return twenty lines.

Each carries the specific failure it exists to prevent, taken from this repo
rather than from general advice. That is the part worth maintaining.

## Five things this day proved, in the order they cost something

### 1. A measurement that does not go through the code resolving a convention will report the convention as a defect

Three times, in one day, by three different passes:

- `href="/pages/'+prev.handle+'"` inside a `<script>`, read as 141 dead links
- `ap-cyber-` versus `ap-cybersecurity-`, one course with two prefixes, read as
  eight unbuilt pages
- `ACTIVITY_ALIASES = { frq: 'exercise-3' }`, read as 53 gradebook columns with
  no page AND 53 live pages priced at nothing, the same error counted twice in
  opposite directions

That third one is the signature: **when a sweep reports a symmetrical gap,
suspect an alias before believing it.** All three were filed as findings. All
three were withdrawn.

### 2. The board's stated CAUSE was wrong three times while its SYMPTOM was real

Board 163 said `seed-csp-denominators` prices all 35 exercises so the gradebook
shows a column with no page. The symptom was exactly right. The cause was not:
the column comes from `COURSES['ap-csp'].units[*].activities`, and the seeder's
`CSP_EXERCISE_2_PAGES_LIVE` is `false` so it prices nothing at all. Someone
fixing the seeder would have changed nothing a teacher sees.

Reading rule for this board: **trust the symptom, check the cause.**

### 3. The safety is in the fixture, not in the code

`scripts/csp-lesson-exercise-links.js` gates on a set of verified live handles.
The 18 Applied Challenge cards that shipped in the morning were 18 only because
that fixture happened to list exactly the 18 live pages. Publishing 17 more
pages did not make the generator notice them, and would not have, ever.

A guard whose correctness depends on a data file being current is a guard that
will be right until the day the data file is stale, and it will be silent about
it. Round two had to regenerate the fixture from live before re-running.

### 4. Mutation testing found a hollow guard of mine, and hollow guards get deleted

`scripts/cyber-cc-extra-practice.js` carried a "nothing outside the strip
moved" check. The suite stayed green with it broken, because a single
`replace(BEFORE, AFTER)` with more-than-one already refused **cannot** change
anything outside the strip. The check could never fail.

It was deleted, not decorated with a contrived test. An unfalsifiable check
reads as safety and provides none. The property is still asserted against the
real body in the suite, where it is a fact about the output rather than a branch
that never runs, and the gate carries a note so nobody adds it back believing it
was an oversight.

### 5. A near-twin is a reference for CONVENTION, never for CONTENT

Every mangled CSA daily-practice article has a clean twin under a hyphenated
slug: same template, same dark code block, same slug tail. Copying the body
across would have been one line of work.

They are different questions. The twin sums 1 to 5 and prints 15; the mangled
article sums 1 to 4 and prints 10. That repair would have shipped a wrong answer
to 25 pages with every structural check green. It is now a committed fixture
with an assertion naming it.

## The check worth stealing for other repairs

The daily-practice repair could not prove its own result was right. A deletion
that ate a bound leaves a body that is well formed, passes the deletion proof,
renders perfectly, and teaches a wrong answer.

The article settles it. Each one carries a multiple-choice key on the far side
of the page that the repair never touches. `scripts/mini-java-trace.js`
interprets the recovered program and requires its output to be the option marked
correct. **25 of 25 agreed.**

The instrument interprets rather than evaluates: no `eval`, no `new Function`,
no transpile, because the input is text off a live storefront page. It walks a
parse tree over a fixed grammar and refuses anything outside it, so an
unsupported construct is a reported skip rather than a silent pass.

Generalised: **the second witness is usually already on the artifact.** An
answer key, a lesson's own heading, a page's own title. It only has to be
something the change does not touch.

## What is still with Tanner, and why none of it is an agent's

- **158** two indexed head-term URLs serve an empty body. Needs him to unpublish
  first (a redirect does not fire while the page answers 200, and Matrixify logs
  every row as created anyway) and to choose between the hub with more content
  and the hub with more inbound links.
- **167** 62 CED Essential Knowledge codes visible to students across 16 live CSP
  exercise pages. Every sampled one is load-bearing in the question text, so
  removing them means rewriting the questions. Big Idea 1 holds 52 of the 62.
- **162** CSA Unit 1 has no Exercise 2 because the banks were never written. 90
  questions.
- **168's loose end** `unitDays()` still sums 37 days of free-response, lab and
  test time into the unit spans, and the page no longer says what they are for.
  Removing them would move every day number a teacher may be planning against.

## Also recorded

`CLAUDE.md` named `tools/ap-cyber-ced/validate_csv.py` as the thing that counts
CED codes in student-visible text. It has zero EK checks and is shaped for AP
Cybersecurity page structure. The module is `lib/cyber-ek-density.js`. This was
only found because a builder agent was told to use the wrong tool, went to look,
and said it could not. **Naming the wrong tool is worse than naming none,
because the check comes back clean and reads as evidence.**
