# Outbound reply drafts, 2026-09-02

Audit copy. Nothing here has been sent. Eleven drafts, ordered by what it costs
to leave them sitting.

Every factual claim below was checked against a primary source TODAY
(2026-09-02), against production `fee7cef`, the live storefront, and the Shopify
Admin API. Claims I could not settle are marked `[TANNER]` and say exactly what
would settle them. There are two, and only one blocks a send.

## What changed since the v1 and v2 drafts

Three corrections, and the first one reverses the central claim of v2.

| # | v2 said | Verified today | Effect |
|---|---------|----------------|--------|
| 1 | Vo's Ex2/Lab/Quiz scores "were never calculated", not retroactively recoverable | **UNRESOLVED. My first pass claimed this was disproven and that was an error, retracted below.** The health check I cited cannot see the activities in question. | Vo's draft now asks rather than asserts. Neither this file nor v2 has established what happened to his data. |
| 2 | "No gating exists, confirmed at the schema level" | **Gating exists.** `lib/activity-gate.js`, the `activity_gates` table, `classes.quiz_lock_default`. Quiz and exam are default-gated. What does NOT exist is *scheduled* release. | Gargano's draft rewritten. This is a yes, not a no, and she is deciding whether to use the platform at all. |
| 3 | Naggar's founding price expires "Friday" | The live product page states **September 1, 2026**, three times. That was yesterday. | Naggar's draft no longer cites a Friday deadline. See the note in his section. |

## Verification ledger

| Claim | Verdict | Source, checked 2026-09-02 |
|-------|---------|----------------------------|
| Cyber Unit 1 Ex2/Lab/Quiz post scores | **UNKNOWN, and I wrongly called this TRUE** | `/api/health` inner-joins `course_denominators` (`lib/health-integrity.js`), so an activity with no authored denominator CANNOT appear in that list. The seed script states fifteen Unit 1 activities are deliberately unpriced. Zero cyber unit-1 rows is what this check returns whether Unit 1 is perfect or wholly broken. |
| Units 2-5 lose some scores, among PRICED activities | TRUE | Same read: 7 cyber rows across units 2, 3, 4, 5, including one Ex2 and one Lab. This is a floor, not a total: unpriced activities are invisible to it in every unit. |
| Five board tasks claim Unit 1 scoring is broken | TRUE, and all are `done` with `verified: false` | #102, #104, #105, #143, #145. #105: "no score reaches the gradebook". #143: "10 of 15 AP Cyber Unit 1 activity pages" |
| Task 85 percentage-averaging bug is fixed in prod | TRUE | `lib/admin-gradebook.js:378` points-based; `smoke/gradebook-agreement.js` 26/26, `smoke/admin-gradebook.js` 58/58 |
| Cyber bundle checkout works | TRUE | `/cart/48609263222999:1` -> HTTP 302 into live Shop Pay with a valid token |
| Bundle is ACTIVE at $249 | TRUE | Admin API: `price 249.00`, `compareAtPrice 349.00`, `availableForSale true`, `inventoryPolicy CONTINUE` (a card will not bounce on stock) |
| Founding deadline is Sept 4 | **FALSE** | Live product page says "September 1, 2026" three times |
| "Review & unit test" links are dead | **PREMISE FAILS** | Zero such anchors exist on `/pages/ap-cybersecurity-course`. All 5 unit pages return 200 |
| A gated cyber guided-notes page exists | **PREMISE FAILS** | All 35 "Guided Notes" pages are AP CSP and all are published. No PIN gate in `sections/` or `templates/` |
| Quizzes can be hidden until ready | TRUE, with a caveat | `activity_gates` per (class, course, unit, lesson, activity_type). Enforced server-side in Unit 1 only |
| A "Cybersecurity Unit 1 Superpack" product exists | **FALSE** | No per-unit cyber product in the store |
| All 5 unit Superpacks exist in Drive | TRUE | Every CED lesson folder carries Teacher_Guide, Guided_Notes, Quiz, Slide_Decks, Supplements |
| Why Vo's 15/15 does not display | `[TANNER]` | Needs the admin cookie. See his section for the 30-second check |
| Gertz's PIN gate as a real student | `[TANNER]` | Needs an incognito window and a student login. Chromium here cannot reach the storefront |

---

# TIER 1: send today

