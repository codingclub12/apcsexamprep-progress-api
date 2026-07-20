'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CSA QUIZ ANSWER BANK — server-owned correct answers for the ap-csa reporter.
//
//  The five shipped ap-csa-course-* lesson pages post a graded MCQ as
//  { activity_type:'quiz', lesson, item:'q1'..'q6', choice:'A'|'B'|'C'|'D' } to
//  POST /api/student/score. The server scores each submission by comparing the
//  choice to the correct letter stored here (bank[lesson][item]) and awards one
//  point per correct item, best-per-item. The key never ships to a class-mode
//  page, so this file is the single source of truth for CSA quiz correctness.
//
//  Delivered with the CSA reporter handoff, generated directly from the lesson
//  configs (authoritative). Author content only; zero student PII. No em-dashes.
//  Loaded by scripts/seed-csa-bank.js into the quiz_answer_bank table.
// ─────────────────────────────────────────────────────────────────────────────

const COURSE = 'ap-csa';

// lesson slug (the ap-csa-course- handle tail) -> question id -> correct letter.
const BANK = {
  '2-9-for-loops':             { q1: 'A', q2: 'A', q3: 'B', q4: 'C', q5: 'B', q6: 'A' },
  '4-2-traversing-arrays':     { q1: 'A', q2: 'A', q3: 'B', q4: 'C', q5: 'A', q6: 'A' },
  '4-12-traversing-2d-arrays': { q1: 'A', q2: 'A', q3: 'B', q4: 'B', q5: 'A', q6: 'A' },
  'array-references-aliasing': { q1: 'A', q2: 'B', q3: 'B', q4: 'B', q5: 'A', q6: 'A' },
  '2-10-loop-algorithms':      { q1: 'A', q2: 'A', q3: 'B', q4: 'D', q5: 'B', q6: 'A' },
};

module.exports = { course: COURSE, bank: BANK };
