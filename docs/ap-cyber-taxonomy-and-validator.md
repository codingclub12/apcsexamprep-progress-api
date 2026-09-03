# The AP Cybersecurity taxonomy, and the validator that guards a sheet

Two things landed together on 2026-09-03, and they only make sense together: one
file that says what the 24 CED topics are, and one gate that refuses a Matrixify
sheet which disagrees with it.

The reason to read this before generating any cyber page: a generator plus a real
validator turns 24 pages from 24 judgement calls into one reviewable sheet. That
is the difference between eight weeks being enough and eight weeks not being
enough. Everything below is in service of the sheet being trustworthy enough that
nobody re-reviews it by hand.

## 1. `config/cyber-topics.json` is the taxonomy, and nothing else is

24 topics: 1.1-1.5, 2.1-2.4, 3.1-3.5, 4.1-4.4, 5.1-5.6. There is no 2.5, no 3.6
and no 4.5, and `lib/cyber-topics.js` refuses a file that says otherwise.

Read it through `lib/cyber-topics.js`. Never `require` the JSON directly: the
loader is where the shape is checked and where the useful questions get answered
(`titleOf('3.2')`, `topicOfHandle(...)`, `manifestRows()`).

| field | where it comes from |
| --- | --- |
| `title` | the CED text, parsed by `tools/ap-cyber-ced/topics-parse.js` |
| `slug` | derived from the title. A NAME, not a route, and never a rename instruction |
| `lesson_ids` | `utils.pageFromHandle`, asked rather than restated |
| `handles` | the live handle snapshot, filtered through `pageFromHandle` |
| `skill_categories` | the topic's own SUGGESTED SKILLS block |
| `manifest` | the one `course_manifest` visit row the topic gets |

Rebuild it with `npm run cyber:topics`. `--check` compares the committed file
against a fresh rebuild and writes nothing, which is the form CI runs.

### Why the titles come from the CED and not from a page

The recurring 1.3 versus 1.4 swap. The site calls topic 1.3 "Wireless Security".
The CED calls it "Best Practices for Public Networks". Both strings are in this
repo's history, because the mapping was living in page bodies, so every session
that read a page to learn what 1.3 is learned something different from the
session before it. `smoke/cyber-topics.js` now asserts that pair by name.

### Three facts in here that will bite if you forget them

**CED 3.1 is taught as two pages.** `ap-cyber-unit-3-lesson-1` is 3.1a (Network
Fundamentals) and `-lesson-2` is 3.1b (Network Attacks), so 24 topics map to 25
lesson pages. The gradebook needs both ids because a column is keyed
`${lesson}|${activity}`, and one shared id would let a better score on one half
mask the other.

**The manifest row for 3.1 is filed under lesson `3.1a`, deliberately.**
`lib/gradebook-contract.js` builds its lesson grid from `course_manifest` as well
as from the course config, so a row naming lesson `3.1` (a number no page
teaches) would add a phantom, permanently blank column to every cyber gradebook.
Nothing throws when that happens. A teacher just sees a column that never fills.

**Topic 1.1 lists one skill category where 1.2 to 1.4 list two.** Its SUGGESTED
SKILLS block ends at a page break in the CED text dump, so 1.1 may well name a
second category on a page the dump does not carry. The taxonomy records what the
text says and the suite pins it, so a re-extraction that disagrees arrives as a
diff to read rather than as a silent change to course content. It is written down
in the file's own `known_limits`.

## 2. What seeding the manifest moved, and what it did not

`scripts/seed-manifest.js` now writes 24 cyber visit rows, from the taxonomy.
Cyber is still absent from `VISIT_COURSES`, on purpose: its rows are per TOPIC,
not per lesson page.

Did not move: any cyber score, column, denominator or percentage. These are
`visit` rows, and visit rows are skipped by `denominatorMap` in
`lib/gradebook-contract.js` and by `lib/attempt-rollup.js`. Cyber's graded work
keeps arriving through `score_events` against its authored denominators, and
adding graded manifest rows for cyber would be what puts it on System A. That is
a separate decision and this is not it.

Did move, in the code: lesson completion. `lib/admin-exec.js` denominates that
from manifest visit rows, and cyber had none, so every cyber student counted zero
lessons assigned. Once the rows exist they are assigned 24 and their visits
count.

**It did not move on the first deploy, and the reason is worth keeping.** The
merge deployed cleanly and `manifest_items` stayed at 908. `lib/boot-seed.js`
shipped to make the boot seed's outcome visible on `/api/health`, and it answered
in one line:

```
cannot read /app/data/cyber-topics.json: ENOENT: no such file or directory
```

The taxonomy was in `data/`, and the Railway volume mounts at `/app/data`. A
mount replaces the directory, so a file that is tracked, not gitignored, and
uploaded in the deploy tarball is still not there at runtime. Every check that
said it shipped was looking at the repository rather than at the container.

