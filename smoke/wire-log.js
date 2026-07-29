'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: the wire log.
//  A diagnostic that records live student submissions has to be held to a higher
//  bar than the thing it diagnoses: it must never retain answer text or a student
//  name, and it must never be able to grow. Both are asserted here.
//
//  Run: npm run smoke:wirelog
// ─────────────────────────────────────────────────────────────────────────────
const wire = require('../lib/wire-log');

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  [PASS] ' + n); } else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); } };

console.log('shape capture');
wire.record({
  endpoint: 'POST /api/quiz/submit',
  student_id: 'student-abc-123',
  status: 200,
  result: { score: 0, total: 5 },
  body: {
    course: 'ap-csa', unit: 'unit-1', lesson: '1.1', activity_type: 'exercise-1',
    order_token: 'tok.tok.tok',
    answers: [
      { qid: 'q1', chosen: 'B', text: 'the student typed this long free response' },
      { qid: 'q2', chosen: 'C', text: 'another typed answer' },
    ],
  },
});
let e = wire.recent(1)[0];
ok('records the endpoint', e.endpoint === 'POST /api/quiz/submit', e.endpoint);
ok('records the activity type', e.activity_type === 'exercise-1', e.activity_type);
ok('records the location', e.course === 'ap-csa' && e.lesson === '1.1');
ok('records the outcome', e.result.score === 0 && e.result.total === 5, e.result);
ok('lists the answer key set', e.answers.key_sets[0].keys === 'chosen,qid,text', e.answers.key_sets);
ok('types the chosen value', e.answers.chosen_value_types[0].shape === 'chosen:string', e.answers.chosen_value_types);
ok('keeps a short choice value (not PII)', e.answers.sample[0].chosen.v === 'B', e.answers.sample[0]);

console.log('PII discipline');
const blob = JSON.stringify(wire.recent(10));
ok('free text is NOT retained', !blob.includes('the student typed this'), 'leaked typed text');
const TYPED = 'the student typed this long free response';
ok('  only its length is kept', e.answers.sample[0].text.len === TYPED.length && e.answers.sample[0].text.v === undefined,
  e.answers.sample[0].text);
ok('raw student id is NOT retained', !blob.includes('student-abc-123'));
ok('  a short hash is kept instead', typeof e.student === 'string' && e.student.length === 8, e.student);
ok('the same student hashes consistently', (function () {
  wire.record({ endpoint: 'x', student_id: 'student-abc-123', status: 200, body: {} });
  return wire.recent(1)[0].student === e.student;
})());

console.log('the attempt-level shape is readable too');
// A live reading showed every /api/progress/attempt entry with a null lesson,
// null activity, and no max_score: that endpoint names its fields lesson_id /
// item_type / item_id / detail, and the log only knew the ledger path's names.
// A submission logged with no location and no denominator answers nothing.
wire.record({
  endpoint: 'POST /api/progress/attempt',
  student_id: 's3',
  status: 200,
  body: {
    course: 'ap-csa', lesson_id: '1.1', item_id: '1.1-cfu-3', item_type: 'cfu',
    score: 0, max_score: 5, duration_seconds: 41,
    detail: [{ q: 1, sel: 2, ok: false }, { q: 2, sel: 0, ok: true }],
  },
  result: { score: 0, max_score: 5, passed: false, attempt_no: 2 },
});
e = wire.recent(1)[0];
ok('lesson_id is read as the lesson', e.lesson === '1.1', e.lesson);
ok('item_type is read as the activity', e.activity_type === 'cfu', e.activity_type);
ok('item_id is captured verbatim, not reduced to a length', e.item === '1.1-cfu-3', e.item);
ok('  and is not duplicated into fields', !('item_id' in e.fields) && !('item' in e.fields), e.fields);
ok('max_score is captured', e.fields.max_score.v === 5, e.fields);
ok('  so "0 out of what" has an answer', e.fields.score.v === 0 && e.fields.max_score.v === 5, e.fields);
ok('duration is captured', e.fields.duration_seconds.v === 41, e.fields);
ok('detail is read as the answers array', e.answers.present === true && e.answers.count === 2, e.answers);
ok('  and is labelled as detail, not answers', e.answers.field === 'detail', e.answers.field);
ok('  with the chosen index typed', e.answers.chosen_value_types[0].shape === 'sel:number', e.answers.chosen_value_types);
ok('the grade of record is visible', e.result.attempt_no === 2 && e.result.max_score === 5, e.result);
ok('the ledger shape still reads as answers', (function () {
  wire.record({ endpoint: 'x', student_id: 's3', status: 200,
    body: { answers: [{ qid: 'q1', chosen_index: 1 }] } });
  return wire.recent(1)[0].answers.field === 'answers';
})());
ok('a body with neither is labelled null', (function () {
  wire.record({ endpoint: 'x', student_id: 's3', status: 200, body: { course: 'ap-csa' } });
  return wire.recent(1)[0].answers.field === null;
})());

