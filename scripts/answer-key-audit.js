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
  const tot = {};
  rows.forEach((r) => Object.entries(r.dist).forEach(([k, v]) => { tot[k] = (tot[k] || 0) + v; }));
  const N = Object.values(tot).reduce((a, b) => a + b, 0);
  console.log(`\nWHOLE-COURSE DISTRIBUTION (${N} questions, even would be 25 percent each):`);
  Object.keys(tot).sort().forEach((k) => console.log(`  ${k}  ${String(tot[k]).padStart(4)}  ${(100 * tot[k] / N).toFixed(1)}%`));
  return { same, skew };
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
  const rows = [], bad = [];
  console.log('\nREBALANCE\n');
  for (const e of edges) {
    const targets = TARGETS[e.node.handle];
    if (!targets) continue;
    const r = rewriteBody(e.node.handle, e.node.body, targets);
    const problems = r.problems.concat(verify(e.node.handle, e.node.body, r.body));
    console.log(`  ${e.node.handle.padEnd(42)}${r.questions} questions, ${r.moved} moved`
      + (problems.length ? `   PROBLEMS: ${problems.slice(0, 3).join('; ')}` : ''));
    bad.push(...problems);
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

module.exports = { keysFor, distributionRows, rewriteBody, verify, TARGETS };
