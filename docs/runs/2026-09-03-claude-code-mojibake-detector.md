# 2026-09-03: one mojibake detector, and the three that were blind

Asked to fix the mojibake rule before it shipped, on the grounds that the rule in
the handoff drafts described DOUBLE-pass corruption while the form reported on a
live page was SINGLE-pass, so the validator would have been hollow and mutation
testing would not have caught it.

That was right about the drafts, and it understated the problem in the repo.

## What was actually wrong

Three detectors, no shared authority, and each blind in a different combination:

| | cp1252 flavor | 4-byte characters (emoji) | scans .txt |
|---|---|---|---|
| `lib/site-crawl.js`, live pages | yes | **no** | n/a |
| `smoke/encoding-guard.js`, repo source | **no** | **no** | **no** |
| `scripts/matrixify-preflight.js`, sheets | **no** | **no** | n/a |
| `tools/ap-cyber-ced/verify_import.py`, live bodies | partly | **no** | n/a |

Two independent holes, and they compound.

**The codec.** cp1252 agrees with latin-1 everywhere except 0x80 to 0x9F, where
it maps ABOVE U+00FF: 0x80 is U+20AC, 0x92 is U+2019. A latin-1 reversal cannot
produce those code points, so the lossless round-trip test threw the run away and
reported the text clean. `smoke/encoding-guard.js` said in its own header that
latin-1 was "the strictly broader case" because it maps every byte. True of
DECODING, false of the reversal the check actually performs. cp1252 is what Excel,
Windows and every CSV pipeline into this store produce.

**The width.** A 4-byte character corrupts into FOUR characters. All three tried
widths 3 and 2 with a lead set of `{U+00C2, U+00C3, U+00E2}`, so no emoji could
be detected by any of them at any width, in either flavor.

**And the part that stings.** `lib/site-crawl.js` had already worked out the
cp1252 half, and carried a comment explaining it, addressed by name to
`smoke/encoding-guard.js`. That comment was committed on 2026-08-26. Both other
guards were still wrong on 2026-09-03. Eight days, same repository, answer
written down, nothing propagated. That is the argument for one module rather than
a fourth opinion, and it is why the fix was consolidation and not another patch.

## What the drafts got wrong, measured rather than argued

`scripts/mojibake-rederive.py` reproduces the retired detector and scores it:

```
    old MISS   new catch   cp1252 bullet   THE REPORTED FAILURE
    old MISS   new catch   cp1252 emoji    THE REPORTED FAILURE
    old catch  new catch   latin-1 bullet
    old MISS   new catch   latin-1 emoji
    old catch  new catch   latin-1 up triangle, the 2026-08-07 incident
    old MISS   new catch   cp1252 right single quote
    old catch  new catch   latin-1 section sign

  old rule missed 4 of 7, new rule missed 0 of 7
```

The suite also asserts the thing that makes a sample-based rule worthless: the
single-pass and double-pass forms of the same character **do not share a first
character**, so a check written from one cannot match the other. That is now a
test, not a paragraph.

## What changed

- **`lib/mojibake.js`, new.** The only place that gets to say what mojibake looks
  like. It has no pattern list. A run starts only where a character maps back to
  a legal UTF-8 lead byte (0xC2 to 0xF4, derived from the specification), the
  lead byte states the width, both codecs are tried strictly, and a run is
  mojibake only if it reverses to exactly one valid character. `repair()` runs
  passes until the text stops changing and reports the depth.
- **A second tier, because widening has a cost.** Widening the lead range buys
  the emoji case and costs one class of false positive, found by scanning the
  theme repo rather than by reasoning: Shopify's own Nordic locale files carry
  the sort labels `A-ring en-dash A` and `O-diaeresis en-dash A`, which reverse
  cleanly to U+0156 and U+0596. They are real text and structurally identical to
  real mojibake, so the discriminator is the character recovered. A run that
  recovers something this store's content cannot contain is a SUSPECT: printed
  every run, never fatal. Refusing on one would block a real import.