The file lives in `config/` now, and `npm run smoke:volumepaths` refuses any
tracked file under `data/` or any runtime module that reads from it. Board 191.

## 3. The validator: seven rules, and a sheet that breaks one is refused

`tools/ap-cyber-ced/validator.js`. Every failure message starts with its rule id.

| rule | refuses |
| --- | --- |
| R1 | a CED Essential Knowledge code in student-visible text |
| R2 | a fabricated per-unit or per-topic exam weighting |
| R3 | an em-dash, entity forms included |
| R4 | a topic title that is not the canonical one, byte for byte |
| R5 | a Body HTML column on a row that is not a body update |
| R6 | an internal link to a handle that does not resolve |
| R7 | mojibake, at any corruption depth (through `lib/mojibake.js`) |

Four of these have a subtlety that decides whether the rule is usable at all.

**R1 goes through `lib/cyber-ek-density.js`** and holds no second opinion about
the convention. It also fails on an UNBALANCED protected block, because that
module locates protected regions by walking a tag to its close: a block that
never closes means the protection map is unreliable, and an unreliable map
reports codes as protected that are not. Silence there reads exactly like a clean
page.

**R2 has to tell two similar-looking things apart.** The CED's per-SKILL-CATEGORY
band ("each skill category is 25% to 40% of the exam") is CED-verbatim and true.
Per-UNIT and per-TOPIC percentages are the fabricated class: AP Cybersecurity
publishes none, so every number of that shape was invented by whoever typed it.
A percentage is therefore judged by what it is attached to, and ATTACHED MEANS
NEAREST. The first version failed on any unit or topic word within 260
characters, and it rejected the CED's own correct sentence on the first page it
saw, because every page carries its own topic number in its heading and the
heading was in the window. A rule that rejects correct pages gets switched off.

