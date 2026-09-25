'use strict';
/*
 *  BOARD 429. FOUR NEWS POSTS, AND EVERY KEY RE-DERIVED BY RUNNING THE PAGE.
 *
 *      node smoke/news-wrong-keys-repair.js
 *
 *  The sweep that found these checked whether a page's grader, label and
 *  explanation AGREE. That cannot see a key that is consistently wrong, and on
 *  the recursion guide it saw one of the three broken questions. So this suite
 *  trusts no table. It pulls each question's code out of the REPAIRED page,
 *  runs it (javac for the Java, lib/csp-pseudocode.js for the pseudocode), and
 *  decides every option from what the code does:
 *
 *    a "what is returned / printed" question matches the output to an option;
 *    an I/II/III question evaluates each statement and matches the set;
 *    a "which describes the error" question APPLIES THE FIX each option implies
 *    and asks whether the method then agrees with a reference implementation
 *    over every input tried. The keyed diagnosis must be the one whose fix
 *    works, and every other option must fail its own test.
 *
 *  Then the repair: every anchor once, a byte-exact reverse, a rebuild that
 *  must refuse, each checkBody rule broken alone, the sheet read back, and the
 *  store's preflight.
 *
 *  No JDK is a FAILURE here, not a skip. CI pins one for smoke:qotd344.
 *  Offline, against the before snapshot committed beside the sheet.
 *  No em-dashes; non-ASCII is written as escapes. Zero PII.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const R = require('../scripts/news-wrong-keys-repair.js');
const E = require('../lib/matrixify-body-edit.js');
const D = require('../scripts/csa-qotd-key-rederive.js');
const P = require('../lib/csp-pseudocode.js');

const DIR = path.join(__dirname, '..', 'imports', '2026-09-25-news-wrong-keys');
const BEFORE = JSON.parse(fs.readFileSync(path.join(DIR, R.BEFORE), 'utf8'));
const REC = 'ap-csa-recursion-complete-guide';
const TWINS = ['ap-csp-day-29-list-mutation-and-aliasing', 'ap-csp-day-29-list-mutation-aliasing'];
const DAY20 = 'unit-2-cycle-2-day-20';

let pass = 0; let fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
};
const throws = (fn, re) => { try { fn(); return false; } catch (e) { return re.test(e.message) ? true : e.message; } };

const decode = (html) => html.replace(/<[^>]+>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const oneOf = (label, truths) => {
  const hits = truths.map((t, i) => (t ? 'ABCD'[i] : null)).filter(Boolean);
  if (hits.length !== 1) throw new Error(label + ': ' + hits.length + ' options hold, want exactly one (' + hits.join('') + ')');
  return hits[0];
};
const romans = (t) => new Set(t.match(/\bI{1,3}\b/g) || []);
const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
const swap = (src, from, to, label) => {
  if (src.split(from).length !== 2) throw new Error(label + ': "' + from.slice(0, 40) + '" is not in the page code exactly once');
  return src.split(from).join(to);
};

if (spawnSync('javac', ['-version'], { encoding: 'utf8' }).error) {
  console.log('  [FAIL] no javac on PATH. These keys are re-derived by running the Java, so this is a failure, not a skip.');
  process.exit(1);
}

// -----------------------------------------------------------------------------
//  Reading a page: each question's code, option texts, and what it keys.
// -----------------------------------------------------------------------------
function recursionQuestion(body, q) {
  const s = body.indexOf('id="' + q + '-container"');
  const f = body.indexOf('id="' + q + '-feedback"', s);
  const part = body.slice(s, f);
  return {
    code: decode(part.match(/<pre>([\s\S]*?)<\/pre>/)[1]),
    options: [...part.matchAll(/<span class="rg-option-text">([\s\S]*?)<\/span>/g)].map((m) => decode(m[1]).trim()),
    statements: [...part.matchAll(/<strong>(I{1,3})\.<\/strong>\s*([\s\S]*?)(?:<br>|<\/p>)/g)].map((m) => decode(m[2]).replace(/\s+/g, ' ').trim()),
    key: (body.match(new RegExp("onclick=\"checkAnswer\\('" + q + "','([A-D])'\\)\"")) || [])[1],
    label: (body.slice(f, f + 400).match(/Why ([A-D])\b[^<]* is correct/) || [])[1],
  };
}

function dayQuestion(body) {
  return {
    code: decode(body.match(/<pre><code>([\s\S]*?)<\/code><\/pre>/)[1]),
    options: [...body.matchAll(/<span class="apcs-option-content">([\s\S]*?)<\/span>/g)].map((m) => decode(m[1]).trim()),
    key: (body.match(/var correctAnswer = '([A-D])';/) || [])[1],
  };
}

// -----------------------------------------------------------------------------
//  The recursion guide, on the JVM. One program runs all five questions and
//  every fix an option implies, and prints facts as key=value lines.
// -----------------------------------------------------------------------------
function recursionFacts(body) {
  const Q = {};
  ['q1', 'q2', 'q3', 'q4', 'q5'].forEach((q) => { Q[q] = recursionQuestion(body, q); });
  const c1 = Q.q1.code; const c4 = Q.q4.code;
  //  Each option's implied fix, applied to a renamed copy of the page's method.
  const q1B = swap(c1, 'countSevens(n / 10);   // Line A\n        return 1;', 'return 1 + countSevens(n / 10);', 'q1 fix B').replace(/countSevens/g, 'q1B');
  const q1D = swap(c1, 'return countSevens(n / 10);  // Line B', 'return countSevens(n % 10);', 'q1 fix D').replace(/countSevens/g, 'q1D');
  const q1A = swap(c1, 'if (n == 0) {\n        return 0;', 'if (n == 0) {\n        return 1;', 'q1 fix A').replace(/countSevens/g, 'q1A');
  const q4A = swap(c4, 's.length() <= 1', 's.length() == 0', 'q4 fix A').replace(/isPalindrome/g, 'q4A');
  const q4C = swap(c4, 's.substring(0, s.length() - 1)', 's.substring(1, s.length() - 1)', 'q4 fix C').replace(/isPalindrome/g, 'q4C');
  const src = [
    'public class Main {',
    Q.q1.code, q1A, q1B, q1D, Q.q2.code, Q.q3.code, Q.q4.code, q4A, q4C, Q.q5.code,
    '  static int sevens(int n) { int c = 0; for (char ch : Integer.toString(n).toCharArray()) if (ch == \'7\') c++; return c; }',
    '  static boolean pal(String s) { return new StringBuilder(s).reverse().toString().equals(s); }',
    '  static int fib(int n) { int a = 0, b = 1; for (int i = 0; i < n; i++) { int t = a + b; a = b; b = t; } return a; }',
    '  interface IntF { int f(int n); }',
    '  interface StrP { boolean f(String s); }',
    '  static String agreesSevens(IntF m) { try { for (int n = 0; n <= 3000; n++) if (m.f(n) != sevens(n)) return "wrong at " + n; return "correct"; } catch (StackOverflowError e) { return "overflow"; } }',
    '  static String agreesPal(StrP m) { try { char[] ab = {\'a\', \'b\', \'c\'}; for (int len = 0; len <= 6; len++) { int k = (int) Math.pow(3, len); for (int c = 0; c < k; c++) { StringBuilder sb = new StringBuilder(); int x = c; for (int i = 0; i < len; i++) { sb.append(ab[x % 3]); x /= 3; } String s = sb.toString(); if (m.f(s) != pal(s)) return (pal(s) ? "wrong on a palindrome" : "wrong on a non-palindrome"); } } return "correct"; } catch (StackOverflowError e) { return "overflow"; } }',
    '  static String q2(int k) { try { return mystery("hello", k); } catch (StackOverflowError e) { return "OVERFLOW"; } }',
    '  public static void main(String[] args) {',
    '    System.out.println("q1.page=" + agreesSevens(n -> countSevens(n)));',
    '    System.out.println("q1.77=" + countSevens(77));',
    '    System.out.println("q1.717=" + countSevens(717));',
    '    System.out.println("q1.70=" + countSevens(70));',
    '    System.out.println("q1.A=" + agreesSevens(n -> q1A(n)));',
    '    System.out.println("q1.B=" + agreesSevens(n -> q1B(n)));',
    '    System.out.println("q1.D=" + agreesSevens(n -> q1D(n)));',
    '    System.out.println("q2.0=" + q2(0));',
    '    System.out.println("q2.2=" + q2(2));',
    '    System.out.println("q2.5=" + q2(5));',
    '    System.out.println("q3=" + compute(5, 0));',
    '    System.out.println("q4.page=" + agreesPal(s -> isPalindrome(s)));',
    '    System.out.println("q4.abba=" + isPalindrome("abba"));',
    '    System.out.println("q4.abca=" + isPalindrome("abca"));',
    '    System.out.println("q4.A=" + agreesPal(s -> q4A(s)));',
    '    System.out.println("q4.C=" + agreesPal(s -> q4C(s)));',
    '    boolean fibOk = true; for (int n = 0; n <= 20; n++) if (alpha(n) != fib(n)) fibOk = false;',
    '    System.out.println("q5.a5=" + alpha(5)); System.out.println("q5.b5=" + beta(5));',
    '    System.out.println("q5.a4=" + alpha(4)); System.out.println("q5.b4=" + beta(4));',
    '    System.out.println("q5.fib=" + fibOk);',
    '  }',
    '}',
  ].join('\n');
  const r = D.runJava(src, 'has-main');
  if (r.state !== 'ran') throw new Error('recursion guide did not run: ' + r.why + ' ' + (r.detail || ''));
  const facts = {};
  r.stdout.trim().split('\n').forEach((l) => { const i = l.indexOf('='); facts[l.slice(0, i)] = l.slice(i + 1); });
  return { Q, facts };
}

//  q1 and q4 are judged option by option, by position, so the claim at each
//  position is pinned. Reordered or reworded options must fail here rather than
//  be judged against the wrong claim.
const PINNED = {
  q1: ['base case returns 0 instead of 1', 'discards its return value', 'StackOverflowError', 'should use n % 10'],
  q4: ['s.length() == 0', 'infinite recursion', 'still includes the first character', 'always returns true'],
};

function deriveRecursion(body) {
  const { Q, facts: F } = recursionFacts(body);
  Object.keys(PINNED).forEach((q) => {
    PINNED[q].forEach((phrase, i) => {
      if (!Q[q].options[i] || !Q[q].options[i].includes(phrase)) {
        throw new Error(q + ' option ' + 'ABCD'[i] + ' no longer says "' + phrase + '", so its test below would judge the wrong claim');
      }
    });
  });
  const out = {};
  //  q1: which diagnosis, applied as a fix, makes the method count correctly.
  //  C claims a StackOverflowError on the page's own method.
  out.q1 = oneOf('q1', [F['q1.A'] === 'correct', F['q1.B'] === 'correct', F['q1.page'] === 'overflow', F['q1.D'] === 'correct']);
  //  q2: the three statements, evaluated, and the option naming that set.
  const t2 = { I: F['q2.0'] === 'hello', II: F['q2.2'] === 'llo', III: F['q2.5'] === 'OVERFLOW' };
  const held2 = new Set(Object.keys(t2).filter((k) => t2[k]));
  out.q2 = oneOf('q2', Q.q2.options.map((o) => sameSet(romans(o), held2)));
  //  q3: the value, matched to an option.
  out.q3 = oneOf('q3', Q.q3.options.map((o) => o === F.q3));
  //  q4: A and C are diagnoses with a fix; B claims infinite recursion, D claims
  //  the method always returns true.
  out.q4 = oneOf('q4', [F['q4.A'] === 'correct', F['q4.page'] === 'overflow', F['q4.C'] === 'correct', F['q4.abca'] === 'true']);
  //  q5: the three statements.
  const t5 = { I: F['q5.a5'] === F['q5.b5'], II: F['q5.fib'] === 'true', III: F['q5.a4'] !== F['q5.b4'] };
  const held5 = new Set(Object.keys(t5).filter((k) => t5[k]));
  out.q5 = oneOf('q5', Q.q5.options.map((o) => sameSet(romans(o), held5)));
  return { out, Q, F };
}

function deriveDay29(body) {
  const q = dayQuestion(body);
  const r = P.run(q.code);
  return { answer: oneOf('day 29', q.options.map((o) => o === r.shown)), shown: r.shown, q };
}

function deriveDay20(body) {
  const q = dayQuestion(body);
  const r = D.runJava(q.code, 'statements');
  if (r.state !== 'ran') throw new Error('day 20 did not run: ' + r.why);
  const shown = D.normOut(r.stdout);
  let answer = null;
  try { answer = oneOf('day 20', q.options.map((o) => o === shown)); } catch (e) { answer = null; }
  return { answer, shown, q };
}

// -----------------------------------------------------------------------------
console.log('\n1. Every repair builds on the live snapshot, and gives it back byte for byte');
const AFTER = {};
R.REPAIRS.forEach((r) => {
  try {
    const b = R.build(r, BEFORE[r.handle]);
    AFTER[r.handle] = b.out;
    ok(r.handle + ': builds, and the reverse is the live body', E.reverse(b.out, b.captured) === BEFORE[r.handle]);
  } catch (e) { ok(r.handle + ': builds', false, e.message); }
});
ok('the day 29 twins were the same page and are repaired the same', BEFORE[TWINS[0]] === BEFORE[TWINS[1]] && AFTER[TWINS[0]] === AFTER[TWINS[1]]);

console.log('\n2. The recursion guide, re-derived on the JVM from the repaired page');
{
  let d = null;
  try { d = deriveRecursion(AFTER[REC]); } catch (e) { ok('all five questions derive exactly one answer', false, e.message); }
  if (d) {
    const rec = R.REPAIRS.find((r) => r.handle === REC);
    Object.keys(rec.keys).forEach((q) => {
      ok(q + ' works out to ' + d.out[q] + ', and the page grades ' + d.Q[q].key + ' and prints ' + d.Q[q].label,
        d.out[q] === rec.keys[q] && d.Q[q].key === d.out[q] && d.Q[q].label === d.out[q], d.out);
    });
    ok('q2 now returns "hello" and "llo", the statements its key relies on', d.F['q2.0'] === 'hello' && d.F['q2.2'] === 'llo', d.F);
    ok('q4 is wrong on palindromes and never on a non-palindrome, which is what C now says',
      d.F['q4.page'] === 'wrong on a palindrome' && d.F['q4.abba'] === 'false', d.F['q4.page']);
    ok('q1: 77 and 717 each count one 7, and 70 counts its one', d.F['q1.77'] === '1' && d.F['q1.717'] === '1' && d.F['q1.70'] === '1');
  }
  //  And the page as it is live today, so the defects are seen and not assumed.
  let live = null;
  try { live = recursionFacts(BEFORE[REC]).facts; } catch (e) { ok('the live recursion guide runs', false, e.message); }
  if (live) {
    ok('live: compute(5, 0) is 12 while the grader keys B (11)', live.q3 === '12' && recursionQuestion(BEFORE[REC], 'q3').key === 'B');
    ok('live: mystery("hello", 0) is "hellohello", so no q2 option is true', live['q2.0'] === 'hellohello' && live['q2.2'] === 'llohello');
  }
}

console.log('\n3. CSP day 29, re-derived through lib/csp-pseudocode.js');
TWINS.forEach((h) => {
  const after = deriveDay29(AFTER[h]);
  ok(h + ': prints ' + after.shown + ', which is ' + after.answer + ', and the page keys ' + after.q.key,
    after.shown === '20' && after.answer === 'B' && after.q.key === 'B');
});
{
  const live = deriveDay29(BEFORE[TWINS[0]]);
  ok('live: the page keys D (99) against a copy rule that prints 20', live.q.key === 'D' && live.shown === '20');
}

console.log('\n4. CSA unit 2 day 20, re-derived on the JVM');
{
  const after = deriveDay20(AFTER[DAY20]);
  ok('prints ' + after.shown + ', which is option ' + after.answer + ', and the page keys ' + after.q.key,
    after.shown === '10' && after.answer === 'B' && after.q.key === 'B', after);
  ok('the new options are 13, 10, 3 and 9', after.q.options.join(',') === '13,10,3,9', after.q.options);
  const live = deriveDay20(BEFORE[DAY20]);
  ok('live: the loop prints 10 and no option says so', live.shown === '10' && live.answer === null, live.q.options);
}

console.log('\n5. Find or refuse: a repair that is already live cannot be built again');
R.REPAIRS.forEach((r) => {
  const why = throws(() => R.build(r, AFTER[r.handle]), /matched 0 times/);
  ok(r.handle + ' refuses to rebuild', why === true, why);
});

console.log('\n6. Every rule, broken on its own, is the rule that fires');
{
  const byHandle = (h) => R.REPAIRS.find((r) => r.handle === h);
  const breaks = [
    [REC, 'keys', 'recursion keys rule fires on q3 graded B again', (b) => b.replace("checkAnswer('q3','C')", "checkAnswer('q3','B')")],
    [REC, 'labels', 'recursion labels rule fires on Why B (11) coming back', (b) => b.replace('Why C (12) is correct', 'Why B (11) is correct')],
    [REC, 'q2 code', 'q2 code rule fires on the old base case', (b) => b.replace('<span class="kw">return</span> "";', '<span class="kw">return</span> s;')],
    [REC, 'q4 wording', 'q4 wording rule fires on non-palindromes coming back', (b) => b.replace('returns false for some palindromes, such as "abba".', 'may produce a wrong answer for some non-palindromes.')],
    [REC, 'q1 wording', 'q1 wording rule fires on the overstated option', (b) => b.replace('so once the method finds a 7 it returns 1, and any other 7 further left is never counted.', 'so digits of 7 above the ones place are never counted.')],
    [REC, 'self-correction', 'self-correction rule fires on "wait!" coming back', (b) => b.replace('11 + 1 = 12</span>', '11 + 1 = 12... wait!</span>')],
    [REC, 'div balance', 'div balance rule fires on a lost close', (b) => b.replace('</div>\n  </div>\n\n  <!-- Q4 -->', '</div>\n\n  <!-- Q4 -->')],
    [REC, 'dashes', 'dashes rule fires on an authored em-dash', (b) => b.replace('Count the calls:', 'Count the calls \u2014')],
    [TWINS[0], 'keys', 'day 29 keys rule fires on D again', (b) => b.replace("var correctAnswer = 'B';", "var correctAnswer = 'D';")],
    [TWINS[0], 'copy rule', 'day 29 copy rule fires on the aliasing sentence coming back', (b) => b.replace('makes a copy.</p>', 'makes a copy. List assignment creates an alias (reference), not a copy.</p>')],
    [TWINS[0], 'distractor notes', 'day 29 distractor notes rule fires on a note for B', (b) => b.replace('<p><strong>C)</strong>', '<p><strong>B)</strong> 20 is the original.</p>\n<p><strong>C)</strong>')],
    [TWINS[0], 'script', 'day 29 script rule fires on a grader change beyond the key', (b) => b.replace("header.textContent = 'Correct!';", "header.textContent = 'Right!';")],
    [DAY20, 'options', 'day 20 options rule fires on 9 coming back as B', (b) => b.replace('<span class="apcs-option-content">10</span>', '<span class="apcs-option-content">9</span>')],
    [DAY20, 'keys', 'day 20 keys rule fires on C', (b) => b.replace("var correctAnswer = 'B';", "var correctAnswer = 'C';")],
    [DAY20, 'labels', 'day 20 labels rule fires on B) 9 coming back', (b) => b.replace('The correct answer is <strong>B) 10</strong>', 'The correct answer is <strong>B) 9</strong>')],
    [DAY20, 'self-correction', 'self-correction rule fires on the monologue coming back', (b) => b.replace('<p><strong>Final count:</strong>', "<p>Hmm, I'm getting 10, not 9.</p>\n<p><strong>Final count:</strong>")],
  ];
  breaks.forEach(([h, rule, name, fn]) => {
    const broken = fn(AFTER[h]);
    if (broken === AFTER[h]) { ok('[' + rule + '] ' + name, false, 'the injection did not apply, so this case tests nothing'); return; }
    const bad = R.checkBody(byHandle(h), BEFORE[h], broken);
    ok(name, bad.some((m) => m.startsWith(rule + ':')), bad);
  });
  //  The span cap, which the reverse check cannot provide: an edit whose lazy
  //  match runs past its intended end anchor is refused at build time.
  const wide = Object.assign({}, byHandle(DAY20), {
    edits: [{ id: 'too-wide', find: /<p>The correct answer is <strong>B\) 9<\/strong><\/p>[\s\S]*?<p>I'll go with the intended answer/, to: '<p>x</p>' }],
  });
  const why = throws(() => R.build(wide, BEFORE[DAY20]), /more than 1500/);
  ok('an over-broad edit is refused by the span cap', why === true, why);
}

console.log('\n7. The sheets, written and read back');
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'news-keys-'));
  R.writeSheets(tmp, BEFORE, AFTER);
  const raw = fs.readFileSync(path.join(tmp, R.SHEET), 'utf8');
  ok('the file opens with a BOM and ends CRLF', raw.charCodeAt(0) === 0xfeff && raw.endsWith('\r\n'));
  const rows = E.parseCsv(raw);
  ok('a header and four rows', rows.length === 5, rows.length);
  ok('the header is Blog: Handle, Handle, Command, Body HTML', rows[0].join('|') === R.COLS.join('|'), rows[0]);
  ok('every row is news, MERGE, and carries its repaired body',
    rows.slice(1).every((row, i) => row[0] === 'news' && row[1] === R.REPAIRS[i].handle && row[2] === 'MERGE' && row[3] === AFTER[row[1]]));
  ok('the rollback sheet carries the live bodies',
    E.parseCsv(fs.readFileSync(path.join(tmp, R.ROLLBACK), 'utf8')).slice(1).every((row) => row[3] === BEFORE[row[1]]));
  ok('the committed sheet is byte-identical to a rebuild from the snapshot', fs.readFileSync(path.join(DIR, R.SHEET), 'utf8') === raw);
  ok('and so is the committed rollback sheet',
    fs.readFileSync(path.join(DIR, R.ROLLBACK), 'utf8') === fs.readFileSync(path.join(tmp, R.ROLLBACK), 'utf8'));
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('\n8. The store\'s own preflight, on the files that would be uploaded');
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
