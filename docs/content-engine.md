# The weekly course blog

Four posts a week, one per course, published live without human review.

That last clause is the whole reason this document exists. Everything here is
downstream of one decision: the posts go live automatically, so the controls
that would normally live in a person's judgement have to live in code instead.

## The cadence

| | |
|---|---|
| Volume | 4 posts a week, one each for ap-csa, ap-csp, ap-cybersecurity, ap-networking |
| Day | Tuesday, 14:00 UTC, mid-morning US Central |
| Destination | `/blogs/news/<handle>` for all four courses |
| Queue | `content/editorial-calendar.js`, 12 weeks planned at a time |
| Posts | `content/blog/*.js`, one file per post |

All four courses publish into the `news` blog rather than into their own. The
daily-practice blogs are drip content and a different genre; splitting a weekly
series across four blogs would give it four URL namespaces and no coherence.
Course separation is carried by tags, which is what tags are for.

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

- **Exactly one h1 in the body.** Article pages on this theme render no h1 at
  all: the Dawn article template does not emit `article.title` as a heading.
  Measured 2026-08-18 against a live daily-practice article and a live pillar
  guide, both returned zero h1 tags. Post bodies therefore carry their own.
  Note this is backwards from `/pages/`, where the board tracks a three-h1
  defect. Do not copy a page pattern into an article.
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

## Publishing

`lib/blog-publish.js` mirrors `lib/csa-exercise-publish.js` deliberately. Same
three safety properties: never overwrite, all-or-nothing on validation, scope
checked first and reported in a sentence. There is no force flag. Adding one
would defeat the only control standing between a generated draft and a reader.

Re-running is a no-op: a handle that already exists is skipped, never updated.
That means a post corrected by hand in the Shopify admin will not be silently
reverted by the next run.

To correct a live post, edit it in Shopify, then bring the repo file into line
so the next person reads the same thing the reader does.

## Running it

```
node scripts/blog.js validate           # the gate, over everything
node scripts/blog.js list               # what is written, and for when
node scripts/blog.js queue              # calendar slots with no post yet
node scripts/blog.js preview <handle>   # rendered HTML to /tmp
node scripts/blog.js publish --dry-run  # what would go live today
node scripts/blog.js publish            # publishes what is due
```

`.github/workflows/weekly-blog.yml` runs `validate` then `publish` every
Tuesday, and always prints the authoring backlog to the job summary so an empty
queue is visible a week before it becomes an empty Tuesday.

**Required Actions secrets:** `SHOPIFY_SHOP` and `SHOPIFY_ADMIN_TOKEN`. The
token needs `write_content`. The analytics connector token only reads, so it
will not work here and the publisher says so explicitly rather than failing
once per post.

## Writing a post

1. `node scripts/blog.js queue` and take the next slot for the course.
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
