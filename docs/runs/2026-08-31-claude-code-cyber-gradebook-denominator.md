# Cyber gradebook: the denominator was the broken half

Date: 2026-08-31
Agent: Claude Code (task 83, claim 47)

## The short version

The cyber gradebook's arithmetic was already correct. What was wrong was the
number being handed to it. One live lesson page promised a total it did not
serve, and every student on that page was capped below 100 percent with nothing
anywhere reporting a failure.

## What was actually measured, before anything was changed

Fetched all 42 cyber lesson pages from the live storefront (via the pages
sitemap) and compared, per page, the total the page prints against the graded
blocks it actually renders.

**23 pages correct. 1 page wrong. 18 carry no CFU shell** (labs, hubs, unit
landings, study guides: not this check's business).

The one:

```
ap-cybersecurity-unit-1-password-attacks   (lesson 1.2)
  <div class="cfu-block" id="cfu-2" data-answer="C" data-num="2">   <- first block is 2
  ... blocks 2 through 10, nine of them
  grep -c "cfu-1-" => 0                                             <- no cfu-1 on the page
  scoreNum.textContent = state.score + ' / 10';                     <- promises ten
  <span class="cfu-counter">Q 2 of 10</span>                        <- and tells the student so
```

Nine questions, a denominator of ten, and no tenth question to find. **Maximum
achievable grade on that page is 9/10 = 90 percent.** A student who answered
every question correctly was recorded at 90, and against a class
`mastery_threshold` of 90 or above a perfect paper also read as not passing.

Nothing failed to catch this because nothing was looking: the page rendered, the
reporter posted, the API validated, and the gradebook stored and displayed
exactly what it was handed. The percent is the only thing that reaches the
gradebook for a cyber lesson (there is no per-question payload behind it), so a
wrong denominator is not a display bug. It is the grade.

## What was NOT wrong, and is worth recording so it is not re-investigated

- **The rollup.** Board task 85 (points-based three-denominator model) is done
  and in `lib/gradebook-contract.js`. `smoke:contract`, `smoke:gbagree`,
  `smoke:studentagree`, `smoke:cyberlesson`, `smoke:cyberdenoms`,
  `smoke:cyberexams`, `smoke:unitdenoms`, `smoke:casefiles`,
  `smoke:attemptrollup`, `smoke:scoresources`, `smoke:gradepath` and
  `smoke:quiztogradebook` were all run at the start of this session and all
  passed against the code as it stood.
- **Student and teacher disagreeing.** They cannot. `GET /classes/:code/gradebook`
  (`routes/teacher.js:596`) and `GET /api/admin/class/:id/gradebook/as-teacher`
  (`routes/admin.js:1157`) call `buildCanonicalGradebook` with the same
  arguments, and `GET /api/student/progress` prices every cell through
  `contract.denominatorMap` / `contract.lookupDenominator`, the same authority.
  `/pages/my-progress` renders `points_earned` and `points_possible` straight
  off that response. The agreement is structural, not a coincidence to re-verify.
- **The deploy gap.** Railway is serving `1bebfd0` while main is at `ff8409a`,
  29 commits back (board task 142). `git diff 1bebfd0..ff8409a` over
  `lib/gradebook-contract.js`, `routes/teacher.js`, `routes/admin.js`,
  `lib/admin-gradebook.js`, `scoring.js` and `public/gradebook.html` is EMPTY, so
  the gradebook code running in production is the code in this repo. The drift is
  real and still needs fixing; it is not what was wrong with the grades.

## The task 83 diagnosis was stale, and following it would have made things worse

Task 83 says to "make cfuState authoritative and fail loudly instead of falling
back to text scraping", and cites 181 CFU markers on the page.

Both are out of date. The rebuilt page carries 9 blocks, not 181. More
importantly, `window.cfuState` is **not readable on any live cyber shell**: all
three shell families keep their state in a closure (`var cfuState = {...}` at
`ap-cyber-unit-3-lesson-3:4934`, `var state` on the Unit 1 and 2 shells). Making
it authoritative and failing loudly would have stopped every cyber lesson from
reporting a grade at all. The DOM is the only readable source, which is what the
v2 reporter comment already said.

The scraping is not the defect. The number being scraped is.

## What changed

### 1. `lib/cyber-denominator-gate.js` (new)

Pure functions over page HTML: count the graded blocks, read the total the page
will print, report the disagreement.

- `cfu-denominator-mismatch` (**P0**) blocks served != total printed, and the
  detail names the cap a perfect paper hits, because that is the grade.
- `cfu-numbering-gap` (P1) which `data-num` is missing, so an author knows which
  question to restore rather than only that one is gone.
- `cfu-no-denominator` (P1) graded blocks with no readable total at all.

A page whose total is COMPUTED at runtime (`sc + '/' + tot`, the grade-all shells
on unit 4 lesson 5 and all of unit 5) is never failed: a total derived from the
question set cannot disagree with it. The check fires only where a human typed a
number.

### 2. `smoke/cyber-denominator-gate.js` (new, 14 assertions)

Proven in the failing direction on the real 1.2 shape, and proven silent on all
three healthy shell families. Two assertions exist for parser mistakes this repo
has paid for before: a `data-num` outside a cfu-block must not inflate the count,
and `class="cfu-block cfu-eol"` on the last block must not drop it.

Registered as `smoke:cyberdenomgate`. `tests.yml` derives its suite list from
`package.json`, so CI picks it up with no workflow edit.

### 3. `lib/site-crawl.js`

The three kinds registered in `KINDS` with tiers and costs, and `checkPage` calls
the gate for `/pages/` URLs. The nightly site audit now fails on this class of
defect instead of nobody noticing for weeks.

### 4. Theme: `snippets/apcs-grade-reporter.liquid`

`lessonPct()` now grades out of the blocks actually served rather than the
printed total. Split into `gradedPair()` (reads the page's own score, which is
the only thing that knows a half point was awarded) and `lessonPct()` (decides
the denominator).

**One way only, and this is the whole safety argument.** The counted total
replaces the printed one only when it is SMALLER, which can only ever raise a
percentage:

| case | behaviour |
|---|---|
| blocks < printed | the page lost a question: grade out of what is left |
| blocks == printed | every healthy page measured: no change whatsoever |
| blocks > printed | not observed; correcting upward would penalise a student if some blocks are unscored, so the printed total stands |

A miscount in this code cannot cost a student a grade. It is a backstop, not the
fix: the gate above makes the page get fixed.

## Evidence

- Gate run against all 42 real downloaded pages: **fires on 1 page, silent on 23
  healthy ones, skips 18 with no CFU shell.** A detector that fires on everything
  is not a detector.
- `checkPage` end to end on the real 1.2 HTML returns
  `[P0] cfu-denominator-mismatch` and `[P1] cfu-numbering-gap`; the same call on
  `social-engineering` returns zero cfu findings.
- Reporter logic lifted verbatim out of the shipped snippet and exercised over 12
  scenarios, all passing: cyber 1.2 perfect paper now returns **100** where it
  returned 90; every healthy page returns exactly what it returned before; half
  points survive; `blocks > printed` never lowers a grade; degenerate input
  returns `null` or `0`, never `NaN`.
- `smoke:sitecrawl` still passes all 110 assertions.
- The full CI-derived offline suite, **143 suites, all passed.**

## Still open

**The 1.2 page itself is not fixed by this.** The reporter now grades it out of
9, which is correct for the page as served, but the page still tells a student
"Q 2 of 10" nine times and its first check is numbered 2. That is a body import
and belongs in the Matrixify pipeline (chat surface), not here. It needs one of:

1. author the missing CFU 1 and keep the total at 10, or
2. renumber the nine blocks 1 through 9 and change the printed total to 9.

Either satisfies the gate. Until one lands, the nightly site audit will keep
reporting the P0, which is the correct behaviour: the backstop protects the
grade, it does not make the page honest.

Also unchanged and still open: the Railway deploy drift (task 142), and the 10
cyber columns with no authored denominator recorded in
`docs/cyber-denominator-gaps.md`.
