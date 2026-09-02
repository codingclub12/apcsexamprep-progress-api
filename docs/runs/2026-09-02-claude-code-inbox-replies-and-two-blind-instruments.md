# Inbox replies, and two instruments that could not see what they were asked about

Date: 2026-09-02
Agent: Claude Code (session: m365 inbox review)
Artifacts: PR #465 (merged, 2aff164), PR #466 (open)

## What this session was for

Draft replies to eleven open inbox items. Three teachers had reported platform
breakage in 36 hours and a fourth was circling the same question, so most of the
work turned out to be establishing what was actually broken before writing
anything.

## The short version

Two prior passes reached confident, opposite answers about whether AP Cyber
Unit 1 records scores. Both were wrong, and both were wrong the same way: each
used an instrument that structurally could not observe the thing it was asked
about, then read the instrument's silence as a finding.

The real defect was in neither answer. Scores record fine. The DENOMINATORS are
wrong, and one column disagrees with itself because two live page sets award
different totals for the same activity.

## The two blind instruments

### 1. The health check inner-joins the denominators table

I claimed cyber Unit 1 records fine, on the evidence that `/api/health` lists
eleven reporter-gap activities and none is in cyber Unit 1.

`lib/health-integrity.js`:

    FROM progress p
    JOIN course_denominators d
      ON d.course = p.course AND d.lesson = p.lesson
     AND d.activity_type = p.activity_type

An INNER join. An activity with no authored denominator cannot appear in that
result however broken it is. `scripts/seed-cyber-denominators.js` states in its
own header that twenty activities are deliberately unpriced, fifteen of them in
Unit 1. So "zero cyber Unit 1 rows" is the output that check returns whether
Unit 1 is perfect or wholly broken.

This is a real limitation of a useful check, not a bug in it. Worth knowing
before citing it: **it measures priced activities only, and it is a floor rather
than a total.** The CSP-8MMJ finding below is a case it cannot see at all.

### 2. Counting a theme asset in per-page HTML

The prior pass claimed only Exercise 1 was ever wired to report a score. It
reached that by counting `apcseReportScore` occurrences in fetched page HTML.
The reporter is a theme asset that all 104 cyber activity pages load, not
per-page inlined markup, so that count measures whether a page was hand-patched.
On that measure 103 of 104 pages look broken.

`docs/runs/2026-09-01-claude-code-ap-cyber-verification-checklist.md` had already
retracted this method. The retraction did not propagate to the drafts built on
it, which is the argument for run notes carrying method rather than conclusions.

### The shared shape

Both errors are the same as the near-miss recorded on 2026-09-01, where
`/admin/command` served `login.html` to an anonymous caller and a count of zero
`class="tid"` looked like a failed deploy. The lesson there was stated as
"confirm which page you were served". Generalised: **an absence is only evidence
if the instrument could have shown a presence.** Before reporting a zero, state
what a non-zero would have required.

## What is actually wrong (measured)

From `/api/admin/denominators?course=ap-cybersecurity` and the Teacher Inspector.

Ex2, Lab and Quiz all record. Unit 1 students with a stored score:

    lesson  exercise-1  exercise-2   lab   quiz
    1.1        378          96       152    94
    1.2        149         112        90    54
    1.3        108          87        58     0
    1.4         73          58        26     0
    1.5         16          20         7     0

Seven denominator conflicts, all Unit 1:

    lesson  activity      authored   observed   students   agreement
    1.1     exercise-1        7         14        207        55%
    1.1     exercise-2        8         15         33        66%
    1.4     exercise-1       25         24         73       100%
    1.4     exercise-2       25         24         58       100%
    1.4     lab              30         24         26       100%
    1.5     exercise-1        4         24         16       100%
    1.5     exercise-2        4         24         20       100%
    1.5     lab              30         24          7       100%

Plus `1.3 lab` with `authored: null` and 58 students scored, so that work is
excluded from the points rollup entirely.

**Root cause of the two low-agreement rows.** They split (171 students at 7 vs
207 at 14; 63 at 8 vs 33 at 15). That is the duplicate Unit 1 page sets the seed
script names: `ap-cyber-unit-1-lesson-N-*` alongside
`ap-cybersecurity-unit-1-<topic>-*`. A denominator holds one value per
(course, lesson, activity_type), so one cohort is always graded against the
wrong total. **No denominator can be correct for 1.1 until the pages are
reconciled.** That is a content fix, not a data fix.

Everything here is recoverable. Raw scores are stored and grades recompute at
read time, so correcting a denominator fixes past work with no backfill.

## Found in passing

- **CSP-8MMJ (Peter Vo, P8 AP CSP): 21 students, 19 active this week, zero
  recorded scores.** His other CSP section has seven. Nobody reported this. The
  Teacher Inspector flags it; the health reporter check cannot, having no
  denominators to join against.
- **Manifest hygiene, four items.** Lessons `2.5` and `3.6` are filed under
  `unit-1`; `3.6` is the retired id the Unit 3 renumbering should have removed.
  `3.1`, `3.1a` and `3.1b` all carry separate authored columns. `4.5` exists
  although CED Unit 4 runs 4.1 to 4.4. No student data behind any of them yet.
- **Five board tasks (#102, #104, #105, #143, #145) are `done` with
  `verified: false`,** all asserting Unit 1 scoring is broken. The data says
  scoring works and the denominators do not. A board that says shipped when
  nothing shipped costs the same as an email that says fixed when nothing is
  fixed; this session spent most of its time on exactly that.
- **PR #465 merged `5f3e32c` while `af83fcd` was in flight,** so only the
  pre-resolution half of the drafts file shipped. Same shape as PR #435 in
  CLAUDE.md. Caught by diffing the merged head against the branch rather than
  trusting the merge notification. Recovered by merging main forward, not
  rebasing, and reopening as #466.

## Still open

- **Adopting denominators.** The three 100-percent-agreement conflicts in 1.4
  and 1.5 and the `1.3 lab` proposal of 24 are safe and would correct grades for
  roughly 215 students. `1.1 exercise-1` and `exercise-2` are NOT safe until the
  duplicate pages are reconciled. Nothing was adopted: the seed script's header
  warns that a guessed denominator "silently regrades a class", which makes this
  a human call rather than auto-dispatch.
- **Quizzes score in 1.1 and 1.2 only.** 1.3, 1.4 and 1.5 quizzes have zero
  scored students while their exercise-2 columns have 87, 58 and 20. Distinct
  from the denominator problem.
- **The Gertz PIN gate** still needs a student login in an incognito window.
  Chromium here cannot reach the storefront; the egress proxy resets tunnels to
  `apcsexamprep.com:443` while plain curl to the same host works.

## What was learned

1. **State what a non-zero would have required before reporting a zero.** Both
   failures above pass this test trivially and neither was applied.
2. **A retraction has to travel to the documents built on the retracted claim.**
   The 09-01 checklist retracted the HTML-counting method and the drafts kept
   using its conclusion.
3. **Agreement percentages are a defect detector, not noise.** The 55 and 66
   percent rows were the only signal that two page sets exist. A column that
   disagrees with itself is reporting a content problem.
4. **Do not tell customers their work is unrecoverable without proving it.** A
   cohort-wide disclosure drafted on the retracted premise would have told
   roughly twenty teachers to re-run two weeks of class over a bug that loses
   nothing.

No em-dashes, per repo convention. Pure ASCII. No student names or student-typed
text: per-column counts and teacher-facing figures only.
