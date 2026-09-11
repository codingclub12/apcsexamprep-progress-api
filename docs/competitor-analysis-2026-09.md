# Competitive analysis: CodeHS, Project STEM, Code.org against apcsexamprep

Researched and written 2026-09-11. Board task 312.

Every number about our own business was measured live today, against the
storefront through `lib/storefront-fetch.js` and against the digest. Every claim
about a competitor is sourced below, and where I could not reach a site I say so
rather than filling the gap from memory.

## Who the three actually are

Not chosen by guessing. College Board publishes an endorsed provider list per
course, and that list is where a department head starts in August. CodeHS,
Project STEM and Code.org are the three names that appear on both the AP CSA and
the AP CSP list, sell to the same person we do, and turn up in the same searches.

One thing to say before anything else, because it reframes the rest of this
document.

**We are not on either list.** The AP CSA endorsed provider page names 13
organizations. The AP CSP page names 28. apcsexamprep.com is absent from both.

That is not a ranking problem or a copy problem. It is a distribution problem,
and it is the single most consequential finding here.

## What I could not check

- **Project STEM's own site is hard-blocked to us.** `projectstem.org` and
  `www.projectstem.org` both answer 403, to the fetch tool and to bare curl, on
  the homepage and on the AP CSA page. So everything below about Project STEM
  comes from College Board's endorsed provider listing and from secondary
  sources. I did not see their signup flow, their dashboard or their onboarding,
  and I am not going to describe them as though I did.
- **Nobody publishes a price.** CodeHS shows four tiers and a dollar amount on
  none of them. Project STEM and UTeach are the same. The only real numbers in
  this market are in school board minutes, and the one district quote I found is
  a subset-font PDF that would not extract. So the price comparisons below are
  structural, not numeric.
- **Our own conversion data.** Search Console still is not connected, which the
  August audit already flagged as step zero. I can tell you what our pages say. I
  cannot tell you what they earn.

## Where we stand today, measured

| Signal | Value | Source |
|---|---|---|
| Active classes | 562 | digest, 2026-09-11 |
| Active students | 1,397 | digest, 2026-09-11 |
| Score events, 24h | 2,832 | digest, 2026-09-11 |
| Manifest items | 933 | digest, 2026-09-11 |
| Teacher bundles | 4, all $249 | `/products.json` |
| Free lead magnet | AP CSA Unit 1 Teacher Bundle, $0.00 | `/products.json` |
| Student PDFs | $2.99 to $34.99 | `/products.json` |
| Tutoring | $150/hr | live CTA on the CSA hub |

Growth since the August audit is real: 393 classes became 562, and 940 students
became 1,397. Whatever we are doing is working on the people who find us.

Two live checks that did not come back clean:

- `/pages/pricing` answers **404**. Board task 215 is an assistant report against
  that URL, so something is pointing at a page that does not exist.
- `/pages/for-teachers` answers **404**. The August audit named this as the
  biggest content gap on the site. It still has not shipped.
- The homepage meta description is still the one the August audit quoted:
  "Free AP Computer Science A and CSP exam prep including practice tests, FRQs,
  study guides, and create task resources. Built to help you score a 4 or 5."
  Two courses, student audience, exam-day framing. We now teach four courses and
  our paying customer is a teacher.

## CodeHS

**Positioning.** "The Top Coding and Computer Science Platform for K-12 Schools."
Sells to the institution, not the individual. K-12 breadth rather than AP depth.

**Offers and pricing.** Four tiers: Free, Starter (capped at one teacher and 100
students), School (priced per teacher), District. Free says "Sign Up for Free."
Every other tier says "Request a Quote." No dollar figure appears anywhere on the
pricing page.

**What is behind the paywall.** This is the important part, and I am stating only
what two separate CodeHS sources agree on, because they disagree on some of it.
Both the pricing page and the knowledge base confirm the free plan does **not**
include the customizable gradebook, weighted grades and grade categories, due
dates, assignment locking for pacing, administrator dashboards, or LMS
integrations beyond Google Classroom.

