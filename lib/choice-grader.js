'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CHOICE GRADER. Server-side scoring for intro-java concept checks and quizzes.
//
//  ── WHY THIS HAS TO EXIST ───────────────────────────────────────────────────
//  The CSA reporter posts a score the PAGE worked out, because CSA pages carry
//  their own answer key in the widget markup. intro-java pages deliberately do
//  not: lib/intro-java-page.js copies only id, stem and options into the page,
//  and smoke/intro-java-content.js greps every rendered page to prove the key
//  never arrives.
//
//  That is the right call, and its direct consequence is this file. A browser
//  with no key cannot compute a score, so the score has to be computed here.
//  There is no third option that does not involve shipping the answers.
//
//  ── WHAT MAY BE STORED, WHICH DIFFERS FROM THE GAP GRADER ───────────────────
//  A gap answer is student-typed free text and is discarded. A multiple-choice
//  answer is an OPTION INDEX, which is a number the page already chose from a
//  fixed list, so it is not free text and it is safe to keep:
//
//      [{"q":1,"sel":2,"ok":true}]
//
//  That is exactly the detail format CLAUDE.md specifies. Keeping `sel` is worth
//  something real: it is what lets a teacher see that eleven students all picked
//  the same wrong option, which is a fact about the question rather than about
//  the students.
//
//  Zero PII. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

const { BANKS } = require('../seed/intro-java-banks');

// (course, item_id) -> { lesson_id, kind, questions: [{ id, answer, options }] }
// Built once at module load, bounded by the size of the course.
const KEY = new Map();

function keyFor(course, itemId) { return `${course}|${itemId}`; }

for (const bank of BANKS) {
  for (const l of bank.lessons) {
    // Each concept check is its own manifest item worth one point, so each gets
    // its own key with a single question in it.
    for (const c of l.cfus) {
      KEY.set(keyFor(bank.course, `${l.lesson}-${c.id}`), {
        lesson_id: l.lesson,
        kind: 'cfu',
        questions: [{ id: c.id, answer: c.answer, options: c.options.length }],
      });
    }
    // The quiz is ONE item worth one point per question, so all its questions
    // live under a single key. That is what keeps a 30-student class at 30
    // inserts rather than 30 times the question count.
    if (l.quiz && l.quiz.length) {
      KEY.set(keyFor(bank.course, `${l.lesson}-quiz`), {
        lesson_id: l.lesson,
        kind: 'quiz',
        questions: l.quiz.map((q) => ({ id: q.id, answer: q.answer, options: q.options.length })),
      });
    }
  }
}

function hasKey(course, itemId) { return KEY.has(keyFor(course, itemId)); }
function lessonFor(course, itemId) {
  const k = KEY.get(keyFor(course, itemId));
  return k ? k.lesson_id : null;
}
function kindFor(course, itemId) {
  const k = KEY.get(keyFor(course, itemId));
  return k ? k.kind : null;
}
/** How many questions this item has. Never which answers are right. */
function questionCount(course, itemId) {
  const k = KEY.get(keyFor(course, itemId));
  return k ? k.questions.length : 0;
}

/**
 * Grade a submission.
 *
 * @param {string} course
 * @param {string} itemId
 * @param {object|Array} selections  question id (or position) -> chosen option index
 * @returns {{found, score, max_score, questions, detail}}
 *
 * `questions` carries per-question correctness for immediate feedback. It
 * deliberately does NOT carry the right answer: a student who got it wrong is
 * told they got it wrong and can retry, which is the whole point of a concept
 * check. Returning the answer would turn every check into a reveal button.
 */
function gradeSubmission(course, itemId, selections) {
  const k = KEY.get(keyFor(course, itemId));
  if (!k) return { found: false, score: 0, max_score: 0, questions: [], detail: [] };

  const read = (q, i) => {
    if (Array.isArray(selections)) return selections[i];
    if (selections && typeof selections === 'object') {
      return selections[q.id] !== undefined ? selections[q.id] : selections[String(i + 1)];
    }
    return undefined;
  };

  const questions = [];
  let score = 0;
  k.questions.forEach((q, i) => {
    const raw = read(q, i);
    const sel = Number.isInteger(raw) ? raw : null;
    // Out of range counts as unanswered rather than as an error: a stale page
    // sending a bad index should score zero, not 500.
    const inRange = sel !== null && sel >= 0 && sel < q.options;
    const ok = inRange && sel === q.answer;
    if (ok) score++;
    questions.push({ id: q.id, ok, answered: inRange });
  });

  return {
    found: true,
    score,
    max_score: k.questions.length,
    questions,
    // Option indices and booleans only, which is the documented detail shape.
    detail: questions.map((q, i) => ({
      q: i + 1,
      sel: (() => {
        const raw = read(k.questions[i], i);
        return Number.isInteger(raw) ? raw : null;
      })(),
      ok: q.ok,
    })),
  };
}

module.exports = { gradeSubmission, hasKey, lessonFor, kindFor, questionCount, KEY };
