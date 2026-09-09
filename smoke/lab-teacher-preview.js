'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: a teacher previewing a lab is not anonymous
//
//  WHAT WENT WRONG, and it reached a real teacher. `labStudent()` requires
//  role === 'student', so a signed-in TEACHER resolved to null and fell into the
//  cross-class anonymous branch, which refuses whenever ANY class anywhere has
//  closed that lab. She opened a lab for her own class, clicked preview, and was
//  told to sign in with a class code she does not have, over a lock some other
//  teacher had set. Reported 2026-09-09 as "lab open but isn't open".
//
//  The player's wording had been corrected earlier that same day off the same
//  email, which made the refusal honest and left it wrong.
//
//  FOUR CALLERS, and every one of them has to keep its own answer. The risk in
//  this fix is not that teachers stay locked out; it is that widening the door
//  for teachers reopens the hole the anonymous rule was built to close on
//  2026-09-07, which was a STUDENT signing out to walk past their teacher's lock.
//
//    teacher, valid token         OPEN   even though a class has closed it
//    student of a class that
//      closed it                  LOCKED unchanged, audience 'class'
//    student of a class that
//      opened it                  OPEN   unchanged
//    no token at all              LOCKED unchanged, audience 'anonymous'
//
//  The third row is the one that makes the suite non-vacuous. A mutation that
//  simply returns open for everybody satisfies rows 1 and 3 and has to fail on
//  rows 2 and 4, so those are asserted with their reason strings rather than
//  only their booleans.
//
//  A FORGED OR EXPIRED teacher token must NOT get the open answer, or the check
//  is "did you send a header" rather than "are you a teacher". Asserted with a
//  token signed by a different secret and with a student token relabelled by
//  claim, because those are the two shapes an attacker actually has.
//
//  Run: npm run smoke:labteacherpreview
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-lab-teacher-preview.db');
//  Pinned BEFORE utils loads, so this suite controls both sides of the signature
//  and can mint a valid, a forged and an expired token deterministically. Left
//  unset, utils falls back to a dev default and prints a warning that reads like
//  a failure in CI.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-lab-teacher-preview-secret';
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

//  A REAL lab spec, not a fixture, so the suite cannot pass against a lab shape
//  that no longer exists. Whichever cyber lab is first is fine; what matters is
//  that it has a unit and a lesson, because a spec without them resolves open
//  for a different reason entirely and would make every assertion vacuous.
const SPEC = labs.all().find((s) => s.course === 'ap-cybersecurity' && s.unit && s.lesson_id);
if (!SPEC) { console.error('no locatable cyber lab spec; this suite would be vacuous'); process.exit(1); }
const COURSE = SPEC.course, UNIT = SPEC.unit, LESSON = SPEC.lesson_id;

