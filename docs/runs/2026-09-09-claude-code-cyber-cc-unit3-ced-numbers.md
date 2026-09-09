# Unit 3 on the website, back on the CED's numbers

Tanner: "Unit 3 never updated on the website to be back to CED." He is right, and
the part that had not moved is narrower and worse than it sounds.

The six lesson PAGES were renumbered on 2026-08-28 and they are correct. Measured
live this morning, handle by handle:

    ap-cyber-unit-3-lesson-1   Topic 3.1 (Part 1 of 2)   data-lesson-id 3.1a
    ap-cyber-unit-3-lesson-2   Topic 3.1 (Part 2 of 2)   data-lesson-id 3.1b
    ap-cyber-unit-3-lesson-3   Lesson 3.2               data-lesson-id 3.2
    ap-cyber-unit-3-lesson-4   Topic 3.3                data-lesson-id 3.3
    ap-cyber-unit-3-lesson-5   Topic 3.4                data-lesson-id 3.4
    ap-cyber-unit-3-lesson-6   Topic 3.5                data-lesson-id 3.5

The Command Center did not move with them. Its Unit 3 rows still read 3.1 to 3.6
on the retired site numbering, with a small "CED 3.x" badge beside each title
doing the translating. Units 1, 2, 4 and 5 key on the CED number directly and
carry no badge at all, so Unit 3 was the only unit on the page speaking a
different language, and it had a row 3.6 that the CED does not have.

Worse, the unit note told teachers this was deliberate: "Unit 3 is taught in a
flow-optimized sequence that differs from the CED's topic order." That was true
before 2026-08-28. The three-cycle that moved the bodies also put them in CED
order, so handle order and CED order are now the same thing and the note was
explaining a divergence that no longer existed.

## What a teacher saw

    row 3.3  Firewalls & Packet Filtering       opened lesson-3, which is Wireless
    row 3.5  IDS, IPS & SIEM                    opened lesson-5, which is Firewalls
    row 3.6  Network Security Policies & Wireless  opened lesson-6, which is IDS

Three of six. That is board 283, and it is fixed here rather than separately:
once a row is keyed on the CED number the handle follows from the number, so the
relink stopped being a change of its own. `imports/2026-09-08-cyber-cc-unit3-relink/`
is superseded and must not be imported alongside this sheet.

## What is in the sheet

`imports/2026-09-09-cyber-cc-unit3-ced-numbers/`, MERGE, one row, 70,495 bytes.

| was | now | opens | badge |
|---|---|---|---|
| 3.1 | 3.1a | lesson-1 | CED 3.1 |
| 3.2 | 3.1b | lesson-2 | CED 3.1 |
| 3.6 | 3.2 | lesson-3 | none |
| 3.4 | 3.3 | lesson-4 | none |
| 3.3 | 3.4 | lesson-5 | none |
| 3.5 | 3.5 | lesson-6 | none |

The rows come out in that order, which is CED order and also the order the six
pages run in. The badge survives only on the 3.1 pair, because those are the two
rows whose id is not itself a CED topic number; everywhere else it was repeating
the id back at the reader, which is what the other four units already do by not
having one.

The note and the code comment above `STU` were both rewritten. They were the two
places on the page still telling a reader the site diverges from the CED.

Titles were left alone on purpose. CED 3.2 is "Protecting Networks: Managerial
Controls and Wireless Security" in `config/cyber-topics.json`, "Network Security
Policies & Wireless" on the Command Center row and "Secure Network Protocols" in
the lesson's own h1. Three names, one topic, and picking one is a content call
rather than a numbering repair.

## The saved ticks

The taught checkboxes live in `localStorage` under `actc_taught_ap-cybersecurity`,
keyed on the row id, per device. Renumbering the ids without touching them would
have left a teacher who ticked 3.3 Firewalls looking at a ticked 3.3
Segmentation, which is a silent wrong rather than a visible one. The sheet
carries a one-time remap into a fresh object, stamped so it does not run twice.

## Evidence

