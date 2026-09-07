'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: assignment locking by unit, lesson and assignment
//
//  A teacher assigns by unit and by lesson. Before this, a gate row could only
//  name one assignment, so "lock Unit 3" meant writing a row per activity and
//  remembering to write another one whenever a lesson was added. The scopes are
//  wildcards in the two columns the table already has, and the whole feature is
//  therefore a resolution ORDER rather than a schema. That order is what this
//  suite exists to pin down.
//
//  WHAT IS ACTUALLY UNDER TEST, in the order the risk sits:
//
//  1. THE LADDER, exhaustively. Every pair of scopes that can disagree is set to
//     disagree on purpose and the narrower one has to win. The tie a teacher can
//     write by accident (a lesson row against an activity-type row spanning the
//     unit) is asserted explicitly, because "whichever SQL returned last" is not
//     an answer anyone can support.
//
//  2. THE ENFORCEMENT PATH, not just the resolver. A unit-scope lock has to
//     close the RENDER path and the SUBMIT path, against the same live routes a
//     student hits. The old SQL matched lesson and activity_type by equality, so
//     a unit row was invisible to it: a resolver-only assertion would pass while
//     every student walked straight through the lock. Render is checked for
//     questions never reaching the wire, and submit is checked on a token minted
//     while the assignment was still open, which is the hole a render-time-only
//     check leaves.
//
//  3. NOTHING THAT WORKED BEFORE CHANGED. Rows written by the old code are
//     activity-scope rows, and their resolution and their reason strings are
//     asserted unchanged, because other suites read those strings.
//
//  4. THE GRADEBOOK TELLS THE TRUTH TWICE OVER. The canonical contract carries
//     the lock beside the grade, resolved through the same ladder rather than
//     reimplemented, and it carries whether the lock is ENFORCEABLE. A lock only
//     bites where the server hands out the questions; on a quiz whose questions
//     are baked into the page body the padlock is decoration, and a gradebook
//     that drew it without saying so would promise a teacher something the
//     server cannot deliver.
//
//  Offline and secret-free, per .github/workflows/tests.yml: a throwaway SQLite
//  file, the real routers mounted in process on an ephemeral port, no network.
//  tests.yml derives its suite list from package.json, so this runs on every
//  pull request with no workflow edit.
//
//  Zero PII: synthetic teachers, class and student. No em-dashes.
//
//  Run: npm run smoke:gatescope
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-gate-scope.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const vm = require('vm');
const db = require('../db');
const { signTeacherToken, signStudentToken } = require('../utils');
const gate = require('../lib/activity-gate');
const contract = require('../lib/gradebook-contract');

const COURSE = 'ap-cybersecurity';
const UNIT = 'unit-1';
const CODE = 'CYBER-SCOPE';

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