console.log('numbers are kept, they are not PII');
wire.record({ endpoint: 'POST /api/student/score', student_id: 's2', status: 200,
  body: { course: 'ap-csa', unit: 'unit-1', lesson: '1.2', activity_type: 'exercise-2',
          points: 3, max_points: 6, correct: false } });
e = wire.recent(1)[0];
ok('numeric fields retained verbatim', e.fields.points.v === 3 && e.fields.max_points.v === 6, e.fields);
ok('booleans retained verbatim', e.fields.correct.v === false, e.fields.correct);

console.log('memory is bounded');
const before = wire.stats().capacity;
for (let i = 0; i < 1000; i++) wire.record({ endpoint: 'flood', student_id: 's' + i, status: 200, body: {} });
const st = wire.stats();
ok('buffer never exceeds capacity', st.buffer_size <= st.capacity, st);
ok('capacity is fixed', st.capacity === before, st);
ok('total counter still tracks everything seen', st.captured_total > st.buffer_size, st);
ok('oldest entries are evicted', !JSON.stringify(wire.recent(200)).includes('/api/quiz/submit'));

console.log('never throws on hostile input');
ok('null body survives', (function () { wire.record({ endpoint: 'n', body: null, status: 0 }); return true; })());
ok('circular body survives', (function () {
  const c = {}; c.self = c;
  wire.record({ endpoint: 'c', body: { answers: [c] }, status: 0 });
  return true;
})());
ok('non-array answers survive', (function () {
  wire.record({ endpoint: 'a', body: { answers: 'not-an-array' }, status: 0 });
  return wire.recent(1)[0].answers.present === false;
})());

console.log('capture allowlist');
const paths = [...wire.CAPTURE_PATHS];
['/api/quiz/submit','/api/student/score','/api/student/quiz','/api/student/quiz/finalize',
 '/api/student/track','/api/student/code-grade','/api/progress/attempt'].forEach((p) => {
  ok('covers ' + p, wire.CAPTURE_PATHS.has(p));
});
// Auth routes carry names and PINs and must never be capturable, even by accident.
['/api/student/login','/api/student/join','/api/student/solo-init','/api/student/solo-login',
 '/api/teacher/login','/api/teacher/register','/admin/login'].forEach((p) => {
  ok('EXCLUDES ' + p, !wire.CAPTURE_PATHS.has(p));
});

console.log('middleware gating');
function fakeReq(method, path) { return { method, path, student: { id: 's1' } }; }
function fakeRes() {
  const handlers = {};
  return { statusCode: 200, on: (ev, fn) => { handlers[ev] = fn; }, fire: (ev) => handlers[ev] && handlers[ev]() };
}
const beforeN = wire.stats().captured_total;
let called = 0;
wire.middleware(fakeReq('GET', '/api/student/score'), fakeRes(), () => { called++; });
wire.middleware(fakeReq('POST', '/api/student/login'), fakeRes(), () => { called++; });
ok('always calls next()', called === 2, called);
ok('GET is not captured', wire.stats().captured_total === beforeN);
ok('non-allowlisted POST is not captured', wire.stats().captured_total === beforeN);

const res1 = fakeRes();
wire.middleware(fakeReq('POST', '/api/student/score'), res1, () => {});
res1.fire('finish');
ok('allowlisted POST is captured on finish', wire.stats().captured_total === beforeN + 1);
res1.fire('close');
ok('  and only once even if close also fires', wire.stats().captured_total === beforeN + 1);

// A handler that logged the richer entry must suppress the middleware's.
const req2 = fakeReq('POST', '/api/quiz/submit');
const res2 = fakeRes();
wire.middleware(req2, res2, () => {});
wire.recordOnce(req2, { endpoint: 'POST /api/quiz/submit', body: {}, status: 200, result: { score: 5, total: 5 } });
const afterHandler = wire.stats().captured_total;
res2.fire('finish');
ok('handler entry suppresses the middleware duplicate', wire.stats().captured_total === afterHandler,
  { afterHandler, now: wire.stats().captured_total });

console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
process.exit(fail ? 1 : 0);
