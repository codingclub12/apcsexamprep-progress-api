'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: a teacher can type a score into an AP Cyber gradebook cell, and every
//  view agrees with it.
//
//  WHY THIS SUITE EXISTS
//  On 2026-09-23 a grader bug held 1.4 Exercise 1 at 22 of 24 for every
//  student, and the teacher dashboard could only say "Typing a score in by hand
//  is not available on this course." PUT /api/teacher/classes/:code/cells is
//  that missing write path. A typed score is a reserved row in score_events
//  that REPLACES the activity (scoring.js, TEACHER_ITEM), so the things worth
//  proving are the ones where a replacement could quietly fail:
//
//    1  it wins over a better student attempt AND a worse one, under both a
//       best-attempt class and a first-attempt class
//    2  the teacher dashboard, the canonical gradebook and progress.score all
//       read the same number, because they are three readers of one ledger
//    3  a student cannot write the reserved row for themselves
//    4  re-entry replaces rather than stacks; clearing restores the student's
//       own attempts; Reset removes the typed mark so it cannot snap back
//    5  every refusal fires: unpriced column, out of range, wrong class,
//       unknown unit, student from another class
//    6  the shipped dashboard page calls the route and no longer says it can't
//
//  Zero PII: synthetic names and throwaway PINs, never printed.
//  Run: npm run smoke:teachercyberscore
//  No em-dashes, per repo convention.
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-teacher-cyber-score.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
require('../scripts/seed-cyber-denominators').seedCyberDenominators();
const { TEACHER_ITEM } = require('../scoring');

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

