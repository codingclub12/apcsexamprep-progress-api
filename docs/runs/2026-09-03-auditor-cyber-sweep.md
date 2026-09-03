# 2026-09-03 Auditor sweep: AP Cybersecurity, five items from Tanner

Read-only sweep. No edits, no merges, no verification marks, no Matrixify sheets
generated. All live claims re-derived against apcsexamprep.com and
progress.apcsexamprep.com at run time (2026-09-03, run started ~14:10 UTC).

STATUS: COMPLETE, all five items covered. See ranked summary at the end of this file.

## Instrument note 0: lib/storefront-fetch.js does not exist in the checked-out
tree

The task instructions say to use `lib/storefront-fetch.js`. It does not exist on
`main` or on the branch checked out here (`claude/script-nesting-code-blocks-mzo7kp`,
HEAD `2264d033`, same commit as `origin/main`). It exists ONLY on unmerged branch
`origin/claude/ceo-agent-setup-sv4e61` (commits `07ee4f3`, `9467b3b`, both dated
2026-09-03, i.e. today, not yet merged). Read via
`git show origin/claude/ceo-agent-setup-sv4e61:lib/storefront-fetch.js` (read-only,
no checkout/merge performed).

That file's own header claims bot-management INVERTED today: a browser User-Agent
now gets 403, and sending NONE (curl's own UA) gets 200, measured on 3 pages / 2
rounds by whoever wrote that commit. This directly contradicts the general
guidance ("every request needs a browser User-Agent or Cloudflare answers 1010").

I re-tested this myself, live, right now, from this environment (which egresses
through a pre-configured agent proxy):
- `curl` with no UA override: 200, real body (has `Shopify.theme` x3,
  `/cdn/shopifycloud/` x7)
- `curl -A "Mozilla/5.0 ... Chrome/126"`: ALSO 200, ALSO real body, same 2
  markers present, same byte length (374851), different md5 (a per-render nonce,
  not a challenge)

So from THIS vantage point, both work. I cannot confirm the unmerged commit's
403-on-browser-UA claim under my own network path (proxy may present a different
IP/fingerprint than wherever that commit's author tested from). Treating this as
UNRESOLVED, not adopting either rule blindly: I verify every fetch against the
same two positive markers that file uses (`Shopify.theme`, `/cdn/shopifycloud/`)
and the challenge-title negative (`Verifying your connection`) regardless of which
UA got me there, single-threaded, ~1s between requests. Any body failing that
check is reported as UNREADABLE, not as page content.

**UPDATE, later in this same run:** re-tested 4 more times through my own
`fetch.js` wrapper (identical curl invocation, just wrapped in a function) and
the picture flipped from the paragraph above: browser UA scored 403 (the bot
challenge, 8249 bytes, fails both markers) on all 4 tries, no-UA scored 200
(real body, both markers) on all 4. Consistent, not a fluke. So the unmerged
commit's claim is CONFIRMED as of this run: **do not send a browser
User-Agent from this environment today.** The one contradicting pair of
results earlier in this note was most likely a short-lived grace window on a
first hit to a URL, not evidence the rule doesn't hold. Every fetch used
elsewhere in this report sends no UA override, verified per-body against the
same two markers. This reverses standing guidance in the top-level task
framing ("every request needs a browser User-Agent or Cloudflare answers
1010") for TODAY specifically; that guidance may again be correct tomorrow, so
re-test before trusting either rule on a future run.


## ITEM 1: VIDEOS ARE STALE (Tanner: "none are not stale")

**Method.** Fetched all 247 live pages whose handle contains "cyber" (excludes
2 CSP pages that merely mention cybersecurity in the handle) via
`/pages/<handle>.json`, single-threaded, ~550ms apart, no User-Agent override
(see instrument note 0). 247/247 returned HTTP 200 with a body that parsed as
JSON (0 challenged, 0 errors). 13.8MB fetched. Handle list derived from the live
`/sitemap_pages_1.xml`, not from a hand list, per the "hand-written list cannot
fail once" lesson already recorded in `scripts/cyber-unit-sweep.js`.

**PROVEN, re-derivable by re-running the same fetch:** the entire live AP
Cybersecurity course (247 pages) contains exactly **ONE working video embed**,
not "videos" plural:

| category | count | handles |
|---|---|---|
| Real, resolvable YouTube iframe | 1 | `ap-cybersecurity-unit-1-social-engineering` (Topic 1.1), `youtube.com/embed/ATiIze_IuJI`, title "AP Cybersecurity Topic 1.1: Understanding Social Engineering Lesson Overview" |
| Broken: literal placeholder string live in the `<iframe src>` | 1 | `ap-cybersecurity-unit-1-password-attacks` (Topic 1.2): `<iframe src="REPLACE_WITH_VIDEO_EMBED_URL" title="AP Cybersecurity Topic 1.2: Suspicious Website Logins" ...>`. This is not stale content, it is a template that was never filled in. A visitor's browser requests the literal string `REPLACE_WITH_VIDEO_EMBED_URL` as a relative URL and gets nothing. |
| Dead authoring comment, no visible element at all | 1 | `ap-cybersecurity-unit-1-ai-driven-threats` (Topic 1.4): only an HTML comment survives (`TO ACTIVATE VIDEO: Replace REPLACE_WITH_VIDEO_EMBED_URL...`). No video card, no iframe skeleton, nothing a student sees. |
| Honest "Video coming soon" text card, no iframe attempted | 11 | `ap-cybersecurity-unit-1-ai-cyber-defense` (1.5); `ap-cybersecurity-unit-2-access-controls`, `-cia-triad`, `-defense-in-depth`, `-physical-security`, `-risk-assessment`; `ap-cyber-unit-3-lesson-1`, `-lesson-2`, `-lesson-4`, `-lesson-5`, `-lesson-6` |
| No video markup of any kind (not even dead CSS triggers a card) | remaining 233 pages, incl. Topic 1.3 `ap-cybersecurity-unit-1-wireless-security`, all of Units 4-5, all exercise/lab/quiz/exam pages | — |

Topic 1.3 carries the `.slides-section`/`.lesson-video-card` CSS rule block
(dead, unused CSS, copy-pasted template residue) but has no matching HTML
element in the body at all: not even a "coming soon" card.

**Adjacent, same broken template family (not itself a video, flagging because
it changes the size of any fix and was found by the same sweep):** the Google
Slides embed that ships alongside the video slot has the identical pattern.
Only 2 of 4 pages that reference a Slides presentation ID have a real one
(`ap-cybersecurity-unit-0-course-introduction`, real deck; `...-social-engineering`,
real deck `1IZbIVy8fKpMAiphgrVW_tmaEZzma75DsYbxzuzK5sRQ`). The other 2
(`...-password-attacks`, `...-ai-driven-threats`) still carry the literal
`REPLACE_WITH_SLIDES_PRESENTATION_ID` string, live, in an `<a href>` (ai-driven-threats)
or `<iframe src>` (password-attacks).

**Load-bearing vs. decorative, per Tanner's own test ("does the page teach
nothing without it"):**
- The one real video (1.1) is a "Lesson Overview" alongside a full page of
  written concept cards, an FAQ, a vocabulary table and an EK coverage table.
  Reading the rest of the page confirms all the content the video narrates is
  also written out. **Decorative**: removing it loses a nice-to-have, not
  content.
- The 11 "coming soon" cards and the 2 broken/dead ones are **already
  decorative by construction**: nothing on any of those 13 pages depends on a
  video that has never played for a single visitor. Removing them is a
  deletion, not a rewrite, on all 13 pages the same way.
- So on Tanner's own load-bearing test, this entire feature is decorative
  everywhere it appears. There is no page where removing the video (or the
  promise of one) would leave the lesson content incomplete.

**Sheet-size estimate, if Tanner wants these removed via Matrixify (mandatory
path per CLAUDE.md).** I could not find a "58KB" or similar figure documented
anywhere in this repo (`docs/matrixify-import-rules.md` documents Excel's
32,767-char **cell** limit, a different number, and does not mention a per-push
byte ceiling), so I cannot independently confirm the exact figure given in the
task brief. Taking it as given: measured live body sizes of the 5 pages that
carry any video artifact (real, broken, or dead-comment) plus the 11 "coming
soon" pages, all 16 are already **3x to 5x** past 58KB on their own, before this
edit:

| handle | live body size |
|---|---|
| ap-cybersecurity-unit-1-password-attacks | 275,600 B |
| ap-cybersecurity-unit-1-ai-cyber-defense | 259,629 B |
| ap-cybersecurity-unit-1-ai-driven-threats | 234,241 B |
| ap-cybersecurity-unit-1-social-engineering | 211,402 B |
| ap-cyber-unit-3-lesson-1 | 197,575 B |
| ap-cyber-unit-3-lesson-6 | 197,339 B |
| ap-cyber-unit-3-lesson-5 | 189,619 B |
| ap-cyber-unit-3-lesson-2 | 195,789 B |
| ap-cyber-unit-3-lesson-4 | 186,326 B |
| ap-cybersecurity-unit-2-cia-triad | 187,328 B |
| ap-cybersecurity-unit-2-defense-in-depth | 170,158 B |
| ap-cybersecurity-unit-2-access-controls | 169,353 B |
| ap-cybersecurity-unit-2-physical-security | 166,885 B |
| ap-cybersecurity-unit-2-risk-assessment | 164,171 B |
| ap-cybersecurity-unit-1-wireless-security (no video markup, listed for contrast) | ~211,000 B (same template family) |
| ap-cybersecurity-unit-0-course-introduction | 21,916 B (only one under 58KB) |

So: **13 rows need a full-body MERGE push over whatever the real ceiling is**
(only the course-intro page is small). This is not a new problem the video fix
creates, it is the same oversized-body handling every other Matrixify push
against this course template already needs; flagging it here only so the
video-removal work order isn't scoped as if these were small pages.

**Confidence: PROVEN** for the inventory (re-derivable: refetch any handle
above and grep for the exact strings quoted). **Instrument blind spot:** this
sweep reads the stored `body_html` returned by the Shopify `/pages/<handle>.json`
endpoint, which is the authored source, not a browser-rendered DOM. It cannot
see a video injected purely by client-side JS with no server-side marker (no
such pattern was found in these 247 bodies, but I did not run a browser against
all 247; I did confirm via `grep` for `<script` blocks constructing an
`<iframe>` string and found none). It also cannot see the Shopify **product**
page for the Cyber course bundle, or blog posts, which were out of scope
("every live Cyber page" was read as the 247 `*cyber*`-handled Shopify pages).


## ITEM 4: COMMAND CENTER GATING AND ANSWER-KEY EXPOSURE

**Method.** Read `bodies/cyber-command-center.html` (fetched live, same batch as
Item 1) directly, plus `bodies/*-quiz.html` for all 27 live AP Cyber quiz
pages, plus the repo's own `scripts/one-off/verify-exam-key.js` (`auditBody`),
run against each of the 27 live bodies (not against a fixture: this is a
re-derivation from the live pages using the existing instrument, then
independently checked by hand for what that instrument cannot see). Also
fetched the external theme asset `apcs-quiz-mount.js` (see below) live from
Shopify's CDN. This directly answers task **#169** on the live board
("13 of 27 live AP Cyber quiz pages ship their answer key in page source...
Units 4 and 5 and lesson 3.6 do not, and 1.1 and 1.2 are server-scored"),
which I treated as a claim to re-verify, not a fact to repeat.

**PROVEN, and it corrects the open board item: it is 25 of 27, not 13, and
there are six shapes, not three.**

| shape | mechanism | pages | recognized by `verify-exam-key.js`? |
|---|---|---|---|
| server-scored | loads external `apcs-quiz-mount.js` (Shopify Files CDN), which POSTs the student's picks to `https://progress.apcsexamprep.com/api/quiz/submit` and only then receives `{correct, explanation}` per question. Fetched and read this file live: no answer key of any kind ships to the browser before submission. | **1.1, 1.2** (2 pages) | n/a, nothing to find |
| `var ANSWERS={"1":"C",...}` valid JSON in an inline `<script>` | strict JSON object map, question id to correct letter | Unit 2 lessons 1-5, Unit 3 lessons 1-5 (10 pages) | YES, shape `answers-object` |
| `ANSWERS={1:'C',...}` JS object literal (unquoted keys / single-quoted values), same map, either standalone or chained after `var sel={},scores={},ANSWERS={...}` | same exposure, different syntax | **1.3, 1.4, 1.5** (3 pages) | NO. 1.3 matches the tool's own `var ANSWERS` regex but fails its `JSON.parse`, so it returns `fail:["ANSWERS is not valid JSON, cannot audit"]` rather than flagging exposure. 1.4 and 1.5 declare `ANSWERS` inside a comma-chained `var sel={},scores={},ANSWERS={...}`, which does not contain the literal substring `var ANSWERS`, so the tool's regex (`/var\s+ANSWERS\s*=\s*(\{[^}]*\})/`) never matches at all and the page is reported "skipped: no key found," indistinguishable in the tool's own output from a genuinely safe page. |
| `onclick="checkMCQ('qN','LETTER','explanation')"` | correct letter as a literal button-click argument, in raw HTML | Unit 4 lessons 1-5 (5 pages) | YES, shape `check-mcq` |
| `onclick="checkQ(N,'LETTER')"` | same mechanism as above, different function name | **Unit 3 lesson 6** (1 page) | NO. The tool's `extractCheckMcq` matches the literal string `checkMCQ(`; `checkQ(` (no "M") does not match, so this page is also reported "skipped," again indistinguishable from safe. |
| `data-correct="1"` HTML attribute on each option `<button>`/`<div>` | correct flag sits on the element itself; readable from "View Page Source" alone, no JavaScript execution needed | **all of Unit 5, lessons 1-6** (6 pages) | NO. Not one of the three shapes this tool was ever built to look for; same shape used on `ap-cybersecurity-practice-exam`'s 40 MCQs (see Item 2). |

**25 of 27 = every quiz page except 1.1 and 1.2.** All 25 are public, unauthenticated
Shopify pages: I fetched every one with no login, no cookie, no entitlement
token, plain single-threaded curl, and got the real page back with the key
already in it (see Item 1's method for the fetch discipline). Task #169's
"13... Units 4 and 5... do not [expose]" is the part this corrects hardest:
**all six Unit 5 quizzes expose the key**, just via a shape (`data-correct`)
the existing checker cannot see, not because they are safe.

**Why this matters more than the raw count: the Command Center's gating is at
the wrong layer.** `cyber-command-center`'s own script gates two things
correctly: a "Unit Test Answer Keys: Teacher Bundle" Google Drive link and a
per-lab answer key (`labKeySection()`, gated on `unlocked = STATE.entitled`,
with a server round trip through `data-key-course`/`data-key-item` that
returns "Not available... The answer key is for signed-in teachers" when it
should refuse). Both are real, working gates. Separately, the page holds a
`var STU = {"1.1":{page,quiz,ex1,ex2}, ...}` map (25 entries, one per lesson,
**missing 2.5 and 4.5 entirely**, a small separate gap) and its
`studentSection()` renders each lesson's Quiz/Scenario links as plain disabled
`<span>` text unless `unlocked`, versus a clickable `<a href>` when unlocked.
**That gate controls only whether the Command Center hands out a clickable
link.** It does nothing to the destination: the quiz page at the far end of
that link has no login wall of its own, as demonstrated by fetching all 27
anonymously above. Anyone with the URL, entitled or not, gets the page and, on
25 of 27, the key. The Command Center can be made to look fully locked and
every one of these pages remains exactly as exposed as it is today.

**What renders per unit, concretely:** Unit 1 is marked "free to preview" in
copy; Units 2-5 render the same `studentSection`/`renderResources` markup but
gated on `STATE.entitled`. I read the JS source for this; I did not execute it
in a browser under each of the three visitor states (anonymous, signed-in
without entitlement, signed-in with entitlement), so I cannot independently
confirm from here that Unit 1 actually renders unlocked-by-default in a live
DOM rather than just in comment/marketing text elsewhere on the page. Flagging
under NOT MEASURABLE FROM HERE below.

**Confidence: PROVEN** for the 25/27 exposure count and the six shapes (every
one re-derivable: fetch the handle, grep the exact string quoted in the table).
**PROVEN** for the `apcs-quiz-mount.js` server round trip (fetched the live
asset, quoted its own fetch calls). **SUSPECTED, not proven**, that Unit 1
renders unlocked to an anonymous visitor in practice (JS source implies it via
`unlocked` checks elsewhere, but I did not drive a browser to confirm).

**Instrument blind spot, stated for the next sweep:** `scripts/one-off/verify-exam-key.js`
recognizes exactly three shapes and reports everything else as "skipped: no
key found," which reads identically whether a page is genuinely safe (1.1, 1.2)
or exposed through a fourth, fifth, or sixth shape nobody has taught it yet
(1.3, 1.4, 1.5, Unit 3 lesson 6, all of Unit 5). A "skipped" count from this
tool is a floor on defects found, never a ceiling, and must not be read as "the
rest are fine." This is the same shape of blind spot as the CORR-array check
inside the same file and as `/api/health`'s denominator INNER JOIN: an absence
is only evidence if the instrument could have shown a presence.


## ITEM 2: PRACTICE EXAM TOPICS AND FORMAT

**Method.** Fetched `ap-cybersecurity-practice-exam` (the flagship page,
`updated_at 2026-08-21T21:32:10`, live body 148,586 chars from
`/pages/<handle>.json`) and `ap-cyber-unit-5-practice-exam` live. Parsed every
`<div class="pq-card" data-correct="X" data-qid="N">` and its
`<p class="pq-qnum">Question N . Unit U . Topic U.L</p>` tag programmatically
(regex-parsed, 40/40 cards recovered, cross-checked against the page's own
"Section 1: Multiple Choice (40 Questions)" heading). Compared against
`docs/cyber-exam-format.md` (read 2026-08-21 from the actual CED PDF, page 147)
and confirmed independently via `apstudents.collegeboard.org/courses/ap-cybersecurity/assessment`
and `.../ap-cybersecurity` (fetched live today): 60 MCQ / 1 FRQ ("Device
Security Analysis," 50 min, Skill Categories 2-3 only) is correct and current;
College Board does **not** publish per-unit exam-weight percentages for this
course, only per-skill-category (Analyze Risk / Mitigate Risk / Detect Attacks,
25-40% each) and the 5 unit **names** (Introduction to Security; Securing
Physical Spaces; Securing Networks; Securing Devices; Securing Applications and
Data).

**PROVEN and already fixed, so do not re-order this work: the marketing-copy
format claim.** `scripts/cyber-practice-exam-truth.js` in this repo diagnoses
the page claiming "Full-Length... 40 MCQ + 3 FRQ." Checked live: none of the
old claim strings are present (`Full-Length Exam`: 0 hits, `full-length
practice exam`: 0, `simulates the AP Cybersecurity Exam experience`: 0) and the
corrected callout is live (`pq-format-note`: 6 hits, `60 multiple choice
questions`: 2, `Device Security Analysis`: 3, `50 minutes`: 3). This part of
task **#171** on the live board ("site advertises 3 FRQs and a 43-question
practice exam... CED specifies 60 MCQ and 1 free response") is **partially
stale**: the page now states the real format correctly in prose. What #171
gets right and what remains open is everything below.

**PROVEN: topic coverage inside the 40 MCQs is uneven, with real gaps.**
By CED unit: Unit 1 = 7, Unit 2 = 9, Unit 3 = 10, Unit 4 = 8, Unit 5 = 6 (of 40).
By topic, several topics carry **zero** questions while others are stacked:

    Unit 2: 2.1 has 6 of the unit's 9 questions; 2.2, 2.3, 2.4 have 1 each
    Unit 4: only 4.1 (4) and 4.2 (4) appear; 4.3, 4.4, 4.5 have ZERO
    Unit 5: only 5.4 (4) and 5.5 (2) appear; 5.1, 5.2, 5.3, 5.6 have ZERO

Re-derivable: `grep -oE "Topic [0-9]\.[0-9]" ap-cybersecurity-practice-exam.html
| sort | uniq -c` against the live body.

**PROVEN: the exam's real organizing axis, skill category, is entirely
untagged.** The CED weights Section I by Analyze Risk / Mitigate Risk / Detect
Attacks (25-40% each), not by unit. The phrase "skill categ" appears exactly 3
times on the page, all 3 inside the one prose callout describing the REAL
exam's Section II scope (added by `cyber-practice-exam-truth.js`); zero of the
40 questions carry a skill-category tag of any kind. A teacher cannot use this
page to check coverage against the axis the actual exam is built on.

**SUSPECTED, needs a human judgment call: Question 1 reintroduces the Unit
1/Unit 2 tactic-taxonomy leak that WO-1/WO-3 already fixed elsewhere.**
Q1 (Topic 1.1, correct answer B: intimidation + urgency, which is CED-correct)
offers three distractors built entirely from the Unit 2 tactic list the CED
never uses in Topic 1.1: "(A) Familiarity and consensus... (C) Scarcity and
authority... (D) Pretexting and familiarity...". `docs/ap-cyber-unit1-ced-realignment.md`
documents this exact leak (authority/consensus/scarcity/familiarity/pretexting
into Topic 1.1) as a real defect already corrected on the Topic 1.1 lesson,
exercise-2, and lab pages by name; **the practice exam page was never in that
work order list** and still carries it. Per this repo's own convention
(`validate_csv.py`: an off-CED term used only as a wrong-answer distractor is
not automatically a defect, but "a human must confirm every hit is
explanatory"), I am not calling this proven, only flagging it with full
context: it is the identical pattern already ruled a defect once, on a page
the ruling never reached.

**PROVEN: the 3 free-response practice sets do not match the real FRQ's shape,
and this is now a smaller fix than it looks, because a correctly-shaped
replacement already exists elsewhere on the site (see withdrawal below).**
Parsed all 3: each has exactly 3 lettered subparts (a)(b)(c), never the CED's
5 (A-E); each totals 8 points (3+3+2); at most one of the 6 CED evidence-source
types (firewall rule table, application log, auth log, file/permission
listing, acceptable-use policy) appears in any single one (FRQ1 "Physical
Security Risk Assessment" has none of the 6, being Unit 1-2 content with no
device-analysis shape at all; FRQ2 "Network Security Configuration" has
firewall+applog; FRQ3 has authlog only). None combines multiple sources into
one device scenario the way the real question does.

**PROVEN: 0 EK codes** in the practice-exam page's student-visible text, via
`lib/cyber-ek-density.js` (`summary()`: `total:0`). Clean on this specific
check. **Instrument blind spot to state plainly:** this checker finds literal
EK-code strings (`1.1.A.2` and similar); it says nothing about whether a
question's CONTENT matches the CED (that is the separate, topic/distractor
analysis above), and nothing about the off-CED terminology audit, which is a
different tool (`ced_audit_v2.py`) I did not run against this page in this
pass (see below).

**Format checks that PASS:** every one of the 40 MCQs has exactly 4 options
(`data-val="A/B/C/D"` count: 160 = 40 x 4, consistent). NOT/EXCEPT usage is
bolded correctly where used (1 of 1 checked: "Which of the following statements
... is <em>NOT</em> true?"). No "all of the above" / "none of the above" found.

## WITHDRAWN (found while checking Item 2, correcting a stale doc rather than
this session's own earlier claim)

**`docs/cyber-exam-format.md`'s closing line, "Still open: nothing on the site
yet practises the real Device Security Analysis shape, six sources from one
device with parts A to E," is no longer true and should not be repeated.**
Checked live: `GET /api/practice/ap-cybersecurity` (public, no auth) lists 5
"Device Security Analysis" FRQ sets (`dsa-library-kiosk`, `dsa-athletics-laptop`,
`dsa-print-server`, `dsa-greenhouse-controller`, `dsa-bluebird-studio`), each
declaring `sources:6, parts:5, subparts:14`. I fetched
`ap-cybersecurity-frq-library-kiosk` live and read its body directly (it is a
thin, 5.7KB wrapper, not a copy of the questions): its own visible copy says
"This is the whole of Section II of the AP Cybersecurity exam: one question,
six sources, fifty minutes... Parts A through E ask you to read across all of
them," and the real content is loaded client-side from
`https://progress.apcsexamprep.com/frq-player.js` via
`APCSFrq.mountById(el,"ap-cybersecurity","dsa-library-kiosk")`, with a stated
graceful fallback if that fails. This is the correct CED shape, built
separately from `ap-cybersecurity-practice-exam`, and linked from
`ap-cybersecurity-frq-practice`.

**What this changes about the finding above:** the fix for Item 2's FRQ
mismatch is not "author a six-source, five-part FRQ from nothing." That already
exists, five times over, and works. The fix is that the flagship
`ap-cybersecurity-practice-exam` page ships its own, older, wrong-shaped 3-FRQ
set instead of pointing at the correct one. **Confidence: PROVEN** that the 5
correctly-shaped FRQ pages exist and describe themselves accurately in their
own visible copy. **Not verified**: whether `frq-player.js` actually renders
the full 6-source, 5-part content in a browser right now (I read the page's own
claim about itself and the API's structural metadata; I did not execute the
player in a browser to confirm the DOM it produces matches; see NOT MEASURABLE
below).


## ITEM 3: THE STUDY/PRACTICE BREADTH GAP, CSA/CSP VS CYBER

**Method.** Same live sitemap pull as Item 1, filtered to `ap-csa` (543 live
page URLs) and `ap-csp` (334 live page URLs) handles, classified by handle
suffix pattern (grep counts, not full fetches, except for the specific hub
pages listed below which were fetched and read in full). This measures **page
existence and linking shape**, not content quality.

**PROVEN, and this is the one that matches Tanner's own words ("tests by
topic") most literally: CSA and CSP both have a dedicated per-topic practice-test
page TYPE plus a hub that lists them. Cyber has neither, at all.**

| page type | CSA | CSP | Cyber |
|---|---|---|---|
| Topic index hub (`*-topics`) | `ap-csa-topics` (exists, linked) | `ap-csp-topics` (exists, linked) | `ap-cybersecurity-topics` (exists, 49 outbound links) |
| **"Practice tests by topic" hub** | `ap-csa-practice-tests-by-topic`, links to **16** standalone `ap-csa-practice-test-<topic>` pages (2D arrays, ArrayList, boolean logic, class design, conditionals, constructors/methods, loops, math/random, primitives/casting, recursion, searching/sorting, static methods/vars, string methods, + 3 more) | `ap-csp-practice-tests-by-topic`, links to **10** standalone `ap-csp-practice-test-<topic>` pages (binary data, computing impact, conditionals/iteration, data analysis, networks/internet, parallel computing, privacy/security, procedures/lists, program design, programming fundamentals) | **No such hub page exists** (confirmed: `grep -iE "topic|by-topic" cyber-handles.txt` returns only `ap-cybersecurity-topics` and `ap-cybersecurity-test-builder`, neither of which is a by-topic test hub). **0 standalone per-topic test pages.** |
| Test-builder tool | `ap-csa-test-builder` exists | `ap-csp-test-builder` exists | `ap-cybersecurity-test-builder` exists (has some checkbox-driven interactive markup; I did not fully verify its generator logic works, only that the page exists and is not a by-topic-test archive) |
| Per-topic overview/notes distinct from exercises | Folded into the lesson/study-guide page | `ap-csp-topic-N-M-guided-notes` is its own page type, separate from `ap-csp-topic-N-M-exercise-1/2` and `ap-csp-topic-N-M-code` (3 distinct page types per topic, all present for at least Big Ideas 1-3) | Folded into the lesson page (`ap-cybersecurity-unit-N-<topicname>` is simultaneously the overview AND the notes). Not a gap in kind, just merged into fewer pages. |
| Per-lesson exercise-1 / exercise-2 | 53 / 38 | 35 / 70 | 27 / 27 |
| Standalone "quiz" page as its own type | 0 (CSA has no page whose handle contains "quiz"; assessment happens via `*-assessment-version-a` and exercise-2/debug pages instead) | 1 (`ap-csp-course-bi5-summary-quiz`) | 27 (every lesson) |
| FRQ-shaped pages | 171 (includes the 184-page-era archive from `AUDIT.md`'s 14 Jun snapshot, still the site's largest single cluster) | 0 (CSP's own exam has no traditional FRQ; this is correct, not a gap) | 8 (5 "Device Security Analysis" scenario pages + `ap-cyber-unit-1-frq-practice` + `ap-cybersecurity-frq-practice` hub + `ap-cyber-frq-device-security-analysis`) |

**Read the "standalone quiz page" and "FRQ" rows as a warning against a false
gap, not a finding.** CSA has zero pages with "quiz" in the handle and CSP has
one; that is a naming-convention difference (CSA/CSP assess via exercise-2,
debug, and assessment-version pages), not evidence Cyber is ahead there. CSP
has zero FRQ pages because CSP's own AP exam has no FRQ section; that is
correct by design, not evidence Cyber is behind CSP. Both would have been false
positives from this sweep if read as a page-count gap.

**The one gap that holds up under that scrutiny is the "tests by topic" row.**
It is the same shape on both comparison courses (a hub plus 10-16 per-topic
standalone pages) and it is the literal feature Tanner named. Building the
Cyber equivalent is roughly **20 pages**: a hub (`ap-cybersecurity-practice-tests-by-topic`)
plus one page per topic. Cyber's own topic count across its 5 units is 24-26
(1.1-1.5, 2.1-2.4ish, 3.1-3.6, 4.1-4.5, 5.1-5.6, see Item 5's manifest section
for the exact live count), so a 1:1 port of the CSA/CSP pattern would be
similar in size to what CSA/CSP already built.

**Confidence: PROVEN** for every count above (all re-derivable from the live
sitemap with the greps shown). **Instrument blind spot:** this is a handle- and
link-count sweep. It cannot see whether CSA's 16 or CSP's 10 per-topic tests
are themselves any good (question quality, CED alignment, answer-key exposure
of the kind found in Item 4); it only establishes that the page TYPE exists on
two courses and not the third.

## ITEM 5: PAGE INVENTORY VS SITEMAP

**Sources actually available to me, and one that was not.** Live sitemap:
YES (used throughout). `course_manifest` in the progress API: **partially**,
public floor only. The full Shopify page list (including unpublished/draft
pages that never reach the sitemap): **NO**, `/api/admin/*` requires
`ADMIN_KEY`, which is not present in this environment (only
`COMMAND_READ_TOKEN` and `TODO_KEY` are set, and `TODO_KEY` is scoped to the
Command Center board, not the general admin API per `lib/command-auth.js`).
This is a real, named gap, not a skipped step: **the "Shopify page list"
authority in this task's own framing cannot be reached from here.** What
follows uses the sitemap (published pages, reachable or not) and the
manifest's public floor (`/api/health`, `/api/practice/*`) instead, and says so
at each point.

**Reachability, within the 247 pages the sitemap lists as Cyber's: 247/247 load
(Item 1's method).** Zero dead links found INSIDE this set at the HTTP layer.
This does not mean zero orphans: reachable-by-URL and linked-from-somewhere are
different questions and I did not build a full internal link graph across all
247 pages x their outbound links in this pass (that is a multi-hour crawl on
its own; `SITE-STRUCTURE.md` did one on 14 Jun 2026 against a 176-page Cyber
cluster, 71 pages stale relative to today's 247, so I am not citing its specific
orphan list as current).

**PROVEN, spot-checked orphans consistent with the stale doc's general claim:**
`ap-cyber-unit-5-practice-exam` (flagged orphaned "in 1" in the 14 Jun snapshot)
is not linked from `cyber-command-center`, not linked from
`ap-cybersecurity-practice-exam` (which only self-links to
`ap-cybersecurity-practice-questions`), and not linked from
`ap-cybersecurity-topics` (checked: its 49 outbound links do not include this
handle). It is real, live, fully built (40 questions, per-lesson L5.1-L5.6
tagging), and reachable only by direct URL or the sitemap. **PROVEN** live
today, not inherited from the stale doc.

**Manifest reconciliation, floor only (no ADMIN_KEY).** `/api/health`
(public) reports 10 activities course-wide with completions but no recorded
score ("reporter gap"), 7 of them `ap-cybersecurity`: unit-2/2.4/exercise-2,
unit-3/3.1/exercise-1, unit-3/3.3/exercise-2, unit-4/4.2/exercise-1,
unit-4/4.3/exercise-1, unit-5/5.1/exercise-1, unit-5/5.1/lab. This proves those
7 manifest rows exist and are priced (a denominator has to exist for the join
to produce a row at all) and that pages for them exist and are being visited.
It says nothing about the other several hundred manifest rows, because
`lib/health-integrity.js`'s reporter check only surfaces GRADED activities with
completions and zero scores; a healthy row and a row with no denominator at all
look identical here (this is the documented blind spot from
`docs/runs/2026-09-02-claude-code-inbox-replies-and-two-blind-instruments.md`:
"an activity with no authored denominator cannot appear in it however broken it
is. It is a floor, never a total").

**PROVEN, and directly relevant to any manifest-vs-page reconciliation: two
parallel Unit 1 page sets exist for the same lessons and a denominator can only
be correct for one of them.** Confirmed live today: `ap-cyber-unit-1-lesson-N-*`
(exercise-1/2, lab, quiz) and `ap-cybersecurity-unit-1-<topic-name>` (the topic
lesson page itself) both exist, are both live, and both are reachable, for
every one of Topics 1.1-1.5. This was first documented in
`docs/runs/2026-09-02-claude-code-inbox-replies-and-two-blind-instruments.md`
as the root cause of 1.1's two-total denominator disagreement (55-66% agreement
rows); I re-confirm here only that both page sets are still live as of this
sweep, not the denominator math itself, which I could not re-run without
`ADMIN_KEY`.

**Manifest rows with no live page, or vice versa: NOT MEASURABLE FROM HERE**
without `ADMIN_KEY` or a database dump. `scripts/seed-manifest.js` and
`scripts/seed-cyber-denominators.js` describe what SHOULD be seeded but a seed
script is a floor on history, not a report of live state: rows get added by
later imports and pruned by `server.js`'s boot-time dead-CFU cleanup, neither
of which this static file can reflect. Do not treat a grep of the seed script
as the manifest.

**The Cyber practice hub Tanner wants, and where it would be linked from.**
Confirmed: no `ap-cybersecurity-practice-hub`-shaped page and no by-topic test
hub exist (Item 3). For where a new hub would be linked FROM, in the theme
repo:

- `/home/user/APCSExamPrep-theme/sections/` and `/home/user/APCSExamPrep-theme/snippets/`
  are the candidate locations for sitewide nav/header/dropdown markup (per this
  repo's own convention of centralizing nav in a theme snippet rather than
  copying it into page bodies, `SITE-STRUCTURE.md` section 5.6). **I did not
  find and cannot cite an exact file and line here**, because the theme repo's
  `sections/` and `snippets/` directories were not enumerated by handle/name in
  this pass (I read `SITE-STRUCTURE.md`, `CLAUDE.md`, and `CONVENTIONS.md` from
  that repo but did not grep its nav templates directly). The parent task's own
  framing names `apcs-dropdown-link` as the anchor class rendered sitewide by
  the theme chrome; grepping `APCSExamPrep-theme/sections/*.liquid` and
  `snippets/*.liquid` for `apcs-dropdown-link` combined with `cyber` would find
  the exact file and line, and I am flagging this as unfinished rather than
  guessing at a path. **NOT MEASURABLE FROM HERE in this pass** (ran out of
  budget after the answer-key and video sweeps; this is the one concrete
  to-do I would hand to the next session rather than speculate on).
  The nearer-term, lower-risk link point I CAN name with evidence:
  `ap-cybersecurity-topics` (49 outbound links, already the course's topic
  index and, per the stale `SITE-STRUCTURE.md`, previously a 45-in/50-out
  healthy hub) and `cyber-command-center` (the page Tanner already treats as
  the course's front door, Item 4) are the two existing pages a new practice
  hub is cheapest to add one link from, without touching theme chrome at all.


## CORRECTION to Item 5's nav-location answer (found after the section above
was written; do not use the "NOT MEASURABLE" line above for this question)

I kept looking after flagging the nav file/line as unmeasured, and found it.
Two things, in order of how I found them:

**First, a dead end worth naming so nobody else spends time on it.**
`/home/user/APCSExamPrep-theme/snippets/ap-cyber-megamenu.liquid` (and its
sibling `ap-csa-megamenu.liquid`) look exactly like the right file: a complete,
well-formed Cyber dropdown with a "COLUMN 3: PRACTICE" block at lines 148-153.
`grep -r "ap-cyber-megamenu"` across the **entire** theme repo (every file
type, not just `.liquid`) returns zero matches anywhere other than the file
itself. Nothing `{% render %}`s it. It is not in the live header. Do not patch
this file expecting it to reach a student.

**The file that actually is live:** `/home/user/APCSExamPrep-theme/sections/header.liquid`.
It has its own, different, inline Cyber dropdown markup (class names
`apcs-course-column` / `apcs-dropdown-links` / `apcs-dropdown-link`, not the
dead file's `acm-*` classes), confirmed live because it is reachable from
`layout/theme.liquid`'s standard header section and its "43 Qs" copy matches
what I fetched from the live page's own nav chrome region in Item 1's sweep.

Exact insertion point, **line 259-262**, the "PRACTICE EXAMS" mega-dropdown's
Cyber column:

    <div class="apcs-course-column cyber">
      <div class="apcs-course-header">
        <span class="apcs-course-badge">CYBER</span>
        <span class="apcs-course-name">Cybersecurity</span>
      </div>
      <ul class="apcs-dropdown-links">
        <li><a href="/pages/ap-cybersecurity-practice-questions" class="apcs-dropdown-link">Practice Questions (15 Free)</a></li>
        <li><a href="/pages/ap-cybersecurity-practice-exam" class="apcs-dropdown-link">Full Practice Exam (43 Qs)</a></li>
      </ul>

Compare to the **CSA column of the same dropdown, 24 lines above it in the same
file**, lines 236-239:

    <li><a href="/pages/ap-csa-2025-practice-mcq" class="apcs-dropdown-link">Full Exam (42 MCQ)</a></li>
    <li><a href="/pages/ap-csa-unit-tests-hub" class="apcs-dropdown-link">Unit Tests Hub</a></li>
    <li><a href="/pages/ap-csa-practice-tests-by-topic" class="apcs-dropdown-link">Tests by Topic</a></li>
    <li><a href="/pages/ap-csa-array-practice-exam" class="apcs-dropdown-link">Array Practice Exam</a></li>

**This is the breadth gap from Item 3, live, in one file, twelve lines apart.**
CSA's column has 4 links including "Tests by Topic"; Cyber's has 2. The new
Cyber practice hub (and, once built, the by-topic test hub) belongs as a new
`<li>` inside Cyber's `apcs-dropdown-links` at line 260-261, mirroring CSA's
line 238 exactly.

**Also found here, small but real: the "43 Qs" badge is live and matches Item
2's finding.** Line 261 (and the dead file's line 152, and board task #171)
all say "43 Qs" or "43-question." The live page itself organizes its own
content as "40 multiple choice questions and 3 free-response questions," never
stating "43" anywhere in its own body (checked: 0 occurrences of "43" near
"question" on the page). The nav's combined count is not technically wrong
(40 + 3 = 43) but it is not how the page describes itself, and a student
counting 40 MCQs against a nav badge promising "43 Qs" is exactly the kind of
small mismatch that erodes trust in a page that otherwise just got its format
claims corrected.

**One more nav oddity found in the same file, not chased further given time:**
the "Practice Exams" top-level trigger at line 217
(`<a href="/pages/ap-csa-practice-tests-by-topic" class="apcs-nav-link">Practice Exams`)
points at a CSA-specific page even though the dropdown it opens covers CSA, CSP
and Cyber. Likely harmless if JS always intercepts the click to open the
dropdown, and I did not drive a browser to confirm what happens on a fallback
(no-JS or slow-JS) direct navigation. Flagged, not chased.

**Confidence: PROVEN** for the file, both line ranges, and the exact live
markup quoted (re-derivable: `grep -n "apcs-course-column cyber" -A6 sections/header.liquid`
in the theme repo, and `grep -rn "ap-cyber-megamenu" APCSExamPrep-theme/` to
confirm the dead file independently). **Instrument blind spot:** I read the
`.liquid` source, which is the authored template; I did not render the theme
to confirm the dropdown opens as written in a browser, and Shopify section
settings (via the theme editor, stored outside this repo) could in principle
disable or reorder blocks without changing this file. That last possibility is
unlikely for a hardcoded inline `<li>` list like this one, but I have not ruled
it out from here.


## ADDENDUM to Item 4: the 27 lesson quizzes are not the whole graded surface

`docs/runs/2026-09-01-claude-code-cyber-unit-tests-availability.md` (2 days
old, re-verified live today rather than cited cold) established that the
**5 unit exams** (`ap-cyber-unit-{1-5}-exam`, distinct pages from the 27 lesson
quizzes above, 20 MCQ each, no login wall) are a separate graded surface. I
re-ran `verify-exam-key.js` against today's live bodies of all 5:

    ap-cyber-unit-1-exam   answers-object  20 items  EXPOSED
    ap-cyber-unit-2-exam   answers-object  20 items  EXPOSED
    ap-cyber-unit-3-exam   corr-index      20 items  EXPOSED, and STILL guessable:
                             16/20 answers are B (cap 7), "bubbling B scores 80%",
                             option D never appears. Flagged "still open" on
                             2026-09-01; unfixed as of this sweep.
    ap-cyber-unit-4-exam   check-mcq       20 items  EXPOSED
    ap-cyber-unit-5-exam   check-mcq       20 items  EXPOSED

**All 5 of 5 unit exams expose their key, same as the 25 of 27 lesson quizzes.**
Combined graded-MCQ surface across the course: 32 pages (27 lesson quizzes + 5
unit exams), of which **30 expose the answer key client-side** and only the 2
server-scored 1.1/1.2 lesson quizzes do not. This is the number that belongs
next to task #169 on the board, not "13 of 27."

**Regression check against the 2026-09-01 note (small, real improvement):**
that note found only Unit 4's hub page linked its own unit exam. Checked live
today: `ap-cybersecurity-unit-1-social-engineering` now also links
`ap-cyber-unit-1-exam` (1 hit). Units 2, 3, and 5's hub pages still do not link
their own exam (0 hits each); all 5 remain reachable only via the sitemap or
`ap-cybersecurity-complete-course-guide`.


## RANKED SUMMARY (by consequence for Spring traffic, per the assignment)

1. **Answer-key exposure, 30 of 32 graded MC pages (Item 4).** Live now, every
   day traffic exists, not just spring; worsens with every student who finds
   it. Directly gates a pricing decision per Tanner. PROVEN.
2. **Practice exam topic/format mismatch (Item 2).** The free-preview unit is
   what a teacher evaluates before adopting the course for a fall/spring term;
   an inaccurate practice exam undermines that evaluation and misleads exam-day
   planning. Cheaper to fix than it looks: correct FRQ content already exists
   and only needs connecting. Mostly PROVEN, one distractor question flagged
   SUSPECTED pending human judgment.
3. **Videos (Item 1).** Real, but the true scope is 1 working video + 4 broken
   or half-built placeholders + 11 honest "coming soon" cards, all decorative
   by Tanner's own test. Low consequence either way; cheap, low-risk cleanup.
   PROVEN.
4. **Breadth gap, tests-by-topic (Item 3).** Real, precise, and now has a proven
   home in the live nav (line 259-262 of `header.liquid`) to link from once
   built. A content-parity build, not a defect. PROVEN.
5. **Page inventory (Item 5).** The map Tanner asked for, plus one proven
   orphan and a confirmed-live nav location for the new hub. The
   `course_manifest`-vs-pages reconciliation he also asked for is the one
   piece I could not do from here (no `ADMIN_KEY`); say so rather than guess.

