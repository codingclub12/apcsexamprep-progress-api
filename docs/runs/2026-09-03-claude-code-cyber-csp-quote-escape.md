# 2026-09-03 Board 174 + 185: stray quotes killing var EX / FS_QUESTIONS

One Matrixify sheet, three rows, handed over and NOT imported:
`imports/2026-09-03/unescaped-quote-repair-pages.csv`, md5
`4ad3765a776a65b1c7b81497ace26ba7`.

## The defect, in the bytes

Four pages define their quiz data as a JS/JSON-shaped string literal, and an
option or explanation string quotes a field value with plain `"` instead of
`\"`. The parser reads the embedded quote as the string's own close, and
everything after it is a SyntaxError. The block does not partially run; it
never gets defined, so the widget scores nothing.

    ap-csp-filtering-sorting-practice   var FS_QUESTIONS, q1-q4's options and
                                        two explanations: 74 stray quotes
                                        (workshop / jazz / Friday / Saturday /
                                        electronics / active / gold / platinum)
    ap-cyber-unit-5-lesson-4            var EX.v4q3, one pair ("weaker")
    ap-cyber-unit-5-lesson-5            var EX.w5q2 AND w5q7, two pairs. w5q7
                                        was flagged as a PREDICTED second break
                                        before this run started; confirmed real
    ap-cyber-unit-5-lesson-6            var EX.x6q4, one pair
                                        ("passwords_backup.txt")

Live SyntaxErrors, `node --check` on the extracted block, before any fix:

    ap-csp-filtering-sorting-practice   Unexpected identifier 'workshop'
    ap-cyber-unit-5-lesson-4            Unexpected identifier 'weaker'
    ap-cyber-unit-5-lesson-5            Unexpected identifier 'Companies'
    ap-cyber-unit-5-lesson-6            Unexpected identifier 'passwords_backup'

## The rule

A quote inside a double-quoted string is STRAY, not a real delimiter, unless
closing the string there leaves the surrounding JSON-shaped structure valid:
the next non-whitespace character has to be one of `,` `}` `]` `:`. Anything
else means the quote was meant to be content and gets escaped to `\"` in
place. Single-quoted strings are tracked too, so an already-escaped `\"`
inside one (a CSS attribute selector built with string concatenation, further
down the SAME CSP script) is walked over rather than misread as a new
double-quoted string starting.

This is `scripts/cyber-quote-escape-pages.js`, `escapeStrayQuotes()`. Position
decides, not content, same reasoning board 177's fix used for the example
`<script>` tags: a rule that has to guess what an author meant guesses wrong
on the next page.

## What it refuses, and why each would otherwise be invisible

- **Anything outside a target `<script>` block.** The escaper is only ever
  handed the extracted block, never the whole page.
- **A body Cloudflare rewrote at render time.** Confirmed on TWO of the four
  pages, not one: `ap-csp-filtering-sorting-practice` and
  `ap-cyber-unit-5-lesson-5` both answer with a dead `[email&#160;protected]`
  placeholder on the RENDERED route, in different parts of the page than the
  defect being fixed. Neither would be visible from reading the fix's own
  diff, because the corruption is somewhere else on the same page; it only
  shows up by fetching the same page two ways and diffing them.
- **A page whose own div count is not balanced.** `ap-cyber-unit-5-lesson-6`'s
  rendered-and-extracted body is 4081 bytes SHORTER than its true stored
  `body_html`: `scripts/extract-live-body.js`'s wrapper-closing counter reaches
  zero 4081 bytes early and silently drops the page's own closing lesson-nav
  block. This would have shipped a page missing its own navigation if the
  render route had been trusted as the write-back source for the sheet.
