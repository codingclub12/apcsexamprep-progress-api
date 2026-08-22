# Shipping a page body to Shopify

Read this before editing anything in `shopify/*.html` that is listed in
`scripts/page-body-csv.js`. It is short because it is mostly one trap and one
verification, and both of them cost a live student page on 2026-08-22.

## The trap: Shopify decodes entities in the body it stores

A page body is not stored verbatim. Shopify decodes HTML entities on save, and
it does so **inside `<script>` too**. So this, written in the repo:

```js
esc(s) { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;'}[c])); }
```

comes back out of the store as:

```js
esc(s) { return String(s).replace(/[&<>"]/g, c => ({'&':'&','<':'<'}[c])); }
```

An identity map. The escape function returns its input unchanged, on pages that
write student names and class names into `innerHTML`. That shipped on the join
page and was found only by reading the body back.

**Build entities from parts.** Never write one as a JavaScript string literal:

```js
var A = '&';
return String(s).split(A).join(A + 'amp;').split('<').join(A + 'lt;');
```

`my-progress.html` has always done this. Now `join.html` does too, and
`scripts/page-body-csv.js` refuses to build a sheet for a page that carries an
entity as a JS string literal, so this cannot ship again silently.

Entities in ordinary markup are fine: a `&rarr;` in a button decodes to the
arrow that was meant. The hazard is only an entity a script needs to still BE an
entity afterwards.

## What Shopify also does, harmlessly

- Reflows a little markup. It inserted a newline before a closing `div`.
- Decodes numeric and named entities in text, which is what you wanted anyway.

Both are handled by `renderable()` in `scripts/page-body-csv.js`, which
normalises **both sides** before comparing. That function decides whether a page
is already in sync, so a gap in it is not cosmetic: for a long time it knew only
`&ndash;` and `&mdash;`, which meant `join.html` (shipping a `&rarr;`) could
never compare equal to its live copy and would have been re-imported forever. A
check that always says "differs" is the same as no check.

## Verifying an import, with no admin token

This is the part worth knowing. You do not need Shopify credentials to prove
what the store actually holds:

```
node scripts/live-pages-dump.js /tmp/live.json "my-progress=My Progress" "join=Join a Class"
node scripts/page-body-csv.js /tmp/out.csv --only my-progress,join --live /tmp/live.json
```

`live-pages-dump.js` fetches the public rendered page and recovers the stored
body from it (`scripts/extract-live-body.js`), which reproduces it byte for
byte. The second command then tells you the answer in one line:

- **"every selected page already matches the live body"** means the import
  landed and is byte-correct.
- a written sheet means it did not, and the sheet is what fixes it.

Titles must come from a real Admin API read, never from the sheet being checked,
or the title guard is circular.

## The full loop

1. Edit `shopify/<page>.html`.
2. Build the live dump (above), then build the sheet with `--live`. It refuses
   on entity-in-JS, mojibake, em-dashes, a missing handle, a title mismatch, and
   it drops pages already in sync.
3. Import the CSV through Matrixify (Import, Pages). It REPLACES the whole body,
   so anything edited in the Shopify admin since the last sync is lost. The
   already-matches check is what tells you whether that is a real risk.
4. Re-run step 2. It must say every page already matches.

Step 4 is not optional. The escaper defect passed steps 1 through 3 without a
complaint from anything: it is invisible in the repo, in the sheet, and in
review, and exists only after the round trip.

## If you have an admin token

`npm run publish:studentpages` does the same thing directly, with a snapshot and
a read-back verify, and skips Matrixify entirely. It needs `SHOPIFY_SHOP` and
`SHOPIFY_ADMIN_TOKEN` with `write_content`. As of 2026-08-22 no such token
exists, which is why the Matrixify path above is the live one.
