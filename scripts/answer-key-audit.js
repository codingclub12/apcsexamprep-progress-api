'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  ANSWER KEY AUDIT, and the rebalance that follows from it.
//
//  WHY THIS EXISTS
//  A quiz whose answers are all B is scoreable without reading it. One was found
//  live: ap-csp-course-bi3-undecidable-problems, six questions, every answer B.
//  Seven more CSP quizzes sat at 60 percent or more on a single letter, and the
//  whole course leaned to B (37.8 percent) with D at 14.6, where even is 25.
//  "Always guess B" scored 38 percent on AP CSP.
//
//  That is a content defect no amount of gradebook work can see, so it needs its
//  own check.
//
//  INPUT is a JSON dump of Shopify pages, the shape the Admin API returns:
//      { data: { pages: { edges: [ { node: { handle, title, body } } ] } } }
//  Passing a file rather than calling Shopify keeps this runnable offline, in
//  CI, and against a saved snapshot when diagnosing a past state.
//
//  TWO ANSWER SHAPES are understood, both live in the CSP pages today:
//      quizzes   checkMCQ('q1','A','C','q1-fb-A')   third argument is correct
//      exams     KEY={"e1":"D","e2":"B",...}
//  Code exercises (data-activity="exercise-1") have no letter key: they are
//  graded by running Python, so they are correctly absent from this audit.
//
//  MODES
//    audit                      report the distribution and flag degenerate keys
//    rebalance <out.csv>        emit a Matrixify Pages sheet that PERMUTES
//                               option blocks so the answers spread evenly
//
//  THE RULE THE REBALANCE OBEYS
//  The correct answer never changes. Only which letter it sits on. Each option
//  carries its own feedback text, so an option and its feedback move together;
//  relabelling the "correct" argument in place would mark a wrong answer correct,
//  which is the one mistake that would be worse than the bias being fixed.
//  Every rewritten question is verified against its original before the CSV is
//  written, and the run fails rather than emitting a file it cannot vouch for.
//
//  Run:
//    node scripts/answer-key-audit.js pages.json
//    node scripts/answer-key-audit.js pages.json --rebalance out.csv
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');

