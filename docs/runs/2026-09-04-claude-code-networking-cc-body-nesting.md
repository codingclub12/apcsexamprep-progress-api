# 2026-09-04 claude code: I imported a rendered page as a page body

## What happened

Board 232, step 2. The sheet that repoints the AP Networking Command Center at
the gated file endpoint was generated from the wrong thing, imported, and made
the live page roughly twice its proper weight for about fifteen minutes.

The gate transformation itself was never wrong. What was wrong was the input.

## The mistake, in one sentence

`scripts/networking-cc-gate-files.js` read the page through
`lib/storefront-fetch.js`, which returns the RENDERED page, and Shopify's Body
HTML field holds only the fragment the theme drops inside its `rte` wrapper.

    real stored body      50,162 bytes
    what I shipped       407,527 bytes

So the import nested a whole document inside the page, and the theme wrapped it
again.

    page before          407,265 bytes    1 head, 1 body, 1 BreadcrumbList, 3 Shopify.theme
    page after           761,823 bytes    3 heads, 3 bodies, 2 BreadcrumbList, 6 Shopify.theme
    page after the fix   407,528 bytes    identical to before, plus 263 bytes of gate code

The duplicate `BreadcrumbList` is the part that would have cost something
lasting. It is rich-result eligible, and this is a page we care about ranking.

## The repo already said not to do this

`CLAUDE.md`, in the storefront-fetch convention: "The CSV generators go through
`scripts/extract-live-body.js`, which throws on the challenge body." That script
exists, its header explains exactly this problem, and it was written after
somebody else hit a version of it.

I read that section during this same session. I used it as evidence for a
different point, about bot management and browser User-Agents, and did not carry
it across to my own generator ten minutes later. Reading a convention is not the
same as applying it, and this is what the gap costs.

## Why every check I had said the import was fine

Seventeen live assertions passed after the bad import. Zero Drive folder links,
44 student links intact, 26 ids resolving against the server manifest, the
patched script block parsing, the page rendering. All true. All beside the
point, because not one of them looked at the SHAPE of the body.

The parse-back validator was worse than silent. It asserted:

```
ok('  still carries "BreadcrumbList"', body.includes('BreadcrumbList'));
```

`BreadcrumbList` is theme-level structured data. It lives in the rendered
document and never in a page body. So that assertion could only pass on a body
that was wrongly a whole document. It was not merely failing to catch the bug,
it was confirming it, and it went green on 30 of 30.

The same shape appeared twice more the same day: the preflight's three refusals
on the bad sheet (250K cell, two uncompilable script blocks) were themselves
artifacts of the oversized body, and I filed them as "pre-existing, not mine"
after proving they also occurred on the live page. The proof was sound and the
conclusion was wrong, because the thing I compared against was the rendered page
in both cases. The corrected sheet's preflight reads `clear to import`.

## What changed

- The generator now REFUSES an input carrying `<!doctype`, `<html`, `<head>`,
  `</body>` or `</html>`, and its error names `extract-live-body.js` as the fix.
  Verified by feeding it the exact rendered page that caused this: it refuses
  and writes no file.
- The validator's `BreadcrumbList` assertion is replaced by its opposite. A body
  must NOT contain document furniture, asserted per tag.
- `imports/2026-09-04e/networking-command-center-pages-FIX.csv` is the correct
  sheet, 50,425 chars, parse-back 34 of 34.

## Evidence

Live, after the corrective import, compared field by field against the
pre-import snapshot:

```
metric                BEFORE       NOW     verdict
bytes                 407265    407528     ok (+263 gate code)
real </head>               1         1     unchanged
real </body>               1         1     unchanged
<html                      1         1     unchanged
BreadcrumbList             1         1     unchanged
Shopify.theme              3         3     unchanged
drive folder links        26         0     26 -> 0
drive refs total          70        44     70 -> 44
```

One thing worth recording so the next session does not chase it: a naive
`/<head[\s>]/` count reads 2 on this page and always has. The second is prose
inside a script comment ("ads.min.js is async in `<head>`"). I raised it as a
possible residual fault before checking, and the pre-import snapshot settled it
in one comparison. Compare against a baseline rather than against an
expectation.

## What is still open

Board 232 is NOT closed. Steps 1 and 2 are done and live: the server gate, and
the page no longer publishing any teacher folder. Step 3 is not started and is
Tanner's: the 26 Drive folders are still shared anyone-with-link, so the gate's
302 hands an entitled teacher a permanently public URL, and anyone who copied
one before today still has it. That is the only step that revokes them, and it
breaks every copied link including the buyer on order #1219, so it goes last.

## The lesson worth keeping

A check written against a broken artifact will certify the breakage. Both guards
that failed here were written while looking at the rendered page, so both
encoded "the body is a whole document" as the expected state. Mutation testing
catches this when the mutation is in the CODE. It does not catch it when the
wrong thing is in the INPUT, and nothing in this repo's convention set currently
does either. The cheapest defence is the one added here: assert the shape of the
artifact, not only its contents.
