'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CODE-GRADE PROOF TEST
//
//  Proves the integrity property of server-side code grading in the bare-segment /
//  prelude-injection model: a hardcoded System.out.println of the VISIBLE expected
//  output FAILS, because hidden cases inject prelude values the page never shows. A
//  correct segment that computes from the injected variables passes every case. And
//  the student's source is never persisted.
//
//  Runs in-process. It boots the real app (real /api/student/code-grade, real
//  /api/judge0/run proxy, real DB, real seed) and stubs ONLY the external RapidAPI
//  network call, standing in a LOCAL javac/java to actually compile and run the
//  program the grader assembled. Everything else is the production code path.
//
//  Requires a local Java toolchain (javac/java) on PATH. Run from the repo root:
//      node smoke/code-grade.js
// ─────────────────────────────────────────────────────────────────────────────
const assert = require('assert');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const PORT = 4071;
const DB_FILE = path.join(os.tmpdir(), `code-grade-test-${process.pid}.db`);

process.env.DB_PATH = DB_FILE;
process.env.PORT = String(PORT);
process.env.JWT_SECRET = 'code-grade-test-secret';
process.env.RAPIDAPI_KEY = 'test-key';        // so the Judge0 proxy does not 500
process.env.SELF_BASE_URL = `http://127.0.0.1:${PORT}`;
for (const f of [DB_FILE, DB_FILE + '-wal', DB_FILE + '-shm']) {
  try { fs.unlinkSync(f); } catch (_) { /* not there */ }
}

const b64 = (s) => Buffer.from(String(s == null ? '' : s), 'utf8').toString('base64');
const realFetch = global.fetch;

