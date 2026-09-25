'use strict';
/*
 *  BOARD 425. THE AP CSP PSEUDOCODE POST, AND WHY ITS KEY IS RE-DERIVED BY RUNNING IT.
 *
 *      node smoke/csp-pseudocode-post-repair.js
 *
 *  The generator's KEY table was traced by hand, and hand tracing is what put
 *  seven wrong keys on this page in the first place. So this suite does not
 *  read KEY and agree with it. It runs each question's pseudocode, AS PRINTED
 *  ON THE PAGE, through a small interpreter for the Exam Reference Sheet subset
 *  the post uses, decides every option's claim from what the code actually
 *  does, and only then compares with KEY. The interpreter is written without
 *  reference to the generator and shares no code with it.
 *
 *  It is held to the post's own worked examples first: every "// Output:" the
 *  post prints must come out of the interpreter, and REPEAT UNTIL must run zero
 *  times on a condition that starts true (CED AAP-2.K.5), which is the rule the
 *  repair teaches. An interpreter that got the loop wrong would agree with the
 *  old page.
 *
 *  Then the repair itself: every anchor once, a reverse that gives the live
 *  body back byte for byte, a rebuild on the repaired body that must REFUSE,
 *  and each checkBody rule broken on its own, where the rule that fires must be
 *  the one that was broken.
 *
 *  Offline, against the before snapshot committed beside the sheet.
 *  No em-dashes; non-ASCII is written as escapes. Zero PII.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const R = require('../scripts/csp-pseudocode-post-repair.js');
const E = require('../lib/matrixify-body-edit.js');

const DIR = path.join(__dirname, '..', 'imports', '2026-09-25-csp-pseudocode-post');
const BEFORE = JSON.parse(fs.readFileSync(path.join(DIR, R.BEFORE), 'utf8'))[R.HANDLE];

let pass = 0; let fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
};
const throws = (fn, re) => { try { fn(); return false; } catch (e) { return re.test(e.message) ? true : e.message; } };

// -----------------------------------------------------------------------------
//  THE SECOND IMPLEMENTATION lives in lib/csp-pseudocode.js: the reference sheet
//  subset the post uses, shared with the board 429 repair.
// -----------------------------------------------------------------------------
const { ARROW, NE, LE, GE, codeText, run } = require('../lib/csp-pseudocode.js');

// -----------------------------------------------------------------------------
//  Reading the page: a question's code, its option texts, its statements.
// -----------------------------------------------------------------------------
function questionParts(body, q) {
  const s = body.indexOf('<div class="question-block" id="' + q + '">');
  const u = body.indexOf('id="' + q + '-opts"', s);
  const endUl = body.indexOf('</ul>', u);
  const stem = body.slice(s, u);
  const pre = (stem.match(/<pre[^>]*>([\s\S]*?)<\/pre>/) || [])[1];
  const options = [...body.slice(u, endUl).matchAll(/<li onclick="[^"]*">([\s\S]*?)<\/li>/g)]
    .map((m) => ({ html: m[1], text: codeText(m[1]).replace(/\s+/g, ' ').trim().replace(/^[A-D]\)\s*/, '') }));
  const statements = [...stem.matchAll(/<strong>(I{1,3})\.<\/strong>\s*([\s\S]*?)(?:<br>|\n\s*<\/div>)/g)]
    .map((m) => codeText(m[2]).replace(/\s+/g, ' ').trim());
  return { code: pre === undefined ? null : codeText(pre), options, statements };
}
const romans = (t) => new Set((t.match(/\bI{1,3}\b/g) || []));
const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
const theOne = (label, truths) => {
  const hits = truths.map((t, i) => (t ? 'ABCD'[i] : null)).filter(Boolean);
  if (hits.length !== 1) throw new Error(label + ': ' + hits.length + ' options hold, want exactly one (' + hits.join('') + ')');
  return hits[0];
};

