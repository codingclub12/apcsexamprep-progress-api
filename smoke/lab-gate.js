'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: a closed lab is actually closed
//
//  A teacher reported on 2026-09-07 that labs opened for their students while
//  the gradebook showed them shut, and they were right about both halves:
//
//    1. routes/labs.js served every spec to everyone and never consulted
//       activity_gates at all, so the gradebook switch wrote a row that nothing
//       on the delivery path ever read.
//    2. The gradebook then said the lock was UNENFORCEABLE, because
//       lock_enforceable only counted quiz_bank and a lab is not in quiz_bank.
//       So the one signal built to stop this exact lie was itself wrong here.
//
//  The second is the more interesting failure. Enforceability is "does the
//  SERVER hand this out", and quiz_bank was treated as the only way it can.
//  Labs are served from config/labs by a route of their own, so the server
//  always could have withheld them.
//
//  WHAT MUST STAY TRUE, and it is why the route is not simply put behind auth:
//  the header on routes/labs.js says a lab is public on purpose, so a teacher
//  can preview one and an anonymous visitor can try one. The token stays
//  OPTIONAL. Only a signed-in student whose own class closed the lab is
//  refused, which is the only case the teacher was asking about.
//
//  The known limit is asserted rather than left to be discovered: a student who
//  signs out still gets the lab, exactly as they still get a closed quiz. The
//  gate answers "is this open for my class", not "can anyone reach this".
//
//  Offline and secret-free: throwaway SQLite, the real router in process.
//  Zero PII. No em-dashes.
//
//  Run: npm run smoke:labgate
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-lab-gate.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signStudentToken, signTeacherToken } = require('../utils');
const labSpec = require('../lib/lab-spec');
const contract = require('../lib/gradebook-contract');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 260) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

const app = express();
app.use(express.json());
app.use(require('../routes/labs'));
app.use('/api/teacher', require('../routes/teacher'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
const call = (m, u, b, auth) => fetch(base() + u, {
  method: m, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) },
  ...(b ? { body: JSON.stringify(b) } : {}),
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

// ── a real authored lab, so this cannot pass against a fixture that drifted ──
const LAB = labSpec.all().find((s) => s.course === 'ap-cybersecurity' && s.unit && s.lesson_id);
if (!LAB) { console.log('no cyber lab authored; nothing to test'); process.exit(1); }
const ACT = LAB.item_type || 'terminal-lab';
const CODE = 'CYBER-LABG';

run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,quiz_lock_default)
     VALUES ('c1','t1',?,'Lab Gate','ap-cybersecurity',1,80,1,0)`, CODE);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s1','c1','A','x')`);
// A class on a DIFFERENT course, to prove the gate does not reach across them.
//  It is given a CLOSED row for this very lab. Without that row the assertion
//  below is hollow: a class with no rows at all resolves open either way, so
//  deleting the course check would change nothing and the mutation battery
//  reported exactly that.
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,quiz_lock_default) VALUES ('c2','t1','CSA-LABG','Other','ap-csa',1,0)`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s2','c2','B','x')`);
run(`INSERT INTO course_manifest (course,unit,lesson_id,item_id,item_type,points) VALUES (?,?,?,?,?,6)`,
  LAB.course, LAB.unit, LAB.lesson_id, LAB.item_id, ACT);

const TT = signTeacherToken({ id: 't1', email: 't@s.org' });
const ST = signStudentToken({ id: 's1', class_id: 'c1' });
const OTHER = signStudentToken({ id: 's2', class_id: 'c2' });
const URL = `/api/labs/${LAB.course}/${LAB.item_id}`;

//  A SECOND authored lab that nothing in this file ever closes. It is what keeps
//  the anonymous rule honest: without it, "anonymous is refused" could be a
//  blanket refusal of every lab to every signed-out visitor, which would take the
//  public practice layer offline and pass this suite. Picked from real authored
//  specs, and in a different LESSON so a unit-wide close in one section cannot
//  reach it by accident.
const OPEN_LAB = labSpec.all().find((s) => s.course === LAB.course && s.unit
  && s.lesson_id && s.item_id !== LAB.item_id && s.lesson_id !== LAB.lesson_id);