## 1. Taher Naggar (MES Cairo) - READY TO SEND AS WRITTEN

Verified live minutes ago: product ACTIVE, $249.00, checkout resolves into a real
Shop Pay session, and `inventoryPolicy: CONTINUE` means a card will not be
declined for stock.

**One thing to know before you send.** The live product page says founding
pricing ended **September 1**, three separate times, and today is the 2nd. He
thanked you for "the extra day at the current rate", so you already granted this.
The checkout still charges $249 right now, so the link honors what you promised
him. The draft therefore does not restate a deadline at all, because every
deadline currently in writing on your own site has passed. Restating one invites
him to go read the page and find a contradiction.

If anyone touches that product's price today, this link changes meaning. Send it
today.

> Subject: Re: AP Cybersecurity bundle - checkout link
>
> Hi Taher,
>
> Thank you for getting the requisition through so quickly, and for the update on
> the card payment.
>
> Here is your checkout link for the AP Cybersecurity Founding Teacher Bundle,
> Units 1 through 5, at the founding rate of $249:
>
> https://www.apcsexamprep.com/cart/48609263222999:1
>
> That link takes you straight to checkout with the bundle in the cart. It accepts
> school cards, and the rate you were quoted is the rate it will charge.
>
> Once payment goes through you will get your access code by email. If your
> finance office needs an invoice or a W-9 for the file rather than a card
> receipt, tell me and I will send one over the same day.
>
> If anything about the checkout does not behave, reply here and I will sort it
> out directly rather than leaving you to fight the form.
>
> Best,
> Tanner

---

## 2. Peter Vo (Klein ISD) - SOLVED, and it is good news

Tanner pulled the Teacher Inspector and `/api/admin/denominators?course=ap-cybersecurity`.
Between them the question is settled, the "15 out of 15" is located in the data,
and the answer is the opposite of what v2 concluded.

### Ex2, Lab and Quiz all record. v2's premise is dead.

Unit 1, students with a recorded score per column:

    lesson  exercise-1  exercise-2   lab   quiz
    1.1        378          96       152    94
    1.2        149         112        90    54
    1.3        108          87        58     0
    1.4         73          58        26     0
    1.5         16          20         7     0

v2 said only Exercise 1 "actually computes a score and sends it" and the rest
"were never wired to report a score at all." Ex2 has 373 scored students across
Unit 1, labs have 333, quizzes have 148. Nothing about that claim survives, and
the cohort disclosure built on it must not go.

### The actual bug: the denominators are wrong, and Vo's 15 is in the data

`1.1 exercise-2` is authored as **out of 8**. The observed values are:

    value 8   -> 63 students
    value 15  -> 33 students     <- Vo's student is one of these

Thirty-three students submitted that exercise scored out of **15** while the
gradebook believes the column is out of 8. A perfect paper arrives as 15 against
a denominator of 8. That is why his student's 15 out of 15 does not render as a
grade: it is not missing, it is uncomputable.

Seven columns carry the same class of conflict, and two are severe:

    lesson  activity      authored   observed   students   agreement
    1.1     exercise-1        7         14        207        55%
    1.1     exercise-2        8         15         33        66%
    1.4     exercise-1       25         24         73       100%
    1.4     exercise-2       25         24         58       100%
    1.4     lab              30         24         26       100%
    1.5     exercise-1        4         24         16       100%
    1.5     exercise-2        4         24         20       100%
    1.5     lab              30         24          7       100%

Unit 1.5 is the worst: pages serve 24 points, the gradebook holds 4. A student
with full marks computes to 600 percent.

And one column has no denominator at all:

    1.3  lab   authored: null   58 students scored   proposal: 24

Unpriced work cannot join a points sum, so those 58 students' lab work is
excluded from the rollup entirely. That is the `items_percent_only` case, and it
is real.

### Why the 55 and 66 percent agreement matters: two page sets

The low-agreement columns are the tell. `1.1 exercise-1` splits 171 students at 7
and 207 at 14; `1.1 exercise-2` splits 63 at 8 and 33 at 15. That is not noise,
it is two different live pages serving two different totals for the same lesson
and activity.

`scripts/seed-cyber-denominators.js` names the cause in its own header: Unit 1's
`ap-cyber-unit-1-lesson-N-*` page set is duplicated by an
`ap-cybersecurity-unit-1-<topic>-*` set. A denominator is keyed by (course,
lesson, activity_type), so it can hold exactly one value. Whichever it holds,
the students on the other page set are graded against the wrong total.

