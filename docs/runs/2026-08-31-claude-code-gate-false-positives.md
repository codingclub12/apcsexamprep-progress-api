# The gate cried wolf twice, and both were mine

Date: 2026-08-31
Agent: Claude Code (verifying the 1.2 label import)

## The import worked

`ap-cybersecurity-unit-1-password-attacks` imported at `updatedAt 2026-08-31T19:38:24Z`.
Verified against the live storefront with a cache buster, not against GitHub:

```
counters:    Q 1 of 9 ... Q 9 of 9      (was Q 2 of 10 ... Q 10 of 10)
score spans: 0 / 9  x2                  (was 0 / 10)
tracker:     state.score + ' / 9'       (was ' / 10')
gate:        CLEAN
```

Checking it turned up two false-positive bugs in the gate itself, both introduced
by me earlier today. Neither could corrupt a grade. Both would have destroyed the
gate's usefulness, which is worse in the long run: a P0 that cries wolf gets
switched off, and then the real defect it exists for ships unnoticed again.

## 1. The gate read a number out of a comment. Its own comment.

These checks run on the RENDERED page, which carries theme chrome as well as the
page body. `apcs-grade-reporter.liquid` ships a header comment I wrote this
morning that quotes this very defect, including the literal
`state.score + ' / 10'`, and it renders on every cyber lesson page.

On a page with graded blocks and no tracker of its own, the gate read that
comment as the page's total and reported:

```
cfu-denominator-mismatch: 3 graded blocks but the page reports out of 10,
                          so a perfect paper scores 30 percent
```

Entirely fabricated, at P0, on a page that was fine. It did not fire on 1.2 only
because the real tracker happens to appear earlier in the document than the
snippet.

Fixed by stripping comments before anything is parsed: HTML comments, JS block
comments, and JS line comments anchored to the start of a line so that `https://`
survives. That also covers commented-out widget code on any page, not just the
one snippet that exposed it. `lib/cyber-page-gate.js` strips comments before
counting tags for exactly the same reason.

The alternative was to reword my comment in the theme. Hardening the parser is
the better fix: it needs no live deploy and it protects against the whole class.

## 2. The counter check only knew one of the two label shapes

Cyber writes the question label two ways, both inside the same span:

```
<span class="cfu-counter">Q 2 of 10</span>     unit 1 and 2 lessons
<span class="cfu-counter">1 / 13</span>        unit 3 lessons
```

Reading only the first shape reported "no counters at all" on **twelve** healthy
pages. Widened to read both, scoped to the span. A bare `n / N` is far too common
in prose to match across the page; the span is what makes it unambiguously a
question label, and there is a test pinning that "You scored 2 / 5 on the warm
up" is not read as one.

## 3. Silence is not a lie

With the parser widened, the check still fired on pages carrying NO per-question
counters, of which `ap-cybersecurity-unit-1-ai-cyber-defense` is one: ten graded
blocks, no labels anywhere. That is a design choice, not a defect. Nothing is
claimed, so nothing can be misleading, and the grade is still covered by the
denominator check, which is the one that matters.

`cfu-counter-mismatch` now fires only when labels EXIST and disagree.

## The result: one real, live defect found

Across all 24 cyber pages carrying a CFU shell, the gate now fires on exactly two,
and one of those is the pre-import snapshot of 1.2 on disk. The live finding:

**`ap-cyber-unit-3-lesson-1`**

```
blocks:      10, numbered 1-10
cfuState:    total: 10          <- the GRADE is correct
counters:    1 / 13 ... 10 / 13 <- the student is told there are 13
```

Its grade is right, out of 10. But every label tells a student the lesson has 13
questions, so a student who answers all ten finishes on "10 / 13" and reasonably
concludes they missed three. Same family as the 1.2 defect and the opposite
direction: 1.2 corrupted the grade while looking calm, this one leaves the grade
alone and misinforms the student.

Not fixed here. It is a body import, it needs the same generated-sheet treatment
1.2 got, and it is a separate change from a gate fix. `lib/cyber-cfu-relabel.js`
and `scripts/cyber-cfu-relabel-csv.js` already do the work; the sheet needs
generating, reading and importing by a human.

## Evidence

- Live 1.2, fetched with a cache buster: **CLEAN**, counters 1..9 of 9.
- Full sweep of every cyber page with a CFU shell: **fired on 2, clean on 22**,
  down from 13 firings before these fixes.
- `ap-cyber-unit-3-lesson-1` confirmed on the LIVE page, not from a snapshot.
- `ap-cybersecurity-unit-1-ai-cyber-defense` confirmed CLEAN on the live page.
- `smoke/cyber-denominator-gate.js` now 25 assertions, including that a total
  quoted in a comment is not read, a commented-out block does not inflate the
  count, a URL survives stripping, both label shapes parse, a bare `n / N` in
  prose does not, and a page that labels nothing is silent rather than wrong.
- Full CI-derived offline suite: **144 suites, all passed.**
