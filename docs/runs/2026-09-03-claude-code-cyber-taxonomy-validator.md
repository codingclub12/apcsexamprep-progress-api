# Session C: the canonical AP Cyber taxonomy, and a validator proven not hollow

Board 181 (T-1.1) and 182 (T-1.2). Claims 64 and 65.

## What changed

**One canonical taxonomy.** `data/cyber-topics.json` carries the 24 CED topics:
unit, topic number, verbatim official title, slug, skill categories, the
gradebook lesson ids, the live handles, and the one `course_manifest` row each
topic gets. Built from the CED text dumps by
`tools/ap-cyber-ced/build-topics.js`, read only through `lib/cyber-topics.js`.
Titles come from the CED, never from page HTML: the recurring 1.3 versus 1.4 swap
exists because the mapping was living in page bodies.

**The manifest is seeded from it.** `scripts/seed-manifest.js` writes 24 cyber
visit rows. Cyber stays out of `VISIT_COURSES` because its rows are per TOPIC,
not per lesson page: the site teaches CED 3.1 as two pages, so 24 topics map to
25 lesson pages, and generating from the config would have produced 25
denominators for a 24-topic course.

**A generator and a seven-rule validator.**
`tools/ap-cyber-ced/generate-sheet.js` turns taxonomy plus a per-topic content
spec into a Matrixify sheet and writes nothing unless every rule passes and the
CSV parse-back diff is zero. `tools/ap-cyber-ced/validator.js` refuses a sheet on
any of: an EK code in student-visible text (R1, routed through
`lib/cyber-ek-density.js`), a fabricated per-unit or per-topic exam weighting
(R2), an em-dash including entity forms (R3), a topic title that is not canonical
byte for byte (R4), a Body HTML column on a row that is not a body update (R5),
an internal link to an unresolvable handle (R6), mojibake at any depth (R7).

**Every rule mutation tested, per rule.**
`tools/ap-cyber-ced/validator-mutation.js`, 15 mutations, each declaring the rule
it expects to trip AND a distinctive slice of the message, so a mutation caught
only by an overlapping rule reports MISSED rather than passing.

Full detail: `docs/ap-cyber-taxonomy-and-validator.md`. CLAUDE.md now carries the
taxonomy authority and, for the first time, an actual mojibake rule.

## Evidence

```
cyber manifest rows BEFORE seed: 0
cyber manifest rows AFTER seed: 24        (scratch DB, DB_PATH override)
item ids: 1.1-visit ... 5.6-visit          exactly the 24 CED topics
lesson ids: ... 3.1a ...                   no lesson "3.1", so no phantom column

smoke:cybertopics           22 checks, including the re-derive
smoke:cybersheet            31 checks
smoke:cybersheetmutation    15 mutations, all 7 rules independently red
all 164 offline suites      PASS (the CI-derived list, nothing else broke)

deploy gate (--pre)         12 checks, 3 kinds: suite, mutation, rederive
  7 source-level mutations, each pinned to its own assertion
  rederive 1: shell grep counts 24 topic headers, agrees with the JSON
  rederive 2: build-topics.js --check, the committed file is a fresh rebuild
  live (deferred): manifest_items 908 -> 932
```

The re-derive is two implementations against two anchors. The builder reads the
`TOPIC 3.2` framework headers; the suite never looks at them, and instead
enumerates the topic number space from learning objective codes (B1, 24 of 24)
and reads titles out of the UNIT AT A GLANCE tables (B2, 19 of 24). Diff to zero
on both.

**Honest limit on the re-derive, stated rather than buried.** The Unit 1 dump does
not carry its glance table, so Unit 1's five titles are re-derived by a second
ALGORITHM over the same text (scanning up from the `Required Course Content`
boundary instead of down from the header) rather than from a second anchor. That
catches a boundary or furniture bug, which is the failure mode these dumps have.
It would not catch a title that is wrong in the source dump itself. 19 of 24 are
cross-anchored; 5 are cross-implemented.

## Rule 7 was hollow as specified, and here is the measurement

