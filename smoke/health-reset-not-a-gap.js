'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: a deliberate teacher Reset is not a failed rollup.
//
//  WHY THIS SUITE EXISTS
//  score_rollup_missing is a CRITICAL, and its text reads "the work was captured
//  but the teacher's gradebook will read blank for it". That is an accurate
//  description of a Reset, which is a thing teachers are supposed to do: it
//  nulls progress.score, stamps score_reset_at, and LEAVES the pre-reset rows in
//  the ledger on purpose, because they are still the student's history.
//
//  The check could not fire for that reason before 2026-08-24, because the Reset
//  button on the teacher dashboard was preview-only and wrote nothing at all.
//  Wiring it up meant the next teacher to use it would raise a false CRITICAL on
//  a live board.
//
//  This is the same shape as the denominator bug found the same week: a
//  reporting view not applying a guard the production read path applies. The
//  cost there was an investigation that proposed four different fixes for a
//  gradebook that was never wrong. A health board that cries wolf costs the
//  same thing, one alarm at a time.
//
//  WHAT IS DELIBERATELY STILL REPORTED
//  Section 3 is the half that matters most. A reset followed by a NEW submission
//  that still does not roll up IS a real failure, and must keep firing. The
//  exclusion is scoped to "reset, then silence", not to the column, or this
//  suite would be pinning a check that had simply been switched off.
//
//  Zero PII: synthetic students, numbers only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:healthreset
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-health-reset.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { computeHealth } = require('../lib/admin-health');

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
const call = (m, p, b, t) => fetch(base() + p, {
  method: m,
  headers: Object.assign({ 'Content-Type': 'application/json' }, t ? { Authorization: 'Bearer ' + t } : {}),
  body: b ? JSON.stringify(b) : undefined,
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

const L = { course: 'ap-cybersecurity', unit: 'unit-1', lesson: '1.1', activity_type: 'exercise-1' };
const rollupFinding = () => (computeHealth().findings || []).find((f) => f.code === 'score_rollup_missing') || null;

(async () => {
  const tok = (await call('POST', '/api/teacher/register',
    { email: 'healthreset@example.org', password: 'a-long-enough-password', name: 'Health Reset' })).body.token;
  const cls = (await call('POST', '/api/teacher/classes',
    { class_name: 'Health Reset Class', course: 'ap-cybersecurity' }, tok)).body.class;
  const st = (await call('POST', '/api/student/join',
    { class_code: cls.class_code, display_name: 'Avery', pin: '1234' })).body.token;

  // ── 1. NORMAL WORK IS QUIET ───────────────────────────────────────────────
  await call('POST', '/api/student/score', Object.assign({ item: 'score', earned: 5, possible: 7 }, L), st);
  {
    ok('a scored activity raises nothing', rollupFinding() === null, rollupFinding());
  }

  // ── 2. A DELIBERATE RESET IS NOT A GAP ────────────────────────────────────
  //  Driven through the real endpoint the dashboard's Reset button calls.
  const pid = db.prepare(`SELECT id FROM progress WHERE course=? AND unit=? AND lesson=? AND activity_type=?`)
    .get(L.course, L.unit, L.lesson, L.activity_type).id;
  {
    const r = await call('PATCH', `/api/teacher/classes/${cls.class_code}/progress/${pid}/unlock`, { reset: true }, tok);
    ok('the reset is accepted', r.status === 200 && r.body.ok === true, r.body);

    const row = db.prepare('SELECT score, score_reset_at FROM progress WHERE id = ?').get(pid);
    ok('it nulls the score, which is what the check looks for', row.score === null, row);
    ok('and stamps the moment, which is what tells the two apart', !!row.score_reset_at, row);
    const events = db.prepare(`SELECT COUNT(*) n FROM score_events
      WHERE course=? AND unit=? AND lesson=? AND activity_type=?`).get(L.course, L.unit, L.lesson, L.activity_type).n;
    ok('the pre-reset rows stay in the ledger on purpose', events > 0, events);

    ok('and NO false critical is raised', rollupFinding() === null, rollupFinding());
  }

  // ── 3. BUT A REAL FAILURE AFTER A RESET STILL FIRES ───────────────────────
  //  The half that keeps this a fix rather than a mute. The student submits
  //  again, so there IS work after the reset; the rollup is then forced to the
  //  broken state the check exists to catch.
  {
    await call('POST', '/api/student/score', Object.assign({ item: 'score', earned: 6, possible: 7 }, L), st);
    ok('the new submission rolled up normally first',
      db.prepare('SELECT score FROM progress WHERE id = ?').get(pid).score !== null);

    // Simulate the rollup half not landing, which is the actual defect.
    db.prepare('UPDATE progress SET score = NULL WHERE id = ?').run(pid);
    const f = rollupFinding();
    ok('a post-reset submission that does not roll up IS reported', f !== null, f);
    ok('and it is still a CRITICAL', f && f.severity === 'critical', f && f.severity);
  }

  // ── 4. EVENTS WITH NO PROGRESS ROW AT ALL ARE STILL REPORTED ──────────────
  //  The other genuine failure the check covers. Never reset, so the new
  //  exclusion must not reach it.
  {
    db.prepare('UPDATE progress SET score = 71, score_reset_at = NULL WHERE id = ?').run(pid);
    ok('back to quiet', rollupFinding() === null, rollupFinding());
    db.prepare(`DELETE FROM progress WHERE id = ?`).run(pid);
    const f = rollupFinding();
    ok('score events with no progress row at all are reported', f !== null, f);
  }

  // ── 5. THE GUARD IS SCOPED, NOT BLANKET ───────────────────────────────────
  {
    const src = fs.readFileSync(path.join(__dirname, '..', 'lib/admin-health.js'), 'utf8');
    ok('the exclusion keys on score_reset_at', /score_reset_at IS NOT NULL/.test(src));
    ok('and requires that nothing was submitted since',
      /created_at > p\.score_reset_at/.test(src));
    ok('the column itself is still checked for a null score', /p\.score IS NULL/.test(src));
  }

  console.log(`  health-reset-not-a-gap: ${pass} passed, ${fail.length} failed`);
  fail.forEach((f) => console.log(`    FAIL  ${f}`));
  server.close();
  process.exit(fail.length ? 1 : 0);
})().catch((e) => { console.error('threw:', e); server.close(); process.exit(1); });
