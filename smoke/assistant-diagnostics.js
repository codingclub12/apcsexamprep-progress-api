'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: site assistant Phase 0.5, the diagnostic panel
//
//  Two things are under test, and the second matters more than the first.
//
//  1. The reads are RIGHT. Every one of them exists to answer a support email
//     that has actually arrived, so the assertions are written as those
//     questions: why is the quiz greyed out, why does my course not show, are my
//     students' scores landing, why can nobody sign in. The gate answers are
//     cross-checked against what routes/quiz.js actually serves a student rather
//     than asserted separately, because a panel that quietly disagrees with the
//     render path is worse than no panel.
//
//  2. The read layer CANNOT CARRY AN ANSWER KEY. quiz_bank is seeded here with
//     sentinel prompts, options and explanations, and every response from every
//     read is scanned for them. This is the layer-2 guarantee from
//     docs/site-assistant-spec.md: the assistant is safe next to an assessment
//     product because the return types have no field an answer could occupy, so
//     there is nothing to prompt your way to. Asserting it here means a future
//     column added "just for context" fails the suite rather than shipping.
//
//  Ownership is the third thing: a teacher reads their own classes and nothing
//  else, and a class they do not own is indistinguishable from one that does not
//  exist, so the endpoint cannot be used to discover class codes.
//
//  Offline and secret-free, per .github/workflows/tests.yml: a throwaway SQLite
//  file, the real routers mounted in process on an ephemeral port, no network.
//
//  Zero PII: synthetic teachers, classes and students. No em-dashes.
//
//  Run: npm run smoke:assistantdiag
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-assistant-diag.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signTeacherToken, signStudentToken } = require('../utils');
const reads = require('../lib/assistant/reads');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(require('../routes/assistant'));
app.use('/api/quiz', require('../routes/quiz'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;

const get = (url, auth) => fetch(base() + url, auth ? { headers: { Authorization: 'Bearer ' + auth } } : {})
  .then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

// ── fixtures ─────────────────────────────────────────────────────────────────
const COURSE = 'ap-cybersecurity';

// Two teachers, so ownership can be tested rather than assumed.
run(`INSERT INTO teachers (id,name,email,school,password_hash)
     VALUES ('t1','Alex Owner','owner@school.example','Example HS','x')`);
run(`INSERT INTO teachers (id,name,email,password_hash)
     VALUES ('t2','Sam Other','other@school.example','x')`);

// A locked-by-default class: the exact configuration behind the "exercises work,
// quiz is greyed out" ticket.
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,quiz_lock_default)
     VALUES ('c1','t1','CYBER-DIAG','Period 3',?,1,80,0,1)`, COURSE);
// A second, ordinary class on the same teacher.
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,quiz_lock_default)
     VALUES ('c2','t1','CYBER-OPEN','Period 4',?,1,70,1,0)`, COURSE);
