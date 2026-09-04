# 2026-09-04, claude-code: three red monitors, none of them a real defect

Board #229 and #230, both closed by their own checks going green. PR #527,
merged as `fff1d3c`.

## What was asked, and what turned out to be true

Nothing was asked. This came out of a routine check-in on an unrelated PR, where
the session-start digest carried two board items that had not been there an hour
before: `SMOKE check failing: auth-smoke` and `HEALTH check failing:
nightly-sweep`. Both had actually been failing for days.

Neither was a production defect. Every one of the three signals underneath them
was a test that had gone stale, and one of them was hiding four assertions that
had quietly stopped running. The interesting part of this run is not the fixes,
which are small. It is that the repo's two production monitors had been telling
nobody anything for over a week, and the way each one failed is a shape worth
recognizing again.

## 1. The audit that stopped asking its own question

`scripts/grade-path-audit.js` reported `apcs-score-reporter.js: SCORE_IDS could
not be read` every night. The obvious reading is that the reporter is broken.
The reporter is fine. What changed is its shape: the deployed build stopped
writing an array literal and started assembling the list by name.

    RESULT_IDS=["score-display","r-score","score-num","finalScore","score-val"],
    PROGRESS_IDS=["totalScore","labTotal","foundCount","x2scn","x2score"],
    SCORE_IDS=RESULT_IDS.concat(PROGRESS_IDS)

A regex demanding `SCORE_IDS = [` matches nothing there. That alone is a noisy
false alarm. The damage is the next line down:

    if (ids.length && !ids.includes(id)) { findings.push(`no longer reads #${id}`); }

The four assertions that actually protect a grade were guarded on the list being
non-empty. So from the day that refactor shipped they did not run at all, and
the parse complaint was the only thing left. The audit exists because `labTotal`
once went missing and three labs recorded nothing. If it had gone missing again
in that window, this audit would have said exactly what it said every other
night.

`scoreIds()` resolves the names now. The audit also says two things instead of
one when the list genuinely cannot be read, because a night that has stopped
asking the question must not read like a night that asked and got a good answer.

### The guard and its own test shared one blind spot

Every fixture in `smoke/grade-path-audit.js` was `SCORE_IDS = [ ... ]`, the one
shape the deployed build no longer uses. Guard and test agreed with each other
while neither touched reality. This is the same failure as
`scripts/matrixify-preflight.js` on 2026-09-04, whose mojibake fixture was built
in the same variant as its own hardcoded lead pairs, and the lesson generalizes:
a fixture written from the same understanding as the code it tests inherits that
understanding's blind spots.

Section 3b is therefore a reduction of the LIVE asset, not of the source, and it
carries the retired regex as its own mutation. If that regex ever reads
something from the 3b fixture, the fixture has drifted back to a literal array
and 3b has stopped testing anything.

Mutation tested per rule, each going red only on the rule it targets:

| Mutation | Went red |
|---|---|
| revert `scoreIds` to the retired `= [` regex | 3b resolves / required ids / ordering |
| let `idArrays` accept arrays holding non-literals | non-literal is skipped rather than half-read |
| return the ids de-duplicated and sorted | names resolve in mention order |

Section 3 stayed green under the first, which is what shows 3b tests something
section 3 does not.

## 2. The smoke test asking the product to do something it correctly refuses

`smoke/auth-enrollment.js` registered a single `ZZ-SMOKE <run id>` into all five
disposable classes. Student accounts made (name, PIN) an identity ACROSS courses
on 2026-08-27, and `POST /join` deliberately refuses a second class for a pair it
already knows; the honest door is sign in and `POST /enroll`, which the join page
offers as `add_existing`.

So the first class passed and the other four failed at register, then failed
login and `/me` because the student they were signing in as had never been
created. 32 assertion failures a night. Confirmed against production in both
directions before changing anything:

    same name + PIN, second class  -> 409  {"code":"name_pin_taken","add_existing":true}
    name + " CSA-CQ3G", same class -> 201  created

The sentinel is one per class now, with a length guard, because
`sanitize(display_name, 50)` would truncate a longer class code and put two
classes back on the same name.

**This gives up the one-student-several-courses path**, and that is a real loss.
It deserves its own test: register once, add the rest through `/enroll`, assert
the switcher lists them. Writing it blind while this one was red would have
shipped two broken tests instead of one working one.

## 3. An element that had been renamed

`smoke/teacher-dashboard.js` read `#dash-code`. There is no `#dash-code` on the
live page or in `shopify/cyber-dashboard.html`; the dashboard rework moved the
class code into `#gb-code` and `#gb-share-code`, both written from
`this.classCode`. `textContent` on a selector matching nothing is `''`, so this
failed for all five classes while the dashboard was rendering correctly. Both
ids are tried now, and it still fails if both go missing.

## Evidence

Re-derivable, against live systems, not reports:

- `node scripts/grade-path-audit.js`: was `1 broken, 7 checks passed`, now
  `0 broken, 8 checks passed`, and the eighth line names all ten ids the live
  asset reads, the four required ones among them.
- `npm run smoke:gradepath`: 22 passed, 0 failed, plus the three mutations above.
- Auth Smoke Test run 33875394178: was 32 failures across 5 classes, now
  `conclusion: success`. The teacher dashboard half went from 5 failures to
  `OVERALL: PASS`.
- Overnight board sweep run 33878969668: `conclusion: success`, the first after
  runs 17, 18 and 19 all failed.
- `/api/health` reports commit `fff1d3c`, which was false before the merge.
- Board #229 and #230 both went to `done/closed` on their own, from the checks
  reporting pass. Neither is `verified`, correctly: the session that did the work
  does not get to be the one that says it is true.

One honest note on the first auth run. Attempt 1 came back with a single failure,
`CYBER-Q9JG E/negatives - wrong PIN ... got 'silent'`, at 9.86s against the 8s
`navTimeout`, while the same assertion passed on the other four classes in 1.6 to
2.6s and had passed in run 50 on unchanged code. That is a cold-path timeout on
the first class of the run. One re-run settled it rather than a judgement call.

## Still open

- `shopify/apcs-score-reporter.js` is stale against the deployed asset, 8824
  bytes unminified against 4384 live, and its list is missing `labTotal`. The
  theme repo is canonical and was not attached to this session, so the mirror was
  not edited.
- `/api/health` reports `reporters: {ok: false, activities: 11,
  completions_affected: 11}`, concentrated in `ap-csa` unit-1. Unrelated to all
  three of these and not looked at.
- The cross-course enrollment path has no browser coverage, as above.
- The first-class cold path in the auth smoke is a latent flake. Warming the
  login path rather than only `/api/health` would remove it.

## What to take from this

A monitor that is red for its own reasons is worse than no monitor. By the second
week nobody reads it, and these two are the only things watching whether a
student can sign in and whether graded work reaches the gradebook. Both had been
red long enough to become furniture.

The transferable check is narrower than "test your tests". It is: **an assertion
guarded on a value that another rule computes can stop running without anyone
noticing, because the suite stays exactly as green as it was.** Grep for
`if (x.length && ...)` shapes in a validator and ask what happens to the branch
when `x` is empty. Here the answer was that the only rule anybody would have
acted on had been dead for weeks, and the one still speaking was the one that
did not matter.