const L = ['A', 'B', 'C', 'D'];
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Target correct letters per quiz for --rebalance. Deliberate, not random, so a
// rerun produces the same file and a reviewer can check the intent: these lean
// to D and A because the course over-used B and under-used D.
const TARGETS = {
  // ── AP CYBER UNIT 5, added 2026-09-01 ─────────────────────────────────────
  //  Measured live: 5.1 ABDCB, 5.2 ABCDB, 5.3 ABCDB, 5.4 ABCDB, 5.5 BCADB,
  //  5.6 BCDAB. Three keys byte identical, question 5 is B on all six, and B is
  //  40 percent of the unit against an even 25. None of that trips the
  //  all-one-letter or 60-percent checks, which is why it survived until the
  //  ordered-key checks were added.
  //
  //  These targets are chosen to fix all three at once, and chosen DELIBERATELY
  //  so a rerun produces the same file and a reviewer can check the intent:
  //  every key distinct, no question position sharing a letter across all six,
  //  and the whole unit at A8 B7 C7 D8 out of 30, against an even 7.5.
  'ap-cyber-unit-5-lesson-1-quiz': ['C', 'D', 'A', 'B', 'D'],
  'ap-cyber-unit-5-lesson-2-quiz': ['D', 'A', 'B', 'C', 'A'],
  'ap-cyber-unit-5-lesson-3-quiz': ['B', 'C', 'D', 'A', 'C'],
  'ap-cyber-unit-5-lesson-4-quiz': ['A', 'B', 'C', 'D', 'B'],
  'ap-cyber-unit-5-lesson-5-quiz': ['D', 'A', 'C', 'B', 'A'],
  'ap-cyber-unit-5-lesson-6-quiz': ['C', 'D', 'B', 'A', 'D'],

  'ap-csp-course-bi3-undecidable-problems':  ['C', 'C', 'A', 'B', 'B', 'C'],
  'ap-csp-course-bi3-iteration':             ['B', 'C', 'D', 'A', 'B', 'D'],
  'ap-csp-course-bi3-lists':                 ['D', 'B', 'C', 'D', 'D', 'B'],
  'ap-csp-course-bi3-strings':               ['A', 'B', 'C', 'D', 'A', 'D'],
  'ap-csp-course-bi3-conditionals':          ['B', 'C', 'D', 'A', 'B', 'C'],
  'ap-csp-course-bi3-nested-conditionals':   ['B', 'C', 'D', 'A', 'B', 'A'],
  'ap-csp-course-bi3-developing-algorithms': ['C', 'D', 'B', 'D', 'D', 'B'],
  'ap-csp-course-bi4-fault-tolerance':       ['A', 'B', 'C', 'D', 'A', 'A'],

  // ── PASS THREE, 2026-09-01: EVERY KEY DISTINCT ────────────────────────────
  //  The values below replace the pass-one and pass-two targets wholesale. Those
  //  were chosen to even out a LETTER DISTRIBUTION and did that almost perfectly,
  //  A51 B51 C53 D55 of 210 against 52.5. They achieved it with two rotations:
  //
  //      ABCDAB   13 quizzes        CDABCD   12 quizzes
  //
  //  Twenty-five of thirty-five quizzes on two keys, verified live. A student who
  //  learns ABCDAB has thirteen quizzes. It passed every check that existed at
  //  the time, because a histogram cannot see order.
  //
  //  The measure improved and the thing the measure stood for got worse, which is
  //  the whole reason the ordered-key checks were added. These targets are
  //  generated to satisfy every property at once and refuse to emit otherwise.
  //
  // ── PASS FOUR, 2026-09-02: NO KEY REPEATS INSIDE ITSELF ───────────────────
  //  Pass three shipped ONE key that repeats: CDACDA, which is CDA twice. Learn
  //  three answers and the quiz is free. It satisfied all three pass-three
  //  properties, because every one of them compares keys to EACH OTHER and none
  //  of them looks inside a single key. Same failure as pass two, one level in.
  //
  //  Found by the repeating-block check on the branch for ledger #125, then
  //  reproduced here independently before anything was changed. Caught before
  //  the import sheet was run, so no student ever saw it.
  //
  //  So the generator now refuses any key with a period that TILES it: p divides
  //  the length and the key is that block repeated, which for six questions is
  //  AAAAAA, ABABAB and CDACDA. A partial echo like ABCDAB is a two character
  //  tail at 1 in 16, below the bar used elsewhere in this file, and is left to
  //  distinctness, which is what made ABCDAB a problem in the first place.
  //  scripts/csp-target-generator.js reproduces this table and mutation testing
  //  it, by dropping the periodicity term, brings CDACDA straight back.
  //
  //  Two keys moved: legal-ethical-concerns CDACDA to CDACDB, and safe-computing
  //  DABDCC to AACDAC as downstream drift from the changed counters. Result:
  //
  //      distinct     35 of 35
  //      periodic     0 of 35
  //      overall      A53 B52 C53 D52   of 210, even is 52.5
  //      per column   9/9/9/8 in five, 10/9/8/8 in the sixth
  // ── PASS TWO: the remaining 27 lesson quizzes ─────────────────────────────
  //  Pass one fixed the eight worst and OVER-CORRECTED toward D, so these lean
  //  back to B and C. Solved, not guessed: the seven unit test exams are already
  //  even (27/27/23/23) and are left alone, so with those and the eight
  //  rebalanced quizzes held fixed, these 162 questions must contribute
  //  A 38, B 43, C 42, D 39 for the whole course to land on 25 percent each.
  //
  //  Dealt from that pool in an interleaved cycle, so no single quiz carries
  //  more than three of any one letter and the sequence is reproducible.
  'ap-csp-course-bi1-collaboration':             ['A', 'B', 'C', 'D', 'A', 'B'],
  'ap-csp-course-bi1-identifying-correcting-errors': ['C', 'D', 'D', 'A', 'B', 'C'],
  'ap-csp-course-bi1-program-design-development': ['D', 'A', 'B', 'C', 'C', 'D'],
  'ap-csp-course-bi1-program-function-purpose':  ['B', 'C', 'A', 'B', 'D', 'A'],
  'ap-csp-course-bi2-binary-numbers':            ['A', 'B', 'C', 'D', 'A', 'C'],
  'ap-csp-course-bi2-data-compression':          ['B', 'D', 'D', 'A', 'B', 'A'],
  'ap-csp-course-bi2-extracting-information':    ['C', 'C', 'B', 'B', 'D', 'D'],
  'ap-csp-course-bi2-using-programs-with-data':  ['D', 'A', 'A', 'C', 'C', 'B'],
  'ap-csp-course-bi3-algorithmic-efficiency':    ['A', 'B', 'C', 'D', 'B', 'C'],
  'ap-csp-course-bi3-binary-search':             ['D', 'A', 'A', 'B', 'C', 'D'],
  'ap-csp-course-bi3-boolean-expressions':       ['B', 'C', 'D', 'A', 'D', 'A'],
  'ap-csp-course-bi3-calling-procedures':        ['C', 'D', 'B', 'C', 'A', 'B'],
  'ap-csp-course-bi3-data-abstraction':          ['D', 'A', 'A', 'B', 'C', 'A'],
  'ap-csp-course-bi3-developing-procedures':     ['A', 'B', 'C', 'C', 'A', 'D'],
  'ap-csp-course-bi3-libraries':                 ['C', 'A', 'A', 'B', 'C', 'A'],
  'ap-csp-course-bi3-mathematical-expressions':  ['A', 'D', 'B', 'C', 'A', 'C'],
  'ap-csp-course-bi3-random-values':             ['C', 'D', 'A', 'B', 'C', 'D'],
  'ap-csp-course-bi3-simulations':               ['D', 'A', 'B', 'C', 'D', 'B'],
  'ap-csp-course-bi3-variables':                 ['D', 'A', 'B', 'C', 'D', 'A'],
  'ap-csp-course-bi4-parallel-distributed-computing': ['B', 'D', 'D', 'A', 'C', 'B'],
  'ap-csp-course-bi4-the-internet':              ['C', 'C', 'D', 'B', 'B', 'C'],
  'ap-csp-course-bi5-beneficial-harmful-effects': ['D', 'A', 'A', 'C', 'D', 'B'],
  'ap-csp-course-bi5-computing-bias':            ['A', 'B', 'C', 'D', 'C', 'C'],
  'ap-csp-course-bi5-crowdsourcing':             ['B', 'D', 'B', 'A', 'A', 'D'],
  'ap-csp-course-bi5-digital-divide':            ['B', 'C', 'D', 'A', 'B', 'B'],
  'ap-csp-course-bi5-legal-ethical-concerns':    ['C', 'D', 'A', 'C', 'D', 'B'],
  'ap-csp-course-bi5-safe-computing':            ['A', 'A', 'C', 'D', 'A', 'C'],
};

