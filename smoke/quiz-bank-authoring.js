'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: the quiz bank authoring contract.
//
//  WHY THIS EXISTS
//  A teacher reported that the AP Cyber 1.1 and 1.2 online quizzes read like the
//  teacher-facing documents: stems opened "Per EK 1.1.A.2, ..." and one question
//  used bare EK codes as its four answer choices. Those citations belong in the
//  teacher bundle. In front of a student they are register noise at best, and at
//  worst they hand over the exact search term that finds the answer.
//
//  Stripping them once fixes two lessons. The other 25 Unit 1 quiz pages are
//  still unaudited, and every one of them will be transcribed from the same
//  teacher documents, so the fix has to be a rule rather than an edit.
//
//  WHAT IS PINNED
//   1. No question this repo seeds carries a citation in a field a student can
//      see. Checked at the source AND again on the rendered payload, because a
//      clean source that renders dirty is still a dirty quiz.
//   2. The rendered payload still withholds correct_index and explanation.
//      Explanations DO cite EKs on purpose: they ship only after a teacher
//      releases the key, where naming the EK is the useful thing to do.
//   3. A deploy CONVERGES quiz_bank onto seed/. This was insert-or-ignore, which
//      meant an approved wording fix could deploy green and change nothing live.
//   4. A question dropped from seed/ is retired, not deleted: active = 0 so it
//      stops being served, row intact so score_events tied to it still resolve.
//   5. Converging never moves an answer key.
//
//  Offline and secret-free: throwaway SQLite file, no network beyond loopback.
//
//  Zero PII: authored content and synthetic ids only.
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-quiz-authoring.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { seedQuizBank } = require('../scripts/seed-quiz-bank');
// Every bank the seed script loads, so adding a lesson never breaks this suite.
const SOURCES = [
  ...require('../seed/cyber-unit-1-web-quizzes'),
];
const TOTAL = SOURCES.reduce((n, p) => n + p.questions.length, 0);

const COURSE = 'ap-cybersecurity';
const UNIT = 'unit-1';

// A citation is teacher-register: an Essential Knowledge or Learning Objective
// code, or the CED / CB shorthand for the College Board framework itself.
const CITATION = /\bEK\b|\bLO\s*\d|\bCED\b|\bCB\b/;

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