//  Each derivation reads the question off the page, runs it, and decides every
//  option. A derivation that finds zero or two true options throws.
const DERIVE = {
  q1(P) {
    const intended = [2, 4, 6, 8, 10];
    const r = run(P.code);
    const withStep1 = run(P.code.replace('num ' + ARROW + ' num + 2', 'num ' + ARROW + ' num + 1'));
    const withFix = run(P.code.replace('REPEAT UNTIL(num = 10)', 'REPEAT UNTIL(num > 10)'));
    const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    return theOne('q1', [
      eq(withStep1.out, intended),                                  // A: stepping by 1 would fix it
      eq(r.out, intended),                                          // B: the output is already right
      !r.out.includes(10) && r.out.length > 0 && eq(withFix.out, intended), // C: exits before 10
      r.out.length === 0,                                           // D: the body never runs
    ]);
  },
  q2(P) {
    const r = run(P.code);
    const oddSum = (l) => l.filter((v) => v % 2 !== 0).reduce((a, v) => a + v, 0);
    const evenSum = (l) => l.filter((v) => v % 2 === 0).reduce((a, v) => a + v, 0);
    const samples = [[2, 4, 6], [1, 2, 3], [5], [], [10, 11, 12, 13]];
    if (!samples.every((l) => r.call('mystery', [l.slice()]) === oddSum(l))) throw new Error('q2: mystery is not the odd sum');
    const truth = {
      I: r.call('mystery', [[2, 4, 6]]) === 0,
      II: r.call('mystery', [[1, 2, 3]]) === 6,
      III: samples.every((l) => r.call('mystery', [l.slice()]) === evenSum(l)),
    };
    const held = new Set(Object.keys(truth).filter((k) => truth[k]));
    return theOne('q2', P.options.map((o) => sameSet(romans(o.text), held)));
  },
  q3(P) {
    const r = run(P.code);
    const swapped = [40, 20, 30, 10];
    const lines = P.code.split('\n').map((l) => l.trim()).filter(Boolean);
    const tempReads = lines.filter((l) => /\btemp\b/.test(l) && !l.startsWith('temp ' + ARROW)).length;
    const fixed = run(P.code.replace('items[4] ' + ARROW + ' items[1]', 'items[4] ' + ARROW + ' temp'));
    return theOne('q3', [
      tempReads === 0 && JSON.stringify(fixed.out[0]) === JSON.stringify(swapped), // A
      (() => { try { run(P.code); return false; } catch (e) { return /index/.test(e.message); } })(), // B: index 4 fails
      !/^DISPLAY/.test(lines[lines.length - 1]),                    // C: DISPLAY runs mid-swap
      JSON.stringify(r.out[0]) === JSON.stringify(swapped),         // D: no error
    ]);
  },
  q4(P) {
    const r = run(P.code);
    return theOne('q4', P.options.map((o) => (r.out.length ? o.text === r.shown : /^Nothing/.test(o.text))));
  },
  q5(P) {
    const r = run(P.code);
    return theOne('q5', P.options.map((o) => o.text === r.shown));
  },
  q6(P) {
    const d = run(P.code).vars.data;
    const want = ['The length of data is 6.', 'data[1] equals 10.', 'data[3] equals 15.'];
    if (JSON.stringify(P.statements) !== JSON.stringify(want)) throw new Error('q6: statements changed: ' + JSON.stringify(P.statements));
    const truth = { I: d.length === 6, II: d[0] === 10, III: d[2] === 15 };
    const held = new Set(Object.keys(truth).filter((k) => truth[k]));
    return theOne('q6', P.options.map((o) => sameSet(romans(o.text), held)));
  },
  q7(P) {
    const spec = (n) => n >= 1 && n <= 100;
    return theOne('q7', P.options.map((o) => {
      const r = run(o.text);
      for (let n = -5; n <= 110; n++) if (r.call('inRange', [n]) !== spec(n)) return true;
      return false;
    }));
  },
  q8(P) {
    const cases = [[[], 5], [[5], 5], [[1, 5, 5], 5], [[1, 2, 3], 5], [[5, 5, 5], 5], [[2, 5], 5]];
    const shown = cases.map(([l, t]) => run(P.code, { myList: l.slice(), target: t }).out);
    const claims = [
      (l, t) => [l.every((v) => v === t)],                          // A
      (l, t) => [l.includes(t)],                                    // B
      (l, t) => [l.includes(t) ? l.indexOf(t) + 1 : false],         // C
      (l, t) => [l.filter((v) => v === t).length === 1],            // D
    ];
    return theOne('q8', claims.map((f) => cases.every(([l, t], i) => JSON.stringify(f(l, t)) === JSON.stringify(shown[i]))));
  },
};

function derive(body) {
  const out = {};
  Object.keys(DERIVE).forEach((q) => { out[q] = DERIVE[q](questionParts(body, q)); });
  return out;
}

