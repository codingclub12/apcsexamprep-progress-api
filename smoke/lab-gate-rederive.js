'use strict';
// -----------------------------------------------------------------------------
//  REDERIVE: a second opinion about who may open a lab
//
//  WHY A REDERIVE AND NOT A LIVE CHECK. The behaviour that changed on 2026-09-09
//  is what a TEACHER's token gets, and observing that against production needs a
//  teacher credential. This repo's rule is that a session never asks for one and
//  never puts one in a transcript, so there is no live observation available for
//  the row that actually moved. Saying so is better than dressing up an
//  assertion about the anonymous row, which did not change and would have passed
//  yesterday.
//
//  So the third kind of check is a rederive: a SEPARATE decision table, written
//  from the rules rather than from routes/labs.js, run against the real route
//  over every caller shape that exists. If the two disagree anywhere, one of
//  them is wrong and the diff says which case.
//
//  THE TABLE IS WRITTEN FROM THE RULES, in one place, in this order:
//
//    1. a spec with no unit or lesson cannot be located, so it is open
//    2. a valid TEACHER token is a real identity previewing their own material,
//       and the cross-class refusal does not apply to it
//    3. a STUDENT resolves against their own class only, narrowest scope wins
//    4. anyone else is refused if ANY class has closed this lab
//
//  It shares NO code with the route beyond the gate rows themselves, which are
//  the raw artifact both sides read. In particular it does not call
//  resolveAliasGate or lockedForAnyClass: importing the thing under test and
//  calling the comparison a rederive is how two implementations come to agree
//  because they are one implementation.
//
//  Run: npm run smoke:labgaterederive
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-lab-gate-rederive.db');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-lab-gate-rederive-secret';
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { signTeacherToken, signStudentToken } = require('../utils');
const labs = require('../lib/lab-spec');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

const SPEC = labs.all().find((s) => s.course === 'ap-cybersecurity' && s.unit && s.lesson_id);
if (!SPEC) { console.error('no locatable cyber lab spec'); process.exit(1); }
const COURSE = SPEC.course, UNIT = SPEC.unit, LESSON = SPEC.lesson_id;
const ALIASES = labs.aliases(SPEC);

// ── the second implementation ────────────────────────────────────────────────
//  Returns true for OPEN. Reads activity_gates directly.
//
//  Scope width, narrow to wide, so a tie is decided the same way a teacher means
//  it: naming this lesson AND this activity is the most specific thing you can
//  say, and a row saying nothing about either covers the whole unit.
function widthOf(row) {
  const namesLesson = row.lesson !== '*';
  const namesActivity = row.activity_type !== '*';
  if (namesLesson && namesActivity) return 0;
  if (namesLesson) return 1;
  if (namesActivity) return 2;
  return 3;
}

function coversMe(row) {
  if (row.lesson !== '*' && row.lesson !== LESSON) return false;
  if (row.activity_type !== '*' && !ALIASES.includes(row.activity_type)) return false;
  return true;
}

function rederiveOpen(caller) {
  if (!SPEC.unit || !SPEC.lesson_id) return true;                 // rule 1
  if (caller.role === 'teacher') return true;                     // rule 2

  if (caller.role === 'student') {                                // rule 3
    const cls = db.prepare('SELECT id, course, quiz_lock_default FROM classes WHERE id = ?')
      .get(caller.class_id);
    if (!cls || cls.course !== COURSE) return true;
    const mine = db.prepare(
      'SELECT lesson, activity_type, open FROM activity_gates WHERE class_id = ? AND course = ? AND unit = ?'
    ).all(cls.id, COURSE, UNIT).filter(coversMe).sort((a, b) => widthOf(a) - widthOf(b));
    if (!mine.length) return !cls.quiz_lock_default;
    //  Ties at equal width: an explicit OPEN wins, which is what a teacher means
    //  by reopening one thing inside a close they also wrote.
    const best = widthOf(mine[0]);
    const tied = mine.filter((r) => widthOf(r) === best);
    return tied.some((r) => r.open === 1);
  }

  //  rule 4. RESOLVE EACH CLASS FIRST, then ask whether any of them lands on
  //  closed. The naive reading, "does any row anywhere say 0", was what the first
  //  draft of this function did and the comparison caught it: a class that closes
  //  a whole unit and then reopens THIS lesson has, on balance, opened it, and
  //  counting its wide closing row refuses a lab nobody has closed. The route
  //  was right and this side was wrong, which is the outcome a rederive is for.
  const byClass = new Map();
  for (const r of db.prepare(
    'SELECT class_id, lesson, activity_type, open FROM activity_gates WHERE course = ? AND unit = ?'
  ).all(COURSE, UNIT)) {
    if (!coversMe(r)) continue;
    if (!byClass.has(r.class_id)) byClass.set(r.class_id, []);
    byClass.get(r.class_id).push(r);
  }
  for (const rows of byClass.values()) {
    const sorted = rows.slice().sort((a, b) => widthOf(a) - widthOf(b));
    const best = widthOf(sorted[0]);
    const tied = sorted.filter((r) => widthOf(r) === best);
    //  Same tie rule as rule 3: an explicit open wins at equal width.
    if (!tied.some((r) => r.open === 1)) return false;
  }
  return true;
}

