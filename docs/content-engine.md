# The weekly course blog

Twelve posts a week, three per course, each course in its own blog, published
live without human review.

That last clause is the whole reason this document exists. Everything here is
downstream of one decision: the posts go live automatically, so the controls
that would normally live in a person's judgement have to live in code instead.

## The cadence

| | |
|---|---|
| Volume | 12 posts a week: 3 each for ap-csa, ap-csp, ap-cybersecurity, ap-networking |
| Days | Monday, Wednesday, Friday, 14:00 UTC -- one track a day, not all 12 at once |
| Destination | one blog per course, see the routing table below |
| Queue | `content/editorial-calendar.js`, 12 weeks x 4 courses x 3 tracks |
| Posts | `content/blog/*.js`, one file per post |

### Routing

| Course | Blog | Path |
|---|---|---|
| ap-csa | `ap-csa` | `/blogs/ap-csa/<handle>` |
| ap-csp | `ap-csp` | `/blogs/ap-csp/<handle>` |
| ap-cybersecurity | `ap-cybersecurity` | `/blogs/ap-cybersecurity/<handle>` |
| ap-networking | `ap-networking` | `/blogs/ap-networking/<handle>` |

The mapping is `COURSE_BLOGS` in `lib/blog-validate.js`, and the validator
refuses a post whose `blogHandle` disagrees with its course. Keeping it in one
place means a post cannot be filed in the wrong blog by a typo, and moving a
course is a one line change rather than a sweep through `content/blog`.

Note what is deliberately NOT in that table: `ap-csa-daily-practice` and
`ap-csp-daily-practice`. Those hold the daily drip questions, a different genre
on a different cadence. Filing weekly guides in among 429 practice items would
bury them.

### The three tracks

Three posts a week for one course is enough volume that "what do we write
about" stops being answerable one topic at a time. Left as a flat list it
drifts, and the blog reads like a feed rather than a body of work. So each
course runs three parallel tracks and publishes one from each, every week.

| Track | Publishes | What it is | How it earns |
|---|---|---|---|
| `brief` | Monday | What changed and what it means. News pegged. | Ranks for a while, then decays. The reason to visit today. |
| `concept` | Wednesday | One idea taught properly. Evergreen. | Ranks for years, widest search volume, often beyond AP students. The compounding one. |
| `drill` | Friday | Practice and method. Worked problems, exam mechanics. | Ranks least, converts best. Somebody searching how to practise is already committed. |

The ratio is the point. Only concept posts builds traffic that never converts.
Only drills builds a site nobody discovers.

Each track lands on its own day rather than all twelve posts going out
together. A Tuesday dump of four courses' worth of new pages at once reads
as a spam burst, both to a returning reader and plausibly to a crawler;
spreading brief/concept/drill across Monday/Wednesday/Friday keeps a steady
weekly presence instead. Each post's `publishOn` in `content/blog/*.js` is
computed from its week anchor in `WEEKS` (`content/editorial-calendar.js`)
offset by its track: brief is the week's Monday, concept its Wednesday,
drill its Friday.

`brief` posts are made of pegs, and pegs decay. A peg written in August is a
claim about August. Re-verify before writing and rewrite the slot if it has gone
stale, rather than publishing on a dead hook. This matters most on the two
Career Kickstart courses, where College Board is still publishing detail.

## Why the posts are JavaScript and not Markdown

A post is a module exporting `{ meta, body }`, built from the components in
`lib/blog-house.js`. That looks heavier than Markdown until you ask how a
statistic gets onto the page.

In Markdown, a number is characters. Nothing can tell the difference between a
figure somebody verified this morning and a figure a model produced confidently
from memory. With components, a number reaches the reader only through `stat()`
or `sourceNote()`, both of which refuse to render without a source and an as-of
date, and the validator scans the finished prose for any figure that got there
another way.

This is the single most important property of the pipeline. A wrong College
Board statistic, published live on a site whose entire value is being right
about College Board exams, is the expensive failure. Everything else in the
gate is hygiene.

## The gate

`lib/blog-validate.js` refuses the **whole batch** if any post fails, including
posts that are written but not yet due. A broken post that is live is worse
than a post that is late, because the live one is what gets indexed and
forwarded to a class.

What it enforces, and why each one is there:

