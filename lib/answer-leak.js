'use strict';
// -----------------------------------------------------------------------------
//  ANSWER KEY DISCLOSURE IN A STORED PAGE BODY.
//
//  WHY THIS EXISTS
//  A quiz whose key ships inside the page it grades is not a quiz, it is a
//  worksheet with the answers printed on the back of the same sheet. Measured
//  live on 2026-09-09, all fifteen AP CSA Unit 1 lesson pages are in that state:
//  128 option letters sit in `data-answer` attributes, 102 of them on items that
//  carry a `data-item-id` and therefore report a grade into the gradebook.
//
//  THE FINDING THAT MADE THIS A MODULE RATHER THAN A REGEX
//  The answer is disclosed THREE separate ways on the same page, and the obvious
//  fix addresses only the first:
//
//    data-answer="B"        on the MCQ container. What the client grader reads.
//    data-answer="boolean"  on a cloze blank. The answer TEXT, not a letter.
//    <!-- Q3: indexOf, answer A -->   an author note that shipped.
//
//  Seventy of those comments are live in Unit 1. Strip every attribute and the
//  page still hands over its key in prose, so a check that looks only for
//  `data-answer` would go green on a page that is still fully readable. That is
//  the same shape as the mojibake guard reporting this repo clean while four
//  tracked files were corrupted: the rule was right and its coverage was not.
//
//  WHAT THIS MODULE DOES NOT DECIDE
//  Whether a given page is ALLOWED to carry a key. A teacher answer key page and
//  a premium unit test key are supposed to have one; a student lesson page is
//  not. That is a property of the handle, not of the markup, so the caller
//  supplies the list of student-facing handles and this module only reports what
//  it found and where. Deciding it here would put a policy in a detector and
//  make the detector wrong the first time a legitimate key page is added.
//
//  Go through this module rather than pasting one of its patterns, the same rule
//  lib/cyber-ek-density.js and lib/mojibake.js are under. A pasted pattern cannot
//  tell you it has stopped working, and the comment channel above is exactly what
//  a pasted `data-answer` pattern silently misses.
//
//  Zero PII: page bodies are author content and no student data is read here.
//  No em-dashes, per repo convention.
// -----------------------------------------------------------------------------

//  Attributes are authored with either quote style across the CSA and cyber
//  pages, so match both rather than assuming the flavour of the page in hand.
const ATTR = /data-answer\s*=\s*("([^"]*)"|'([^']*)')/g;

//  An option letter standing alone is an MCQ key. Anything else in a
//  `data-answer` is the answer TEXT, which is the cloze case and is strictly
//  worse: a letter is useless without the options beside it, a word is not.
const LONE_LETTER = /^[A-D]$/;

//  ── THE COMMENT RULE, AND WHY IT IS CASE SENSITIVE ON THE LETTER ───────────
//  The signal is a comment that names WHICH option is correct, not a comment
//  that happens to contain the word "answer". Those are different things and a
//  guard that conflates them fires on the wiring notes every one of these pages
//  also carries.
//
//  The letter is matched CASE SENSITIVELY and the keyword is not. That one
//  detail is what separates the two: in "correct answer feedback for option A",
//  a case-insensitive letter class matches the `a` of "answer" itself and the
//  comment reads as a disclosure when it discloses nothing. Requiring an
//  uppercase A to D that is not the start of a longer word leaves only the form
//  the leak actually takes.
const COMMENT = /<!--([\s\S]*?)-->/g;
const DISCLOSES = /\b(?:answers?|ans|correct(?:\s+answer)?|key)\b[\s:=]*(?:is\s+)?\(?([A-D])\)?(?![\w-])/;

//  A cloze blank is the one place a `data-answer` holds prose, so the class is
//  how a finding gets told apart from an MCQ key. Read from the tag the
//  attribute sits in rather than from the value, because a one-word cloze answer
//  such as "A" would otherwise classify itself as a letter key.
function tagAround(body, at) {
  const open = body.lastIndexOf('<', at);
  if (open < 0) return '';
  const close = body.indexOf('>', at);
  return close < 0 ? body.slice(open) : body.slice(open, close + 1);
}

function lineAt(body, at) {
  let n = 1;
  for (let i = 0; i < at && i < body.length; i++) if (body.charCodeAt(i) === 10) n++;
  return n;
}

//  ── RULE 1 and RULE 2 ──────────────────────────────────────────────────────
//  Both read the same attribute and they are still two rules, because they fail
//  independently: a page can lose its cloze and keep its MCQs, and the fix for
//  one is not the fix for the other. Reported separately so a mutation run can
//  break one and watch only that one go red.
function attributeFindings(body) {
  const out = [];
  ATTR.lastIndex = 0;
  let m;
  while ((m = ATTR.exec(body))) {
    const value = m[2] !== undefined ? m[2] : m[3];
    const tag = tagAround(body, m.index);
    //  Trim before classifying. Live Unit 1 carries `data-answer=" C"` with a
    //  leading space on ap-csa-lesson-1-9-method-signatures, and an untrimmed
    //  test files that MCQ key as cloze prose. The padding is worth reporting in
    //  its own right, so it is kept on the finding rather than normalized away.
    const trimmed = value.trim();
    const padded = trimmed !== value;
    const cloze = /apcs-cloze-blank/.test(tag);
    const graded = /data-item-id\s*=/.test(tag);
    const itemId = (tag.match(/data-item-id\s*=\s*["']([^"']+)["']/) || [])[1] || null;
    out.push({
      rule: cloze || !LONE_LETTER.test(trimmed) ? 'cloze-answer-attribute' : 'mcq-answer-attribute',
      channel: 'attribute',
      disclosed: value,
      padded,
      graded,
      item_id: itemId,
      index: m.index,
      line: lineAt(body, m.index),
    });
  }
  return out;
}

//  ── RULE 3 ─────────────────────────────────────────────────────────────────
//  The channel no attribute sweep can see. An author note is invisible on the
//  rendered page and fully readable in View Source, which is the only place a
//  student looking for the key would go anyway.
function commentFindings(body) {
  const out = [];
  COMMENT.lastIndex = 0;
  let m;
  while ((m = COMMENT.exec(body))) {
    const text = m[1];
    const hit = text.match(DISCLOSES);
    if (!hit) continue;
    out.push({
      rule: 'answer-comment',
      channel: 'comment',
      disclosed: hit[1],
      graded: null,             // a comment names no item, so this is unknowable here
      item_id: null,
      index: m.index,
      line: lineAt(body, m.index),
      text: text.replace(/\s+/g, ' ').trim().slice(0, 160),
    });
  }
  return out;
}

//  Every finding for one body, in document order so a reader following them down
//  the page is following the page rather than the rule list.
function findings(body) {
  const all = attributeFindings(String(body || '')).concat(commentFindings(String(body || '')));
  return all.sort((a, b) => a.index - b.index);
}

//  A count per rule plus the two numbers a human actually asks for: how many
//  answers are readable at all, and how many of those are on work that scores.
function summarize(body) {
  const f = findings(body);
  const byRule = {};
  for (const x of f) byRule[x.rule] = (byRule[x.rule] || 0) + 1;
  return {
    total: f.length,
    graded: f.filter((x) => x.graded === true).length,
    byRule,
    channels: {
      attribute: f.filter((x) => x.channel === 'attribute').length,
      comment: f.filter((x) => x.channel === 'comment').length,
    },
    findings: f,
  };
}

const RULES = ['mcq-answer-attribute', 'cloze-answer-attribute', 'answer-comment'];

module.exports = { RULES, findings, summarize, attributeFindings, commentFindings, DISCLOSES, ATTR };
