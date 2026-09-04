'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: site assistant Phase 4, the student path
//
//  Students are MINORS. CLAUDE.md allows exactly one table of student-typed free
//  text in this repo, sandbox_programs, and says adding a second is a decision
//  rather than a patch. So the central assertion here is not about answers, it
//  is about storage:
//
//    NO MESSAGE BODY IS STORED ON ANY PATH, EVER.
//
//  Asserted on every branch a student message can take, including the ones
//  nobody thinks about: the off-scope refusal, the pre-filter refusal, the cap
//  degrade, the provider failure, the blocked reply. A privacy guarantee that
//  holds on the happy path and leaks on the error path is not a guarantee.
//
//  THE SECOND ASSERTION IS THAT IT CANNOT STATE A MARK. getMyProgress has no
//  field a score could occupy, which is a stronger claim than "we gate it", and
//  the way to test a claim like that is to seed distinctive numbers and require
//  them to be absent from everything: the DTOs, the assembled context, the tool
//  call audit rows and the reply.
//
//  Offline and secret-free: a throwaway SQLite file, the real routers in
//  process, a recording provider. No network, no tokens, no spend. Synthetic
//  students. No em-dashes.
//
//  Run: npm run smoke:assistantstudent
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-assistant-student.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
process.env.ASSISTANT_ENABLED = '1';
process.env.ASSISTANT_STUDENT_ENABLED = '1';
delete process.env.ANTHROPIC_API_KEY;