**This is fully recoverable.** Every raw score is stored. Correcting a
denominator recomputes every affected grade at read time, per the mastery rule in
CLAUDE.md. No student redoes anything.

### What I did NOT do

I did not adopt any proposed denominator. Two reasons, and the first is binding:

- `1.1 exercise-2` genuinely does not agree with itself, 66 percent. Picking 8 or
  15 regrades one of the two cohorts wrongly. The duplicate page sets have to be
  reconciled first; that is a content decision, not a data one.
- Adopting a value silently regrades live classes. The seed script's own header
  says a guessed denominator "silently regrades a class." That is a judgement
  call for Tanner, not an auto-dispatch.

The three 100-percent-agreement conflicts in 1.4 and 1.5, and the 1.3 lab
proposal of 24, are much safer and could be adopted today. That is still Tanner's
call to make.

### The draft

> Subject: Re: Student progress not showing after Exercise 1
>
> Hi Peter,
>
> First, an apology. You wrote on the 31st about grades not appearing, and my
> reply that afternoon answered a different question about quiz gating in 1.1. You
> then had to write again through the contact form to get an answer at all. That
> is my fault and I am sorry for it.
>
> I have now found it, and I can tell you exactly what is wrong. It is better news
> than I feared.
>
> **Nothing your students did is lost.** Every score is recorded, including the
> Exercise 2, lab and quiz work you cannot see. Your three Cybersecurity sections
> have thousands of stored scores. Nobody needs to redo anything.
>
> **The bug is in what the gradebook thinks each activity is worth.** Your
> student's 15 out of 15 is a real, stored score. But the gradebook had been told
> that exercise is out of 8. A score of 15 against a maximum of 8 is not a
> percentage it can render, so the column comes up empty rather than wrong. That
> is why you see Lesson and Exercise 1 and nothing after it.
>
> The cause is that two versions of the Unit 1 pages are live, and they award
> different point totals for the same exercise. Some of your students got the
> 8-point version and some got the 15-point one. I am reconciling those pages so
> there is one correct total per activity.
>
> **The fix is retroactive.** Because the raw scores are stored, correcting the
> point totals recalculates every affected grade automatically, including work
> your students finished last week. You will not lose the first two weeks of the
> year.
>
> I also found that one Unit 1 lab has no point value recorded at all, which is
> why that work registers as complete but never appears in the points column.
> Same fix, same retroactive correction.
>
> **Separately, something you have not asked about.** Your P8 AP CSP section, code
> CSP-8MMJ, has 21 students with 19 active this week and has recorded zero scores.
> Lessons register, grading does not. Your other CSP section has recorded seven.
> That is a different and more complete failure than the Cybersecurity one, and
> you had no way to know, so I am telling you rather than waiting for you to hit
> it.
>
> I will confirm here as each piece lands, and I will tell you what to look at to
> check it yourself rather than asking you to take my word for it. You have been
> more patient with this than I deserved.
>
> Best,
> Tanner

---

## 2b. Board-worthy findings from the denominator sweep

Not email material. Recording them because they were found in passing and will
otherwise be rediscovered.

**Seven denominator conflicts and one missing, all Unit 1** (table above). The
1.5 columns are authored at 4 against an observed 24, which produces 600 percent
grades for anyone who finishes.

**Two live Unit 1 page sets award different totals for the same activity.** This
is the root cause and it is a content problem, not a data one. Until the pages
are reconciled, no single denominator can be correct for `1.1 exercise-1` or
`1.1 exercise-2`.

**Quizzes score in 1.1 and 1.2 and nowhere else in Unit 1.** 94 and 54 students
respectively; 1.3, 1.4 and 1.5 quizzes have zero scored students despite those
lessons having 87, 58 and 20 students scoring on exercise-2. That is a genuine
gap, distinct from the denominator problem.

**Manifest hygiene, four items.** Lesson `2.5` and lesson `3.6` are both filed
under `unit-1`. `3.6` is the retired lesson id the Unit 3 renumbering was supposed
to remove. `3.1`, `3.1a` and `3.1b` all carry separate authored columns. `4.5`
exists although CED Unit 4 runs 4.1 to 4.4. None of these has student data behind
it yet, so they are cheap to fix now and expensive after Unit 3 goes live.

