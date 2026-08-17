'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: anonymous grading, receipts, and the import that carries them into an
//  account.
//
//  WHY THIS EXISTS
//  Two of the three properties this feature rests on fail SILENTLY, which is the
//  only kind of failure worth writing a suite for:
//
//   1. "NOTHING IS STORED" is a promise about absence. If a future edit adds a
//      wire-log line, a PostHog event, or an attempts row to the anonymous
//      routes, every test that checks a response body still passes and the
//      product has quietly started tracking signed-out minors. So section 2
//      counts rows before and after, and section 5 greps the database file
//      itself for text a signed-out student typed.
//
//   2. "AN IMPORTED GRADE IS THE SERVER'S OWN WORD" is a promise about a
//      signature. A forged receipt that imported successfully would look exactly
//      like a real one in the gradebook. Section 4 forges several.
//
//  The third is a policy the tests pin because prose cannot: an import may only
//  land where retries are already allowed for that item type. Under the default
//  class mode ('practice') that means concept checks import and quizzes do not,
//  which is the common case rather than an edge case.
//
//  Zero PII: synthetic students, option indices, and one deliberately
//  recognisable nonsense string typed into a gap so section 5 has something to
//  hunt for.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:anongrade
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');

process.env.DB_PATH = path.join(__dirname, 'smoke-anon-grading.db');
process.env.JWT_SECRET = 'smoke-anon-grading-secret-long-enough';
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signStudentToken } = require('../utils');
const choiceGrader = require('../lib/choice-grader');
const gapGrader = require('../lib/gap-grader');
const receipt = require('../lib/anon-receipt');
const { introJavaRows } = require('../scripts/seed-manifest');

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail === undefined ? '' : `  -> ${JSON.stringify(detail)}`}`); }
}
function section(t) { console.log(`\n${t}`); }

(async () => {
  // ── 1. The receipt itself ──────────────────────────────────────────────────
  section('1. lib/anon-receipt.js');

  const sample = {
    course: 'intro-java', item_id: '1.1-quiz', item_type: 'quiz',
    score: 4, max_score: 5, detail: [{ q: 1, sel: 2, ok: true }],
  };
  const good = receipt.sign(sample);
  const v = receipt.verify(good);
  ok('1.1 a signed receipt verifies', v.ok === true, v);
  ok('1.2 it round trips the graded facts and nothing else',
    v.ok && v.value.c === 'intro-java' && v.value.i === '1.1-quiz'
    && v.value.s === 4 && v.value.m === 5 && v.value.k === 'quiz', v.value);
  ok('1.3 it carries no student identity, because there was none',
    !/student|sid|name|pin|email|ip\b/i.test(JSON.stringify(v.value)), v.value);

  // Tampering. Each of these is exactly what a student would try.
  const parts = good.split('.');
  const bumped = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
  bumped.s = 5;
  const forgedBody = Buffer.from(JSON.stringify(bumped)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  ok('1.4 raising the score invalidates the signature',
    receipt.verify(`${parts[0]}.${forgedBody}.${parts[2]}`).reason === 'signature');
  ok('1.5 a self-signed payload with no mac is refused',
    receipt.verify(`${parts[0]}.${forgedBody}.`).ok === false);
  ok('1.6 a receipt from another key is refused', (() => {
    // Simulates the deploy after JWT_SECRET is rotated.
    const realKey = process.env.JWT_SECRET;
    const other = require('crypto').createHmac('sha256',
      require('crypto').createHash('sha256').update('a different secret anon-receipt-' + receipt.VERSION).digest())
      .update(parts[1]).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    process.env.JWT_SECRET = realKey;
    return receipt.verify(`${parts[0]}.${parts[1]}.${other}`).ok === false;
  })());
  ok('1.7 junk never throws, it just fails',
    receipt.verify('').ok === false && receipt.verify(null).ok === false
    && receipt.verify('a.b.c').ok === false && receipt.verify({}).ok === false);
  ok('1.8 a wrong version is refused wholesale',
    receipt.verify(`zz9.${parts[1]}.${parts[2]}`).reason === 'version');
  ok('1.9 an expired receipt is refused',
    receipt.verify(good, Date.now() + receipt.TTL_MS + 1000).reason === 'expired');
  ok('1.10 a receipt still valid inside the window is accepted',
    receipt.verify(good, Date.now() + receipt.TTL_MS - 1000).ok === true);
  ok('1.11 a receipt dated far in the future is refused',
    receipt.verify(good, Date.now() - 48 * 3600 * 1000).reason === 'expired');
  ok('1.12 a receipt is not a session token', (() => {
    try { require('../utils').verifyStudentToken(good); return false; } catch (e) { return true; }
  })());

  // ── Fixtures ───────────────────────────────────────────────────────────────
  const MANIFEST = new Map(introJavaRows().map((r) => [r.item_id, r]));
  const QUIZ_ID = '1.1-quiz';
  const quizRow = MANIFEST.get(QUIZ_ID);
  const cfuRow = introJavaRows().find((r) => r.item_type === 'cfu' && r.lesson_id === '1.1');
  const gapRow = introJavaRows().find((r) => r.item_type === 'gap' && gapGrader.hasKey('intro-java', r.item_id));

  const ins = db.prepare(`INSERT OR REPLACE INTO course_manifest
    (course, unit, lesson_id, item_id, item_type, points) VALUES (?, ?, ?, ?, ?, ?)`);
  for (const r of [quizRow, cfuRow, gapRow].filter(Boolean)) {
    ins.run(r.course, r.unit, r.lesson_id, r.item_id, r.item_type, r.points);
  }
  // A paid course's item, to prove the anonymous allowlist is about the COURSE
  // and not merely about which answer keys happen to be loaded.
  ins.run('ap-csa', 'unit-1', '1.2', '1.2-quiz-csa', 'quiz', 5);

  const tCols = db.prepare('PRAGMA table_info(teachers)').all().map((c) => c.name);
  const tVals = { id: 't-anon', name: 'Test Teacher', email: 'teacher-anon@example.invalid',
    password_hash: 'x', school: 'Test School' };
  const useCols = tCols.filter((c) => tVals[c] !== undefined);
  db.prepare(`INSERT OR REPLACE INTO teachers (${useCols.join(', ')}) `
    + `VALUES (${useCols.map(() => '?').join(', ')})`).run(...useCols.map((c) => tVals[c]));

  // Three classes, one per retry mode that matters here.
  const mkClass = db.prepare(`INSERT OR REPLACE INTO classes
    (id, class_code, class_name, course, teacher_id, active, mastery_threshold, retry_allowed, retry_mode)
    VALUES (?, ?, ?, ?, 't-anon', 1, 80, ?, ?)`);
  mkClass.run('c-all', 'JAVA-A001', 'Retries on', 'intro-java', 1, 'all');
  mkClass.run('c-prac', 'JAVA-P001', 'Practice only', 'intro-java', 0, 'practice');
  mkClass.run('c-none', 'JAVA-N001', 'No retries', 'intro-java', 0, 'none');
  mkClass.run('c-cyber', 'CYBER-001', 'Other course', 'ap-cybersecurity', 1, 'all');
  const mkStudent = db.prepare(`INSERT OR REPLACE INTO students
    (id, class_id, display_name, pin_hash, active) VALUES (?, ?, ?, 'x', 1)`);
  for (const [id, cls] of [['s-all', 'c-all'], ['s-prac', 'c-prac'], ['s-none', 'c-none'], ['s-cyber', 'c-cyber']]) {
    mkStudent.run(id, cls, 'Test Student');
  }
  const tok = (id, cls) => signStudentToken({ id, class_id: cls, display_name: 'Test Student' });

  const app = express();
  // Mirrors server.js. The limit is not incidental here: a full-size import is
  // a couple of hundred receipts, and a test running under a smaller limit than
  // production would pass on payloads the real server would reject with a 413
  // nobody wrote a message for.
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/progress', require('../routes/progress'));
  const server = app.listen(0);
  const PORT = server.address().port;

  async function call(routePath, body, token) {
    const r = await fetch(`http://127.0.0.1:${PORT}/api/progress/${routePath}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    let j = null;
    try { j = await r.json(); } catch (e) {}
    return { status: r.status, body: j };
  }

  const countAttempts = () => db.prepare('SELECT COUNT(*) n FROM attempts').get().n;
  const QUIZ_KEY = choiceGrader.KEY.get(`intro-java|${QUIZ_ID}`);
  const rightAll = QUIZ_KEY.questions.map((q) => q.answer);
  const wrongAll = QUIZ_KEY.questions.map((q) => (q.answer + 1) % q.options);
  const cfuKey = choiceGrader.KEY.get(`intro-java|${cfuRow.item_id}`);

  // ── 2. Anonymous grading stores nothing ────────────────────────────────────
  section('2. POST /api/progress/anon/choice');

  const before = countAttempts();
  const anon = await call('anon/choice', { course: 'intro-java', item_id: QUIZ_ID, selections: rightAll });
  ok('2.1 a signed-out student is graded, not turned away',
    anon.status === 200 && anon.body.score === quizRow.points, anon.body);
  ok('2.2 the response says out loud that nothing was stored',
    anon.body.graded === true && anon.body.stored === false && anon.body.recorded === undefined, anon.body);
  ok('2.3 it comes with a receipt', typeof anon.body.receipt === 'string' && receipt.verify(anon.body.receipt).ok);
  ok('2.4 no row was written', countAttempts() === before, { before, after: countAttempts() });

  const anonWrong = await call('anon/choice', { course: 'intro-java', item_id: QUIZ_ID, selections: wrongAll });
  ok('2.5 a wrong submission still grades and still gets a receipt',
    anonWrong.status === 200 && anonWrong.body.score === 0 && !!anonWrong.body.receipt, anonWrong.body);
  ok('2.6 the response never carries the right answer',
    !/"answer"|"sel"|"correct_option"/.test(JSON.stringify(anonWrong.body)), anonWrong.body);
  ok('2.7 still nothing stored after a second grade', countAttempts() === before);

  ok('2.8 a paid course cannot be graded anonymously', (async () => true) && (
    await call('anon/choice', { course: 'ap-csa', item_id: '1.2-quiz-csa', selections: [0] })).status === 403);
  ok('2.9 an unknown item is rejected',
    (await call('anon/choice', { course: 'intro-java', item_id: '4.4-nope', selections: [0] })).status === 400);
  ok('2.10 a non-integer selection is rejected',
    (await call('anon/choice', { course: 'intro-java', item_id: QUIZ_ID, selections: ['1'] })).status === 400);
  ok('2.11 an unbounded payload is rejected',
    (await call('anon/choice', { course: 'intro-java', item_id: QUIZ_ID,
      selections: new Array(500).fill(0) })).status === 400);
  ok('2.12 a course-less body is rejected',
    (await call('anon/choice', { item_id: QUIZ_ID, selections: [0] })).status === 400);

  // ── 3. Anonymous gap grading ───────────────────────────────────────────────
  section('3. POST /api/progress/anon/gap');

  // A string no key contains and no page renders, so if it turns up in the
  // database file in section 5 it can only have come from this request.
  const CANARY = 'zzqqxxCANARYtypedbyastudent';
  let gapReceipt = null;
  if (gapRow) {
    const holes = gapGrader.holeNumbers('intro-java', gapRow.item_id);
    const answers = {};
    holes.forEach((n) => { answers[String(n)] = CANARY; });
    const g = await call('anon/gap', { course: 'intro-java', item_id: gapRow.item_id, answers });
    ok('3.1 a signed-out gap is graded',
      g.status === 200 && g.body.graded === true && g.body.stored === false, g.body);
    ok('3.2 it scores zero for nonsense rather than erroring', g.body.score === 0, g.body);
    ok('3.3 it comes with a receipt', !!g.body.receipt && receipt.verify(g.body.receipt).ok);
    ok('3.4 no row was written', countAttempts() === before);
    ok('3.5 per-hole feedback names a kind of mistake, never an answer',
      (g.body.holes || []).every((h) => !h.ok), g.body.holes);
    gapReceipt = g.body.receipt;
  } else {
    console.log('  [SKIP] 3.x no gap item with a key in the manifest');
  }
  ok('3.6 an over-long answer is rejected',
    (await call('anon/gap', { course: 'intro-java', item_id: (gapRow || {}).item_id || 'x',
      answers: { 1: 'y'.repeat(500) } })).status === 400);

  // ── 4. Import ──────────────────────────────────────────────────────────────
  section('4. POST /api/progress/import');

  const perfectQuiz = (await call('anon/choice',
    { course: 'intro-java', item_id: QUIZ_ID, selections: rightAll })).body.receipt;
  const perfectCfu = (await call('anon/choice',
    { course: 'intro-java', item_id: cfuRow.item_id, selections: [cfuKey.questions[0].answer] })).body.receipt;

  ok('4.1 import needs a session', (await call('import', { receipts: [perfectQuiz] })).status === 401);

  // Retries on everything: both land.
  const impAll = await call('import', { receipts: [perfectQuiz, perfectCfu] }, tok('s-all', 'c-all'));
  ok('4.2 with retries on, the work imports',
    impAll.status === 200 && impAll.body.imported === 2, impAll.body);
  const allRows = db.prepare('SELECT item_id, score, max_score, attempt_no, source FROM attempts WHERE student_id = ?').all('s-all');
  ok('4.3 it lands as real attempts rows', allRows.length === 2, allRows);
  ok('4.4 every imported row is marked as imported, not as live work',
    allRows.every((r) => r.source === 'imported'), allRows);
  ok('4.5 the score is the server\'s own, out of the manifest denominator',
    allRows.every((r) => r.score === r.max_score)
    && allRows.find((r) => r.item_id === QUIZ_ID).max_score === quizRow.points, allRows);

  // Idempotence: the same receipts again must not stack duplicate rows.
  const again = await call('import', { receipts: [perfectQuiz, perfectCfu] }, tok('s-all', 'c-all'));
  ok('4.6 importing the same work twice adds nothing',
    again.body.imported === 0
    && again.body.results.every((r) => r.reason === 'already-attempted'), again.body);
  ok('4.7 and wrote no second row',
    db.prepare('SELECT COUNT(*) n FROM attempts WHERE student_id = ?').get('s-all').n === 2);

  // The policy case, and the common one: practice mode takes the check, not the quiz.
  const impPrac = await call('import', { receipts: [perfectQuiz, perfectCfu] }, tok('s-prac', 'c-prac'));
  ok('4.8 practice mode imports the concept check',
    impPrac.body.imported === 1
    && impPrac.body.results.find((r) => r.item_id === cfuRow.item_id).imported === true, impPrac.body);
  ok('4.9 practice mode refuses the quiz, because the first try is the grade',
    impPrac.body.results.find((r) => r.item_id === QUIZ_ID).reason === 'retry-off', impPrac.body);
  ok('4.10 the student is told both halves of that, not just the good half',
    /Added 1 item/.test(impPrac.body.student_message)
    && /quiz/.test(impPrac.body.student_message), impPrac.body.student_message);
  ok('4.11 the refused quiz wrote no row',
    db.prepare("SELECT COUNT(*) n FROM attempts WHERE student_id = ? AND item_id = ?").get('s-prac', QUIZ_ID).n === 0);

  const impNone = await call('import', { receipts: [perfectQuiz, perfectCfu] }, tok('s-none', 'c-none'));
  ok('4.12 retries-off imports nothing at all',
    impNone.body.imported === 0
    && impNone.body.results.every((r) => r.reason === 'retry-off'), impNone.body);
  ok('4.13 and says so without blaming the student',
    /cannot|not added/i.test(impNone.body.student_message)
    && !/error|invalid|reject/i.test(impNone.body.student_message), impNone.body.student_message);

  // Forgery, which is the whole reason receipts exist.
  const fParts = perfectCfu.split('.');
  const fPayload = JSON.parse(Buffer.from(fParts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
  fPayload.s = 99; fPayload.m = 99;
  const fBody = Buffer.from(JSON.stringify(fPayload)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const forged = await call('import', { receipts: [`${fParts[0]}.${fBody}.${fParts[2]}`] }, tok('s-all', 'c-all'));
  ok('4.14 a forged receipt is refused',
    forged.body.imported === 0 && forged.body.results[0].reason === 'signature', forged.body);
  ok('4.15 a hand-written receipt is refused',
    (await call('import', { receipts: ['ij1.aaaa.bbbb'] }, tok('s-all', 'c-all'))).body.results[0].imported === false);

  // Course fencing, same rule the signed-in routes use.
  const wrongCourse = await call('import', { receipts: [perfectCfu] }, tok('s-cyber', 'c-cyber'));
  ok('4.16 a receipt for another course does not import into this class',
    wrongCourse.body.imported === 0 && wrongCourse.body.results[0].reason === 'wrong-course', wrongCourse.body);

  // A receipt signed before the manifest moved must not import out of a stale total.
  ins.run('intro-java', 'unit-1', cfuRow.lesson_id, cfuRow.item_id, 'cfu', 7);
  const stale = await call('import', { receipts: [perfectCfu] }, tok('s-prac', 'c-prac'));
  ok('4.17 a stale denominator is refused rather than regraded',
    stale.body.results[0].reason === 'stale-denominator' || stale.body.results[0].reason === 'already-attempted',
    stale.body);
  ins.run(cfuRow.course, cfuRow.unit, cfuRow.lesson_id, cfuRow.item_id, cfuRow.item_type, cfuRow.points);

  ok('4.18 a duplicate inside one payload is counted once',
    (await call('import', { receipts: [perfectQuiz, perfectQuiz] }, tok('s-all', 'c-all')))
      .body.results.filter((r) => r.reason === 'duplicate').length === 1);
  ok('4.19 a non-array body is rejected',
    (await call('import', { receipts: 'nope' }, tok('s-all', 'c-all'))).status === 400);
  ok('4.20 an unbounded payload is rejected by the count cap',
    (await call('import', { receipts: new Array(500).fill('ij1.x.y') }, tok('s-all', 'c-all'))).status === 400);
  // A FULL legitimate import must fit inside the production body limit, or the
  // cap the route advertises is one the server would 413 before reaching.
  const fullSize = Buffer.byteLength(JSON.stringify({ receipts: new Array(200).fill(perfectQuiz) }));
  ok('4.21 a full 200-receipt import fits well inside the 1mb body limit',
    fullSize < 900_000, { bytes: fullSize });
  const full = await call('import', { receipts: new Array(200).fill(perfectQuiz) }, tok('s-all', 'c-all'));
  ok('4.22 and is accepted rather than rejected for size', full.status === 200, full.status);
  const empty = await call('import', { receipts: [] }, tok('s-all', 'c-all'));
  ok('4.23 an empty import returns cleanly', empty.status === 200 && empty.body.imported === 0, empty.body);

  // ── 5. What the database file actually holds ───────────────────────────────
  section('5. Nothing a signed-out student typed reached disk');

  const importedDetail = db.prepare(
    "SELECT detail FROM attempts WHERE student_id = 's-all' AND item_id = ?"
  ).get(QUIZ_ID);
  const parsed = JSON.parse(importedDetail.detail);
  ok('5.1 imported detail is the documented shape and nothing else',
    parsed.every((d) => Object.keys(d).sort().join(',') === 'ok,q,sel'
      && Number.isInteger(d.q) && typeof d.ok === 'boolean'
      && (d.sel === null || Number.isInteger(d.sel))), parsed[0]);
  ok('5.2 imported detail holds no strings at all',
    !/"[a-z]+":"/i.test(importedDetail.detail), importedDetail.detail.slice(0, 120));

  server.close();
  db.close();
  const raw = fs.readFileSync(process.env.DB_PATH, 'latin1');
  ok('5.3 the gap text a signed-out student typed is nowhere in the database',
    !raw.includes(CANARY));
  ok('5.4 no receipt was stored either, anywhere',
    !raw.includes(perfectQuiz.split('.')[2]) && !raw.includes('ij1.'));

  console.log(`\n  ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