// Stand-in for Judge0: really compile and run the program the grader assembled.
function runLocally(languageId, source, stdin) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-'));
  try {
    if (languageId !== 62) return { status: { id: 3, description: 'Accepted' }, stdout: b64('') };
    fs.writeFileSync(path.join(dir, 'Main.java'), source);
    try { execFileSync('javac', ['Main.java'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) { return { status: { id: 6, description: 'Compilation Error' }, stdout: null, compile_output: b64(String(e.stderr || e.message)) }; }
    try {
      const out = execFileSync('java', ['Main'], { cwd: dir, input: stdin, stdio: ['pipe', 'pipe', 'pipe'] });
      return { status: { id: 3, description: 'Accepted' }, stdout: b64(out.toString()) };
    } catch (e) { return { status: { id: 11, description: 'Runtime Error (NZEC)' }, stdout: b64((e.stdout || '').toString()) }; }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
global.fetch = async function (url, opts) {
  if (!String(url).includes('judge0-ce.p.rapidapi.com')) return realFetch(url, opts);
  const body = JSON.parse(opts.body);
  const source = Buffer.from(body.source_code, 'base64').toString('utf8');
  const stdin = Buffer.from(body.stdin || '', 'base64').toString('utf8');
  return { ok: true, status: 200, json: async () => ({ time: '0.01', memory: 1000, stderr: null, compile_output: null, ...runLocally(body.language_id, source, stdin) }) };
};

// ── Boot: seed this test's OWN code item, then start the app ──────────────────
// Self-contained: seeds a dedicated bare-segment item (given ints a and b, print
// their sum) with prelude-injected inputs, so it never depends on the shipped
// pilot seed. Uses lesson 1.5 (a real exercise-1 denominator = 1 point).
const db = require('../db');
const cgIns = db.prepare(
  'INSERT OR REPLACE INTO code_test_cases (course, lesson, item, seq, prelude, postlude, stdin, expected_stdout, hidden) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
[
  ['int a = 2;\nint b = 3;',   '5',  0],   // visible: the worked example
  ['int a = 10;\nint b = 20;', '30', 1],   // hidden
  ['int a = 0;\nint b = 0;',   '0',  1],   // hidden
].forEach((c, i) => cgIns.run('ap-csa', '1.5', 'exercise-1', i, c[0], '', '', c[1], c[2]));
require('../server');                                                    // boots denominators + listens
const { signStudentToken } = require('../utils');

const CLASS_ID = 'cg-class-1';
const STUDENT_ID = 'cg-student-1';
db.prepare(`INSERT OR IGNORE INTO teachers (id, email, name, password_hash, verified)
  VALUES ('cg-teacher-1', 'cg@test.invalid', 'CG Teacher', 'x', 1)`).run();
db.prepare(`INSERT OR IGNORE INTO classes (id, teacher_id, class_code, class_name, course, active, mastery_threshold, retry_allowed)
  VALUES (?, 'cg-teacher-1', 'CSA-TST1', 'CG Test Class', 'ap-csa', 1, 80, 1)`).run(CLASS_ID);
db.prepare(`INSERT OR IGNORE INTO students (id, class_id, display_name, pin_hash)
  VALUES (?, ?, 'Grader Test', 'x')`).run(STUDENT_ID, CLASS_ID);
const TOKEN = signStudentToken({ id: STUDENT_ID, class_id: CLASS_ID }, 'CSA-TST1');

// Student submits a BARE SEGMENT. a and b are provided by each case's prelude.
const CORRECT_SEGMENT = 'System.out.println(a + b);';
const CHEAT_SEGMENT = 'System.out.println(5);';   // hardcodes the visible output

const BASE = `http://127.0.0.1:${PORT}`;
async function post(pathname, body) {
  const r = await realFetch(BASE + pathname, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json() };
}
async function waitForHealth() {
  for (let i = 0; i < 50; i++) {
    try { const r = await realFetch(BASE + '/api/health'); if (r.ok) return; } catch (_) {}
    await new Promise((res) => setTimeout(res, 100));
  }
  throw new Error('server did not become healthy');
}

const LOCATION = { course: 'ap-csa', unit: 'unit-1', lesson: '1.5', item: 'exercise-1' };
const SOURCE_TOKENS = ['println', 'a + b'];   // tokens that appear only in the student segment

function assertNoDbLeak() {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map((t) => t.name);
  let dump = '';
  for (const t of tables) dump += JSON.stringify(db.prepare(`SELECT * FROM "${t}"`).all());
  for (const tok of SOURCE_TOKENS) assert.ok(!dump.includes(tok), `student source token "${tok}" was persisted in the DB`);
}

(async function main() {
  let failures = 0;
  const check = (name, fn) => { try { fn(); console.log('  PASS', name); } catch (e) { failures++; console.error('  FAIL', name, '\n    ', e.message); } };
  try {
    await waitForHealth();

    // 1) The cheat: hardcode the visible expected output.
    const cheat = await post('/api/student/code-grade', { ...LOCATION, language: 'java', source: CHEAT_SEGMENT });
    console.log('\nHardcoded-output submission ->', JSON.stringify(cheat.body));
    check('hardcoded submission is accepted (200)', () => assert.strictEqual(cheat.status, 200));
    check('hardcoded passes ONLY the visible case (1 of 3)', () => {
      assert.strictEqual(cheat.body.passed, 1);
      assert.strictEqual(cheat.body.total, 3);
    });
    check('hardcoded does NOT earn full points (points_possible = 1)', () => {
      assert.strictEqual(cheat.body.points_possible, 1);
      assert.ok(cheat.body.points_earned < cheat.body.points_possible, `expected ${cheat.body.points_earned} < 1`);
    });
    check('hardcoded returns a failure summary (2 failed), not the cases', () => {
      const s = cheat.body.failing_case_summary;
      assert.ok(s, 'expected a failing_case_summary');
      assert.strictEqual(s.cases_failed, 2);
      assert.strictEqual(s.cases_total, 3);
      assert.deepStrictEqual(Object.keys(s).sort(), ['cases_failed', 'cases_total', 'message']);
    });

    // 2) The correct segment: computes from the injected variables, passes all cases.
    const good = await post('/api/student/code-grade', { ...LOCATION, language: 'java', source: CORRECT_SEGMENT });
    console.log('Correct submission     ->', JSON.stringify(good.body));
    check('correct passes ALL cases and earns full points', () => {
      assert.strictEqual(good.body.passed, 3);
      assert.strictEqual(good.body.total, 3);
      assert.strictEqual(good.body.points_earned, 1);
      assert.strictEqual(good.body.points_possible, 1);
      assert.strictEqual(good.body.failing_case_summary, null);
    });

    // 3) The grade rolled up onto System B (progress.score), best-per-item.
    check('grade rolled up to progress.score = 100', () => {
      const row = db.prepare(`SELECT score FROM progress
        WHERE student_id = ? AND course = 'ap-csa' AND unit = 'unit-1' AND lesson = '1.5' AND activity_type = 'exercise-1'`).get(STUDENT_ID);
      assert.ok(row, 'expected a progress row for the code item');
      assert.strictEqual(row.score, 100);
    });

    // 4) DATA POLICY: the source was graded in transit and discarded.
    check('student source is NOT persisted anywhere in the DB', assertNoDbLeak);

    // 5) No raw test case leaked in the response.
    check('no hidden case leaked in the response', () => {
      const blob = JSON.stringify(cheat.body) + JSON.stringify(good.body);
      assert.ok(!/expected_stdout|"prelude"|"stdin"/.test(blob), 'a raw case field leaked in the response');
    });

    // 6) Language allowlist enforced.
    const badLang = await post('/api/student/code-grade', { ...LOCATION, language: 'ruby', source: CORRECT_SEGMENT });
    check('disallowed language is rejected (400)', () => assert.strictEqual(badLang.status, 400));

    // 7) A valid location with no seeded test bank 404s so the page can fall back.
    const noBank = await post('/api/student/code-grade', { course: 'ap-csa', unit: 'unit-1', lesson: '1.6', item: 'exercise-2', language: 'java', source: CORRECT_SEGMENT });
    check('location with no test bank returns 404', () => assert.strictEqual(noBank.status, 404));

  } catch (e) {
    failures++;
    console.error('FATAL', e);
  } finally {
    for (const f of [DB_FILE, DB_FILE + '-wal', DB_FILE + '-shm']) { try { fs.unlinkSync(f); } catch (_) {} }
    console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
    process.exit(failures === 0 ? 0 : 1);
  }
})();