// -----------------------------------------------------------------------------
console.log('\n1. The interpreter is held to the post and to the CED before it judges anything');
{
  const pres = [...BEFORE.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/g)].map((m) => codeText(m[1]));
  const stated = pres.filter((p) => /\/\/ Output: /.test(p));
  ok('the post states five worked outputs', stated.length === 5, stated.length);
  stated.forEach((src) => {
    const want = src.match(/\/\/ Output: (.*)/)[1].trim();
    let got;
    try { got = run(src).shown; } catch (e) { got = 'threw: ' + e.message; }
    ok('  "' + src.split('\n')[0].slice(0, 32) + '" prints ' + want, got === want, got);
  });
  ok('REPEAT UNTIL runs zero times when the condition starts true (AAP-2.K.5)',
    run('n ' + ARROW + ' 0\nREPEAT UNTIL(true)\n{\n n ' + ARROW + ' n + 1\n}\nDISPLAY(n)').shown === '0');
  ok('an index outside 1..LENGTH is an error, as the reference sheet says',
    throws(() => run('a ' + ARROW + ' [1, 2]\nDISPLAY(a[0])'), /outside 1\.\.2/) === true);
  ok('assigning a list assigns a copy',
    run('a ' + ARROW + ' [1]\nb ' + ARROW + ' a\nAPPEND(b, 2)\nDISPLAY(LENGTH(a))').shown === '1');
}

console.log('\n2. The eight answers, re-derived by running the page\'s own pseudocode');
let derived = {};
{
  try { derived = derive(BEFORE); } catch (e) { ok('every question derives exactly one answer', false, e.message); }
  Object.keys(R.KEY).forEach((q) => {
    ok(q + ' works out to ' + derived[q] + ', and the repair keys ' + R.KEY[q], derived[q] === R.KEY[q]);
  });
  const enc = {};
  R.questions(BEFORE).forEach(({ q, opts, label }) => { enc[q] = { idx: opts[0] && opts[0].correct, label }; });
  const wrongKey = Object.keys(enc).filter((q) => enc[q].idx !== 'ABCD'.indexOf(derived[q]));
  const wrongLabel = Object.keys(enc).filter((q) => enc[q].label !== derived[q]);
  ok('the live page grades 7 of 8 wrong: q2 to q8', wrongKey.join(',') === 'q2,q3,q4,q5,q6,q7,q8', wrongKey);
  ok('and prints two wrong labels: q2 and q6', wrongLabel.join(',') === 'q2,q6', wrongLabel);
  ok('WAS is what the live page encodes, measured not assumed',
    Object.keys(enc).every((q) => enc[q].idx === R.WAS[q]), enc);
}

console.log('\n3. The repair');
let AFTER = '';
{
  let built = null;
  try { built = R.build(BEFORE); } catch (e) { ok('the repair builds on the live snapshot', false, e.message); }
  if (built) {
    AFTER = built.out;
    ok('the repair builds on the live snapshot', true);
    ok('44 edits: 16 text, 28 key attributes', built.edits.length === 44 && R.TEXT_EDITS.length === 16, built.edits.length);
    ok('putting the originals back gives the live body byte for byte', E.reverse(built.out, built.captured) === BEFORE);
    let again = {};
    try { again = derive(AFTER); } catch (e) { again = { error: e.message }; }
    ok('the repaired page re-derives to the same eight answers', JSON.stringify(again) === JSON.stringify(derived), again);
    R.questions(AFTER).forEach(({ q, opts, label }) => {
      const want = 'ABCD'.indexOf(derived[q]);
      ok('  ' + q + ' now grades ' + derived[q] + ' as right and prints it',
        opts.length === 4 && opts.every((o) => o.correct === want) && label === derived[q], { opts, label });
    });
    ok('checkBody finds nothing wrong with the repaired body', R.checkBody(BEFORE, AFTER).length === 0, R.checkBody(BEFORE, AFTER));
  }
}

console.log('\n4. Find or refuse: a repair that is already live cannot be built again');
{
  const why = throws(() => R.build(AFTER), /matched 0 times/);
  ok('building on the repaired body refuses', why === true, why);
}

