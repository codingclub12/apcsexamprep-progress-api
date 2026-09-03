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

Measured, not argued. This session first built its own structural detector and
proved the gap by running the narrow rule beside it:

```
narrow rule on double-pass bullet   catches      (what it was written from)
narrow rule on single-pass bullet   MISSES       (what is on live pages)
narrow rule on single-pass dart     MISSES       (4-byte character)
general rule                        catches all three
```

Detection then converged onto `lib/mojibake.js`, which another session shipped
the same afternoon (see the merge section below), so that measurement now lives
in `smoke/encoding-guard.js` where the module is proved, and this side's suite
asserts the part only it can: that RULE 7 fires on a sheet, at both depths, on a
4-byte character, and in the Title column as well as the body.

The structural test either module implements is the same: map each character back
to the byte a single-byte codec would have produced, require a UTF-8 lead byte
plus the continuation bytes it demands, decode, and require exactly one character
back. Every depth, both codecs, widths 2 to 4, and no false positives on healthy
accented text.

Two mutations in the deploy gate pin it from this side: narrowing the shared
module's lead range to 0xC3, and dropping cp1252 from its codec list. Each must
turn `smoke:cybersheet` red on the single-pass assertion by name.

## Two existing guards have the same blind spot, filed not fixed

Confirmed by running them, not by reading them:

```
"bullet"  corrupted once -> matrixify-preflight sees: false   detector: true
"dart"    corrupted once -> matrixify-preflight sees: false   detector: true
```

- **186** `scripts/matrixify-preflight.js` screened every sheet against three
  latin-1 byte pairs, so the cp1252 forms that `lib/command-hazards.js` names as
  the ones that actually happen passed its mojibake screen. **Closed by PR #484**,
  about an hour after it was filed. Re-verified here by running the preflight over
  a sheet carrying single-pass damage rather than by reading the diff: it now
  reports `mojibake sequence present in a body`, where before it reported nothing.
  That one mattered more than it looked: every Shopify page change ships as a
  Matrixify sheet, so that preflight is the gate between authored content and a
  live page body.
- **187** `smoke/encoding-guard.js` tried latin-1 only and its lead set omitted
  U+00F0. The euro sign has no latin-1 byte, so the reversal was lossy, the
  character was skipped, and the file reported clean. **Closed by PR #482 while
  this branch was in flight**, from the other direction: that session found the
  guard reporting the repository clean over four corrupted tracked files.

Both were left alone here deliberately, on the reasoning that a repo-wide
detector getting stricter can turn CI red on real existing damage, which is the
right outcome and the wrong thing to discover inside somebody else's change. Both
then landed as their own changes with their own suites, within the hour, which is
exactly the shape that reasoning was arguing for. Filing them cost nothing and
routed them to sessions that could give each one its own claim and its own
mutation run.

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

Moved, in the code: lesson completion. `lib/admin-exec.js` denominates that from
manifest visit rows and cyber had none, so every cyber student counted zero
lessons assigned; once the rows exist they are assigned 24. `manifest_items` on
the live digest going 908 to 932 is the post-deploy live check.

**That check FAILED, and the correction belongs here rather than in a later
note.** The merge deployed at 17:41Z, `/api/health` reports `d059208`, the
railway-deploy check went green, and `manifest_items` is still 908. The 24 rows
are not in production. Ruled out by measuring: a cached digest (other counters
moved between the same two reads), a different database, the prune path (an
orphan is a row absent from `buildRows()` and these are in it), the incremental
seed (it adds exactly 24 against a populated manifest locally), a missing file in
the artifact (tracked, not gitignored, full checkout uploaded, volume mounts at
`/data`), and an item_id collision (all 24 ids are reused by another course, so a
legacy `UNIQUE(item_id)` would explain it perfectly, except production already
holds 179 such shared ids among its 908 rows, so no such constraint exists).

What is left is two cases only the container can tell apart: the seed threw, or
it ran and wrote nothing. Board 191, and PR #489 ships the instrument that says
which.

## What changed after the merge, and what it proved

`main` moved four times while this was in flight, and twice in ways that bear
directly on it.

**Another session shipped the same detector, from the other direction.** PR #482
rewrote `smoke/encoding-guard.js` around a new `lib/mojibake.js`: whole UTF-8
lead class, both flavours, widths 2 to 4, generated fixtures at both depths, and
a section asserting by name that the U+00C3 anchor is insufficient. It got there
by starting from the guard reporting this repository clean while four tracked
files were corrupted; this side got there from a handoff that prescribed the
U+00C3 rule. Same three conclusions, independently: the lead class, the two
flavours (neither subsumes the other), and width from the lead byte.

That closes board 187, and it makes this branch's own `mojibake.js` a second
opinion about a convention that now has a module. So rule 7 converged onto
`lib/mojibake.js` and the duplicate was deleted. Rule 7 now formats what the
shared module finds, adding the codec and the width to the message, and the
suite's job narrowed to what the module cannot answer: whether rule 7 actually
FIRES on a sheet, at both depths, on a 4-byte character, and in the Title column.
The deploy gate mutations moved with it: narrowing `LEAD_MIN`/`LEAD_MAX` to 0xC3,
and dropping cp1252 from `CODECS`, must each turn this side's single-pass
assertion red by name.

Board 186 stays open and stays real, re-confirmed after the merge:
`scripts/matrixify-preflight.js` still screens against three latin-1 byte pairs.

**The CED extract itself was repaired, and the taxonomy did not move.** The same
PR repaired 65 mojibake characters in `CED-UNIT1-EXTRACT.txt`. Rebuilding the
taxonomy against the repaired file changed exactly one line:

```
-        "sha256": "92701eac418efa9854e0ca22b681099e04d8c25b871a8638f581ae44f80f9a54"
+        "sha256": "bc9a9a031499e1ec286375a26d960293d754b4555b475eebb8aadaea1ca55b1a"
```

Zero titles changed. That is a better result than any assertion this session
wrote, because it was not designed: the parser was reading the titles rather than
the damage, and a real repair to the source proved it after the fact.

**Two deploy-gate pins went stale in the same hour, both for the same reason.**
Rule 7's message changed when it moved onto the shared module, and the mutation
battery's `expect` strings were literals typed to the old wording, so three
mutations reported MISSED while the rule was working. Then the battery's own
MISSED wording was reworded and two gate pins could no longer match it. Both are
the hollow-guard problem one level up: a pin that cannot match the failure it
targets. Fixed by computing the pins from the same constants the mutations
corrupt, and by giving every MISSED branch one shape, `MISSED [R1]`.

Re-measured after the merge rather than assumed: live `manifest_items` is still
908, and the local build is still 932, so the live check stands as written.

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