The two sources contradict each other on autograding and real-time progress
tracking: the plan detail page lists both as free, the knowledge base article
lists both as Pro. I am not going to resolve that from the outside, and we should
not build a comparison page on the contested half.

**Onboarding.** A free teacher account is self-serve and immediate. Getting the
gradebook is a sales conversation.

**AP Cybersecurity.** They have a Cyber Range, described as an interactive
environment for cybersecurity labs, and a teaching cohort that started 27 July
2026. Their public pages are thin on what the Cyber Range actually does.

**Endorsement.** Endorsed for both courses. Listed paid for CSA and, interestingly,
free for CSP.

## Project STEM

Reported at arm's length, per the caveat above.

**Positioning and offer.** A full curriculum on their own interactive platform:
instructional videos, lesson slides, pre- and post-lesson exercises, auto-graded
coding activities, teacher resources and reporting. Delivered through the Rex
K-12 Technology Learning Platform.

**Pricing.** College Board lists them as **paid** for both AP CSA and AP CSP.
Separately, their partnership with Amazon Future Engineer makes the courses free
for sponsored schools. So the honest description is that a school either lands
inside a sponsorship or pays, and which one you get is not visible from outside.

**Onboarding.** A 40-hour self-paced professional development sequence, on the
Rex platform, with instructional support and check-ins across the year.

That 40 hours is the whole story of their funnel. It is a serious commitment and
it buys serious retention, and it means a teacher cannot go from curious to
teaching in an afternoon.

## Code.org, now CodeAI

**Positioning.** Rebranded from Code.org to CodeAI on 2 June 2026, repositioned
around AI education. Their CSA page still reads as curriculum-first: "Introduce
students to software engineering and object-oriented design while they learn the
Java programming language in this free curriculum for AP Computer Science A."

**Pricing.** Free, and unambiguous about it: "Our curriculum and platform are
available at no cost for anyone, anywhere, to teach." Endorsed and listed free for
both CSA and CSP. Workshops are the paid upsell, with scholarships.

**Offer.** Full curriculum, Java Lab environment, lesson plans, videos, slide
decks, assessments, progress tracking, and custom quizzes mapped to AP Classroom.

**Onboarding.** CTAs are "Explore curriculum" and "Sign up for free." The catch is
teacher verification: Java Lab and the teacher-only material, answer keys
included, require a verified teacher account, and the verification form runs
**three to five business days**.

**Gap.** No AP Cybersecurity.

## What they do better than us

**They are on the list and we are not.** Thirteen names for CSA, 28 for CSP,
neither includes us. A teacher following College Board's own trail never sees us.
Everything else on this page is downstream of that.

**Code.org states the price in a sentence.** Ours takes a tour of the site to work
out, and the page that should say it 404s.

**Project STEM's 40 hours of PD is a moat.** We read it as friction, and it is,
but a teacher who has spent 40 hours inside a platform does not casually switch
next August. We have nothing that creates that kind of commitment.

**CodeHS sells to the buyer.** Administrator dashboards, district rollups,
implementation support, a named customer success manager. When the purchase order
is signed by someone who is not the teacher, they have the artifacts for that
conversation and we do not.

**All three lead with the course, and our homepage leads with the exam.**

## What they do worse

**CodeHS charges for the gradebook.** A free CodeHS teacher cannot set due dates,
cannot lock assignments for pacing, and does not get the customizable gradebook.
Ours is free, and it does more than theirs does at the tier where it appears:
every attempt stored rather than the last, grade of record following the class's
own retry policy, and a mastery threshold that applies retroactively when the
teacher changes it.

**Nobody will tell a teacher what it costs.** Four tiers at CodeHS and not one
number. That is built for a district procurement cycle and it is actively hostile
to a teacher in late August who has a first period on Monday.

**Code.org makes you wait three to five business days for answer keys.** In the
last week of August that is not a delay, it is a lost adoption.

**Project STEM asks for 40 hours before you teach anything.**

**None of the three sells one-to-one tutoring.** We do, at $150/hr, from someone
with the classroom record to back it.

