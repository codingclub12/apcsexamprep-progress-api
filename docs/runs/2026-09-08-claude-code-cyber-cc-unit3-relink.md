# Command Center Unit 3: three rows opened the wrong lesson

Board 283. Three of the six Unit 3 rows opened a page about something else:

    row 3.3 Firewalls   opened lesson-3, which is now Wireless   (CED 3.2)
    row 3.5 IDS         opened lesson-5, which is now Firewalls  (CED 3.4)
    row 3.6 Wireless    opened lesson-6, which is now IDS        (CED 3.5)

## Why it survived

Rows 3.1, 3.2 and 3.4 were correct the whole time, so checking two rows had a
good chance of hitting two correct ones. The board item had already worked this
out and said so: it is a three-way rotation, not an off-by-one.

The cause is in `lib/cyber-unit3-renumber.js`. Unit 3's renumbering onto the CED
was a THREE-CYCLE over lessons 3, 5 and 6: target 3 took source 6's body, target
5 took source 3's, target 6 took source 5's. Lessons 1, 2 and 4 kept their
bodies. The Command Center keys its rows on the retired SITE numbers and builds
every handle as `lesson-<row number>`, an identity that held until exactly those
three bodies swapped handles.

So the rows that break are the rows whose bodies moved, and there are three of
them. Nothing here is off by one.

## The fix, and the one way to get it wrong

`scripts/cyber-cc-unit3-relink.js` rewrites each row's handles from its OWN id,
in one pass, with the map derived from `PLAN` rather than typed.

Both halves of that matter. A three-cycle written as ordered replaces ping-pongs:
turn `lesson-3` into `lesson-5`, then `lesson-5` into `lesson-6`, and the row that
was already correct moves too, and the transform cannot tell its own output from
its input. That is the trap `cyber-unit3-renumber.js` documents at length, and it
is the first mutation in the gate. Rewriting from the row id rather than from the
number currently in the handle also makes the transform idempotent, so running it
on already-fixed input is a no-op rather than another rotation.

Two blocks in the page body carry these links and both had to move: the `LESSONS`
data array (`site:{ex1,ex2}`) and a flat link map (`"3.3":{page,quiz,ex1,ex2}`).
Six edits, three rows, two blocks. The body is the same length afterwards because
only single digits changed.

## Evidence

`deploy-gates/2026-09-08-cyber-cc-unit3-relink.json`, green on three independent
kinds: suite, rederive, mutation. No `live` kind, and that is deliberate. This
ships as a Matrixify sheet and changes no runtime behaviour, so a post-deploy
observation has nothing new to see; what makes it true is the import.

The rederive is the one worth reading. `scripts/cyber-cc-unit3-rederive.js` does
not read `PLAN` at all. It asks each LIVE lesson page what topic it says it is,
and compares that to the CED number the Command Center row already prints beside
its title. Two independent statements about the same fact, neither of them the
mapping under test:

    live today   rows=6 ced-matches-page=3
    with the fix rows=6 ced-matches-page=6

and the three that disagree are exactly the three the board named, with exactly
the destinations it reported.

`matrixify-preflight --carrying`: clear to import, 29 emoji and 85 non-ASCII
characters all carried through rather than introduced.

## What the mutation battery caught, which was in the battery itself

Five mutations were written. **One of them was vacuous and one guard was
unreachable**, and both were found by running them rather than by reading them.

- A mutation widening the block-1 scope regex changed nothing, because
  `relinkRow` only ever rewrites the handle pattern, so a wider scope cannot
  corrupt a Drive id sitting beside it. That is a vacuous mutation, not a passing
  test, and it was replaced with a greedy-quantifier mutation that does bite.
- A mutation making `relinkRow` rewrite ANY unit's handle leaves the suite fully
  green. Not because the assertion is weak: because the failure is unreachable.
  Both scope regexes end at the row's own closing brace, so no other unit's handle
  is ever inside the text being rewritten. That assertion is now labelled in the
  suite as insurance against a future widening rather than as something a green
  run proves.

The suite also had the cascade problem this repo keeps finding. Its assertions ran
against `transform()`'s guarded output, which is `null` on any refusal, so three
unrelated mutations produced one indistinguishable red and several assertions
passed vacuously when the transform refused. They run against `transform.raw()`
now, and the two blocks are checked separately, so each mutation names its own
rule:

    ping-pong          both block assertions, on rows 3.3 and 3.6
    hand-typed map     OLD_TO_TARGET is derived from PLAN
    greedy scope       data array only
    link map unfixed   link map only
    data array unfixed data array only

## Still open

- **The sheet is not imported.** `imports/2026-09-08-cyber-cc-unit3-relink/`,
  MERGE, one row. After importing, `node scripts/cyber-cc-unit3-rederive.js` with
  no arguments should answer `rows=6 ced-matches-page=6` against the live page.
- **The row ids are still retired site numbers.** Row 3.3 is titled Firewalls and
  carries `ced:"CED 3.4"`, so the Command Center shows one number and the lesson
  page it opens shows another. That is pre-existing dual labelling, not something
  this fix introduces, and renumbering the rows is a content decision rather than
  a link repair. Worth a separate board item.
- **Three titles for one topic.** CED 3.2 is "Protecting Networks: Managerial
  Controls and Wireless Security" in `config/cyber-topics.json`, "Network Security
  Policies & Wireless" in the Command Center row, and "Secure Network Protocols"
  in the lesson page's own h1. All three now agree on the NUMBER, which is what
  board 283 was about. The titles are a separate drift.
