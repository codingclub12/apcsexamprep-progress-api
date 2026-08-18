'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the admin code test bank routes.
//
//  WHAT THEY ARE FOR
//  The hidden bank behind POST /api/student/code-grade is seeded manually and
//  never on boot, so a fresh deploy grades nothing until somebody loads it. That
//  is the right posture and it is unchanged. These routes only remove the cost of
//  it: checking whether the bank is loaded, and loading it, without a Railway
//  shell. The 53 CSA exercise pages are inert until the seed runs, and the person
//  who has to run it is the person about to teach the lesson.
//
//  WHAT IS PINNED
//  The auth asymmetry, mostly. GET is read-only and a dashboard session cookie is
//  enough to LOOK; POST mutates a live class's answer key and must require the
//  x-admin-key header, exactly like every other write on this router. A seed
//  route that a stale cookie could fire is a route that can silently rewrite
//  grading for every student in the system.
//
//  Also pinned: seeding is idempotent (running it twice is running it once), a
//  dry run writes NOTHING, and the read route tells the truth about an empty
//  bank rather than looking healthy while grading nothing.
//
//  Zero PII: author content only. No em-dashes, per repo convention.
//
//  Run: npm run smoke:admincodetests
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-admin-code-tests.db');
process.env.ADMIN_KEY = 'smoke-admin-key-01234567890-abcdef';
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');

const app = express();
app.use(express.json());
app.use('/api/admin', require('../routes/admin'));

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  [PASS] ' + n); } else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); } };
const section = (t) => console.log('\n' + t);
const cases = () => db.prepare('SELECT COUNT(*) n FROM code_test_cases').get().n;

(async () => {
  const base = await new Promise((r) => { const s = app.listen(0, () => r('http://127.0.0.1:' + s.address().port)); });
  const KEY = process.env.ADMIN_KEY;
  const call = (method, p, body) => fetch(base + p, {
    method,
    headers: Object.assign({ 'x-admin-key': KEY }, body ? { 'Content-Type': 'application/json' } : {}),
    body: body ? JSON.stringify(body) : undefined,
  });
  const noKey = (method, p, body) => fetch(base + p, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

  section('1. Auth posture');
  ok('1.1 seeding without the header key is refused',
    (await noKey('POST', '/api/admin/code-tests/seed')).status === 403);
  ok('1.2 a refused seed wrote nothing', cases() === 0, cases());
  ok('1.3 reading without any credential is refused',
    (await noKey('GET', '/api/admin/code-tests')).status === 403);

  section('2. The empty bank tells the truth');
  const empty = await (await call('GET', '/api/admin/code-tests')).json();
  ok('2.1 an unseeded bank reports seeded false', empty.seeded === false, empty.seeded);
  ok('2.2 and says so in a sentence rather than looking healthy',
    typeof empty.note === 'string' && /404/.test(empty.note), empty.note);
  ok('2.3 total is zero', empty.total_cases === 0, empty.total_cases);

  section('3. A dry run writes nothing');
  const dry = await (await call('POST', '/api/admin/code-tests/seed', { dry_run: true })).json();
  ok('3.1 the dry run reports what it would load',
    dry.dry_run === true && dry.would_load.cases > 200, dry.would_load);
  ok('3.2 and the table is still empty', cases() === 0, cases());

  section('4. Seeding');
  const first = await (await call('POST', '/api/admin/code-tests/seed')).json();
  ok('4.1 the seed reports what it wrote', first.ok === true && first.cases > 200, first.cases);
  ok('4.2 the table is populated', cases() === first.cases_after && cases() > 200, cases());
  ok('4.3 it went from empty', first.cases_before === 0, first.cases_before);
  // The whole point: this is what the 53 exercise pages need in order to grade.
  const loaded = await (await call('GET', '/api/admin/code-tests')).json();
  ok('4.4 all 53 CSA exercise-1 lessons are gradeable',
    loaded.gradeable.filter((g) => g.startsWith('ap-csa ') && g.endsWith(' exercise-1')).length === 53,
    loaded.gradeable.filter((g) => g.endsWith(' exercise-1')).length);
  ok('4.5 the read route now reports seeded', loaded.seeded === true && !loaded.note);
  ok('4.6 both new grading modes are present',
    loaded.by_item.some((r) => r.mode === 'program') && loaded.by_item.some((r) => r.mode === 'driver'),
    loaded.by_item.map((r) => r.mode));
  ok('4.7 hidden cases are loaded, which is what stops a hardcoded answer',
    loaded.by_item.reduce((n, r) => n + r.hidden_cases, 0) > 150);

  section('5. Running it twice is running it once');
  const snapshot = db.prepare('SELECT course, lesson, item, seq, mode, expected_stdout, hidden FROM code_test_cases ORDER BY course, lesson, item, seq').all();
  const second = await (await call('POST', '/api/admin/code-tests/seed')).json();
  const after = db.prepare('SELECT course, lesson, item, seq, mode, expected_stdout, hidden FROM code_test_cases ORDER BY course, lesson, item, seq').all();
  ok('5.1 the row count is unchanged', second.cases_after === first.cases_after, [first.cases_after, second.cases_after]);
  ok('5.2 every row is byte for byte what it was',
    JSON.stringify(snapshot) === JSON.stringify(after));

  section('6. A stale case cannot survive a reseed');
  // This is the failure the prune exists for: an item that used to have more
  // cases would otherwise keep the extras, and the grade route refuses an item
  // whose cases disagree, which takes the page down rather than mis-scoring it.
  db.prepare(`INSERT INTO code_test_cases (course, lesson, item, seq, prelude, postlude, stdin, mode, expected_stdout, hidden)
              VALUES ('ap-csa', '1.3', 'exercise-1', 98, '', '', '', 'segment', 'stale', 0)`).run();
  ok('6.1 a stale row exists to be cleaned up',
    db.prepare("SELECT COUNT(*) n FROM code_test_cases WHERE lesson='1.3' AND seq=98").get().n === 1);
  await call('POST', '/api/admin/code-tests/seed');
  ok('6.2 reseeding removes it',
    db.prepare("SELECT COUNT(*) n FROM code_test_cases WHERE lesson='1.3' AND seq=98").get().n === 0);
  ok('6.3 and leaves the real cases alone', cases() === first.cases_after, cases());

  console.log(`\n${pass} passed, ${fail} failed\n`);
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})();
