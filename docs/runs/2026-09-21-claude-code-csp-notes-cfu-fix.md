# The CSP notes CFU fix: four sheets, and the mutation that came back green

2026-09-21, claude_code, board 382. Follows the audit in
`docs/runs/2026-09-21-claude-code-csp-cfu-reference-audit.md`.

## What ships

Four Matrixify sheets in `imports/2026-09-21/`, split one per Big Idea, with a
runbook carrying the expected end state per step. 67 sentences across 17 live
pages stop naming a label that exists nowhere and start naming the one that
does, with the timing corrected.

    before  Then check yourself with the matching CFUs on the Topic 2.1 page.
    after   Check yourself with the six MCQ Practice questions on the Topic 2.1
            page once you have finished the whole topic.

The "once you have finished the whole topic" is the half a rename would have
missed. The notes prompt a self-check after each numbered section; the lesson
page carries ONE six-question set for the whole topic. Renaming alone would
have left the page promising a per-section match it cannot deliver.

## The four things, as the convention requires

| | |
|---|---|
| canonical data | `seed/csp-notes-cfu-fix.json`, two rules and 17 pages, pure ASCII with the em-dash as `—` |
| generator | `scripts/csp-notes-cfu-fix.js`, six refusals, splits per Big Idea |
| validator | the same six refusals, each broken independently in `smoke/csp-notes-cfu.js` |
| sheets | `imports/2026-09-21/*.csv`, MERGE, BOM, QUOTE_ALL, no Published At |

Preflight: all four clear. 301,032 bytes of live body go back up to change
3,302. The non-ASCII the preflight reports is carried through from the live
bodies, not introduced here.

## The check that would have shipped a lie

The mutation for the inverse round-trip rule came back GREEN the first time.
Per the convention that is a FAILED check, and it was: the test was hollow, not
the rule. The mutation appended a marker to the replacement text, but sequential
`split/join` over non-colliding tokens is exactly invertible, so no amount of
appending makes it lose a byte. The rule was never exercised.

Fixed by extracting `inverseOf()` and asserting the property build() actually
relies on: a body differing anywhere outside the declared sentences must fail to
reconstruct. One changed character and one deleted paragraph are both caught,
and an untouched body is not falsely accused. That last assertion matters as
much as the others: a rule that refuses every good sheet gets switched off
within a day.

## Why the round trip is the rule that matters

A MERGE has no undo and 299,000 of the 301,032 bytes are not supposed to change.
A count of replacements cannot tell you whether something else moved. Applying
the rules backwards and requiring the live body byte for byte can.

## Big Idea 3, the cheap half

`lib/csp-course-pages.js` builds 18 BI3 notes pages that are not live yet. They
never said "CFU", but they said "check yourself against the quiz", and "quiz" is
not on the lesson page either. Aligned to the same wording, verified against two
live BI3 lesson pages carrying "MCQ Practice" once and six questions. That is 35
pages covered rather than 17, at the one moment it costs nothing.

## Evidence

- `node scripts/verify-csp-notes-cfu-live.js --before`: fixed 0, not yet 17,
  problem 0, so the sheets are current rather than stale.
- Every one of the 17 lesson pages reads "MCQ Practice" once with six questions,
  so the new sentence is true on all of them.
- Parsed all four sheets back with the independent reader: 17 rows, 17 unique
  handles, 0 occurrences of CFU, 67 new MCQ Practice references.
- `smoke:cspnotescfu` 27/0, `smoke:encoding` 54/0, `smoke:mutationleak` 42/0,
  `smoke:volumepaths` ok.

## Open

- **The import is Tanner's.** Nothing has been imported. Four clicks, in the
  runbook's order, with the check between each.
- The live check cannot pass until then. `verify-csp-notes-cfu-live.js` without
  `--before` is the post-import gate.
- Mitch Gertz has not been emailed. The reply is in
  `docs/outbound/2026-09-21-mitch-gertz-cfu-reply.md` and promises to tell him
  when this is live.
