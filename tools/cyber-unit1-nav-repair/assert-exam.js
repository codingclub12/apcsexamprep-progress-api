'use strict';
// Assertions from Task B.

const { LABEL_RE, DISTRACTOR_RE, regionFrom, ORDER } = require('./transform-exam.js');

const EXPECTED_KEY = 'B D B A D A B A D C B D C C A D B C C A'.split(' ');

function parseKey(body) {
  const m = /var ANSWERS = \{([^}]*)\};/.exec(body);
  if (!m) return null;
  const out = {};
  for (const p of m[1].split(',')) {
    const kv = /"(e\d+)":\s*"([A-D])"/.exec(p);
    if (kv) out[kv[1]] = kv[2];
  }
  return out;
}

// Returns {A:'text', ...} plus the raw prefix letter seen in the span.
function parseOptions(body, q) {
  const idx = body.indexOf(`<div class="q-block" id="q-e${q}">`);
  if (idx < 0) return null;
  const block = regionFrom(body, idx);
  const blockHtml = body.slice(block.start, block.end);
  const oIdx = blockHtml.indexOf('<div class="options">');
  const opts = regionFrom(blockHtml, oIdx);
  const labels = opts.inner.match(LABEL_RE) || [];
  const res = { byLetter: {}, prefixMismatch: [], order: [] };
  for (const lab of labels) {
    const v = /value="([A-D])"/.exec(lab)[1];
    const sp = /<span>\(([A-D])\)\s*([\s\S]*?)<\/span>/.exec(lab);
    if (!sp) { res.prefixMismatch.push(`${v}: unparseable span`); continue; }
    if (sp[1] !== v) res.prefixMismatch.push(`value=${v} but prefix=(${sp[1]})`);
    res.byLetter[v] = sp[2].trim();
    res.order.push(v);
  }
  const dIdx = blockHtml.indexOf('<div class="fb-distractors">');
  res.distractors = dIdx >= 0
    ? (regionFrom(blockHtml, dIdx).inner.match(DISTRACTOR_RE) || [])
        .map((e) => /<strong>\(([A-D])\)<\/strong>/.exec(e)[1])
    : [];
  return res;
}

function assertExam(oldBody, newBody) {
  const results = [];
  const ok = (name, pass, detail) => results.push({ name, pass, detail: detail || '' });

  const oldKey = parseKey(oldBody);
  const newKey = parseKey(newBody);

  // 1. balanced key
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  for (let q = 1; q <= 20; q++) counts[newKey[`e${q}`]]++;
  const balanced = counts.A === 5 && counts.B === 5 && counts.C === 5 && counts.D === 5;
  ok('1. key is 5A/5B/5C/5D', balanced, JSON.stringify(counts));

  // key matches the expected string
  const keyArr = [];
  for (let q = 1; q <= 20; q++) keyArr.push(newKey[`e${q}`]);
  ok('1b. key matches expected string', keyArr.join(' ') === EXPECTED_KEY.join(' '), keyArr.join(' '));

  // 2/3/4/5 per question
  const setProblems = [];
  const moveProblems = [];
  const shapeProblems = [];
  const distProblems = [];
  const preExisting = [];
  const thinDistractors = [];
  const untouched = [];
  for (let q = 1; q <= 20; q++) {
    const o = parseOptions(oldBody, q);
    const n = parseOptions(newBody, q);
    if (!o || !n) { shapeProblems.push(`Q${q} unparseable`); continue; }

    // 2. option text sets identical
    const os = Object.values(o.byLetter).slice().sort();
    const ns = Object.values(n.byLetter).slice().sort();
    if (JSON.stringify(os) !== JSON.stringify(ns)) setProblems.push(`Q${q}`);

    // 3. correct answer text preserved across the move
    const oldText = o.byLetter[oldKey[`e${q}`]];
    const newText = n.byLetter[newKey[`e${q}`]];
    if (oldText !== newText) moveProblems.push(`Q${q}: "${String(oldText).slice(0, 40)}" != "${String(newText).slice(0, 40)}"`);

    // 4. exactly one each of A-D, value matches visible prefix
    const letters = n.order.slice().sort().join('');
    if (letters !== 'ABCD') shapeProblems.push(`Q${q} letters=${letters}`);
    if (n.prefixMismatch.length) shapeProblems.push(`Q${q} ${n.prefixMismatch.join(',')}`);

    // 5. no distractor entry points at the correct letter. The page already
    // violates this on Q8, so only a NEW collision is a failure of this pass.
    const oldCollide = o.distractors.includes(oldKey[`e${q}`]);
    const newCollide = n.distractors.includes(newKey[`e${q}`]);
    if (newCollide && !oldCollide) distProblems.push(`Q${q} (new)`);
    if (newCollide && oldCollide) preExisting.push(`Q${q}`);
    if (n.distractors.length !== 3) thinDistractors.push(`Q${q}(${n.distractors.length})`);

    // questions not listed for reorder must be byte-identical
    if (!ORDER[q]) {
      const oIdx = oldBody.indexOf(`<div class="q-block" id="q-e${q}">`);
      const nIdx = newBody.indexOf(`<div class="q-block" id="q-e${q}">`);
      const ob = oldBody.slice(oIdx, regionFrom(oldBody, oIdx).end);
      const nbb = newBody.slice(nIdx, regionFrom(newBody, nIdx).end);
      if (ob !== nbb) untouched.push(`Q${q}`);
    }
  }
  ok('2. option text sets identical pre/post', setProblems.length === 0, setProblems.join(', '));
  ok('3. correct answer text preserved across the move', moveProblems.length === 0, moveProblems.join(' | '));
  ok('4. one each A-D, value matches visible prefix', shapeProblems.length === 0, shapeProblems.join(', '));
  ok('5. no NEW fb-distractors/correct-letter collision', distProblems.length === 0, distProblems.join(', '));
  results.preExistingCollisions = preExisting;
  results.thinDistractors = thinDistractors;

  // 6. longest run of identical consecutive answers
  let run = 1;
  let maxRun = 1;
  for (let i = 1; i < keyArr.length; i++) {
    run = keyArr[i] === keyArr[i - 1] ? run + 1 : 1;
    if (run > maxRun) maxRun = run;
  }
  ok('6. longest identical run <= 2', maxRun <= 2, `maxRun=${maxRun}`);

  ok('7. unlisted questions byte-identical', untouched.length === 0, untouched.join(', '));

  return results;
}

module.exports = { assertExam, parseKey, parseOptions };
