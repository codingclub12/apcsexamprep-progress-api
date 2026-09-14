# Student data privacy: what is actually true, measured 2026-09-14

Written to answer two questions before a district email went out, both of which
turned out to have a different answer than the draft assumed. Everything here is
re-derivable: the probe scripts are named, and every live claim was fetched
through `lib/storefront-fetch.js` with no User-Agent, per the repo convention.

## Question 1: is "nothing sold or shared" literally true?

No. Not as a blanket sentence, and the gap is wider than a cloud provider.

Eight third-party services load on every student-facing page measured, including
`/pages/my-progress`, which is the signed-in student's own gradebook, and
`/pages/join`, which is where a minor types a name and a PIN. Advertising is then
suppressed at runtime for some of them, which is the next section and it does not
rescue the sentence.

| Vendor | What it is | my-progress | lesson pages | join |
|---|---|---|---|---|
| Raptive / AdThrive | Advertising network | yes | yes | yes |
| Microsoft Clarity | Session replay and heatmaps | yes | yes | yes |
| Google Analytics (G-PWVBSK4KPR) | Analytics | yes | yes | yes |
| Klaviyo | Email marketing | yes | yes | yes |
| Ahrefs Analytics | SEO analytics | yes | yes | yes |
| Shopify trekkie / monorail | Shopify's own analytics | yes | yes | yes |
| Shopify Web Pixels | Pixel manager | yes | yes | yes |
| Shop Pay | Checkout | yes | yes | yes |

Raptive is the one that changes the answer. It is an advertising network, loaded
from `ads.adthrive.com` in the document head:

    w.adthrive.plugin = 'adthrive-ads-manual';
    w.adthrive.host   = 'ads.adthrive.com';

Under most state student-privacy laws and essentially every NDPA, serving
programmatic advertising is a "sale" or a "share" of personal information. That
is the term of art, and it is the term the district's own form will use.

The site's own published privacy policy already says so. `/policies/privacy-policy`
is Shopify's stock ecommerce template, and it carries these sentences today:

- "With business and marketing partners to provide marketing services and
  advertise to you."
- "we use Shopify to support personalized advertising with third-party services
  based on your online activity with different merchants and websites."
- "Right to Opt out of Sale or Sharing for Targeted Advertising."
- It names Raptive by name: "CMI Marketing, Inc., d/b/a Raptive ... is a service
  provider of this Site for the purposes of placing advertising."

So an email saying "nothing sold or shared" contradicts the policy published on
the same domain. A reviewer who reads both is the likeliest reader of both.

### There IS an ad gate, and running it changes the shape of the answer

`snippets/apcs-entitlement.liquid` in the theme suppresses ads at runtime. The
script still loads on every page, which is what the HTML measurement above shows,
but the gate then calls `adthrive.disableAds()` for some visitors. So "AdThrive
loads here" and "a student sees ads here" are different questions and the second
one needed the gate executed rather than read.

The theme ships its own harness for exactly this, `scripts/verify-ad-gate.js`,
which extracts the real IIFE and runs it in a sandbox. Reusing that extraction
against a MAXIMALLY entitled student, paid tier with every unit of every course
unlocked, gives this:

| Page | Entitled student | Teacher | Logged out |
|---|---|---|---|
| `/pages/my-progress` | ads ON | ads OFF | ads ON |
| `/pages/join` | ads ON | ads OFF | ads ON |
| `/pages/ap-csa-lesson-1-1-intro-algorithms` | ads ON | ads OFF | ads ON |
| `/pages/ap-csa-lesson-1-10-calling-class-methods` | ads ON | ads OFF | ads ON |
| `/pages/ap-csp-big-idea-2-data` | ads ON | ads OFF | ads ON |
| `/pages/ap-cyber-unit-5-lesson-5` | ads OFF | ads OFF | ads ON |

Teachers are ad-free everywhere, which works. Students are ad-free only on pages
the gate recognizes as a course unit, and it recognizes almost none of them.

### A second finding, not a privacy one: paid CSA and CSP students see ads

The gate identifies a course page by handle:

    /ap-cyber(?:security)?-unit-(\d+)/i     matches ap-cyber-unit-5-lesson-5
    /ap-csa-unit-(\d+)/i                    matches nothing that is live
    /ap-csp-course-bi(\d+)/i                matches nothing that is live

Checked against the storefront: `ap-csa-unit-1` and `ap-csa-unit-2` answer 301,
`ap-csa-unit-1-primitive-types` and `ap-csp-course-bi1-creative-development`
answer 404. The live lesson handles are `ap-csa-lesson-1-1-intro-algorithms` and
`ap-csp-big-idea-2-data`, and neither regex matches either shape.

So the CSA and CSP arms of the ad gate match no live lesson page, and a student
whose teacher paid for the course sees ads through the entire course. Only the
cyber arm works. That is a revenue and product problem rather than a privacy one,
it is worth more than this page is, and it is not in scope for the page that was
asked for. Flagging it rather than fixing it: changing who sees ads is a money
decision and the router treats those as never-auto.

### Nothing gates the analytics

The gate is about advertising only. Microsoft Clarity, Google Analytics, Klaviyo,
Ahrefs and Shopify's own analytics have no equivalent. They load and run for
every visitor on every page, signed in or not, including `/pages/my-progress`.

### The first scan missed it, and the reason is worth keeping

A scan for `src=` attributes found `faves.grow.me` and no ad network, because
AdThrive assembles its host in JavaScript rather than writing it into an
attribute:

    s.src = 'https://' + w.adthrive.host + '/site...'

