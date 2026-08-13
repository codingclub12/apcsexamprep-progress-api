// Rebalances the answer-letter distribution on the AP Cybersecurity Unit 1 exam.
// Options are REORDERED only: every option's text is carried over verbatim from
// the live page, so no question or option wording can change.
const fs = require('fs');

const SRC = process.argv[2];
const OUT = process.argv[3];
let body = fs.readFileSync(SRC, 'utf8');

const L = ['A', 'B', 'C', 'D'];

// newLetter -> letter that option currently carries
const PERM = {
  2:  { A: 'A', B: 'C', C: 'D', D: 'B' },
  5:  { A: 'A', B: 'C', C: 'D', D: 'B' },
  6:  { A: 'B', B: 'A', C: 'C', D: 'D' },
  9:  { A: 'A', B: 'C', C: 'D', D: 'B' },
  12: { A: 'D', B: 'B', C: 'C', D: 'A' },
  15: { A: 'B', B: 'A', C: 'C', D: 'D' },
  20: { A: 'B', B: 'A', C: 'C', D: 'D' },
};

const OLD_KEY = 'B B B A B B B A B C B A C C B D B C C B'.split(' ');
const NEW_KEY = 'B D B A D A B A D C B D C C A D B C C A'.split(' ');

const problems = [];
function check(cond, msg) { if (!cond) problems.push(msg); }

// ---- 1. ANSWERS line -------------------------------------------------------
const answersRe = /var ANSWERS = \{[^}]*\};/;
const answersMatch = body.match(answersRe);
check(answersMatch, 'ANSWERS line not found');
const liveAnswers = JSON.parse(answersMatch[0].replace('var ANSWERS = ', '').replace(/;$/, ''));
OLD_KEY.forEach((letter, i) => {
  check(liveAnswers['e' + (i + 1)] === letter,
    `live ANSWERS e${i + 1} is ${liveAnswers['e' + (i + 1)]}, doc says ${letter}`);
});
const newAnswers = {};
NEW_KEY.forEach((letter, i) => { newAnswers['e' + (i + 1)] = letter; });
const newAnswersLine = 'var ANSWERS = ' +
  '{' + Object.entries(newAnswers).map(([k, v]) => `"${k}": "${v}"`).join(', ') + '};';
body = body.replace(answersRe, newAnswersLine);

// ---- 2. Per-question option + distractor reorder ---------------------------
for (const qn of Object.keys(PERM).map(Number).sort((a, b) => a - b)) {
  const perm = PERM[qn];

  // -- options block --
  const optRe = new RegExp(
    `(<div class="options">\\r?\\n)((?:<label class="option-label"><input type="radio" name="qe${qn}"[\\s\\S]*?</label>\\r?\\n){4})(</div>)`
  );
  const optMatch = body.match(optRe);
  check(optMatch, `Q${qn}: options block not found`);
  if (!optMatch) continue;

  const labelLines = optMatch[2].replace(/\r?\n$/, '').split(/\r?\n/);
  check(labelLines.length === 4, `Q${qn}: expected 4 option labels, got ${labelLines.length}`);

  const byLetter = {};
  for (const line of labelLines) {
    const m = line.match(/value="([A-D])"> <span>\(([A-D])\) ([\s\S]*)<\/span>/);
    check(m, `Q${qn}: unparseable option line`);
    if (!m) continue;
    check(m[1] === m[2], `Q${qn}: value ${m[1]} disagrees with visible prefix (${m[2]})`);
    byLetter[m[1]] = m[3];
  }
  check(Object.keys(byLetter).length === 4, `Q${qn}: options are not A-D`);

  const rebuilt = L.map((newL) => {
    const text = byLetter[perm[newL]];
    check(text !== undefined, `Q${qn}: permutation source ${perm[newL]} missing`);
    return `<label class="option-label"><input type="radio" name="qe${qn}" value="${newL}"> ` +
           `<span>(${newL}) ${text}</span></label>`;
  }).join('\n') + '\n';

  // the reorder must be a pure permutation of the same four texts
  const before = Object.values(byLetter).slice().sort();
  const after = L.map((n) => byLetter[perm[n]]).slice().sort();
  check(JSON.stringify(before) === JSON.stringify(after),
    `Q${qn}: option text set changed during reorder`);

  // the correct answer must still point at the same text
  check(byLetter[OLD_KEY[qn - 1]] === byLetter[perm[NEW_KEY[qn - 1]]],
    `Q${qn}: new key letter ${NEW_KEY[qn - 1]} does not carry the old correct answer text`);

  body = body.replace(optRe, (_m, open, _mid, close) => open + rebuilt + close);

  // -- fb-distractors block (the first one after this question's options) --
  const anchor = body.indexOf(`name="qe${qn}" value="A"`);
  const dStart = body.indexOf('<div class="fb-distractors">', anchor);
  check(dStart !== -1, `Q${qn}: fb-distractors not found`);
  const dEnd = body.indexOf('</div>', dStart);
  const inner = body.slice(dStart + '<div class="fb-distractors">'.length, dEnd);

  const paras = inner.split(/\r?\n/).filter((s) => s.trim() !== '');
  const inverse = {};
  for (const newL of L) inverse[perm[newL]] = newL;

  const relabelled = paras.map((p) => {
    const m = p.match(/^<p><strong>\(([A-D])\)<\/strong>([\s\S]*)<\/p>$/);
    check(m, `Q${qn}: unparseable distractor paragraph`);
    if (!m) return { letter: 'Z', html: p };
    const newL = inverse[m[1]];
    check(newL !== undefined, `Q${qn}: distractor letter ${m[1]} has no mapping`);
    check(newL !== NEW_KEY[qn - 1],
      `Q${qn}: distractor would land on the correct answer letter ${newL}`);
    return { letter: newL, html: `<p><strong>(${newL})</strong>${m[2]}</p>` };
  }).sort((a, b) => a.letter.localeCompare(b.letter));

  body = body.slice(0, dStart) +
    '<div class="fb-distractors">\n' + relabelled.map((r) => r.html).join('\n') + '\n' +
    body.slice(dEnd);
}

