# 2026-09-01 - AP Cybersecurity verification checklist (8 claims)

Eight claims were queued for verification ahead of a set of outbound replies.
Every one was checked against a primary source: production `/api/health` and the
deployed code at that commit, the live storefront, the Shopify Admin API, the
command board, and Google Drive. Four of the eight premises did not survive.

Production was serving `405b3d8` throughout the checks, which was `origin/main`
HEAD and the commit checked out here, so "the deployed code" below means code
read directly rather than inferred.

`main` has since advanced to `e9b8153` and production has deployed it. Most of
that delta is unrelated, but `0ccd3c7` and `517f93d` added a reporter-gap
detector to `/api/health` that bears directly on item 1, and item 1 has been
corrected against its live output rather than left as first written. Every other
verdict still holds.

## 1. Does the API record Ex2 / Lab / Quiz at all, or is it display-only?

**Unit 1 records fine. Units 2 through 5 do not. Both halves matter.**

CORRECTED after first writing. This note originally said recording works
everywhere and the only gap was denominators. That was right for Unit 1, which is
what was checked live, and too broad as a general claim. `e9b8153` landed a
reporter-gap detector on `/api/health` a few hours later, and its live read on
production settles it better than my page-by-page check could.

- `snippets/quiz-tracker-wiring.liquid:34` parses the handle for
  `exercise-1|exercise-2|lab|quiz` and sets `window.APCS_PAGE`.
- `assets/apcs-score-reporter.js:52` allows `exercise-1`, `exercise-2`, `lab`.
  Quizzes deliberately route through `apcs-quiz-wiring.js` so nothing is double
  graded.
- Live pages confirm the split: `ap-cyber-unit-1-lesson-1-exercise-2` and
  `-lesson-1-lab` load `apcs-score-reporter`, `-lesson-2-quiz` loads
  `apcs-quiz-wiring`. All three load `apcs-tracker`.
- `score_events` takes a free-text `activity_type`, so nothing is rejected.

So Unit 1's wiring is sound, and the live gap list agrees: production reports
`reporters.ok: false`, 11 activities and 11 completions affected, and **not one
of them is cyber Unit 1**.

    ap-csa            unit-1  1.1  exercise-2
    ap-csa            unit-1  1.2  exercise-3
    ap-csa            unit-1  1.5  exercise-3
    ap-csa            unit-1  1.7  debug
    ap-cybersecurity  unit-2  2.4  exercise-2
    ap-cybersecurity  unit-3  3.1  exercise-1
    ap-cybersecurity  unit-3  3.3  exercise-2
    ap-cybersecurity  unit-4  4.2  exercise-1
    ap-cybersecurity  unit-4  4.3  exercise-1
    ap-cybersecurity  unit-5  5.1  exercise-1
    ap-cybersecurity  unit-5  5.1  lab

Seven cyber rows, all in Units 2 through 5, including one Ex2 and one Lab. Each
is an activity somebody authored a denominator for, that has completions, and
that has never received a score by any of the three paths the gradebook reads.
That is a real reporter gap, not a display problem, and it is the honest answer
to the question as asked: **Ex2 and Lab do lose grades, just not in Unit 1.**

Blast radius is small right now. One completion each, 11 total, which is what
early September looks like before classes ramp.

`docs/reporter-gap-handoff.md` (landed on main in `35c9c76`, after this note) has
since checked each of those eleven against the live storefront and split them
into four problems. Read it before working any of them, rather than treating the
list above as homogeneous. Two of its findings change how the list should be
read:

- The seven cyber rows are two groups, not one. Five pages never score at all;
  two compute a score and never post it, which is the smaller fix.
- Three of the four ap-csa rows have NO PAGE AT ALL. There are zero
  `exercise-3` pages in the entire CSA course, so `1.2` and `1.5 exercise-3`
  cannot be a broken reporter. Somebody authored `course_denominators` rows for
  activities nobody built, and something recorded completions against them.

That third category is neither of the two gaps this item separates. It is a
denominator authored ahead of a page, and it is a stated limit of the health
check: authored, completed and unscored is the signature of a broken page AND of
a phantom activity. The cyber half of the list is unaffected by it.

