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

console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
process.exit(fail ? 1 : 0);
