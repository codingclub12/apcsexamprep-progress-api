# 2026-09-01 claude code: replace the slide type bump's arithmetic with a ladder

## What happened

`scripts/slide-type-bump.gs` shipped on 2026-08-28 with an arithmetic rule:
+2.5 below 11.5pt, +2 below 13, +1.5 up to 14. Tanner ran `preview()` against
the real decks. It read 63,842 text runs out of 136 AP CSP decks and showed the
rule was wrong.

That is the script working as designed. `preview()` exists because nobody has
seen these 294 decks and they cannot be reached from a session; it was written
to be run before anything was touched, and running it is what caught this.
Nothing was ever bumped under the broken rule.

## What the preview showed

56% of all text sits between 10 and 14pt, so this was never a caption
touch-up. And the rule broke the size hierarchy two ways:

**Collisions.** 12.5 + 2 and 13 + 1.5 are both 14.5. So 12.5, 13, and the
untouched 14.5 all landed on 14.5: three tiers flattened into one, 7,900 runs.

**Inversions.** 14 + 1.5 is 15.5, above the untouched 14.5 and 15. Text that
was smaller came out bigger. 11,638 runs, the largest bucket in the corpus.

Together, 18,866 runs, 29% of all text, came out with their relationships
broken.

The cause is structural, not a bad choice of constants. These decks carry a
dense vocabulary in the band (10, 10.5, 11, 12, 12.5, 13, 14: seven sizes
inside four points) and a sparse one above it. A rule that lifts the bottom
more than the top compresses the ladder, so its slope is below 1, and a slope
below 1 on a half-point grid always collides once rounded. No taper expressed
as a function of the size can avoid it.

## What shipped

A ladder: a table over the sizes that actually exist, asserted strictly
increasing.

    10   -> 12.5     12.5 -> 14.5     15 -> 16.5
    10.5 -> 13       13   -> 15       16 -> 17
    11   -> 13.5     14   -> 15.5     17 -> 17.5
    12   -> 14       14.5 -> 16

Against the measured corpus: **0 runs with their order broken**, no two sizes
landing on one, mean lift inside the original 10 to 14 band **1.96pt**, which
is what the broken rule delivered (1.89) without the damage.

`proposeLadder_()` builds it, so it is derived rather than hand-tuned, and a
course with a different vocabulary gets its own ladder from its own preview
run. It tapers the lift from `MAX_LIFT` at the floor to nothing at the ceiling,
then walks upward pushing sizes apart wherever rounding would have collapsed
two onto one.

### The bug the tests found in the generator

The push-apart cascades, and on a dense enough vocabulary it runs the top of
the ladder into the ceiling. The first version handled that by mapping the
saturated size to itself, which puts it BELOW the size beneath it: the exact
inversion the ladder exists to prevent. There is no local repair. So
`buildLadder_` now returns null when a lift does not fit and `proposeLadder_`
backs off a quarter point at a time until one does. The search always
terminates, because a lift of zero maps every size to itself. A vocabulary
packed against the ceiling therefore yields an identity ladder, which reads as
"no room here" rather than inventing headroom.

### Sizes above 14 move, and that is forced

The ladder moves 14.5, 15, 16 and 17, above the 10 to 14 band the change was
scoped to. Not scope creep. If nothing above 14 may move, the whole band is
capped just under 14.5, the 14pt bucket (11,638 runs, 18% of all text) can only
reach 14.25, and the mean band lift falls from 1.96pt to 0.88pt. Order
preservation and a real lift at the top of the band are not both available
unless the sizes immediately above the band move too.

### Unknown sizes are refused

A size inside the range with no ladder entry now SKIPS the whole deck and names
the size in the sheet. Bumping only the sizes the ladder recognises would break
their relationship with the ones it does not, which is the failure the ladder
replaced. `ALLOW_UNKNOWN` relaxes it to "leave the unknown ones alone" for
someone who has looked at a deck first.

### The preview was sampling one course while looking like it sampled both

The deck table lists all 224 CSP decks before the first cyber one, and
`preview()` walked it in order, so the 4.5 minute budget was spent entirely
inside CSP. The histogram above describes AP CSP and nothing else; no cyber
deck was ever opened. `decksInterleaved_()` now round-robins by course, so a
run that stops early stops with a sample of everything it was pointed at, and
`preview()` prints per-course coverage with a loud marker for a course it never
reached.

## The test gap this run also closed

The smoke suite asserted the old rule was "monotonic, so hierarchy is
preserved", using `b(s) >= b(prev)`. That passes for a rule mapping two sizes
onto one, which is precisely what the rule did. Non-decreasing was the wrong
property. The suite now asserts STRICTLY increasing, against the real corpus
rather than invented sizes, plus separately that no two sizes share a landing
and that no bumped size passes an untouched one.

## Verified

```
$ npm run smoke:slidetypebump
  69 passed, 0 failed
```

Covering: the ladder against the 136-deck corpus (strict increase, no shared
landings, no inversions, mean lift); `proposeLadder_` reproducing the shipped
ladder from the corpus it was built from, and staying valid on a denser
vocabulary that does not fit at full lift; unknown-size refusal and
`ALLOW_UNKNOWN`; the apply/revert round trip; the double-bump guards with the
sheet present and deleted; interleaving; and the generated deck table matching
what `routes/slides.js` would serve.

## Still open

- **Nothing has been bumped yet.** The script has still never modified a deck.
  Order is `preview()`, then `start()` with `DECK_LIMIT` at 3, then open those
  three before setting it to 0.
- **Cyber has no ladder.** Run `preview()` with `COURSES = ['ap-cybersecurity']`,
  read the proposed ladder it prints, paste it over `SIZE_LADDER`. Until then,
  any cyber deck using a size CSP does not will be skipped and say so, which is
  the intended behaviour rather than a failure.
- **19% of runs sit under 10pt** (12,436 of them, ~47 per deck at 9pt alone).
  The floor leaves them alone on the assumption they are per-slide furniture,
  which is what the counts look like. That is an inference from counts, not
  from looking. If any of it is body copy it is the least readable text in the
  bundle and the floor is wrong. Opening one deck settles it.