- **A block that still does not parse after its named quote is fixed.**
  `ap-cyber-unit-5-lesson-6` is exactly this: x6q4 is fixed and byte-proven in
  isolation, but the page carries 5 OTHER unparseable script blocks
  (`scripts/matrixify-preflight.js`'s own `scriptsCompile()`), caused by board
  177's still-unescaped example `<script>` tags elsewhere on the SAME page
  corrupting block boundaries for an unrelated regex scan. Confirmed identical
  before and after x6q4 is fixed, so the row is held rather than shipped
  believing itself finished. This is deliberately the SAME page and the SAME
  shape of refusal a prior session hit the same day building
  `cyber-u5-example-escape-pages.csv`, and the task brief for this run named
  it explicitly as the trap not to repeat by relaxing the bar.

## The instrument that made lesson-5 reachable

`lib/storefront-fetch.js` gained `pageBody(handle)`: fetch
`/pages/<handle>.json` instead of the rendered page. It never passes through
theme rendering, so neither Cloudflare's email rewriter nor
`extract-live-body.js`'s div-counter ever gets a chance to touch it. Cross-
checked against the rendered route on a page neither hazard touches
(`ap-cyber-unit-5-lesson-4`): byte-identical, 67971 bytes both ways.

That route is what let this run also finish board 177/178 for lesson-5:
`scripts/cyber-xss-example-escape.js`'s `repair()` (already reviewed, already
shipped on two other pages) had already found and could already fix the
example-tag defect there, but its own generator used the rendered route and
so was skipped by lesson-5's Cloudflare rewrite. Same function, same rule,
called with the `pageBody()` body instead: 3 tags escaped, 1 example payload
neutralised, and the resulting page has zero unparseable blocks and zero
still-executing examples, recomputed fresh rather than trusted from either
step alone.

### A side effect worth flagging rather than quietly taking credit for

Board 179 says `ap-cyber-unit-5-lesson-5`'s password example (`w5q4` option C)
"needs a human with Admin access" to recover, because the rendered route turns
it into `[email protected]`. `pageBody()` recovers it as
`alice@example.com`, cleanly, with no Admin API token (this environment does
not carry one). That is not a fix this run authored; it is what NOT using the
corrupted source looks like. Flagging for whoever owns 179 to close it with
this artifact as the evidence, rather than closing it myself.

## Evidence

**Byte-level, per row.** `onlyQuotesChanged()` in the generator walks the live
`body_html` (fetched fresh, immediately before writing the sheet) against the
CSV's cell in lockstep and requires every divergence to be exactly `"` ->
`\"` (or, for lesson-5, the three additional `<script>`/`</script>` -> entity
tag-escapes from the reused board-177 fix). Re-run directly against the
COMMITTED file (not the generator's in-memory state) immediately before this
note:

    ap-csp-filtering-sorting-practice   74 edits (74 quote), fully consumed
    ap-cyber-unit-5-lesson-4             2 edits (2 quote), fully consumed
    ap-cyber-unit-5-lesson-5             7 edits (3 tag, 4 quote), fully consumed

**Suite.** `node smoke/cyber-quote-escape.js`: 27 passed, 0 failed. Covers the
escaper, the negative controls (a plain answer key, apostrophes, an
already-escaped quote inside a single-quoted selector, an HTML tag with no
quote), the byte-level proof and its own ability to say no, lesson-5's
combined repair, the Cloudflare refusal, and a fixture with an UNRELATED
second defect that must be held rather than shipped half-fixed (lesson-6's
own shape, reproduced small).

**Rederive.** `node scripts/verify-quote-escape-rederive.js
imports/2026-09-03/unescaped-quote-repair-pages.csv --before`:
`tools/scan-inline-scripts.py`, a script written for the CSA 1.9 ASI defect
class and with no reference to this fix, reads the shipped CSV back with its
own from-scratch CSV-cell reader (not `scripts/matrixify-preflight.js`'s
parser) and finds 0 syntax faults in all three rows, versus 1 fault each on
the CURRENT live page for the same three handles.

**Mutation, three, each pinned to its own `[FAIL]` line so a broader guard
catching it does not read as proof of the one it targets:**

    isCloser always true            nothing is ever escaped
                                    -> [FAIL] 1.2 after the escape, the block parses
    onlyQuotesChanged always ok     the byte-level proof loses its ability to say no
                                    -> [FAIL] 3.2 the same proof REJECTS a body where
                                       something else also changed
    the parse-check disabled        a block with an unrelated second defect ships
                                    believing itself fixed
                                    -> [FAIL] 8.1 the quote is fixed but the block is
                                       still held for its own separate fault

**Gate.** `node scripts/deploy-gate.js deploy-gates/2026-09-03-cyber-quote-escape.json
--pre`: suite, rederive, 3/3 mutations, all pass. Re-run a second time in a
DETACHED WORKTREE at the exact SHA this PR merges onto (`fc19ce1`, fresh
`origin/main`, not the shared session branch this work started on), with only
this change's 7 files applied on top, nothing else in flight on that branch
along for the ride. No `live` check: nothing in this PR deploys on merge (an
API code change, not a Shopify page), and the sheet itself is never imported
by this session, so there is no "after" state for a live check to observe.
`--pre` is therefore not a shortcut here, it is the correct and final state
for this artifact.

**Preflight.** `node scripts/matrixify-preflight.js
imports/2026-09-03/unescaped-quote-repair-pages.csv --carrying <live-bodies>`:
clear to import. The `--carrying` file supplies each row's live `body_html`
before the fix so the preflight's emoji check can tell CARRIED from
INTRODUCED (3 emoji total across the candidate set, all carried, none added by
this fix) rather than refusing on emoji this run never touched.

Run against the 4-row candidate (lesson-6 included) first: refused, citing
exactly the 5 pre-existing lesson-6 script blocks and nothing about the other
three rows. Row removed, re-run: clear.

## Board

    #174   ap-csp-filtering-sorting-practice          claimed, DONE, artifact attached
    #185   AP Cyber Unit 5 lessons 4/5/6 (new task,    claimed, DONE, artifact attached
           created this run; none existed for the
           var EX quote class specifically)
    #177/178   AP Cyber Unit 5 XSS example tags        NOT claimed (lock conflict: #185
                                                       already holds shopify:lesson-5).
                                                       Materially advanced: lesson-5 now
                                                       ships. lesson-6 remains exactly as
                                                       those tasks describe it.
    #179   lesson-5's Cloudflare-obfuscated password    NOT claimed, same lock conflict.
           example                                     Resolved as a side effect of
                                                       pageBody(); evidence above.