const app = express();
app.use(express.json());
app.use('/api/quiz', require('../routes/quiz'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
const get = (url) => fetch(base() + url).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

(async () => {
  console.log('\n-- 1. no citation in any student-facing field, at the source --');
  for (const pack of SOURCES) {
    const dirty = [];
    for (const q of pack.questions) {
      if (CITATION.test(q.prompt)) dirty.push({ qid: q.qid, where: 'prompt', text: q.prompt.slice(0, 60) });
      q.options.forEach((o, i) => {
        if (CITATION.test(o)) dirty.push({ qid: q.qid, where: 'option ' + 'ABCD'[i], text: o.slice(0, 60) });
      });
    }
    ok(`lesson ${pack.location.lesson}: ${pack.questions.length} questions, 0 citations in prompts or options`,
      dirty.length === 0, dirty);
  }

  console.log('\n-- 2. explanations keep their citations (teacher-released only) --');
  const cited = SOURCES.flatMap(p => p.questions).filter(q => q.explanation && CITATION.test(q.explanation));
  ok('explanations still cite the CED, which is where that belongs', cited.length > 0, { cited: cited.length });

  console.log('\n-- 3. seed, then check the rendered payload --');
  const first = seedQuizBank();
  ok(`first seed inserts every source question (${TOTAL} across ${SOURCES.length} locations)`,
    first.inserted === first.total && first.total === TOTAL, { first, TOTAL });

  for (const pack of SOURCES) {
    const r = await get(`/api/quiz/${COURSE}/${UNIT}/${pack.location.lesson}/quiz`);
    const qs = (r.body && r.body.questions) || [];
    ok(`lesson ${pack.location.lesson} renders ${pack.questions.length} questions`,
      r.status === 200 && qs.length === pack.questions.length, { status: r.status, got: qs.length });

    const dirty = qs.filter(q => CITATION.test(q.prompt) || (q.options || []).some(o => CITATION.test(o)));
    ok(`lesson ${pack.location.lesson} rendered payload carries no citation`, dirty.length === 0,
      dirty.map(q => q.prompt.slice(0, 60)));

    const leaked = qs.filter(q => q.correct_index !== undefined || q.explanation !== undefined);
    ok(`lesson ${pack.location.lesson} rendered payload withholds correct_index and explanation`,
      leaked.length === 0, leaked.length);
  }

  console.log('\n-- 4. a deploy converges quiz_bank onto seed/ --');
  const victim = SOURCES[0].questions[0];
  db.prepare('UPDATE quiz_bank SET prompt = ? WHERE qid = ?').run('STALE WORDING FROM A PREVIOUS DEPLOY', victim.qid);
  const before = db.prepare('SELECT prompt FROM quiz_bank WHERE qid = ?').get(victim.qid).prompt;
  ok('setup: the row is stale', before === 'STALE WORDING FROM A PREVIOUS DEPLOY');

  const second = seedQuizBank();
  const after = db.prepare('SELECT prompt FROM quiz_bank WHERE qid = ?').get(victim.qid).prompt;
  ok('re-seeding restores the source wording', after === victim.prompt, { after: after.slice(0, 60) });
  ok('re-seeding reports the refresh rather than silently no-op', second.updated === second.total, second);
  ok('re-seeding inserts nothing new', second.inserted === 0, second);

  console.log('\n-- 5. an answer key never moves on converge --');
  const keys = {};
  for (const pack of SOURCES) {
    keys[pack.location.lesson] = db.prepare(
      'SELECT qid, correct_index FROM quiz_bank WHERE course=? AND unit=? AND lesson=? AND activity_type=? ORDER BY q_order'
    ).all(COURSE, UNIT, pack.location.lesson, 'quiz').map(r => r.correct_index).join('');
  }
  // Derived from the source rather than pinned to a literal: the meaningful
  // property is that seeding stores the authored key exactly, not that any
  // particular string survives. Content changes should not turn this suite red.
  for (const pack of SOURCES) {
    const want = pack.questions.map(q => q.correct_index).join('');
    ok(`lesson ${pack.location.lesson} key round-trips through quiz_bank unchanged`,
      keys[pack.location.lesson] === want, { got: keys[pack.location.lesson], want });
  }

  console.log('\n-- 6. a question dropped from seed/ is retired, not deleted --');
  const GHOST = `${COURSE}:${UNIT}:1.1:quiz#99`;
  db.prepare(`INSERT INTO quiz_bank (qid,course,unit,lesson,activity_type,q_order,prompt,options,correct_index,points,active)
              VALUES (?,?,?,?,?,99,'A question no longer in the seed file','["a","b"]',0,1,1)`)
    .run(GHOST, COURSE, UNIT, '1.1', 'quiz');
  const rendered = (await get(`/api/quiz/${COURSE}/${UNIT}/1.1/quiz`)).body.questions.length;
  const N11 = SOURCES.find(p => p.location.lesson === '1.1').questions.length;
  ok('setup: the stale question is being served', rendered === N11 + 1, { rendered, N11 });

  const third = seedQuizBank();
  ok('the seed reports exactly one retirement', third.retired === 1, third);
  const ghost = db.prepare('SELECT active FROM quiz_bank WHERE qid = ?').get(GHOST);
  ok('the retired row still EXISTS, so score_events tied to it still resolve', !!ghost);
  ok('the retired row is deactivated rather than deleted', ghost && ghost.active === 0, ghost);
  const afterRetire = (await get(`/api/quiz/${COURSE}/${UNIT}/1.1/quiz`)).body.questions.length;
  ok('it stops being served', afterRetire === N11, { afterRetire, N11 });

  const live = db.prepare(
    `SELECT COUNT(*) n FROM quiz_bank WHERE course=? AND unit=? AND activity_type='quiz' AND active=1`
  ).get(COURSE, UNIT).n;
  ok(`retirement touched nothing else: ${TOTAL} real questions still active`, live === TOTAL, { live, TOTAL });

  const fourth = seedQuizBank();
  ok('retirement is idempotent, a second run retires nothing', fourth.retired === 0, fourth);

  console.log('\n-- 7. a bundle-derived bank cannot come back by accident --');
  // The 1.1 and 1.2 banks were briefly transcribed from the teacher bundle and
  // served online, which is the exposure the whole web-quiz rule exists to prevent.
  // Those rows used a plain #N qid series; everything authored for the web uses #wN.
  // So an active non-#w row at a web-quiz location means a bundle bank has been
  // reintroduced, and this fails rather than letting it ship quietly.
  db.prepare(`INSERT INTO quiz_bank (qid,course,unit,lesson,activity_type,q_order,prompt,options,correct_index,points,active)
              VALUES (?,?,?,?,?,0,'a bundle question','["a","b"]',0,1,1)`)
    .run(`${COURSE}:${UNIT}:1.1:quiz#1`, COURSE, UNIT, '1.1', 'quiz');
  seedQuizBank();
  const strays = db.prepare(
    `SELECT qid FROM quiz_bank WHERE course=? AND unit=? AND activity_type='quiz'
       AND active=1 AND qid NOT LIKE '%#w%'`
  ).all(COURSE, UNIT);
  ok('a plain #N row at a web-quiz location is retired on the next seed',
    strays.length === 0, strays.map(r => r.qid));

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  db.close();
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})();