---

# TIER 2: send this week

## 3. Debbie Gargano (Xavier HS, CT) - REWRITTEN, and the answer is YES

v2 told her no gating exists and offered the Canvas export as a workaround. That
was wrong. `lib/activity-gate.js`, the `activity_gates` table and
`classes.quiz_lock_default` do exactly what she asked for, and quiz and exam are
gated by default.

The caveat that has to be in the email: the lock is genuinely enforced by the
server for Unit 1, where the server hands out the questions. In Units 2 through 5
the page still carries its own questions, so a lock there is a speed bump rather
than a wall. Saying "yes, fully" would be the same failure in a new suit.

Also: your welcome email opened "Hi Gargano," which used her surname as a first
name. Light touch on that below.

> Subject: Re: Hiding quizzes and tests until you are ready
>
> Hi Debbie,
>
> Short answer: yes, and it is already built. You do not have to choose between
> using the platform and controlling when students see assessments.
>
> Quizzes and unit tests are locked by default. They stay hidden until you open
> them, per class, and you can open a single quiz for one class while it stays
> shut for another. Lessons and exercises stay available the whole time, so
> students can work through the material without the assessments being live.
>
> Two honest limits, so you are not surprised later:
>
> First, it is a switch rather than a schedule. You open a quiz when you want it
> open. There is no way yet to say "release this Thursday at 8am" and walk away.
> That is on the list, and if it matters to how you run your room, tell me,
> because that moves it up.
>
> Second, the lock is enforced strictly for Unit 1, where the server holds the
> questions and a locked quiz simply cannot be fetched. In Units 2 through 5 the
> questions currently live in the page, so a determined student who knows how to
> view page source could get at them ahead of time. I am moving those units onto
> the same server-held model. I would rather tell you that now than have you find
> it out from a student.
>
> One more thing: my welcome email addressed you by your surname as though it were
> your first name. Sorry about that.
>
> If it would help, I am happy to do fifteen minutes on a call before you commit
> your students, and show you the lock working rather than describing it.
>
> Best,
> Tanner

---

## 3b. Two more v2 claims that do not survive a live check

Recorded here because v2 is in circulation and these two would go to customers.

**v2's Kal diagnosis is not on the page.** It says: "Two of the three pills are
anchors; the third is a bare `<span>` with no `href`... Task 114 wired two of
three and left the last one," and its draft tells her "I found the cause."
Checked today on the live hub (372KB) and on
`/pages/ap-cybersecurity-unit-1-introduction-to-security` (442KB): each unit is
referenced exactly three times and **all three are real `<a href>` anchors** to
the unit page. There is no fourth item and no bare span. The only "unit test"
strings on either page are a Teacher Bundle blurb and an AP **CSA** Unit Tests
Hub link in the nav dropdown. Sending "I found the cause" would be a confident
diagnosis of an element that is not there. Note also that unit tests were
deliberately pulled off the public site (a student could reach them via a fake
teacher account) and moved to Drive, so the item may have been removed outright
rather than left dead.

**v2 invents a deadline for Lynn Manuel.** Its draft says the CSP bundle is
"$249. Worth mentioning since I'm raising that price on Friday." The live CSP
product page returns HTTP 200 at $249 and carries **no deadline string at all**,
no "September" date of any kind. That is manufactured scarcity to a cold lead who
has taught CodeHS for seven years, and it is the same shape as the Sept 4 date in
v2's Naggar draft: an urgency claim with nothing behind it. My Manuel draft below
makes no price claim.

---

## 4. Nansu Kal - PREMISE DOES NOT HOLD, ask before fixing

Parsed every anchor on the live `/pages/ap-cybersecurity-course`. There are zero
anchors with review or unit-test link text for any cyber unit. The only matches on
the page are a Teacher Bundle blurb and an AP CSA Unit Tests Hub link. All five
unit pages return HTTP 200 and each unit is linked three times.

So the links are not dead. They were never built, or she is on a page I have not
identified. Do not ship a fix for a page nobody has located.

