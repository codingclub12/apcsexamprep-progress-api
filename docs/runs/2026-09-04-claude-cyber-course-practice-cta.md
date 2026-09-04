# 2026-09-04 - The practice hub moves from the bottom of the course to the top

Board 245. The second half of the nav request from earlier today; the first half
shipped as theme PR #105.

## What was wrong

Measured on the served bodies after the hub and spoke import landed:

| page | anchors | practice hub at |
|---|---|---|
| `ap-cybersecurity` | 72 | absent |
| `ap-cybersecurity-complete-course-guide` | 247 | 247 of 247 |
| `ap-cybersecurity-topics` | 52 | 51 of 52 |

Every one of those links was placed by `lib/link-block.js`, which appends. It did
its job. A link at the top is a different insertion, which is why this is its own
generator rather than another call into that module.

After the band: anchor 2 of 74 on the landing page, and **anchor 1 of 249** on the
course guide.

## The thing to get right, and the thing I got wrong first

**The assertion has to be ordinal, not existential.** "The course guide links the
practice hub" was already true, from the bottom of a 105 KB page. A presence check
passes on that and reports a fix that has not happened, which is the same shape as
the health check that expected a status the server already returned. So the suite,
the rederive and the live check all assert position: inside the first four anchors
of the body.

I made the same class of mistake twice in one hour and both are worth recording.

**A guard that cannot fire.** The generator's first draft carried a list of
per-page markers that had to survive, copied from the hub repair generator where
`link-block` really can restructure a body. Here it was dead code: `buildBody` is a
pure insertion, so nothing it produces can be missing a section the live body had.
I only found out because the mutation I wrote for it would not go red. Deleting the
whole check changed no test outcome, so it is gone rather than kept for the look of
it. What replaced it is stronger and reachable: the result must be the live body cut
in two with the block between, and the gate mutation that makes `buildBody` remove a
class on its way past is the only thing that can reach it.

**A mutation that silently did not apply.** Testing that, my shell quoting broke the
Python assert, so the file was never modified and the suite stayed green. Read as a
result, that says "the mutation did not fire, the guard is hollow." It was neither:
the mutation had not run. A mutation harness needs to prove it *changed the file*
before it can say anything about the guard, and a shell heredoc is the version of
this that does not silently fail.

The band also crashed the suite rather than failing it, because the build runs at
module top level. A suite that dies with a stack trace is one a deploy gate cannot
match against, so the build is wrapped and a refusal is now a named failure line.

## What shipped

`tools/ap-cyber-ced/generate-course-practice-cta.js`. Two rows, MERGE, Body HTML
only. Each band is built from classes **that page already defines**, so nothing in
either stylesheet moves and the diff is markup only:

- `ap-cybersecurity` reuses `ch-sec-title`, `ch-sec-note`, `ch-startgrid` and
  `ch-startcard`, giving two cards under the hero.
- `ap-cybersecurity-complete-course-guide` reuses `pilot-bar`, the announcement
  class already sitting beside it, recoloured inline the same way that bar is.

Both pages scope themselves under a wrapper with `all: initial !important`, so an
inserted anchor inherits nothing; inline `!important` is what the pages themselves
already use for this.

The question count in the copy is read from `config/cyber-exam-items.json`, so the
day the bank changes the copy moves with it instead of going stale on two live
pages. A mutation shrinks the bank to 41 and requires the copy to say 41.

`imports/2026-09-04e/cyber-course-practice-cta-pages.csv`, 130,508 bytes, preflight
clear to import.

## Evidence

`deploy-gates/2026-09-04-cyber-course-practice-cta.json` with `--pre`:

```
suite     smoke:cyberctacourse       33 checks, 7 mutations
suite     smoke:cyberpractice        29 checks, 16 mutations, unchanged
rederive  cyber-course-cta-rederive  35 checks, by diff
suite     preflight-course-practice  clear to import
mutation  four, each red on its own rule
```

The live check reports **6 passed, 8 failed** before the import. The 8 are the
whole change, four per page. The 6 are preservation checks that hold on both
sides, which is what rules out a band that shipped and took the page with it.

## Open

- **The sheet is not imported.** `imports/2026-09-04e/cyber-course-practice-cta-pages.csv`.
  Import it, then run `npm run verify:cyberctacourse`.
- Do not re-save the CSV as a spreadsheet. One row is over 32,767 characters.
- **`ap-cybersecurity-topics` still links the hub at 51 of 52.** It is the concept
  layer rather than the course, so it was outside what was asked for, and it is a
  third page with a third structure. Worth doing next; not worth widening this
  sheet for.