const QUESTION_RE = /<div class="mcq-options" id="([^"]+)-options">([\s\S]*?)<\/div>\s*((?:\s*<div id="\1-fb-[A-D]"[\s\S]*?<\/div>)+)/g;

// One question: its four options, its four feedback blocks, and which is right.
function readQuestion(qid, optsInner, fbsBlock) {
  const opts = [...optsInner.matchAll(
    /<button class="mcq-option" onclick="checkMCQ\('([^']+)','([A-D])','([A-D])','([^']+)'\)">([\s\S]*?)<\/button>/g
  )].map((m) => ({
    letter: m[2], correct: m[3], 
    text: m[5].replace(/<span class="mcq-option-letter">[A-D]<\/span>/, '').trim(),
  }));
  if (opts.length !== 4) return { error: `${opts.length} options` };
  const correctLetter = opts[0].correct;
  if (!opts.every((o) => o.correct === correctLetter)) return { error: 'options disagree on the correct letter' };

  const fbs = {};
  const fbRe = new RegExp(`<div id="${esc(qid)}-fb-([A-D])" class="mcq-feedback (correct-fb|incorrect-fb)">([\\s\\S]*?)<\\/div>`, 'g');
  for (const m of fbsBlock.matchAll(fbRe)) fbs[m[1]] = { kind: m[2], inner: m[3] };
  if (Object.keys(fbs).length !== 4) return { error: `${Object.keys(fbs).length} feedback blocks` };
  if (!fbs[correctLetter] || fbs[correctLetter].kind !== 'correct-fb') return { error: 'correct-fb is not on the correct option' };

  return { opts, fbs, correctLetter };
}

