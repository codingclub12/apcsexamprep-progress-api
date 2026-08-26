# AP Cybersecurity Unit 1 quiz audit, and the locking groundwork

**Date:** 2026-08-26
**Agent:** claude_code
**Ledger:** #122 (claim #30)
**Trigger:** Jukka Rauhala, AP Cybersecurity Founding Teacher Bundle Units 1-5,
order #1209 on 2026-07-27, reported that the online 1.1 and 1.2 quizzes contain
questions that do not belong to those lessons and differ from the offline quiz
documents, and asked for teacher-controlled locking so quizzes can be used as
graded assessments.

## Verdict

The teacher is right, and the online 1.1 quiz is worse than "a few stray
questions". The offline documents are correct. The slides are correct. The
Teacher Superpack is stale but is not what is on the lesson pages, so it is not
the cause.

## Which course this was

Worth recording because the first pass went the wrong way. "Lesson 1.1 and 1.2"
exists in all three courses, and CSA was audited first on the assumption that the
teacher bundle meant the CSA Unit 1 preview. The order confirms AP Cybersecurity.
Check the purchase before auditing content for a named teacher.

## Method

Page bodies were read from the Shopify Admin API (`page(id:).body`), not from a
storefront render, per the rule in `scripts/audit-quiz-keys.js`. The storefront
extraction used for the first pass was independently validated two ways before
any of it was trusted:

- `ap-cyber-unit-1-lesson-2-quiz` extracted from the storefront is byte-identical
  (md5 `95c278cb...`) to `backup/ap-cyber-unit-1-lesson-2-quiz.html`, which was
  taken from the Admin API.
- The Admin API `bodySummary` for 1.1 matches the head of the extracted body.

The final 1.1 finding below is quoted from the stored body itself.

## Finding 1: the 1.1 quiz is a unit-wide survey, not a lesson quiz

`ap-cyber-unit-1-lesson-1-quiz` (updatedAt 2026-08-01) carries five questions and
labels each one with its own topic:

| Q | page's own `q-topic` label | belongs to |
|---|---|---|
| 1 | Social Engineering | 1.1 |
| 2 | Phishing Identification | 1.1 |
| 3 | Password Attacks | **1.2** |
| 4 | AI and Cybersecurity | **1.4** |
| 5 | Wireless Security Risks | **1.3** |

Three of the five are other lessons' material, by the page's own labelling. The
`<h1>` reads "Lesson 1 Quiz: Introduction to Security", which is the UNIT name,
and the hero badge reads "Unit 1 - Lesson 1 Progress Check". It was built as a
unit sampler and is sitting in the lesson 1.1 slot.

A student who takes this after Day 2 of lesson 1.1 is being tested on three
topics they have not been taught yet.

## Finding 2: the questions are not CED-aligned at all

This is the part the teacher's report understates. Even the two on-topic
questions are not AP Cybersecurity CED content:

- Q1 tests pretexting and vishing. EK 1.1.A.2 names exactly two tactics for this
  topic, intimidation and urgency. Neither appears.
- Q3 tests the four-way brute-force / dictionary / credential-stuffing /
  rainbow-table taxonomy. The CED frames 1.2 as signs of an online password
  attack (EK 1.2.A.2), common password patterns (EK 1.2.B.1), and dictionaries
  built from gathered personal information (EK 1.2.B.2).

So the quiz pages are generic cybersecurity content that predates the CED-aligned
rebuild. The June 2026 teacher bundle is CED-aligned and cites EKs throughout;
these pages never got the same treatment.

## Finding 3: 1.2 is on topic but is a different instrument, at the wrong level

`ap-cyber-unit-1-lesson-2-quiz` is five questions, all genuinely about password
attacks, so it does not have 1.1's misplacement problem. It is still wrong for
the lesson: it tests bcrypt cost factor 12 versus MD5 at ten billion guesses per
second, SHA-256 with a username prepended instead of a salt, and password
rotation policy. That is professional security engineering, not Topic 1.2.

The offline document for the same lesson is twelve questions on the CED material,
and shares no questions with the online five.

## Finding 4: the answer key ships to the browser

The 1.1 page body ends with

    var ANSWERS = {"q1": "B", "q2": "C", "q3": "A", "q4": "D", "q5": "B"};

in plain text. Every quiz page in Unit 1 is client-scored the same way. This is
independent of the content problem and it is the reason locking is a migration
rather than a switch. See "What locking actually requires" below.

## What is NOT the cause

- **The slide decks are fine.** `Lesson_1.1_.../Slide_Decks/Day1_Deck_TEACHER.pptx`
  is 15 slides on social engineering, cites EK 1.1.A.1, 1.1.A.2 and LO 1.1.B by
  number, runs CB Scenario 1A, and names intimidation and urgency as the two
  tactics. It is correct and CED-aligned. It matches the offline quiz.
- **The Teacher Superpack is stale, but is not the leak.** It uses an older
  structure entirely: "Unit 2: Securing Spaces, Lesson 2.1 Cyber Foundations",
  LO 2.1.A-G, covering social engineering plus adversary types plus attack phases
  plus risk plus controls. None of that content appears on the 1.1 or 1.2 quiz
  pages. The stale superpack and the bad quizzes are two separate problems.

