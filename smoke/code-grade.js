'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CODE-GRADE PROOF TEST
//
//  Proves the integrity property of server-side code grading: a hardcoded
//  System.out.println of the VISIBLE expected output FAILS, because hidden test
//  cases use inputs the page never shows. A correct program that reads its input
//  and computes the result passes every case. And the student's source is never
//  persisted anywhere.
//
//  Runs in-process. It boots the real app (real /api/student/code-grade, real
//  /api/judge0/run proxy, real DB, real seed) and stubs ONLY the external RapidAPI
//  network call, simulating a tiny Java runtime for the two programs under test.
//  Everything else is the production code path.
//
//  Run: node smoke/code-grade.js   (from the repo root)
// ─────────────────────────────────────────────────────────────────────────────
const assert = require('assert');
const os = require('os');
const path = require('path');
const fs = require('fs');

const PORT = 4071;
const DB_FILE = path.join(os.tmpdir(), `code-grade-test-${process.pid}.db`);

// Fresh DB + test env, set BEFORE requiring anything that opens the DB or reads env.
process.env.DB_PATH = DB_FILE;
process.env.PORT = String(PORT);
process.env.JWT_SECRET = 'code-grade-test-secret';
process.env.RAPIDAPI_KEY = 'test-key';        // so the Judge0 proxy does not 500
process.env.SELF_BASE_URL = `http://127.0.0.1:${PORT}`;
for (const f of [DB_FILE, DB_FILE + '-wal', DB_FILE + '-shm']) {
  try { fs.unlinkSync(f); } catch (_) { /* not there */ }
}

// ── The two programs under test, and the fake Judge0 runtime ──────────────────
// Exact source strings so the fake runtime is unambiguous about what each does.
const REAL_SRC = [
  'import java.util.Scanner;',
  'public class Main {',
  '  public static void main(String[] args) {',
  '    Scanner sc = new Scanner(System.in);',
  '    int n = sc.nextInt();',
  '    System.out.println(n * 2);',
  '  }',
  '}',
].join('\n');

// The cheat: the page shows the 5 -> 10 example, so this prints 10 unconditionally.
const HARDCODED_SRC = [
  'public class Main {',
  '  public static void main(String[] args) {',
  '    System.out.println(10);',
  '  }',
  '}',
].join('\n');

const b64 = (s) => Buffer.from(String(s), 'utf8').toString('base64');
const realFetch = global.fetch;

// Intercept only the RapidAPI Judge0 host; delegate every other URL (all loopback
// calls to our own app) to the real fetch.
global.fetch = async function (url, opts) {
  const u = String(url);
  if (!u.includes('judge0-ce.p.rapidapi.com')) {
    return realFetch(url, opts);
  }
  const body = JSON.parse(opts.body);
  const source = Buffer.from(body.source_code, 'base64').toString('utf8');
  const stdin = Buffer.from(body.stdin || '', 'base64').toString('utf8');

  let stdout;
  if (source === REAL_SRC) {
    const n = parseInt(String(stdin).trim(), 10);
    stdout = String((Number.isNaN(n) ? 0 : n) * 2) + '\n';
  } else if (source === HARDCODED_SRC) {
    stdout = '10\n';   // always, regardless of stdin
  } else {
    stdout = '';       // unknown program: no output, fails every case
  }
  return {
    ok: true,
    status: 200,
    json: async () => ({
      status: { id: 3, description: 'Accepted' },
      stdout: b64(stdout),
      stderr: null,
      compile_output: null,
      time: '0.01',
      memory: 1000,
    }),
  };
};

// ── Boot: seed the hidden test bank, then start the app ───────────────────────
const db = require('../db');
require('../scripts/seed-code-tests').seedCodeTests({ update: true });   // load code_test_cases
require('../server');                                                    // boots denominators + listens
const { signStudentToken } = require('../utils');

// A real teacher class (retry on) with one student, inserted directly.
const CLASS_ID = 'cg-class-1';
const STUDENT_ID = 'cg-student-1';
db.prepare(`INSERT OR IGNORE INTO teachers (id, email, name, password_hash, verified)
  VALUES ('cg-teacher-1', 'cg@test.invalid', 'CG Teacher', 'x', 1)`).run();
db.prepare(`INSERT OR IGNORE INTO classes (id, teacher_id, class_code, class_name, course, active, mastery_threshold, retry_allowed)
  VALUES (?, 'cg-teacher-1', 'CSA-TST1', 'CG Test Class', 'ap-csa', 1, 80, 1)`).run(CLASS_ID);
db.prepare(`INSERT OR IGNORE INTO students (id, class_id, display_name, pin_hash)
  VALUES (?, ?, 'Grader Test', 'x')`).run(STUDENT_ID, CLASS_ID);
const TOKEN = signStudentToken({ id: STUDENT_ID, class_id: CLASS_ID }, 'CSA-TST1');

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
    try {
      const r = await realFetch(BASE + '/api/health');
      if (r.ok) return;
    } catch (_) { /* not up yet */ }
    await new Promise((res) => setTimeout(res, 100));
  }
  throw new Error('server did not become healthy');
}

const LOCATION = { course: 'ap-csa', unit: 'unit-1', lesson: '1.1', item: 'exercise-1' };

// A token unique to the student's source, used to prove the source is not stored.
const SOURCE_TOKENS = ['nextInt', 'System.out.println', 'public class Main'];

