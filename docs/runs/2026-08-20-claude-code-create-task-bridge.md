# Create Task bridge: the rung between 72 exercises and one program

Date: 2026-08-20
Agent: Claude Code
Branch: `claude/csp-create-task-bridge`

## The question that started it

"Do we need more than 1 coding problem per lesson? Students need to be able to
code enough to build the create task."

The premise was wrong in a way worth recording, because the same wrong premise
will come back. Every one of the eighteen Big Idea 3 coding pages carries FOUR
problems, not one. Verified by fetching all eighteen live pages and counting
`<div class="prob"` on each: 18 pages, 4 each, 200 on every one. Seventy two
coding problems already exist. Quantity was never the gap.

## What the gap actually was

Two things, and one of them is measurable rather than a matter of taste.

**No problem in the course can involve input.** `lib/csp-code-pages.js` builds
the runner used by all eighteen pages, and its request body is
`{code, language_id}`. There is no `stdin` field. Requirement 1 of the six
scored Create Task program requirements therefore has zero practice anywhere in
Big Idea 3, and could not have any without a code change.

**Nothing asks for the scored combination.** Topic 3.13 is representative: four
problems, all of them a procedure with parameters, all of them called with
hardcoded arguments. Lists live on 3.10, loops on 3.8, conditionals on 3.6. No
problem anywhere asks for a procedure that takes a list and loops inside it,
which is the scored shape itself.

So the answer to "more problems per lesson" is no. A fifth problem on eighteen
pages deepens practice a student already has. The missing rung is between "write
a ten line loop with a known answer" and "invent and build a whole program", and
it gets crossed once.

## What shipped

One page, `ap-csp-create-task-practice`, four problems that ramp by requirement
count rather than by topic:

| Problem | Requirements | Shape |
|---|---|---|
| 1 | 2 of 6 | input, output |
| 2 | 4 of 6 | + list, algorithm |
| 3 | 6 of 6 | + procedure with a parameter, called twice |
| 4 | 6 of 6 | student's own program, no expected output |

Problems 1 to 3 run one scenario, a week of step counts, so the only thing that
changes between problems is the thing being taught. Problem 4 drops the scenario
and is checked on requirements, which is the handoff into the Builder.

## Decisions worth keeping

**The checker is a port, not an invention.** `detectSix()` in
`lib/csp-create-task-bridge.js` is the Create Task Builder's own `analyze()`,
narrowed to Python and JavaScript. Two independently written detectors would
eventually disagree, and the disagreement would land in front of a student who
lit six chips on one page and five on the other.

**The JavaScript prelude is stripped before detection.** Node has no `prompt()`,
so every JavaScript starter opens with four supplied lines that read stdin. Left
in, those lines hand the student two requirements for free: the helper's
`.split()` reads as a list, and the helper being defined then called reads as
"calls a procedure". The page would have reported four of six on an empty
program. The prelude is removed before detection and input is credited instead
for calling `INPUT()` in the student's own code. This has a smoke assertion of
its own because the failure is silent and flattering.

**Matching the expected string is necessary, not sufficient.** A browser run
caught this: a student can print the right two lines on problem 2 with the goal
typed in rather than read, and a string comparison cannot see it. That is
precisely the habit the Create Task punishes. So a correct output is now also
checked against the requirements the problem is about, and a hardcoded answer
gets told what it did instead of a pass.

**Boundary values are load-bearing.** The goal 8000 appears in the list as an
exact 8000. "Over goal" is strictly greater, so a student who writes `>=` gets 4
instead of 3 and has to work out why. Cheaper to meet here than on the exam.

## Evidence

- `node scripts/verify-csp-code-pages.js --write`: every reference solution run
  through the live Judge0 proxy in both languages, outputs agree.
  Problem 3 derives `Days over 8000: 3 / Days over 10000: 2` by execution.
  `seed/csp-code-pages/expected.json` is byte-identical after the refactor, so
  the eighteen topic pages are provably unaffected.
- Chromium against the live proxy, both languages: all four problems pass, no
  console errors, no page errors. Screenshots taken.
- Five wrong-answer cases, all correctly rejected: `>=` boundary slip; correct
  output with the value hardcoded; a procedure with no parameter; a procedure
  defined but never called; the JavaScript prelude alone, which must not be
  credited a list or a call.
- `npm run smoke:cspbridge`: 65 assertions, all passing.
- Full offline suite: 76 suites, all passing.

Both of the worst bugs this project has shipped, the unstyled leaderboard and
the Odds Maker fill bar, were invisible to structural checks and obvious in a
screenshot. That is why the browser pass is not optional here either.

## Still open

- **The page is not imported yet.** `node scripts/csp-create-task-bridge-csv.js
  out.csv` builds it. New handle, so nothing is overwritten and no snapshot is
  needed. That changes on any regeneration against a live page.
- **`cc3.csv` is still not imported.** The Command Center is at 70 links; that
  import takes it to 72 by adding the 3.17 and 3.18 coding practice links.
- **The Create Task Builder is barely linked.** `ap-csp-course-create-task` is
  the only interactive Create Task page on the site and has two inbound links:
  a card on `ap-csp-course` and a button on `ap-csp-create-task-ultimate-guide`.
  It is not in the CSP nav dropdown, not on the Command Center, and not on the
  study games hub. The nav item labelled "Create Task Guide" points at the
  ultimate guide instead. There are four Create Task pages
  (`ap-csp-course-create-task`, `ap-csp-create-task-ultimate-guide`,
  `ap-csp-create-task-rescue-kit`, `ap-csp-create-task-guide`) and the one that
  actually runs code is the least reachable.
  The nav lives in the theme repo at `snippets/apcs-nav-source.liquid`, which
  this repo cannot reach. That is a theme PR, not a Matrixify import.
- **Where the bridge belongs in the Command Center.** Its pageLinks are strictly
  per topic and the bridge is course level, so there is no existing slot. Worth
  deciding rather than guessing.
- **The 222 answer keys** readable from the public `csp-command-center` HTML,
  gated only by a client-side `FREE_BI: [1]`. Verified anonymously, live since
  at least 23 July, raised repeatedly, still open. Largest known problem on the
  board and unrelated to this pass.
