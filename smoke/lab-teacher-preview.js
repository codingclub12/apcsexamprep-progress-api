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
//  THE TRUTH TABLE SHRANK ON 2026-09-14, board 277. Tanner: "Labs should be open
//  as long as the specific teacher doesn't lock it." So the only caller a lock
//  now reaches is a signed-in student of the class that set it:
//
//    teacher, valid token         OPEN   even though a class has closed it
//    student of a class that
//      closed it                  LOCKED the only refusal left, audience 'class'
//    student of a class that
//      opened it                  OPEN
//    no token at all              OPEN   was LOCKED between 2026-09-07 and 277
//
//  Row 2 is the one that makes this suite non-vacuous. A mutation returning open
//  for everybody satisfies rows 1, 3 and 4 and has to fail on row 2, which is
//  asserted with its audience string rather than only its boolean.
//
//  WHAT MOVED, AND WHY IT IS NOT SIMPLY GONE. This suite used to prove that the
//  ROLE opened the door rather than the presence of a header, with a token signed
//  by a different secret, a student token relabelled by claim, a stale token and
//  an expired one. Board 277 makes every one of those callers OPEN, exactly like
//  a visitor with no token, so on this route those assertions can no longer fail
//  and keeping them would be a guard that reads as security and checks nothing.
//
//  The role still decides something real: the ANSWER KEY. smoke:labkey asserts
//  that no token, a garbage token, a student token, an unentitled teacher and a
//  tampered teacher token are each refused it. One forged case is kept below
//  against that route so this file cannot drift into believing role is free.
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

//  The ANSWER KEY route, which is where the caller's role still decides
//  something after board 277 opened the gate to everyone without a class.
const getKey = (auth) => fetch(
  `${base()}/api/labs/${COURSE}/${encodeURIComponent(SPEC.item_id)}/key`,
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
  ok('a caller with NO token gets it, because no teacher of theirs closed it',
    asNobody.status === 200 && !asNobody.body.locked,
    asNobody.body && asNobody.body.reason);

  console.log('\n-- 2. the role still decides the ANSWER KEY --');

  //  Board 277 opened the gate to everyone without a class, so a forged teacher
  //  token gets the lab exactly as a visitor with no token does. Asserting a
  //  refusal here would be asserting nothing. The key route is where the role is
  //  still load-bearing, so the forgery is pointed at that instead.
  const forged = jwt.sign({ id: 't1', role: 'teacher' }, 'not-the-real-secret', { expiresIn: '1h' });
  const asForged = await getLab(forged);
  ok('a token signed with the WRONG secret gets the lab, same as any passer-by',
    asForged.status === 200 && !asForged.body.locked, asForged.body && asForged.body.reason);
  const forgedKey = await getKey(forged);
  ok('and it is refused the ANSWER KEY, which is what the role protects',
    forgedKey.status === 403, forgedKey.status);

  //  A real student token is not upgraded by claiming to be a teacher, because
  //  the claim is inside the signature. Against the key, that still matters.
  const relabelled = jwt.sign({ id: 's_shut', role: 'teacher' }, 'not-the-real-secret', { expiresIn: '1h' });
  const relabelledKey = await getKey(relabelled);
  ok('a student relabelling themselves a teacher is refused the key',
    relabelledKey.status === 403, relabelledKey.status);

  //  An expired teacher token is not a teacher. signTeacherToken has no expiry
  //  argument, so it is minted here against the same pinned secret.
  const expired = jwt.sign(
    { id: 't1', email: 't@s.org', role: 'teacher' },
    process.env.JWT_SECRET,
    { expiresIn: '-1s' },
  );
  const expiredKey = await getKey(expired);
  ok('an EXPIRED teacher token is refused the key', expiredKey.status === 403, expiredKey.status);

  //  A VALID STUDENT TOKEN WHOSE ROW IS GONE. A deactivated student keeps a
  //  signed token for 180 days. On the gate they are now an ordinary passer-by,
  //  which is the deliberate outcome of 277; on the key they are still nobody.
  run(`DELETE FROM students WHERE id = 's_shut'`);
  const ghost = await getLab(sShut);
  ok('a student token whose row is gone gets the lab, like any passer-by',
    ghost.status === 200 && !ghost.body.locked, ghost.body && ghost.body.reason);
  const ghostKey = await getKey(sShut);
  ok('and is still refused the key', ghostKey.status === 403, ghostKey.status);
  run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s_shut','c_closed','A','x')`);

  console.log('\n-- 3. the suite is not vacuous --');

  //  If nothing were closed anywhere, every assertion above would pass for the
  //  wrong reason. Prove the fixture actually bites by asking the resolver.
  const closedRows = db.prepare(
    'SELECT COUNT(*) n FROM activity_gates WHERE open = 0 AND course = ? AND unit = ?'
  ).get(COURSE, UNIT).n;
  ok('a closing row genuinely exists for this location', closedRows === 1, closedRows);
  //  Row 2 is now the whole of the lock, so the vacuity check is that it bites.
  //  If it did not, every assertion in section 1 would pass for the wrong reason.
  ok('and the student of that class was refused BECAUSE of it',
    asShut.body && asShut.body.locked === true && asShut.body.locked_for === 'class',
    asShut.body && asShut.body.locked_for);
  ok('while everyone without a class in it got the lab',
    !asTeacher.body.locked && !asNobody.body.locked && !asOpen.body.locked,
    { teacher: asTeacher.body.locked, nobody: asNobody.body.locked, other: asOpen.body.locked });

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  process.exit(fail ? 1 : 0);
})();
