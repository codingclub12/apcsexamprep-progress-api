# The 70 CSP exercise pages had no way in

2026-08-24, Claude Code. Follows
`docs/runs/2026-08-22-claude-code-csp-exercise-handle-routing.md`.

## Measured, not assumed

All 70 exercise pages are live, grade where they can, and record a visit. On
2026-08-24 they had **zero inbound links anywhere on the site**:

| Surface | Exercise links |
|---|---|
| The 35 topic lesson pages | 0 |
| `/pages/ap-csp-course` | 0 |
| `/pages/ap-computer-science-principles-resources` | 0 |
| `/pages/csp-command-center` | 0 |

The only route in was the URL printed inside the .docx handout. A student with
the lesson page open, which is the student most likely to want the exercise,
could not get there from where they were. A teacher planning from the Command
Center saw the exercise as a worksheet to print and no sign it existed online.

A correction worth recording: an early grep of the rendered Command Center found
five `"pageLinks":[]` and I read that as five topics missing links. Parsing the
blob showed all 35 topics populated. The five empties are the Big Idea EXAM rows,
1.99 through 5.99, whose unit test pages exist and were unreachable. The grep was
counting a real gap and naming it wrong.

## Two surfaces, two scripts

**`scripts/csp-lesson-exercise-links.js`** appends a managed block to all 35
lesson pages: the topic's two exercises as cards.

It is a SECOND managed block rather than an extension of the keep-going block
from `scripts/csp-lesson-keep-going.js`, which is live on Big Idea 3's eighteen
pages and nowhere else. Folding these in would mean rewriting a block already on
the course's most valuable pages to gain nothing a second block does not. The two
are styled apart deliberately: keep-going is green and points sideways to
practice, this is the exercise blue used by the exercise pages themselves, so a
student who follows the link lands somewhere that looks like where they came
from.

**`scripts/csp-command-center-exercises.js`** adds 70 exercise links across the
35 topics and 6 unit test links across the 5 exam rows. Big Idea 3's test ships
as two pages, part A and part B, which `utils.js` already treats as two separate
lessons for the same reason: one submission per page id, so folding them would
have part B overwrite part A.

Both emit Matrixify sheets. Neither was imported by this run.

## The label is the load-bearing part

Only topic 1.1's two exercises carry an auto-graded check. The other 68 are
handout mirrors that record nothing. The student's handout already claims all 70
are auto-graded, so a link repeating that claim would make the site complicit in
it. Both surfaces read graded-ness from the renderer that builds the page, never
from a hardcoded list, so a topic that gains check questions relabels itself on
the next run and no card can promise a grade its page does not deliver.

- Command Center: `Exercise 1 (online, auto-graded)` or
  `Exercise 1 (online, not graded yet)`, matching the existing
  `Study game (not graded)` house style.
- Lesson card: `Work it online, then take the auto-graded check` or
  `Work it online. Saved in your browser, not graded`.

Measured on the generated output: 2 links labelled auto-graded, both topic 1.1's.
68 labelled not graded yet.

## Both edits are insert-only, and that is checked

The lesson block is appended, so the original body is an exact prefix. The
Command Center splices each entry in immediately before its `pageLinks` array's
closing bracket, so every byte of the 123 KB blob is still present, in order.
That claim is asserted byte for byte in the smoke suite rather than trusted, and
the DATA blob is re-parsed as JSON afterwards because a broken blob renders an
empty page.

The Command Center tripwire is DERIVED rather than copied. Its sibling script
hardcodes a title per topic so a renumbered curriculum fails loudly; eighteen
titles are maintainable, thirty five would rot. Instead each topic must already
link the lesson handle that `lib/csp-exercise-pages` assigns that topic number,
from the same COURSES config the exercise pages and the reporter read. If the
Command Center and the course config ever disagree about which lesson topic 3.8
is, the edit stops.

## Evidence

- `smoke/csp-exercise-discoverability.js`, 26 assertions, wired into
  `package.json` so CI picks it up. All 99 offline suites pass on exit code.
- Both scripts run twice against their own output: the lesson build refuses all
  35 by marker, the Command Center reports nothing to add and writes no sheet.
- Four refusals are proved by triggering them, not asserted from the code: a
  topic that does not link its own lesson, an unverified target handle, a body
  that is not the Command Center, and a fetched file that is not the lesson page
  it is named after.
- Generated sheets: 70 exercise links plus 6 unit test links on the Command
  Center (123,409 to 130,280 bytes, insert only), and 35 lesson pages with 70
  links.

## Still open

1. **Neither sheet is imported.** That is a human step and it edits 36 live pages.
2. **The CSP course hub and the resources page** still link no exercise. This run
   covered the lesson pages and the Command Center, which is where a student and
   a teacher respectively are standing when they want one. The hubs are a
   separate, wider linking question.
3. Big Idea 3's exam row is titled `Topic 3.99` in the blob where the other four
   read `Big Idea N Exam`. Cosmetic, pre-existing, untouched here.
4. 69 exercises still need authored check questions, and the two activity_type
   collisions still gate grading past Big Idea 1.
