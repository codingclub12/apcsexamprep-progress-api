# AP Networking lab pages recorded nothing

2026-08-26, Claude Code. Board task 129, claim 33.

## What was wrong

The four AP Networking browser labs graded themselves on screen and posted
nothing. A student finished Device Triage Bench, read `Recorded: 6 out of 8`,
and no row reached `attempts`.

Every side of the contract was already correct except one:

| link in the chain | state |
| --- | --- |
| page carries `data-course` / `data-lesson-id` / `data-item-id` | present on all four |
| page computes a score over its checkpoints | 8 checkpoints each |
| page builds a `{q, sel, ok}` detail array | yes, option indices and booleans only |
| page calls `window.APNET_reportAttempt` | yes, `item_type: 'quiz'`, `max_score: 8` |
| something DEFINES `window.APNET_reportAttempt` there | **no** |
| manifest row `ap-networking / lab-N / quiz / 8` | seeded since 2026-08-17 |

`assets/ap-networking-reporter.js` defines that function. It is loaded by
`snippets/apcs-networking-reporter.liquid`, which gated on handles containing
`ap-networking-lesson-`. That is the shape of the 22 topic lesson pages, and it
was written when they were the only pages that reported. The labs ship under
`ap-networking-lab-{N}-{slug}`.

The widget guards its own call:

```js
if (typeof window.APNET_reportAttempt === 'function') {
  try { window.APNET_reportAttempt({ ... }); }
  catch (e) { /* the gradebook is never allowed to break the lab */ }
}
```

That guard is right, and it is why nothing surfaced. The call was simply never
made. Nothing threw, nothing logged, no 4xx appeared anywhere.

`NET_LABS` in `scripts/seed-manifest.js` has seeded `lab-1` through `lab-4` at 8
points each since 2026-08-17, and the boot seed is insert-or-ignore on every
boot, so the rows have been live that whole time. 32 points of denominator that
no student could earn. In the gradebook that reads as a column of zeros, which
looks exactly like students skipping the labs.

## The correction I had to make mid-investigation

My first reading was wrong and I nearly shipped a worse fix on the strength of
it.

I grepped the lab pages for `apnet:attempt`, the CustomEvent contract named at
the top of the reporter, and found zero. Lesson pages have it. I concluded the
labs emitted no events, that widening the Liquid gate would load a reporter with
nothing to listen to, and that the fix was therefore cosmetic: it would silence
the crawler while grading stayed broken.

That was a real risk and the wrong conclusion. The reporter has two entry points,
and I had only checked one. The second is at the bottom of the file:

```js
// Public API for the full-quiz UI or a custom widget. This path already
// carries a complete score, so it bypasses accumulation entirely.
window.APNET_reportAttempt = function (payload) { postAttempt(payload || {}); };
```

The labs use that one. Reading the whole 32KB inline script rather than grepping
it is what found `doSubmit`. The lesson: an absent signal only means what you
think it means once you have checked every signal the receiver accepts.

## The fix

One line of Liquid, in the theme repo:

```diff
-{%- if page.handle contains 'ap-networking-lesson-' -%}
+{%- if page.handle contains 'ap-networking-lesson-' or page.handle contains 'ap-networking-lab-' -%}
```

Blast radius, simulated against all 1,344 live page handles before pushing:

```
old gate: 22 pages
new gate: 30 pages
no longer matched: none
```

The 8 added are exactly the lab handles. Four are the browser labs. The other
four (`ap-networking-lab-1-4`, `-2-2`, `-3-5`, `-4-3`) are the interactive
terminal labs, which render through `/lab-player.js` and post to
`/api/progress/attempt` themselves. They carry no
`[data-course="ap-networking"]` wrapper and dispatch no `apnet:attempt`, so
`getContext()` returns null and `postAttempt` returns before it builds a body.
There is no path to a double post, and this is asserted rather than assumed.

## What stops it coming back

Two checks, because one of them could not have caught this.

**`smoke/networking-lab-reporter.js`** (`npm run smoke:netlabreporter`, 80
assertions, in CI). Offline. It seeds the real manifest into a throwaway SQLite
file, runs the real reporter asset in a DOM shaped like a lab page, hands it the
exact payload the widget builds, and posts through the real router. So it checks
the whole path from Submit to a row in `attempts`, not a description of it. It
also pins the gate, both directions: matches every lab and lesson handle, matches
none of the hubs, games or exam pages.

Negative control, run before committing: reverting the gate to its old form turns
the suite red on exactly the four lab handles.

**`scripts/verify-networking-reporting.js`** (`npm run verify:netreporting`).
Live, and deliberately not a `smoke:*` script so `tests.yml` does not pick it up
and start driving the storefront on every pull request. It knows nothing about
handle conventions. It walks every AP Networking page in the sitemap and asks one
question: does this page try to report a grade, and is the code that receives
that call on the page? That is the check a fixture cannot be, because the defect
was a new page family shipping under a shape nobody thought to add to the gate.

Run against production before the deploy, it reproduced the defect exactly:

```
  67 pages in the sitemap, 67 read, 0 unreachable
  26 pages report a grade and need ap-networking-reporter.js

  PAGES THAT REPORT AND CANNOT:
    ap-networking-lab-1-device-triage-bench
    ap-networking-lab-2-soho-documentation
    ap-networking-lab-3-segmented-lan-build
    ap-networking-lab-4-capture-and-trace
```