// Every graded activity on a page, as a list of correct letters.
function keysFor(body) {
  const byAct = {};
  for (const m of body.matchAll(/<div class="mcq-item"[^>]*data-activity="([^"]+)"[\s\S]{0,4000}?checkMCQ\(\s*'[^']*'\s*,\s*'[A-Z]'\s*,\s*'([A-Z])'/g)) {
    (byAct[m[1]] = byAct[m[1]] || []).push(m[2]);
  }
  const k = body.match(/KEY\s*=\s*(\{[^}]{2,4000}\})/);
  if (k) { try { byAct.exam = Object.values(JSON.parse(k[1])); } catch (e) { /* not a key map */ } }

  // ── THIRD SHAPE: `opt-btn`, every AP Cyber unit 5 quiz ─────────────────────
  //  This audit was blind to it until 2026-09-01, and the blindness is why the
  //  unit 5 defect was found by a human reading pages instead of by this tool:
  //  5.2, 5.3 and 5.4 all key ABCDB, B is 40 percent of unit 5 against an even
  //  25, and question 5 is B on all six quizzes.
  //
  //  The other two shapes carry the correct letter INSIDE the handler call, so
  //  one regex over the call reads the key. This one does not. Correctness is a
  //  `data-correct` attribute on the button, the letter is in a child span, and
  //  the only thing tying options into a question is the index in the onclick:
  //
  //    <button class="opt-btn" data-correct="1" data-fb="..."
  //            onclick="u5l2quizAnswer(this,3)"><span class="opt-letter">C.</span>
  //
  //  So it groups by (handler prefix, question index) and reads the letter off
  //  whichever option is flagged. The handler prefix doubles as the activity
  //  name, which keeps one page with two quizzes from merging into one key.
  //
  //  A question is only counted when EXACTLY ONE option is flagged correct.
  //  Zero or several is a different defect, and quietly folding it into a
  //  distribution would corrupt the very number this tool exists to report.
  const optBtnSeen = {};
  for (const m of body.matchAll(/<button[^>]*class="[^"]*\bopt-btn\b[^"]*"[^>]*>[\s\S]*?<\/button>/g)) {
    const tag = m[0];
    const call = tag.match(/onclick="([A-Za-z0-9_$]+?)Answer\(\s*this\s*,\s*(\d+)\s*\)"/);
    if (!call) continue;
    const letter = (tag.match(/class="opt-letter"[^>]*>\s*([A-D])/) || [])[1];
    if (!letter) continue;
    const act = call[1];
    const q = Number(call[2]);
    const seen = (optBtnSeen[act] = optBtnSeen[act] || {});
    const rec = (seen[q] = seen[q] || { correct: [], total: 0 });
    rec.total += 1;
    if (/data-correct="1"/.test(tag)) rec.correct.push(letter);
  }
  for (const [act, byQ] of Object.entries(optBtnSeen)) {
    const letters = Object.keys(byQ).map(Number).sort((a, b) => a - b)
      .filter((q) => byQ[q].correct.length === 1)
      .map((q) => byQ[q].correct[0]);
    // Never clobber a key another shape already produced on the same page.
    if (letters.length && !byAct[act]) byAct[act] = letters;
  }

  return byAct;
}

function distributionRows(edges) {
  const rows = [];
  for (const e of edges) {
    for (const [activity, letters] of Object.entries(keysFor(e.node.body || ''))) {
      if (letters.length < 2) continue;
      const dist = {};
      letters.forEach((l) => { dist[l] = (dist[l] || 0) + 1; });
      rows.push({
        handle: e.node.handle, activity, n: letters.length, dist,
        // The ORDERED key, which the two checks below need and which a
        // distribution throws away. "40 percent B" and "ABCDB every time" are
        // different defects and only one of them is visible in a histogram.
        letters: letters.slice(),
        key: letters.join(''),
        allSame: Object.keys(dist).length === 1,
        maxShare: Math.max(...Object.values(dist)) / letters.length,
      });
    }
  }
  return rows.sort((a, b) => b.maxShare - a.maxShare);
}

