# The v2 fabricated Cyber zeros: applied

2026-08-26. Applied by Tanner at `2026-08-26T19:37:23.778Z`, scope `v2`, 305 rows reset.

## Why this was still outstanding

`scripts/clear-cyber-fabricated-zeros.js` grew a `v2` scope in #338, for the three
columns that pricing turned from harmless into harmful. Nobody ran it.

The reason is a single line:

```js
const DEFAULT_SCOPE = 'v1';
```

That default is deliberate and it is documented as deliberate: an unqualified call
keeps doing exactly what the first pass did. The cost is that adding a scope is not
the same as applying one, and `v2` sat unapplied for a day while the columns it
covers dragged real grades down. The v1 application has its own run note from
2026-08-25; there was no v2 note because there was no v2 run.

## How it surfaced

Not from an alert. A teacher reported that grades were not showing up, and while
reading the gradebook renders for two of her classes the `1.1 Lab` column in
CYBER-A34J showed a class average of **0 percent** with four students at `0/24`
and nobody above zero. A lab where no student has ever scored is not a lab.

## The dry run corroborated the diagnosis before anything was written

```
found: 308   already_reset: 3   no_progress_row: 0   would_reset: 305
by_column: { "1.1|lab": 99, "1.2|exercise-1": 118, "1.2|exercise-2": 91 }
```

Two of the three match the figures recorded in the script's own header exactly:
118 for `1.2 exercise-1` and 91 for `1.2 exercise-2`. That is the documented
population, not a new one.

`1.1 lab` came in at **99 against a documented 93**, and `already_reset: 3` does
not account for the difference. Six rows are unexplained. Recorded here rather
than rounded off, because the next person to compare these numbers deserves to
know the discrepancy existed.

## What it did NOT touch

`protected_after_cutoff` held **633 rows** across the same three columns:

| column | rows | points |
|---|---|---|
| `1.1 lab` | 115 | 0 to 71 |
| `1.2 exercise-1` | 333 | 0 to 100 |
| `1.2 exercise-2` | 185 | 0 to 100 |

Everything recorded after `2026-08-21T19:52:00Z` is preserved untouched, including
the zeros in it. A post-cutoff zero can be a student who genuinely scored nothing,
and the cutoff is the only thing that separates the two. The non-zero maxima in
that table are the useful signal in the other direction: all three columns report
real scores now, so the 2026-08-21 theme fix worked and this was cleanup of what
it left behind, not a live bug.

## Still open

- **Verify the four students.** The prediction is that CYBER-A34J Students 9 and 11
  move from 45 percent to 100 percent, Student 2 from 33 to 87, Student 5 from 44
  to 65. If they do not move, their zeros were post-cutoff, they are in the
  protected set, and the cause is something else.
- **The six unexplained rows on `1.1 lab`** above.
- **`1.4 exercise-1` carries a `0/25`** for a student scoring 7/7, 8/8, 5/5, 20/24,
  22/30, 5/5 and 30/30 elsewhere. That column is in `v1` and was cleared on
  2026-08-25, so this zero post-dates the cutoff. Worth reading before assuming it
  is real.
- **`DEFAULT_SCOPE` is a trap worth revisiting.** Adding a scope and applying it are
  separate acts, and nothing in the system says an unapplied scope exists. A line
  in the digest, or a health check that counts fabricated zeros by scope, would
  have surfaced this the day it was added rather than a day later via a teacher.