const express = require('express');
const db = require('../db');
const { signTeacherToken, signStudentToken } = require('../utils');
const chat = require('../lib/assistant/chat');
const reads = require('../lib/assistant/reads');
const store = require('../lib/assistant/store');
const scope = require('../lib/assistant/scope');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(require('../routes/assistant'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
const post = (url, body, auth) => fetch(base() + url, {
  method: 'POST',
  headers: Object.assign({ 'Content-Type': 'application/json' }, auth ? { Authorization: 'Bearer ' + auth } : {}),
  body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

// ── fixtures ─────────────────────────────────────────────────────────────────
const COURSE = 'ap-cybersecurity';
const PORTAL = 'https://apcsexamprep.com/pages/my-progress';

// Marks chosen to be unmistakable if they ever surface. 8021/9999 is 80.2
// percent, which passes at a threshold of 80 and fails at 85, so the same rows
// also test that `passed` is recomputed at READ time rather than trusted from
// storage.
//
// FOUR DIGITS, NOT TWO, and that is a correction rather than a preference. The
// first draft used 73 and 91, and the endpoint assertion went red because "73"
// appears inside a random hex session id roughly half the time. A two digit
// sentinel is not a sentinel: it collides with ids, timestamps and token counts,
// and a leak test that cries wolf gets its assertion deleted rather than
// investigated.
const MARK_SCORE = 8021;
const MARK_MAX = 9999;
const OTHER_MARK = 7777;

const S_PROMPT = 'SENTINEL QUESTION STEM THAT MUST NEVER LEAVE THIS SERVER AT ALL';
const S_OPTION = 'SENTINEL_OPTION_STRING_MUST_NOT_LEAK';
const S_CODE = 'SENTINELCODE9X7';
const S_TEACHER = 'SENTINEL_TEACHER_NAME_MUST_NOT_LEAK';
const S_OTHER_STUDENT = 'SENTINEL_OTHER_STUDENT_MUST_NOT_LEAK';

run(`INSERT INTO teachers (id,name,email,school,password_hash)
     VALUES ('t1',?, 'teach@school.example','Sentinel High','x')`, S_TEACHER);
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed,quiz_lock_default)
     VALUES ('c1','t1','CYBER-STU','Period 3',?,1,80,0,1)`, COURSE);
run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold)
     VALUES ('c2','t1','CYBER-OTHER','Period 4',?,1,80)`, COURSE);
run(`INSERT INTO students (id,class_id,display_name,pin_hash,active)
     VALUES ('stu1','c1','Ada','x',1)`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash,active)
     VALUES ('stu2','c2',?, 'x',1)`, S_OTHER_STUDENT);
run(`INSERT INTO entitlements (id,teacher_id,course,source,status)
     VALUES ('e1','t1',?, 'code','active')`, COURSE);
run(`INSERT INTO access_codes (code,course,status) VALUES (?,?,'unused')`, S_CODE, COURSE);

let qn = 0;
function bankRow(unit, lesson, activity) {
  qn++;
  run(`INSERT INTO quiz_bank (qid,course,unit,lesson,activity_type,q_order,prompt,options,correct_index,explanation,points,active)
       VALUES (?,?,?,?,?,?,?,?,?,?,1,1)`,
  `q${qn}`, COURSE, unit, lesson, activity, qn,
  S_PROMPT, JSON.stringify([S_OPTION, 'b', 'c', 'd']), 2, 'why');
}
bankRow('unit-1', '1.1', 'quiz');
bankRow('unit-1', '1.2', 'quiz');
bankRow('unit-1', '1.1', 'exercise-1');

// This student's own work, carrying the distinctive mark.
run(`INSERT INTO attempts (student_id,class_id,course,lesson_id,item_id,item_type,score,max_score,passed,attempt_no,created_at)
     VALUES ('stu1','c1',?, '1.1','1.1-quiz','quiz',?,?,1,1,datetime('now'))`, COURSE, MARK_SCORE, MARK_MAX);
run(`INSERT INTO score_events (id,student_id,class_id,course,unit,lesson,activity_type,item,points,max_points)
     VALUES ('se1','stu1','c1',?, 'unit-1','1.1','exercise-1','item',?,?)`, COURSE, MARK_SCORE, MARK_MAX);
// Another student's work, in another class, which must never surface.
run(`INSERT INTO attempts (student_id,class_id,course,lesson_id,item_id,item_type,score,max_score,passed,attempt_no,created_at)
     VALUES ('stu2','c2',?, '1.1','1.1-quiz','quiz',?,?,1,1,datetime('now'))`, COURSE, OTHER_MARK, OTHER_MARK);

const STU = signStudentToken({ id: 'stu1', class_id: 'c1' }, 'CYBER-STU');
const STU2 = signStudentToken({ id: 'stu2', class_id: 'c2' }, 'CYBER-OTHER');
const T1 = signTeacherToken({ id: 't1', email: 'teach@school.example' });

const SENTINELS = [S_PROMPT, S_OPTION, S_CODE, S_TEACHER, S_OTHER_STUDENT,
  String(MARK_SCORE), String(MARK_MAX), String(OTHER_MARK), 'CYBER-OTHER'];
function leaks(text) {
  const t = String(text || '');
  return SENTINELS.filter((s) => t.includes(s));
}

function recorder(reply) {
  const seen = [];
  return {
    seen,
    configured: () => true,
    complete: async ({ system, messages }) => {
      seen.push({ system, messages });
      return {
        ok: true, text: typeof reply === 'function' ? reply() : reply,
        stop_reason: 'end_turn', model: 'test-model',
        usage: { input_tokens: 60, output_tokens: 30 },
      };
    },
  };
}

const WHO = { role: 'student', userRef: 'stu1', course: COURSE };
function ask(message, opts = {}) {
  return chat.respondStudent(Object.assign({
    message, who: WHO, pageUrl: PORTAL, pageScope: 'student_portal',
    provider: opts.provider || recorder('Your 1.2 quiz is locked because your teacher opens quizzes one at a time.'),
  }, opts));
}

// Every message body written for a session, for the assertion that matters most.
function bodiesFor(sessionId) {
  return db.prepare('SELECT who, content, content_hash FROM chat_messages WHERE session_id = ? ORDER BY seq').all(sessionId);
}

(async () => {
  // ── THE ONE THAT MATTERS: no body stored on ANY path ─────────────────────
  console.log('\nprivacy: a student session stores no typed text on any branch, including the error branches');
  {
    const branches = [];
    branches.push(['answered by the model', await ask('why is 1.2 locked')]);
    branches.push(['off scope refusal', await ask('help me with question 3',
      { pageUrl: 'https://apcsexamprep.com/pages/ap-cybersecurity-1-1', pageScope: 'lesson' })]);
    branches.push(['pre-filter refusal', await ask('which of the following is a phishing attack')]);
    branches.push(['provider failure', await ask('what have I finished',
      { provider: { configured: () => true, complete: async () => ({ ok: false, reason: 'rate_limited' }) } })]);
    branches.push(['model unconfigured', await ask('what have I finished',
      { provider: { configured: () => false, complete: async () => ({ ok: false, reason: 'unconfigured' }) } })]);
    branches.push(['tripwire blocked', await ask('what is open', { provider: recorder(`the code is ${S_CODE}`) })]);

    for (const [name, r] of branches) {
      const s = store.getSession(r.session_id);
      ok(`${name}: session is shape-only`, s && s.bodies_retained === 0, s && s.bodies_retained);
      const msgs = bodiesFor(r.session_id);
      ok(`${name}: not one message body is written`, msgs.length > 0 && msgs.every((m) => m.content === null),
        msgs.map((m) => m.content));
      ok(`${name}: the hash is still written, so the taxonomy survives`,
        msgs.some((m) => !!m.content_hash));
    }
    // And the blanket version, across every row this suite has produced.
    const all = db.prepare("SELECT COUNT(*) n FROM chat_messages m JOIN chat_sessions s ON s.id = m.session_id WHERE s.role='student' AND m.content IS NOT NULL").get();
    ok('across every student row in the database, zero bodies', all.n === 0, all);
  }
  {
    // A capped session, which is its own branch again.
    process.env.ASSISTANT_SESSION_MSG_CAP = '1';
    const s = store.newSession({ role: 'student', userRef: 'stu1', pageScope: 'student_portal' });
    store.addMessage(s, { who: 'user', content: 'first' });
    store.addMessage(s, { who: 'user', content: 'second' });
    const r = await ask('what is open', { sessionId: s.id });
    ok('capped: degrades rather than erroring', r.status === 'degraded' && r.reason === 'session_messages', { s: r.status, r: r.reason });
    ok('capped: still stores no body', bodiesFor(r.session_id).every((m) => m.content === null));
    delete process.env.ASSISTANT_SESSION_MSG_CAP;
  }

  // ── IT CANNOT STATE A MARK ───────────────────────────────────────────────
  console.log('\nno marks: getMyProgress has no field a score could occupy');
  {
    const p = reads.getMyProgress('stu1');
    ok('progress reads something', !!p && p.items.length > 0, p);
    const blob = JSON.stringify(p);
    ok('the DTO carries no mark at all', leaks(blob).length === 0, leaks(blob));
    ok('every item is attempted and passed booleans only',
      p.items.every((i) => Object.keys(i).sort().join(',') === 'attempted,item_type,lesson,passed'),
      p.items[0]);
    ok('and it counts rather than scores', typeof p.counts.attempted === 'number' && typeof p.counts.passed === 'number');
  }
  {
    const rec = recorder('You have finished 1.1 and 1.2 is still locked.');
    const r = await ask('what did I get on the 1.1 quiz', { provider: rec });
    const ctx = rec.seen.length ? rec.seen[0].system : '';
    ok('no mark reaches the assembled context', leaks(ctx).length === 0, leaks(ctx));
    ok('the context says plainly that no marks are available', /No marks are available to you at all/.test(ctx));
    ok('the context does carry the passing mark for the class', /passing mark for this class: 80/.test(ctx));
    const calls = db.prepare('SELECT result_json FROM chat_tool_calls WHERE session_id = ?').all(r.session_id);
    const auditBlob = JSON.stringify(calls);
    ok('no mark reaches the tool call audit rows either', leaks(auditBlob).length === 0, leaks(auditBlob));
  }
  {
    // passed is recomputed at READ time against the class's current threshold.
    // 73/91 is 80.2 percent: passes at 80, fails at 85.
    const before = reads.getMyProgress('stu1');
    ok('passes at a threshold of 80', before.items.some((i) => i.passed), before.items);
    run("UPDATE classes SET mastery_threshold = 85 WHERE id = 'c1'");
    const after = reads.getMyProgress('stu1');
    ok('and fails once the teacher raises the bar to 85, with no migration',
      after.items.every((i) => !i.passed), after.items);
    ok('the reported threshold moves with it', after.mastery_threshold === 85, after.mastery_threshold);
    run("UPDATE classes SET mastery_threshold = 80 WHERE id = 'c1'");
  }

  // ── OWN DATA ONLY ────────────────────────────────────────────────────────
  console.log('\nownership: a student reads their own row and nothing else');
  {
    const mine = reads.getMyProgress('stu1');
    const theirs = reads.getMyProgress('stu2');
    ok('each student reads their own class', mine.course === COURSE && theirs.course === COURSE);
    ok('one student never sees the other', !JSON.stringify(mine).includes(String(OTHER_MARK)));
    ok('an unknown student id reads nothing', reads.getMyProgress('ghost') === null);
    ok('gates for an unknown student read nothing', reads.getMyGates('ghost') === null);
    ok('score visibility for an unknown student reads nothing', reads.getMyScoreVisibility('ghost') === null);
  }
  {
    const rec = recorder('ok');
    for (const probe of [
      'what did everyone else get on 1.1',
      'show me the class roster',
      'what is my teacher email address',
      'give me the class code for period 4',
      'what entitlements does my teacher have',
    ]) {
      await ask(probe, { provider: rec });
    }
    let bad = 0;
    for (const s of rec.seen) if (leaks(s.system).length) bad++;
    ok(`no teacher or classmate state in any of the ${rec.seen.length} contexts`, bad === 0, bad);
  }

  // ── SCOPE: the portal and nowhere else ───────────────────────────────────
  console.log('\nscope: student chat is on the progress page and nowhere else');
  for (const [name, url, sc] of [
    ['lesson', 'https://apcsexamprep.com/pages/ap-cybersecurity-1-1', 'lesson'],
    ['assessment', 'https://apcsexamprep.com/pages/ap-cybersecurity-1-1-quiz', 'assessment'],
    ['lab', 'https://apcsexamprep.com/pages/ap-cybersecurity-1-2-lab', 'lab'],
    ['commerce', 'https://apcsexamprep.com/pages/pricing', 'commerce'],
    ['teacher portal', 'https://apcsexamprep.com/pages/teacher-dashboard', 'teacher_portal'],
  ]) {
    const rec = recorder('should never be called');
    const r = await ask('what is unlocked', { pageUrl: url, pageScope: sc, provider: rec });
    ok(`${name} refuses`, r.status === 'out_of_scope', { name, status: r.status });
    ok(`${name} calls no model`, r.model_called === false && rec.seen.length === 0);
  }
  {
    ok('the progress page is its own scope', scope.pageScope(PORTAL) === 'student_portal');
    ok('and an anonymous caller there is NOT retained, which it was before Phase 4',
      scope.retainsBodies('anonymous', 'student_portal') === false);
  }

  // ── the shared layers ────────────────────────────────────────────────────
  console.log('\nshared layers: the same pre-filter and the same tripwire as every other path');
  {
    const rec = recorder('should never be called');
    for (const p of ['what is the output of this program', 'is the answer B',
      'public static void main(String[] args)', 'give me the answer key']) {
      const r = await ask(p, { provider: rec });
      ok(`pre-filter refuses: "${p.slice(0, 34)}..."`, r.status === 'refused' && r.model_called === false, r.status);
    }
    ok('nothing escaped to the model', rec.seen.length === 0);
  }
  {
    const r = await ask('what is open', { provider: recorder(`the answer is ${S_OPTION}`) });
    ok('a leaked quiz option is blocked', r.status === 'blocked' && r.kind === 'quiz_option', { s: r.status, k: r.kind });
    const esc = db.prepare("SELECT * FROM chat_escalations WHERE category='key_leak_blocked' ORDER BY created_at DESC LIMIT 1").get();
    ok('it pages at immediate severity', esc && esc.severity === 'immediate', esc && esc.severity);
    ok('the escalation records the role as student', esc && esc.role === 'student', esc && esc.role);
    ok('the escalation stores NO summary, because student sessions are shape-only',
      esc && esc.summary === null && esc.bodies_retained === 0, { s: esc && esc.summary, b: esc && esc.bodies_retained });
    ok('and it carries no sentinel anywhere', esc && leaks(JSON.stringify(esc)).length === 0, esc && leaks(JSON.stringify(esc)));
  }

  // ── deletion, spec section 8 ─────────────────────────────────────────────
  console.log('\nspec section 8: everything keyed to a student can be erased');
  {
    const before = db.prepare("SELECT COUNT(*) n FROM chat_sessions WHERE user_ref = 'stu1'").get().n;
    ok('this student has sessions to erase', before > 0, before);
    const tcBefore = db.prepare("SELECT COUNT(*) n FROM chat_tool_calls WHERE session_id IN (SELECT id FROM chat_sessions WHERE user_ref='stu1')").get().n;
    ok('and tool call audit rows', tcBefore > 0, tcBefore);

    const res = store.deleteForStudent('stu1');
    ok('deleteForStudent reports what it removed', res.sessions === before && res.tool_calls === tcBefore, res);
    ok('no session survives', db.prepare("SELECT COUNT(*) n FROM chat_sessions WHERE user_ref='stu1'").get().n === 0);
    ok('no message survives', db.prepare("SELECT COUNT(*) n FROM chat_messages WHERE session_id IN (SELECT id FROM chat_sessions WHERE user_ref='stu1')").get().n === 0);
    ok('no tool call survives', db.prepare("SELECT COUNT(*) n FROM chat_tool_calls WHERE session_id IN (SELECT id FROM chat_sessions WHERE user_ref='stu1')").get().n === 0);
    ok('the other student is untouched', db.prepare("SELECT COUNT(*) n FROM chat_sessions WHERE user_ref='stu2'").get().n >= 0);
    ok('deleting an unknown id is a safe no-op', JSON.stringify(store.deleteForStudent('ghost')) === JSON.stringify({ sessions: 0, messages: 0, tool_calls: 0 }));
    ok('and their ATTEMPTS survive, because that is gradebook data',
      db.prepare("SELECT COUNT(*) n FROM attempts WHERE student_id='stu1'").get().n > 0);
  }

  // ── the endpoint ─────────────────────────────────────────────────────────
  console.log('\nthe endpoint: the switch is per audience, and identity is the token');
  {
    const r = await post('/api/assistant/chat', { message: 'what is unlocked', pageUrl: PORTAL }, STU);
    ok('a student is accepted when the switch is on', r.status === 200, r.body);
    ok('the response carries no mark', leaks(JSON.stringify(r.body)).length === 0, leaks(JSON.stringify(r.body)));
    ok('and never the assembled context', !('context' in (r.body || {})));

    const spoof = await post('/api/assistant/chat', {
      message: 'what is unlocked', pageUrl: PORTAL, role: 'teacher', userRef: 't1', classCode: 'CYBER-OTHER',
    }, STU);
    ok('a body claiming to be a teacher is still a student', spoof.status === 200, spoof.status);
    ok('and gets no teacher state', leaks(JSON.stringify(spoof.body)).length === 0, leaks(JSON.stringify(spoof.body)));

    const t = await post('/api/assistant/chat', { message: 'why is my quiz locked', pageUrl: 'https://apcsexamprep.com/pages/teacher-dashboard' }, T1);
    ok('a teacher token still gets the teacher path', t.status === 200, t.status);
  }
  {
    process.env.ASSISTANT_STUDENT_ENABLED = '';
    const r = await post('/api/assistant/chat', { message: 'hi', pageUrl: PORTAL }, STU);
    ok('with the student switch OFF a student is refused again', r.status === 401, r.status);
    ok('and told why rather than silently ignored', /student/i.test((r.body && r.body.error) || ''), r.body);
    const anon = await post('/api/assistant/chat', { message: 'hi', pageUrl: PORTAL });
    ok('the anon switch is independent of the student one', anon.status === 401, anon.status);
    process.env.ASSISTANT_STUDENT_ENABLED = '1';
  }
  {
    const c = await fetch(base() + '/api/assistant/chat/config').then((r) => r.json());
    ok('config reports both switches separately',
      typeof c.anon_enabled === 'boolean' && typeof c.student_enabled === 'boolean', c);
  }

  // ── the widget in student mode ───────────────────────────────────────────
  console.log('\nthe widget: student mode is signed in, has no challenge, and still cannot read the page');
  {
    const w = await fetch(base() + '/apcs-chat.js').then(async (r) => ({ s: r.status, t: await r.text() }));
    ok('the widget is served', w.s === 200, w.s);
    ok('it is pure ASCII', ![...w.t].some((c) => c.charCodeAt(0) > 126));
    ok('it knows the student portal', /STUDENT_PORTAL/.test(w.t) && /my-progress/.test(w.t));
    ok('it renders nothing on coursework, in either mode', /COURSEWORK/.test(w.t) && /return null;/.test(w.t));
    ok('it reads the STUDENT token key first, per spec section 7',
      /STUDENT_KEYS = \['apcse_student'/.test(w.t), 'student key must be first');
    ok('it lists no teacher token key at all', !/teacher_token/.test(w.t));
    ok('Turnstile is anonymous only', /MODE !== 'anonymous'/.test(w.t));
    ok('it checks the student switch separately', /student_enabled/.test(w.t));
    ok('it renders nothing for a signed-out visitor on the portal',
      /MODE === 'student' && !studentToken\(\)/.test(w.t));
    // Same page-read guard as Phase 3, and the same mutation behind it.
    const READS_PAGE = ['.innerText', '.outerHTML', 'getSelection(', 'document.body.textContent'];
    for (const f of READS_PAGE) ok(`still cannot read the page: no ${f}`, !w.t.includes(f), f);
    const mutated = w.t.replace('pageTitle: document.title,', 'pageTitle: document.body.innerText,');
    ok('the page-read guard is still load bearing', READS_PAGE.some((f) => mutated.includes(f)));
    ok('document.body is touched exactly once, to append the host',
      (w.t.match(/document\.body/g) || []).length === 1 && /document\.body\.appendChild/.test(w.t));
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  try { db.close(); } catch (e) {}
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  server.close();
  process.exit(1);
});
