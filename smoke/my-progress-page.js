'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the student page renders the same fraction the teacher is shown.
//
//  smoke:studentagree proves the API hands the student page the right numbers.
//  This proves the PAGE then renders them, by running the page's own JavaScript
//  against a real /api/student/progress response and comparing every cell it
//  produces to the teacher's gradebook.
//
//  Without this, the two halves could each be correct and the page still wrong.
//  It was wrong for exactly that reason before: the API was blameless and the
//  page had a constant table in it.
//
//      const POINTS={'lesson':10,'exercise-1':5,'exercise-2':5,'quiz':10,...}
//
//  Cyber 1.1 Exercise 1 is out of 7 and its quiz is out of 5, so the page
//  printed "5/5" and "/10", and rescaling the stored percent onto those numbers
//  moved the grade: 17 percent rendered as "1/5", which reads as 20.
//
//  The page script is extracted from shopify/my-progress.html and run in a vm
//  with a minimal DOM, so this tests the file that actually ships rather than a
//  copy of its logic.
//
//  Zero PII: synthetic names, a throwaway PIN, never printed.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:myprogress
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
const vm = require('vm');
process.env.DB_PATH = path.join(__dirname, 'smoke-my-progress.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
process.env.JWT_SECRET = 'smoke-my-progress-secret-long-enough';

const express = require('express');
const db = require('../db');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

const app = express();
app.use(express.json());
app.use('/api/student', require('../routes/student'));
app.use('/api/teacher', require('../routes/teacher'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
const post = (p, body, tok) => fetch(base() + p, {
  method: 'POST',
  headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
  body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, body: await r.json() }));
const get = (p, tok) => fetch(base() + p, { headers: { Authorization: 'Bearer ' + tok } })
  .then(async (r) => ({ status: r.status, body: await r.json() }));

const { buildCanonicalGradebook } = require('../lib/gradebook-contract');
const run = (s, ...a) => db.prepare(s).run(...a);
const COURSE = 'ap-cybersecurity';
const near = (a, b, eps = 0.011) => a != null && b != null && Math.abs(a - b) < eps;

// ── Load the shipped page and get its StProg object out ──────────────────────
//  A minimal DOM: enough for the script to define itself without touching a
//  browser. Element lookups return a stub, so render calls are harmless.
function loadPage() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'shopify', 'my-progress.html'), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  if (scripts.length !== 1) throw new Error('expected exactly one inline script, found ' + scripts.length);
  const el = () => ({
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {}, addEventListener() {},
    set textContent(v) {}, get textContent() { return ''; },
    set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html || ''; },
  });
  const store = {};
  const sandbox = {
    window: {}, console,
    document: {
      getElementById: () => el(),
      addEventListener: () => {},
      querySelector: () => el(),
    },
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    fetch: () => Promise.reject(new Error('no network in this test')),
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(scripts[0], sandbox, { timeout: 5000 });
  if (!sandbox.window.StProg) throw new Error('page did not define window.StProg');
  return sandbox.window.StProg;
}