The handoff prescribed rule 7 as "U+00C3 followed by a codepoint in U+0080 to
U+00BF, against decoded text", while also stating that an earlier draft had been
blind to the single-pass corruption seen on live pages. Those two sentences
disagree. U+00C3 is the lead character of the DOUBLE-pass form; single-pass
corruption leads with U+00E2 for a 3-byte character and U+00F0 for a 4-byte one,
so the prescribed rule passes exactly what the warning says to catch.

Measured, not argued. `smoke/cyber-sheet-gate.js` runs the narrow rule beside the
implemented one:

```
narrow rule on double-pass bullet   catches      (what it was written from)
narrow rule on single-pass bullet   MISSES       (what is on live pages)
narrow rule on single-pass dart     MISSES       (4-byte character)
general rule                        catches all three
```

So `tools/ap-cyber-ced/mojibake.js` is structural rather than a pattern list: map
each character back to the byte a single-byte codec would have produced, require
a UTF-8 lead byte plus the continuation bytes it demands, decode, and require
exactly one character back. That fires at every depth, on both codecs, for 2, 3
and 4 byte characters, and it does not fire on healthy accented text.

Two mutations in the deploy gate pin this: narrowing `leadWidth` to `0xc3` only,
and deleting the cp1252 table. Both must turn `smoke:cybersheet` red on the
single-pass assertion by name.

## Two existing guards have the same blind spot, filed not fixed

Confirmed by running them, not by reading them:

```
"bullet"  corrupted once -> matrixify-preflight sees: false   mojibake.js: true
"dart"    corrupted once -> matrixify-preflight sees: false   mojibake.js: true
```

- **186** `scripts/matrixify-preflight.js` screens every sheet against three
  latin-1 byte pairs, so the cp1252 forms that `lib/command-hazards.js` names as
  the ones that actually happen pass its mojibake screen.
- **187** `smoke/encoding-guard.js` tries latin-1 only and its lead set omits
  U+00F0. The euro sign has no latin-1 byte, so the reversal is lossy, the
  character is skipped, and the file reports clean.

Both left alone deliberately. A repo-wide detector getting stricter can turn CI
red on real existing damage, which is the right outcome and the wrong thing to
discover inside somebody else's change.

## Also found

- **188** `ap-cyber-unit-4-lesson-5` is live and `utils.pageFromHandle` files it
  under lesson 4.5. Unit 4 is 4.1 to 4.4 in the CED, and `COURSES` declares a 4.5
  column, so student work lands on a lesson the course does not have. The
  taxonomy makes this visible because 4.5 attaches to no CED topic.
- Rule 2 rejected the CED's own correct sentence in its first form, and the cause
  is worth remembering: every page carries its own topic number in its heading,
  so any "unit or topic word within N characters" test fails on a correct page.
  Attachment is nearest-anchor now, ties to the unit, failing closed.
- Rule 4's swap check needed a containment exception: topic 5.5 is "Protecting
  Applications", a substring of 5.2's title, so a plain substring test reported
  5.2's own correct heading as carrying 5.5's title.

## What this moved live, and what it did not

Not moved: any cyber score, column, denominator or percentage. Visit rows are
skipped by `denominatorMap` and by `lib/attempt-rollup.js`, and cyber's graded
work still arrives through `score_events` against authored denominators.

Moved: lesson completion. `lib/admin-exec.js` denominates that from manifest
visit rows and cyber had none, so every cyber student counted zero lessons
assigned; they are now assigned 24. `manifest_items` on the live digest goes 908
to 932, which is the post-deploy live check.

## Still open

- The live half of the deploy gate runs after the merge. Not finished until it
  passes.
- Session D can now generate a unit batch without touching the validator, which
  was the exit condition for this session.
- Handle convention for a NEW cyber page is still undecided (board 81). The
  taxonomy records both forms and blesses neither; renaming a live handle is
  `NEVER_AUTO`.
- Topic 1.1's single skill category is what the dump says. If a full CED is ever
  read, that assertion in `smoke/cyber-topics.js` is the one to revisit.
