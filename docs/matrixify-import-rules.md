# Writing Matrixify sheets for this store

Given by Tanner on 2026-09-02 as a handoff doc, recorded here because
institutional memory belongs in the repo. Every rule exists because breaking it
has damaged live content on this store.

`scripts/matrixify-preflight.js` enforces the checkable half. Run it on the
generated file before delivering anything:

    node scripts/matrixify-preflight.js <sheet.csv> [--expect-command MERGE]

## The rules

**Export before you import.** Do not hand-author a header row from memory,
INCLUDING from this file. Column names vary by sheet and by app version. Run a
Matrixify export limited to one known row, copy the header exactly, build
against that. This removes a whole class of silent no-op imports where Matrixify
ignores a column it does not recognise.

**Only the columns you are changing, plus `Handle` and `Command`.** A column
present in the file is a column Matrixify will write.

**`Body HTML` is destructive.** A blank cell does not mean "leave it alone", it
means "set the body to empty". One sheet that updated SEO titles across 40 pages
with `Body HTML` left in the header and blank would wipe all 40 bodies. If a
batch mixes body rewrites and metadata-only changes, split it into two files.

**Never write a live server time into `Published At`.** Use `2026-03-01` for this
store, or omit the column. A churning publish date scrambles sort order and feed
behaviour and makes an import artifact indistinguishable from a real date.

**`Command: MERGE`.** Creates the row if the handle is new, updates it if the
handle exists, touching only the columns supplied. MERGE creating a row it
cannot find is a real hazard: a typo'd handle publishes a blank record to a live
blog. The answer is not a different command, it is knowing the handles are real
before the sheet is written.

**UTF-8 WITH BOM.** `utf-8-sig`, not `utf-8`. Without the BOM the consuming tool
guesses Latin-1 and a bullet arrives on the live page as three characters.

**QUOTE_ALL, CRLF.** Page bodies here run 60K to 270K characters and contain
commas, quotes and newlines constantly. One unquoted comma splits a row.

**Cells cap at 32,767 characters.** Check before assuming a large body imported.

**Verify against the live store afterwards.** `updated_at` must have moved. If it
did not, the import was a no-op whatever the Matrixify log said. Body length
comes back slightly SHORTER, by tens of bytes, because Shopify decodes some
entities on store. A large delta is not expected.

## The two things that are not in the doc, learned by failing

The first CSA banner sheet was rejected in ONE SECOND with
"Cannot understand the uploaded file", and every row-level assertion was green.
Both defects were in the envelope, which nothing was checking.

**The sheet's own columns are NOT prefixed.** Matrixify prefixes only RELATED
entities. A Blog Posts sheet is:

    Blog: Handle | Handle | Command | Body HTML

not `Article: Handle`. The Pages generators already here
(`scripts/frq-pages-csv.js`, `scripts/lab-pages-csv.js`) write
`Handle, Command, Title, Body HTML` and import fine, which is also how the
mechanics were cleared: both quote the header and emit a BOM.

**A CSV has no tab name, so the FILE NAME is the sheet name.** Matrixify decides
what a file contains from the tab name, and for a CSV that falls to the filename.
`csa-banner-canary.csv` names nothing, so the file is rejected before a row is
read, which is why the failure carries no per-row detail. Name it
`something-blog-posts.csv`. The generators refuse to WRITE a file Matrixify would
reject, because a generator whose output cannot be imported is not a generator.

## Non-ASCII: carried, not converted

The handoff says to write HTML entities rather than raw bullets and dashes. That
is right for AUTHORED content and wrong for a body rewrite, and the difference
matters.

All 49 CSA daily-practice bodies already contain raw non-ASCII: 188 non-breaking
spaces, 235 arrows, 71 bullets, 57 em dashes. Converting them would break the
byte-preservation guarantee that makes a body rewrite safe, and would change 49
live pages beyond the one thing the sheet is for.

So a round-trip carries them unchanged and the preflight COUNTS them rather than
refusing them, so nobody mistakes them for something a generator introduced. The
BOM is what keeps them intact, which is why its check is a hard failure and this
one is a note.

Authored content still uses entities: `&bull;`, `&ndash;`, `&rarr;`, `&nbsp;`,
`&rsquo;`. Emoji are not used in page content at all; strip them rather than
encoding them.

## Ship one row first

No sheet shape should meet 49 live pages before it has met one. The canary is not
an arbitrary first row: pick the row that exercises the riskiest content, which
for these was the article carrying all five kinds of non-ASCII plus a script
block. A format guess verified by one page costs a minute. The same guess across
49 pages does not.