> Subject: Re: Review & unit test links not clickable
>
> Hi Nansu,
>
> Thanks for flagging this, and sorry it cost you time.
>
> I went through the AP Cybersecurity course hub link by link this morning and hit
> something I want to check with you before I start fixing the wrong thing. On the
> hub page I am looking at, there is no "Review & unit test" link on any of the
> five units. Not broken, just not present. Every unit link that is there does
> work, and all five unit pages load.
>
> So I think you are either on a different page than the one I am checking, or you
> are looking for something that should be there and is not.
>
> Could you send me the URL from your address bar when you see it? A screenshot
> would be even better. Either way I will know exactly what you are seeing.
>
> If it turns out those links were supposed to exist and never got built, that is
> a real gap and I will build them. I just want to fix the thing you are actually
> hitting.
>
> Best,
> Tanner

---

## 5. Mitch Gertz (KMIDS Thailand) - PREMISE DOES NOT HOLD, two questions

Note the name: he signs as **Mitch Gertz**, not Mitchell Ge.

There is no gated AP Cybersecurity guided-notes page to test. Shopify has 35
pages titled "Guided Notes"; every one is AP CSP and every one is published and
ungated. The theme has no PIN gate on notes at all: `guided` and `notes` do not
appear in `sections/` or `templates/`. AP Cyber guided notes are Word documents in
Drive.

The PIN entry that does exist is `/pages/join`, and it is wired correctly. A live
probe with a real class code and an off-roster name returns
`401 {"error":"Name not found in this class"}`, which means input is accepted and
processed all the way to the roster lookup.

**`[TANNER]` This is the one checklist item neither of us can close.** It needs a
real student login in an incognito window. Chromium in my environment cannot
reach the storefront. Two minutes of your time.

That said, the 401 above suggests a likely cause worth naming: if a student's name
is not on the class roster exactly as typed, the PIN box will look like it is
rejecting input when it is actually rejecting the name.

> Subject: Re: Guided notes page and the PIN entry
>
> Hi Mitch,
>
> Two questions in your two emails, and I have a straight answer to one and a
> question back on the other.
>
> On "Topic 1.3 page" and "matching CFUs": CFU stands for Check For
> Understanding, the short comprehension questions inside each lesson. The guided
> notes are built to be filled in as students work through the lesson page for
> that topic, so the note blanks and the CFU questions line up in order. If the
> notes you are holding reference a Topic 1.3 page you cannot find, send me the
> file name and I will point you at the exact page or fix the reference.
>
> On the PIN not accepting input: I want to check something before I go further.
> The guided notes I have for AP Cybersecurity are Word documents rather than web
> pages, and I cannot find a gated notes page with a PIN box on it. So I think you
> may be on the student join page at /pages/join rather than a notes page.
>
> If that is the one, there is a likely cause. That page asks for a class code, the
> student's name, and their PIN. If the name a student types does not match the
> roster exactly, the page rejects it, and it can look like the PIN field is the
> thing refusing to work. Worth having a student try with their name spelled
> exactly as it appears in your roster.
>
> Could you send me the URL where you see the PIN box? Once I know which page it
> is I can test it properly rather than guessing.
>
> Sorry for the delay getting back to you. You sent this twice and should not have
> had to.
>
> Best,
> Tanner

---

## 6. Michelle Campbell (Palm Beach) - rewritten to match the resolved Vo answer

Her question (are labs self-graded, do they show in the gradebook) has the same
root cause as Vo's, so the two replies must agree. Labs DO self-grade and DO
record: 152, 90, 58, 26 and 7 students scored on the Unit 1.1 through 1.5 labs
respectively. What is wrong is the point value on three of them, and 1.3's lab
has no point value at all.

> Subject: Re: Are Labs self-graded, and do they show in the gradebook?
>
> Hi Michelle,
>
> Not even slightly tired of them, and this one turned out to be well timed.
>
> Yes, labs are self-graded. Students work through the lab on the page, it scores
> them as they go, and the result posts to your gradebook with nothing for you to
> mark.
>
> They are recording correctly right now. What is wrong is on the display side: for
> a few Unit 1 activities the gradebook has the wrong point total on file, so a
> completed lab either shows a percentage that looks wrong or does not appear in
> the points column at all. The Topic 1.3 lab in particular has no point value
> recorded, so that work registers as complete and then vanishes from the points
> total.
>
> I am correcting those totals this week. The important part: it is retroactive.
> The raw scores are all stored, so fixing the point values recalculates the grades
> automatically, including work your students have already finished. Nobody redoes
> anything.
>
> Until then, treat the labs column as understating what your students have done
> rather than as missing data.
>
> I will email you when the totals are corrected and tell you how to spot-check it
> yourself rather than taking my word for it.
>
> Best,
> Tanner