const call = (m, p, body, tok) => fetch(base() + p, {
  method: m,
  headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
  body: body ? JSON.stringify(body) : undefined,
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

const UNIT = 'unit-1', LESSON = '1.4', EX = 'exercise-1', COURSE = 'ap-cybersecurity';
const SRC = fs.readFileSync(path.join(__dirname, '..', 'shopify/cyber-dashboard.html'), 'utf8');

const teacherRows = (sid) => db.prepare(
  'SELECT COUNT(*) n FROM score_events WHERE student_id = ? AND item = ?').get(sid, TEACHER_ITEM).n;

async function setup(email, mode) {
  const tok = (await call('POST', '/api/teacher/register',
    { email, password: 'a-long-enough-password', name: 'Typed Score' })).body.token;
  const cls = (await call('POST', '/api/teacher/classes',
    { class_name: 'Cyber ' + mode, course: COURSE, retry_mode: mode }, tok)).body.class;
  const stu = (await call('POST', '/api/student/join',
    { class_code: cls.class_code, display_name: 'Avery ' + mode, pin: mode === 'all' ? '1234' : '5678' })).body;
  return { tok, cls, stuTok: stu.token };
}

(async () => {
  const A = await setup('typed-all@example.org', 'all');
  const put = (who, body) => call('PUT', `/api/teacher/classes/${who.cls.class_code}/cells`, body, who.tok);
  const studentScore = (who, earned, extra) => call('POST', '/api/student/score',
    Object.assign({ course: COURSE, unit: UNIT, lesson: LESSON, activity_type: EX,
      item: 'score', earned, possible: 24 }, extra || {}), who.stuTok);

  const cell = async (who) => {
    const p = await call('GET', `/api/teacher/classes/${who.cls.class_code}/progress`, null, who.tok);
    const rec = (p.body.summary || [])[0];
    const d = rec && rec.detail && rec.detail[UNIT] && rec.detail[UNIT][LESSON] && rec.detail[UNIT][LESSON][EX];
    return { d: d || null, sid: rec && rec.student && rec.student.id };
  };
  const cellBody = (sid, score) => ({ student_id: sid, unit: UNIT, lesson: LESSON, activity_type: EX, score });

  // -- 1 and 2: the typed score wins, and the views agree -------------------
  await studentScore(A, 22);
  const sid = (await cell(A)).sid;
  {
    const r = await put(A, cellBody(sid, 24));
    ok('a teacher can type 24 into the 1.4 Exercise 1 cell', r.status === 200 && r.body.ok, r.body);
    ok('  and the route reports it out of the authored 24', r.body.entered && r.body.entered.max_score === 24, r.body);
    const { d } = await cell(A);
    ok('the dashboard reads 24 of 24 after a reload', d && d.points_earned === 24 && d.points_possible === 24,
      d && [d.points_earned, d.points_possible]);
    ok('  and 100 percent', d && d.score === 100, d && d.score);
    ok('  and marks it as typed, so the popover can offer Clear', d && d.teacher_entered === true, d);

    const pr = db.prepare('SELECT score FROM progress WHERE student_id = ? AND lesson = ? AND activity_type = ?')
      .get(sid, LESSON, EX);
    ok('progress.score, which the student view reads, is 100 too', pr && pr.score === 100, pr);

    const gb = await call('GET', `/api/teacher/classes/${A.cls.class_code}/gradebook`, null, A.tok);
    const s = JSON.stringify(gb.body);
    ok('the canonical gradebook answers', gb.status === 200, gb.status);
    ok('  and carries the typed 24 of 24 for this cell',
      /"earned":24,"possible":24/.test(s.replace(/\s/g, '')), s.slice(0, 300));
  }
  {
    await studentScore(A, 23);
    const { d } = await cell(A);
    ok('a later, better-looking student run does not displace the typed score',
      d && d.points_earned === 24 && d.teacher_entered, d && d.points_earned);
  }

  // -- 3: a student cannot write the reserved row ---------------------------
  {
    const r = await studentScore(A, 24, { item: TEACHER_ITEM });
    ok('a student posting the reserved item name is refused', r.status === 400, [r.status, r.body]);
    ok('  and there is still exactly one typed row', teacherRows(sid) === 1, teacherRows(sid));
  }

  // -- 4: replace, clear, reset --------------------------------------------
  {
    const r = await put(A, cellBody(sid, 18));
    ok('re-entry is accepted', r.status === 200, r.body);
    ok('  and it REPLACES: one typed row, not two', teacherRows(sid) === 1, teacherRows(sid));
    const { d } = await cell(A);
    ok('a typed score LOWER than the student best still wins (18, not 23)', d && d.points_earned === 18, d && d.points_earned);
  }
  {
    const r = await put(A, cellBody(sid, null));
    ok('clearing is accepted and says it removed one row', r.status === 200 && r.body.cleared === 1, r.body);
    ok('  and leaves no typed row behind', teacherRows(sid) === 0);
    const { d } = await cell(A);
    ok('the student best (23) counts again under a best-attempt class', d && d.points_earned === 23, d && d.points_earned);
    ok('  and the cell is no longer marked typed', d && d.teacher_entered === false, d);
  }
  {
    await put(A, cellBody(sid, 24));
    const before = await cell(A);
    const r = await call('PATCH',
      `/api/teacher/classes/${A.cls.class_code}/progress/${before.d.progress_id}/unlock`, { reset: true }, A.tok);
    ok('Reset on a typed cell is accepted', r.status === 200, r.body);
    ok('  and removes the typed row', teacherRows(sid) === 0, teacherRows(sid));
    await studentScore(A, 20);
    const { d } = await cell(A);
    ok('so the student re-sits and their new run is what shows, not the old typed 24',
      d && d.score !== 100 && d.teacher_entered === false, d && [d.score, d.points_earned]);
  }

  // -- 1 again, under a first-attempt class ---------------------------------
  {
    const N = await setup('typed-none@example.org', 'none');
    await studentScore(N, 22);
    await studentScore(N, 10);
    const nsid = (await cell(N)).sid;
    let { d } = await cell(N);
    ok('first-attempt class: the grade is the first run before any typing', d && d.points_earned === 22, d && d.points_earned);
    await call('PUT', `/api/teacher/classes/${N.cls.class_code}/cells`, cellBody(nsid, 24), N.tok);
    ({ d } = await cell(N));
    ok('first-attempt class: the typed score wins over the first run too', d && d.points_earned === 24, d && d.points_earned);

    // -- 5: refusals, each on its own -------------------------------------
    const bad = async (label, who, body, re) => {
      const r = await call('PUT', `/api/teacher/classes/${who.cls.class_code}/cells`, body, who.tok);
      ok(label, r.status >= 400 && r.status < 500 && re.test((r.body || {}).error || ''), [r.status, r.body]);
    };
    await bad('a score above the column total is refused', N, cellBody(nsid, 25), /from 0 to 24/);
    await bad('a negative score is refused', N, cellBody(nsid, -1), /from 0 to 24/);
    await bad('a missing score is refused rather than read as a clear', N,
      { student_id: nsid, unit: UNIT, lesson: LESSON, activity_type: EX }, /from 0 to 24/);
    await bad('an unpriced column is refused', N,
      { student_id: nsid, unit: UNIT, lesson: LESSON, activity_type: 'no-such-activity', score: 1 }, /no points assigned/);
    await bad('an unknown unit is refused', N, Object.assign(cellBody(nsid, 1), { unit: 'unit-9' }), /Unknown unit/);
    await bad('a student from ANOTHER class is refused', N, cellBody(sid, 1), /not in this class/);
    const other = await call('PUT', `/api/teacher/classes/${N.cls.class_code}/cells`, cellBody(nsid, 1), A.tok);
    ok('another teacher cannot write into this class', other.status === 404, [other.status, other.body]);
    ({ d } = await cell(N));
    ok('  and none of the refusals moved the typed 24', d && d.points_earned === 24, d && d.points_earned);
  }

  // -- 6: the shipped page ---------------------------------------------------
  ok('the dashboard calls PUT .../cells', /_api\('PUT','\/api\/teacher\/classes\/'\+this\.classCode\+'\/cells'/.test(SRC));
  ok('  with the column keys the payload is indexed by', /lesson:c\.dl,activity_type:c\.da/.test(SRC));
  ok('Save and Clear both route through it', /applySet\(\)\{[\s\S]{0,400}_setCell\(v,/.test(SRC)
    && /clearSet\(\)\{[\s\S]{0,300}_setCell\(null,/.test(SRC));
  ok('both re-read the server afterwards', /_setCell[\s\S]{0,500}loadProgress\(this\._token\(\)\)/.test(SRC));
  ok('Clear is confirmed first', /clearSet\(\)\{[\s\S]{0,200}confirm\(/.test(SRC));
  ok('the page no longer says typing a score is unavailable',
    !/Typing a score in by hand is not available/.test(SRC));
  ok('cellData carries the typed flag', /teacher:!!d\.teacher_entered/.test(SRC));

  console.log(`  teacher-cyber-score: ${pass} passed, ${fail.length} failed`);
  fail.forEach((f) => console.log(`    FAIL  ${f}`));
  server.close();
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail.length ? 1 : 0);
})().catch((e) => { console.error('threw:', e); server.close(); process.exit(1); });