// ── fixtures: every caller shape, against several gate arrangements ──────────
const app = express();
app.use(express.json());
app.use(require('../routes/labs'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

const getLab = (auth) => fetch(
  `${base()}/api/labs/${COURSE}/${encodeURIComponent(SPEC.item_id)}`,
  { headers: auth ? { Authorization: 'Bearer ' + auth } : {} },
).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t2','O','o@s.org','x')`);
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,retry_mode,quiz_lock_default)
     VALUES ('cA','t1','CYBER-AAAA','A',?,1,80,1,'all',0)`, COURSE);
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,retry_mode,quiz_lock_default)
     VALUES ('cB','t2','CYBER-BBBB','B',?,1,80,1,'all',0)`, COURSE);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('sA','cA','A','x')`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('sB','cB','B','x')`);

const CALLERS = [
  { name: 'teacher t1', role: 'teacher', token: () => signTeacherToken({ id: 't1', email: 't@s.org' }) },
  { name: 'student of cA', role: 'student', class_id: 'cA', token: () => signStudentToken({ id: 'sA', class_id: 'cA' }) },
  { name: 'student of cB', role: 'student', class_id: 'cB', token: () => signStudentToken({ id: 'sB', class_id: 'cB' }) },
  { name: 'no token', role: 'none', token: () => null },
  { name: 'forged teacher', role: 'none', token: () => jwt.sign({ id: 't1', role: 'teacher' }, 'wrong', { expiresIn: '1h' }) },
];

//  Gate arrangements, chosen so every branch of both implementations is exercised
//  and so at least one arrangement DISAGREES between classes. An all-open or
//  all-closed table would let two wrong implementations agree.
const ARRANGEMENTS = [
  { label: 'nothing closed anywhere', rows: [] },
  { label: 'cB closed it at activity scope', rows: [['cB', LESSON, ALIASES[0], 0]] },
  { label: 'cB closed the whole unit', rows: [['cB', '*', '*', 0]] },
  { label: 'cA closed the unit but reopened this lesson', rows: [['cA', '*', '*', 0], ['cA', LESSON, '*', 1]] },
  { label: 'cA closed this activity, cB opened it', rows: [['cA', LESSON, ALIASES[0], 0], ['cB', LESSON, ALIASES[0], 1]] },
  { label: 'cA closed it under the OTHER alias', rows: [['cA', LESSON, ALIASES[1], 0]] },
  { label: 'both classes closed the whole unit', rows: [['cA', '*', '*', 0], ['cB', '*', '*', 0]] },
];

(async () => {
  console.log(`\nLab ${COURSE}/${SPEC.item_id} at ${UNIT}/${LESSON}, aliases ${JSON.stringify(ALIASES)}\n`);

  let compared = 0, disagreed = 0;
  let sawOpen = 0, sawLocked = 0;

  for (const arr of ARRANGEMENTS) {
    db.prepare('DELETE FROM activity_gates').run();
    for (const [cls, lesson, activity, open] of arr.rows) {
      run(`INSERT INTO activity_gates (class_id,course,unit,lesson,activity_type,open,updated_at)
           VALUES (?,?,?,?,?,?,datetime('now'))`, cls, COURSE, UNIT, lesson, activity, open);
    }
    console.log(`  ${arr.label}`);
    for (const c of CALLERS) {
      const res = await getLab(c.token());
      const routeOpen = !(res.body && res.body.locked === true);
      const mineOpen = rederiveOpen(c);
      compared++;
      routeOpen ? sawOpen++ : sawLocked++;
      if (routeOpen !== mineOpen) {
        disagreed++;
        console.log(`      DISAGREE  ${c.name}: route=${routeOpen ? 'open' : 'locked'} rederive=${mineOpen ? 'open' : 'locked'}`);
      } else {
        console.log(`      agree     ${c.name.padEnd(16)} ${routeOpen ? 'open' : 'locked'}`);
      }
    }
  }

  console.log('');
  ok(`two independent implementations agree on all ${compared} cases`, disagreed === 0, { disagreed });

  //  A comparison where every answer is the same is not a comparison. If the
  //  matrix never produced a lock, or never produced an open, the agreement is
  //  vacuous and this suite is decoration.
  ok('the matrix produced BOTH answers, so the agreement is not vacuous',
    sawOpen > 0 && sawLocked > 0, { open: sawOpen, locked: sawLocked });
  ok('and enough cases to cover every caller shape in every arrangement',
    compared === CALLERS.length * ARRANGEMENTS.length, compared);

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  process.exit(fail ? 1 : 0);
})();