function audit(edges) {
  const rows = distributionRows(edges);
  const same = rows.filter((r) => r.allSame);
  const skew = rows.filter((r) => !r.allSame && r.maxShare >= 0.6);
  console.log(`\nANSWER KEY AUDIT   ${rows.length} graded activities, ${rows.reduce((a, r) => a + r.n, 0)} questions\n`);
  console.log(`EVERY ANSWER THE SAME (${same.length}):`);
  same.length ? same.forEach((r) => console.log(`  ${r.handle.padEnd(42)}${r.activity.padEnd(10)}${r.n} questions, all ${Object.keys(r.dist)[0]}`))
              : console.log('  none');
  console.log(`\n60 PERCENT OR MORE ON ONE LETTER (${skew.length}):`);
  skew.length ? skew.forEach((r) => console.log(`  ${r.handle.padEnd(42)}${r.activity.padEnd(10)}${r.n}q  ${JSON.stringify(r.dist)}`))
              : console.log('  none');
  // ── TWO PATTERNS A DISTRIBUTION CANNOT SEE ────────────────────────────────
  //  Measured on AP Cyber unit 5, 2026-09-01, which passed BOTH checks above:
  //
  //      5.1 ABDCB   5.2 ABCDB   5.3 ABCDB   5.4 ABCDB   5.5 BCADB   5.6 BCDAB
  //
  //  Every quiz is 40 percent B, so nothing hits the 60 percent bar and no key
  //  is all one letter. Yet 5.2, 5.3 and 5.4 are byte identical, and question 5
  //  is B on all six. A student who notices "the last one is always B" scores a
  //  free point on six assessments, which is the exact harm this file exists to
  //  prevent, arriving through a shape the thresholds were not looking for.
  //
  //  DUPLICATE KEYS. Two activities with the same ordered key. Requires 3+
  //  questions, because a pair of 2-question quizzes matching is coincidence.
  const byKey = {};
  rows.filter((r) => r.n >= 3).forEach((r) => { (byKey[r.key] = byKey[r.key] || []).push(r); });
  const dupes = Object.entries(byKey).filter(([, g]) => g.length > 1)
    .sort((a, b) => b[1].length - a[1].length);
  console.log(`\nIDENTICAL KEYS SHARED BY TWO OR MORE ACTIVITIES (${dupes.length}):`);
  dupes.length ? dupes.forEach(([key, g]) => console.log(
    `  ${key.padEnd(12)}${g.length} activities: ${g.map((r) => r.handle + '/' + r.activity).join(', ')}`))
              : console.log('  none');

  //  POSITION LOCK. A question index carrying the same letter on every activity
  //  that has one. Needs at least 4 activities: three in a row is 1 in 16 by
  //  chance, four is 1 in 64, and by six it is 1 in 1024. Below four this would
  //  cry wolf on small courses, which is how a check gets ignored.
  const POSITION_MIN = 4;
  const byPos = {};
  rows.forEach((r) => r.letters.forEach((l, i) => { (byPos[i] = byPos[i] || []).push(l); }));
  const locked = Object.entries(byPos)
    .filter(([, v]) => v.length >= POSITION_MIN && v.every((x) => x === v[0]))
    .map(([i, v]) => ({ q: Number(i) + 1, letter: v[0], n: v.length }));
  console.log(`\nSAME LETTER AT THE SAME QUESTION ON EVERY ACTIVITY (${locked.length}):`);
  locked.length ? locked.forEach((l) => console.log(
    `  question ${l.q}: ${l.letter} on all ${l.n} activities`))
                : console.log('  none');

  const tot = {};
  rows.forEach((r) => Object.entries(r.dist).forEach(([k, v]) => { tot[k] = (tot[k] || 0) + v; }));
  const N = Object.values(tot).reduce((a, b) => a + b, 0);
  console.log(`\nWHOLE-COURSE DISTRIBUTION (${N} questions, even would be 25 percent each):`);
  Object.keys(tot).sort().forEach((k) => console.log(`  ${k}  ${String(tot[k]).padStart(4)}  ${(100 * tot[k] / N).toFixed(1)}%`));
  return { same, skew, dupes, locked };
}

