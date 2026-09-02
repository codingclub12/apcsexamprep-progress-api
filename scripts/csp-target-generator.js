// Deterministic CSP target generator.
//
// The previous CSP rebalance was asked to even out a LETTER DISTRIBUTION and did
// that perfectly: A51 B51 C53 D55 of 210. It achieved it by assigning two
// rotations across the whole course, so 25 of 35 quizzes ended up sharing two
// keys. The measure improved and the thing the measure stood for got worse.
//
// So this optimises three things at once, and refuses to emit unless all three
// hold:
//   1. every key distinct
//   2. per-POSITION balance, so "question 4 is usually C" cannot emerge
//   3. overall balance
//
// Greedy and deterministic: at each position take the letter least used at that
// position, tie-broken by least used overall, tie-broken by alphabet. If the
// finished key collides with one already assigned, rotate the last position
// forward until it does not. No randomness, so a rerun reproduces the file and a
// reviewer can check the intent.
const { TARGETS } = require('./answer-key-audit');
const L = ['A', 'B', 'C', 'D'];

// FOURTH PROPERTY, added 2026-09-02 after the first run shipped CDACDA.
//
// Distinct, per-column balanced and overall balanced are all properties BETWEEN
// keys. Every one of them is satisfied by a key that repeats inside itself, and
// that is the whole defect: learn CDA and the quiz is free. CDACDA passed all
// three and went into a sheet.
//
// Refuse any key with a period that TILES it: p divides the length and the key
// is that block repeated. For a 6 question quiz that is p = 1, 2 or 3, which
// covers AAAAAA, ABABAB and CDACDA. A partial echo like ABCDAB is a two
// character tail at 1 in 16, below the bar this file already uses elsewhere, and
// is left to the distinctness property that made it a problem before.
function isPeriodic(key) {
  const k = Array.isArray(key) ? key.join('') : key;
  for (let p = 1; p < k.length; p++) {
    if (k.length % p) continue;
    let tiles = true;
    for (let i = p; i < k.length && tiles; i++) if (k[i] !== k[i - p]) tiles = false;
    if (tiles) return p;
  }
  return null;
}

const handles = Object.keys(TARGETS).filter((h) => /csp/.test(h)).sort();
const N = handles.length;
const Q = TARGETS[handles[0]].length;
for (const h of handles) {
  if (TARGETS[h].length !== Q) throw new Error(h + ' has ' + TARGETS[h].length + ' questions, expected ' + Q);
}

const perPos = Array.from({ length: Q }, () => ({ A: 0, B: 0, C: 0, D: 0 }));
const overall = { A: 0, B: 0, C: 0, D: 0 };
const used = new Set();
const out = {};

handles.forEach((h, qi) => {
  // The final tie-break rotates with the quiz index, which is what stops the
  // greedy converging. Without it every quiz sees the same balance state and
  // resolves ties identically, so it emits the same key over and over: exactly
  // the failure mode that produced two rotations across 35 quizzes last time.
  const rank = (c, j) => (L.indexOf(c) - (qi + j) + 8) % 4;
  let key = [];
  // Counters are updated AS EACH POSITION IS CHOSEN, not after the key is
  // finished. The first version updated them only at the end, so all six
  // positions in a quiz were picked against the same stale overall count and the
  // overall term could never bite. That is why weighting it made no difference:
  // it was reading a number that had not moved yet.
  for (let j = 0; j < Q; j++) {
    // Position and overall balance carry EQUAL weight. Ranking by position
    // first and only consulting overall on ties lets overall drift: the first
    // run produced perfect 9/9/9/8 columns and an overall of 54/54/51/51,
    // because every column's single 8 landed on the same two letters. Each
    // column contributes exactly one 8 (9+9+9+8 = 35), and those six 8s have to
    // be spread across the four letters, which is what the overall term buys.
    // Scaled by Q so the two ranges are comparable: overall is about Q times
    // position.
    const score = (c) => perPos[j][c] * Q + overall[c];
    const best = L.slice().sort((x, y) =>
      (score(x) - score(y)) || (rank(x, j) - rank(y, j)))[0];
    key.push(best);
    perPos[j][best] += 1; overall[best] += 1;
  }
  // A key is rejected for EITHER reason, and the same repair handles both.
  const rejected = (k) => used.has(k.join('')) || isPeriodic(k) !== null;

  // Fallback if that still collides: try every single-position rotation in a
  // fixed order, latest position first so balance is perturbed least.
  if (rejected(key)) {
    let fixed = null, fixedAt = -1;
    for (let j = Q - 1; j >= 0 && !fixed; j--) {
      for (let d = 1; d <= 3 && !fixed; d++) {
        const cand = key.slice();
        cand[j] = L[(L.indexOf(cand[j]) + d) % 4];
        if (!rejected(cand)) { fixed = cand; fixedAt = j; }
      }
    }
    if (fixed) {
      // Move the counters with the letter that changed, or the balance figures
      // stop describing the keys actually emitted.
      const oldC = key[fixedAt], newC = fixed[fixedAt];
      perPos[fixedAt][oldC] -= 1; overall[oldC] -= 1;
      perPos[fixedAt][newC] += 1; overall[newC] += 1;
      key = fixed;
    }
  }
  if (rejected(key)) throw new Error('could not repair ' + key.join('') + ' for ' + h);
  used.add(key.join(''));
  out[h] = key;
});

// ── Refuse to emit unless every property holds ──────────────────────────────
const keys = handles.map((h) => out[h].join(''));
const problems = [];
if (new Set(keys).size !== keys.length) problems.push('duplicate keys');
for (const h of handles) {
  const p = isPeriodic(out[h]);
  if (p !== null) problems.push(h + ' is periodic at ' + p + ': ' + out[h].join(''));
}
for (let j = 0; j < Q; j++) {
  const col = handles.map((h) => out[h][j]);
  if (new Set(col).size === 1) problems.push('position ' + (j + 1) + ' is locked');
  const counts = L.map((c) => col.filter((x) => x === c).length);
  if (Math.max(...counts) - Math.min(...counts) > 2) {
    problems.push('position ' + (j + 1) + ' unbalanced: ' + counts.join('/'));
  }
}
const tot = L.map((c) => overall[c]);
if (Math.max(...tot) - Math.min(...tot) > 2) problems.push('overall unbalanced: ' + tot.join('/'));

console.log('quizzes           :', N, 'x', Q, 'questions =', N * Q, 'slots');
console.log('all keys distinct :', new Set(keys).size === keys.length);
console.log('none periodic     :', keys.every((k) => isPeriodic(k) === null));
console.log('overall           :', JSON.stringify(overall), ' even is', (N * Q / 4).toFixed(1));
console.log('per position      :');
for (let j = 0; j < Q; j++) console.log('   Q' + (j + 1), JSON.stringify(perPos[j]), ' even is', (N / 4).toFixed(2));
console.log();
if (problems.length) { console.error('REFUSING:', problems.join('; ')); process.exit(1); }
console.log('all four properties hold.');

// Emit as a JS block ready to paste into TARGETS.
const width = Math.max(...handles.map((h) => h.length));
const lines = handles.map((h) =>
  "  '" + h + "':" + ' '.repeat(width - h.length) + " ['" + out[h].join("', '") + "'],");
require('fs').writeFileSync(process.argv[2] || 'csp-targets.txt', lines.join('\n') + '\n');
console.log('wrote ' + (process.argv[2] || 'csp-targets.txt'));