`scratchpad/probe-vendors.js` matches vendor idioms anywhere in the body instead
of parsing attributes. Any future "what loads on our pages" check has to do the
same, or it will report a clean page and be wrong in the direction that costs a
deal.

### What is genuinely good, and it is not small

No student identifier reaches any of those vendors from our own code. Checked on
the rendered page: zero `dataLayer.push` calls carrying identity, no
`clarity('identify')`, no Klaviyo `_learnq` identify, no `display_name` or
`student_name` anywhere in a vendor call. The analytics vendors see a page view.
They are not handed a student.

The exception that needs a human to close it: Microsoft Clarity records the DOM,
and on `/pages/my-progress` the rendered DOM contains the student's display name
and their scores. Clarity's masking level is set in the Clarity dashboard, not in
this repo, so it cannot be verified from here. Someone has to open Clarity and
confirm the masking setting before anybody tells a district what Clarity sees.

## Question 2: can a student enter an email anywhere?

The student account system collects no email. That part holds, and it holds in
the schema rather than by policy:

    CREATE TABLE students (
      id, class_id, display_name, pin_hash, student_ref,
      retry_override, active, created_at, last_active
    );

No email column. Same for `student_accounts`, which is the cross-class identity:
`name_key` and `pin_hash`. `lib/mailer.js` states the same rule from the other
end: the only address the server ever sends to is a teacher's own.

But the blanket sentence "students cannot enter an email" is not true of the
website. Five email inputs render on a CSA lesson page:

1. A site-wide contact form, `#apcs-contact-wrapper`, name plus email, both
   required. It is on every page measured, including `/pages/my-progress`, and it
   is not suppressed for a signed-in student.
2. The footer newsletter. Known and intended.
3. and 4. CSA and CSP lead-capture popups.
5. A cyber early-access popup, "Email address (school email preferred)".

The popups post straight from the browser to Klaviyo's Subscribe API with the
email, a first name, and a `user_role` property. The default value of that
property is the thing to notice:

    var role = apcsRole[course] || 'student';

So a subscriber can be tagged `user_role: student`, `is_teacher: false` in
Klaviyo.

### Why this is still a defensible position

A signed-in student never sees the popup. The suppression list is explicit:

    if (lsGet('apcse_token'))         return 'logged-in-student';
    if (lsGet('apcse_teacher_token')) return 'logged-in-teacher';

and `apcse_token` is the correct key, the one `shopify/join.html` writes and that
`smoke:studenttokenkeys` pins. The popup is also blocked by path on
`my-progress`, `cyber-dashboard`, `gradebook`, `/pages/join` and others.

So the accurate sentence is narrower than the draft's and survives contact with a
reviewer: a student account has no email field, and nothing a visitor types into a
marketing form is attached to a student account or to any progress record. What is
not true is that a student is incapable of typing an email on the site.

The contact form is the loose end. It is reachable while signed in, on the
progress page, and it takes a required email.

## Subprocessors, the list an NDPA will ask for

Handling student progress data:

| Service | Role | Student data it can see |
|---|---|---|
| Railway | Hosts the progress API and the SQLite volume | All of it: display name, PIN hash, scores, timestamps |
| Shopify | Hosts the storefront every lesson page is served from | Page requests; no progress data |
| Judge0 via RapidAPI | Runs student-written code for exercises and the sandbox | The code text itself, in transit. Not the student's name |
| Resend | Transactional email | Teacher addresses only. Never a student |
| Cloudflare | CDN and bot management in front of the storefront, Turnstile | Request metadata |

Running on public pages: Raptive, Microsoft Clarity, Google Analytics, Klaviyo,
Ahrefs, Shopify analytics. See the table above.

Two that are built but not on, verified live rather than read from code.
`GET /api/assistant/chat/config` answers:

    {"anon_enabled":false,"student_enabled":false,"model_configured":false, ...}

So the site assistant calls no model today and refuses student tokens outright.
Anthropic is not currently a subprocessor. It is one environment variable from
being one, which is worth knowing before somebody flips it.

## Retention and deletion, as the code actually behaves

There is no automatic purge of student data. The 400-day retention in
`lib/command-checks.js` covers command-center metrics, not student records.
Student progress is kept until somebody deletes it.

Deletion is real and it cascades. `db.pragma('foreign_keys = ON')` is set, and
`students`, `progress`, `attempts` and `sandbox_programs` are all declared
`ON DELETE CASCADE` from their parents, so `DELETE FROM classes WHERE id = ?` in
`routes/teacher.js` removes the class, its students, and their work.

Deactivating a student is deliberately not deletion: `active = 0` keeps the
gradebook history, which is the correct default for a grade record and the wrong
answer for a deletion request. Both paths exist. The page has to describe the
difference, because a district will ask about exactly this.

## What this leaves for a human

1. Whether Raptive and Clarity keep running on authenticated student pages. That
   is ad revenue against district sales, so it is Tanner's call and not a patch.
   The cheapest version is adding `my-progress` and `join` to the gate, which is
   a handful of pages and close to no revenue.
5. The broken CSA and CSP arms of the ad gate, which is a bigger number than
   anything else on this list and has nothing to do with districts.
2. The Clarity masking setting, which lives in the Clarity dashboard.
3. The site-wide contact form on `/pages/my-progress`.
4. Whether `/policies/privacy-policy` gets reconciled with whatever the new page
   says. Two pages on one domain disagreeing is the failure this audit exists to
   prevent.