// ── THE opt-btn SHAPE, FOR REBALANCE ────────────────────────────────────────
//  Every AP Cyber unit 5 quiz. Structurally kinder to permute than checkMCQ,
//  and it is worth saying why, because it changes what can go wrong.
//
//  In the checkMCQ shape the correct letter is an ARGUMENT in the handler call
//  and the feedback lives in a separate sibling div keyed by letter, so moving
//  an option means moving three things that are only related by a naming
//  convention. Here every option is one self-contained button:
//
//    <button type="button" class="opt-btn" data-correct="1" data-fb="Correct...."
//            onclick="u5l1quizAnswer(this,1)"><span class="opt-letter">A.</span>Injection</button>
//
//  Correctness, feedback and text are all attributes of the same element, so
//  reordering the buttons carries all three automatically. The ONLY thing that
//  must change is the letter printed in the opt-letter span, because that is
//  positional labelling rather than identity.
//
//  So the rule the whole rebalance obeys holds trivially here: the correct
//  answer never changes, only which letter it sits on.
const OPT_BTN_RE = /<button[^>]*class="[^"]*\bopt-btn\b[^"]*"[^>]*>[\s\S]*?<\/button>/g;
const OPT_CALL_RE = /onclick="([A-Za-z0-9_$]+?)Answer\(\s*this\s*,\s*(\d+)\s*\)"/;
const OPT_LETTER_RE = /(<span[^>]*class="opt-letter"[^>]*>\s*)([A-D])(\s*\.?\s*<\/span>)/;

// Group the buttons of a body into questions, keyed by (handler prefix, index).
// The handler prefix doubles as the activity name, which keeps one page holding
// two quizzes from merging into a single question run.
function readOptBtnQuestions(body) {
  const groups = [];
  const byKey = new Map();
  for (const m of body.matchAll(OPT_BTN_RE)) {
    const tag = m[0];
    const call = OPT_CALL_RE.exec(tag);
    if (!call) continue;
    const lm = OPT_LETTER_RE.exec(tag);
    if (!lm) continue;
    const key = `${call[1]}|${call[2]}`;
    let g = byKey.get(key);
    if (!g) {
      g = { key, act: call[1], q: Number(call[2]), opts: [], gaps: [], start: m.index, end: m.index + tag.length };
      byKey.set(key, g);
      groups.push(g);
    }
    // The exact text between this button and the previous one. Rejoining with a
    // bare newline instead loses the source indentation, which silently rewrites
    // bytes the rebalance has no business touching: 6 spaces x 3 gaps x 5
    // questions is 90 bytes a page of unrelated diff on a live page.
    if (g.opts.length) g.gaps.push(body.slice(g.end, m.index));
    g.end = m.index + tag.length;
    g.opts.push({
      tag,
      letter: lm[2],
      correct: /data-correct="1"/.test(tag),
      // Everything after the letter span is the option's own text.
      text: tag.slice(tag.indexOf(lm[0]) + lm[0].length).replace(/<\/button>\s*$/, '').trim(),
      fb: (tag.match(/data-fb="([^"]*)"/) || [])[1] || '',
    });
  }
  return groups;
}

// Permute one question so its correct option lands on `want`. Returns the new
// HTML for that run of buttons, preserving each button byte for byte except the
// letter it prints.
function permuteOptBtnGroup(g, want) {
  const L = ['A', 'B', 'C', 'D'];
  const correct = g.opts.filter((o) => o.correct);
  // Zero or several correct options is a different defect, and silently
  // permuting it would bake the ambiguity in. Refuse.
  if (correct.length !== 1) return { error: `${g.opts.length} options, ${correct.length} flagged correct` };
  if (!L.includes(want)) return { error: `target letter ${want} is not A-D` };
  if (g.opts.length !== L.length) return { error: `${g.opts.length} options, expected 4` };

  const others = g.opts.filter((o) => !o.correct);
  const slots = L.filter((x) => x !== want);
  const assign = new Map([[correct[0], want]]);
  others.forEach((o, i) => assign.set(o, slots[i]));

  const tags = L.map((slot) => {
    const src = g.opts.find((o) => assign.get(o) === slot);
    // Only the printed letter changes. data-correct, data-fb, onclick and the
    // option text are carried through untouched.
    return src.tag.replace(OPT_LETTER_RE, (whole, pre, _old, post) => pre + slot + post);
  });
  // Separators stay where they were. They are positional formatting, not part of
  // an option, so they do not travel with the option that moves.
  let html = tags[0];
  for (let i = 1; i < tags.length; i++) html += (g.gaps[i - 1] !== undefined ? g.gaps[i - 1] : '\n') + tags[i];
  return { html };
}

function rewriteBodyOptBtn(handle, body, targets) {
  const groups = readOptBtnQuestions(body);
  const problems = [];
  let moved = 0;
  // Splice from the END so earlier offsets stay valid.
  let out = body;
  const ordered = groups.slice().sort((a, b) => a.start - b.start);
  for (let i = ordered.length - 1; i >= 0; i--) {
    const g = ordered[i];
    const want = targets[i];
    if (!want) continue;
    const cur = (g.opts.find((o) => o.correct) || {}).letter;
    const res = permuteOptBtnGroup(g, want);
    if (res.error) { problems.push(`${g.act} q${g.q}: ${res.error}`); continue; }
    if (cur === want) continue;
    moved += 1;
    out = out.slice(0, g.start) + res.html + out.slice(g.end);
  }
  return { body: out, questions: groups.length, moved, problems };
}

// The same guarantee verify() gives the checkMCQ shape: the correct answer's
// TEXT and its FEEDBACK are unchanged, the option set is unchanged, and exactly
// one option is still flagged correct. A rewrite that cannot pass this is not
// written to the CSV.
function verifyOptBtn(handle, before, after) {
  const read = (b) => readOptBtnQuestions(b).map((g) => {
    const c = g.opts.find((o) => o.correct);
    return {
      key: g.key,
      correctText: c ? c.text : null,
      correctFb: c ? c.fb : null,
      correctCount: g.opts.filter((o) => o.correct).length,
      texts: g.opts.map((o) => o.text).sort(),
      letters: g.opts.map((o) => o.letter).sort().join(''),
    };
  });
  const A = read(before), B = read(after), bad = [];
  if (A.length !== B.length) return [`${handle}: question count ${A.length} -> ${B.length}`];
  // EVERYTHING OUTSIDE THE OPTION BUTTONS MUST BE BYTE IDENTICAL.
  //
  // Added after this verifier passed a rewrite that silently dropped 90 bytes a
  // page. The answer checks below were all green, because they only ever looked
  // at option semantics; the loss was inter-button indentation, which no
  // semantic check can see. A rebalance that edits bytes it was not asked to
  // edit is one nobody can review by diffing, so it is refused.
  const stripBtns = (b) => b.replace(OPT_BTN_RE, ' BTN ');
  if (stripBtns(before) !== stripBtns(after)) {
    bad.push(`${handle}: content OUTSIDE the option buttons changed`);
  }
  for (let i = 0; i < A.length; i++) {
    if (A[i].key !== B[i].key) bad.push(`${handle} ${A[i].key}: question identity changed`);
    if (A[i].correctText !== B[i].correctText) bad.push(`${handle} ${A[i].key}: the CORRECT ANSWER TEXT changed`);
    if (A[i].correctFb !== B[i].correctFb) bad.push(`${handle} ${A[i].key}: the correct answer's feedback changed`);
    if (JSON.stringify(A[i].texts) !== JSON.stringify(B[i].texts)) bad.push(`${handle} ${A[i].key}: the option set changed`);
    if (B[i].correctCount !== 1) bad.push(`${handle} ${A[i].key}: ${B[i].correctCount} options flagged correct`);
    if (B[i].letters !== 'ABCD') bad.push(`${handle} ${A[i].key}: letters are ${B[i].letters}, not ABCD`);
  }
  return bad;
}

// Permute so the correct option lands on `want`, carrying its feedback with it.
function rewriteBody(handle, body, targets) {
  const problems = [];
  let qi = 0, moved = 0;
  const out = body.replace(QUESTION_RE, (whole, qid, optsInner, fbsBlock) => {
    const want = targets[qi]; qi += 1;
    if (!want) return whole;
    const q = readQuestion(qid, optsInner, fbsBlock);
    if (q.error) { problems.push(`${qid}: ${q.error}`); return whole; }
    if (want === q.correctLetter) return whole;
    moved += 1;

    const others = q.opts.filter((o) => o.letter !== q.correctLetter);
    const slots = L.filter((x) => x !== want);
    const assign = new Map([[q.correctLetter, want]]);
    others.forEach((o, i) => assign.set(o.letter, slots[i]));

    const opts = L.map((slot) => {
      const src = q.opts.find((o) => assign.get(o.letter) === slot);
      return `<button class="mcq-option" onclick="checkMCQ('${qid}','${slot}','${want}','${qid}-fb-${slot}')">`
        + `<span class="mcq-option-letter">${slot}</span> ${src.text}</button>`;
    }).join('\n');
    const fbs = L.map((slot) => {
      const src = q.opts.find((o) => assign.get(o.letter) === slot);
      const fb = q.fbs[src.letter];
      return `<div id="${qid}-fb-${slot}" class="mcq-feedback ${fb.kind}">${fb.inner}</div>`;
    }).join('\n');
    return `<div class="mcq-options" id="${qid}-options">\n${opts}\n</div>\n${fbs}`;
  });
  return { body: out, questions: qi, moved, problems };
}

// A rewritten page is only acceptable if the RIGHT ANSWER did not change.
function verify(handle, before, after) {
  const read = (b) => {
    const out = [];
    for (const m of b.matchAll(QUESTION_RE)) {
      const q = readQuestion(m[1], m[2], m[3]);
      if (q.error) continue;
      out.push({
        qid: m[1],
        correctText: q.opts.find((o) => o.letter === q.correctLetter).text,
        texts: q.opts.map((o) => o.text).sort(),
        correctFb: q.fbs[q.correctLetter].inner,
        correctCount: Object.values(q.fbs).filter((f) => f.kind === 'correct-fb').length,
      });
    }
    return out;
  };
  const A = read(before), B = read(after), bad = [];
  if (A.length !== B.length) return [`${handle}: question count ${A.length} -> ${B.length}`];
  for (let i = 0; i < A.length; i++) {
    if (A[i].correctText !== B[i].correctText) bad.push(`${handle} ${A[i].qid}: the CORRECT ANSWER TEXT changed`);
    if (JSON.stringify(A[i].texts) !== JSON.stringify(B[i].texts)) bad.push(`${handle} ${A[i].qid}: the option set changed`);
    if (A[i].correctFb !== B[i].correctFb) bad.push(`${handle} ${A[i].qid}: the correct answer's feedback changed`);
    if (B[i].correctCount !== 1) bad.push(`${handle} ${A[i].qid}: ${B[i].correctCount} correct-fb blocks`);
  }
  return bad;
}

function rebalance(edges, outPath) {
  const rows = [], bad = [], unchanged = [];
  console.log('\nREBALANCE\n');
  for (const e of edges) {
    const targets = TARGETS[e.node.handle];
    if (!targets) continue;
    // Two shapes, one contract. checkMCQ wins when present, matching the
    // precedence keysFor already uses: it is the older, authoritative shape, and
    // a page carrying both is a page where the newer one must not overwrite it.
    const isCheckMcq = QUESTION_RE.test(e.node.body);
    QUESTION_RE.lastIndex = 0;   // /g regex: .test leaves state behind
    const rw = isCheckMcq ? rewriteBody : rewriteBodyOptBtn;
    const vf = isCheckMcq ? verify : verifyOptBtn;
    const r = rw(e.node.handle, e.node.body, targets);
    const problems = r.problems.concat(vf(e.node.handle, e.node.body, r.body));
    console.log(`  ${e.node.handle.padEnd(42)}${r.questions} questions, ${r.moved} moved`
      + (problems.length ? `   PROBLEMS: ${problems.slice(0, 3).join('; ')}` : ''));
    bad.push(...problems);
    // A page already sitting on its target needs no import row. Re-uploading an
    // unchanged body is pure risk: it can clobber an edit made since the pull,
    // and it pads the sheet with pages nobody needs to check.
    if (r.moved === 0) { unchanged.push(e.node.handle); continue; }
    rows.push({ handle: e.node.handle, title: e.node.title, body: r.body });
  }
  if (bad.length) {
    console.error(`\n  ${bad.length} problem(s). No file written: a CSV this cannot vouch for is worse than none.\n`);
    process.exit(1);
  }
  const cell = (s) => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const csv = [['Handle', 'Command', 'Title', 'Body HTML'].join(',')]
    .concat(rows.map((r) => [cell(r.handle), cell('UPDATE'), cell(r.title), cell(r.body)].join(',')))
    .join('\r\n') + '\r\n';
  fs.writeFileSync(outPath, '﻿' + csv);
  if (unchanged.length) {
    console.log(`\n  ${unchanged.length} page(s) already on target, left out of the sheet.`);
  }
  console.log(`\n  verified: the correct answer, its feedback and the option set are unchanged in every question.`);
  console.log(`  wrote ${outPath}  (${rows.length} pages, ${(csv.length / 1024).toFixed(0)} KB)\n`);
}

if (require.main === module) {
  const [src, ...rest] = process.argv.slice(2);
  if (!src) {
    console.error('usage: node scripts/answer-key-audit.js <pages.json> [--rebalance <out.csv>]');
    process.exit(2);
  }
  const edges = JSON.parse(fs.readFileSync(src, 'utf8')).data.pages.edges || [];
  const i = rest.indexOf('--rebalance');
  if (i !== -1) rebalance(edges, rest[i + 1]);
  else audit(edges);
}

module.exports = { keysFor, distributionRows, rewriteBody, verify, audit,
  readOptBtnQuestions, rewriteBodyOptBtn, verifyOptBtn, TARGETS };
