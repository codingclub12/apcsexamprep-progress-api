'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the teacher dashboard prices columns from authored totals, never from
//  a constant table.
//
//  WHAT WAS WRONG
//  shopify/cyber-dashboard.html carried its own denominators in the page:
//
//    const POINTS = {'lesson':10,'exercise-1':5,'exercise-2':5,'quiz':10,
//                    'exam':25,'case_file':10};
//    possible: DEN[l+'|'+a] != null ? DEN[l+'|'+a] : (POINTS[a] || 100)
//
//  Three separate defects, all visible to a teacher:
//
//    1. DEN was assigned AFTER the column loop that reads it, so the map was
//       empty every time and no authored value the API sent ever reached a
//       header. The authored path was dead code and the fallback was the only
//       path, which is why the constants looked harmless.
//    2. The constants are not the totals on the pages. Cyber 1.1 Exercise 1 is
//       out of 7 and was priced at 5; the five case files are 15, 14, 11, 12
//       and 11 and were all priced at 10.
//    3. `|| 100` weighted every unknown column at 100 against real 5 point
//       quizzes, so a row total read "71 / 127" against a denominator that
//       appears on no page.
//
//  WHAT THIS PINS
//    1. Authored totals reach the columns, unit-scoped key first (all five
//       Cyber units have a lesson called 'case-file' and one called 'exam').
//    2. A column with no authored total is null, not 100 and not a constant.
//    3. A reported pair still wins over the authored total.
//    4. An unpriced cell shows its percent, marked, and adds nothing to either
//       side of the points total.
//    5. Every exam a unit declares gets a column, at the lesson the config
//       names (CSP sits its tests at 'unit-test', Cyber at 'exam').
//    6. The spreadsheet carries the same pair the screen shows.
//
//  The page's own functions are executed, not reimplemented: the <script> is
//  extracted from the shipped file and run in a vm with a stub DOM.
//
//  Zero PII: synthetic names only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:tchdashpage
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

const FILE = path.join(__dirname, '..', 'shopify', 'cyber-dashboard.html');
const html = fs.readFileSync(FILE, 'utf8');
const body = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');

console.log('\nTEACHER DASHBOARD: AUTHORED TOTALS, NEVER A CONSTANT TABLE\n');