function assertNoDbLeak() {
  // Authoritative scan: dump every row of every table and assert the student
  // source never appears anywhere.
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  ).all().map((t) => t.name);
  let dump = '';
  for (const t of tables) {
    const rows = db.prepare(`SELECT * FROM "${t}"`).all();
    dump += JSON.stringify(rows);
  }
  for (const tok of SOURCE_TOKENS) {
    assert.ok(!dump.includes(tok), `student source token "${tok}" was persisted in the DB`);
  }
}

(async function main() {
  let failures = 0;
  const check = (name, fn) => {
    try { fn(); console.log('  PASS', name); }
    catch (e) { failures++; console.error('  FAIL', name, '\n    ', e.message); }
  };

  try {
    await waitForHealth();

    // 1) The cheat: hardcoded println of the visible expected output.
    const cheat = await post('/api/student/code-grade', { ...LOCATION, language: 'java', source: HARDCODED_SRC });
    console.log('\nHardcoded-output submission ->', JSON.stringify(cheat.body));
    check('hardcoded submission is accepted (200)', () => assert.strictEqual(cheat.status, 200));
    check('hardcoded passes ONLY the visible case (1 of 4)', () => {
      assert.strictEqual(cheat.body.passed, 1);
      assert.strictEqual(cheat.body.total, 4);
    });
    check('hardcoded does NOT earn full points', () => {
      assert.ok(cheat.body.points_earned < cheat.body.points_possible,
        `expected ${cheat.body.points_earned} < ${cheat.body.points_possible}`);
      assert.strictEqual(cheat.body.points_possible, 10);   // manifest points for exercise-1
    });
    check('hardcoded returns a failure summary (3 failed), not the cases', () => {
      const s = cheat.body.failing_case_summary;
      assert.ok(s, 'expected a failing_case_summary');
      assert.strictEqual(s.cases_failed, 3);
      assert.strictEqual(s.cases_total, 4);
      // Summary keys are only the safe ones; no case payload smuggled in.
      assert.deepStrictEqual(Object.keys(s).sort(), ['cases_failed', 'cases_total', 'message']);
    });

    // 2) The correct program: reads input, computes, passes every case.
    const good = await post('/api/student/code-grade', { ...LOCATION, language: 'java', source: REAL_SRC });
    console.log('Correct submission     ->', JSON.stringify(good.body));
    check('correct submission is accepted (200)', () => assert.strictEqual(good.status, 200));
    check('correct passes ALL cases and earns full points', () => {
      assert.strictEqual(good.body.passed, 4);
      assert.strictEqual(good.body.total, 4);
      assert.strictEqual(good.body.points_earned, 10);
      assert.strictEqual(good.body.points_possible, 10);
      assert.strictEqual(good.body.failing_case_summary, null);
    });

    // 3) The grade rolled up onto System B (progress.score), best-per-item.
    check('grade rolled up to progress.score = 100', () => {
      const row = db.prepare(`SELECT score FROM progress
        WHERE student_id = ? AND course = 'ap-csa' AND unit = 'unit-1' AND lesson = '1.1' AND activity_type = 'exercise-1'`)
        .get(STUDENT_ID);
      assert.ok(row, 'expected a progress row for the code item');
      assert.strictEqual(row.score, 100);
    });

    // 4) DATA POLICY: the source was graded in transit and discarded.
    check('student source is NOT persisted anywhere in the DB', assertNoDbLeak);

    // 5) No hidden case data leaked in either response body. The summary message is
    // a fixed generic template carrying only the counts, so assert it verbatim (any
    // smuggled case data would change the string), and assert no raw case field.
    check('no hidden case stdin/expected leaked in the response', () => {
      const blob = JSON.stringify(cheat.body) + JSON.stringify(good.body);
      const msg = (cheat.body.failing_case_summary && cheat.body.failing_case_summary.message) || '';
      assert.strictEqual(msg,
        '3 of 4 test cases failed. Some tests use hidden inputs, so matching only the shown ' +
        'example is not enough. Make sure your program reads its input and computes the result.');
      // Response must not carry a raw test-case field at all.
      assert.ok(!/expected_stdout|"stdin"|"expected"/.test(blob), 'a raw case field leaked in the response');
    });

    // 6) Language allowlist is enforced.
    const badLang = await post('/api/student/code-grade', { ...LOCATION, language: 'ruby', source: REAL_SRC });
    check('disallowed language is rejected (400)', () => assert.strictEqual(badLang.status, 400));

    // 7) A valid location with no seeded test bank 404s so the page can fall back.
    // Lesson 1.2 has a manifest denominator but no code cases seeded.
    const noBank = await post('/api/student/code-grade',
      { course: 'ap-csa', unit: 'unit-1', lesson: '1.2', item: 'exercise-1', language: 'java', source: REAL_SRC });
    check('location with no test bank returns 404', () => assert.strictEqual(noBank.status, 404));

  } catch (e) {
    failures++;
    console.error('FATAL', e);
  } finally {
    for (const f of [DB_FILE, DB_FILE + '-wal', DB_FILE + '-shm']) {
      try { fs.unlinkSync(f); } catch (_) { /* ignore */ }
    }
    console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
    process.exit(failures === 0 ? 0 : 1);
  }
})();
