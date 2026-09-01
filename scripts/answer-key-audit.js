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
  'ap-csp-course-bi3-undecidable-problems':  ['D', 'A', 'C', 'D', 'B', 'A'],
  'ap-csp-course-bi3-iteration':             ['A', 'D', 'C', 'B', 'D', 'A'],
  'ap-csp-course-bi3-lists':                 ['C', 'D', 'A', 'D', 'B', 'C'],
  'ap-csp-course-bi3-strings':               ['D', 'A', 'D', 'C', 'A', 'B'],
  'ap-csp-course-bi3-conditionals':          ['B', 'C', 'D', 'A', 'D', 'C'],
  'ap-csp-course-bi3-nested-conditionals':   ['D', 'B', 'A', 'C', 'D', 'A'],
  'ap-csp-course-bi3-developing-algorithms': ['C', 'D', 'B', 'A', 'C', 'D'],
  'ap-csp-course-bi4-fault-tolerance':       ['A', 'C', 'D', 'B', 'A', 'D'],

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
  'ap-csp-course-bi1-identifying-correcting-errors': ['C', 'D', 'A', 'B', 'C', 'D'],
  'ap-csp-course-bi1-program-design-development': ['A', 'B', 'C', 'D', 'A', 'B'],
  'ap-csp-course-bi1-program-function-purpose':  ['C', 'D', 'A', 'B', 'C', 'D'],
  'ap-csp-course-bi2-binary-numbers':            ['A', 'B', 'C', 'D', 'A', 'B'],
  'ap-csp-course-bi2-data-compression':          ['C', 'D', 'A', 'B', 'C', 'D'],
  'ap-csp-course-bi2-extracting-information':    ['A', 'B', 'C', 'D', 'A', 'B'],
  'ap-csp-course-bi2-using-programs-with-data':  ['C', 'D', 'A', 'B', 'C', 'D'],
  'ap-csp-course-bi3-algorithmic-efficiency':    ['A', 'B', 'C', 'D', 'A', 'B'],
  'ap-csp-course-bi3-binary-search':             ['C', 'D', 'A', 'B', 'C', 'D'],
  'ap-csp-course-bi3-boolean-expressions':       ['A', 'B', 'C', 'D', 'A', 'B'],
  'ap-csp-course-bi3-calling-procedures':        ['C', 'D', 'A', 'B', 'C', 'D'],
  'ap-csp-course-bi3-data-abstraction':          ['A', 'B', 'C', 'D', 'A', 'B'],
  'ap-csp-course-bi3-developing-procedures':     ['C', 'D', 'A', 'B', 'C', 'D'],
  'ap-csp-course-bi3-libraries':                 ['A', 'B', 'C', 'D', 'A', 'B'],
  'ap-csp-course-bi3-mathematical-expressions':  ['C', 'D', 'A', 'B', 'C', 'D'],
  'ap-csp-course-bi3-random-values':             ['A', 'B', 'C', 'D', 'A', 'B'],
  'ap-csp-course-bi3-simulations':               ['C', 'D', 'A', 'B', 'C', 'D'],
  'ap-csp-course-bi3-variables':                 ['A', 'B', 'C', 'D', 'A', 'B'],
  'ap-csp-course-bi4-parallel-distributed-computing': ['C', 'D', 'A', 'B', 'C', 'D'],
  'ap-csp-course-bi4-the-internet':              ['A', 'B', 'C', 'D', 'A', 'B'],
  'ap-csp-course-bi5-beneficial-harmful-effects': ['C', 'D', 'A', 'B', 'C', 'D'],
  'ap-csp-course-bi5-computing-bias':            ['A', 'B', 'C', 'D', 'A', 'B'],
  'ap-csp-course-bi5-crowdsourcing':             ['C', 'D', 'A', 'B', 'C', 'D'],
  'ap-csp-course-bi5-digital-divide':            ['A', 'B', 'C', 'D', 'A', 'B'],
  'ap-csp-course-bi5-legal-ethical-concerns':    ['C', 'D', 'B', 'C', 'D', 'B'],
  'ap-csp-course-bi5-safe-computing':            ['C', 'B', 'C', 'B', 'C', 'B'],
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

