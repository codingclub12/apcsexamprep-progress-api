# 2026-08-25 Claude Code: hub chips for Debug and FRQ, and a hub you can re-run

## What changed

Three files, all in the unit-hub patcher.

1. **The chip row gained Debug and FRQ.** Each lesson row on the four unit hubs
   now offers Exercise 1, Exercise 2, Debug and FRQ. Anything not in the live
   handle set renders as an inert locked chip, exactly as before.
2. **The patcher can be re-run.** It used to refuse any body that already
   carried an exercises section. It now REPLACES that section.
3. **`--from-json`** reads the Shopify Admin API response directly, so nobody
   has to copy four live page bodies into four files by hand.

## Why the refusal had to become a replacement

The old guard was right when it was written: inserting a second section into a
live page is worse than doing nothing. But it also made the section a one-shot.
All four hubs are already patched and live, measured today, so every new
practice type would have had nowhere to land.

The replacement is deliberately narrow, and refuses rather than guesses:

- the opening tag must be exactly the one `section()` writes;
- the matching close is found by counting nested `<div>`/`</div>` from that
  point, not by taking the next `</div>`, which would cut the block in half and
  swallow the rest of the page;
- the removed span must contain the generated heading, so a hand-written block
  that happens to use the class name is never silently deleted.

That last rule has its own test (7.8). A hub body is a live page and the failure
mode of guessing is deleting somebody's content.

## Why --from-json exists

This is the honest reason and it is worth recording. The bodies can only reach
this session through the conversation, and a stored hub body is 18 KB of style
rules. Retyping one by hand risks altering a single character, which ships a
broken live page that nothing downstream can see: the generator's checks look at
links, byte size and div balance, not at CSS.

So the script now eats the API response itself. One query, one file, no retyping:

```
{ pages(first: 10, query: "handle:ap-csa-unit-*-course") { nodes { handle body } } }
```

## Evidence

```
$ npm run smoke:csahublinks
  58 passed, 0 failed          (was 51; section 7 is new)

$ node scripts/csa-hub-exercise-links.js --from-json response.json --handles handles.txt --out hubs.csv
  ap-csa-unit-2-course: 2 lessons, 3 exercise link(s), 5 locked, CTA repaired

$ all 107 offline smoke suites
  FAILED: none
```

Section 7 asserts the behaviour that actually matters: re-running does not
duplicate the section, is stable byte for byte on a third run, and a page built
AFTER a hub was patched becomes a link on that hub.

## A near miss worth recording

The first attempt to append section 7 to the smoke file silently did nothing:
the anchor string I matched omitted a trailing newline that the real line has,
so the replace was a no-op and the suite still reported green. The count going
from 51 to 50 rather than to 58 is what exposed it.

A test file edit that fails silently leaves you with fewer tests and a passing
run, which is worse than a red build. Checking the assertion count moved the way
you expected is cheap and is the only thing that catches it.

## Two live content defects found, not fixed

Neither is in scope here and neither is mine to change quietly:

- `ap-csa-unit-1-course` is titled **"AP CSA Unit 1: Primitive Types"**. That is
  the retired 10-unit curriculum. The 2025-2026 CED calls Unit 1 *Using Objects
  and Methods*, which is what the hub's own body and every lesson page already
  say. The page title is the odd one out.
- `ap-csa-unit-4-course` carries an em-dash in its title, against the house rule.

## Still open

- The hub sheet itself is not generated: it needs the four live bodies, which
  need a Shopify query run in a session that can save the response.
- The debug and FRQ page sheets are generated and verified but NOT imported.
- Both page sheets are inert until the test bank is loaded:
  `POST /api/admin/code-tests/seed` (x-admin-key), or check what is loaded with
  `GET /api/admin/code-tests` from the dashboard session. Seeded manually and
  never on boot, by design.
