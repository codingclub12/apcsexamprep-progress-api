# Student data privacy page, and two claims that did not survive checking

Board 325, claimed as claim 240. 2026-09-14.

## Why this ran

An email to a district was about to go out with two sentences in it: nothing is
sold or shared, and students cannot enter an email address. The ask was to
confirm both and then turn the reply into a reusable page, because three
districts had asked the same question in a week and Katy ISD's reviewer needed
something to point at.

Neither sentence held as written. The page was built anyway, from what is
actually true, which is what the ask was really for.

## What changed

New, all in this repo:

    content/student-data-privacy.json          canonical data, the only place copy lives
    scripts/build-student-data-privacy.js      renders it into one Matrixify page row
    smoke/student-data-privacy.js              8 rules
    smoke/student-data-privacy-mutation.js     11 mutations, each aimed at one rule
    scripts/build-teacher-bundle-privacy-link.js  appends the link to 4 bundle products
    docs/student-data-privacy-audit.md         the measurements, re-derivable
    matrixify/student-data-privacy-pages.csv                       the page sheet
    matrixify/teacher-bundle-privacy-link-products.csv             the product sheet
    matrixify/teacher-bundle-privacy-link-ROLLBACK-products.csv    the undo

In the theme repo, one branch, `claude/footer-student-data-privacy-link`: seven
lines in `sections/footer.liquid` adding the footer link.

NOTHING IS LIVE. The sheets are generated and not imported, and the theme PR is
open and not merged. That ordering is deliberate and the runbook below says why.

## Evidence

Everything live was fetched through `lib/storefront-fetch.js` with no
User-Agent, per the repo rule.

The two answers:

- Eight third-party services load on every student-facing page measured,
  including `/pages/my-progress` and `/pages/join`. One of them, Raptive, is an
  advertising network. The site's own `/policies/privacy-policy` already names
  Raptive and already carries a "Right to Opt out of Sale or Sharing for
  Targeted Advertising" heading, so the email would have contradicted a page on
  the same domain.
- The student ACCOUNT collects no email, in the schema rather than by policy.
  The SITE has five email inputs on a lesson page, and the marketing popup posts
  to Klaviyo with `user_role` defaulting to the string `student`. A signed-in
  student never sees that popup: the gate reads `apcse_token` and the path
  blocklist covers `my-progress`, `gradebook` and `/pages/join`. The site-wide
  contact form is not suppressed and is reachable while signed in.

Checks, all offline and all green:

    npm run smoke:privacypage            8/8 rules
    npm run smoke:privacypagemutation    11/11 mutations caught by the INTENDED rule
    npm run smoke:encoding               54 passed, 0 failed
    npm run smoke:volumepaths            clean
    node scripts/build-student-data-privacy.js --check    sheet matches canonical

Theme side, run in the clone: `verify:nav-role` passes, `verify:ad-gate` passes
all 17 cases. `verify:csa-slides` fails with MODULE_NOT_FOUND on a CLEAN tree
too, so it is a missing dependency in the clone rather than anything this branch
did.

## What was learned, and the parts worth keeping

**A vendor scan that parses `src=` attributes is not a vendor scan.** The first
pass over the rendered page found `faves.grow.me` and reported no ad network,
because AdThrive assembles its host in JavaScript: `'https://' + w.adthrive.host`.
Nothing in an attribute, nothing in the scan. The finding that changes the whole
answer was invisible to the obvious method, and the corrected probe matches
vendor idioms anywhere in the body.

**"Loaded" and "shown" are different questions, and only one of them can be
answered from HTML.** The theme has a real ad gate in
`snippets/apcs-entitlement.liquid`. Reading the served markup says AdThrive is on
every page, which is true and not the point. Running the gate says who actually
sees an ad. The theme ships its own harness for this, `scripts/verify-ad-gate.js`,
and reusing its extraction against a maximally entitled student is what produced
the table in the audit doc. Reading the regex would have got the same answer, but
by luck: executing it is what makes the answer evidence.

**The gate's CSA and CSP arms match no live handle.** It looks for
`ap-csa-unit-(\d+)` and `ap-csp-course-bi(\d+)`; the live pages are
`ap-csa-lesson-1-1-intro-algorithms` and `ap-csp-big-idea-2-data`. So a student
whose teacher paid sees ads through all of CSA and all of CSP, and only cyber
works. That is a bigger number than the thing this task was about, it is money so
it is not mine to change, and it is written up in the audit rather than fixed.

**The mojibake constants in the mutation harness became real mojibake.** CLAUDE.md
warns about exactly this and the first cut did it anyway: the escapes resolved to
characters on the way into the file, `smoke:encoding` went red, and the harness
that tests the mojibake rule was itself corrupt. They are built with
`String.fromCharCode` now and the file is checked for non-ASCII. The guard caught
its own tooling, which is the argument for having it scan the repository.

## Still open, and every one of these is a human's

1. **Whether Raptive and Clarity keep running on authenticated student pages.**
   Ad revenue against district sales. Adding `my-progress` and `join` to the gate
   is the cheap version and is close to no revenue. This decides which
   advertising section the page renders: flip `student_pages_ad_free` in the
   canonical JSON, regenerate, re-import.
2. **The Clarity masking setting**, which lives in the Clarity dashboard and
   cannot be read from here. Clarity records the DOM, and the DOM on
   `/pages/my-progress` carries a student's name and their scores. Nobody should
   tell a district what Clarity sees until someone has opened that dashboard.
3. **The broken CSA and CSP ad gate**, above.
4. **The site-wide contact form on the student progress page.**
5. **Reconciling `/policies/privacy-policy`** with the new page. Two pages on one
   domain disagreeing is the failure this whole task exists to prevent.

## Runbook, in order, and the order matters

1. Read the page copy. It discloses an advertising network on student pages,
   which is a business statement and not a copy edit.
2. Decide item 1 above. If ads come off student pages, flip the flag and
   regenerate before importing anything.
3. Import `matrixify/student-data-privacy-pages.csv`. One page, one row.
   Expected end state: `/pages/student-data-privacy` returns 200.
4. Verify live before going further. The footer link 404s until this page exists.
5. Merge the theme PR. That IS the deploy; the footer link is live within a
   minute.
6. Import `matrixify/teacher-bundle-privacy-link-products.csv`. Four products,
   append only. Expected end state: each bundle description ends with the block
   and every one is 638 bytes longer. If it reads wrong, import
   `...-ROLLBACK-products.csv` and the four descriptions go back byte for byte.
