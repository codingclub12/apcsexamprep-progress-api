# Reporter gap sweep: the eleven on /api/health, causes established

Sweep scope: ONLY the 11 activities in `/api/health` -> `reporters.worst`. No site census.
Read nothing as verified: this session edited no page, opened no PR, marked no task.

## Headline counts (for the next sweep to delta against)

    live health, 2026-09-02 ~20:2xZ, commit 2264d03
      reporters.ok            false
      reporters.activities    11        (unchanged from the 19:54Z reading)
      completions_affected    11        (1 completion each: one walker, not a cohort)
      integrity.ok            true      (code seed: 10/10 intro-java seeded)

    live storefront probes (single threaded, browser UA, 4s sleeps, 0 rate limits hit)
      17 pages fetched, 16x200, 1x404 (ap-csa-lesson-1-1-intro-algorithms-exercise-2)
      cyber activity pages with a `check-btn` CLASS TOKEN:            1 of 11
      cyber activity pages with an id in apcs-score-reporter SCORE_IDS: 7 of 11
      AP Cyber Unit 5 activity pages with a readable score id:        0 of 4
      CSA frq/debug pages carrying apcs-tracker or apcs-score-reporter: 0 of 5
      live CSA page counts from sitemap_pages_1.xml: 53 exercise-1, 53 frq,
        53 debug, 38 exercise-2 (units 2-4 only; Unit 1 has ZERO exercise-2 pages)
      course_denominators prices all 53 CSA lessons for exercise-2 (6 pts)

## Causes, four classes

A. TRACKER COMPLETES WITHOUT A SCORE, BY DESIGN (6 of 11: cyber 2.4 ex2, 3.3 ex2,
   4.2 ex1, 4.3 ex1, 5.1 ex1, 5.1 lab). apcs-tracker.js gradedButtons() selects
   `.check-btn` on elements that can carry `disabled`. These pages use
   `l-check-btn`, `submit-part`, `q-block` etc, zero `check-btn` tokens, so the
   graded path is unreachable and the READING PATH runs: 60s dwell + 80% scroll
   -> markComplete(null) -> POST /api/student/progress {completed:true} with the
   score key OMITTED. A tick for reading.
   A1. And on AP Cyber Unit 5 the score element ids are per page
       (`u5l1ex1-score`, `u5l1lab-final-score`, `u5l2ex1-score`, `u5l3lab-final-score`),
       none of which are in apcs-score-reporter SCORE_IDS, so finishing perfectly
       still transmits nothing. Same class as the `x2scn` miss fixed in Unit 1.
       NEAR MISS TO WATCH: those pages contain the string `score-num`, which IS in
       SCORE_IDS, but as `class="score-num"`. The reporter uses getElementById.
       Any sweep grepping for SCORE_IDS strings will call these pages instrumented.

B. A VISIT COMPLETES A GRADED ACTIVITY (3 of 11: CSA 1.2 ex3, 1.5 ex3, 1.7 debug).
   routes/student.js /track GRADED_ON_ARRIVAL = {exercise-1, exercise-2, lab}.
   `exercise-3` and `debug` are absent, so a bare page view sets completed=1.
   utils.js ACTIVITY_ALIASES {frq: 'exercise-3'} is the resolver: a `-frq` handle
   IS the exercise-3 column, correctly. The frq and debug pages carry no tracker,
   no score reporter, no data-item-id widget and no LESSON_USAGE dispatch, and
   course_manifest holds exercise-* items for CSA 3.1/3.3/3.4 ONLY, so
   /api/progress/attempt would 400 anything Unit 1 posted. No scoring path exists.

C. PRICED WITH NO PAGE (1 of 11: CSA 1.1 exercise-2). 404 live, and no
   ap-csa-lesson-1-*-exercise-2 handle exists in the sitemap. Denominators price
   exercise-2 on all 53 lessons; 38 pages exist. 15 phantom Unit 1 columns.

D. ORPHANED BY THE UNIT 3 RENUMBERING (1 of 11: cyber 3.1 exercise-1). Both
   resolvers (utils.js CYBER_UNIT3_LESSONS and the theme's APCS_CYBER_LESSON)
   map unit-3 lesson-1 to `3.1a`. No code path emits lesson `3.1` any more, so
   that progress row can never receive a score and the alarm row can never clear.
   Production must also hold a stale course_denominators row for 3.1 (the health
   check INNER JOINs it and the repo seed authors only 3.1a/3.1b); the seed is
   INSERT OR IGNORE and never deletes, which is how it survived.

## Instrument blind spots discovered this sweep (add to the standing list)

1. reporterIntegrity() NOT EXISTS probes are course+lesson+activity wide, NOT
   per student. ONE student's score anywhere silences the row for the whole
   class forever. 29 of 30 students losing a score is invisible to it.
2. It INNER JOINs course_denominators, so an unpriced activity cannot appear.
   course_manifest has ZERO ap-cybersecurity rows; cyber pricing is entirely
   course_denominators. Floor, never a total.
3. It cannot distinguish a completion written by a page VISIT (class B) from one
   written by finishing work (class A). Its wording asserts the second.
4. 15 minute cache (REPORTER_TTL_MS), so any reading can be that stale.
5. attempts probe compares a.item_type to p.activity_type. CSA attempts land as
   item_type cfu/quiz, so CSA CFU scoring can never silence an exercise row.
6. game_scores (routes/game.js) is a leaderboard, not a gradebook source, and
   no lib/ reader touches it. Not a fourth score path.
7. Counting the tokens "earned"/"possible" in page HTML measures NOTHING about
   this reporter: apcs-score-reporter.js never looks for those words, it calls
   getElementById over a fixed id list.
8. I cannot execute JavaScript. Every claim above is code + served markup, not
   observed behaviour, and no claim here needed a runtime read.
9. No production DB access this session (local progress.db has 0 progress rows).
   Row ages are therefore unknowable, which is what stops class A being split
   into "student did not finish" vs "finished before APCS_saveLessonScore
   existed on 2026-09-01".