## Finding 5: the shipped student handouts have dropped CED references

Minor, but it is in a paid product. The STUDENT copies of both quizzes lose the
EK citation out of several stems where the KEY copies keep it, leaving text that
reads:

- 1.1 Q2: "According to, social engineering attacks use psychological tactics..."
- 1.2 Q6: "According to, what does an adversary attempt during..."
- 1.2 Q11: "Lists the common patterns people use when creating passwords."
- 1.2 Q9 options: "A. - trying stolen passwords leaked from an unrelated breach"

The KEY copies are complete, so this is a bug in whatever renders the student
variant. The bank seeded below uses the KEY prompts for that reason.

## What shipped in this pass

**The authoritative questions are now server-owned.**
`seed/cyber-unit-1-quizzes.js` carries the real 1.1 (9 items) and 1.2 (12 items)
sets, transcribed from the bundle KEY documents, keys verified against the
documents' own answer grids:

    1.1  A C B D A B C B D      (doc: 1-A 2-C 3-B 4-D 5-A 6-B 7-C 8-B 9-D)
    1.2  C A D B A A C C B D B D (doc: 1-C 2-A 3-D 4-B 5-A 6-A 7-C 8-C 9-B 10-D 11-B 12-D)

`serve_count` is 0 for both, so the whole pool is served. N-of-M sampling is
right for practice and wrong for a common assessment a teacher grades against a
paper copy.

The placeholder `seed/cyber-quiz-bank.js` is deleted. It was labelled lesson 1.1
and contained CIA triad and denial-of-service questions, which is Unit 2 material,
and it would have seeded that content into the 1.1 slot the first time anyone ran
the seeder. It had never been seeded to production.

**The availability gate.** New `activity_gates` table and
`classes.quiz_lock_default`, resolved at read time by `lib/activity-gate.js` and
enforced in both `GET /api/quiz/...` and `POST /api/quiz/submit`. Teacher
endpoints `POST /classes/:code/gate` and `GET /classes/:code/gates`. Default is
0 for every existing class, so nothing that works today changes. Full design and
the reasoning in `docs/quiz-locking.md`.

**Tests.** `smoke/quiz-gate.js`, 20 assertions, all passing against a local
server on a temp DB: untouched class unchanged, class default closing quizzes
with no per-activity writes, self-study staying open, opening one activity
opening only that one, and a token minted while open failing to spend after
close. Scoring regression checked separately: all-correct 1.1 scores 9/9,
all-wrong 1.2 scores 0/12.

## What locking actually requires, and why it is not done

The gate is enforced where the SERVER hands out questions. Today no cyber quiz
does:

    GET /api/quiz/ap-cybersecurity/unit-1/1.1/quiz
    {"error":"No server-scored quiz for this location"}

The questions and the answer key are in the page body. Locking such a page in the
browser is theatre and View Source defeats it, which is the same lesson
`assets/apcs-slides-gate.js` records for the CSP decks. So the gate does nothing
for Unit 1 until each quiz page is migrated onto the render path. The bank seeded
in this pass is step one of that migration for 1.1 and 1.2.

## Open, and needing a decision

1. **How the corrected questions reach the live pages.** Two routes. Either the
   quiz page bodies are rewritten with the correct questions (a Matrixify sheet,
   keeps client scoring, keeps the key in the HTML, gate still does nothing), or
   the bodies are replaced with a mount point that calls
   `GET /api/quiz/...` (smaller body change, kills the key exposure, makes the
   gate real). The second is the same amount of Matrixify work and strictly
   better. It needs the theme-side renderer, which does not exist yet.
2. **Scope.** This audit covered 1.1 and 1.2 because that is what was reported.
   1.3, 1.4, 1.5 and the other 22 cyber quiz pages have not been checked, and 1.1
   being a unit survey suggests the pattern is not isolated. 1.3 uses a third
   markup generation with no question classes at all and needs its own look.
3. **The teacher UI.** The gate is API only. Jukka can be unblocked by hand in
   the meantime, but a dashboard panel is the real answer.
4. **Reply to Jukka.** Not sent. He should hear that 1.1 is confirmed wrong, that
   his offline documents are the correct instrument to use in the meantime, and
   roughly when the pages will be fixed.

## Evidence

- Admin API stored body, `gid://shopify/Page/132079517911`, updatedAt
  2026-08-01T19:01:14Z: the five `q-topic` labels and the plaintext `ANSWERS`
  object quoted above.
- md5 `95c278cbe66e6a04629133c3447f0fce`, storefront-extracted 1.2 quiz body
  equals `backup/ap-cyber-unit-1-lesson-2-quiz.html`.
- Bundle documents: Quiz_KEY.docx for 1.1 (Drive `1nRw-mP0pUHbfp9hHyBVkH03447Q0nJW9`)
  and 1.2 (`1MtUjCBTTG_RCXXCdd5yqOaqjgzDbv1Ls`).
- `smoke/quiz-gate.js`: 20 passed, 0 failed.
