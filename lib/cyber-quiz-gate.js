'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE CHECKS A CYBER QUIZ PAGE NEEDS.
//
//  A quiz is a third widget shape, and none of the exercise checks apply to it:
//  there are no <select> elements at all. Instead there is an answer key object
//  and a grid of clickable option divs:
//
//    var ANSWERS = {1:'B',2:'B',3:'C',4:'C',5:'C'};
//    <div class="quiz-opt" id="q1-A" onclick="selectOpt(1,'A')">...</div>
//
//  The same failure mode as the exercises, in a different costume: nothing in
//  the page connects the key to the options except that they happen to spell the
//  same letter. A key naming a letter with no option is unscoreable and silent.
//
//  ── WHY THIS IS A MODULE AND NOT INLINE ─────────────────────────────────────
//  There are more cyber quizzes. Board task #130 covers the Unit 5 quizzes and
//  #131 the 1.1 and 1.2 ones. Three copies of these checks is where the drift
//  starts, and this repo has already paid for that twice: a stayed_hidden check
//  that printed its warning and returned 0, and a marker regex that could never
//  match. Written once, up front.
//
//  ── THE ANSWER-KEY DISTRIBUTION CHECK ───────────────────────────────────────
//  Reported, never failed. A skewed key is a real defect (Topic 1.4's is B, B,
//  C, C, C, so guessing C scores 60%) but it is an assessment decision, not a
//  correctness one, and a gate that fails on it would block every unrelated
//  edit to an existing quiz until someone re-keys it. It goes in the notes where
//  a human sees it every build.
// ─────────────────────────────────────────────────────────────────────────────

//  Barred by the house rules: they test test-taking, not the content.
const CATCH_ALL = [
  /\ball of the above\b/i,
  /\bnone of the above\b/i,
  /\ball (?:three|four|five) .{0,40}(?:are equally|equally important)\b/i,
  /\bnone of the (?:three|four|five)\b/i,
];

const flat = (s) => s
  .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z]+;/g, ' ')
  .replace(/\s+/g, ' ');

//  { '1': 'B', ... } from the first object literal of question-to-letter pairs.
function answerKey(html) {
  const m = /\{\s*(\d+\s*:\s*'[A-E]'\s*(?:,\s*\d+\s*:\s*'[A-E]'\s*)*)\}/.exec(html);
  if (!m) return null;
  const out = {};
  for (const p of m[1].matchAll(/(\d+)\s*:\s*'([A-E])'/g)) out[p[1]] = p[2];
  return out;
}

//  { '1': [{letter, label}] }
//
//  Option ids are the source of truth. The first version tried to match each
//  option's whole <div> and required a trailing </div></div>, which only closes
//  the LAST option in a group, so it found option A and nothing else and then
//  reported every keyed answer as ungettable. Collect the ids, then read each
//  label out of the window that follows it, bounded so one option cannot reach
//  into the next.
function questions(html) {
  const marks = [...html.matchAll(/id="q(\d+)-([A-E])"/g)];
  const out = {};
  marks.forEach((m, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].index : Math.min(html.length, m.index + 1600);
    const seg = html.slice(m.index, end);
    const spans = [...seg.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)];
    //  Structure is <span>letter badge</span><span>label</span>. Take the
    //  SECOND span, not the last: for the final option in a group the window
    //  runs on into whatever follows, and taking the last span picked up the
    //  results panel's score display as option D's text.
    const label = spans.length > 1 ? flat(spans[1][1]).trim() : '';
    (out[m[1]] = out[m[1]] || []).push({ letter: m[2], label });
  });
  return out;
}

//  { '1': 'B - Deepfake video synthesizes...' } from the EXPLS object. Double
//  quoted because the strings contain apostrophes.
function explanations(html) {
  const i = html.indexOf('EXPLS');
  if (i < 0) return {};
  const seg = html.slice(i, i + 4000);
  const out = {};
  for (const m of seg.matchAll(/(\d+)\s*:\s*"((?:[^"\\]|\\.)*)"/g)) out[m[1]] = flat(m[2]);
  return out;
}