- **Zero h1 in the body.** The Dawn article template DOES emit
  `article.title` as `<h1 class="article-template__title">`. It is easy to
  measure wrong: the Liquid writes it across several lines, so a naive
  single-line `grep '<h1[^>]*>'` finds nothing and looks like the theme
  renders no h1 at all. An earlier version of this engine measured it that
  way, had post bodies carry their own h1, and shipped the AP Cybersecurity
  post live with two h1 tags for about ten minutes before the live page was
  checked properly and it was caught. `meta.title` is the h1; the target
  keyword is checked against `meta.title`, not against anything in the body.
  This is backwards from `/pages/`, where the board tracks a three-h1 defect
  from the opposite mistake. Do not copy a page pattern into an article, and
  do not copy an article pattern into a page.
- **Unsourced figures in prose.** The rule above, enforced. The escape hatch is
  `meta.allowedInlineNumbers`, for cases where a number restates something
  already sourced visibly on the same page, such as an FAQ answer repeating the
  exam weightings from a cited table. Use it for restatement, never for a new
  claim.
- **SEO title 30 to 62 characters, meta description 110 to 158.** Outside those
  ranges Google truncates or rewrites, and a rewritten description is a
  description you did not write.
- **Target keyword in the h1, the SEO title, the opening 150 words, and at
  least one h2.** Placement, not density.
- **At least 1,500 words, 4 h2 sections, 3 internal links, 3 FAQ entries.**
- **Valid FAQPage JSON-LD**, generated from the same array the visible FAQ
  renders from, so the two cannot disagree.
- **A CTA block and an author bio block.** The bio is the E-E-A-T signal and is
  not optional on a site competing with College Board itself.
- **No em-dashes, no en-dashes.** Repo convention, from CLAUDE.md.
- **No trace of the retired 10-unit CSA curriculum.** Also repo convention, and
  the failure mode is a model reaching for pre-2025 training data.
- **No email addresses.** Zero PII posture.

## Publishing without a token

At twelve posts a week, publishing by hand is not an option, and a raw
`SHOPIFY_ADMIN_TOKEN` in GitHub Actions turned out not to be either: the
Shopify custom-app token flow has a documented history of not working for
this account (see `docs/runs/2026-08-18-claude-code-csa-exercise-golive.md`,
which hit the identical scope problem for the CSA exercise-page publisher a
day earlier and never actually resolved it). So this does not run as a plain
CI job with a secret. It runs as a scheduled Claude Code session that already
has a write-capable Shopify connection through the account's Shopify
connector, the same one used to create the four course blogs and move the
launch posts into them.

That still needs the same safety properties a token-based publisher would
have needed, and they still live in code rather than in the session's
judgement, because an unattended agent freehandedly constructing Shopify
mutations from a prompt is exactly the failure mode this design avoids:

- **The session never types or reconstructs a post.** `scripts/blog.js emit
  <handle>` and `scripts/blog.js plan [date]` are the ONLY source of the
  JSON handed to `articleCreate`. Both call `articlePayload()` in
  `lib/blog-publish.js`, the same function a token-based publish would have
  used, so there are not two implementations of what an article looks like
  on the wire to drift apart. The session's job is to pass that JSON through
  to the connector's `graphql_mutation` tool, not to build it.
- **Validated before anything is planned.** Both commands run the full
  `lib/blog-validate.js` gate first and refuse to emit an invalid post.
- **Never overwrite.** The session checks live handles with a `graphql_query`
  before creating anything, exactly like `lib/blog-publish.js`'s
  `liveHandles()` did for the token path. A handle that already exists is
  skipped.