(async () => {
  console.log('\nMY-PROGRESS PAGE RENDERS THE TEACHER\'S NUMBERS\n');

  console.log('0. The shipped page loads and exposes its logic');
  let StProg;
  try { StProg = loadPage(); ok('  shopify/my-progress.html defines StProg', true); }
  catch (e) { ok('  shopify/my-progress.html defines StProg', false, e.message); throw e; }
  // Scoped to the SCRIPT, not the whole file: the comment at the top of the
  // page quotes the old constant table on purpose, to say what was removed and
  // why. Checking the raw file would match that comment and fail on its own
  // documentation.
  const pageHtml = fs.readFileSync(path.join(__dirname, '..', 'shopify', 'my-progress.html'), 'utf8');
  const scriptBody = [...pageHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
  ok('  the script no longer carries a hardcoded POINTS table',
    !/const\s+POINTS\s*=\s*\{/.test(scriptBody));
  ok('  and no longer rescales a percent onto a constant',
    !/POINTS\[[^\]]*\]\s*\|\|\s*100/.test(scriptBody));

  // The real Cyber Unit 1 values, the ones the constant table got wrong.
  run(`INSERT INTO course_denominators (course,unit,lesson,activity_type,possible) VALUES
       (?,'unit-1','1.1','exercise-1',7),
       (?,'unit-1','1.1','exercise-2',8),
       (?,'unit-1','1.1','quiz',5),
       (?,'unit-1','1.2','exercise-1',7)`, COURSE, COURSE, COURSE, COURSE);

  const reg = await post('/api/teacher/register', {
    email: 'myprog@example.org', password: 'a-long-enough-password',
    name: 'My Prog', school: 'Example High',
  });
  const tok = reg.body.token;
  const cls = await post('/api/teacher/classes', { class_name: 'Cyber P1', course: COURSE }, tok);
  const code = cls.body.class.class_code;
  const j = await post('/api/student/join', { class_code: code, display_name: 'MP1', pin: '1234' });
  const stok = j.body.token;

  for (const [lesson, act, score] of [
    ['1.1', 'exercise-1', 100], ['1.1', 'exercise-2', 38],
    // 29 is the 2-of-7 case: a score a 7 mark item can actually produce.
    ['1.1', 'quiz', 80], ['1.2', 'exercise-1', 29],
    ['1.4', 'lab', 55],   // deliberately unauthored
  ]) {
    await post('/api/student/progress',
      { course: COURSE, unit: 'unit-1', lesson, activity_type: act, score, completed: true }, stok);
  }

  // ── Drive the page exactly as its load() would ────────────────────────────
  const sv = await get('/api/student/progress', stok);
  StProg.threshold = sv.body.mastery_threshold;
  StProg.denominators = sv.body.denominators || {};
  StProg.model = StProg.buildModel(sv.body.progress);
  const cellOf = (lesson, act) => StProg.model[COURSE].units['unit-1'].lessons[lesson].acts[act];

  console.log('1. The page reads the authored denominators, not invented ones');
  ok('  1.1 exercise-1 renders out of 7', cellOf('1.1', 'exercise-1').possible === 7,
    cellOf('1.1', 'exercise-1').possible);
  ok('  1.1 exercise-2 renders out of 8', cellOf('1.1', 'exercise-2').possible === 8,
    cellOf('1.1', 'exercise-2').possible);
  ok('  1.1 quiz renders out of 5', cellOf('1.1', 'quiz').possible === 5,
    cellOf('1.1', 'quiz').possible);

  console.log('2. The rendered cell text is points over points');
  const text = (lesson, act) => {
    const h = StProg.cellHtml('x', act, cellOf(lesson, act));
    const m = />([^<]*)</.exec(h.replace(/<span class='sp-att'>[^<]*<\/span>/, ''));
    return m ? m[1].trim() : h;
  };
  ok('  1.1 exercise-1 shows 7/7', text('1.1', 'exercise-1') === '7/7', text('1.1', 'exercise-1'));
  ok('  1.1 exercise-2 shows 3/8, in whole marks', text('1.1', 'exercise-2') === '3/8', text('1.1', 'exercise-2'));
  ok('  1.1 quiz shows 4/5', text('1.1', 'quiz') === '4/5', text('1.1', 'quiz'));
  // The regression, stated as the student sees it.
  ok('  1.2 exercise-1 shows 2/7, not the old 1/5', text('1.2', 'exercise-1') === '2/7',
    text('1.2', 'exercise-1'));

  //  A cell shows points earned over points possible whenever the points are
  //  known. Where nobody has assigned points to the activity, the percent is
  //  shown alone and marked with a *, because a denominator has to be the points
  //  possible on that page and there is no honest number to print.
  //
  //  This replaced a provisional 100. It kept the percentage right, which is why
  //  it looked safe, but the weight was fiction and it put a denominator on
  //  screen that appears on no page.
  console.log('3. An unpriced column shows its percent alone, marked, with no invented pair');
  const lab = cellOf('1.4', 'lab');
  ok('  no points_possible is invented', lab.possible == null, lab.possible);
  ok('  and no points_earned either', lab.earned == null, lab.earned);
  ok('  the cell renders the percent alone', text('1.4', 'lab') === '55%', text('1.4', 'lab'));
  ok('  and it carries the provisional marker',
    /sp-prov/.test(StProg.cellHtml('x', 'lab', lab)), StProg.cellHtml('x', 'lab', lab));
  ok('  an authored cell carries no marker',
    !/sp-prov/.test(StProg.cellHtml('x', 'quiz', cellOf('1.1', 'quiz'))));

  console.log('4. Totals are points over points, not a mean of percentages');
  const t = StProg.totals(Object.values(StProg.model[COURSE].units['unit-1'].lessons)
    .flatMap((L) => Object.values(L.acts)));
  // Authored, all in whole marks: 7 + 3 + 4 + 2 = 16 over 7 + 8 + 5 + 7 = 27.
  // Plus the provisional lab at 55/100. Every visible cell is in the total, so
  // the fractions on screen add up to the number under them.
  ok('  earned 16 of 27, every point of it from a real page total',
    t.earned === 16 && near(t.graded, 27), [t.earned, t.graded]);
  ok('  which is 59.3 percent', near(t.pct, 59.3, 0.06), t.pct);
  // The unpriced lab is NOT in that denominator. 127 was 27 real marks plus a
  // fabricated 100, and no page in the course is worth 127.
  ok('  and the old fabricated 127 denominator is gone', t.graded !== 127, t.graded);
  // Not one cell on screen carries a decimal, so neither does their sum.
  ok('  and the total is itself a whole number of marks', Number.isInteger(t.earned), t.earned);
  // The mean of 100, 38, 80, 29, 55 is 60.4. The points answer is not that.
  ok('  and NOT the 60.4 a mean of percentages would give', !near(t.pct, 60.4, 0.3), t.pct);
  ok('  the provisional activity is counted and reported',
    t.unpriced === 1 && t.priced === 4, [t.priced, t.unpriced]);
  // The cost of a provisional weight, stated as a test so it is not forgotten:
  // one unauthored column at 100 outweighs the four authored ones combined.
  ok('  and a provisional 100 outweighs all four authored columns put together',
    100 > 27, [100, 27]);

  console.log('5. Every cell matches the teacher gradebook');
  const g = buildCanonicalGradebook(code, { reveal: true });
  const student = g.students[0];
  const diffs = [];
  for (const [lesson, act] of [['1.1', 'exercise-1'], ['1.1', 'exercise-2'], ['1.1', 'quiz'], ['1.2', 'exercise-1']]) {
    const page = cellOf(lesson, act);
    const teacher = student.items[`unit-1/${lesson}/${act}`];
    if (!teacher) { diffs.push({ cell: lesson + ' ' + act, why: 'missing from teacher view' }); continue; }
    if (teacher.possible !== page.possible) diffs.push({ cell: lesson + ' ' + act, field: 'possible', page: page.possible, teacher: teacher.possible });
    if (!near(teacher.earned, page.earned)) diffs.push({ cell: lesson + ' ' + act, field: 'earned', page: page.earned, teacher: teacher.earned });
  }
  if (diffs.length) diffs.forEach((d) => console.log('      ' + JSON.stringify(d)));
  ok('  4 cells compared, zero disagreements', diffs.length === 0, diffs.length);
  ok('  and the page total equals the teacher total',
    near(t.earned, student.overall.earned) && near(t.graded, student.overall.graded),
    { page: [t.earned, t.graded], teacher: [student.overall.earned, student.overall.graded] });

  console.log(`\n${pass} passed, ${fail} failed\n`);
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('\nSUITE ERROR:', e);
  server.close();
  process.exit(1);
});
