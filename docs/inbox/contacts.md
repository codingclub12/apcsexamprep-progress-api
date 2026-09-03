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

## The ratio, so far

| reporter | reported | actually affected |
| --- | --- | --- |
| Jukka Rauhala, 2026-08-26 | 2 quiz pages | 5 Unit 1 quizzes rebuilt; 13 of 27 cyber quiz pages expose their key, measured directly (board 169) |

A customer reports the instance they hit. They never report the extent. Check
the neighbours before every reply.
