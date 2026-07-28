'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: quiz / exercise answer parsing.
//
//  THE BUG THIS GUARDS: /api/quiz/submit required a literal integer on
//  `chosen_index` and SILENTLY DROPPED anything else, scoring those questions
//  wrong. A page sending "2" instead of 2, or naming the field `chosen`, got a
//  confident "0 out of 5" with a 200 response and no signal anywhere that the
//  submission had not been understood. That is exactly the reported symptom:
//  every exercise showing 0/5 no matter what the student answered.
//
//  The contract now: be liberal about the shape, and refuse loudly when a value
//  genuinely cannot be read. A skipped question is a real zero; an uninterpretable
//  answer is a bug, and the two must never look the same.
//
//  Run: npm run smoke:quizparse
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-quizparse.db');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-quizparse-jwt-0123456789';
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signStudentToken } = require('../utils');

const app = express();
app.use(express.json());
app.use('/api/quiz', require('../routes/quiz'));

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  [PASS] ' + n); } else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); } };

const QN = 5;
db.prepare(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t','T','t@x.org','x')`).run();
// retry_allowed so each fixture student may submit; a fresh student per trial
// anyway, since a graded activity locks after its first submission.
db.prepare(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,retry_allowed)
            VALUES ('c','CSA-Q','C','ap-csa','t',1,1)`).run();
for (let i = 0; i < QN; i++) {
  db.prepare(`INSERT INTO quiz_bank (qid,course,unit,lesson,activity_type,q_order,prompt,options,correct_index,points,active)
              VALUES (?,?,?,?,?,?,?,?,?,?,1)`)
    .run('ex' + i, 'ap-csa', 'unit-1', '1.1', 'exercise-1', i, 'Q' + i,
         JSON.stringify(['a', 'b', 'c', 'd']), i % 4, 1);
}

(async () => {
  const base = await new Promise((r) => { const s = app.listen(0, () => r('http://127.0.0.1:' + s.address().port)); });
  let n = 0;

  // Render the exercise for a brand new student, answer every question CORRECTLY,
  // and let the caller decide the wire shape of each answer.
  async function submitAllCorrect(makeAnswer) {
    const sid = 's' + (++n);
    db.prepare(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES (?,?,?,?)`).run(sid, 'c', 'S' + n, 'x');
    const H = {
      Authorization: 'Bearer ' + signStudentToken({ id: sid, class_id: 'c', display_name: 'S' }),
      'Content-Type': 'application/json',
    };
    const q = await (await fetch(base + '/api/quiz/ap-csa/unit-1/1.1/exercise-1', { headers: H })).json();
    const answers = q.questions.map((qq) => {
      const row = db.prepare('SELECT options, correct_index FROM quiz_bank WHERE qid = ?').get(qq.qid);
      const shown = qq.options.indexOf(JSON.parse(row.options)[row.correct_index]);
      return makeAnswer(qq, shown, row.correct_index);
    });
    const res = await fetch(base + '/api/quiz/submit', {
      method: 'POST', headers: H, body: JSON.stringify({ order_token: q.order_token, answers }),
    });
    return { status: res.status, body: await res.json() };
  }
  const full = (r) => r.status === 200 && r.body.score === QN && r.body.total === QN;

  console.log('the contract shape still works');
  ok('integer chosen_index scores full marks', full(await submitAllCorrect((q, s) => ({ qid: q.qid, chosen_index: s }))));

  console.log('shapes that used to silently score 0/5');
  ok('numeric STRING chosen_index', full(await submitAllCorrect((q, s) => ({ qid: q.qid, chosen_index: String(s) }))));
  ok('field named "chosen"', full(await submitAllCorrect((q, s) => ({ qid: q.qid, chosen: s }))));
  ok('field named "answer"', full(await submitAllCorrect((q, s) => ({ qid: q.qid, answer: s }))));
  ok('field named "selected"', full(await submitAllCorrect((q, s) => ({ qid: q.qid, selected: s }))));
  ok('field named "index"', full(await submitAllCorrect((q, s) => ({ qid: q.qid, index: s }))));
  ok('letter A/B/C/D', full(await submitAllCorrect((q, s) => ({ qid: q.qid, chosen_index: 'ABCD'[s] }))));
  ok('lowercase letter a/b/c/d', full(await submitAllCorrect((q, s) => ({ qid: q.qid, chosen_index: 'abcd'[s] }))));
  ok('whitespace-padded string " 2 "', full(await submitAllCorrect((q, s) => ({ qid: q.qid, chosen_index: ' ' + s + ' ' }))));

  console.log('wrong answers must still be wrong');
  const wrong = await submitAllCorrect((q, s) => ({ qid: q.qid, chosen_index: (s + 1) % 4 }));
  ok('deliberately wrong answers do not score full', wrong.status === 200 && wrong.body.score < QN, wrong.body);

  console.log('unreadable vs skipped are distinguished');
  const garbage = await submitAllCorrect((q) => ({ qid: q.qid, chosen_index: { nope: 1 } }));
  ok('object value is REJECTED, not scored 0', garbage.status === 400, garbage);
  ok('rejection names the offending questions', Array.isArray(garbage.body.unparsed) && garbage.body.unparsed.length === QN,
    garbage.body.unparsed && garbage.body.unparsed.length);
  ok('rejection explains the accepted shapes', /chosen_index/.test(garbage.body.detail || ''), garbage.body.detail);
  const boolAns = await submitAllCorrect((q) => ({ qid: q.qid, chosen_index: true }));
  ok('boolean value is REJECTED', boolAns.status === 400, boolAns.status);

  const skipped = await submitAllCorrect((q) => ({ qid: q.qid, chosen_index: null }));
  ok('null is a real skip, scored 0 with 200', skipped.status === 200 && skipped.body.score === 0, skipped.body);
  const omitted = await submitAllCorrect((q) => ({ qid: q.qid }));
  ok('omitted field is a real skip, scored 0 with 200', omitted.status === 200 && omitted.body.score === 0, omitted.body);

  console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
