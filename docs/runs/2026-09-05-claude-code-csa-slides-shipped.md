# 2026-09-05 claude code: the CSA decks reach production, and the last mile is a page attribute

Board task 206. This closes the three open items left by
`docs/runs/2026-09-04-claude-code-csa-units-2-4-slides.md`, which built the
pipeline and stopped where it needed Tanner's Google account. It also corrects
one number in that note.

Everything below is merged and verified against live systems. The monitor repair
that happened alongside it has its own note,
`2026-09-04-claude-code-monitor-repair.md`, and is not repeated here.

## What shipped

| | |
|---|---|
| `#522` `909fe84` | 266 differentiation items, the only newly authored content in the kit |
| `#533` `9e2951b` | `ROOT_FOLDER_ID` pointed at the uploaded Drive folder |
| `#539` `a9df079` | `preview()` stopped checking the CSA upload against the cyber shape |
| `#547` `73f605e` | two more cyber literals, and a rule that catches the next one |
| `#549` `6b251f1` | 152 embed ids, and an importer that no longer lies about writing them |
| `#556` `331c792` | Unit 1's real day counts, counted out of Drive |
| theme `#107` | the slide gate opened to all four units, live on the storefront |

152 decks converted, shared, named and mapped. Production serves them.

## The correction: Unit 1 has 28 days of decks, not 35

The prior note says "Drive holds 35 days across 15 lessons", citing Unit 1's own
`COURSE-MATERIALS-INDEX.txt`: "15 topics, 35 instructional days at a 60 minute
period". I repeated that figure several times before measuring it.

Counting the actual `Day<N>_Deck_*.pptx` files in the fifteen `Slide_Decks`
folders gives **28 teaching days, 56 decks**:

    1-1  2    1-6  1    1-11 2
    1-2  2    1-7  1    1-12 2
    1-3  2    1-8  1    1-13 2
    1-4  2    1-9  2    1-14 2
    1-5  3    1-10 2    1-15 2

Every folder holds complete TEACHER and STUDENT pairs, no odd counts.

**The seven-day gap is unexplained and worth someone's attention.** The index
file is not obviously wrong: it may count assessment or project days that have
no deck. But nobody should promise a teacher 35 days of Unit 1 slides on the
strength of that file, because 28 is what exists. Whoever reconciles it should
start from the folders rather than the index.

The placeholder this replaced was not uniformly wrong, which is why "they are
all wrong, set them to 2" would have been a worse fix than counting: **1-6, 1-7
and 1-8 really are single-day lessons**, so three of the fifteen were right by
accident.

## Three cyber literals, and why the third had teeth

`scripts/csa-slides-conversion.gs` was adapted from the cyber script. Three of
its string literals were never changed over and all three shipped in `2c0b436`:

    EXPECTED: 9 lessons, 70 decks   preview() enumerated all 152 CSA decks
                                    correctly, printed every per-unit total
                                    correctly, then told Tanner to stop and
                                    reconcile against another course's shape.
                                    He stopped, correctly.
    AP-CYBER_ + deck.lesson         152 CSA decks landed in Drive named for the
                                    wrong course.
    node scripts/cyber-slide-...    the closing instruction, printed at the
                                    moment the operator decides what to run
                                    next, naming the importer that reads the
                                    cyber manifest and writes the cyber config.

The third is the dangerous one. Cyber also numbers lessons `2-1` and `2-2`, so a
CSA sheet's Unit 2 rows match its manifest keys; it would have refused on the
Unit 3 and 4 rows rather than corrupted anything, but that is luck rather than
design.

Each was found by a person reading the file after the fact, one at a time, in
two separate sessions. So the fix is the rule: **no string literal in that
script may mention another course.** Comments may, and should, because the
adaptation history is worth keeping.

It walks the file as a four-state machine rather than pattern matching, because
both regex shortcuts were tried and both are wrong. Matching literals directly
starts on an apostrophe inside a comment and runs away, swallowing prose to the
next quote. Stripping comments first with a `//` rule truncates every line
holding an `https://` URL and hides whatever follows it. The mutation that
proves the difference is a cyber value hidden after an `https://` on the same
line, which the naive version misses.

The rule immediately failed the build on my own cleanup helper, which had to
spell the bad prefix out in order to strip it. It replaces whatever prefix it
finds now. A helper that reintroduced the value it exists to clean up would have
been the fourth instance.

## The importer reported success over an empty file

`csa-slide-embeds-from-csv.js --write` printed `Wrote 152 ids` and left the map
empty. Two faults, and the second is what made the first invisible.

The block pattern required a newline before the closing brace, so it matched a
POPULATED map and missed `const SLIDE_IDS = {};` on one line. That is the only
form a FIRST import ever meets, which is why it survived every dry run and
failed on the one run that mattered.

The guard was `if (next === src)`. It asked whether the FILE changed, and the
`GENERATED_AT` substitution beside it always succeeds, so the file always
differed and the guard always passed.

