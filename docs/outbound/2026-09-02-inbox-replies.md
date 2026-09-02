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
| 1 | Vo's Ex2/Lab/Quiz scores "were never calculated", not retroactively recoverable | Cyber **Unit 1 records fine**. Live `/api/health` lists 11 reporter-gap activities and **not one is cyber Unit 1**. The gap is Units 2 through 5. | Vo's draft rewritten. The v2 version would have told a paying customer his data was gone when it is sitting in the database. |
| 2 | "No gating exists, confirmed at the schema level" | **Gating exists.** `lib/activity-gate.js`, the `activity_gates` table, `classes.quiz_lock_default`. Quiz and exam are default-gated. What does NOT exist is *scheduled* release. | Gargano's draft rewritten. This is a yes, not a no, and she is deciding whether to use the platform at all. |
| 3 | Naggar's founding price expires "Friday" | The live product page states **September 1, 2026**, three times. That was yesterday. | Naggar's draft no longer cites a Friday deadline. See the note in his section. |

## Verification ledger

| Claim | Verdict | Source, checked 2026-09-02 |
|-------|---------|----------------------------|
| Cyber Unit 1 Ex2/Lab/Quiz post scores | TRUE | `/api/health` `reporters.worst`: 11 rows, zero in cyber unit-1 |
| Units 2-5 lose some scores | TRUE | Same read: 7 cyber rows across units 2, 3, 4, 5, including one Ex2 and one Lab |
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

## 2. Peter Vo (Klein ISD) - SEND AFTER ONE CHECK

This is the draft that changed most, and the reason matters.

**v2 would have been wrong, in the same direction as last time.** It told him the
scores were never calculated and were not recoverable. Checked against production
today, cyber Unit 1 reporters work: `/api/health` lists every activity that has
completions but has never received a score, and not one of the eleven is in cyber
Unit 1. His student's 15/15 was recorded. It is in the database. Telling a
customer his data is gone when it is not would have been the third confident
wrong answer in this thread, and he is the person best placed to catch it.

What I could NOT settle: why a recorded score is not rendering for him.

**`[TANNER]` The 30-second check that settles it.** Signed in, open:

    https://progress.apcsexamprep.com/api/admin/class/<his_class_id>/gradebook

and look at whether the Ex2 column exists at all, and what `items_percent_only`
contains. That distinguishes the two live candidates:

- The score is stored but the column is unpriced, so it cannot join the points
  sum and renders blank. Fix is one denominator row, and the grade appears
  retroactively for every student at once.
- The score is stored and priced but against a lesson id his page is not
  reporting. That is the Unit 3 handle-offset defect, in which case Unit 1 is
  clean and something else is going on.

**One detail worth handing you.** He said 15/15. No Unit 1 Exercise 2 in the seed
has a denominator of 15; they are 8, 30, 24, 25 and 4. So either he is not in
Unit 1, or the page is printing a total the gradebook was never told about. That
is the first thing I would look at.

The draft below commits to what is verified and asks one question, rather than
diagnosing out loud.

> Subject: Re: Student progress not showing after Exercise 1
>
> Hi Peter,
>
> First, an apology. You wrote on the 31st about grades not appearing, and my
> reply that afternoon answered a different question about quiz gating in 1.1. You
> then had to write again through the contact form to get an answer at all. That
> is my fault and I am sorry for it.
>
> Here is where things actually stand, checked against the server this morning
> rather than assumed.
>
> The good news: your student's 15/15 was recorded. Work submitted on Unit 1
> Exercise 2, the Lab and the Quiz is reaching the server and being stored. This
> is not lost data and nothing needs to be redone by your students.
>
> The problem is on the display side, between the stored score and the column you
> are looking at, and I have not yet pinned down which of two causes it is. I did
> not want to sit on your message any longer while I finish that, and I am not
> going to guess at it in an email to you again.
>
> One thing that would help me finish it today: could you send me the class code,
> and the name of the lesson page your students were on when they did that
> Exercise 2? The score you quoted, 15 out of 15, does not match any total I have
> on file for Unit 1 Exercise 2, which is itself a useful clue about where this is
> going wrong.
>
> On the wider point: separately from your class, I found that some activities in
> Units 2 through 5 are not recording scores properly. Unit 1 is not affected, so
> it should not touch what your students have done so far, but you would have run
> into it in a few weeks and I would rather you heard it from me now.
>
> I will write back today with either a fix or a straight answer about how long
> one will take.
>
> Best,
> Tanner

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