**R4 checks three ways to be wrong**: the Title column, the page's own `h1`, and
the presence of ANOTHER topic's canonical title. It skips the containment case
(topic 5.5 is "Protecting Applications", which is a substring of 5.2's title), or
5.2's own correct heading would report as carrying 5.5's title.

**R5 exists because a MERGE writes the whole body.** An empty Body HTML cell does
not mean "leave the body alone", it means "the body is now empty", and the live
page is gone.

## 4. Rule 7, and how it was found hollow before it shipped

Mojibake is text whose UTF-8 bytes were decoded with a single-byte codec and
re-encoded. It is still valid UTF-8: it parses, it lints, it serves. The only
thing wrong with it is that it means the wrong character.

It comes at DEPTHS. Run the damage once and a bullet becomes three characters led
by U+00E2. Run it twice and those become seven, led by U+00C3.

The handoff for this work prescribed the rule as "U+00C3 followed by a codepoint
in U+0080 to U+00BF, against decoded text". That is the double-pass form only. It
passes the single-pass form, which is the one that has actually been observed on
live pages, and it passed the corruption that was sitting in this repo's own CED
text dumps until they were repaired on 2026-09-03.

**Detection is not implemented here.** It lives in `lib/mojibake.js`, and rule 7
formats what that module reports, for the same reason rule 1 goes through
`lib/cyber-ek-density.js`: one module per convention, or two modules eventually
disagree about the same page.

That is worth recording as more than a style choice, because for a few hours it
was not true. This work shipped its own structural detector and `main` shipped
one the same afternoon (PR #482), from the opposite direction: it started from
`smoke/encoding-guard.js` reporting the repository clean while four tracked files
were corrupted. Both arrived at the same three conclusions independently, which
is the strongest evidence available that they are right:

- the lead set has to be the whole UTF-8 lead class, not U+00C2, U+00C3, U+00E2
- latin-1 and cp1252 each reverse 27 codepoints the other cannot, so a detector
  carrying one flavour is blind to a whole flavour
- the width comes from the lead byte, and a 4-byte lead means an emoji, so a
  detector trying widths 3 and 2 cannot see a damaged emoji at all

Two implementations of one convention is exactly what both were built to prevent,
so this side converged onto `lib/mojibake.js` and deleted its own. What rule 7
adds is the codec and the width in the failure message: "cp1252, width 4" says an
emoji was damaged once, and "latin1, width 2" says the damage has been run over
twice.

**Who proves what, so neither suite re-proves the other's job.**
`npm run smoke:encoding` proves the module, against generated fixtures at both
depths in both flavours, and asserts by name that the U+00C3 anchor is
insufficient. `npm run smoke:cybersheet` proves that RULE 7 fires on a sheet, at
both depths, on a 4-byte character, and in the Title column as well as the body.
The deploy gate then narrows the shared module on purpose (LEAD_MIN and LEAD_MAX
to 0xC3, and cp1252 dropped from CODECS) and requires the single-pass assertion
in this side's suite to go red by name. A module can be correct and a rule can
still fail to call it.

**The EK convention now has the same shape as the mojibake one**, and it is worth
noticing why, because it is the reason `validate_csv.py` used to be worse than
nothing. That script gained a real mojibake check in the same PR, through
`tools/ap-cyber-ced/mojibake.py`, a port of `lib/mojibake.js`; a port is a copy
and copies drift, so `smoke/mojibake-parity.js` runs both over one generated
corpus and requires identical hits, recovered characters and codec attribution.
Rule 7 here needs no port because it is JavaScript and calls the module
directly. If a Python-side EK check is ever wanted, that parity suite is the
pattern to copy rather than a second reading of the convention.

`scripts/matrixify-preflight.js` was the last consumer holding its own opinion,
three hardcoded latin-1 lead pairs, so every non-cyber sheet was unguarded
against the flavour a sheet out of Excel actually carries. Board 186, closed the
same day by PR #484: it calls the module now, and a corrupted body is refused by
the preflight as well as by rule 7 here. Verified by running it rather than by
reading it, on a sheet built from the damage simulator.

The lesson that outlives both: when a module lands, the MIGRATION is the change.
Grep for the retired pattern across every consumer before calling a
consolidation done.

## 5. Generating a sheet

```
npm run cyber:sheet -- --spec <spec.js> --dry-run     # judge, write nothing
npm run cyber:sheet -- --spec <spec.js> --out imports/2026-09-04/cyber-3-2.csv
```

The spec carries the WORDS. The taxonomy carries the FACTS. A spec that sets
`title`, `slug` or `skill_categories` is refused, because a spec naming its own
title is a second opinion about what topic 1.3 is called.

Nothing is written unless every rule passes AND the CSV parse-back diff is zero.
The parse-back is not ceremony: a CSP sheet lost 90 bytes a page while every
semantic check passed, and the diff is what caught it.

`tools/ap-cyber-ced/fixtures/topic-spec.fixture.js` is the fixture. Its specs set
`fixture: true`, which forces a `fixture-` handle and makes the generator refuse
to write an importable sheet at all. "Generate one real page just to test it" is
the proposal that puts fixture prose on a live URL, and it is now structurally
unavailable rather than discouraged.

The fixture deliberately carries the hard cases: legitimate EK codes in all three
protected places, the CED's real 25% to 40% band, a link to a live page, a link
to the other page in its own sheet, and the apostrophes and quotation marks a
quoting bug eats first. A fixture that avoided all of that would prove nothing.

## 6. Running the checks

```
npm run smoke:cybertopics          the taxonomy, plus a second implementation
npm run smoke:cybersheet           a correct sheet passes; rule 7 is not hollow
npm run smoke:cybersheetmutation   break each rule on purpose
node scripts/deploy-gate.js deploy-gates/2026-09-03-cyber-taxonomy-validator.json --pre
```

The mutation battery declares, for each mutation, the rule it expects to trip AND
a distinctive slice of the message. A mutation caught only by some other rule is
reported as MISSED. That is not fussiness: where guards overlap the strong one
masks the weak one, and a battery that only looks for redness reports a clean run
over a rule that cannot fire at all.

A green mutation run is a failed check. The exit code says so.

## 7. Before Session D generates anything, read the sitemap diff

`docs/runs/2026-09-03-claude-code-cyber-topic-sitemap-diff.md` (another session,
same day) found that `/pages/ap-cybersecurity-topics` already indexes about 39
live topic-overview pages, and concluded that generating 24 "new" topic pages
without reconciling against them risks the duplicate-page mistake.

Nothing here contradicts that, and the generator is built the same way round.
Those 39 are concept-level pages (`-man-in-the-middle`, `-firewalls`, `-mfa`);
the `handles` field in the taxonomy comes from `utils.pageFromHandle`, which maps
only the canonical LESSON pages, so the two sets are different things. More to
the point, `specErrors` refuses a non-fixture spec whose handle is not the one
the taxonomy says that topic already lives at. A generator run cannot quietly
create a second page for a topic that has one; it stops and says where the
existing page is. Deciding whether an existing page should be rewritten, and at
which handle, stays a human call (board 81).

Where `docs/ap-cyber-units-2-5-ced-audit.md` names a topic title, this taxonomy
agrees with it verbatim (6 of the 24; that audit enumerates only the topics whose
pages it found misaligned).

## 8. What this does NOT settle

- **Which handle a new page should use.** Units 1 and 2 use topic slugs, Units 3
  to 5 use numbered slugs (board task 81). Both are recorded; neither is blessed.
  Renaming a live handle is on the `NEVER_AUTO` list.
- **Whether a lesson reads well.** No check settles that.
- **The 25 lesson pages against 24 topics question**, and the live
  `ap-cyber-unit-4-lesson-5` page, which tracks as lesson 4.5 and is not a CED
  topic at all. Filed on the board as 188.
- **Every sheet in the repo that is not a cyber sheet**, for mojibake. Board 186.
