const fs = require('fs');
const b = fs.readFileSync(process.argv[2], 'utf8');
const A = JSON.parse(b.match(/var ANSWERS = (\{[^}]*\});/)[1]);
const key = Array.from({ length: 20 }, (_, i) => A['e' + (i + 1)]);
const d = { A: 0, B: 0, C: 0, D: 0 };
key.forEach((k) => d[k]++);
let run = 1, max = 1;
for (let i = 1; i < 20; i++) { run = key[i] === key[i - 1] ? run + 1 : 1; if (run > max) max = run; }

const bad = [];
for (let i = 1; i <= 20; i++) {
  const re = new RegExp('name="qe' + i + '" value="([A-D])"> <span>\\(([A-D])\\) ([^<]*)<', 'g');
  const opts = [...b.matchAll(re)];
  if (opts.length !== 4) bad.push('Q' + i + ' has ' + opts.length + ' options');
  opts.forEach((m) => { if (m[1] !== m[2]) bad.push('Q' + i + ' value ' + m[1] + ' vs label ' + m[2]); });
  if (!opts.some((m) => m[1] === A['e' + i])) bad.push('Q' + i + ' key ' + A['e' + i] + ' missing');
  // every distractor letter must be a wrong answer
  const anchor = b.indexOf('name="qe' + i + '" value="A"');
  const ds = b.indexOf('<div class="fb-distractors">', anchor);
  const inner = b.slice(ds, b.indexOf('</div>', ds));
  [...inner.matchAll(/<strong>\(([A-D])\)<\/strong>/g)].forEach((m) => {
    if (m[1] === A['e' + i]) bad.push('Q' + i + ' distractor (' + m[1] + ') is the correct answer');
  });
}

console.log('LIVE key      ' + key.join(' '));
console.log('distribution  ' + JSON.stringify(d));
console.log('longest run   ' + max);
console.log('bubble score  ' + ['A', 'B', 'C', 'D'].map((L) => L + ':' + Math.round(key.filter((k) => k === L).length / 20 * 100) + '%').join('  '));
console.log('integrity     ' + (bad.length ? 'FAIL ' + bad.join('; ') : 'PASS - 20/20 questions: 4 options, value matches visible label, key letter present, no distractor on a correct answer'));
process.exit(bad.length ? 1 : 0);