**Our onboarding beats all three and nothing on the site says so.** Teacher
registration is email, password, name and school, and it returns a token on the
spot. No verification wait, no quote, no PD prerequisite. A teacher can be running
a real class with a real gradebook in about a minute. That is the sharpest thing
we own and it is invisible above the fold.

## The gaps worth standing in

**AP Cybersecurity has no endorsed provider list at all.** College Board's own
adopt page for the course names no curriculum providers. None. The only vendor
named on it is IBM, as a development partner. Paradigm Cyber describes itself as a
national curriculum partner, and JuiceMind, CodeHS and UTeach all sell into the
course, but the authoritative list that decides AP CSA and AP CSP adoptions does
not yet exist here.

We have all five units live, terminal labs that practice a graded part of the FRQ,
and a founding teacher bundle on the shelf. This window closes the moment College
Board publishes a list, and it is the best position we hold in any of the four
courses.

**The zero-PII posture is a procurement answer nobody else is giving.** Students
join on a name and a PIN. No emails, no free-text stored outside the sandbox. For
a district asking about student data that is the entire conversation, and it
appears nowhere in our marketing.

**Canvas export removes the objection that kills adoptions.** `GET
/classes/:code/canvas-course` already exists. "You do not have to leave your LMS"
is a sentence none of the three leads with, and we do not say it either.

**Free bundles with no list price are a mismatch.** The $249 bundles sit in
`/collections/bundles` next to $25 student flashcards. A curriculum adoption and a
teenager's April impulse buy are not the same shelf.

## The three things to test

**1. Apply for College Board endorsement, CSA and CSP.** Longest lead time, so it
starts first. Neither AP Central page documents the application process, so step
one is finding out what it is, and that is a question for College Board rather
than something to keep guessing at from the outside. Success is binary and public:
we appear on the list, or we do not.

**2. Ship /pages/for-teachers with the gradebook and the clock as the pitch.** The
page is already specified in `docs/commercial-layer-2026-08.md`, it is a new row
rather than a redirect, and it currently 404s. Lead on the two things measured
here: the gradebook is free where CodeHS charges for it, and a class is running in
about a minute where the others need a quote, a verification wait or 40 hours of
PD. Fix `/pages/pricing` in the same pass, since something already points at it.
Test: class creations that start on that page.

**3. Take AP Cybersecurity while the list is empty.** Push the founding teacher
bundle and the cyber curriculum hub hard this term, before an endorsed provider
list exists to be absent from. We already surface in AP Cybersecurity curriculum
searches, which is more than we can say for CSA against CodeHS. Test: founding
bundle sales and cyber class creations this term, against the same window next
term once a list probably exists.

## The one thing not to copy

**Do not put the price behind a quote form.**

It will be tempting, because that is what the two paid competitors do and it is
where the district money is. It would cost us the only thing we beat all three of
them on. Our advantage is that a teacher goes from landing on the page to running
a real class, with a real gradebook, in about a minute, with nobody's permission.
A "Request a Quote" button converts that into a sales cycle and hands the
comparison back to the vendor with the customer success team and the district
references.

If enterprise pricing becomes necessary, publish the number and let the district
call us about it. The quote wall is their weakness. Adopting it would be
borrowing a competitor's weakness and calling it a strategy.

## Sources

Fetched 2026-09-11 unless noted.

- CodeHS homepage, `codehs.com`
- CodeHS pricing, `codehs.com/pricing`, and the plan detail table, `codehs.com/plans_detail`
- CodeHS knowledge base, choosing the right plan
- CodeHS cybersecurity resource hub, `codehs.com/curriculum/cybersecurity`
- Code.org / CodeAI AP CSA curriculum, `code.org/en-US/curriculum/computer-science-a`
- AP Central, endorsed providers of AP CSA curricula
- AP Central, endorsed providers of AP CSP curricula
- AP Central, adopt AP Cybersecurity
- JuiceMind, best AP Cybersecurity curriculum 2026-27, read as a competitor's own comparison
- Project STEM: site 403, secondary sources only
- Our own: `/products.json`, `/collections/bundles/products.json`, the live homepage,
  `/pages/ap-csa-course`, `/pages/cyber-class`, `routes/teacher.js`, and the session digest