const app = express();
app.use(express.json());
app.use('/api/quiz', require('../routes/quiz'));
app.use('/api/teacher', require('../routes/teacher'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

const call = (method, url, body, auth) => fetch(base() + url, {
  method,
  headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

// ── fixtures ─────────────────────────────────────────────────────────────────
run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t2','O','o@s.org','x')`);
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,retry_mode,quiz_lock_default)
     VALUES ('c1','t1',?,'Scope Test',?,1,80,1,'all',0)`, CODE, COURSE);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s1','c1','A','x')`);

// A bank for 1.1 and 1.2 quizzes, so the render and submit paths have something
// to serve and the lock has something real to close. 1.3 deliberately gets NO
// bank rows: that is the "questions live in the page body" case, and the
// contract has to report a lock there as unenforceable rather than as protection.
let qn = 0;
function bankRow(lesson, activity) {
  qn++;
  run(`INSERT INTO quiz_bank (qid,course,unit,lesson,activity_type,q_order,prompt,options,correct_index,explanation,points,active)
       VALUES (?,?,?,?,?,?,?,?,?,?,1,1)`,
    `q${qn}`, COURSE, UNIT, lesson, activity, qn,
    'prompt ' + qn, JSON.stringify(['a', 'b', 'c', 'd']), 1, 'why');
}
bankRow('1.1', 'quiz'); bankRow('1.1', 'quiz');
bankRow('1.1', 'exercise-1');
bankRow('1.2', 'quiz'); bankRow('1.2', 'quiz');

// Manifest rows, so the gradebook contract has columns to hang locks on.
for (const [lesson, item, type] of [
  ['1.1', '1.1-quiz', 'quiz'], ['1.1', '1.1-cfu-1', 'cfu'],
  ['1.2', '1.2-quiz', 'quiz'], ['1.3', '1.3-quiz', 'quiz'],
]) {
  run(`INSERT INTO course_manifest (course,unit,lesson_id,item_id,item_type,points)
       VALUES (?,?,?,?,?,5)`, COURSE, UNIT, lesson, item, type);
}

const TT = signTeacherToken({ id: 't1', email: 't@s.org' });
const T2 = signTeacherToken({ id: 't2', email: 'o@s.org' });
const ST = signStudentToken({ id: 's1', class_id: 'c1' });

const quizUrl = (lesson) => `/api/quiz/${COURSE}/${UNIT}/${lesson}/quiz`;
const setGate = (body) => call('POST', `/api/teacher/classes/${CODE}/gate`, { course: COURSE, unit: UNIT, ...body }, TT);
const clearGate = (body) => call('DELETE', `/api/teacher/classes/${CODE}/gate`, { course: COURSE, unit: UNIT, ...body }, TT);
const wipeGates = () => run('DELETE FROM activity_gates WHERE class_id = ?', 'c1');

// The class row shape the resolver wants, for the pure-function assertions.
const CLS = { id: 'c1', quiz_lock_default: 0 };
const rowsFor = () => db.prepare(
  'SELECT unit, lesson, activity_type, open FROM activity_gates WHERE class_id = ? AND course = ? AND unit = ?'
).all('c1', COURSE, UNIT);
const resolved = (lesson, activity) => gate.resolveScopedGate(rowsFor(), CLS, lesson, activity);

(async () => {
  // ═══ 1. THE LADDER ═════════════════════════════════════════════════════════
  //  Each case sets exactly two scopes to DISAGREE and asserts the narrower one
  //  decides. A ladder tested only one rung at a time is not tested at all: the
  //  bug it exists to prevent is a wider row silently outranking a narrower one.

  // unit beats the class default.
  wipeGates();
  await setGate({ open: false });                         // (unit, *, *)
  ok('unit scope: a whole unit locks in one call', resolved('1.1', 'quiz').open === false, resolved('1.1', 'quiz'));
  ok('unit scope: it reaches every activity type, not just quizzes',
    resolved('1.1', 'exercise-1').open === false, resolved('1.1', 'exercise-1'));
  ok('unit scope: the reason names the unit row a teacher would go and edit',
    resolved('1.1', 'quiz').reason === 'unit-closed', resolved('1.1', 'quiz').reason);

  // lesson beats unit. THE headline case: lock the unit, open one lesson.
  await setGate({ lesson: '1.1', open: true });           // (unit, 1.1, *)
  ok('lesson beats unit: the opened lesson is open', resolved('1.1', 'quiz').open === true, resolved('1.1', 'quiz'));
  ok('lesson beats unit: everything in that lesson opens',
    resolved('1.1', 'exercise-1').open === true, resolved('1.1', 'exercise-1'));
  ok('lesson beats unit: the rest of the unit stays locked',
    resolved('1.2', 'quiz').open === false, resolved('1.2', 'quiz'));

  // activity beats lesson.
  await setGate({ lesson: '1.1', activity_type: 'quiz', open: false });
  ok('activity beats lesson: one assignment closes inside an open lesson',
    resolved('1.1', 'quiz').open === false, resolved('1.1', 'quiz'));
  ok('activity beats lesson: its neighbour in the same lesson stays open',
    resolved('1.1', 'exercise-1').open === true, resolved('1.1', 'exercise-1'));
  ok('activity scope keeps the reason string this repo has always emitted',
    resolved('1.1', 'quiz').reason === 'explicit-closed', resolved('1.1', 'quiz').reason);

  // unit-activity beats unit.
  wipeGates();
  await setGate({ open: true });                                  // (unit, *, *)   open
  await setGate({ activity_type: 'quiz', open: false });           // (unit, *, quiz) closed
  ok('unit-activity beats unit: every quiz in the unit locks',
    resolved('1.1', 'quiz').open === false && resolved('1.2', 'quiz').open === false);
  ok('unit-activity beats unit: other activity types keep the unit setting',
    resolved('1.1', 'exercise-1').open === true, resolved('1.1', 'exercise-1'));

  // THE TIE. A lesson row and a unit-activity row both cover (1.1, quiz) with
  // one wildcard each, and they disagree. A lesson is one lesson; an activity
  // type spans every lesson in the unit. The lesson is the narrower statement
  // and must win, and it must win because of the ladder rather than row order.
  await setGate({ lesson: '1.1', open: true });                    // (unit, 1.1, *) open
  // Written BOTH WAYS round, because SQL hands back rows in whatever order it
  // likes and an assertion that only holds for one of them is not testing the
  // ladder, it is testing the insert order. The mutation battery found exactly
  // that: a resolver reduced to "keep the first row you see" still passed this
  // when the lesson row happened to come back first.
  const tieBothWays = () => resolved('1.1', 'quiz').open === true
    && resolved('1.1', 'quiz').scope === 'lesson';
  ok('the tie: lesson scope outranks activity-type-across-the-unit',
    tieBothWays(), resolved('1.1', 'quiz'));
  ok('the tie: the loser still governs the lessons the winner does not cover',
    resolved('1.2', 'quiz').open === false, resolved('1.2', 'quiz'));

  wipeGates();
  await setGate({ open: true });
  await setGate({ lesson: '1.1', open: true });                    // lesson written FIRST this time
  await setGate({ activity_type: 'quiz', open: false });
  ok('the tie holds with the rows written in the opposite order',
    tieBothWays(), resolved('1.1', 'quiz'));

  ok('the tie is decided by the ladder, not by row order',
    gate.pickGateRow(
      [{ lesson: '*', activity_type: 'quiz', open: 0 }, { lesson: '1.1', activity_type: '*', open: 1 }],
      '1.1', 'quiz').open === 1
    && gate.pickGateRow(
      [{ lesson: '1.1', activity_type: '*', open: 1 }, { lesson: '*', activity_type: 'quiz', open: 0 }],
      '1.1', 'quiz').open === 1);

  // A row that covers neither is ignored rather than trusted.
  ok('a row for another lesson never decides this one',
    gate.pickGateRow([{ lesson: '9.9', activity_type: 'quiz', open: 0 }], '1.1', 'quiz') === null);

  // ═══ 2. ENFORCEMENT, against the live routes ═══════════════════════════════
  //  This is the assertion the old equality SQL would fail. The resolver could
  //  be perfect and every student would still walk through a unit-scope lock.
  wipeGates();
  let r = await call('GET', quizUrl('1.1'), null, ST);
  ok('render: open before any gate is written', r.body && r.body.locked === false, r.body && r.body.locked);
  const tokenWhileOpen = r.body.order_token;
  ok('render: a token was minted while open', !!tokenWhileOpen);

  await setGate({ open: false });                          // lock the whole unit
  r = await call('GET', quizUrl('1.1'), null, ST);
  ok('render: a UNIT-scope lock closes the quiz', r.body && r.body.locked === true, r.body && r.body.locked);
  ok('render: no questions reach the wire under a unit lock', r.body && r.body.questions === null, r.body);
  ok('render: no order_token minted under a unit lock', r.body && !r.body.order_token);
  ok('render: the reason names the unit scope', r.body && r.body.reason === 'unit-closed', r.body && r.body.reason);

  r = await call('GET', quizUrl('1.2'), null, ST);
  ok('render: the unit lock reaches the other lessons too', r.body && r.body.locked === true, r.body && r.body.locked);

  // The token minted before the lock must not still spend.
  r = await call('POST', '/api/quiz/submit',
    { order_token: tokenWhileOpen, answers: [] }, ST);
  ok('submit: a token minted before the unit lock is refused', r.status === 403, { status: r.status, body: r.body });
  ok('submit: the refusal says it is locked', r.body && r.body.locked === true, r.body);

  // Opening one lesson inside the locked unit reopens exactly that lesson,
  // through the real route rather than the resolver.
  await setGate({ lesson: '1.1', open: true });
  r = await call('GET', quizUrl('1.1'), null, ST);
  ok('render: opening a lesson inside a locked unit serves it again',
    r.body && r.body.locked === false && r.body.questions && r.body.questions.length === 2, r.body && r.body.locked);
  r = await call('GET', quizUrl('1.2'), null, ST);
  ok('render: the rest of the locked unit is still closed', r.body && r.body.locked === true, r.body && r.body.locked);

  //  Self-study, and the line that moved on 2026-09-07.
  //
  //  It used to read "self-study is untouched by a unit lock", and that was the
  //  bypass: 1.2 is inside the locked unit, so a student who signed out was
  //  handed the quiz their teacher had just closed. A teacher found it by
  //  testing her own lock in incognito.
  //
  //  The rule now distinguishes the two halves that were being conflated. A quiz
  //  SOME class has closed is withheld from anyone with no token. A quiz nobody
  //  has closed is still served to everyone, which is the half that keeps the
  //  public practice layer public and is asserted immediately below rather than
  //  assumed.
  r = await call('GET', quizUrl('1.2'));
  ok('signed out, a quiz inside a locked unit is no longer served',
    r.body && r.body.locked === true, r.body && r.body.reason);
  ok('and the refusal names the anonymous rule',
    r.body && /^anonymous-/.test(r.body.reason || ''), r.body && r.body.reason);
  //  1.1 was explicitly reopened above, so no class has it closed.
  r = await call('GET', quizUrl('1.1'));
  ok('while a quiz no class has closed is still served signed out',
    r.body && r.body.locked === false && r.body.questions && r.body.questions.length === 2,
    r.body && r.body.reason);

  // ═══ 3. THE TEACHER API ════════════════════════════════════════════════════
  wipeGates();
  r = await setGate({ open: false });
  ok('POST /gate with no lesson writes a unit-scope row', r.body && r.body.scope === 'unit', r.body);
  r = await setGate({ lesson: '1.1', open: false });
  ok('POST /gate with a lesson writes a lesson-scope row', r.body && r.body.scope === 'lesson', r.body);
  r = await setGate({ lesson: '1.1', activity_type: 'quiz', open: false });
  ok('POST /gate with both writes an activity-scope row', r.body && r.body.scope === 'activity', r.body);
  r = await setGate({ activity_type: 'quiz', open: false });
  ok('POST /gate with an activity but no lesson writes a unit-activity row',
    r.body && r.body.scope === 'unit-activity', r.body);

  r = await call('GET', `/api/teacher/classes/${CODE}/gates`, null, TT);
  ok('GET /gates returns every scope with its name',
    r.body && r.body.gates.length === 4
    && new Set(r.body.gates.map((g) => g.scope)).size === 4, r.body && r.body.gates);
  ok('GET /gates still reports the class default beside the rows',
    r.body && r.body.quiz_lock_default === 0, r.body && r.body.quiz_lock_default);

  // CLEAR is not the same as open. An explicit open PINS against a wider lock;
  // clearing hands the decision back to the wider scope. A teacher who has
  // pinned an assignment open needs a way back, and flipping to closed is not it.
  wipeGates();
  await setGate({ open: false });                         // unit locked
  await setGate({ lesson: '1.1', open: true });           // lesson pinned open
  ok('pinned open: the lesson is open inside the locked unit', resolved('1.1', 'quiz').open === true);
  r = await clearGate({ lesson: '1.1' });
  ok('DELETE /gate reports what it cleared', r.body && r.body.cleared === true && r.body.scope === 'lesson', r.body);
  ok('after clearing, the unit decides the lesson again',
    resolved('1.1', 'quiz').open === false && resolved('1.1', 'quiz').scope === 'unit', resolved('1.1', 'quiz'));
  r = await clearGate({ lesson: '1.1' });
  ok('clearing a scope that is not set is not an error', r.status === 200 && r.body.cleared === false, r.body);

  // Validation and ownership.
  r = await setGate({ course: COURSE, unit: undefined, open: false });
  ok('a gate write without a unit is refused', r.status === 400, { status: r.status, body: r.body });
  r = await call('POST', `/api/teacher/classes/${CODE}/gate`,
    { course: COURSE, unit: 'unit-*', open: false }, TT);
  ok('a pattern smuggled into a unit id is refused', r.status === 400, { status: r.status, body: r.body });
  r = await call('POST', `/api/teacher/classes/${CODE}/gate`,
    { course: COURSE, unit: UNIT, open: false }, T2);
  ok('another teacher cannot write a gate on this class', r.status === 404, { status: r.status, body: r.body });
  r = await call('DELETE', `/api/teacher/classes/${CODE}/gate`,
    { course: COURSE, unit: UNIT }, T2);
  ok('another teacher cannot clear a gate on this class', r.status === 404, { status: r.status, body: r.body });

  // ═══ 4. THE GRADEBOOK CARRIES IT ═══════════════════════════════════════════
  wipeGates();
  await setGate({ open: false });                    // whole unit locked
  await setGate({ lesson: '1.1', open: true });      // except lesson 1.1

  const gb = contract.buildCanonicalGradebook('c1', { reveal: false });
  const byKey = Object.fromEntries(gb.items.map((i) => [`${i.lesson_ref}/${i.native_activity}`, i]));

  ok('contract: an item under the locked unit is marked locked',
    byKey['1.2/quiz'] && byKey['1.2/quiz'].locked === true, byKey['1.2/quiz']);
  ok('contract: the opened lesson is not locked',
    byKey['1.1/quiz'] && byKey['1.1/quiz'].locked === false, byKey['1.1/quiz']);
  ok('contract: each item names the scope that decided it',
    byKey['1.2/quiz'].lock_scope === 'unit' && byKey['1.1/quiz'].lock_scope === 'lesson',
    [byKey['1.2/quiz'].lock_scope, byKey['1.1/quiz'].lock_scope]);

  // Enforceability. 1.2 has bank rows so its lock is real; 1.3 has none, so a
  // padlock there is decoration and the contract has to say so.
  ok('contract: a lock on a server-rendered quiz is enforceable',
    byKey['1.2/quiz'].lock_enforceable === true, byKey['1.2/quiz']);
  ok('contract: a lock on a page-body quiz is reported as NOT enforceable',
    byKey['1.3/quiz'] && byKey['1.3/quiz'].locked === true && byKey['1.3/quiz'].lock_enforceable === false,
    byKey['1.3/quiz']);
  ok('contract: the unenforceable locks are named, not just counted',
    gb.gates.locked_but_unenforceable.includes(byKey['1.3/quiz'].item_key),
    gb.gates.locked_but_unenforceable);

  // The roll-ups the unit and lesson toggles sit on. Three states, not two:
  // collapsing 'mixed' into one of the others is how a teacher flips a switch
  // that already looked the way they wanted it.
  const unitRoll = gb.gates.units.find((u) => u.key === UNIT);
  ok('contract: a unit with some columns open reports mixed',
    unitRoll && unitRoll.state === 'mixed', unitRoll);
  const l11 = gb.gates.lessons.find((l) => l.key === `${UNIT}|1.1`);
  const l12 = gb.gates.lessons.find((l) => l.key === `${UNIT}|1.2`);
  ok('contract: the opened lesson rolls up to none locked', l11 && l11.state === 'none', l11);
  ok('contract: a fully locked lesson rolls up to all', l12 && l12.state === 'all', l12);
  ok('contract: the class default travels with the rows',
    gb.gates.quiz_lock_default === 0 && gb.gates.rows.length === 2, gb.gates);

  // The contract must not disagree with what a student is actually served.
  const live = await call('GET', quizUrl('1.2'), null, ST);
  ok('contract agrees with the render path on the same column',
    live.body.locked === byKey['1.2/quiz'].locked,
    { render: live.body.locked, contract: byKey['1.2/quiz'].locked });

  // ═══ 5. NOTHING THAT WORKED BEFORE CHANGED ═════════════════════════════════
  //  Rows written before scopes existed carry real ids in both columns. Their
  //  resolution and their reason strings are asserted unchanged, because
  //  smoke/quiz-gate.js and smoke/admin-gates.js read those strings.
  wipeGates();
  run(`INSERT INTO activity_gates (class_id,course,unit,lesson,activity_type,open)
       VALUES ('c1',?,?, '1.1','quiz',0)`, COURSE, UNIT);
  ok('legacy row: still resolves closed', resolved('1.1', 'quiz').open === false);
  ok('legacy row: reason string unchanged', resolved('1.1', 'quiz').reason === 'explicit-closed');
  ok('legacy row: touches nothing else', resolved('1.2', 'quiz').open === true);
  ok('legacy single-row callers keep working',
    gate.resolveGate({ open: 0 }, CLS, 'quiz').reason === 'explicit-closed'
    && gate.resolveGate({ open: 1 }, CLS, 'quiz').reason === 'explicit-open');
  ok('the class default reasons are unchanged',
    gate.resolveGate(null, { id: 'c1', quiz_lock_default: 1 }, 'quiz').reason === 'class-default-locked'
    && gate.resolveGate(null, { id: 'c1', quiz_lock_default: 0 }, 'quiz').reason === 'class-default-open'
    && gate.resolveGate(null, { id: 'c1', quiz_lock_default: 1 }, 'exercise-1').reason === 'class-default-not-gated-type');
  ok('self-study is still open with no class at all',
    gate.resolveGate({ open: 0 }, null, 'quiz').open === true);

  // ═══ 6. THE PAGE DRAWS WHAT THE CONTRACT SAYS ══════════════════════════════
  //  The shipped page's own script is executed against a stub DOM and a fetch
  //  stubbed to the REAL /assignments response, so this is the page's rendering
  //  logic over the real contract shape rather than a reimplementation of either.
  //  A page tested against a handwritten fixture is testing the fixture.
  wipeGates();
  await setGate({ open: false });                  // unit locked
  await setGate({ lesson: '1.1', open: true });    // one lesson opened

  const pageSrc = fs.readFileSync(path.join(__dirname, '..', 'public', 'teacher-assignments.html'), 'utf8');
  const script = [...pageSrc.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
  ok('page: the script was found in the shipped file', script.length > 4000, script.length);

  // Real responses, straight off the running routes.
  const classesDoc = (await call('GET', '/api/teacher/classes', null, TT)).body;
  const boardDoc = (await call('GET', `/api/teacher/classes/${CODE}/assignments`, null, TT)).body;
  ok('page: the endpoint returns no roster and no names',
    boardDoc && !boardDoc.students && !JSON.stringify(boardDoc).includes('display_name'), Object.keys(boardDoc || {}));

  const nodes = {};
  const el = (id) => (nodes[id] = nodes[id] || {
    id, innerHTML: '', textContent: '', value: '', style: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    addEventListener() {}, setAttribute() {}, getAttribute() { return null; },
    closest() { return null; }, appendChild() {},
  });
  const posted = [];
  const sandbox = {
    console: { log() {}, error() {} },
    document: {
      getElementById: (id) => el(id),
      querySelector: () => el('q'), querySelectorAll: () => [],
      createElement: () => el('c'), addEventListener() {}, body: el('body'),
    },
    window: { addEventListener() {} },
    // The key the Command Center and the gradebook page actually write. If the
    // page stops reading it, the board renders signed-out and every assertion
    // below goes red, which is the point: a token key is exactly the kind of
    // string that drifts silently.
    localStorage: { getItem: (k) => (k === 'apcse_teacher_token' ? TT : null), setItem() {}, removeItem() {} },
    fetch: (url, opt) => {
      if (opt && opt.method === 'POST') posted.push({ url, body: JSON.parse(opt.body) });
      const body = url.indexOf('/assignments') > -1 ? boardDoc
        : (url.indexOf('/api/teacher/classes') > -1 && url.indexOf('/gate') === -1 ? classesDoc : { ok: true });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
    },
    setTimeout, clearTimeout, encodeURIComponent,
    Math, JSON, Date, String, Number, Array, Object, RegExp, Promise, isNaN, parseInt, parseFloat,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  let pageLoaded = true;
  try { vm.runInContext(script, sandbox, { timeout: 5000 }); }
  catch (e) { pageLoaded = false; console.log('    page load error: ' + e.message); }
  ok('page: the script runs in a stub DOM', pageLoaded);
  // Let loadClasses().then(load) settle.
  await new Promise((r) => setTimeout(r, 60));

  const board = nodes.board ? nodes.board.innerHTML : '';
  ok('page: it rendered a board', board.length > 200, board.length);
  // The unit is half open, so its switch must be the mixed one. Drawing it as
  // either settled state is how a teacher flips a switch that already looked
  // the way they wanted it.
  ok('page: the half-open unit draws a MIXED switch',
    /class="sw mixed" data-kind="unit"/.test(board), board.slice(0, 400));
  ok('page: the opened lesson draws an ON switch',
    /class="sw on" data-kind="lesson" data-key="unit-1\|1\.1"/.test(board));
  ok('page: the locked lesson draws an OFF switch',
    /class="sw" data-kind="lesson" data-key="unit-1\|1\.2"/.test(board));
  // The unenforceable lock has to be visibly different from a real one.
  ok('page: an unenforceable lock is marked on the control itself',
    /class="chip[^"]*noforce/.test(board), board.match(/class="chip[^"]*"/g));
  ok('page: the banner names the unenforceable locks',
    (nodes.banner.innerHTML || '').indexOf('cannot be enforced') > -1,
    (nodes.banner.innerHTML || '').slice(0, 200));

  console.log(`\n  ${pass} passed, ${fail} failed`);
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
