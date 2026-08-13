'use strict';
// Task B: rebalance the Unit 1 exam answer key. Options are reordered only;
// no question or option wording changes.

const LETTERS = ['A', 'B', 'C', 'D'];

// For each question, the OLD letters in their NEW A,B,C,D order.
const ORDER = {
  2: ['A', 'C', 'D', 'B'],
  5: ['A', 'C', 'D', 'B'],
  6: ['B', 'A', 'C', 'D'],
  9: ['A', 'C', 'D', 'B'],
  12: ['D', 'B', 'C', 'A'],
  15: ['B', 'A', 'C', 'D'],
  20: ['B', 'A', 'C', 'D'],
};

const NEW_ANSWERS = {
  e1: 'B', e2: 'D', e3: 'B', e4: 'A', e5: 'D', e6: 'A', e7: 'B', e8: 'A', e9: 'D', e10: 'C',
  e11: 'B', e12: 'D', e13: 'C', e14: 'C', e15: 'A', e16: 'D', e17: 'B', e18: 'C', e19: 'C', e20: 'A',
};

// old letter -> new letter, derived from ORDER.
function remapFor(q) {
  const map = {};
  ORDER[q].forEach((oldL, i) => { map[oldL] = LETTERS[i]; });
  return map;
}

function matchingCloseDiv(html, fromIdx) {
  const re = /<div\b|<\/div>/gi;
  re.lastIndex = fromIdx;
  let depth = 1;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[0][1] === '/') {
      depth--;
      if (depth === 0) return { start: m.index, end: m.index + m[0].length };
    } else depth++;
  }
  return null;
}

// Returns {start,end,html} for a <div class="..."> region, given its opening tag index.
function regionFrom(html, openIdx) {
  const gt = html.indexOf('>', openIdx);
  const close = matchingCloseDiv(html, gt + 1);
  return { start: openIdx, end: close.end, inner: html.slice(gt + 1, close.start), innerStart: gt + 1, innerEnd: close.start };
}

const LABEL_RE = /<label class="option-label">[\s\S]*?<\/label>/g;
const DISTRACTOR_RE = /<p><strong>\(([A-D])\)<\/strong>[\s\S]*?<\/p>/g;

function transformExam(body, notes) {
  let out = body;

  // --- B1: the answer key ---
  const keyRe = /var ANSWERS = \{[^}]*\};/;
  const keyMatch = keyRe.exec(out);
  if (!keyMatch) throw new Error('ANSWERS line not found');
  const newKey = 'var ANSWERS = {' +
    Object.keys(NEW_ANSWERS).map((k) => `"${k}": "${NEW_ANSWERS[k]}"`).join(', ') + '};';
  out = out.slice(0, keyMatch.index) + newKey + out.slice(keyMatch.index + keyMatch[0].length);
  notes.push('ANSWERS rewritten');

  // Process questions high-to-low so splices do not shift earlier offsets.
  const qs = Object.keys(ORDER).map(Number).sort((a, b) => b - a);
  for (const q of qs) {
    const map = remapFor(q);

    // --- B2: reorder the option labels ---
    const qBlockIdx = out.indexOf(`<div class="q-block" id="q-e${q}">`);
    if (qBlockIdx < 0) throw new Error(`q-block e${q} not found`);
    const qBlock = regionFrom(out, qBlockIdx);
    let blockHtml = out.slice(qBlock.start, qBlock.end);

    const optIdx = blockHtml.indexOf('<div class="options">');
    if (optIdx < 0) throw new Error(`options div not found for e${q}`);
    const opts = regionFrom(blockHtml, optIdx);

    const labels = opts.inner.match(LABEL_RE);
    if (!labels || labels.length !== 4) throw new Error(`e${q}: expected 4 labels, got ${labels ? labels.length : 0}`);

    const byOld = {};
    for (const lab of labels) {
      const v = /value="([A-D])"/.exec(lab);
      if (!v) throw new Error(`e${q}: label without value`);
      byOld[v[1]] = lab;
    }
    const reordered = ORDER[q].map((oldL, i) => {
      const newL = LETTERS[i];
      let lab = byOld[oldL];
      if (!lab) throw new Error(`e${q}: missing option ${oldL}`);
      lab = lab.replace(/value="[A-D]"/, `value="${newL}"`);
      lab = lab.replace(`(${oldL})`, `(${newL})`);
      return lab;
    });

    let k = 0;
    const newOptInner = opts.inner.replace(LABEL_RE, () => reordered[k++]);
    blockHtml = blockHtml.slice(0, opts.innerStart) + newOptInner + blockHtml.slice(opts.innerEnd);
    notes.push(`Q${q} options reordered ${ORDER[q].join('')}`);

    // --- B3a: relabel and re-sort the distractor feedback ---
    const dIdx = blockHtml.indexOf('<div class="fb-distractors">');
    if (dIdx < 0) throw new Error(`fb-distractors not found for e${q}`);
    const dist = regionFrom(blockHtml, dIdx);
    const entries = dist.inner.match(DISTRACTOR_RE) || [];
    const relabelled = entries.map((e) => {
      const oldL = /<strong>\(([A-D])\)<\/strong>/.exec(e)[1];
      const newL = map[oldL];
      return { letter: newL, html: e.replace(`<strong>(${oldL})</strong>`, `<strong>(${newL})</strong>`) };
    }).sort((a, b) => a.letter.localeCompare(b.letter));

    let j = 0;
    const newDistInner = dist.inner.replace(DISTRACTOR_RE, () => relabelled[j++].html);
    blockHtml = blockHtml.slice(0, dist.innerStart) + newDistInner + blockHtml.slice(dist.innerEnd);
    notes.push(`Q${q} distractors -> ${relabelled.map((r) => r.letter).join('')}`);

    // --- B3b: relabel letter references inside fb-exp ---
    const eIdx = blockHtml.indexOf('<div class="fb-exp">');
    if (eIdx >= 0) {
      const exp = regionFrom(blockHtml, eIdx);
      const newExp = exp.inner.replace(/\bOptions? [A-D](?:(?:,| and)+ [A-D])*/g, (phrase) => {
        const letters = (phrase.match(/[A-D]/g) || []).map((L) => map[L]).sort();
        if (letters.length === 1) return `Option ${letters[0]}`;
        if (letters.length === 2) return `Options ${letters[0]} and ${letters[1]}`;
        return `Options ${letters.slice(0, -1).join(', ')} and ${letters[letters.length - 1]}`;
      });
      if (newExp !== exp.inner) notes.push(`Q${q} fb-exp letters remapped`);
      blockHtml = blockHtml.slice(0, exp.innerStart) + newExp + blockHtml.slice(exp.innerEnd);
    }

    out = out.slice(0, qBlock.start) + blockHtml + out.slice(qBlock.end);
  }

  return out;
}

module.exports = { transformExam, ORDER, NEW_ANSWERS, LETTERS, remapFor, LABEL_RE, DISTRACTOR_RE, regionFrom };
