'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE ONE RULE FOR "A CITATION A STUDENT SHOULD NOT BE READING", FOR QUIZ BANKS.
//
//  ── WHY THIS IS A MODULE AND NOT A REGEX IN TWO FILES ──────────────────────
//  It already was a regex in two files, and they disagreed. smoke/ refused the
//  word CED; scripts/extract-cyber-quizzes.js refused only a numbered code such
//  as 2.3.B.8, so four unit-4 stems saying "according to the AP CED" and "the
//  CED High/Moderate/Low framework" passed extraction and were seeded. The
//  extractor's own note said it was enforcing the repo's rule. It was enforcing
//  a narrower one, and nothing could tell it so.
//
//  That is the same shape as the Matrixify preflight keeping three hardcoded
//  mojibake leads of its own: a guard and its test sharing one blind spot and
//  agreeing with each other.
//
//  ── WHAT COUNTS ────────────────────────────────────────────────────────────
//  Teacher register: an Essential Knowledge or Learning Objective code, a
//  numbered CED code, or the CED / CB shorthand for the framework itself.
//  In front of a student that is noise at best, and at worst it hands over the
//  search term that finds the answer.
//
//  ── WHERE IT APPLIES ───────────────────────────────────────────────────────
//  Prompts and options, which a student reads. NOT explanations: those ship
//  only after a teacher releases the key, and naming the EK there is the useful
//  thing to do. Passing an explanation to this module is a caller bug, so the
//  helper below takes a question and knows which fields to look at.
//
//  ── REFUSE, DO NOT STRIP ───────────────────────────────────────────────────
//  Deleting "according to the AP CED" from a stem changes what the stem claims
//  while looking like a migration. Rewording is a content decision and belongs
//  to a human. This module only ever answers "is there one, and where".
// ─────────────────────────────────────────────────────────────────────────────

const CITATION = /\bEK\b|\bLO\s*\d|\bCED\b|\bCB\b|\b\d\.\d\.[A-Z]\.\d\b/;

function hasCitation(text) {
  return CITATION.test(String(text == null ? '' : text));
}

//  Returns one entry per offending student-facing field. Empty means clean.
//  `where` is a label a report can print; `text` is trimmed for a log line.
function citationsIn(q) {
  const out = [];
  if (!q) return out;
  if (hasCitation(q.prompt)) out.push({ where: 'prompt', text: String(q.prompt).slice(0, 90) });
  const opts = Array.isArray(q.options) ? q.options : [];
  opts.forEach((o, i) => {
    if (hasCitation(o)) out.push({ where: 'option ' + 'ABCDEFGH'[i], text: String(o).slice(0, 90) });
  });
  return out;
}

module.exports = { CITATION, hasCitation, citationsIn };