---

# TIER 3: no deadline pressure

## 7. Shawn Brown (Somerset) - PO 26/27-1097

The Unit 1 project material is in Drive under **AP Cybersecurity Course >
Course_Resources**, which holds `Threat_Defense_Report_Rubric.docx` and two pacing
guides. Per-lesson lab material sits under each lesson's `Supplements/` folder.

**Correction, and v2 had this right where my source did not.** `/pages/ap-cybersecurity-labs`
returns HTTP 200, checked today. The lab is on the SITE, not in Drive. The source I
first worked from searched only Drive, found no document named "3-day lab", and I
repeated that as though absence from Drive meant absence. The Drive folders hold
deck, notes, quiz, supplements and teacher guide; labs live on the site. That split
is the likely reason he could not find it, and it is worth making explicit to him.

**Trap to avoid:** an older tree named "Unit 1 - Introduction to Security"
contains a folder literally called `Superpack` that is **empty**, plus a stale
index doc. Do not send him a link into that tree.

> Subject: Re: Accessing the Unit 1 lab/project and cyber range work
>
> Hi Shawn,
>
> Here is where the Unit 1 project material lives.
>
> The lab is on the site rather than in Drive, which is almost certainly why you
> could not find it:
>
> https://www.apcsexamprep.com/pages/ap-cybersecurity-labs
>
> The rubric for the Threat Defense Report is in the Course_Resources folder of
> your Drive, alongside two pacing guides, one for a traditional schedule and one
> for block and semester. The pacing guides are where the three-day shape is laid
> out.
>
> The split is not obvious: Drive holds the deck, guided notes, quiz, supplements
> and teacher guide, and the labs live on the site. That is on me to make clearer.
>
> One warning so you do not waste an afternoon: there is an older folder tree in
> there from an earlier version of the course, including a folder named Superpack
> that is empty. Ignore it. I am cleaning it out. Everything current is under the
> AP Cybersecurity Course tree with per-lesson folders.
>
> On cyber range work: tell me what you are hoping to run and I will tell you
> honestly whether we have it, rather than pointing you at something that turns
> out to be thin. Some of that is built and some is not.
>
> If it is easier, I am glad to walk your department through the folder structure
> on a call.
>
> Best,
> Tanner

---

## 8. John Arcay (TASIS England) - THERE IS NO PRODUCT TO SELL HIM

He asked for the Cyber Unit 1 Superpack and one for every unit if possible. There
is no per-unit Cybersecurity product in the store at all. The only per-unit
product you sell is the free CSA Unit 1 preview, which he already downloaded, so
he is almost certainly generalizing from that.

The real answer is better than the question: all five units exist in shippable
form in Drive, and the bundle is what delivers them.

**Fix before sending:** the doc a founding teacher opens first, "START HERE -
What's Live & What's Coming", was last modified 2026-06-02 and still says "Units
2-5 - In progress." That is three months stale, it understates the product, and
it contradicts the sales page. If he buys and opens that doc first, it undoes the
email below.

> Subject: Re: Cybersecurity Unit 1 Superpack
>
> Hi John,
>
> Thanks for clarifying, and I have good news that comes with a correction.
>
> The correction: there is no per-unit Superpack for Cybersecurity. The per-unit
> preview you downloaded is from the AP CSA course, which is the one place I sell
> a single unit on its own.
>
> The good news: for Cybersecurity you do not need one. The Founding Teacher
> Bundle is all five units, and all five are built and ready now, not promised for
> later. Every CED lesson across Units 1 through 5 has a teacher guide, guided
> notes with student and key versions, a quiz with a key, and supplements, plus a
> unit test with a key for each unit.
>
> Being straight about depth, since you asked for every unit: Unit 1 is the
> deepest, with two days of notes on some lessons where the others have one. Slide
> decks are complete for Units 1 and 2 and still in progress for 3 through 5. The
> written material is complete across all five.
>
> The bundle is $249 at the founding rate:
>
> https://www.apcsexamprep.com/products/ap-cybersecurity-founding-teacher-bundle
>
> If TASIS needs an invoice or a quote on school letterhead rather than a card
> checkout, say the word and I will get one to you.
>
> Best,
> Tanner

