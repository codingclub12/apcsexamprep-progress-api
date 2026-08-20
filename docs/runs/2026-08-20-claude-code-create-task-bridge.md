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

---

# Second pass: code that reads as machine-written

"One line ifs and functions need to be reformatted to be multi line like a
beginner would write them."

Correct, and it was in the bridge I had just shipped:
`if (steps[d] > goal) { over = over + 1; }`. A first-year student puts the brace
on its own line, because that is how they were taught and how every worked
example they have seen is laid out. Code on this site is read as a model to
copy, so a one-line body teaches a habit no AP reader expects.

## Scope, measured rather than guessed

Repo seeds, by detector: 3 CSP coding seeds and 11 Intro Java seed modules,
90 occurrences.

Live pages: 156 swept. The real count is 58, on six page groups. An early sweep
said 934, which was my own bug: the theme leaves a `<pre>` unclosed in its search
overlay, so the first `<pre>` match on any page swallows the whole document. Any
extraction from a rendered page has to bound the match or it reports the theme.

## How it was done

Detection is automated and lives in `lib/beginner-style.js`. Transformation of
the Java seeds was scripted but treated as unsafe by default, and the script
refuses anything it does not fully understand. That was the right posture:

- The first run put real newlines inside a single-quoted string and broke
  `intro-java-unit1.js` outright. The cause was a one-liner sitting inside an
  inline code span in a sentence, where `` `while (true) { move(1); }` `` is
  being talked ABOUT rather than shown as a model. `node --check` caught it.
- The fix was to read the newline encoding from the newline that FOLLOWS the
  one-liner, which is certainly inside the same string, rather than guessing it
  from the delimiter in front.
- The same trap caught the whole-string rule a second time, because a pair of
  backticks around an inline code span looks exactly like a template literal.
  That one is now gated on the last non-space character before the delimiter
  being punctuation that opens an expression rather than the end of a word.
- The detector had two holes of its own, both found by transformation results
  rather than by review: a bare `else if (...) { ... }` at line start, and a
  braceless `else if (...) stmt;`. One chain shipped mid-edit with its first
  branch expanded and its second still on one line.
- Two one-liners were split across a JavaScript string concatenation
  (`'...else if (score >= 80) ' + 'grade = "B";'`), so they never appear
  contiguously in the source and no textual pass could see them. Hand-edited.

Every change was proved to be layout-only: 61 strings reformatted, zero whose
content changed, comparing code with comments stripped and comments separately,
allowing braces to be added to a braceless body and a trailing comment to move
onto the head line it labels.

## Evidence

- 0 one-liners remain across every seed module in the repo.
- All 11 Intro Java seeds and all 3 CSP seeds parse.
- `scripts/verify-csp-code-pages.js`: every reference solution re-run through the
  live Judge0 proxy in both languages after reformatting, every output identical.
- The bridge page re-exercised in Chromium: four problems pass, five wrong-answer
  cases still correctly rejected, requirement detection unchanged.
- Full offline suite: 77 suites, all passing.

`npm run smoke:beginnerstyle` is the gate. It enumerates `seed/` rather than
listing files, so a seed added next month is covered on the day it lands.

## Still open: the live pages

The source is clean; the pages built from it are not, and no import has run.

| Page group | One-liners | Fix |
|---|---|---|
| Intro Java lesson pages (11 pages) | 19 | Regenerate from the fixed seeds and import |
| CSP 3.17 and 3.18 coding pages | 9 | Regenerate from the fixed seeds and import |
| CSP 3.14 coding page | 16 | Not in this repo. Surgical patch on the stored body |
| CSP 3.9 coding page | 5 | Not in this repo. Same |
| CSP 3.4 coding page | 1 | Not in this repo. Same |
| CSP 3.9 guided notes | 8 pseudocode | Not in this repo. Same |

The three CSP coding pages and the guided notes were authored outside this repo,
so they need the stored Body HTML from the Admin API, a snapshot, and a surgical
replacement, the same shape as `scripts/csp-command-center-links.js`. A scrape
will not do: it drops the page's own style block and comment header.

Separately, the 3.14 GradeKit block contains an em-dash, which is a house rule
violation that has been live for as long as the page has.
