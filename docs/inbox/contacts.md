# Inbox memory: who has written, and what they were told

Purpose. A second reply must never contradict a first. Record the person, the
purchase, what they asked, what the reply CLAIMED, and the date the claim was
checked live. A claim here decays exactly like any other claim about live state:
re-verify before repeating it.

Also record how much WIDER each reported defect turned out to be. That ratio is
the argument for checking the neighbours of every report.

---

## Jukka Rauhala

- Product: AP Cybersecurity Founding Teacher Bundle, Units 1-5. Order #1209,
  2026-07-27. (Source: run note 2026-08-26; not re-verified against Shopify.)
- Wrote: 2026-08-26 or shortly before. Two asks.
  1. The online 1.1 and 1.2 quizzes carry questions that do not belong to those
     lessons and differ from the offline quiz documents.
  2. Teacher-controlled locking, so quizzes can be used as graded assessments.
- Replied: NOTHING SENT as of 2026-09-02. Board #126 is still open. A draft was
  produced 2026-09-02 against live state; see
  docs/runs/2026-09-02-claude-code-jukka-reply-verification.md.
- What the 2026-09-02 draft claims, and must stay consistent with:
  - All five Unit 1 quizzes now have a server-owned, lesson-aligned bank.
  - Only the 1.1 and 1.2 PAGES actually serve it. 1.3, 1.4 and 1.5 pages still
    carry their own questions and a plaintext answer key.
  - Locking is live and teacher-authenticated, has no dashboard button yet, and
    is only real on 1.1 and 1.2.
  - The online quizzes are deliberately NOT copies of his offline documents.
- Reported scope: 2 quizzes. Actual scope: 5 of 5 Unit 1 quizzes needed work,
  and the answer-key exposure that blocks his real request covers every cyber
  quiz page outside 1.1 and 1.2. **CORRECTED 2026-09-02: that was inferred from
  the server API answering "no server-scored quiz", which does NOT imply the key
  is in the page. Swept all 27 live cyber quiz pages directly: 13 carry a key in
  source (Unit 1 lessons 3-5, all of Unit 2, Unit 3 lessons 1-5) and 14 do not
  (3.6, all of Unit 4, all of Unit 5, plus server-scored 1.1 and 1.2). Ratio:
  2 reported, 13 affected.** Board #169.

---

## Michelle

- Course: AP Cybersecurity, class CYBER-T5KR. Founding cohort teacher, running
  Unit 1 with a live class right now.
- Earlier: the 1.1 Lab column was 27 of 32 blank because the lab's Check buttons
  were invisible (run note 2026-09-03, cyber-lab11-palette), and the auth-log lab
  had no submit button and no gradebook column (board #198, #201). Both fixed;
  her 2026-09-07 email opens by confirming the labs now show and submit.
- Wrote: 2026-09-07. Three things.
  1. Thanks, the labs work.
  2. She locked every quiz and Unit Test, saw the "can't be enforced" note, and
     asked what a student sees on a locked page. Assumed she unlocks and then
     assigns the link.
  3. "1.1 Ex 1 is out of 7 but scores are out of 14? Ex 2 is out of 8, but
     scores show out of 15?"
- Replied: NOTHING SENT as of 2026-09-07. Draft at
  docs/inbox/drafts/2026-09-07-michelle-locks-and-scores.md, every claim checked
  live that day and the check named beside it.
- What the draft claims, and must stay consistent with:
  - Her five Unit 1 lesson quiz locks are REAL and hold against a signed-out or
    incognito student. Measured, unauthenticated, against production.
  - Her Unit Test locks do nothing, and the unit test pages carry their
    questions and answer key in the page source. She was told to treat the link
    itself as the lock and hand it out on test day. Same for Units 2 to 5.
  - No date was given for moving the unit tests onto the server.
  - 1.1 Ex 1 was double counted, the percentages her students saw were always
    right, the Points column and letter grade will move slightly when the fix
    deploys, and nobody has to redo anything.
  - 1.1 Ex 2 is out of 15 and the header was stale. A student who sat the older
    8 question version keeps 5 out of 8 and is not rescaled.
- **DECIDED 2026-09-08 by Tanner: she is NOT told about the other columns.**
  The check built off her email found six more priced wrong in her own course,
  1.4 and 1.5, including one where 46 students were shown their work out of 4.
  He read the finding and said to fix them rather than write about them. So the
  draft above stands as written, its "the next one gets caught here" line
  included, and a future session must not helpfully volunteer the rest. Fixed
  under board #272; nobody was regraded and no student saw a score change.
- Reported scope: 2 columns in one lesson. Actual scope: 1 page in Unit 1 has
  two writers (all 20 Unit 1 activity pages swept, one hit), and 1 stale price
  confirmed. Units 2 to 5 not swept; /api/health `prices` now reports the shape
  without a sweep. Ratio: 2 reported, 2 confirmed, unknown beyond Unit 1, which
  is itself worth stating rather than rounding to "fixed".

---

## The ratio, so far

| reporter | reported | actually affected |
| --- | --- | --- |
| Jukka Rauhala, 2026-08-26 | 2 quiz pages | 5 Unit 1 quizzes rebuilt; 13 of 27 cyber quiz pages expose their key, measured directly (board 169) |

A customer reports the instance they hit. They never report the extent. Check
the neighbours before every reply.
