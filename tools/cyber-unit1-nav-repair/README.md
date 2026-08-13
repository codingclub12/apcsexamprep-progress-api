# AP Cybersecurity Unit 1: nav repair and exam rebalance

One-off remediation pass against Shopify **Pages** (Admin GraphQL `page` / `pageUpdate`,
field `body`). Nothing here touches themes, products, or redirects, and nothing here is
part of the progress API runtime.

## State: dry run complete, writes NOT applied

`backup/` and `diffs/` at the repo root hold the evidence. No `pageUpdate` has been called.

## What it does

**Task A, nav normalization on 10 pages.** Two generations of the hand-maintained
`<div id="ucnav">` block are in circulation. On the 10 old-generation pages, `ucn-l3` and
`ucn-l4` have their `href` and `title` cross-swapped (1.3 points at the 1.4 lesson and vice
versa), the `ucn-s4` steps aim at retired legacy handles, and the step containers are
`<span>` where the new generation uses `<div>`. The transform rewrites the lesson anchors,
forces all 25 step links to the canonical table, revives greyed-out steps, and converts the
containers, while preserving each page's own `open` and `current` state.

**Task B, exam answer key rebalance on `ap-cyber-unit-1-exam`.** The key was 3 A / 11 B /
5 C / 1 D, so bubbling all B scored 55 percent. Seven questions have their options reordered
to reach 5/5/5/5. No question or option wording changes; options move and their letters are
rewritten, along with the distractor feedback labels and two explanation sentences that name
letters.

## Layout

| file | role |
|---|---|
| `lib-nav.js` | canonical topic table, legacy handle list, nav block locator |
| `transform-nav.js` | Task A transform, spliced in by index |
| `assert-nav.js` | Task A assertions 1 to 9 |
| `transform-exam.js` | Task B transform, answer key plus option reorder |
| `assert-exam.js` | Task B assertions |
| `run-all-dry.js` | entry point, runs both dry runs |
| `apply.js` | write phase, refuses to run without a token and `--confirm` |
| `targets.json` | the 10 target handles |

## Running

```
node tools/cyber-unit1-nav-repair/run-all-dry.js     # rewrites diffs/, writes nothing remote
```

Originals are read from `backup/`, so the dry run reproduces offline with no API access.
Generated bodies land in `.work/new/` which is not committed.

## Design notes

The nav block is located by counting `div` depth only, so the same locator works on the old
generation (whose `ucn-steps` container is a `<span>`) and the new one. Edits are spliced by
index and attribute values are rewritten in place, so attribute order and per-page whitespace
survive untouched. That is what lets assertion 9, "body outside the nav block is unchanged",
hold byte for byte.

Greyed-out steps are discriminated on the inline `opacity` style rather than on tag name,
because a page's own `current` step is also a `<span>`. The two pages carrying greyed steps
do not agree on CSS spacing (`opacity:0.4` versus `opacity: 0.4`), so the match is
whitespace insensitive. A literal string match misses all 12 on `ap-cyber-unit-1-lesson-2-lab`.

Two checks guard the transform beyond the listed assertions: it is a byte-level no-op when
run against the known-good reference page `ap-cyber-unit-1-lesson-3-exercise-1`, and it is
idempotent on all 10 targets.

## Apply phase

`apply.js` re-fetches each page and refuses to write if the live body has drifted from the
backup, then writes one page at a time and re-asserts against what Shopify actually stored.
It needs `SHOPIFY_SHOP` and `SHOPIFY_ADMIN_TOKEN`. Without a token the writes have to go
through the Shopify MCP tool, one `pageUpdate` per page, using the bodies in `.work/new/`.
