'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: activity gate (teacher opens and closes a quiz)
//
//  Proves the four things the gate has to get right, in order:
//    1. A class left alone behaves exactly as it did before the gate existed.
//    2. Flipping quiz_lock_default closes quizzes with no per-activity writes.
//    3. Opening one activity opens exactly that one and nothing beside it.
//    4. A token minted while the quiz was open does not still spend after it
//       closes, which is the hole a render-time-only check would leave.
//
//  Self-study is checked too, because a gate that locks out the public practice
//  path would be a worse bug than the one it fixes.
//
//  Usage:  API_BASE=http://127.0.0.1:4311 node smoke/quiz-gate.js
//  Needs quiz_bank seeded for ap-cybersecurity unit-1 1.1 and 1.2
//  (node scripts/seed-quiz-bank.js).
// -----------------------------------------------------------------------------
const BASE = process.env.API_BASE || 'http://127.0.0.1:4311';
const COURSE = 'ap-cybersecurity';
const UNIT = 'unit-1';

let pass = 0, fail = 0;
function check(label, ok, detail) {
  if (ok) { pass++; console.log(`  ok    ${label}`); }
  else { fail++; console.log(`  FAIL  ${label}${detail ? '  <- ' + detail : ''}`); }
}

async function req(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try { json = await res.json(); } catch (_) { /* non-JSON body */ }
  return { status: res.status, json };
}

function quizPath(lesson) {
  return `/api/quiz/${COURSE}/${UNIT}/${lesson}/quiz`;
}

async function main() {
  // Unique per run so the suite is re-runnable without a cleanup step.
  // Name and PIN are unique together across the whole platform, so both have to
  // vary or a second run of this suite collides with the first.
  const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const email = `gate-smoke-${stamp}@example.com`;
  const pin = String(Math.floor(1000 + Math.random() * 9000));

  console.log(`quiz gate smoke against ${BASE}`);

  const reg = await req('POST', '/api/teacher/register', {
    body: { email, password: 'GateSmoke!2345', name: 'Gate Smoke' },
  });
  const teacher = reg.json && reg.json.token;
  check('teacher registered', !!teacher, JSON.stringify(reg.json));
  if (!teacher) return;

  const made = await req('POST', '/api/teacher/classes', {
    token: teacher,
    body: { class_name: 'Gate Smoke Class', course: COURSE, mastery_threshold: 80 },
  });
  const code = made.json && made.json.class && made.json.class.class_code;
  check('class created', !!code, JSON.stringify(made.json));
  if (!code) return;

  const joined = await req('POST', '/api/student/join', {
    body: { class_code: code, display_name: `Gate Tester ${stamp}`, pin },
  });
  const student = joined.json && joined.json.token;
  check('student joined', !!student, JSON.stringify(joined.json));
  if (!student) return;

  // 1) Untouched class keeps working.
  let r = await req('GET', quizPath('1.1'), { token: student });
  check('default class: 1.1 quiz open', r.json && r.json.locked === false, JSON.stringify(r.json).slice(0, 160));
  check('default class: all 9 items served', r.json && r.json.total === 9, `total=${r.json && r.json.total}`);

  // 2) Class default flips everything shut with no per-activity rows.
  r = await req('PUT', `/api/teacher/classes/${code}`, {
    token: teacher, body: { quiz_lock_default: 1 },
  });
  check('quiz_lock_default set to 1', r.json && r.json.class && r.json.class.quiz_lock_default === 1);

  r = await req('GET', quizPath('1.1'), { token: student });
  check('locked class: 1.1 quiz closed', r.json && r.json.locked === true, JSON.stringify(r.json).slice(0, 160));
  check('locked class: no questions on the wire', r.json && r.json.questions === null);
  check('locked class: no order_token minted', r.json && !r.json.order_token);
  check('locked class: reason is the class default', r.json && r.json.reason === 'class-default-locked', `reason=${r.json && r.json.reason}`);

  // Public self-study must be untouched: it has no teacher to open anything.
  r = await req('GET', quizPath('1.1'));
  check('self-study still open', r.json && r.json.locked === false && r.json.total === 9);

  // 3) Opening one activity opens only that one.
  r = await req('POST', `/api/teacher/classes/${code}/gate`, {
    token: teacher,
    body: { course: COURSE, unit: UNIT, lesson: '1.1', activity_type: 'quiz', open: true },
  });
  check('teacher opened 1.1 quiz', r.json && r.json.open === true);

  r = await req('GET', quizPath('1.1'), { token: student });
  const token11 = r.json && r.json.order_token;
  check('1.1 quiz now open to the student', r.json && r.json.locked === false);
  check('1.1 order_token minted', !!token11);

  r = await req('GET', quizPath('1.2'), { token: student });
  check('1.2 quiz still closed', r.json && r.json.locked === true, `locked=${r.json && r.json.locked}`);

  // 4) Closing mid-flight invalidates a token that was minted while open.
  r = await req('POST', `/api/teacher/classes/${code}/gate`, {
    token: teacher,
    body: { course: COURSE, unit: UNIT, lesson: '1.1', activity_type: 'quiz', open: false },
  });
  check('teacher closed 1.1 quiz', r.json && r.json.open === false);

  r = await req('POST', '/api/quiz/submit', {
    token: student, body: { order_token: token11, answers: [] },
  });
  check('submit refused after close', r.status === 403, `status=${r.status}`);
  check('submit refusal says locked', r.json && r.json.locked === true, JSON.stringify(r.json).slice(0, 160));

  // 5) The listing a teacher UI will read.
  r = await req('GET', `/api/teacher/classes/${code}/gates`, { token: teacher });
  check('gates listing reports the class default', r.json && r.json.quiz_lock_default === 1);
  check('gates listing has the 1.1 row', !!(r.json && (r.json.gates || []).some(
    (g) => g.lesson === '1.1' && g.activity_type === 'quiz' && g.open === 0)));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