// A class belonging to somebody else.
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active)
     VALUES ('c9','t2','CYBER-THEIRS','Not yours',?,1)`, COURSE);

// Roster: three on the locked class, one never signed in, one deactivated.
run(`INSERT INTO students (id,class_id,display_name,pin_hash,active,last_active)
     VALUES ('s1','c1','A','x',1,datetime('now'))`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash,active,last_active)
     VALUES ('s2','c1','B','x',1,NULL)`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash,active,last_active)
     VALUES ('s3','c1','C','x',0,datetime('now'))`);

run(`INSERT INTO entitlements (id,teacher_id,course,source,status)
     VALUES ('e1','t1',?, 'code','active')`, COURSE);
run(`INSERT INTO pending_entitlements (email,course,source)
     VALUES ('owner@school.example','ap-csa','shopify_order')`);

// THE SENTINELS. If any of these strings appears in any response, the read layer
// has grown a field that can carry an answer key.
const SENTINEL_PROMPT = 'SENTINEL_QUESTION_TEXT_MUST_NOT_LEAK';
const SENTINEL_OPTION = 'SENTINEL_OPTION_MUST_NOT_LEAK';
const SENTINEL_EXPLAIN = 'SENTINEL_EXPLANATION_MUST_NOT_LEAK';
let qn = 0;
function bankRow(unit, lesson, activity) {
  qn++;
  run(`INSERT INTO quiz_bank (qid,course,unit,lesson,activity_type,q_order,prompt,options,correct_index,explanation,points,active)
       VALUES (?,?,?,?,?,?,?,?,?,?,1,1)`,
    `q${qn}`, COURSE, unit, lesson, activity, qn,
    SENTINEL_PROMPT, JSON.stringify([SENTINEL_OPTION, 'b', 'c', 'd']), 2, SENTINEL_EXPLAIN);
}
bankRow('unit-1', '1.1', 'quiz');
bankRow('unit-1', '1.1', 'quiz');
bankRow('unit-1', '1.1', 'exercise-1');
bankRow('unit-1', '1.2', 'quiz');
bankRow('unit-1', '1.1', 'lab');

// Attempts, so score visibility has something to report.
run(`INSERT INTO attempts (student_id,class_id,course,lesson_id,item_id,item_type,score,max_score,passed,attempt_no,created_at)
     VALUES ('s1','c1',?, '1.1','1.1-quiz','quiz',8,10,1,1,datetime('now'))`, COURSE);
run(`INSERT INTO attempts (student_id,class_id,course,lesson_id,item_id,item_type,score,max_score,passed,attempt_no,created_at)
     VALUES ('s1','c1',?, '1.1','1.1-cfu-1','cfu',1,1,1,1,datetime('now','-3 day'))`, COURSE);

const T1 = signTeacherToken({ id: 't1', email: 'owner@school.example' });
const T2 = signTeacherToken({ id: 't2', email: 'other@school.example' });
const ST = signStudentToken({ id: 's1', class_id: 'c1' });

const sentinelFree = (obj) => {
  const s = JSON.stringify(obj);
  return !s.includes('SENTINEL_');
};

(async () => {
  // ── 1) Auth is real ───────────────────────────────────────────────────────
  let r = await get('/api/assistant/diagnostics');
  ok('no token is refused', r.status === 401, r.status);
  r = await get('/api/assistant/diagnostics', ST);
  ok('a student token cannot read teacher diagnostics', r.status === 401, r.status);

  // ── 2) The account overview ───────────────────────────────────────────────
  r = await get('/api/assistant/diagnostics', T1);
  ok('teacher gets 200', r.status === 200, r.status);
  const top = r.body;
  ok('names the teacher', top.teacher.name === 'Alex Owner', top.teacher);
  ok('lists both owned classes', top.classes.length === 2, top.classes);
  ok('does NOT list another teacher class',
    !top.classes.some((c) => c.class_code === 'CYBER-THEIRS'), top.classes);
  ok('reports the active grant',
    top.entitlements.grants.length === 1 && top.entitlements.grants[0].course === COURSE,
    top.entitlements.grants);
  ok('surfaces the unclaimed purchase, which is the access_not_showing answer',
    top.entitlements.unclaimed_purchases.length === 1 &&
    top.entitlements.unclaimed_purchases[0].course === 'ap-csa',
    top.entitlements.unclaimed_purchases);

  // ── 3) Ownership: someone else's class is indistinguishable from no class ──
  const theirs = await get('/api/assistant/diagnostics?class=CYBER-THEIRS', T1);
  const nothing = await get('/api/assistant/diagnostics?class=CYBER-NOPE', T1);
  ok('another teacher class is 404', theirs.status === 404, theirs.status);
  ok('a nonexistent class is 404', nothing.status === 404, nothing.status);
  ok('and the two answers are identical, so codes cannot be discovered',
    JSON.stringify(theirs.body) === JSON.stringify(nothing.body), [theirs.body, nothing.body]);
  ok('the other teacher CAN read their own class',
    (await get('/api/assistant/diagnostics?class=CYBER-THEIRS', T2)).status === 200);

  // ── 4) THE TICKET: exercises open, quiz greyed out ────────────────────────
  r = await get('/api/assistant/diagnostics?class=CYBER-DIAG', T1);
  ok('locked class: 200', r.status === 200, r.status);
  const d = r.body.class_detail;
  ok('reports quiz_lock_default as the cause', d.settings.quiz_lock_default === 1, d.settings);

  const byType = {};
  d.gates.activities.forEach((a) => { byType[a.lesson + ':' + a.activity_type] = a; });
  ok('1.1 quiz is CLOSED', byType['1.1:quiz'] && byType['1.1:quiz'].open === false, byType['1.1:quiz']);
  ok('1.2 quiz is CLOSED', byType['1.2:quiz'] && byType['1.2:quiz'].open === false, byType['1.2:quiz']);
  ok('1.1 exercise-1 is OPEN', byType['1.1:exercise-1'] && byType['1.1:exercise-1'].open === true, byType['1.1:exercise-1']);
  ok('1.1 lab is OPEN', byType['1.1:lab'] && byType['1.1:lab'].open === true, byType['1.1:lab']);
  ok('the reason names the class default, not a broken reporter',
    byType['1.1:quiz'].reason === 'class-default-locked', byType['1.1:quiz'].reason);
  ok('and the open ones say why they are exempt',
    byType['1.1:exercise-1'].reason === 'class-default-not-gated-type', byType['1.1:exercise-1'].reason);

  // ── 5) The panel agrees with what a student is actually served ────────────
  // Asserted against the render path rather than separately, because an
  // operator view that disagrees silently is the failure this replaces.
  const served = await get(`/api/quiz/${COURSE}/unit-1/1.1/quiz`, ST);
  const panelSaysOpen = byType['1.1:quiz'].open;
  const renderSaysLocked = served.body && served.body.locked === true;
  ok('render path locks the quiz too', renderSaysLocked, served.body && { locked: served.body.locked });
  ok('panel and render path agree', panelSaysOpen === !renderSaysLocked, { panelSaysOpen, renderSaysLocked });

  // ── 6) An open class reads as open ────────────────────────────────────────
  const openCls = await get('/api/assistant/diagnostics?class=CYBER-OPEN', T1);
  ok('open class: nothing closed', openCls.body.class_detail.gates.counts.closed === 0,
    openCls.body.class_detail.gates.counts);
  ok('open class: reports retries allowed',
    openCls.body.class_detail.settings.retry_allowed === 1, openCls.body.class_detail.settings);

  // ── 7) Roster health separates the three ways a class looks broken ────────
  ok('roster: counts everyone', d.roster.student_count === 3, d.roster);
  ok('roster: active excludes the deactivated one', d.roster.active_count === 2, d.roster);
  ok('roster: flags the one who never signed in', d.roster.never_signed_in === 1, d.roster);

  // ── 8) Score visibility ───────────────────────────────────────────────────
  ok('scores: total counted', d.scores.recorded_total === 2, d.scores);
  ok('scores: last 24h is the recent one only', d.scores.recorded_24h === 1, d.scores);
  ok('scores: last 7d includes both', d.scores.recorded_7d === 2, d.scores);
  ok('scores: reports when the last one arrived', !!d.scores.last_recorded_at, d.scores);

  const lessonScoped = await get('/api/assistant/diagnostics?class=CYBER-DIAG&lesson=1.1', T1);
  ok('a lesson filter narrows the gates',
    lessonScoped.body.class_detail.gates.activities.every((a) => a.lesson === '1.1'),
    lessonScoped.body.class_detail.gates.activities.map((a) => a.lesson));
  ok('a lesson filter breaks scores down by item type',
    Array.isArray(lessonScoped.body.class_detail.scores.by_item_type) &&
    lessonScoped.body.class_detail.scores.by_item_type.length === 2,
    lessonScoped.body.class_detail.scores.by_item_type);

  // ── 9) THE GUARANTEE: no read can carry an answer key ─────────────────────
  // Every response above, plus every read called directly, scanned for the
  // sentinels seeded into quiz_bank prompt, options and explanation.
  const everyResponse = [top, d, openCls.body, lessonScoped.body, theirs.body, nothing.body];
  ok('no endpoint response contains a question, an option or an explanation',
    everyResponse.every(sentinelFree), 'a sentinel leaked');

  const directCalls = {
    settings: reads.getClassSettings('t1', 'CYBER-DIAG'),
    gates: reads.getGateState('t1', 'CYBER-DIAG'),
    roster: reads.getRosterHealth('t1', 'CYBER-DIAG'),
    scores: reads.getScoreVisibility('t1', 'CYBER-DIAG', { lesson: '1.1' }),
    ents: reads.getEntitlementState('t1', 'owner@school.example'),
    classes: reads.listClasses('t1'),
  };
  ok('no direct read returns a question, an option or an explanation',
    sentinelFree(directCalls), 'a sentinel leaked');
  ok('the gate read still carries the pool COUNT, which is the only quiz_bank number allowed',
    directCalls.gates.activities.every((a) => typeof a.pool === 'number' && a.pool > 0),
    directCalls.gates.activities.map((a) => a.pool));

  // And the module never selects the forbidden columns in the first place.
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'assistant', 'reads.js'), 'utf8');
  const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  ok('reads.js never selects correct_index', !/correct_index/.test(code));
  ok('reads.js never selects explanation', !/\bexplanation\b/.test(code));
  ok('reads.js never selects prompt or options', !/\b(prompt|options)\b/.test(code));
  ok('reads.js never uses SELECT *', !/SELECT\s+\*/i.test(code));

  // ── 10) Ownership holds at the module level, not just the route ───────────
  ok('a read for a class the teacher does not own returns null',
    reads.getClassSettings('t1', 'CYBER-THEIRS') === null);
  ok('gates for an unowned class return null',
    reads.getGateState('t1', 'CYBER-THEIRS') === null);
  ok('roster for an unowned class returns null',
    reads.getRosterHealth('t1', 'CYBER-THEIRS') === null);
  ok('scores for an unowned class return null',
    reads.getScoreVisibility('t1', 'CYBER-THEIRS') === null);
  ok('a missing teacher id reads nothing', reads.listClasses(null).length === 0);

  // ── 11) The panel itself is served and is plain ───────────────────────────
  const page = await fetch(base() + '/teacher/diagnostics');
  const html = await page.text();
  ok('the panel is served', page.status === 200, page.status);
  ok('the panel is pure ASCII', !/[^\x00-\x7F]/.test(html));
  ok('the panel reads the student token key nowhere',
    !/apcse_token|apcs_student_token/.test(html), 'panel should only read teacher keys');

  server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