- **`repair()` is deliberately less cautious than `detect()`**, and the suite
  states it as intent so nobody reads it as a bug. A doubly corrupted emoji
  passes through Latin Extended-A on the way back, so a plausible-only repair
  stalls halfway and reports depth 1 for something that is depth 2. `repair()` is
  therefore never wired into an automatic path.
- **All four consumers rewired**, so `lib/site-crawl.js`, the preflight and the
  encoding guard cannot disagree again. 3684 characters of duplicate detector
  deleted from `lib/site-crawl.js`.
- **`smoke/mojibake-fixtures.js`, new.** The corrupter, written in the opposite
  direction from the module, so a fixture never comes from the code under test.
  This matters: the preflight's old smoke fixture was built in the same latin-1
  flavor as the rule it tested, so the guard and its test shared one blind spot
  and agreed with each other. A hand-cut copy of this table also produced a
  fixture that was cp1252 for one byte and latin-1 for another, which no single
  misreading can make; the module correctly refused to call it mojibake and the
  assertion failed for a reason unrelated to the code under test. Hence one copy.
- **The guard scans `.txt` and `.py` now**, and has no skip list at all, so it
  polices its own source.

## Real corruption found and repaired

Adding `.txt` was not tidiness. `tools/ap-cyber-ced/CED-UNIT1-EXTRACT.txt` held
**65 corrupted runs**: 10 right single quotes, 28 en spaces, 13 middle dots, 12
section signs, 2 em dashes. `docs/ap-cyber-unit1-ced-realignment.md` names that
file as the authority for AP Cybersecurity Unit 1, and it had been storing
"they don't comply" as `don` + U+00E2 U+0080 U+0099 + `t comply` for as long as
it has existed. Every semantic check in this repo passed the whole time, because
corrupted text is still valid UTF-8: it parses, it lints, it serves, and only the
meaning is wrong.

Repaired by reversal, not retyping. The arithmetic closes exactly: 65 runs, 105
characters recovered, 17599 to 17494.

Three more files carried literal mojibake and are now clean:

- `lib/command-hazards.js` is injected VERBATIM into every compiled prompt and is
  the only rulebook for surfaces that never open a CLAUDE.md. Its mojibake rule
  showed a CORRECT bullet and a CORRUPTED emoji as its two examples, so it
  demonstrated the bug by accident and taught the wrong lesson on purpose. It now
  names the code points and points at the module, and says not to paste a
  corrupted sample into a rule.
- `smoke/site-crawl.js` had pasted fixtures. Built from bytes now.
- `tools/ap-cyber-ced/verify_import.py` said its patterns were "written as
  escapes so smoke/encoding-guard.js does not flag the file". They were literal
  characters, and the file went unflagged only because `.py` was not scanned.
  They are real escapes now, and the list gained the emoji leads it never had.

## Evidence

`deploy-gates/2026-09-03-mojibake-detector.json`, run with `--pre`: 3 suites, 7
mutations, 1 rederive, all passing. Every `expect_failure` carries the literal
`[FAIL] ` prefix, because an assertion NAME appears on both the pass and the fail
line, so naming it alone would prove only that it ran.

| kind | check | result |
|---|---|---|
| suite | `smoke:encoding` | 87 checks, green |
| suite | `smoke:preflight` | 60 checks, green |
| suite | `smoke:sitecrawl` | 132 checks, green |
| suite | full offline battery, CI's own derivation | **161 suites, 0 failures** |
| mutation | reverse through latin-1 only | red on the cp1252 bullet |
| mutation | `runLength` 4 becomes 3 | red on the cp1252 emoji |
| mutation | `LEAD_MAX` 0xF4 becomes 0xEF | red on the latin-1 emoji |
| mutation | `plausible()` returns true | red on the Norwegian sort label |
| mutation | preflight stops refusing | red on the cp1252 sheet body |
| mutation | crawler stops asking the module | red on the emoji in prose |
| mutation | drop `.txt` from the scan | red on the CED extract |
| rederive | Python's own codecs, no JS imported | agrees on **all 1470 files** |

