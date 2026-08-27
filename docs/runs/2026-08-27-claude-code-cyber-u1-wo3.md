# "Unit 1 is wrong?" and it was: Topic 1.1 realigned to the CED

2026-08-27, Claude Code. WO-3 from the AP Cyber Unit 1 handoff. A teacher at
Watchung Hills, fresh off Rutgers AP Cyber training, mailed in with that subject
line. A second teacher at her school had reached the same conclusion
independently. The AP Cybersecurity Topic 1.1 lesson taught a legacy cyber
taxonomy that appears zero times in the CED effective Fall 2026, and pulled the
Unit 2 tactic list into a Unit 1 topic that names exactly two tactics.

Unit 1 is the free preview unit. This page is what a prospective teacher reads
first, and it is in front of live classes now.

## What the CED actually says, and what the page said

Topic 1.1 names two tactics, intimidation and urgency, and three victim impacts,
1.1.C.1 personal information, 1.1.C.2 secure information, 1.1.C.3 malware or a
malicious link. That is the whole topic.

The page taught eight attack types organised by delivery channel and the six
Cialdini principles of influence, and it graded students on both.

| What the page presented as assessed | Where it actually comes from |
|---|---|
| phishing, spear phishing, whaling, vishing, smishing, baiting, quid pro quo | nowhere in the CED |
| authority, consensus, scarcity, familiarity, pretexting | CED Topic 2.1, a different unit |
| social proof, liking, reciprocity, commitment | Cialdini, not the CED at all |
| intimidation, urgency | correct, and one card out of the eight |

`ced_audit.py` on the live body: 218 off-CED exact matches, 73 wrong-unit, and
`elicitation` missing entirely. Six of the ten graded CFU items keyed to
vocabulary the exam does not use. The exam-strategy card told students to
"eliminate by channel first: phone call means vishing, text message means
smishing." That is the wrong reflex taught as the exam technique.

## What shipped

`lib/cyber-u1-topic11-ced.js` is an 18-entry splice table over the live body.
`scripts/cyber-u1-topic11-ced-csv.js` fetches the page, applies it, gates the
result and writes a one-row Matrixify sheet. The body is 218 KB and most of it,
the sticky `#ucnav` rail with its script, the page CSS, the slide embed, the
grading engine, the lesson nav strip, was correct and expensive to reproduce.
Anchors are exact strings that must occur exactly once; the build aborts rather
than splicing at a guessed offset.

| Region | Before | After |
|---|---|---|
| Exam Focus box | classify by delivery channel, phishing vs spear phishing | five bullets, each citing its EK |
| EK coverage table | six rows, 1.1.B.1 missing, B.2 and B.3 merged | all eight EKs, one row each |
| 1.1.2 | six Cialdini cards | intimidation and urgency, each with its 1.1.B mechanism, plus a labelled Unit 2 preview |
| 1.1.3 | "8 Attack Types: Know All of These" | the eight terms the CED actually uses in 1.1 |
| 1.1.4 | "Attack Types In Depth", 21 KB, the largest source of the damage | the three victim impacts in depth, then the old vocabulary under a not-assessed banner |
| 1.1.5 | eight attack types crossed against Cialdini principles | tactic reference and impact reference, four answers each |
| 1.1.6 | three real cases read as "textbook whaling" | same three cases read on tactic and impact |
| 1.1.8 | predict, then eliminate by channel | predict, then name tactic, impact and what the adversary gains |
| 1.1.9 | "channel is always your first filter" | run the tactic test twice, classify the impact by what was handed over |
| 1.1.10 | six "what is the difference between X and Y" for off-CED pairs | CED questions, plus two that answer the old searches honestly |
| CFU 1 to 10 | six keyed to off-CED vocabulary | all ten keyed to 1.1.A, 1.1.B and 1.1.C |

The off-CED vocabulary was **not deleted**. It carries the page's search traffic
and the words are real outside the exam, so it sits below a banner that says
plainly it is not assessed, and every "on the AP exam, classify as..." directive
inside it was rewritten. A banner promising a section is not assessed, above copy
that tells students how to use it on the exam, is worse than either half alone.

## Live defects found while in there

None of these was the assignment. All three were sitting in the region being
rebuilt.

**Section D never closed.** A previous edit left an instruction comment in the
body:

```html
<!-- Phishing block: <div class="attack-block" id="atk-phishing"> -->
```

The `<div>` inside that comment is not markup, so `section-d` had no matching
close tag and browsers auto-closed it. It also means `validate_csv.py`'s
`div_balanced`, which counted raw `<div` against `</div>`, failed a page that was
structurally sound. The rebuilt section closes properly and the comment is gone.

**Eight jump links pointed at nothing.** That comment was a TODO telling a future
editor to add `id="atk-phishing"` and seven more to the cards. Nobody did. The
overview grid links to all eight anchors and not one of them existed in the DOM.
`injectAnchorIds()` adds them for real.

**The exit ticket rendered twice**, once between the FAQ and the author box and
again before the bottom nav, with slightly different wording in the two answer
keys. One copy removed, the survivor rewritten to CED content.

The stale byline the handoff called out (`Last Updated: March 2026` on a page
edited in August) turned out to be on the page **twice**: the meta bar and the
author box, which said "Content last reviewed and updated: March 2026". Both now
read August, and the gate fails the build if either comes back. The same byline
bug is live on 1.2 and 1.5, which are WO-4 and WO-6.

## Evidence

`ced_audit.py` against the live body and against the sheet's body:

