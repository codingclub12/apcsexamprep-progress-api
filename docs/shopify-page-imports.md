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

Entities in ordinary markup are MOSTLY fine: a `&rarr;` in a button decodes to
the arrow that was meant.

**`&lt;` and `&gt;` are the exception, and this sentence used to say they were
not.** They do not decode to a character, they decode to SYNTAX. On 2026-09-06 a
sheet round-tripped this page body unchanged except for one removed attribute:

```
sent   : IT Help Desk &lt;helpdesk@rivertonl1b.org&gt;
stored : IT Help Desk <helpdesk></helpdesk>
```

The decode produced `<helpdesk@rivertonl1b.org>`, the parser read it as a tag
with `@rivertonl1b.org` as an attribute, dropped the attribute and closed the
element. The address was deleted. That page is a phishing exercise and the
lookalike domain is the question, so this was not cosmetic: `rivertonl1b.org`
with a 1 for the l, against the real `rivertonlib.org` three lines above it.

The transform, derived by diffing one 40825 character import against its result,
is DECODE ONCE, PARSE AS HTML, RE-SERIALIZE. That is why `&amp;` survives (10 of
10 did: it decodes to `&`, which serializes back to `&amp;`) while `&lt;` does
not.

So to keep a literal `<` in displayed text, send `&amp;lt;`. It survives the one
decode as `&lt;`, parses as a text `<`, and is stored as `&lt;`.

The other hazard below is still real and different: an entity a script needs to
still BE an entity afterwards.

## The read you verify with can be a minute behind

`/pages/<handle>.json` is served through Shopify's own page cache. Its etag says
so: `page_cache:<id>:PageDetailsController:<hash>`. A query string does not bust
it, because the cache keys on the path.

Measured 2026-09-06: an import landed at 21:51:33Z and that endpoint served the
PRE-import body for about a minute afterwards. The trap is the second half.
`updated_at` is the obvious way to ask "did my write land", and it arrives inside
the same stale response, so it agrees with the stale body instead of exposing it.
A verifier saw an old body and an old timestamp corroborating each other and
reported that a successful import had not run. The operator re-imported on that
advice.

The two read paths have OPPOSITE defects, which is why neither alone settles it:

| | `pages/x.json` | rendered page |
|---|---|---|
| freshness | can lag ~1 min | current |
| fidelity | the stored bytes | Cloudflare rewrites addresses |

So use the json for bytes you will write back, and the rendered page to prove
those bytes are current. `lib/storefront-fetch.js` has `pageBodySettled()` for
the cheap version (poll until it stops moving) and `decodeCfEmails()` for reading
an address out of the rendered copy, without which a live check on a page
carrying an address can only ever say "absent".

**A disagreement must say which it is.** Never report "the import did not land"
from the json alone. `scripts/verify-frq-entity-repair.js` exits 2 STALE rather
than 1 FAILED when the rendered page already shows the change, and its harness
proves all three exits are reachable.

## Verify a body rewrite by comparing the WHOLE body

Predict the stored result before importing, commit the prediction, and diff the
whole thing afterwards. A marker check cannot see damage it was not told to look
for, and a body rewrite can damage anything. The gate for that same import
asserted two markers, printed LIVE CLEAN, and reported four independent kinds
agreeing, on a page that had just lost the address.
`scripts/verify-frq-entity-repair.js` is the shape that would have caught it.

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