console.log('1. The constant table is gone from the shipped file');
ok('  the script was found', body.length > 5000, body.length);
ok('  no POINTS constant table', !/const\s+POINTS\s*=/.test(body));
ok('  no "or 100" denominator fallback anywhere', !/POINTS\[[^\]]+\]\s*\|\|\s*100/.test(body));
ok('  a denominator lookup helper exists instead', /function\s+denomFor\(/.test(body));
ok('  it tries the unit-scoped key first',
  /denomFor\(unit,lesson,act\)\{[\s\S]{0,120}unit\+'\|'\+lesson\+'\|'\+act/.test(body));
ok('  the unpriced marker has a style, so the star is visible', /\.pv\{/.test(html));

// ── Run the page's own model builder ─────────────────────────────────────────
console.log('\n2. Run the page\'s own buildModel, with a stub DOM');
const el = () => ({
  style: { setProperty() {} }, dataset: {}, value: '', textContent: '', innerHTML: '', checked: false,
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  addEventListener() {}, appendChild() {}, setAttribute() {}, getAttribute() { return null; },
  querySelector: () => el(), querySelectorAll: () => [], add() {}, focus() {}, click() {}, remove() {},
  getBoundingClientRect: () => ({ top: 0, left: 0, bottom: 0, right: 0 }),
});
const sandbox = {
  console,
  document: {
    getElementById: () => el(), querySelector: () => el(), querySelectorAll: () => [],
    createElement: () => el(), addEventListener() {}, body: el(), documentElement: el(),
  },
  window: { innerWidth: 1400, scrollY: 0, scrollX: 0, addEventListener: () => {}, location: { search: '', pathname: '/pages/cyber-dashboard', replace() {} } },
  location: { search: '?code=CYBER-TEST', pathname: '/pages/cyber-dashboard', replace() {} },
  navigator: { clipboard: { writeText: () => Promise.resolve() } },
  fetch: () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }),
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  URLSearchParams, AbortController, Blob: function () {}, URL: { createObjectURL: () => '', revokeObjectURL() {} },
  setTimeout, clearTimeout, Math, JSON, Date, String, Number, Array, Object, RegExp, isNaN, parseInt, parseFloat, Option: function () {},
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
let loaded = true;
try { vm.runInContext(body, sandbox, { timeout: 5000 }); } catch (e) { loaded = false; console.log('    load error: ' + e.message); }
ok('  the page script loads in a stub DOM', loaded);
const T = sandbox.window.TCDash;
ok('  TCDash is exposed by the page', !!T);
if (!T) { console.log('\nFAILED: page did not load\n'); process.exit(1); }

// ── A Cyber payload shaped exactly like the live one ─────────────────────────
//  Two units, each with a case file at the SAME lesson id. That collision is
//  why the lookup has to be unit-scoped.
const CYBER = {
  class: { class_name: 'Test Class', course: 'ap-cybersecurity' },
  course_config: {
    units: {
      'unit-1': { label: 'Unit 1', lessons: ['1.1', '1.2'], activities: ['lesson', 'exercise-1', 'quiz'],
        case_file: { label: 'Case File 1' }, exam: { lesson: 'exam', label: 'Unit 1 Exam' } },
      'unit-2': { label: 'Unit 2', lessons: ['2.1'], activities: ['lesson', 'exercise-1', 'quiz'],
        case_file: { label: 'Case File 2' }, exam: { lesson: 'exam', label: 'Unit 2 Exam' } },
    },
  },
  // Authored totals as /api/teacher/classes/:code/progress sends them.
  denominators: {
    '1.1|exercise-1': 7, '1.1|quiz': 5, '2.1|exercise-1': 6,
    'unit-1|case-file|case-file': 15,
    'unit-2|case-file|case-file': 14,
  },
  summary: [{
    student: { id: 'stu1', name: 'Test Student', ref: '', last_active: null },
    units: {}, detail: {
      'unit-1': {
        '1.1': {
          'exercise-1': { score: 43, points_earned: 3, points_possible: 7 },
          // No reported pair: priced from the authored 5.
          'quiz': { score: 80 },
          // Attempted, but nobody has priced a lesson CFU.
          'lesson': { score: 55 },
        },
        '1.2': { 'exercise-1': { completed: true, score: null } },
        'case-file': { 'case-file': { score: 100 } },
      },
      'unit-2': { 'case-file': { 'case-file': { score: 50 } } },
    },
  }],
};
T.data = CYBER;
T.model = T.buildModel(CYBER);
const col = (u, l, a) => T.model.cols.find((c) => c.unit === u && c.dl === l && c.da === a);
const stu = T.model.students[0];

console.log('\n3. Authored totals actually reach the columns');
ok('  1.1 Exercise 1 is out of 7, not the old constant 5',
  col('unit-1', '1.1', 'exercise-1').possible === 7, col('unit-1', '1.1', 'exercise-1').possible);
ok('  1.1 Quiz is out of 5, not the old constant 10',
  col('unit-1', '1.1', 'quiz').possible === 5, col('unit-1', '1.1', 'quiz').possible);
ok('  2.1 Exercise 1 is out of 6, its own value',
  col('unit-2', '2.1', 'exercise-1').possible === 6, col('unit-2', '2.1', 'exercise-1').possible);

console.log('\n4. The unit-scoped collision, which a lesson key cannot express');
ok('  Unit 1 case file is out of 15',
  col('unit-1', 'case-file', 'case-file').possible === 15, col('unit-1', 'case-file', 'case-file').possible);
ok('  Unit 2 case file is out of 14, not the same number as Unit 1',
  col('unit-2', 'case-file', 'case-file').possible === 14, col('unit-2', 'case-file', 'case-file').possible);

console.log('\n5. Unknown stays unknown');
const cfu = col('unit-1', '1.1', 'lesson');
ok('  a column with no authored total is null, not 100',
  cfu.possible === null, cfu.possible);
ok('  and it is not marked authored, so no denominator prints in its header',
  cfu.authored === false, cfu.authored);
ok('  the unit exam nobody priced is null, not the old constant 25',
  col('unit-1', 'exam', 'exam').possible === null, col('unit-1', 'exam', 'exam').possible);

console.log('\n6. Cells: a reported pair wins, an authored total prices, unknown is marked');
const cEx = T.cellData(stu, col('unit-1', '1.1', 'exercise-1'));
ok('  the reported pair is used verbatim: 3/7', T.cellText(cEx, true) === '3/7', T.cellText(cEx, true));
const cQz = T.cellData(stu, col('unit-1', '1.1', 'quiz'));
ok('  a percent with an authored total is priced in whole marks: 4/5',
  T.cellText(cQz, true) === '4/5', T.cellText(cQz, true));
ok('  and the points are whole, never 4.0 or 4.08',
  Number.isInteger(cQz.earned), cQz.earned);
const cCfu = T.cellData(stu, cfu);
ok('  an unpriced cell shows its percent, marked', T.cellText(cCfu, true) === '55%*', T.cellText(cCfu, true));
ok('  and carries no invented pair', cCfu.earned === null && cCfu.possible === null, cCfu);
ok('  the marker renders as a styled star on screen',
  /class='pv'/.test(T.cellText(cCfu)), T.cellText(cCfu));
const cCf1 = T.cellData(stu, col('unit-1', 'case-file', 'case-file'));
ok('  a full case file reads 15/15, not 10/10', T.cellText(cCf1, true) === '15/15', T.cellText(cCf1, true));
const cCf2 = T.cellData(stu, col('unit-2', 'case-file', 'case-file'));
ok('  a half case file reads 7/14, its own total', T.cellText(cCf2, true) === '7/14', T.cellText(cCf2, true));
const cDone = T.cellData(stu, col('unit-1', '1.2', 'exercise-1'));
ok('  completed but never graded is not started and not a zero',
  cDone.ungraded === true && cDone.earned === null, cDone);
const cNone = T.cellData(stu, col('unit-2', '2.1', 'quiz'));
ok('  not started reads a dash', T.cellText(cNone, true) === '–', T.cellText(cNone, true));
ok('  a scored zero and a not-started cell never render alike',
  T.cellText({ started: true, priced: true, earned: 0, possible: 5 }, true) !== T.cellText(cNone, true));

console.log('\n7. The points total counts only what is priced');
T.state.include = { lesson: true, exercise: true, quiz: true, exam: true };
const t = T.totals(stu);
// 3/7 + 4/5 + 15/15 + 7/14 = 29 / 41. The 55 percent CFU is unpriced and is
// counted nowhere, on either side.
ok('  earned is the sum of the real pairs', t.earned === 29, t);
ok('  possible is the sum of the real totals, with no 100s in it', t.poss === 41, t);
ok('  the grade is points over points', t.pct === Math.round(29 / 41 * 100), t.pct);
ok('  the unpriced column is counted, and named as such', t.unpriced === 1, t.unpriced);

console.log('\n8. Every exam a unit declares gets a column, at the lesson the config names');
const CSP = {
  class: { class_name: 'CSP', course: 'ap-csp' },
  course_config: { units: {
    'bi-1': { label: 'Big Idea 1', lessons: ['collaboration'], activities: ['lesson', 'quiz'],
      exam: { lesson: 'unit-test', label: 'Big Idea 1 Unit Test' } },
    'bi-3': { label: 'Big Idea 3', lessons: ['binary-numbers'], activities: ['lesson', 'quiz'],
      exam: [{ lesson: 'unit-test-part-a', label: 'Big Idea 3 Unit Test Part A' },
             { lesson: 'unit-test-part-b', label: 'Big Idea 3 Unit Test Part B' }] },
  } },
  denominators: { 'bi-1|unit-test|exam': 12, 'bi-3|unit-test-part-a|exam': 14, 'bi-3|unit-test-part-b|exam': 14 },
  summary: [{ student: { id: 's', name: 'S', ref: '', last_active: null }, units: {},
    detail: { 'bi-3': { 'unit-test-part-a': { exam: { score: 50 } } } } }],
};
T.data = CSP;
T.model = T.buildModel(CSP);
const csp = (u, l) => T.model.cols.find((c) => c.unit === u && c.dl === l && c.da === 'exam');
ok('  a single exam still gets exactly one column', !!csp('bi-1', 'unit-test'));
ok('  it sits at the lesson the config names, not a hardcoded "exam"',
  !T.model.cols.some((c) => c.unit === 'bi-1' && c.dl === 'exam'));
ok('  it is priced from its authored total', csp('bi-1', 'unit-test').possible === 12);
ok('  a two part test gets BOTH columns, never just the first',
  !!csp('bi-3', 'unit-test-part-a') && !!csp('bi-3', 'unit-test-part-b'));
ok('  each part keeps its own label',
  csp('bi-3', 'unit-test-part-b').lessonName === 'Big Idea 3 Unit Test Part B');
const partA = T.cellData(T.model.students[0], csp('bi-3', 'unit-test-part-a'));
ok('  and a part A score lands in part A, priced at 14', T.cellText(partA, true) === '7/14', T.cellText(partA, true));

console.log('\n9. The spreadsheet says what the screen says');
T.data = CYBER;
T.model = T.buildModel(CYBER);
const csv = T.buildGradebookCSV().split('\r\n');
const head = csv[0].split(',');
const row = csv[1];
ok('  the header prices the column it knows', head.some((h) => h.indexOf('(/7)') > -1), head);
ok('  the header prices each case file separately',
  head.some((h) => h.indexOf('(/15)') > -1) && head.some((h) => h.indexOf('(/14)') > -1), head);
ok('  an unpriced column header carries no invented total',
  !head.some((h) => h.indexOf('(/100)') > -1 || h.indexOf('(/10)') > -1), head);
ok('  a cell is the pair, not a bare percent', row.indexOf('3/7') > -1, row);
ok('  an unpriced cell is the marked percent', row.indexOf('55%*') > -1, row);
ok('  completed but never graded is "Complete", not 0', row.indexOf('Complete') > -1, row);
ok('  the row carries the same points total the screen shows',
  row.indexOf(',29,41,') > -1, row);
ok('  and the grade column is a grade, not a completion count',
  head[3] === 'Grade %' && head[6] === 'Completion %', head.slice(0, 7));

console.log('\n' + (fail === 0 ? 'ALL PASS' : 'FAILURES: ' + fail) + '  (' + pass + ' passed)\n');
process.exit(fail === 0 ? 0 : 1);
