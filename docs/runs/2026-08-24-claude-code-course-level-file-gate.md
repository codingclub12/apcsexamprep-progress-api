# Course-level teacher files: the seven the first pass could not see

2026-08-24, Claude Code, branch `claude/gate-course-level-files`.

## What was wrong

The answer-key gate shipped and reported success: 439 teacher files gated on
`csp-command-center` and 327 on `ap-csp-teacher-resources`, zero answer key URLs
left in either page. That was true and it was not the whole page.

Seven paid teacher files were still published as working CDN links on **both**
pages:

| id | file |
| --- | --- |
| `fd1cadaa7ec869f7` | START HERE |
| `9e97d07fe404561c` | How To Use This Course |
| `98156158465540e3` | Pacing Guide Year Long |
| `b64f93ca69ddb82b` | Pacing Guide Semester Block |
| `cf58832f272f4ef4` | Create Performance Task Pack |
| `6b54f09388177c31` | Big Idea 2 Data Project |
| `1f2d4ae432032c9e` | Innovation Investigations |

None of them is an answer key, which is why the key-focused checks stayed green.
All of them are Teacher Bundle material and all of them were anonymously
downloadable.

## Root cause

`scripts/build-file-manifest.js` collected teacher files by looking for keys
**named** `teacherFiles`. These seven do not live under that key. They sit in
`courseResources`, a bare `[{href,label}]` list, and are re-referenced by
`projects`, which is `[{name,days,when,href}]`.

This is the second time a name-based rule missed files. The first time it was
`bigIdeas -> exam -> teacherFiles`, five Big Idea exam keys, and the fix was to
add the missing path. Twice is a pattern, so the rule was inverted rather than
extended: the builder now collects by **shape**, meaning every Shopify file href
anywhere in the tree, unless it sits inside `studentFiles`. A name-based rule
only ever knows about the names somebody remembered.

The Command Center made it worse than a missing manifest entry. Two renderers
printed these hrefs directly and neither went through `fileBtn`, so neither was
touched by the first pass. The `courseResources` renderer had **no entitlement
check at all**: a signed-out visitor was handed working download links for paid
material, with none of the `unlocked`/`FREE_BI` handling the rest of the page has.

## What changed

- `scripts/build-file-manifest.js`: collect by shape. Plus a shrink guard, which
  refuses to write a manifest that drops any id the previous one held, because
  dropping an id silently un-gates that file. The guard was proved to fire by
  rebuilding from the already-gated live page (which carries `api:` ids, not
  URLs): refused, manifest left intact.
- `seed/csp-teacher-files.json`: 439 -> 446 entries. 222 answer keys unchanged,
  0 lost.
- `scripts/gate-course-level-files.js`: new. The incremental pass. Gates whatever
  manifest URLs REMAIN on a page and leaves already-gated ids alone. Handles both
  pages. On the Command Center it also routes the two raw renderers through a new
  `fileAttrs` helper, so an `api:` href becomes a `data-file` button that the
  delegated listener already on the page picks up.
- The two first-pass scripts are annotated as superseded. They assert a pre-gate
  body (222 keys present, `fileBtn` unpatched, one script block to add) and are
  kept as the record of what was imported, not as tools to re-run.
- `smoke/file-gate.js`: section 11, and the manifest count assertion moved from
  439 to 446 with the reason written down.

## Evidence

```
node smoke/file-gate.js            73 passed, 0 failed
npm run smoke:assertions            6 passed, 0 failed
npm run smoke:answerkeys           13 passed, 0 failed
npm run smoke:pageimportguard      18 passed, 0 failed
```

Generated sheet, verified by parsing it back out of the CSV:

| page | bytes | teacher URLs left | ids in page | unresolvable | student URLs |
| --- | --- | --- | --- | --- | --- |
| csp-command-center | 129,793 | 0 | 446 | 0 | 334 |
| ap-csp-teacher-resources | 80,050 | 0 | 334 | 0 | 222 |

The Command Center's single inline script block still parses (112,764 chars,
checked with `new Function`).

Pre-change snapshots are committed at
`shopify/page-snapshots/*.before-course-level-gate.html`, taken from the live
bodies via the Admin API. They are what the smoke suite asserts against, so if
one is ever overwritten with an already-fixed body every assertion under it
stops meaning anything, and section 11 says so.

## Order this has to happen in

1. Merge and deploy. The API resolves ids out of `seed/csp-teacher-files.json`,
   so until the 446-entry manifest is live the seven ids are unknown to
   production and would 403 for everybody, paying teacher included.
2. Then import the sheet.
3. Then click one of the seven while signed in as an entitled teacher.

Import before deploy and the seven links break for the people who paid for them.

## Still open

Rotating the `_k7q2m9` suffix. Nothing in this repo can fix a URL somebody
already copied: Shopify CDN files are public by construction, so the old URLs
keep returning 200 until the files are re-uploaded under a new suffix. These
seven have been publicly linked for longer than the answer keys were, on two
pages, one of which had no gate of any kind. The rotation should cover all 446,
not just the keys, and it has to come after a confirmed teacher download so the
gate is known good before the URLs move.

## Verified after the import, 2026-08-24 19:37Z

Both pages imported. Checked through the Shopify Admin API rather than the
storefront, because a throttled storefront read returns a truncated page and has
twice today produced a confident wrong answer.

| page | updatedAt | bytes | byte-exact vs sheet | ungated teacher URLs | answer key URLs | gated ids | unresolvable | student handouts |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| csp-command-center | 19:37:38Z | 129,793 | yes | 0 | 0 | 446 | 0 | 334 |
| ap-csp-teacher-resources | 19:37:38Z | 80,050 | yes | 0 | 0 | 334 | 0 | 222 |

Every id in both pages resolves against the deployed manifest, so no link
renders as a dead 403 for a teacher who paid for it.

The deploy that carried the 446-entry manifest is `ff27475`, confirmed to
contain `272d691` by `git merge-base --is-ancestor`. It took roughly 90 minutes
from merge to live, well past the 30 to 50 minute lag seen earlier the same day,
and several later PRs deployed with it.

### The sweep, which is the part that is easy to skip

Gating one page closed nothing the first time. The same keys were published on a
second page found only by sweeping the sitemap. So the seven were swept for
across the whole storefront, not just the two pages that were fixed:

```
pages                                 1180 checked   0 hits   0 unverifiable
products, collections, blog articles   715 URLs, sweep still running at commit time
```

A short or throttled response counts as UNVERIFIABLE and is retried up to three
times, never as a clean result. Absence of the string is only evidence when the
document actually arrived, and that distinction is the whole reason the numbers
above are worth reading.

## Still open, and it is the only thing left

Rotating the `_k7q2m9` suffix, across all 446 files rather than the keys alone.
Nothing in this repo can fix a URL somebody already copied: Shopify CDN files are
public by construction, so the old URLs keep returning 200 until the files are
re-uploaded under a new suffix. These seven were linked publicly on two pages for
longer than the answer keys were, and one of those pages had no gate of any kind.