console.log('\n5. Every checkBody rule, broken on its own, is the rule that fires');
{
  const breaks = [
    ['exam facts', 'the box goes back to forty', (b) => b.replace('70 multiple-choice questions in 120 minutes', '40 multiple-choice questions in 120 minutes')],
    ['exam facts', 'the old sentence comes back', (b) => b.replace('Section I of the AP CSP exam is 70', 'The AP CSP exam contains approximately 40 MCQ questions. Section I of the AP CSP exam is 70')],
    ['keys', 'one option grades the wrong index', (b) => b.replace("checkQ('q3',0,0)", "checkQ('q3',0,3)")],
    ['labels', 'a printed key goes back to C', (b) => b.replace('Correct Answer: D</div>\n    <p>Start:', 'Correct Answer: C</div>\n    <p>Start:')],
    ['repeat until', 'the loop is taught as post-test again', (b) => b.replace('checks its condition BEFORE each pass', 'checks its condition at the END of each iteration and')],
    ['syntax', 'two Boolean operators again', (b) => b.replace('three Boolean operators', 'two Boolean operators')],
    ['random', 'RANDOM leaves the cheat sheet', (b) => b.replace('<span class="cs-syntax">RANDOM(a, b)</span>', '<span class="cs-syntax">RAND(a, b)</span>')],
    ['self-correction', 'an explanation argues with itself', (b) => b.replace('Only Statement I is true.', 'Wait, only Statement I is true.')],
    ['div balance', 'a div loses its close', (b) => b.replace('</div>\n</div>\n\n<!-- QUESTION 2', '</div>\n\n<!-- QUESTION 2')],
    ['script', 'the grading script changes', (b) => b.replace('if (idx === correctIdx)', 'if (idx == correctIdx)')],
    ['dashes', 'an em-dash is authored', (b) => b.replace('That is under two minutes a question.', 'That is under two minutes a question \u2014 no more.')],
  ];
  breaks.forEach(([rule, what, fn]) => {
    const broken = fn(AFTER);
    if (broken === AFTER) { ok(rule + ': ' + what, false, 'the injection did not apply, so this case tests nothing'); return; }
    const bad = R.checkBody(BEFORE, broken);
    ok(rule + ' rule fires on ' + what, bad.some((m) => m.startsWith(rule + ':')), bad);
  });
}

console.log('\n6. The sheet, written and read back');
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'csp-pseudo-'));
  R.writeSheets(tmp, BEFORE, AFTER);
  const raw = fs.readFileSync(path.join(tmp, R.SHEET), 'utf8');
  ok('the file opens with a BOM', raw.charCodeAt(0) === 0xfeff);
  ok('every record ends CRLF', raw.endsWith('\r\n'));
  const rows = E.parseCsv(raw);
  ok('one header and one row', rows.length === 2, rows.length);
  ok('the header is exactly Blog: Handle, Handle, Command, Body HTML', rows[0].join('|') === R.COLS.join('|'), rows[0]);
  ok('the row addresses news / ' + R.HANDLE + ' / MERGE', rows[1].slice(0, 3).join('|') === ['news', R.HANDLE, 'MERGE'].join('|'), rows[1].slice(0, 3));
  ok('Body HTML is the repaired body', rows[1][3] === AFTER);
  ok('the rollback sheet carries the live body', E.parseCsv(fs.readFileSync(path.join(tmp, R.ROLLBACK), 'utf8'))[1][3] === BEFORE);
  const committed = fs.readFileSync(path.join(DIR, R.SHEET), 'utf8');
  ok('the committed sheet is byte-identical to a rebuild from the snapshot', committed === raw);
  ok('and so is the committed rollback sheet',
    fs.readFileSync(path.join(DIR, R.ROLLBACK), 'utf8') === fs.readFileSync(path.join(tmp, R.ROLLBACK), 'utf8'));
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('\n7. The store\'s own preflight, on the files that would be uploaded');
[R.SHEET, R.ROLLBACK].forEach((name) => {
  let out = ''; let code = 0;
  try {
    out = execFileSync('node', [path.join(__dirname, '..', 'scripts', 'matrixify-preflight.js'), path.join(DIR, name),
      '--expect-command', 'MERGE', '--carrying', path.join(DIR, R.BEFORE)], { encoding: 'utf8' });
  } catch (e) { out = String(e.stdout || e.message); code = e.status || 1; }
  ok(name + ' is clear to import', code === 0 && /clear to import/.test(out), out.split('\n').filter((l) => /PROBLEM|    /.test(l)).slice(0, 3));
});

console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
