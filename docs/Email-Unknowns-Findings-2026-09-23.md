# Email unknowns: findings, 2026-09-23

Answers behind four teacher emails. No customer was emailed. Board task #394.

Kept out of this file on purpose, because this repo is public: class codes,
teacher and student identities, Google Drive and Slides ids (board #211 already
covers bundle ids reaching the public). File names are given so each item can
be found in Drive.

Confidence labels: **live** = observed on the storefront, the progress API or
Drive today. **source** = read in code or files, not observed running.
**not checked** = couldn't reach it.

---

## Task 1. Lesson 1.4 scoring: a correct answer gets 1 of 2 points

**1. Why.** The question is on `/pages/ap-cyber-unit-1-lesson-4-exercise-1`
(Exercise 1, not the lesson page). Its grader awards one point for the correct
option under a "(2 pts)" label, and does the same thing again in Part 3:

    Part 2 Q2  if(tech==='adversarial'){susPts++;  ... "Technique: +1"
    Part 3 Q2  if(c2==='secret'){c1Pts++;          ... "Voice cloning defense: +1"

The cause is a hardcoded `++`. It is not the em-dash or a text match. Parts 2
and 3 can reach only 5 of 6, and the page only 22 of 24. **live**: running the
page's own grader with the best answer to every question gives 12 / 5 / 5
(`node scripts/verify-cyber-points-fix-live.js --before`).

Production agrees. Of 340 students with a /24 score on this page, none has
ever recorded more than 22. **live**, read-only admin score events.

**2. Sweep of all 253 cyber pages.** Every page served 200. The 124 pages with
an inline grader were run in jsdom with every answer correct. **live** unless
marked.

| Page | Defect | Reachable |
|---|---|---|
| 1.4 exercise 1 | the two `++` above | 22 / 24 |
| 1.3 exercise 2, Part 1 | six correct selects add up to 10, part labelled 12, no scaling | 22 / 24 |
| 3.6 exercise 1, Part 2 | only 5 checkboxes are correct, and `min(6,net)+2` caps at 7 | 23 / 24 |
| 5.6 exercise 1, Q6 | a stray `"` in the correct button's `data-fb` drops its onclick, so the right answer can't be clicked | 7 / 8 |
| Unit 5 practice exam, Q31 | same stray quote on the correct option | 39 / 40 |
| 1.4 exercise 2, Part 3 | the reverse: any answer to `p3b-response` gets its 2 points (a constant `+2`), and empty textareas still give 1 each, so a blank Part 3 scores 4 / 6 | over-awards |
| 1.5 exercise 1 | empty `p2-questions` textarea gives 1 point (**source**) | over-awards |
| 5.5 lab, Q2 | stray quote on a wrong option, so it can't be clicked; max unaffected | 6 / 6 |
| 1.1 lab | shows "0 / 24 pts", but the page has no grader, so the score never moves (**source**) | never scores |

Two labels are wrong while the part total still comes out right: 1.3 exercise 2
Part 2 and 1.3 exercise 1 Part 1. Not verifiable this way: server-scored
quizzes, FRQ pages, terminal labs, and lesson checks with no "(N pts)" labels.

**3. Can a teacher override a score? No.** **live**: the teacher dashboard
(`/pages/cyber-dashboard`) says so outright, "Typing a score in by hand is not
available on this course." It offers Reset, which clears the score and gives
the student one fresh attempt, and Grant attempt. The API does have
`POST /api/teacher/classes/:code/scores`, but it writes only to items in
`course_manifest`, and the only AP Cyber manifest rows are visits. Cyber
exercise scores go to a separate ledger (`score_events`) that no teacher path
writes to. **source**, `routes/teacher.js`.

**4. Can saved attempts be regraded? Only partly.** The stored rows carry the
page total and nothing per question (`answers` is null). Nobody can tell from
the data who picked the correct technique option.

- 2,770 saved events on this page, from 356 students in 41 classes (teacher and
  solo), 2026-08-13 to today. 340 students have a /24 score.
- **108 students scored 22.** That is a perfect run under the bug, so each is
  owed exactly +2. This part of a regrade is clean.
- 77 students scored 20 or 21, and 155 below that. Some are owed +1 or +2, but
  which ones can't be settled from totals.
- **John's class:** 7 students attempted, and 2 finished at 22 (owed +2 each).
  The other 5 finished at 15, 17, 18, 19 and 12, and none of those can be
  settled from the data.

**Not done:** no backfill ran. This session holds only the read-only admin
key, a backfill is `NEVER_AUTO`, and the data can't support an exact regrade.
The plan, if Tanner wants it:

1. After the page fix is live, add a correcting `score_events` row (+2) for
   each of the 108 students at 22. Mark the rows with a source tag so the
   change can be reversed exactly by deleting them.
2. For everyone else, the teacher uses Reset on that cell and the student
   re-sits on the fixed page. Reset keeps the earlier attempts in the history.

**Fixed:** `imports/2026-09-23b/cyber-grader-points-fix-pages.csv`, one row
(MERGE). It changes the two `++` into `+=2` and the two "+1" feedback labels
into "+2", and nothing else. The builder proves that by length arithmetic and
an inverse round trip. It also checks for no added non-ASCII, that every script
still compiles, the Matrixify preflight and a CSV parse-back.
`npm run smoke:cyberpointsfix` shows the patched grader reaching 12 / 6 / 6
(32 checks), and it goes red when the fix is broken on purpose. **Not live
yet: the sheet needs importing.** Runbook: `imports/2026-09-23b/RUNBOOK.md`.

**MCQ rewrite (not shipped, needs Tanner's OK).** The correct option runs about
160 characters against 40 to 60 for the others, which gives it away. A parallel
set:

- The attacker had AI tune the email to score just under the block threshold
- The email is legitimate, because any score under the threshold is safe
- The filter malfunctioned and assigned this email a meaningless score
- Mid-range scores are routine and do not call for any follow-up

The Part 3 voice-cloning question on the same page has the same problem: two
options are full sentences with explanations, and two are short.

---

## Task 2. Lesson 1.3 Day 3, slide 2: "sample login pages"

**1. What the slide says.** Deck `AP-CYBER_1-3_Day3_Deck_TEACHER`, slide 2:
"Three captive-portal login pages are on the board. For each one: REAL or FAKE?
Vote, then name the red flag that gave it away." The speaker notes say "Look at
the three portals on the board" and carry no link. The slide has no images. The
student deck and both older versions (June 2 and June 15) are the same. The 1.3
Teacher Guide's Day 3 pacing lists "warmup: real or fake captive portals", but
its Materials list doesn't include them. **live**, read in Drive.

**2. Does the asset exist? No, and it never did.** It isn't in the 1.3 Drive
folders (Supplements, Guided Notes, Exercise 2), a Drive-wide search for
"captive portal" finds only the decks, and the repos don't have it. On the site
(**live**), the lesson page `/pages/ap-cybersecurity-unit-1-wireless-security`,
the 1.3 exercise, lab and quiz pages, and `ap-cybersecurity-evil-twin` all
return 200 with no images and no mention of "portal". Neither does anything in
the sitemap.

**3. Other decks** (all 35 Unit 1-2 teacher decks, slide text and notes; the 55
site links in them were fetched):

- **20 dead exercise links.** The "Your Turn" slides in the 2.2, 2.3 and 2.4
  decks link to exercises 3 to 10 (2.2) and 3 to 8 (2.3 and 2.4). All 20 return
  404, none is in the sitemap, and there's no handout for them. The 2.4 "floor
  plan" exercises are among them. **live**
- The "lesson video" line (see Task 3).
- The 1.2 Day 4 slide 6 notes contain an internal authoring note ("Day 1
  master... re-sync") that a teacher can't act on.
- Unclear: the Scenario 2A "building plans" in 2.2 to 2.4. No plan image is in
  the decks. **not checked** against the College Board scenario.
- The other 35 links work.

**Smallest fix, drafted and not published:**
`docs/drafts/ap-cyber-1-3-sample-login-pages.html`. It is one page with four
Sunshine Coffee login screens: one real, then one each with a certificate
warning, a look-alike domain behind a valid padlock, and a request for social
media credentials. A collapsed teacher key sits underneath. It is pure ASCII,
uses a scoped wrapper, has no script and no form fields, and every mock URL
uses the reserved `.example` domain. Proposed handle
`ap-cyber-unit-1-lesson-3-sample-login-pages`. The deck (teacher and student,
slide 2 and its notes) and the 1.3 Teacher Guide Materials list would then link
to it.

---

## Task 3. "Lesson videos" that don't exist

**1. The quoted header was not found.** "Use with the Lesson Video" and "Fill in
every blank as you watch the video" appear nowhere I could reach. The search
covered 419 files in the 25 cyber lesson folders (including the headers and
footers of 100 guided-notes files), all 431 files in the latest course zip,
Drive full text, both repos and 28 live lesson pages. The actual guided-notes
header is "AP Cybersecurity . Unit N ... | Guided Notes . X.Y Day N". **Ask her
for the file name or a screenshot.** Two older zips (the July 9 cyber zip and a
CSP zip) would not download here, and they are the likeliest place for such a
file.

**2. What she is almost certainly seeing** is on the decks' "Your Turn" slide:
"Prefer self-paced? The lesson video covers this exact material, slide for
slide."

- It is on 64 of the 70 Unit 1-2 decks, student and teacher. Only 1.3 Days 2 to
  4 lack it. The gated Google Slides copies carry it too.
- Four teacher speaker notes repeat it. The 1.3 Day 1 notes add "Keep your
  pencil moving throughout the video."
- Units 3 to 5 decks don't mention a video.
- **source + live** in Drive.

**Do the videos exist? Almost none do.** The YouTube channel has two cyber
lesson videos, 1.1 and 1.2, both from March 2026. They are older than the
decks, so they aren't "slide for slide". The 1.1 video was pulled from its page
as outdated on 2026-09-04. No cyber lesson page embeds a video today. Six pages
show a "Video coming soon" card: 1.5 and five Unit 3 lesson pages. **live**

**Where the wording comes from:** the deck generator in the Drive "Lesson
Pipeline" folder. `render.js` prints "Prefer self-paced?" when a lesson-day's
"Your Turn" slide has a `note`, and the sentence itself sits in each
lesson-day's JSON. The guided-notes builder has no video wording.

**3. AP CSP and AP CSA are clean.** CSP: none of the 333 storefront-served
teacher files mentions a lesson video (student editions not checked). CSA: the
`scripts/csa_kit` generator never writes it, and the sampled notes and pages are
clean.

| Course | Recommendation | Effort |
|---|---|---|
| AP Cyber | (b) replace "the lesson video" with "the lesson page" on the decks and drop the 6 "Video coming soon" cards | About 1 hour if the June generator and lesson JSON can be found (Drive holds only some of them), otherwise 2 to 3 hours of scripted deck edits. Then re-convert the gated Slides, and regenerate `config/cyber-slide-embeds.js` if the ids change. About 1 hour for the page cards. Guided notes need nothing. |
| AP CSP | nothing | 0 |
| AP CSA | nothing | 0 |

---

## Task 4. A combined superpack PDF for Units 2-5

**1. Only Unit 1 has one.**

- `AP_Cybersecurity_Unit_1_Teacher_Superpack.pdf` on the Shopify CDN returns
  200. It is 294 pages: master index, both pacing guides, and for each lesson
  the Teacher Guide, Guided Notes, Exercises 1 and 2 with keys, Discussion, and
  Bell Ringer + Quiz, followed by the unit test, its key and the project rubric.
- The same file name for Units 2 to 5 returns 404, and Drive has no such PDF.
- The Drive `Superpack` folder in the old tree is empty.
- The delivery folder `AP Cybersecurity Course` holds Units 1 to 5 as separate
  .docx and .pptx files: Teacher Guide, day-by-day guided notes (student and
  key), quiz and key, exercises and keys, discussion, lesson map and decks for
  every lesson, plus a unit test and key per unit.
- **live**

**2. What was promised.** The "July 1" is real, and it comes from Klaviyo
template "AP Cyber Founding Teacher Cohort - Welcome v2" (updated 2026-05-20)
and the 2026-05-19 pricing email: "Unit 1 (46 documents) delivered immediately.
Units 2-5 delivered July 1, 2026 - before your first day of school." The same
welcome email also says "Units 2 and 3 drop this summer. Units 4 and 5 in the
fall."

- **Live product page** (`/products/ap-cybersecurity-founding-teacher-bundle`):
  "All five unit Superpacks, all slide decks, both pacing guides, and the
  project rubric are finished and delivered on purchase." and "Everything above
  is finished and live."
- **Access-code email** (Klaviyo "AP Cyber Founding Teacher - Access Code"):
  "Units 2 through 5 unlock instantly ... Materials open in Google Drive."
- **No source promises a combined PDF for Units 2 to 5.** "Superpack" was
  defined as "46 documents", and those documents exist for every unit.
- A stale Drive doc, `START HERE - What's Live & What's Coming` (June 2), still
  says "Units 2-5 - In progress".
- **live**

**3. Building one for Unit 2.** Neither repo has a superpack pipeline, but every
input is in Drive and the tools to build it (LibreOffice, PyMuPDF) run here. The
job is to convert each document, merge them, add a new cover, index and
bookmarks, and then parse the result back against the file list.

What Unit 2 is missing: a new cover and index (Unit 1's use outdated framing), a
separate bell-ringer file, and a Unit 2 project rubric. The corrupt 2.1 quiz
duplicates (board #320) must be skipped.

Effort: about half a day to a day of agent time for the pipeline plus Unit 2,
then 1 to 2 hours for each later unit, and a human read-through of each PDF. Unit
2 will run about 300 to 450 pages, because its notes are per day.

---

## What still needs Tanner

- [ ] Import `imports/2026-09-23b/cyber-grader-points-fix-pages.csv` (runbook
      in the same folder), then run the live check.
- [ ] Approve or edit the parallel MCQ option set for 1.4 exercise 1 (Task 1).
- [ ] Regrade decision: the clean +2 for the 108 students at 22 needs the full
      admin key, and it is a backfill. Everyone else is teacher Reset.
- [ ] Say which sweep hits to fix next. The two stray-quote pages (5.6 exercise
      1, Unit 5 practice exam) are mechanical. 1.3 exercise 2, 3.6 exercise 1
      and 1.4 exercise 2 need a scoring decision.
- [ ] Approve the sample login page draft, then the deck and Teacher Guide
      edits.
- [ ] Decide on the 20 dead Unit 2 exercise links: build the pages or remove
      the rows. First check Shopify Admin for unpublished pages under other
      handles.
- [ ] Check Shopify Admin for an unpublished captive-portal page.
- [ ] Ask the Palm Beach teacher for the file that carries the "Use with the
      Lesson Video" header.
- [ ] Deck wording, option (b) for AP Cyber. Find the June generator and lesson
      JSON first, probably in the Claude chat project.
- [ ] Order-confirmation text in Shopify Admin > Settings > Notifications (not
      readable through the API).
- [ ] Which welcome email the Xavier teacher got, and whether she has redeemed
      an access code. If she has, Unit 2 is already in her Drive as files.
- [ ] Whether combined PDFs per unit are worth promising at all.