The rederive is independent where it counts: Python's built-in `cp1252` and
`latin-1` codecs do the reversal, so the 27-entry table is not one a person here
typed twice. Honest limit, stated in the script: the PLAUSIBLE ranges are policy
rather than an encoding fact, so they are re-stated there and compared, not
independently derived. Agreement on them proves only that both files say the same
thing.

## What I could NOT confirm, and it matters

**The reported live page.** The premise was that this corruption was seen on a
live page. I could not reproduce that.

The first attempt at this measurement was worthless and it is worth saying why,
because it is the same failure shape as everything else in this note. It scanned
200 pages with a browser-ish User-Agent and reported 0 runs. Then merging `main`
brought in a convention added the same day: the storefront's bot management
INVERTED on 2026-09-03, a request claiming to be a browser now gets a 403
"Verifying your connection" body, and `looksLikeChallenge` in
`lib/site-crawl.js` does not match that string. "No mojibake found" is a NEGATIVE
assertion, and a negative assertion passes on an empty challenge page. So the
number was unfalsifiable until it was re-run through `lib/storefront-fetch.js`,
which refuses any body that does not carry both storefront markers:

```
  bodies PROVEN to be rendered pages   60
  refused (not provably the page)      0
  total body characters read           23,947,084
  pages carrying ANY non-ASCII         55   <- positive control
  CORRECTED detector flags             0 page(s), 0 run(s)
  OLD rule would have flagged          0 page(s), 0 run(s)
```

The positive control is the part that makes this a measurement rather than a
shrug: 55 of the 60 pages carry non-ASCII characters, so there was material on
them that COULD have been corrupted and was not. A clean verdict over pages with
nothing but ASCII would have proved nothing at all.

So the storefront is clean across this sample. That is not a contradiction of the
report: 60 pages is 4.4% of 1362, the page may have been repaired already, and
the corruption may have been seen in a sheet or a draft rather than on a served
page. But the fix does not rest on it. It rests on the guards being provably
blind, measured above, and on real corruption sitting in a curriculum authority
in this repo.

Both scans are re-runnable and neither needs credentials.

**The sitemap point was already settled, by somebody else, earlier today.**
I reached it independently and it is not news:
`docs/runs/2026-09-03-claude-code-cyber-topic-sitemap-diff.md` landed on `main` at
10:45 with the same figure (1362 page URLs from `sitemap_pages_1.xml`), the same
conclusion that the prior audit's inability to retrieve it does not reproduce, and
answers to the Unit 4 and 5 Cyber exam question that this note does not have. Read
that one. The only thing worth adding from here is operational: fetch it with NO
User-Agent, per the `lib/storefront-fetch.js` convention that landed the same day,
or you get the challenge body and a silently empty result.

## Still open

- **The 25 to 40 per-skill-category band was NOT verified here.** The CED is not
  in this repository, so there is nothing to check it against; `docs/ced-snapshot`
  and the Unit 1 extract do not contain the weighting table. It stays unconfirmed
  and was deliberately not committed as fact anywhere.
- **The `.pdf`-extension claim is recorded as a pointer, not a fact**, in
  `tools/ap-cyber-ced/README.md`. Same reason: that file lives in the chat
  project.
- **The theme repo is untouched.** Its three flagged locale files are the Nordic
  false positives, which are correct text, so there was nothing to fix. The theme
  has no CI, so a guard there could not gate anything anyway; the gate that
  matters for the storefront is the Matrixify preflight, which is in this repo and
  is fixed.
- **`PLAUSIBLE` is a policy and will need widening** the day this store ships a
  Nordic or Eastern European locale. The suspect lines exist so that shows up as a
  printed note rather than a silent miss.

## What was learned

A guard built from remembered byte patterns comes back CLEAN, which is worse than
coming back wrong, and this repo now has the same lesson twice: the CSP sheet that
lost 90 bytes a page, and a mojibake rule that matched the wrong corruption depth.
The fix in both cases was to derive the rule from the format instead of collecting
samples of the failure.

The sharper lesson is about propagation. The cp1252 answer existed in this
repository, correct and commented, eight days before this session, and two guards
that needed it never got it. Writing a fix down in the file where you found the
bug is not the same as fixing it.