// ── THE PATTERN NEITHER CHECK ABOVE SEES: A REPEATING BLOCK ─────────────────
//  Duplicate keys and position lock both compare activities to EACH OTHER, so a
//  single quiz whose own key cycles slips past them, and so does the histogram.
//  Measured on the AP Cyber teacher bundle, 2026-09-01:
//
//      2.1  ACBD ABCD BCDA BCDA                      4/4/4/4, dead even
//      2.2  CADB CADB CADB CADB CABD BCDA DACD       CADB four and a half times
//
//  Both are at or near 25 percent on every letter, neither is all one letter,
//  neither shares a key with anything, and no position is locked across the
//  pair. All four checks report "none" on the most guessable key a quiz can
//  carry: read four answers on 2.2 and you have the next twelve.

// The longest stretch anywhere in the key that repeats a block of `period`,
// counting the block itself plus every repeat, so "CADB" x4 reports 16.
//
// `maxPeriod` bounds the SEARCH rather than filtering its result, and that is
// the whole correctness of this function. Taking the longest cycle at any
// period and then rejecting it for being too long reports nothing on 2.1: a
// meaningless period-7 run of 12 sits on top of the real period-4 BCDA BCDA and
// hides it. There is an assertion named for that mutation.
function longestCycle(letters, maxPeriod = Infinity) {
  const n = letters.length;
  let best = { period: 0, start: 0, len: 0 };
  for (let p = 1; p * 2 <= n && p <= maxPeriod; p++) {
    let i = p;
    while (i < n) {
      if (letters[i] !== letters[i - p]) { i++; continue; }
      let j = i;
      while (j < n && letters[j] === letters[j - p]) j++;
      const len = (j - i) + p;
      if (len > best.len || (len === best.len && p < best.period)) best = { period: p, start: i - p, len };
      i = j + 1;
    }
  }
  return best;
}

// Report a cycle only when it covers enough of the key to be usable by a
// student: half the questions, and never fewer than eight. A five-item quiz
// cannot cycle meaningfully and flagging one would teach people to skip this,
// which is the same reasoning POSITION_MIN is set on.
function cycleFinding(letters) {
  const c = longestCycle(letters, 4);
  if (!c.period) return null;
  if (c.len < 8 || c.len < letters.length / 2) return null;
  return Object.assign({}, c, { block: letters.slice(c.start, c.start + c.period).join('') });
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

  //  REPEATING BLOCK, the one defect visible in a single key on its own.
  const cycles = rows.map((r) => ({ r, c: cycleFinding(r.letters) })).filter((x) => x.c);
  console.log(`\nA REPEATING BLOCK INSIDE ONE KEY (${cycles.length}):`);
  cycles.length ? cycles.forEach(({ r, c }) => console.log(
    `  ${r.handle.padEnd(42)}${r.activity.padEnd(10)}${c.block} x${(c.len / c.period).toFixed(1)}`
    + ` covers ${c.len} of ${r.n}   ${r.key}`))
                : console.log('  none');

  const tot = {};
  rows.forEach((r) => Object.entries(r.dist).forEach(([k, v]) => { tot[k] = (tot[k] || 0) + v; }));
  const N = Object.values(tot).reduce((a, b) => a + b, 0);
  console.log(`\nWHOLE-COURSE DISTRIBUTION (${N} questions, even would be 25 percent each):`);
  Object.keys(tot).sort().forEach((k) => console.log(`  ${k}  ${String(tot[k]).padStart(4)}  ${(100 * tot[k] / N).toFixed(1)}%`));
  return { same, skew, dupes, locked, cycles };
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
    const r = rewriteBody(e.node.handle, e.node.body, targets);
    const problems = r.problems.concat(verify(e.node.handle, e.node.body, r.body));
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

module.exports = {
  keysFor, distributionRows, rewriteBody, verify, audit, TARGETS,
  longestCycle, cycleFinding,
};
