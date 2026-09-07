# Weekly course blog publish, 2026-09-07

## What ran

Scheduled weekly blog publish. `node scripts/blog.js validate` passed clean, 144
posts. `node scripts/blog.js due 2026-09-07` returned 40 handles, since due is
cumulative (`publishOn <= on`), not this-week-only. Cross-referenced the four
course blogs' live articles (fetched by handle via the Shopify connector's
`graphql_query`) against the due list: 36 of the 40 were already live from prior
weekly runs. Four were genuinely new.

## Published

All four via `node scripts/blog.js emit <handle>` piped verbatim into
`articleCreate` (blogId added, nothing else changed by hand), then verified live:

| Handle | Blog | Article ID | Verify |
|---|---|---|---|
| `ap-csa-college-credit-what-score` | ap-csa | `gid://shopify/Article/595853344983` | ok, 83/83 chunks |
| `ap-csp-ai-policy-create-task-nuance` | ap-csp | `gid://shopify/Article/595853377751` | ok, 105/105 chunks |
| `ap-cybersecurity-careers-at-22` | ap-cybersecurity | `gid://shopify/Article/595853410519` | ok, 89/89 chunks |
| `ap-networking-it-career-without-degree` | ap-networking | `gid://shopify/Article/595853443287` | ok, 115/115 chunks |

Live URLs: `https://www.apcsexamprep.com/blogs/<blog>/<handle>`.

## Bug found and fixed before the fourth publish

Read the emitted JSON for `ap-networking-it-career-without-degree` before mutating
(routine sanity check, not a scripted step) and found two sentences ending mid-word
in a bare `</p>`, immediately after "as" and after "wage of" — the BLS stat figures
that were supposed to follow were missing entirely.

Root cause: `lib/blog-house.js`'s `p(text)` helper took a single argument and
silently dropped everything after it. Several posts build a paragraph as
`H.p('lead-in text, ', H.stat(value, {...}), ', trailing text')` so the stat value
and everything after it vanished, leaving a truncated but well-formed sentence.
`npm run smoke:blogcontent` (588 checks) did not catch it, because nothing in that
suite compares rendered word count against the source call graph.

Fixed `p()` to accept and join all arguments:

```js
function p(...parts) { return `<p>${parts.map(raw).join('')}</p>`; }
```

Confirmed: word count for the networking post went from 3204 (broken) to 3371
(fixed) via `words()` on the rendered body. Re-ran `npm run smoke:blogcontent`
after the fix: still 588/588 passing, so the fix did not regress anything the
suite checks. Re-emitted and republished the networking article with corrected
content (the version in the table above); `blog.js verify` against the live page
confirms all 115 prose chunks match the source, none missing.

## Scope of the bug beyond today

Grepped `content/blog/*.js` for the exact pattern that triggers it
(`', H.stat(` — a plain-text argument followed by a comma then a stat call, the
signature of the paragraph getting truncated). Nine other files carry it, none due
yet:

```
2026-09-15-ap-networking-units.js
2026-09-22-ap-networking-salary.js
2026-10-06-ap-cybersecurity-cisco.js
2026-10-06-ap-networking-networkplus.js
2026-10-13-ap-cybersecurity-certifications.js
2026-10-13-ap-networking-college-credit.js
2026-10-20-ap-csp-study-guide.js
2026-10-27-ap-csp-digital-divide.js
2026-11-03-ap-csa-final-review.js
```

No action needed on these now. The fix lives in the shared renderer, so every one
of them renders correctly the next time `emit` or `plan` runs against it, whenever
it comes due. Confirmed already-published posts are unaffected: the three other
handles published today (CSA, CSP, cyber) use `H.p(H.stat(...))` (single argument)
or a template literal (`` `${H.stat(...)} text` ``, also single argument after JS
evaluates it) rather than the multi-argument form, so they were never at risk.
Did not audit the 36 previously-published posts beyond today's three for this
specific pattern; that is a narrower, separate check if it turns out to matter
(`smoke:blogcontent` passing on all 144 posts both before and after this fix is
reassurance but not that specific proof).

## Board

Filed and closed #261 (`H.p() renderer drops all args after the first: truncates
multi-stat blog paragraphs mid-sentence`), locked `api:lib/blog-house.js` for the
edit, released after committing.

## Artifact

Commit on `claude/confident-euler-j7kwyf`, PR against `main` (draft, per the
session's standing PR convention), containing the `lib/blog-house.js` fix and
this run note. Will merge once the offline smoke suite is green, per this repo's
"Claude Code merges its own PRs once CI is green" convention, since the change is
outside the live API's runtime path (grepped: nothing under `server.js`/`routes/`
imports `blog-house`, only `scripts/blog.js`, `lib/blog-validate.js`,
`lib/blog-verify.js`, and `smoke/blog-content.js` do) so there is no production
deploy risk from merging.

## What is still open

Nothing from this run. All four due-and-unpublished posts are live and verified.
The nine other affected source files will render correctly whenever they come due,
with no further action needed unless someone wants to spot-check the 36
already-published posts for the same historical truncation, which this run did
not do.