That is the same shape as the grade-path audit bug fixed the day before: a check
satisfied by something other than the thing it exists to verify. It compares the
ids replacement specifically now, the date is applied afterwards so it cannot
mask anything, and the script re-reads its own output through `require()` and
refuses if the count on disk disagrees with what it believes it wrote.

Verified against the sheet rather than the script: all 152 OK rows read back out
of the config with zero mismatches, and `count()` is 152, so every id in the
config came from the sheet and nothing else is in it.

## The storefront needed two changes, not one

`layout/theme.liquid` loaded the gate asset only on `/pages/ap-csa-lesson-1-`.
Widening that alone would have done nothing, because
`assets/apcs-slides-gate.js` carried its own refusal:

    if (unit !== '1') return null; // Unit 1 pilot only

Its reason was that Units 2-4 were absent from the manifest so mounting would
show a button that could only 404. That reason expired; the concern did not.
`CSA_LESSON_COUNTS` is the CED's own shape, 15 / 12 / 9 / 17, so `2.99` and
`5.1` are still refused. The ceiling moved from the pilot to the course.

Both files now say that neither works without the other, because the next person
to find one in isolation will otherwise fix it and see no effect.

`npm run verify:csa-slides` is new, 20 assertions, and wired into CI as its own
workflow. Writing it caught a real error in the test rather than the code: jsdom
reports `readyState: 'loading'`, so the first draft called `mountAll` directly
and tested a path that never runs on a deferred script. It fires
`DOMContentLoaded` now.

## Evidence

Re-derivable, against live systems:

- `preview()` reported 152 decks across 76 days, matching
  `config/csa-slide-days.json` exactly, including all three per-unit totals
  (48 / 36 / 68).
- `report()` after conversion: 152 rows, 152 OK, 0 failed, 152 unique ids. It
  says in its own output that this is not evidence, so Drive was read directly:
  152 Google Slides files in `AP CSA Slides (converted)`, renamed from the cyber
  prefix at 21:49 with file ids unchanged.
- Production `/api/health` went `f4ca37f` to `6b251f1`. `csa-slide-embeds.js`
  loads to `count() === 152` at the second and `0` at the first.
- `/api/slides/ap-csa/2-1` to an anonymous caller: `locked: true`, `decks: null`,
  no `docs.google.com` anywhere in the body.
- Unit 1 day counts live on `331c792`: `1-1` reports 2 days, `1-5` reports 3,
  `1-6` reports 1.
- The theme change verified on the page itself: `apcs-slides-gate.js` loads on
  `ap-csa-lesson-4-1-ethical-social-issues-data-collection`, which was false
  before the merge, and still loads on `1-1`, so the pilot did not regress.
- `smoke:csaslides` went 38 assertions to 57.

## Still open

- **Board 212 is the only thing between 152 decks and a teacher seeing them.**
  Units 2-4 lesson pages carry a bare `<div id="apcsa-lesson">` with no
  `data-course` and no `data-lesson-id`, and Unit 3 has no wrapper at all.
  Measured live on 2026-09-04 and again after the theme merge. The gate loads on
  those pages now, reads no lesson id, and mounts nothing. Silent rather than
  broken, deliberately, which is what made the theme change safe to land first.
  It ships as a Matrixify sheet from the chat project.
- **Unit 1 is still unconverted**, and converting it is a bigger decision than
  it looks. Its decks were hand-authored before the kit builder existed, so
  running the builder over them would replace content nobody has reviewed. The
  day counts are correct now, so the conversion itself is unblocked; whether to
  do it is not a mechanical call.
- **The seven-day gap** between `COURSE-MATERIALS-INDEX.txt` and the decks on
  disk, above.
- **A latent flake in the auth smoke.** The first class of a run pays a
  cold-path cost and can blow the 8s `navTimeout` on its Block E wrong-PIN
  assertion: 9.86s on one attempt against 1.6 to 2.6s for the other four
  classes. Green on re-run, and green unattended the next day. Warming the login
  path in the test's own warmup, rather than only `/api/health`, would remove it.

## What to take from this

Two of the day's bugs were the same bug: **a check whose condition is satisfied
by something other than what it is checking.** The grade-path audit had four
assertions behind `if (ids.length && ...)` that a refactor made permanently
false. The embeds importer had `if (next === src)` that a date substitution
always defeated. Both suites stayed exactly as green as before. Grep for that
shape in a validator and ask what happens to the branch when the guarded value
is empty.

The other repeated shape is **an adapted script carrying its source's values**.
Three literals from the cyber build shipped in the CSA one, and the third would
have sent the operator to the wrong importer at the exact moment he was deciding
what to run. Fixing instances was not working; the rule is.

And the timing note, because it wasted a check-in: **the cron expressions in this
repo's workflows are not when those workflows run.** `smoke.yml` says
`0 7 * * *` and has actually started between 07:49 and 19:18 over ten days,
clustering near 12:00. Read the run history, never the cron. That also quietly
defeats the reasoning in `nightly-sweep.yml`'s own comment, which spaced itself
an hour after the smoke test to avoid driving the storefront twice in one hour;
in practice they landed 31 minutes apart.