`deploy-gates/2026-09-09-cyber-cc-unit3-ced-numbers.json`. Three kinds green
pre-deploy, plus the live one, which cannot run until the sheet is imported.

- **suite**: `npm run smoke:cyberccunit3ced`, 47 passed. The relink suite it
  supersedes still passes at 16, so the two do not contradict each other.
- **rederive**: the sheet parsed back through a quote-aware reader and diffed
  against a fresh transform of the live body. Zero. Body md5
  `178128e367cc7f5ce13be4c38e2f1140`.
- **mutation**: eleven, each red on the rule it targets and no other.
- **live**: `scripts/cyber-cc-unit3-ced-rederive.js` reads neither source the
  generator is built on. It asks each live page what it is through the
  `data-lesson-id` the gradebook keys on, and compares that to the number the row
  displays.

      live now                  rows=6 id-matches-page=0 ced-matches-page=3
      live + sheet in memory    rows=6 id-matches-page=6 ced-matches-page=6

  Zero of six is the number worth keeping. The badge count of 3 is why this
  survived three weeks: half the badges were right, so any spot check had good
  odds of landing on a row that looked fine.

`matrixify-preflight --carrying`: clear to import, 29 emoji and 84 non-ASCII
characters carried through rather than introduced. `npm run smoke:encoding`
clean. The full offline set was run locally; `csakitstyle` and `deckvoice` fail
here for a missing `python-pptx` in the container and have nothing to do with
this change.

## What the mutation battery caught, which was in the tests and in the generator

Four of twelve mutations came back wrong on the first run, and three of those
were real problems rather than bad mutations.

**A tick assertion that passed by luck.** The in-place-migration mutation is
supposed to red "a tick on Firewalls stays on Firewalls". It came back green.
Every tick in the fixture was set to `true`, so when the in-place rewrite
ping-ponged 3.3 and 3.4 the Firewalls assertion still found `true` sitting under
3.4 and passed, while only the Segmentation one noticed. Ticks now carry values
that name their lesson, and each key is also migrated on its own so no assertion
can be carried by another key in the same object.

**The reassembly was dropping a newline.** The greedy-boundary mutation crashed
the suite instead of failing it, which led back to `block.slice(arrayEnd + 1)`
running the last row and the array's closing bracket onto one line. Valid
JavaScript, so nothing threw and no check noticed, and it had quietly become a
third guard against a second pass. Fixed, and the line shape is pinned now.

**A crash is not a red.** `rewrite()` returning null on a structural refusal was
being dereferenced at the top of the suite, so one class of mutation killed the
run rather than naming a rule. That is the cascade problem this repo keeps
finding, wearing a different hat.

**One mutation was withdrawn rather than fixed.** Removing the one-shot
precondition leaves the suite green, and so does removing the next guard, and the
one after that. Refusing an already-renumbered page turns out to be defended
three times: the explicit precondition, the row-id regex that will not match the
new id shape, and the PLAN lookup that finds no row for a retired id. No
single-line mutation isolates any of them. The assertion is labelled in the suite
as insurance against a future widening rather than as something a passing run
proves, and the withdrawal is recorded in the gate under `_withdrawn` so nobody
spends an afternoon rediscovering it.

## Still open

1. **The sheet is not imported, and that is the whole reason this task existed.**
   Yesterday's relink sheet was built, gated and left sitting in `imports/`, and
   the page has been wrong ever since. `imports/2026-09-09-cyber-cc-unit3-ced-numbers/`,
   MERGE, one row. After importing, `node scripts/cyber-cc-unit3-ced-rederive.js`
   with no arguments should answer `rows=6 id-matches-page=6 ced-matches-page=6`
   against the live page, and the gate's live check is what closes this.
2. **Three titles for one topic**, as above. Worth its own board item; it is a
   content decision.
3. **Nothing else on the site was audited for retired Unit 3 numbers.** This pass
   covered `cyber-command-center` only. The hub and the lesson rails were checked
   during the 2026-08-28 import and were correct then, but "correct three weeks
   ago" is exactly the assumption that produced this task.