function check(before, after, legacyFn) {
  const fail = [];
  const note = [];

  const keyBefore = answerKey(before);
  const key = answerKey(after);
  if (!key) { fail.push('no answer key object found in the page'); return { fail, note }; }

  const qs = questions(after);
  note.push(`questions: ${Object.keys(qs).length}, answer key: ${Object.entries(key).map(([q, a]) => q + a).join(' ')}`);

  // ---- the key must not move unless that was the point of the edit ---------
  if (keyBefore && JSON.stringify(keyBefore) !== JSON.stringify(key)) {
    fail.push(`answer key changed: ${JSON.stringify(keyBefore)} -> ${JSON.stringify(key)}`);
  }

  // ---- every keyed letter is actually clickable ----------------------------
  for (const [q, letter] of Object.entries(key)) {
    const opts = qs[q];
    if (!opts || !opts.length) { fail.push(`question ${q} is keyed ${letter} but has no options`); continue; }
    if (!opts.some((o) => o.letter === letter)) {
      fail.push(`question ${q} is keyed ${letter}, which is UNGETTABLE: options are ${opts.map((o) => o.letter).join(', ')}`);
    }
  }

  // ---- every option is reachable and labelled ------------------------------
  for (const [q, opts] of Object.entries(qs)) {
    if (!key[q]) fail.push(`question ${q} has options but no entry in the answer key`);
    const letters = opts.map((o) => o.letter);
    if (new Set(letters).size !== letters.length) fail.push(`question ${q} has duplicate option letters: ${letters.join(', ')}`);
    for (const o of opts) {
      if (!o.label) fail.push(`q${q}-${o.letter} has no label`);
      if (!after.includes(`selectOpt(${q},'${o.letter}')`)) {
        fail.push(`q${q}-${o.letter} is not wired to selectOpt, so it cannot be chosen`);
      }
    }
  }
  const counts = [...new Set(Object.values(qs).map((o) => o.length))];
  if (counts.length > 1) note.push(`option counts vary across questions: ${counts.join(', ')}`);

  // ---- no catch-all options -------------------------------------------------
  for (const [q, opts] of Object.entries(qs)) {
    for (const o of opts) {
      if (CATCH_ALL.some((rx) => rx.test(o.label))) {
        fail.push(`q${q}-${o.letter} is an all-of-the-above style option: ${JSON.stringify(o.label.slice(0, 70))}`);
      }
    }
  }

  // ---- the explanations count as keyed content too -------------------------
  //  A student reads the explanation exactly once, right after answering, which
  //  is the moment it lands hardest. It is not a distractor and it does not get
  //  a distractor's licence.
  const expls = explanations(after);
  note.push(`explanations: ${Object.keys(expls).length}`);
  if (legacyFn) {
    for (const [q, text] of Object.entries(expls)) {
      const t = legacyFn(text);
      if (t) fail.push(`the explanation for question ${q} names a legacy term (${t}): ${JSON.stringify(text.slice(0, 80))}`);
    }
  }

  // ---- no keyed answer names a legacy term ---------------------------------
  if (legacyFn) {
    for (const [q, letter] of Object.entries(key)) {
      const o = (qs[q] || []).find((x) => x.letter === letter);
      if (!o) continue;
      const t = legacyFn(o.label);
      if (t) fail.push(`the credited answer to question ${q} names a legacy term (${t}): ${JSON.stringify(o.label.slice(0, 80))}`);
    }
  }

  // ---- the key's shape, reported rather than failed -------------------------
  //  A skewed key is a real defect and an assessment decision, not a
  //  correctness one. Failing on it would block every unrelated edit to an
  //  existing quiz until someone re-keys it.
  const letters = Object.values(key);
  const tally = {};
  for (const l of letters) tally[l] = (tally[l] || 0) + 1;
  const top = Math.max(...Object.values(tally));
  const missing = ['A', 'B', 'C', 'D'].filter((l) => !tally[l]);
  note.push(`key distribution: ${Object.entries(tally).sort().map(([l, n]) => `${l}x${n}`).join(' ')}`
    + (missing.length ? `, unused: ${missing.join('')}` : ''));
  if (top > Math.ceil(letters.length / 2) || missing.length >= 2) {
    note.push(`  ^ skewed: guessing ${Object.entries(tally).find(([, n]) => n === top)[0]} scores `
      + `${Math.round((top / letters.length) * 100)}%. Re-keying is an assessment call, not this gate's to force.`);
  }

  return { fail, note };
}

module.exports = { answerKey, questions, explanations, flat, check, CATCH_ALL };
