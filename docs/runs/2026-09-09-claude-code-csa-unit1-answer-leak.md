# CSA Unit 1 is serving its own answer key

2026-09-09, board 295 and 296.

## What is live

Every one of the fifteen AP CSA Unit 1 lesson pages carries the answers to its
own questions in the stored page body. 207 disclosures, and 102 of them sit on
items that report a grade into the gradebook.

```
  pages carrying a readable key: 15 of 60
    lesson     15 of 15 pages, 207 disclosures
    debug      0 of 15 pages, 0 disclosures
    exercise-1 0 of 15 pages, 0 disclosures
    frq        0 of 15 pages, 0 disclosures

  disclosures: 207, of which 102 sit on an item that reports a grade
    mcq-answer-attribute      128
    cloze-answer-attribute    9
    answer-comment            70
```

The 45 debug, exercise-1 and frq pages are clean, and that zero is a result
rather than an absence: those are graded by running Java, so there is no letter
key to leak, and measuring them is what lets the sweep say the problem is the
lesson template rather than the unit.

## The part that changes the fix

The answer is disclosed three separate ways, and only the first is the one
anybody would think to strip:

    data-answer="B"          on the MCQ container. What the client grader reads.
    data-answer="boolean"    on a cloze blank. The answer TEXT, not a letter.
    <!-- Q3: indexOf, answer A -->    an author note that shipped.

Seventy of those comments are live. Delete every attribute and the page still
hands over its key in prose, so a sweep that greps for `data-answer` reports the
page fixed while the whole key is still readable in View Source. That is the same
shape as the mojibake guard reporting this repo clean while four tracked files
were corrupted: the rule was right and its coverage was not.

This is also not a content mistake somebody made on fifteen pages. It is the
template. `lib/csa-lesson-render.js` emits `data-answer`, and
`smoke/csa-lesson-pages.js` section 3 asserts it is there, so the repo currently
has a passing test that would go red if someone fixed the leak. Whoever does the
migration has to change that test on purpose rather than discover it.

## A separate bug the sweep walked into

`ap-csa-lesson-1-9-method-signatures`, item `1.9-cfu-1`, stores its key as a
newline followed by `C`. The page grades with

    var correct = ex.getAttribute('data-answer');
    ...
    feedback.classList.add(chosen === correct ? 'fb-correct' : 'fb-incorrect');

No trim, strict `===`, and the option letters are exactly `A` `B` `C` `D`. So no
option can ever match. Nobody has ever been marked right on that question, the
correct answer is never highlighted afterwards, and `shopify/apcs-reporter.js`
posts 0 out of 1 into the gradebook for every student who answers it. Every
other item on the page is clean, so it is one attribute on one page. Board 296,
and it is probably worth doing before the leak itself because it is one
character and it is currently scoring people wrong.

It was found by accident. The first version of the classifier read the untrimmed
attribute value, filed `"\nC"` as cloze prose because it is not a lone letter,
and the count disagreed with an earlier probe by one. Chasing the discrepancy
instead of rounding it off is the only reason it surfaced.

## These are real gradebook columns, not a theoretical exposure

The 102 graded disclosures land on items the manifest denominates.
`scripts/seed-manifest.js` seeds `1.X-cfu-N` rows at one point each from the
DOM order of the lesson body, and `routes/progress.js` gates
`POST /api/progress/attempt` on `(course, item_id)` existing there, so those
posts are accepted rather than 400'd. The seed's own notes record 56 attempts
against the 1.1 and 1.2 CFUs alone. Students have been scored on questions whose
answers are in the page they were scored on.

## What shipped

- `lib/answer-leak.js`, the detector. Three rules, one door, the same posture as
  `lib/cyber-ek-density.js`: go through the module rather than pasting a pattern,
  because a pasted `data-answer` pattern is precisely what misses the comments.
  It reports what it found and where; it does not decide whether a page is
  allowed to carry a key, since a teacher key page is supposed to have one and
  that is a property of the handle rather than of the markup.
- `smoke/answer-leak.js`, `npm run smoke:answerleak`. 39 cases, offline. CI picks
  it up with no workflow edit because `tests.yml` derives the suite list from
  `package.json`.
- `scripts/measure-csa-unit1-leak.js`, `npm run measure:csau1leak`. Fetches the
  stored body through `lib/storefront-fetch.js`. Not a `smoke:` script on
  purpose: it needs the network, so it must not gate a pull request.
- `docs/evidence/2026-09-09-csa-unit1-answer-leak.json`, the run above. Counts and
  line numbers only, never the disclosed values. This repo is public and a report
  carrying the key would republish it in a second place that outlives the fix.

The fixtures in the smoke suite are invented for the same reason. They are the
live markup shape with made-up questions and made-up keys.

## Evidence

Two independent counts of the attribute channel agree: a throwaway probe that
regexed `data-answer` directly said 137, and the module says 128 MCQ plus 9
cloze. The comment channel has no second count, which is worth saying out loud
rather than implying the whole number is double-checked.

Each of the three rules is mutation tested and goes blind on its own case while
the other two keep firing. The first draft of the comment mutation was hollow:
`/(?!)/ && /real/` returns the real regex because a regex object is truthy, so it
broke nothing and the section would have passed on an unmutated rule. Section 5
caught it, which is the argument for per-rule mutation in one line.

## Still open

- The actual removal. It is step 2 of `docs/quiz-locking.md` for fifteen lessons,
  it is a Matrixify sheet over fifteen live bodies, and it cannot be done by
  deleting attributes: the client grader reads `data-answer`, so stripping it
  without moving the questions server-side turns every CFU into a dead widget.
  Only 1.1 has been through step 2, and only for its mastery quiz, which is why
  1.1 still shows ten disclosures.
- Units 2 through 4 are unmeasured. Same template, so the same leak is likely,
  and `measure:csau1leak` is fifteen slugs away from answering it.
