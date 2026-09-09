'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE QUIZ ANSWER KEY.
//
//  Projected out of quiz_bank, never authored beside it. The same rule
//  lib/lab-answer-key.js is built on, and for the same reason: a key that is
//  written out by hand is a key that disagrees with the quiz the week after
//  someone re-keys a question, and a teacher reading a stale key in front of a
//  class is worse than a teacher reading none. One source. Re-key a question
//  and the key follows it, because the key IS the bank read a second way.
//
//  ── WHAT IT IS HONEST ABOUT ────────────────────────────────────────────────
//  Two different things are true at once here, and printing only the first
//  would make this a security claim it cannot keep.
//
//  What the server does guarantee: routes/quiz.js never puts correct_index or
//  explanation on the render path. A student fetching the quiz receives prompts
//  and options, and the key arrives after a submission, subject to the class
//  release rule. That much is enforced in code and asserted in the suite.
//
//  What it cannot guarantee: a lesson page that has NOT been migrated onto that
//  render path still carries its own key in its own body, which a student can
//  read with View Source. Twenty-three of the twenty-five cyber quiz pages were
//  in that state on 2026-09-08 (board 276). For those, gating this endpoint
//  stops a student stumbling onto the key from the teacher hub; it does not
//  make the answers secret. The disclosure below says so, on the key itself,
//  because a teacher deciding whether to print something needs to know which
//  of those two worlds their page is in.
//
//  ── WHAT IT REFUSES ────────────────────────────────────────────────────────
//  A correct_index that does not point at an option. That is not a cosmetic
//  defect: the key would render a blank as the answer, and a blank reads as
//  "there is no right answer here" rather than as a bug. It throws, so a
//  malformed bank row surfaces as a refusal a teacher can report instead of a
//  confident empty line. Same posture as the option-index checks in
//  routes/quiz.js, which is where such a row would also mis-score.
//
//  Zero PII: bank rows are author content and no student data is read here.
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

// The bank stores options as a JSON array of strings; a caller holding rows it
// built itself may pass the array already parsed. Accept both rather than
// making every caller remember which side of the database it is on.
function readOptions(raw, qid) {
  let opts = raw;
  if (typeof raw === 'string') {
    try { opts = JSON.parse(raw); } catch (e) {
      throw new Error(`quiz-answer-key: ${qid} has options that are not JSON`);
    }
  }
  if (!Array.isArray(opts) || !opts.length) {
    throw new Error(`quiz-answer-key: ${qid} has no options`);
  }
  return opts.map((o) => String(o));
}

// One bank row becomes one question a teacher can read: the stem, every option
// with the correct one flagged, and the explanation when the bank carries one.
// `n` is the position in the canonical order, which is the order the printed
// teacher instrument uses. It is NOT the order a student sees: buildOrder()
// shuffles per attempt, so the key is a reference rather than a mark sheet.
function buildQuestion(row, i) {
  const qid = row.qid || `#${i + 1}`;
  const options = readOptions(row.options, qid);
  const correct = Number(row.correct_index);

  if (!Number.isInteger(correct) || correct < 0 || correct >= options.length) {
    throw new Error(
      `quiz-answer-key: ${qid} has correct_index ${row.correct_index}, `
      + `which is not one of its ${options.length} options`
    );
  }

  return {
    n: i + 1,
    qid,
    points: Number(row.points) || 1,
    prompt: String(row.prompt || ''),
    options: options.map((text, oi) => ({ text, correct: oi === correct })),
    correct_index: correct,
    correct_text: options[correct],
    explanation: row.explanation ? String(row.explanation) : null,
  };
}

//  Said on every key, because a teacher deciding whether to hand something out
//  needs the caveat in the same breath as the answers. See the header.
const DISCLOSURE =
  'Teacher copy. The server never sends correct answers or explanations to the '
  + 'quiz render path, so a student loading the quiz cannot read them from the '
  + 'response. A lesson page that has not been migrated onto that path still '
  + 'carries its own key in the page source, so this gate stops a student '
  + 'reaching the key from the teacher hub rather than making the answers secret.';

//  ── N-of-M, and why the key says so ────────────────────────────────────────
//  quiz_config.serve_count can serve a random subset of the pool. A teacher
//  printing a five-question key for a quiz that serves three would mark two
//  questions no student answered, so the key reports both numbers and which
//  regime it is in rather than leaving the teacher to infer it from a count.
function build(location, rows, opts) {
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error('quiz-answer-key: no bank rows for this location');
  }
  const serveCount = opts && Number(opts.serve_count) > 0 ? Number(opts.serve_count) : 0;
  const questions = rows.map(buildQuestion);

  return {
    course: location.course,
    unit: location.unit,
    lesson: location.lesson,
    activity_type: location.activity_type,
    pool: questions.length,
    // 0 in the bank's own column means "serve the whole pool". Report the
    // number actually served rather than the sentinel, so a teacher reads a
    // question count instead of a flag.
    served: serveCount || questions.length,
    // Every question is served, so the printed key matches the instrument
    // one for one. False means a student saw a subset drawn from these.
    serves_whole_pool: !serveCount || serveCount >= questions.length,
    total_points: questions.reduce((s, q) => s + q.points, 0),
    questions,
    disclosure: DISCLOSURE,
  };
}

module.exports = { build, buildQuestion, readOptions, DISCLOSURE };