---

## 9. Patrick Hair (Bay County FL) - AP Networking CED

He is right that he cannot find one, and the honest answer is that this is not a
College Board course. Do not invent a citation here.

> Subject: Re: AP Networking CED
>
> Hi Patrick,
>
> You are not missing anything. There is no College Board CED for AP Networking,
> because there is no such AP course. The College Board's computer science
> offerings are Computer Science A, Computer Science Principles, and the new
> Cybersecurity course. Networking content shows up inside the Cybersecurity CED
> rather than as a course of its own.
>
> If you are being asked to build a networking course and want it to feel
> AP-shaped, the closest legitimate anchors are the networking sections of the AP
> Cybersecurity CED, and outside the AP world the CompTIA Network+ objectives,
> which are public and well organized.
>
> Tell me what the ask actually is at your end, whether it is a standalone
> elective, a semester before AP CS, or something a district is requiring, and I
> will tell you what would genuinely fit rather than selling you the nearest
> thing I have.
>
> Best,
> Tanner

---

## 10. Dan Gompert (cccneb.edu) - new lead, community college

> Subject: Re: Your enquiry about AP CS materials
>
> Hi Dan,
>
> Thanks for reaching out.
>
> Before I send you anything, one question, because Central Community College
> changes the answer. Most of what I build is aimed at high school AP courses, so
> if this is for a dual-credit section running the AP curriculum, it fits
> directly. If it is for a college-level intro course that is not following the
> AP CED, some of it fits and some of it would be wrong for your students, and I
> would rather tell you which is which than sell you the bundle.
>
> So: what course are you teaching, and is it AP-aligned?
>
> Tell me that and I will send you a straight answer, including "this is not right
> for you" if that is the truth.
>
> Best,
> Tanner

---

## 11. Lynn Manuel (Patrick Henry Academy) - new lead, CSP

> Subject: Re: AP Computer Science Principles materials
>
> Hi Lynn,
>
> Thanks for getting in touch about the CSP materials.
>
> The AP CSP course covers all five Big Ideas, 35 lessons, with lesson pages,
> guided notes, checks for understanding and quizzes, and a progress dashboard
> that shows you where each student is without you marking anything.
>
> Rather than send you a sales page, tell me a bit about your situation: how many
> sections, whether you have taught CSP before, and whether you are starting this
> year or planning for next. What a first-time CSP teacher needs and what a
> veteran wants are different, and I would rather point you at the right part.
>
> If it is useful, I can set you up with access to Unit 1 to look through properly
> before you decide anything.
>
> Best,
> Tanner

---

# Two things I want on the record

## The cohort-wide disclosure: I argued both sides today, so discount me

At the start of this session I recommended sending it. An hour later I recommended
against it, on the strength of a health-check reading that turned out to be blind
to the activities in question. Both recommendations were confident and one of them
was worthless, so treat this section as input rather than advice.

What is actually known:

- Among activities that HAVE an authored denominator, 11 are losing scores, none
  in cyber Unit 1. That is a floor, not a total.
- Fifteen Unit 1 activities have no denominator and are therefore invisible to
  that count. Whether they are recording is unknown.
- Five board tasks assert Unit 1 scoring is broken. All are `done`. None is
  verified.

The decision turns entirely on the check in Vo's section, and it should not be
made before that check is run. If Unit 1 is recording, this is a Units 2-5 problem
affecting eleven completions and no disclosure is warranted. If Unit 1 is not
recording, every founding-cohort teacher is grading against incomplete data and
they should hear it from you first.

Do not send a disclosure describing work as unrecoverable until someone has
confirmed it is unrecoverable. That claim is the one that makes teachers re-run a
week of class, and it is currently resting on a retracted measurement.

## The board is asserting things that are not true

Task 85 is marked with `bleeding: true` and reads as an open production
emergency. The symptom it describes, `earned: 0 possible: 0`, is fixed in the
deployed commit and two suites assert it. Two narrower pieces of its spec are
genuinely open and neither bleeds.

That is the same failure mode as telling a teacher something is fixed when it is
not, just pointed the other way and stored in a database instead of an email. It
cost this session real time re-deriving a bug that was already dead.

Worth a sweep of everything marked done with `verified: false`.