// ---- 3. fb-exp prose that names letters ------------------------------------
const proseEdits = [
  ['Option A describes offensive red-team testing. Options C and D describe unrelated security functions.',
   'Option A describes offensive red-team testing. Options B and C describe unrelated security functions.'],
  ['Option B provides layered coverage', 'Option A provides layered coverage'],
  ['Option A includes a discredited password policy', 'Option B includes a discredited password policy'],
];
for (const [from, to] of proseEdits) {
  const hits = body.split(from).length - 1;
  check(hits === 1, `prose edit matched ${hits} times (expected 1): "${from.slice(0, 50)}..."`);
  body = body.replace(from, to);
}

// ---- 4. Post-checks --------------------------------------------------------
const finalAnswers = JSON.parse(body.match(answersRe)[0].replace('var ANSWERS = ', '').replace(/;$/, ''));
const dist = { A: 0, B: 0, C: 0, D: 0 };
for (let i = 1; i <= 20; i++) {
  const letter = finalAnswers['e' + i];
  dist[letter]++;
  const optLine = body.match(
    new RegExp(`<label class="option-label"><input type="radio" name="qe${i}" value="${letter}"> <span>\\(${letter}\\)[^<]*</span>`)
  );
  check(optLine, `Q${i}: key letter ${letter} has no matching option in the final body`);
}
check(L.every((x) => dist[x] === 5), `final distribution is not 5/5/5/5: ${JSON.stringify(dist)}`);

let run = 1, maxRun = 1;
for (let i = 2; i <= 20; i++) {
  run = finalAnswers['e' + i] === finalAnswers['e' + (i - 1)] ? run + 1 : 1;
  if (run > maxRun) maxRun = run;
}
check(maxRun <= 2, `longest same-letter run is ${maxRun}`);

for (let i = 1; i <= 20; i++) {
  const n = (body.match(new RegExp(`name="qe${i}" value="[A-D]"`, 'g')) || []).length;
  check(n === 4, `Q${i}: has ${n} options after patch`);
}

if (problems.length) {
  console.error('FAILED:\n' + problems.map((p) => '  - ' + p).join('\n'));
  process.exit(1);
}

fs.writeFileSync(OUT, body);
console.log('OK  distribution ' + JSON.stringify(dist) + '  longest run ' + maxRun);
console.log('key ' + Array.from({ length: 20 }, (_, i) => finalAnswers['e' + (i + 1)]).join(' '));