Exit code 1. That output is the before half of the evidence.

## Deployed and verified

Theme PR 84 merged into the connected branch `claude/site-linking-audit-yhufjk`
at `48c3fd1`. Shopify picked it up through the two-way GitHub sync. Verified
against the live storefront rather than against GitHub, per the theme repo's
CLAUDE.md:

```
  ap-networking-lab-1-device-triage-bench      reporter tags: 1
  ap-networking-lab-2-soho-documentation       reporter tags: 1
  ap-networking-lab-3-segmented-lan-build      reporter tags: 1
  ap-networking-lab-4-capture-and-trace        reporter tags: 1
  ap-networking-lab-1-4                        reporter tags: 1
  ap-networking-lab-2-2                        reporter tags: 1
```

The same live check, re-run after the deploy:

```
  67 pages in the sitemap, 67 read, 0 unreachable
  26 pages report a grade and need ap-networking-reporter.js
  4 pages load it without needing it (inert, self-gated on the wrapper)

  Every page that reports a grade loads the reporter.
```

Exit code 0. The 4 inert loads are the terminal labs, exactly the number
predicted before the change, which is the useful part: the prediction and the
measurement were made separately and agree.

What is NOT claimed here: no student has submitted a lab since the deploy, so
there is no `attempts` row from a real browser yet. What is proven is that the
function the widget calls is now defined on the page, and that the identical
payload posts and records through the real router (80 assertions in
`smoke/networking-lab-reporter.js`). The first genuine lab submission is the
last piece of evidence and it belongs to whoever verifies board task 129.

## A trap the harness hit, recorded so the next one does not

The reporter reads `localStorage` unqualified:

```js
try { return localStorage.getItem('apcse_token') || null; } catch (e) { return null; }
```

The first version of the test put `localStorage` on the fake `window` only. In a
`vm` context that makes the bare reference a `ReferenceError`, which the
try/catch swallows, so `getToken()` returned null and `postAttempt` returned
early. Four posts silently did nothing and four assertions failed for a reason
that had nothing to do with the code under test.

The same shape nearly made section 4 meaningless. That section asserts the
reporter is inert with no wrapper, which is what makes it safe to load on the
terminal lab handles. It was passing because there was no token, not because
there was no wrapper. It now supplies a valid token on purpose, so the wrapper is
the only thing left that can be making it inert.

## Still open

~~**The exam pages report nothing at all.**~~ **WITHDRAWN 2026-08-31. This was
wrong, and it was wrong the same way my first reading of the labs was wrong.**

What I wrote: that `exam-midterm`, `exam-practice-pilot`, `exam-final` and
`1-test` through `4-test` are 218 points of denominator with no delivery, and
that the exams need pages that grade.

What is actually true: those seven items are PRINTED instruments, given on
paper, on purpose, and they have a reporting path that was built for them.
`POST /api/teacher/classes/:code/scores` exists for exactly this case, and
`routes/teacher.js` carries the reasoning under OFF-PLATFORM SCORE ENTRY:

>   The printed instruments are the other half of that problem, and un-seeding
>   is the wrong answer for them. The four AP Networking unit tests and the
>   three cumulative exams are real assessments a teacher really administers;
>   they are simply administered on paper. Dropping them from the manifest
>   would keep the denominator honest and leave the single largest block of
>   assessment in the course permanently outside the gradebook. So instead the
>   teacher enters the scores, and the manifest rows become true.

`smoke/teacher-score-entry.js` pins it. I searched only for a student-facing
reporting path, found none, and concluded there was none at all. That is the
identical error to grepping the labs for `apnet:attempt` and concluding they
emitted nothing: checking one entry point and reasoning from its absence.

The second half of the claim was wrong too. An un-entered exam does not mark a
student down. Measured rather than assumed, with a 40-point paper exam
unentered and one 10-point online quiz scored 8:

```
pct: 80    earned: 8    graded: 10    possible: 50
```

`attemptRollup` emits NO cell for an unattempted item, so it renders as not
attempted rather than as a zero, and the grade is `earned / graded` exactly as
docs/gradebook-contract.md requires. The exam lands in `possible`, which is
pace, not grade.

WHAT IS ACTUALLY OPEN, and it is smaller and different: the score-entry API has
no user interface. Nothing in `public/`, `shopify/` or the theme calls
`/api/teacher/classes/:code/scores`. The teacher dashboard
(`shopify/cyber-dashboard.html`, 94KB, live at `/pages/cyber-dashboard`)
mentions the word "scores" exactly once, on an export button. So the route is
built, documented, ownership-checked, rate-limited and tested, and a teacher
can reach it only with curl. The 218 points do sit unfilled in practice; the
reason is a missing last mile, not a missing design.

**`main` and the connected branch have diverged in the theme repo.** `main` is
224 commits ahead but is not a descendant, and its copy of
`assets/ap-networking-reporter.js` is the older one pointing at
`apcsexamprep-progress-api-production.up.railway.app`. Fast-forwarding the
connected branch from `main` today would revert the fix that moved the reporter
to `progress.apcsexamprep.com`, which exists because school content filters block
`*.up.railway.app`. The documented deploy shortcut is currently unsafe, which is
why this change was branched from the connected branch instead. The real fix is
still repointing the theme at `main` in Shopify Admin, which needs a person.
