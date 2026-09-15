# The lab that grades you out of the steps you finished

2026-09-15, Claude Code, board 313.

Ten AP Cyber lab pages write their running score like this:

```js
var te=0;for(var k in stepScores)te+=stepScores[k];
var comp=Object.keys(stepScores).length;
document.getElementById('score-display').textContent=te+' / '+(comp*5);
```

Six steps, five points each, so the lab is out of 30. The denominator written
there is five times the steps CHECKED SO FAR. Two steps in, a student who earned
ten sees `10 / 10`.

## It is a grade, not only a display

Read from the asset the storefront actually serves, not from the mirror in
`shopify/`, which says at the top that it is stale and is right about that:

```
apcs-score-reporter.js   RESULT_IDS = ["score-display","r-score","score-num",
                         "finalScore","score-val"], tried in order, first usable
                         pair wins. score-display is first, so the r-score
                         element sitting beside it, which renders te/totalPts
                         correctly, is never reached. A result-tier hit reports
                         IMMEDIATELY, with no settle delay, and every distinct
                         earned:possible pair reports once.

apcs-tracker.js          APCS_saveLessonScore(pct, pair) posts the pair to
                         /api/student/score as item 'score', and posts
                         round(earned/possible*100) to /api/student/progress.
```

So an abandoned run is stored as `(te, 5*comp)`. Two steps of six at full marks
is recorded ten out of ten, at 100 percent, on a thirty point lab, and that
student's column denominator is ten while the student beside them has thirty.

A finished run is correct and always has been: the denominator arrives at 30 on
the last step by itself, and `rollupAggStmt` takes `MAX(points)` over
`MAX(max_points)` per item, so the last pair wins. Only the student who stops
early is misreported. That is why this survived, and it is also the student a
teacher looks at first.

## Board 313 has the mechanism wrong, and the difference matters

The task says these pages post a value over 100, that
`POST /api/student/progress` refuses it, and that a page whose only writer is
that summary therefore records nothing until it is fixed.

That is not what the deployed code does. `parseScore` in the reporter refuses a
pair with `earned > possible`, and `te` is never more than `5*comp`, so nothing
over 100 can leave these pages now. The 483 percent on the live 2.1 Lab column
predates that guard, and I could not reconstruct which version produced it: the
shape that fits is `te + ' / ' + comp` against a reporter with no such guard, but
the page has carried `(comp*5)` since 2026-07-29 and I have no older body to
check. Worth saying plainly rather than repeating a mechanism I could not
reproduce.

What follows from the correction is small and practical: **nothing is waiting to
be recovered once this lands**. The fix stops a wrong grade rather than
restoring a missing one, and the wrong grades already on disk stay until
somebody decides about them, which is board 329.

## What ships

One substitution per page, to a variable the page already declares and already
uses for its results panel:

    te+' / '+(comp*5)   ->   te+' / '+totalPts

Ten pages: unit 2 lessons 1 to 5, unit 3 lessons 1 to 5. Two sheets, one per
unit, five rows each, because MERGE overwrites a live body with no undo.
`docs/runs/2026-09-15-cyber-lab-denominator-runbook.md` is the ordered runbook
and carries the expected end state per step, including the one that reads like a
failure: after the first sheet the check reports 5 of 10 and exits non-zero,
which is correct.

Unit 2 lesson 5 is in the sheet and has no gradebook column, because cyber 2.5
is not a CED topic. It is there because the student reading that page is shown
the same wrong number as everybody else. Unit 3 lesson 6 is in neither sheet: it
already writes `t + ' / ' + TOTAL` and was built from a different template.

## Evidence

`npm run smoke:cyberlabdenom`, twenty rules, all green. Ten are BODY rules,
tested by mutating the live 2.1 Lab body, and each has to produce exactly one
message so a case that trips a neighbouring rule reads as red rather than green.
Ten are SUBSTITUTION rules, which against an index splice cannot fail and would
be decoration if left there, so the substitution is injectable and each one gets
a saboteur of its own.

The section that matters to a student pulls the page's own expression out of the
body and evaluates it, so this is the page's arithmetic rather than a
restatement of it:

```
before: two steps of six at full marks records 100 percent
after:  the same run records 33 percent
before: the student is shown 10 / 10
after:  the student is shown 10 / 30
a finished run records exactly what it recorded before, for every score 0 to 30
```

`npm run rederive:cyberlabdenom`, a second implementation that shares no token
and no handle list with the generator. It sweeps all thirty possible cyber lab
handles, pulls whatever each page assigns to `#score-display`, evaluates it for
two through six finished steps, and calls the page broken when the printed
denominator moves. It reports the same ten pages and fails in both directions.

`node scripts/deploy-gate.js deploy-gates/2026-09-15-cyber-lab-denominator.json --pre`
passes on suite, rederive and mutation. Six mutations, each red on its own named
assertion. The one worth naming is the last: it writes `totalSteps` where
`totalPts` belongs, which is a clean, compiling, single, reversible substitution
that still misreports the student. Every structural check passes it. Only the
section that evaluates the expression catches it, which is the argument for
having that section at all.

Both sheets clear `scripts/matrixify-preflight.js` at five rows each, and the
generator parses its own files back and requires the split to be lossless: same
ten handles across the two sheets, none in both, every cell identical to the row
it built.

## Found on the way, not folded in

**Six unit 5 labs report no grade at all.** Board 328. They render a correct
score into page-scoped ids (`u5l1lab-score`, `u5l1lab-final-score`) and the
reporter only knows ten id names, none of which is theirs. `/api/health`
reporters names `5.1 lab` with a completion and no score, and that is this, not
the denominator bug. Unit 1 lessons 3 to 5 and unit 4 lessons 1 and 5 have the
same shape. It is a page and a reporter not agreeing on a name, and the fix is a
decision between adding a known id to the pages and teaching the reporter a data
attribute.

**The inflated percentages already stored.** Board 329.

## Still open

- **The sheets need a human to import them.** Two files, one import per unit,
  and the second `live` check in the gate cannot pass until they land. It is
  false today by construction: the same command reports 0 of 10 imported right
  now.
- **The reporter still prefers a running total to a final one.** `score-display`
  is first in `RESULT_IDS` on every graded cyber page, not only these ten, so
  any page whose running display disagrees with its results panel has this
  shape available to it. This change fixes the ten pages where that disagreement
  is real. Reordering `RESULT_IDS` so a results-panel element wins would fix the
  class, and it is a theme change touching every graded page, so it wants its own
  measurement rather than riding along here.