//  OPEN_LAB NEEDS ITS MANIFEST ROW TOO, and that is new on 2026-09-09.
//  routes/labs.js now short-circuits a lab with no gradebook column: no row means
//  no chip, and a lock nobody can open is not a lock. Without this row OPEN_LAB
//  resolves open before the anonymous rule is ever consulted, which silently
//  guts the one assertion this lab exists for. The mutation battery caught it:
//  "anonymous is refused EVERY lab" still went red, but on a different assertion,
//  so the rule it targets had stopped being tested.
run(`INSERT INTO course_manifest (course,unit,lesson_id,item_id,item_type,points) VALUES (?,?,?,?,?,?)`,
  OPEN_LAB.course, OPEN_LAB.unit, OPEN_LAB.lesson_id, OPEN_LAB.item_id,
  OPEN_LAB.item_type, OPEN_LAB.points);
if (!OPEN_LAB) { console.log('need a second cyber lab in another lesson; nothing to test'); process.exit(1); }
const OPEN_URL = `/api/labs/${OPEN_LAB.course}/${OPEN_LAB.item_id}`;
const setGate = (b) => call('POST', `/api/teacher/classes/${CODE}/gate`, { course: LAB.course, unit: LAB.unit, ...b }, TT);

(async () => {
  console.log(`\n  driving the authored lab ${LAB.course} ${LAB.unit} ${LAB.lesson_id} ${ACT}\n`);
  console.log('1. Before anything is closed');
  let r = await call('GET', URL, null, ST);
  ok('  a student in the class gets the lab', r.status === 200 && !r.body.locked && !!r.body.brief, r.body && Object.keys(r.body || {}).slice(0, 5));
  r = await call('GET', URL);
  ok('  an anonymous visitor gets it too', r.status === 200 && !r.body.locked);

  console.log('\n2. THE BUG: the teacher closes the lab');
  await setGate({ lesson: LAB.lesson_id, activity_type: ACT, open: false });
  r = await call('GET', URL, null, ST);
  ok('  the signed-in student is refused', r.body && r.body.locked === true, r.body);
  ok('  and the spec is NOT on the wire', r.body && r.body.lab === null && !r.body.brief && !r.body.steps, Object.keys(r.body || {}));
  ok('  it is a 200, so the player can say "not opened yet" rather than "missing"', r.status === 200, r.status);

  console.log('\n3. What must stay true: a lab nobody closed is still public');
  //  Anonymous is refused THIS lab, because a class has closed it. That is the
  //  2026-09-07 change: it used to be served, which made the lock one click wide.
  r = await call('GET', URL);
  ok('  an anonymous visitor is refused a lab some class has closed',
    r.status === 200 && r.body.locked === true, r.body && r.body.reason);
  ok('  and the spec is NOT on the wire for them either',
    r.body && r.body.lab === null && !r.body.brief, Object.keys(r.body || {}));
  //  The half that must not regress. Public practice pays for this feature, so a
  //  lab NO class has closed stays open and indexable to anyone.
  r = await call('GET', OPEN_URL);
  ok('  but a lab NO class has closed is still served anonymously',
    r.status === 200 && !r.body.locked, r.body && r.body.reason);
  //  c2 carries a CLOSED row for this exact lab, so if the course check went
  //  away this student would be refused a lab their own teacher never closed.
  run(`INSERT INTO activity_gates (class_id,course,unit,lesson,activity_type,open) VALUES ('c2',?,?,?,?,0)`,
    LAB.course, LAB.unit, LAB.lesson_id, ACT);
  r = await call('GET', URL, null, OTHER);
  ok('  a student in another course is unaffected', r.status === 200 && !r.body.locked, r.body && r.body.locked);
  r = await call('GET', URL, null, 'not-a-real-token');
  //  Still no 401: a junk token is treated as anonymous, not as an error. What
  //  changed is what anonymous GETS for a closed lab, not whether it is refused
  //  with a status code, so the page still renders "not opened" rather than
  //  "could not be loaded".
  ok('  a junk token degrades to anonymous rather than 401ing', r.status === 200, r.status);
  ok('  and lands on the anonymous rule, not on a class rule',
    r.body && r.body.locked === true && /^anonymous-/.test(r.body.reason || ''), r.body && r.body.reason);

  console.log('\n4. The scopes reach labs, not just the exact activity');
  run('DELETE FROM activity_gates WHERE class_id = ?', 'c1');
  await setGate({ open: false });                       // whole unit
  r = await call('GET', URL, null, ST);
  ok('  a UNIT-scope close reaches the lab', r.body && r.body.locked === true, r.body && r.body.reason);
  await setGate({ lesson: LAB.lesson_id, open: true }); // reopen just this lesson
  r = await call('GET', URL, null, ST);
  ok('  and reopening the lesson reopens it', r.body && !r.body.locked, r.body && r.body.reason);

  console.log('\n5. The gradebook stops calling a lab lock unenforceable');
  run('DELETE FROM activity_gates WHERE class_id = ?', 'c1');
  await setGate({ lesson: LAB.lesson_id, activity_type: ACT, open: false });
  const gb = contract.buildCanonicalGradebook('c1', { reveal: false });
  const item = gb.items.find((i) => i.unit === LAB.unit && i.lesson_ref === LAB.lesson_id && i.native_activity === ACT);
  ok('  the lab has a gradebook column', !!item, gb.items.map((i) => i.item_key).slice(0, 6));
  ok('  it reports locked', item && item.locked === true, item && item.lock_scope);
  ok('  and it reports the lock as ENFORCEABLE, which is the half that was lying',
    item && item.lock_enforceable === true, item && item.lock_enforceable);
  ok('  so it is not named as an unenforceable lock',
    !gb.gates.locked_but_unenforceable.includes(item && item.item_key), gb.gates.locked_but_unenforceable);

  console.log('\n6. THE NAME A TEACHER CLICKS: the Lab column, not terminal-lab');
  //  The gradebook column a teacher sees for a lesson is the course config's
  //  'lab'. The spec declares 'terminal-lab'. Closing the column a teacher
  //  actually has must close the lab, or the control is decorative.
  run('DELETE FROM activity_gates WHERE class_id = ?', 'c1');
  await setGate({ lesson: LAB.lesson_id, activity_type: 'lab', open: false });
  r = await call('GET', URL, null, ST);
  ok('  closing the "lab" column closes a terminal-lab spec', r.body && r.body.locked === true, r.body);
  //  And the reverse still works, so the spec's own name is not lost.
  run('DELETE FROM activity_gates WHERE class_id = ?', 'c1');
  await setGate({ lesson: LAB.lesson_id, activity_type: ACT, open: false });
  r = await call('GET', URL, null, ST);
  ok('  closing the spec\'s own activity type still closes it', r.body && r.body.locked === true, r.body);
  //  An explicit open on either name beats a unit-wide close, because that is
  //  what a teacher means by reopening one thing inside a closed unit.
  //  Every row, not just c1's. Section 3 deliberately left a CLOSED row on c2 to
  //  keep its cross-course assertion from being hollow, and that row is a real
  //  close on this lab, so the anonymous check below would fire on it and prove
  //  nothing about the two rows this section is actually about.
  run('DELETE FROM activity_gates');
  await setGate({ open: false });                                   // whole unit shut
  await setGate({ lesson: LAB.lesson_id, activity_type: 'lab', open: true });
  r = await call('GET', URL, null, ST);
  ok('  reopening the Lab column inside a closed unit reopens the lab',
    r.body && !r.body.locked, r.body && r.body.reason);
  //  The SAME setup, asked anonymously. c1 holds a closing UNIT row and an
  //  opening LESSON row at once, so for c1 this lab is OPEN and therefore no
  //  class has closed it. The anonymous rule has to RESOLVE those two rows the
  //  way the per-class path does; if it scans for any open=0 row instead, it
  //  withholds from the public a lab nobody actually closed. That is the whole
  //  reason lockedForAnyClass groups by class rather than filtering.
  r = await call('GET', URL);
  ok('  and anonymous resolves those two rows too, rather than seeing one close',
    r.status === 200 && !r.body.locked, r.body && r.body.reason);

  console.log('\n7. THE BYPASS, closed 2026-09-07');
  //  This section asserted the OPPOSITE until today, as a known limit: the gate
  //  answered "open for my class" and a signed-out student walked past it. The
  //  teacher who reported the original lab bug found this by checking her own
  //  fix in incognito, which is the test I should have run first.
  //
  //  The rule is deliberately narrow. Signing out no longer opens a lab that a
  //  class has closed; it still opens every lab nobody has closed, which is what
  //  keeps the public practice layer public.
  //  Section 6 ends with this lab REOPENED, so close it again here rather than
  //  inheriting a state from above. A section whose premise is set somewhere
  //  else is one edit away from asserting nothing.
  run('DELETE FROM activity_gates');
  await setGate({ lesson: LAB.lesson_id, activity_type: ACT, open: false });
  r = await call('GET', URL);
  ok('  signing out no longer opens a closed lab',
    r.status === 200 && r.body.locked === true, r.body && r.body.reason);
  ok('  and the refusal names the anonymous rule, so an operator can tell which fired',
    r.body && /^anonymous-/.test(r.body.reason || ''), r.body && r.body.reason);
  r = await call('GET', OPEN_URL);
  ok('  a lab nobody closed is still open signed out',
    r.status === 200 && !r.body.locked, r.body && r.body.reason);

  console.log('\n8. THE BOARD AND THE STUDENT CANNOT DISAGREE ABOUT ONE LAB');
  //  Reported 2026-09-09 by the same teacher: labs reading "your teacher has not
  //  opened this lab yet" on a class that had locked nothing.
  //
  //  A cyber lesson carries TWO lab columns. utils.js lists 'lab' in every unit's
  //  activities, and the manifest row for a terminal lab says 'terminal-lab',
  //  which is a deliberate split so the lab denominator stops overwriting the
  //  widget's. The student path has resolved both names since 2026-09-07. The
  //  gradebook resolved ONE, so a row written on either name locked the student
  //  out while the other column drew open, and a teacher looking at the open one
  //  is exactly right to say they locked nothing.
  const bothCols = () => {
    const gb = contract.buildCanonicalGradebook('c1', { reveal: false });
    const at = (act) => gb.items.find((i) => i.unit === LAB.unit
      && i.lesson_ref === LAB.lesson_id && i.native_activity === act);
    return { gb, lab: at('lab'), spec: at(ACT) };
  };
  run('DELETE FROM activity_gates');
  let cols = bothCols();
  ok('  the lesson really does carry both columns, which is why this matters',
    !!cols.lab && !!cols.spec, [!!cols.lab, !!cols.spec]);
  ok('  and they no longer render the same label, so a teacher can name the one they mean',
    cols.lab && cols.spec && cols.lab.label !== cols.spec.label,
    cols.lab && cols.spec && [cols.lab.label, cols.spec.label]);

  //  Close the SPEC's name. The student is refused; the teacher's Lab column has
  //  to say so too.
  await setGate({ lesson: LAB.lesson_id, activity_type: ACT, open: false });
  r = await call('GET', URL, null, ST);
  cols = bothCols();
  ok('  closing terminal-lab refuses the student', r.body && r.body.locked === true, r.body && r.body.reason);
  ok('  and the Lab column the teacher reads reports locked, not open',
    cols.lab && cols.lab.locked === true, cols.lab && [cols.lab.locked, cols.lab.lock_reason]);

  //  Close the column a teacher actually clicks. The spec column has to agree.
  run('DELETE FROM activity_gates');
  await setGate({ lesson: LAB.lesson_id, activity_type: 'lab', open: false });
  r = await call('GET', URL, null, ST);
  cols = bothCols();
  ok('  closing the Lab column refuses the student', r.body && r.body.locked === true, r.body && r.body.reason);
  ok('  and the terminal-lab column reports locked too',
    cols.spec && cols.spec.locked === true, cols.spec && [cols.spec.locked, cols.spec.lock_reason]);

  //  Enforceability, on BOTH names. The tooltip behind a false reading here says
  //  "this activity keeps its questions in the page, so students can still reach
  //  them", which invites a teacher to treat the padlock as decoration.
  ok('  the Lab column reports the lock as enforceable',
    cols.lab && cols.lab.lock_enforceable === true, cols.lab && cols.lab.lock_enforceable);
  ok('  and neither column is listed as an unenforceable lock',
    cols.gb.gates.locked_but_unenforceable.length === 0, cols.gb.gates.locked_but_unenforceable);

  //  TWO ROWS AT THE SAME SCOPE, one closing and one opening, is a tie, and the
  //  tie goes to the CLOSING row on every path (lib/activity-gate.js). So a
  //  teacher who closes the Lab column and then opens the Terminal Lab column
  //  is still closed, which is correct and is also the moment the old board was
  //  at its worst: it drew one padlock shut and one open and neither told them
  //  which one the student was hitting. Both columns must now say closed.
  await setGate({ lesson: LAB.lesson_id, activity_type: ACT, open: true });
  r = await call('GET', URL, null, ST);
  cols = bothCols();
  ok('  opening the other name does not defeat the close, per the tie rule',
    r.body && r.body.locked === true, r.body && r.body.reason);
  ok('  and BOTH columns show closed, so the board matches what the student gets',
    cols.lab && cols.spec && cols.lab.locked === true && cols.spec.locked === true,
    cols.lab && cols.spec && [cols.lab.locked, cols.spec.locked]);

  //  The way out. Clearing the row that closed it reopens the lab, and both
  //  columns follow, so a teacher can always undo their own lock.
  await call('DELETE', `/api/teacher/classes/${CODE}/gate`,
    { course: LAB.course, unit: LAB.unit, lesson: LAB.lesson_id, activity_type: 'lab' }, TT);
  r = await call('GET', URL, null, ST);
  cols = bothCols();
  ok('  clearing the closing row reopens the lab for the student',
    r.body && !r.body.locked, r.body && r.body.reason);
  ok('  and both columns read open again',
    cols.lab && cols.spec && cols.lab.locked === false && cols.spec.locked === false,
    cols.lab && cols.spec && [cols.lab.locked, cols.spec.locked]);

  //  The half that must not move: a lesson with no lab spec has no alias group,
  //  so its columns resolve under their own name exactly as they always did.
  run('DELETE FROM activity_gates');
  await setGate({ lesson: LAB.lesson_id, activity_type: 'quiz', open: false });
  const gbq = contract.buildCanonicalGradebook('c1', { reveal: false });
  const quizCol = gbq.items.find((i) => i.unit === LAB.unit && i.lesson_ref === LAB.lesson_id && i.native_activity === 'quiz');
  const labCol = gbq.items.find((i) => i.unit === LAB.unit && i.lesson_ref === LAB.lesson_id && i.native_activity === 'lab');
  ok('  a quiz close still locks only the quiz',
    quizCol && quizCol.locked === true && labCol && labCol.locked === false,
    [quizCol && quizCol.locked, labCol && labCol.locked]);

  console.log('\n9. THE REFUSAL SAYS WHOSE LOCK IT IS');
  //  Two refusals, two audiences. The anonymous one fires when ANY class has
  //  closed the lab, so telling that visitor "your teacher has not opened this"
  //  names a teacher who did nothing, and blames the wrong person when the
  //  visitor is a student of an OPEN class who happens to be signed out. That is
  //  how a support email about a lock nobody set gets written.
  run('DELETE FROM activity_gates');
  await setGate({ lesson: LAB.lesson_id, activity_type: ACT, open: false });
  r = await call('GET', URL, null, ST);
  ok('  a student whose own class closed it is told about their class',
    r.body && r.body.locked_for === 'class', r.body && r.body.locked_for);
  r = await call('GET', URL);
  ok('  a signed-out visitor is told it is the anonymous rule',
    r.body && r.body.locked_for === 'anonymous', r.body && r.body.locked_for);
  //  A student of a class that has NOT closed this lab, signed out, is the case
  //  the wording was wrong for. Signed in they get the lab; signed out they hit
  //  the anonymous rule, and must not be told their teacher closed anything.
  r = await call('GET', URL, null, OTHER);
  ok('  a student of an open class still gets the lab while signed in',
    r.status === 200 && !r.body.locked, r.body && r.body.reason);

  console.log(`\n  ${pass} passed, ${fail} failed`);
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
