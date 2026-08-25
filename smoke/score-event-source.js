'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: score_events.source, and the claim that adding it changed nothing.
//
//  WHY THE COLUMN EXISTS
//  A cyber teacher set a score on /pages/cyber-dashboard and was told "Preview
//  only in this session." Wiring that control needs somewhere to put the
//  override, and for Cyber and CSP that somewhere is score_events, not
//  `attempts`: lib/attempt-rollup.js returns null for a course with no graded
//  course_manifest rows, so an attempts row for one of those courses never
//  reaches the teacher dashboard. See docs/grading-systems.md.
//
//  An override has to be distinguishable from a student's own submission, or
//  re-entering one could delete real work. `attempts` already solved this with a
//  nullable `source`; this is the same column on the other ledger.
//
//  WHAT THIS SUITE PINS
//  Almost all of it is the NEGATIVE claim, because that is the risky one. The
//  column is additive and defaults to NULL, so every existing writer must keep
//  behaving exactly as it did, and every existing reader must be unable to tell
//  the column was added. A migration that quietly changed a grade would be far
//  worse than one that failed loudly.
//
//  Zero PII: synthetic names and throwaway PINs, never printed.
//  No em-dashes, per repo convention.
//
//  Run: node smoke/score-event-source.js
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-score-event-source.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const m = require('../db');
const db = m.db || m;

const app = express();
app.use(express.json());
app.use('/api/student', require('../routes/student'));
app.use('/api/teacher', require('../routes/teacher'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

let pass = 0;
const fail = [];
const ok = (label, cond, extra) => {
  if (cond) { pass++; return; }
  fail.push(label + (extra !== undefined ? '  ' + JSON.stringify(extra) : ''));
};

const call = (method, p, body, tok) => fetch(base() + p, {
  method,
  headers: Object.assign({ 'Content-Type': 'application/json' },
    tok ? { Authorization: 'Bearer ' + tok } : {}),
  body: body === undefined ? undefined : JSON.stringify(body),
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

(async () => {
  // ── 1. the column is there, and shaped like its sibling on `attempts` ──────
  const cols = db.prepare('PRAGMA table_info(score_events)').all();
  const src = cols.find((c) => c.name === 'source');
  ok('score_events has a source column', !!src);
  ok('  it is TEXT', !!src && src.type === 'TEXT');
  ok('  it is nullable, so existing rows stay valid', !!src && src.notnull === 0);
  ok('  it defaults to NULL, matching attempts.source', !!src && String(src.dflt_value).toUpperCase() === 'NULL');

  const att = db.prepare('PRAGMA table_info(attempts)').all().find((c) => c.name === 'source');
  ok('  and attempts.source still exists to be consistent with', !!att);
  ok('  both ledgers agree on the convention', !!att && !!src && att.type === src.type && att.notnull === src.notnull);

  // ── 2. the index the teacher filter will need already covers it ───────────
  //  Not a nicety. Without this prefix the delete behind a re-entry is a table
  //  scan of the whole grade ledger on a 1 vCPU box.
  const idx = db.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='score_events'")
    .all().map((r) => r.sql || '').join(' ');
  ok('an index covers (student, course, unit, lesson, activity_type, item)',
    /student_id,\s*course,\s*unit,\s*lesson,\s*activity_type,\s*item/.test(idx));

  // ── 3. a real student submission still lands, and lands as NULL ───────────
  const reg = await call('POST', '/api/teacher/register', {
    email: `src-${Date.now()}@example.test`, password: 'pw-smoke-12345', name: 'Smoke',
  });
  const tok = reg.body && (reg.body.token || (reg.body.teacher && reg.body.teacher.token));
  ok('a teacher account is created for the fixture', !!tok, reg.status);

  const cls = await call('POST', '/api/teacher/classes',
    { class_name: 'Src Smoke', course: 'ap-cybersecurity' }, tok);
  const code = cls.body && (cls.body.class_code || (cls.body.class && cls.body.class.class_code));
  ok('a cyber class is created', !!code, cls.status);

  const join = await call('POST', '/api/student/join', { class_code: code, display_name: 'S One', pin: '4242' });
  const stok = join.body && join.body.token;
  ok('a student joins it', !!stok, join.status);

  const before = db.prepare('SELECT COUNT(*) n FROM score_events').get().n;
  const scored = await call('POST', '/api/student/score', {
    course: 'ap-cybersecurity', unit: 'unit-1', lesson: '1.1',
    activity_type: 'exercise-1', item: 'score', earned: 5, possible: 7,
  }, stok);
  ok('a student score is accepted', scored.status === 200, scored.status);

  const after = db.prepare('SELECT COUNT(*) n FROM score_events').get().n;
  ok('  and wrote a score_events row', after === before + 1, { before, after });

  const row = db.prepare('SELECT * FROM score_events ORDER BY rowid DESC LIMIT 1').get();
  ok('  whose source is NULL, meaning the student reported it',
    row && row.source === null, row && row.source);
  ok('  and whose points survived the migration intact',
    !!row && row.points === 5 && row.max_points === 7, row && { p: row.points, m: row.max_points });

  // ── 4. THE NEGATIVE CLAIM: nothing reads the column yet ────────────────────
  //  Flip a row to 'teacher' by hand and every existing read must be unmoved.
  //  The day a read path starts honouring source, this section fails, and that
  //  is the day it should: the change would need to be deliberate.
  const prog = await call('GET', '/api/student/progress?course=ap-cybersecurity', undefined, stok);
  const scoreBefore = JSON.stringify(prog.body);

  db.prepare("UPDATE score_events SET source = 'teacher' WHERE id = ?").run(row.id);
  const flipped = db.prepare('SELECT source FROM score_events WHERE id = ?').get(row.id);
  ok('a row can be marked teacher-sourced', flipped.source === 'teacher');

  const progAfter = await call('GET', '/api/student/progress?course=ap-cybersecurity', undefined, stok);
  ok('  and the student progress map is byte-identical',
    JSON.stringify(progAfter.body) === scoreBefore);

  const gb = await call('GET', `/api/teacher/classes/${code}/progress`, undefined, tok);
  const gb2 = JSON.stringify(gb.body);
  db.prepare('UPDATE score_events SET source = NULL WHERE id = ?').run(row.id);
  const gbBack = await call('GET', `/api/teacher/classes/${code}/progress`, undefined, tok);
  ok('  and the teacher dashboard reads the same either way',
    JSON.stringify(gbBack.body) === gb2);

  // ── 5. the progress score itself did not move ─────────────────────────────
  const pr = db.prepare(`SELECT score FROM progress WHERE student_id = ?
    AND course = ? AND unit = ? AND lesson = ? AND activity_type = ?`)
    .get(row.student_id, 'ap-cybersecurity', 'unit-1', '1.1', 'exercise-1');
  ok('the rolled-up progress score is the one the student earned',
    !!pr && Math.round(pr.score) === Math.round((5 / 7) * 100), pr && pr.score);

  server.close();
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

  console.log(`\n  score-event-source: ${pass} passed, ${fail.length} failed`);
  fail.forEach((f) => console.log('    FAIL  ' + f));
  process.exit(fail.length ? 1 : 0);
})();