## 6. Michelle Campbell (Palm Beach) - answer consistently with Vo

Same territory as Vo, so these two must not contradict each other. Labs in Unit 1
do record. The five Unit 4 labs carry no authored total, and Unit 5 lesson 5.1's
lab is in the live reporter-gap list.

> Subject: Re: Are Labs self-graded, and do they show in the gradebook?
>
> Hi Michelle,
>
> Yes to both, with one caveat I would rather you had up front.
>
> Labs are self-graded. The student works through the lab on the page, it scores
> their work as they go, and the result posts to your gradebook without you
> marking anything.
>
> The caveat: that is solid for Unit 1, which is where your students are now. As I
> was checking this I found that a small number of activities in Units 2 through
> 5, including one lab, are not posting scores the way they should, and a few of
> the Unit 4 labs do not yet have a point total attached, so they record but do not
> add into the points column. None of that touches Unit 1.
>
> I am fixing those now and they will be right well before your students reach
> them. I mention it because you asked a gradebook question and it would be poor
> form to answer only the half that is currently working.
>
> If you want, once your students have a few labs in, send me your class code and
> I will check the gradebook against the raw records myself and confirm the two
> agree.
>
> Best,
> Tanner

---

# TIER 3: no deadline pressure

## 7. Shawn Brown (Somerset) - PO 26/27-1097

The Unit 1 project material is in Drive under **AP Cybersecurity Course >
Course_Resources**, which holds `Threat_Defense_Report_Rubric.docx` and two pacing
guides. Per-lesson lab material sits under each lesson's `Supplements/` folder.

No document explicitly named "3-day lab" exists. If that is a distinct artifact
rather than the project rubric plus pacing, it is not in Drive under that name.

**Trap to avoid:** an older tree named "Unit 1 - Introduction to Security"
contains a folder literally called `Superpack` that is **empty**, plus a stale
index doc. Do not send him a link into that tree.

> Subject: Re: Accessing the Unit 1 lab/project and cyber range work
>
> Hi Shawn,
>
> Here is where the Unit 1 project material lives.
>
> The main artifact is the Threat Defense Report, and its rubric is in the
> Course_Resources folder of your AP Cybersecurity Course drive, alongside two
> pacing guides, one for a traditional schedule and one for block and semester.
> The pacing guides are where the three-day shape of it is laid out.
>
> The per-lesson lab material is not at the course level. Each lesson folder has
> its own Supplements folder, and that is where the hands-on work for that lesson
> sits.
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

## The cohort-wide disclosure question is now much smaller than v2 said

v2 recommended a disclosure email to the whole cohort, on the premise that
everyone's gradebook was silently missing a third of its data and the damage was
accruing daily because it could not be backfilled.

Checked live, that premise was too broad. The measured blast radius today is
**11 activities and 11 completions**, none of them in cyber Unit 1, which is where
every teacher who started this week actually is. That is what early September
looks like before classes ramp. It is a real defect and it is worth fixing this
week, but it is not a cohort-wide emergency and an all-hands "your grades are
broken" email would do more reputational damage than the bug.

My recommendation flips: **do not send a cohort-wide disclosure.** Tell Vo and
Campbell, who asked, which the drafts above do. Fix the eleven. If the count
climbs as Units 2 and 3 come into use, revisit it.

That is a judgment call about your business, so it stays yours. I have not
drafted the disclosure email because I no longer think it should go.

## The board is asserting things that are not true

Task 85 is marked with `bleeding: true` and reads as an open production
emergency. The symptom it describes, `earned: 0 possible: 0`, is fixed in the
deployed commit and two suites assert it. Two narrower pieces of its spec are
genuinely open and neither bleeds.

That is the same failure mode as telling a teacher something is fixed when it is
not, just pointed the other way and stored in a database instead of an email. It
cost this session real time re-deriving a bug that was already dead.

Worth a sweep of everything marked done with `verified: false`.