Locks held during this run, released on `apcs done`:
`shopify:ap-csp-filtering-sorting-practice`, `repo:lib/storefront-fetch.js`
(claim #69, task 174); `shopify:ap-cyber-unit-5-lesson-4`,
`shopify:ap-cyber-unit-5-lesson-5`, `shopify:ap-cyber-unit-5-lesson-6` (claim
#70, task 185).

## Still open, and what needs a human

- **Import the sheet.** `imports/2026-09-03/unescaped-quote-repair-pages.csv`,
  3 rows, MERGE. That is the actual repair; nothing in this run touches the
  live store.
- **The PR for the tooling could not be opened.** `git push` succeeded
  (`claude/cyber-quote-escape-jm3x9k` @ this commit, based on current `main`).
  `POST /repos/.../pulls` answered `403 GitHub access is not enabled for this
  session. An org admin must connect the Claude GitHub App for this
  organization.` Same failure, same wording, as
  `docs/runs/2026-09-03-claude-code-blind-live-checks.md` recorded earlier
  the SAME day on a different branch, so this is an org-level connection
  state rather than anything specific to this change. Open
  https://github.com/codingclub12/apcsexamprep-progress-api/pull/new/claude/cyber-quote-escape-jm3x9k
  once access is back, or by hand.
- **ap-cyber-unit-5-lesson-6 needs a human, twice over.** Its x6q4 quote is
  fixed and proven (available in `scripts/cyber-quote-escape-pages.js`'s
  output if someone runs it with lesson-6 not excluded), but shipping the page
  needs board 177's remaining, unescaped example tags addressed first, and
  that in turn needs someone to decide what to do about the page's own
  garbled script-block boundaries once those tags are escaped (this run did
  not attempt that; it was explicitly out of scope and the task brief warned
  against relaxing the bar to get it through).
- **Board 179** should probably close with this artifact as its evidence, but
  that is 179's owner's call, not mine to make by fixing a different page's
  row and treating the correction as automatic.