- **Verified after every write**, not assumed from a 200. `scripts/blog.js
  verify <handle>` takes the live rendered page on stdin and diffs it against
  the repo source: exactly one h1 (the theme's own, see the h1 rule above),
  every prose chunk present, FAQ schema present. This is
  `lib/blog-verify.js`, extracted from the manual Python check run by hand
  during the first publish so the unattended session runs the identical
  check every week rather than improvising one. Covered offline by
  `smoke/blog-content.js`, which pins the exact tag-gluing bug that check
  had on its first version as a regression test.

### The publish Routine

A Routine, cron `0 14 * * 1,3,5`, fires a fresh Claude Code session every
Monday, Wednesday, and Friday. Fresh, not a resumed conversation: this
repo's standing rule is that sessions are disposable and state lives in the
repo and the ledger, not in a chat (`docs/where-jarvis-lives.md`), and a
publish job that depended on one particular conversation staying alive for
twelve weeks would quietly violate that the first time the conversation
didn't survive. The Routine's prompt is the full procedure, self-contained,
since a fresh session has no memory of this one.

It has to be created through the claude.ai Routines UI, not the
`create_trigger` tool: the first attempt via `create_trigger` (recorded as
`trig_01SQ1u5W29s4jUJNbsVj39tc`) returned an explicit warning that its API
path cannot attach the account's Shopify connector to a session it
schedules, and the UI's routine-creation flow is the only place that
exposes a connector picker at creation time. That original, connector-less
Routine was retired once the UI-created replacement existed and could
actually publish.

The Routine's prompt covers:

1. `git pull`, then `node scripts/blog.js validate`. Stop and report if red.
2. `node scripts/blog.js due` for today's date.
3. `graphql_query` the four course blogs for their ids, and the live articles
   in each, to find which due handles are already published. Skip those.
4. For each remaining due post: `node scripts/blog.js emit <handle>`, then
   `graphql_mutation` an `articleCreate` with that JSON verbatim plus the
   `blogId` from step 3. No editing the payload in between.
5. Fetch each newly created article's live URL and pipe it to
   `node scripts/blog.js verify <handle>`. A verify failure is reported, not
   silently accepted.
6. Write a run note under `docs/runs/` recording what published and the
   verify output, and commit it. That note is the artifact CLAUDE.md's third
   rule asks for.

Re-running is still a no-op by construction: step 3's live check means a
retried or re-fired week skips whatever already made it out.

### Correcting a live post

Edit it in Shopify, then bring the matching file in `content/blog/` into line
so the next person reads the same thing the reader does. Nothing here
overwrites automatically, so a hand correction is never reverted by the next
Monday, Wednesday, or Friday run.

### If a token-based path is ever wanted instead

`lib/blog-publish.js` still exists and still works as a self-contained
publisher: `publish()` validates, checks the `write_content` scope up front
and says so in a sentence rather than failing per post, never overwrites, and
creates via a plain `SHOPIFY_SHOP` / `SHOPIFY_ADMIN_TOKEN` token, same as
`lib/csa-exercise-publish.js` does for pages. Nothing about the Routine
depends on it being wired up, and nothing stops someone from adding a CI
workflow that calls `node scripts/blog.js publish` later if a token ever does
end up working cleanly for this account. It just is not the path this repo
runs on.

## Running it

```
node scripts/blog.js validate           # the gate, over everything
node scripts/blog.js list               # what is written, and for when
node scripts/blog.js queue              # calendar slots with no post yet
node scripts/blog.js preview <handle>   # rendered HTML to /tmp
node scripts/blog.js emit <handle>      # one post's ArticleCreateInput as JSON, no blogId
node scripts/blog.js plan [date]        # every due post's payload, one JSON line each
node scripts/blog.js verify <handle>    # diff live HTML (stdin) against the repo source
node scripts/blog.js publish --dry-run  # token path only, see above
node scripts/blog.js publish            # token path only, see above
```

## Writing a post

1. `node scripts/blog.js queue`. It prints week health first, because a short
   week is easy to miss inside a 140 slot backlog and is the thing worth
   reacting to. Take the next slot for the course and track.
2. **Re-verify the news peg.** Pegs decay. A peg written in August is a claim
   about August, and publishing on a dead hook is worse than publishing nothing.
   If it has gone stale, rewrite the slot rather than forcing the post.
3. Copy the nearest existing post in `content/blog/` for structure.
4. Every figure goes through `stat()` or `sourceNote()`. If you cannot find a
   source, cut the figure. A post is not improved by a number you had to guess.
5. `node scripts/blog.js validate` until it passes.
6. Commit. The workflow publishes it on its `publishOn` date.

## What this engine is not

It does not write posts. Authoring is a session with a person or an agent in
it, and the calendar is the handoff between the two. Anything claiming to
automate the writing as well would be automating the one step where being wrong
is expensive and being fast is worth nothing.