| Signal | Before | After |
|---|---|---|
| OFF-CED exact matches | 218 | 60 |
| WRONG-UNIT | 73 | 30 |
| MISSING EK | elicitation | none |
| DOM nesting errors | 1 unclosed `div` | 0 |
| MCQ key balance | B, C, C, C | A, D, C, B |

The distinct off-CED **term** count went up, from seven to ten, and that is
deliberate: the new copy names tailgating, credential stuffing, rainbow tables
and deepfakes once each, in a sentence saying they are not in the CED. Every one
of the 60 remaining hits was read in context. Zero sentences in the sheet now
pair an off-CED term with exam or classification guidance, which is the check
that matters, not the count.

Both gates pass. `tools/ap-cyber-ced/validate_csv.py` returns PASS with the
expected off-CED warning. The build script's own gate adds what a CSV-only gate
cannot know: that the preamble above `#apcyber-wrapper` is unchanged byte for
byte, that all ten CFU widgets survive with matching ids, feedback blocks and
buttons, that every matching key has a partner, every sort answer names a real
bucket and every cloze answer is in the word bank, that all eight EKs are cited,
and that the sheet introduces no non-ASCII codepoint the live page did not
already carry.

## Two corrections to the handoff tooling

Both were false failures on a page that was fine. The scripts are vendored at
`tools/ap-cyber-ced/`, because WO-4 through WO-8 are not done and a tool that
lives in a zip gets rebuilt from memory by the next session.

- `div_balanced` counted tags inside HTML comments. Comments are stripped first
  now. A severed tag still fails; that was tested by deleting one `</div>` from
  the passing sheet and confirming the gate rejects it.
- `activity_nav_start` and `activity_nav_end` only accepted
  `APCYBER-ACTIVITY-NAV-*`. Exercise, lab and quiz pages use those. Lesson pages
  use `APCYBER-LESSON-NAV-*`. Either is accepted now.

## Imported and verified live

Imported 2026-08-27. `updated_at` moved to `2026-08-27T11:38:26-05:00`. Verified
against `https://www.apcsexamprep.com/pages/ap-cybersecurity-unit-1-social-engineering.json`
and against the rendered storefront page, not against the sheet.

`ced_audit.py` on the LIVE body returns exactly what the sheet predicted:
off-CED 60, wrong-unit 30, and no MISSING EK line at all. 48 of 48 post-import
assertions pass: tag balance with comments stripped, zero DOM nesting errors,
all ten CFU widgets with their buttons and feedback blocks, every matching pair
resolving in both directions, every sort card naming a real bucket, every cloze
answer in its word bank, all eight `#atk-*` anchors existing, all eight EKs
cited, the enrichment banner present, the sticky rail and grading script and
lesson nav intact, no March 2026 anywhere, and the exit ticket rendering once
instead of twice. The rendered page returns 200 and contains none of Cialdini,
"Attack Types In Depth" or March 2026.

### Shopify normalises the body on save, in two ways

The stored body is 556 bytes shorter than the sheet, which looks alarming and is
not. Normalising both sides for it leaves a 31 byte difference, and that is the
second normalisation:

- **HTML entities are decoded to characters.** `&#9733;` is stored as a star,
  `&bull;` as a bullet, `&ldquo;` as a left quote. This does not undermine the
  pure-ASCII authoring rule; it vindicates the reason for it. The rule protects
  the transport, which is where the 2026-08-07 mojibake incident happened. The
  decode itself is clean: zero double-encoded sequences in the live body, and
  the stored non-ASCII inventory is exactly the expected set (smart quotes,
  em-dashes in preserved copy, bullets, the nav arrows, and the six zero-width
  spaces that are the six cloze blanks).
- **A newline is inserted** after a block element that opens directly onto an
  inline child, so `<div class="atk-desc"><strong>` comes back as
  `<div class="atk-desc">` newline `<strong>`.

Neither changes rendering. Both are worth knowing before WO-4 through WO-8,
because a byte comparison against the sheet will always "fail" and the check
that means something is a comparison after entity normalisation.

## Still open

- **WO-2's lab sheet is still unimported**, from the previous session.
- **The theme auto-reverts button and title colors on save.** The `.cfu-submit`
  background rule survived this import intact, so it did not bite here, but it
  is still worth a human eye on the live page before the next one.
- **The 1.1 exercises and lab still use the old framing** in places the audit
  counts as low. They are downstream of this page and worth a re-read once this
  lands.
- **WO-4 through WO-8 are untouched.** WO-7, the Unit 1 exam, is the graded
  artifact at the end of the free preview and is the next one worth doing.
- **No reply has been sent to the reporting teacher.** She also asked about the
  10 to 12pt slide-deck body text, which no work order covers.

## What was learned

The handoff scoped WO-3 as one contaminated section plus four small fixes. It was
not. The taxonomy was the page's spine: the vocabulary section, the quick
reference, the exam strategy, the FAQ and six of the ten graded items were all
built on it, and fixing only "Attack Types In Depth" would have left a page that
contradicted its own banner four sections later. The off-CED count told the truth
about severity and lied about location.

The other lesson is that a naive tag count is a gate you cannot trust on pages
that have been edited by hand. The live page looked structurally broken to
`validate_csv.py` for a reason that was not a defect, and it really was broken
for a reason the gate could not see, which was the same comment. Strip comments
and count, then parse the result properly. The DOM check that found zero
unclosed tags is worth more than the tag arithmetic that found one.
