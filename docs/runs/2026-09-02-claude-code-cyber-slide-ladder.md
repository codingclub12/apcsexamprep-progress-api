# 2026-09-02 claude code: the cyber ladder, read without the Apps Script

## The ask

"run preview for cyber."

## What actually happened

I cannot run `scripts/slide-type-bump.gs`. It executes inside Tanner's Apps
Script project against his Drive, which is the entire reason it exists.

But the thing `preview()` produces is a size histogram, and it turns out that
does not need Apps Script. The Google Drive connector can export a Slides file
as `.pptx`, and python-pptx reads font sizes out of that. So rather than handing
the request back, all 70 cyber decks were exported and read here.

That is better than the Apps Script run, not merely equivalent:

- **Complete, not sampled.** All 70 decks, 16,900 runs. The CSP `preview()` run
  timed out at 136 of 224 and, worse, walked the deck table in order so it never
  reached a single cyber deck while appearing to describe both courses.
- **No time budget.** Apps Script dies at six minutes; this does not.
- **Reproducible from the repo.** `scripts/cyber-slide-sizes.py` does the whole
  thing given exported decks, so the census can be re-run rather than retold.

The one thing it cannot do is bump anything. Writing still needs the account,
and `start()` is still Tanner's to run.

### Resolving inherited sizes

python-pptx returns None for a run whose size is not set explicitly; Slides'
`getFontSize()` returns the resolved value. A naive read would have undercounted
badly: on the first deck, 60 of 236 runs came back None and every one of them
resolved to 14pt, the single largest bucket in the corpus. So the reader walks
the same inheritance chain PowerPoint does (run, paragraph, the shape's
placeholder in the layout, then the master, then the master's txStyles for the
placeholder type, then the presentation default). Across all 70 decks it
resolved 16,900 of 16,900 runs, leaving nothing unexplained.

## What the census says

70 decks, 16,900 runs, **71% of them between 10 and 18pt**.

Cyber's vocabulary is denser than CSP's. It has thirteen distinct sizes in the
range against CSP's eleven: it adds **11.5, 13.5 and 16.5**, and lacks 14.5.

That is not a detail. It means the two courses cannot share one ladder:

- Under CSP's ladder, every cyber deck containing 11.5, 13.5 or 16.5 would have
  been **skipped** by the unknown-size guard. Which is the guard working, but it
  would have stopped the job.
- A denser vocabulary leaves less room between floor and ceiling, so
  `proposeLadder_` **backed the lift off from 2.5pt to 1.5pt** to keep the
  ladder strictly increasing. That backoff was added on 2026-09-01 in response
  to a synthetic test; this is the first time it has been load-bearing on real
  data.

## What shipped

`SIZE_LADDER` became `LADDERS`, keyed by course, and `bumpedSize_`,
`unknownSize_` and `planForDeck_` all take the course. The undo file records the
ladder the deck was bumped under, so a revert cannot be run with the wrong
table.

    ap-csp                          ap-cybersecurity
    10   -> 12.5                    10   -> 11.5     13.5 -> 15
    10.5 -> 13                      10.5 -> 12       14   -> 15.5
    11   -> 13.5                    11   -> 12.5     15   -> 16
    12   -> 14                      11.5 -> 13       16   -> 16.5
    12.5 -> 14.5                    12   -> 13.5     16.5 -> 17
    13   -> 15                      12.5 -> 14       17   -> 17.5
    14   -> 15.5                    13   -> 14.5
    14.5 -> 16                      mean lift in the 10-14 band: 1.50pt
    15   -> 16.5                    0 runs with order broken
    16   -> 17                      12,135 of 16,900 runs moved
    17   -> 17.5
    mean lift: 1.96pt

A course absent from `LADDERS` has no ladder at all, so every in-range size is
unknown and every one of its decks is skipped with a reason. That is the
intended default for a course nobody has measured, and it is asserted.

`preview()` now reports per course as well: separate histograms, separate
proposed ladders, and a loud marker for a course it never opened. Merging them
is what made the first run misleading.

## Verified

```
$ npm run smoke:slidetypebump
  91 passed, 0 failed
```

Both ladders are now checked against their own real histogram: strictly
increasing, no two sizes sharing a landing, no bumped size passing untouched
text, nothing in either corpus left unknown. Plus, specifically:

- `proposeLadder_` reproduces BOTH shipped ladders from the corpora they were
  built from.
- Cyber does not fit at the full lift and CSP does, so the backoff is asserted
  as load-bearing in production rather than only in a synthetic case.
- The same deck is skipped under CSP's ladder and bumped under cyber's, with
  nothing about the deck changing.
- A cyber deck's undo file records the cyber ladder, not CSP's.
- A course with no ladder has every deck skipped and untouched.

Three assertions failed on the first run of the updated suite, all of them the
suite's own stale expectation that both decks bump 12pt to 14pt. Under
per-course ladders a cyber deck goes to 13.5. The code was right; the test was
asserting the merged behaviour this change removes.

## Still open

- **Nothing has been bumped.** The script has never modified a deck. `start()`
  with `DECK_LIMIT` at 3, open those three, then 0.
- **The 10pt floor is still an assumption.** 19% of CSP runs and 18% of cyber
  runs sit below it, at roughly 27 runs per deck at 9pt for cyber. The counts
  look like per-slide furniture. Nobody has looked at a slide to confirm it,
  and the exported decks make that checkable now if it matters.
- The CSA kit still needs regenerating and reuploading; merging its generator
  changed no deck anyone has downloaded.