const app = express();
app.use(express.json());
app.use(require('../routes/labs'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

const getLab = (auth) => fetch(
  `${base()}/api/labs/${COURSE}/${encodeURIComponent(SPEC.item_id)}`,
  { headers: auth ? { Authorization: 'Bearer ' + auth } : {} },
).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

// ── fixtures ─────────────────────────────────────────────────────────────────
run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t2','O','o@s.org','x')`);
//  TWO classes on purpose. c_closed is somebody else's class that has closed the
//  lab; c_open is the teacher's own, which has it open. That is the exact shape
//  of the report: her class is open and another one is not.
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,retry_mode,quiz_lock_default)
     VALUES ('c_closed','t2','CYBER-SHUT','Other',?,1,80,1,'all',0)`, COURSE);
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,retry_mode,quiz_lock_default)
     VALUES ('c_open','t1','CYBER-OPEN','Mine',?,1,80,1,'all',0)`, COURSE);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s_shut','c_closed','A','x')`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s_open','c_open','B','x')`);

//  The other class closes the lab. Activity scope, under the name the spec's own
//  aliases carry, so the gate is genuinely found rather than missed for an
//  unrelated reason.
//  A MANIFEST ROW, because as of 2026-09-09 a lab without one is not gated at
//  all. An ungraded lab deliberately gets no row and therefore no chip, so
//  routes/labs.js stops gating it: a lock nobody can open is not a lock. In
//  production this lab is graded and has its row, so seeding it here is what
//  makes the fixture match production rather than a special case for the suite.
//  Without it every locked assertion below passes for the wrong reason.
run(`INSERT INTO course_manifest (course,unit,lesson_id,item_id,item_type,points)
     VALUES (?,?,?,?,?,?)`, COURSE, UNIT, LESSON, SPEC.item_id, SPEC.item_type, SPEC.points);

const ALIAS = labs.aliases(SPEC)[0];
run(`INSERT INTO activity_gates (class_id,course,unit,lesson,activity_type,open,updated_at)
     VALUES ('c_closed',?,?,?,?,0,datetime('now'))`, COURSE, UNIT, LESSON, ALIAS);

const tTeacher = signTeacherToken({ id: 't1', email: 't@s.org' });
const sShut = signStudentToken({ id: 's_shut', class_id: 'c_closed' });
const sOpen = signStudentToken({ id: 's_open', class_id: 'c_open' });

(async () => {
  console.log(`\nLab ${COURSE}/${SPEC.item_id} at ${UNIT}/${LESSON}, alias "${ALIAS}", closed by one other class\n`);

  console.log('-- 1. the four callers, each with its own answer --');

  const asTeacher = await getLab(tTeacher);
  ok('a signed-in TEACHER gets the lab, though another class has closed it',
    asTeacher.status === 200 && !asTeacher.body.locked && !!asTeacher.body.item_id,
    { locked: asTeacher.body && asTeacher.body.locked, reason: asTeacher.body && asTeacher.body.reason });

  const asShut = await getLab(sShut);
  ok('a student of the class that CLOSED it is still refused',
    asShut.status === 200 && asShut.body.locked === true,
    asShut.body);
  ok('  and the refusal is attributed to their class, not to anonymous',
    asShut.body && asShut.body.locked_for === 'class',
    asShut.body && asShut.body.locked_for);

  const asOpen = await getLab(sOpen);
  ok('a student of a class that has NOT closed it still gets the lab',
    asOpen.status === 200 && !asOpen.body.locked && !!asOpen.body.item_id,
    { locked: asOpen.body && asOpen.body.locked });

  const asNobody = await getLab(null);
  ok('a caller with NO token is still refused while a class has it closed',
    asNobody.status === 200 && asNobody.body.locked === true,
    asNobody.body);
  ok('  and that refusal still names anonymous, so the player can word it right',
    asNobody.body && asNobody.body.locked_for === 'anonymous',
    asNobody.body && asNobody.body.locked_for);

  console.log('\n-- 2. it is the ROLE that opens the door, not the header --');

  //  Signed with a different secret. This is the forgery an outsider can attempt.
  const forged = jwt.sign({ id: 't1', role: 'teacher' }, 'not-the-real-secret', { expiresIn: '1h' });
  const asForged = await getLab(forged);
  ok('a teacher token signed with the WRONG secret gets the anonymous answer',
    asForged.body && asForged.body.locked === true && asForged.body.locked_for === 'anonymous',
    asForged.body);

  //  A real student token is not upgraded by claiming to be a teacher, because
  //  the claim is inside the signature. This is the forgery a STUDENT can attempt,
  //  and it is the one the 2026-09-07 rule exists to stop.
  const relabelled = jwt.sign({ id: 's_shut', role: 'teacher' }, 'not-the-real-secret', { expiresIn: '1h' });
  const asRelabelled = await getLab(relabelled);
  ok('a student cannot relabel themselves a teacher to walk past their own lock',
    asRelabelled.body && asRelabelled.body.locked === true,
    asRelabelled.body);

  //  A VALID STUDENT TOKEN WHOSE STUDENT ROW IS GONE. This is the only caller
  //  that reaches the teacher branch holding a correctly signed non-teacher
  //  token, and without it the role check is untestable: labStudent() handles
  //  every ordinary student above, so dropping `role === 'teacher'` changes
  //  nothing for them and the mutation survives green.
  //
  //  It is also a real caller. A student who is deactivated, or whose row is
  //  removed, keeps a signed token for 180 days. They must land on the anonymous
  //  answer, not on the teacher one.
  run(`DELETE FROM students WHERE id = 's_shut'`);
  const ghost = await getLab(sShut);
  ok('a valid STUDENT token whose row no longer exists gets the anonymous answer',
    ghost.body && ghost.body.locked === true && ghost.body.locked_for === 'anonymous',
    ghost.body);
  run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s_shut','c_closed','A','x')`);

  //  An expired teacher token is not a teacher. signTeacherToken has no expiry
  //  argument, so it is minted here against the same pinned secret.
  const expired = jwt.sign(
    { id: 't1', email: 't@s.org', role: 'teacher' },
    process.env.JWT_SECRET,
    { expiresIn: '-1s' },
  );
  const asExpired = await getLab(expired);
  ok('an EXPIRED teacher token gets the anonymous answer',
    asExpired.body && asExpired.body.locked === true,
    asExpired.body);

  console.log('\n-- 3. the suite is not vacuous --');

  //  If nothing were closed anywhere, every assertion above would pass for the
  //  wrong reason. Prove the fixture actually bites by asking the resolver.
  const closedRows = db.prepare(
    'SELECT COUNT(*) n FROM activity_gates WHERE open = 0 AND course = ? AND unit = ?'
  ).get(COURSE, UNIT).n;
  ok('a closing row genuinely exists for this location', closedRows === 1, closedRows);
  ok('and the anonymous caller was refused BECAUSE of it, by reason string',
    asNobody.body && /^anonymous-/.test(String(asNobody.body.reason || '')),
    asNobody.body && asNobody.body.reason);
  ok('while the teacher answer names preview, not self-study',
    asTeacher.body && asTeacher.body.item_id && !asTeacher.body.locked,
    asTeacher.body && asTeacher.body.reason);

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  process.exit(fail ? 1 : 0);
})();