There is ALSO a separate denominator gap, and the two should not be conflated.
`scripts/seed-cyber-denominators.js` records twenty activities that state no
total in any readable form: fifteen in Unit 1's `ap-cyber-unit-1-lesson-N-*`
page set, plus the five Unit 4 labs. Unpriced work cannot join a points sum, so
it is excluded from the rollup and shown separately as `items_percent_only`. A
student can complete one of those, have the attempt stored, and still see
nothing in the points column.

The distinction is load-bearing, and `517f93d` is the cautionary tale: the
detector's first version gated on "has a denominator" as a proxy for "is graded",
and its first production read returned 362 completions that were almost all
ap-csa lesson visits. It now gates on `isGradedActivity` from
`lib/gradebook-contract.js` instead.

So: two fixes, not one. A reporter for the seven cyber activities above, and a
denominator row for the twenty unpriced ones. Neither substitutes for the other.

Worth knowing where this came from. Per `0ccd3c7`, AP Cyber Ex2, Lab and Quiz
lost grades for a week, and what eventually noticed was a teacher emailing to say
his students' work stopped after Exercise 1. The Unit 1 instance of that is
closed (tasks 102, 104, 105, 143, 145, plus theme PR #92). The Units 2-5 instance
is what the list above is still showing.

## 2. Is task 85 (earned:0 possible:0) still live in prod?

**No. The bleeding symptom is fixed in the deployed commit. The board is stale.**

`lib/admin-gradebook.js:378` now reads:

    if (possibleSum > 0) { overallPct = pct(earnedSum, possibleSum); basis = 'points'; }

and emits `earned: Math.round(earnedSum * 100) / 100, possible: possibleSum`,
not the hardcoded zeroes. Two offline suites assert it, and both pass on the
deployed commit:

- `smoke/gradebook-agreement.js` (26/26): "the admin grade is points based, not
  a mean of percentages", "NOT the 25 a mean of percentages would give", "the
  points pair is populated, not the 0/0 it used to print".
- `smoke/admin-gradebook.js` (58/58).

Blocking task #84 (the 7 missing denominators) is closed.

Two pieces of the original spec are genuinely still open, and neither bleeds:

- `basis` was to be retired (contract rule 5). It survives in
  `lib/admin-gradebook.js` as a labelled `'percent'` fallback, reachable only
  when a class has zero priced items anywhere.
- The three-denominator split is implemented in `lib/gradebook-contract.js`
  (`earned` / `graded` / `possible`, `class_pct = earned/graded`), which serves
  the teacher route and `/gradebook/as-teacher`. `admin-gradebook.js` still
  reports `possible` as the attempted-and-priced sum rather than the whole
  course manifest sum.

Recommend re-scoping 85 to those two items and dropping `bleeding`.

## 3. Are the "Review & unit test" links dead for all 5 units?

**The premise does not hold. No such links exist on that page.**

Parsed every anchor on the live `/pages/ap-cybersecurity-course`. Zero anchors
carry review or unit-test link text for any cyber unit. The only matches on the
whole page are a Teacher Bundle blurb ("4 unit tests, 4 performance tasks") and
an AP CSA Unit Tests Hub link. "Review" otherwise appears only inside Klaviyo
script, testimonial counts ("451 five-star reviews"), and JS comments.

What is there: each of the five units is linked three times (nav pill, status
row, detail card). All five unit pages return HTTP 200.

So nothing is broken. Either the links were never built, or a different surface
is being described. Worth going back and asking which page was meant before
replying.

## 4. Does the gated guided-notes PIN entry accept student input?

**There is no gated AP Cybersecurity guided-notes page to test.**

- Shopify has 35 pages titled "Guided Notes". Every one is AP CSP, and every one
  is `isPublished: true`. None are cyber, none are gated.
- The theme has no PIN gate on notes: `guided` and `notes` do not appear in
  `sections/` or `templates/` at all.
- AP Cyber guided notes are Word documents in Drive (`Day1_Notes_STUDENT.docx` /
  `Day1_Notes_KEY.docx` under each lesson), not a web surface.

The student PIN entry that does exist, on `/pages/join`, is wired correctly:
four numeric PIN inputs, and a payload of `{class_code, display_name, pin}` that
matches `routes/student.js:123` exactly. A live probe with a real class code and
a name that is not on the roster returns `401 {"error":"Name not found in this
class"}`, which means input is accepted and processed all the way to the roster
lookup.

**Not verified:** the requested incognito test as a real student. Chromium in
this session cannot reach the storefront; the egress proxy resets its tunnels to
`apcsexamprep.com:443` (plain curl to the same host is fine). A signed-in
student walkthrough still needs a human on a normal browser.

## 5. Is there any gating or scheduled release for quizzes?

**Gating yes, scheduling no.** The honest answer is not "no", and it is also not
"yes" without a caveat that decides the whole feature.

- `lib/activity-gate.js` plus the `activity_gates` table plus
  `classes.quiz_lock_default`. Per `(class, course, unit, lesson,
  activity_type)`, resolved at read time so a teacher flipping a class re-gates
  everything with no migration. Default-gated types are `quiz` and `exam`.
- Separate from `key_releases`, which controls whether answers come back after a
  submit. All four combinations are real and intended.
- **No scheduled release exists.** `activity_gates` carries `open` and
  `updated_at` and no date column anywhere. Locking is a teacher toggle, not a
  calendar.

The caveat, from `docs/quiz-locking.md`: a lock is only real where the server
hands out the questions. That is now true for Unit 1 and only Unit 1. Live
probes: `1.1` through `1.4` return real server-rendered quizzes with signed
order tokens and `locked:false`. Every lesson sampled in Units 2 through 5
returns `{"error":"No server-scored quiz for this location"}`, meaning the page
body still owns the questions and a gate row there would be theatre that View
Source defeats.

## 6. Where does the Unit 1 3-day lab/project live in Drive?

In **AP Cybersecurity Course > Course_Resources**
(`1kDRuXqDEA8dcsWgtb4wbN42zUdDmSjoI`), which holds exactly three files:

- `Threat_Defense_Report_Rubric.docx` (the Unit 1 project rubric)
- `Pacing_Guide_Full_Year.docx`
- `Pacing_Guide_Block_and_Semester.docx`

Per-lesson lab and exercise material sits under each lesson's `Supplements/`
folder, not at course level.

One decoy worth knowing about. A second, older tree ("Unit 1 - Introduction to
Security", `1oiN6jMPJFJT9Vt-x4rINdTHd_ZfjSV2-`) contains a folder literally named
`Superpack` that is **empty**, plus a stale index doc. That is not where the
content lives. See item 7.

No document explicitly labelled "3-day lab" was found. If that is a distinct
artifact rather than the project rubric plus its pacing, it is not in Drive under
that name.

## 7. Which unit Superpacks exist in shippable form beyond Unit 1?

**All five, and the internal doc that says otherwise is stale.**

In `AP Cybersecurity Course` (`1nVxjKSNwZLUVayeEl8qAGW21IWI8Xl0j`) every unit has
a folder for every CED lesson (1.1-1.5, 2.1-2.4, 3.1-3.5, 4.1-4.4, 5.1-5.6), and
each lesson folder carries the same five children: `Teacher_Guide.docx`,
`Guided_Notes/`, `Quiz/`, `Slide_Decks/`, `Supplements/`. Every unit also has
`_Unit_N_Test_STUDENT.docx` and `_Unit_N_Test_KEY.docx`.

Sampled the leaf files for 1.1, 2.1, 4.1 and 5.1. All four have a real
`Teacher_Guide.docx` (15-20 KB) and populated `Guided_Notes/` and `Quiz/`
(`Day1_Notes_STUDENT/KEY`, `Quiz_STUDENT/KEY`). These are not empty shells.

Depth is not uniform, and this is the honest qualifier:

- Unit 1 lesson 1.1 has Day1 **and** Day2 notes. The Units 2, 4 and 5 lessons
  sampled have Day1 only.
- Slide decks: `config/cyber-slide-manifest.js` covers `1-1..1-5` and `2-1..2-4`
  only. Unit 2 decks were converted 2026-08-27. Units 3 through 5 have no decks
  in the manifest.
- `Unit 3 day splits - 3.3 and 3.4 - FOR REVIEW` was created 2026-08-31, so
  Unit 3 is actively being worked.

**The trap.** The doc a founding teacher opens first, "START HERE - What's Live
& What's Coming" (last modified 2026-06-02), still says:

> Units 2-5 - In progress. Files will appear in those folders as they ship.

That is three months out of date, it understates the product, and it directly
contradicts the sales page. It sits in the old tree next to the empty
`Superpack` folder. Fix it or delete the old tree before pointing anyone at it.

## 8. Cyber checkout URL, and does founding pricing hold through Fri Sept 4?

**Checkout is healthy. The Sept 4 date is wrong, and this is the most
time-critical item on the list.**

Product: `AP Cybersecurity Founding Teacher Bundle - Units 1-5`, ACTIVE, $249.00
with `compareAtPrice` $349.00, SKU `AP-CYBER-FOUNDER-2026`, variant
`48609263222999`, `availableForSale: true`.

- Product page: `https://www.apcsexamprep.com/products/ap-cybersecurity-founding-teacher-bundle` (HTTP 200)
- Direct checkout: `https://www.apcsexamprep.com/cart/48609263222999:1` -> 302
  into a live Shop Pay checkout with a valid token. Works.
- The add-to-cart form is present and not disabled. The "Sold out" and
  "Unavailable" strings on the page are Dawn's hidden template strings, not the
  live button state.

The live product description states the deadline **three separate times**, and
every one of them says September 1, not September 4:

> Founding pricing ends September 1, 2026. After that date the bundle is $349
> direct and $399 through TPT. Purchasing before September 1 locks the founding
> rate for your renewal through the 2027-28 school year.

and in the FAQ:

> Founding pricing of $249 direct and $299 via TPT ends September 1, 2026.

Today is September 1. `CLAUDE.md` also anchors on "the September 1 Cyber offer
deadline". Sept 4 is indeed a Friday, so the day name is not the error; the date
is.

Nothing raises the price automatically, so the checkout will still charge $249
on Sept 4. The exposure runs the other way: a prospect who reads the page after
being told the offer runs to Friday sees copy saying it ended Tuesday.

This needs a decision before the reply goes out, and it is one or the other:

1. Extend the offer. Update the deadline in all three places in the product
   description, via a Matrixify sheet per repo convention.
2. Hold Sept 1. Raise the price today and do not promise Friday to anyone.

## Security finding, not on the checklist

Drive folder sharing on the two cyber trees:

| Folder | Permission |
|---|---|
| `AP Cybersecurity Course` (real delivery tree) | `anyone` : **reader** |
| `Unit 1 - Introduction to Security` (old tree) | `anyone` : **writer** |

The second one is a live problem. Anyone holding that link can edit or delete
the Unit 1 lesson pipeline, its slide decks, and the START HERE doc. It should
be reader at most, and the tree is a stale duplicate anyway.

The first is presumably deliberate link-based delivery, but it does mean the
whole $249 curriculum, every `Quiz_KEY.docx` and `_Unit_N_Test_KEY.docx`
included, is readable by anyone who has or guesses the link. Worth a conscious
decision rather than an inherited default.

## Also observed

Task 144 ("Production /api/health reports commit:unknown") is fixed in prod.
`/api/health` returns a real commit (`405b3d8` during the checks, `e9b8153` by the
end of them) rather than `unknown`. The board still lists it open.

## Environment note

`TODO_KEY` is present in this session's environment. `CLAUDE.md` is explicit that
only `COMMAND_READ_TOKEN` belongs there, because `TODO_KEY` can WRITE to the
ledger and any session can echo an environment variable into its own transcript.
Both were set here. Recommend removing `TODO_KEY` from the Claude Code
environment and rotating it, keeping it in Railway and the Actions secret only.

## Still open

- The incognito student walkthrough in item 4 needs a human browser.
- Item 3 needs the reporter to say which page was meant.
- Item 8 needs a pricing decision today.
