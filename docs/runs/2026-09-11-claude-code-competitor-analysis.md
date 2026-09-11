# Competitive analysis against CodeHS, Project STEM and Code.org

Board task 312, claimed as claim 229 with a lock on
`api:docs/competitor-analysis-2026-09.md`.

## What this was

Tanner sent a screenshot of a competitor-analysis prompt and nothing else. Read
as a request to run it against this business rather than to save the prompt
somewhere. The work arrived as an upload with no board item, which is exactly the
case CLAUDE.md names, so a task was created and claimed before any file was
touched.

## What changed

One new file, `docs/competitor-analysis-2026-09.md`. No code, no live systems, no
storefront writes.

## The finding that matters

apcsexamprep.com is on neither College Board endorsed provider list. The AP CSA
page names 13 organizations, the AP CSP page names 28, and we are on neither.
That is where a department head starts in August, so it is a distribution problem
sitting upstream of every content and SEO item on the board.

The counterpart is AP Cybersecurity, where **no endorsed provider list exists
yet**. College Board's own adopt page for the course names no curriculum
providers at all. That window is open now and closes when they publish one.

## Evidence

Live, today, through `lib/storefront-fetch.js` and the digest:

- 562 active classes, 1,397 active students, 2,832 score events in 24h. August
  audit had 393 and 940, so the growth is real.
- `/pages/pricing` answers 404. Board task 215 is a report against that URL.
- `/pages/for-teachers` answers 404. Named the biggest content gap on 2026-08-26,
  still not shipped.
- Homepage meta description is still the student exam-prep sentence quoted in the
  August audit. Two courses named, four taught.
- Four teacher bundles at $249, free CSA Unit 1 preview at $0.00, from
  `/products.json`.
- `routes/teacher.js` registration takes email, password, name, school and returns
  a token immediately. No verification, no PD prerequisite. That beats all three
  competitors on time-to-first-class and no page says so.

Competitors, fetched and cited in the document itself.

## What I could not establish

- **Project STEM's site is hard-blocked to us.** 403 from the fetch tool and from
  bare curl, on both hosts and both paths tried. Everything about them in the
  document is from College Board's listing and secondary sources, and it is
  labelled that way. Their onboarding and dashboard were not seen.
- **No competitor publishes a price.** CodeHS shows four tiers and no dollar
  figure. The one district quote found was a subset-font PDF that would not
  extract with the tooling available in this container. Price comparisons in the
  document are structural, not numeric.
- **Two CodeHS sources contradict each other** on whether autograding and
  real-time progress tracking are free. The document claims only the overlap the
  two sources agree on, and says why. A comparison page must not be built on the
  contested half.
- **No Search Console.** Still step zero, still unconnected. The document says
  what our pages say, not what they earn.

## Open items

- The endorsement application process is documented on neither AP Central page.
  Finding out what it is means asking College Board.
- `/pages/pricing` 404s while something points at it. Board 215.
- Task 312 is closed with this document as the artifact. The three recommended
  tests are not board items yet, deliberately: two of them are decisions about
  where to spend a term, and that is Tanner's call rather than a patch.
