'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: a percentage is a percentage, and it matches its own fraction.
//
//  ── THE DEFECT, REPORTED BY TANNER ON 2026-09-11 ────────────────────────────
//  An AP Cyber 2.1 Lab column, priced at 30 points, read like this:
//
//      Leo byun        29 / 30     483%
//      Harry Jung      28 / 30     467%
//      PeterShin       23 / 25     100%
//      Leo              3 /  5      60%
//      CLASS AVERAGE                176%
//
//  Nothing was corrupted and no student had done anything strange. Two separate
//  faults stacked, and each is invisible on its own.
//
//  1. A CELL'S PERCENT AND ITS FRACTION CAME FROM DIFFERENT PLACES. The teacher
//     dashboard reads GET /api/teacher/classes/:code/progress, which carried
//     `score` straight off the progress table and `points_earned` /
//     `points_possible` off a sum of the score_events ledger. Two endpoints,
//     two arithmetics, nothing reconciling them. Whenever a page reports both a
//     whole-activity percent and per-item rows, they disagree, and the cell
//     renders one beside the other.
//
//  2. NOTHING CHECKED THAT THE PERCENT WAS A PERCENT. POST /api/student/progress
//     said "(0-100)" in its own error string and tested Number.isFinite. The lab
//     page scrapes the score it displays, that display counts only the questions
//     answered so far (board 291), so a student holding 29 points with 6 answered
//     posted round(29/6*100) and 483 was written to progress.score.
//
//     Note WHICH endpoint: per-item writes through /api/student/score clamp
//     points into [0, max] per row, so the ledger could never produce this. The
//     whole-activity percent was the only door, which is why the pair stayed
//     right at 29 / 30 the entire time and only the percent went mad.
//
//  The class average is then a mean of those percents, so one 483 drags the
//  whole column over 100 and the teacher cannot read their own gradebook.
//
//  ── AND A THIRD, FOUND ON THE WAY ───────────────────────────────────────────
//  Board 270 removed the scraped reporter carrier from three readers of the
//  score_events ledger and missed a fourth: this very route. So the dashboard a
//  teacher actually opens still showed Michelle's 1.1 Exercise 1 as 14 out of 14
//  under a /7 header after the fix shipped and the task was closed. Section 5
//  is that case, asserted against this route rather than against the contract.
//
//  Zero PII: synthetic names, a throwaway PIN, never printed.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:gradebookpct
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-gradebook-percent.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};

const app = express();
app.use(express.json());
app.use('/api/student', require('../routes/student'));
app.use('/api/teacher', require('../routes/teacher'));
const server = app.listen(0);
const base = () => `http://127.0.0.1:${server.address().port}`;
const call = (m, p, body, tok) => fetch(base() + p, {
  method: m,
  headers: Object.assign({ 'Content-Type': 'application/json' }, tok ? { Authorization: 'Bearer ' + tok } : {}),
  body: body ? JSON.stringify(body) : undefined,
}).then(async (r) => ({ status: r.status, body: await r.json() }));

const CY = 'ap-cybersecurity';
const U = 'unit-2', L = '2.1', A = 'lab';

(async () => {
  console.log('\nA PERCENTAGE IS A PERCENTAGE\n');

  console.log('0. A class, and the 2.1 Lab priced at 30 points as production prices it');
  const reg = await call('POST', '/api/teacher/register', {
    email: 'gradebook.pct@example.org', password: 'a-long-enough-password',
    name: 'Percent Smoke', school: 'Example High',
  });
  const tt = reg.body.token;
  ok('  teacher registered', reg.status === 201 && !!tt, reg.body);
  const cls = await call('POST', '/api/teacher/classes', { class_name: 'Percent P1', course: CY }, tt);
  const code = cls.body && cls.body.class && cls.body.class.class_code;
  ok('  class created', !!code, code);
  db.prepare(`INSERT INTO course_denominators (course,unit,lesson,activity_type,possible) VALUES
    (?,'unit-2','2.1','lab',30), (?,'unit-1','1.1','exercise-1',7), (?,'unit-1','1.1','exercise-2',8)`)
    .run(CY, CY, CY);

  const join = async (nm) => (await call('POST', '/api/student/join',
    { class_code: code, display_name: nm, pin: '1234' })).body.token;
  const item = (tok, lesson, act, it, earned, possible, unit) => call('POST', '/api/student/score',
    { course: CY, unit: unit || U, lesson, activity_type: act, item: it, earned, possible }, tok);
  const wholePct = (tok, score) => call('POST', '/api/student/progress',
    { course: CY, unit: U, lesson: L, activity_type: A, score, completed: true }, tok);
  const progress = async () => (await call('GET', '/api/teacher/classes/' + code + '/progress', null, tt)).body;
  const cellOf = (payload, name, unit, lesson, act) => {
    const s = payload.summary.find((x) => x.student.name === name);
    if (!s) return null;
    return ((s.detail[unit] || {})[lesson] || {})[act] || null;
  };

  // ── 1. THE WRITE GUARD ─────────────────────────────────────────────────────
  console.log('\n1. A number that is not a percentage never becomes a grade');
  const gs = await join('GuardStudent');
  const over = await wholePct(gs, 483);
  ok('  POST /progress refuses 483', over.status === 400, over.body);
  const neg = await wholePct(gs, -5);
  ok('  POST /progress refuses -5', neg.status === 400, neg.body);
  const nan = await wholePct(gs, 'seventy');
  ok('  POST /progress still refuses a non-number', nan.status === 400, nan.body);

  //  THE REFUSAL MUST NOT COST THE STUDENT THE GRADE THEY EARNED. This is the
  //  assertion that makes rejecting defensible instead of destructive: the
  //  per-item rows go through a different endpoint and are untouched.
  const after = await progress();
  const gcell = cellOf(after, 'GuardStudent', U, L, A);
  ok('  and nothing was stored for the refused write', !gcell || gcell.score == null, gcell);

  // The boundaries are INCLUSIVE. A guard that rejects a legitimate 0 or 100
  // would delete every perfect score and every zero in the course.
  const z = await join('ZeroStudent');
  ok('  0 is accepted', (await wholePct(z, 0)).status === 200);
  const h = await join('HundredStudent');
  ok('  100 is accepted', (await wholePct(h, 100)).status === 200);
  ok('  a fractional percent is accepted', (await wholePct(await join('FracStudent'), 87.5)).status === 200);

  console.log('\n2. The quiz path carries the same guard');
  const qs = await join('QuizStudent');
  const qOver = await call('POST', '/api/student/quiz',
    { course: CY, unit: U, lesson: L, answers: {}, score: 483 }, qs);
  ok('  POST /quiz refuses 483', qOver.status === 400, qOver.body);
  const qOk = await call('POST', '/api/student/quiz',
    { course: CY, unit: U, lesson: L, answers: {}, score: 88 }, qs);
  ok('  POST /quiz still accepts 88', qOk.status === 200, qOk.body);

  // ── 3. THE READ RECONCILIATION ─────────────────────────────────────────────
  //  The screenshot, rebuilt. Each student's per-item ledger is the truth; the
  //  page's own scraped summary is whatever it happened to compute.
  console.log('\n3. The screenshot, rebuilt: every percent equals its own fraction');
  const ROSTER = [
    // name,         per-item rows [earned, possible],            page's scraped percent
    ['Leo byun',     [[5, 5], [5, 5], [5, 5], [5, 5], [5, 5], [4, 5]], 483],
    ['Harry Jung',   [[5, 5], [5, 5], [5, 5], [5, 5], [4, 5], [4, 5]], 467],
    ['PeterShin',    [[5, 5], [5, 5], [5, 5], [4, 5], [4, 5]],         100],
    ['Raphael Oh',   [[5, 5], [5, 5], [5, 5]],                         100],
    ['Leo',          [[3, 5]],                                          60],
    ['maxK',         [[0, 5], [0, 5], [0, 5], [0, 5], [0, 5], [0, 5]],   0],
  ];
  for (const [name, rows, scraped] of ROSTER) {
    const tok = await join(name);
    for (const [i, [e, p]] of rows.entries()) await item(tok, L, A, 'task' + (i + 1), e, p);
    await wholePct(tok, scraped);   // refused when out of range, which is the point
  }
  //  AND NOW THE ROWS PRODUCTION ACTUALLY CARRIES. The write guard above stops
  //  new ones, so it also stops this suite from reaching the read path through
  //  the front door: Leo byun's 483 was refused, leaving him a clean 97 that
  //  proves nothing about reconciliation. His row on the live database was
  //  written before the guard existed and still says 483. Put it back by hand,
  //  because that is the state a teacher is looking at right now, and it is the
  //  read path alone that has to survive it.
  const forceScore = db.prepare(
    `UPDATE progress SET score = ? WHERE student_id =
       (SELECT id FROM students WHERE display_name = ?) AND lesson = ? AND activity_type = ?`);
  forceScore.run(483, 'Leo byun', L, A);
  forceScore.run(467, 'Harry Jung', L, A);

  const shot = await progress();
  const lab = ROSTER.map(([name]) => ({ name, c: cellOf(shot, name, U, L, A) }));

  for (const { name, c } of lab) {
    ok('  ' + name.padEnd(11) + ' percent is within 0 to 100',
      c && c.score >= 0 && c.score <= 100, c && c.score);
  }
  for (const { name, c } of lab) {
    const want = Math.round((c.points_earned / c.points_possible) * 100);
    ok('  ' + name.padEnd(11) + ' percent equals its own fraction',
      c.score === want, { shown: c.score, from_pair: want, pair: c.points_earned + '/' + c.points_possible });
  }
  //  The specific number from the report, so a regression names itself.
  const leo = lab.find((x) => x.name === 'Leo byun').c;
  ok('  Leo byun reads 29 / 30 at 97%, not 483%',
    leo.points_earned === 29 && leo.points_possible === 30 && leo.score === 97, leo);

  // ── 4. THE CLASS AVERAGE ───────────────────────────────────────────────────
  console.log('\n4. The column average a teacher reads is a possible number');
  //  Exactly the arithmetic shopify/cyber-dashboard.html runs on this payload:
  //  the mean of the started cells' percents. It was 176 on the live column.
  const started = lab.map((x) => x.c).filter((c) => c && c.score != null);
  const dashAvg = Math.round(started.reduce((a, c) => a + c.score, 0) / started.length);
  ok('  the mean of the cell percents is at most 100', dashAvg <= 100, dashAvg);
  //  And the points basis CLAUDE.md section 1b requires, for comparison. These
  //  two differ legitimately (a mean of percents weights a 5 point row like a
  //  30 point one); both must be possible numbers.
  const pe = started.reduce((a, c) => a + (c.points_earned || 0), 0);
  const pp = started.reduce((a, c) => a + (c.points_possible || 0), 0);
  const ptsAvg = Math.round((pe / pp) * 100);
  ok('  the points basis is at most 100', ptsAvg <= 100, { earned: pe, possible: pp, pct: ptsAvg });

  // ── 5. THE CARRIER, ON THIS ROUTE ──────────────────────────────────────────
  console.log('\n5. One run reported by two writers is still one run (board 270)');
  const m1 = await join('Michelle S1');
  await item(m1, '1.1', 'exercise-1', 'redflags', 7, 7, 'unit-1');
  await item(m1, '1.1', 'exercise-1', 'score', 7, 7, 'unit-1');
  //  The page whose ONLY writer is the scraped carrier. Excluding it outright
  //  is the fix somebody reaches for next, and it deletes this grade.
  await item(m1, '1.1', 'exercise-2', 'score', 12, 15, 'unit-1');
  const mp = await progress();
  const ex1 = cellOf(mp, 'Michelle S1', 'unit-1', '1.1', 'exercise-1');
  ok('  the doubled pair reads 7 / 7 under a /7 header, not 14 / 14',
    ex1 && ex1.points_earned === 7 && ex1.points_possible === 7, ex1);
  const ex2 = cellOf(mp, 'Michelle S1', 'unit-1', '1.1', 'exercise-2');
  ok('  a page whose only writer is the carrier keeps its grade',
    ex2 && ex2.points_earned === 12 && ex2.points_possible === 15, ex2);

  // ── 6. LEGACY ROWS ALREADY ON DISK ─────────────────────────────────────────
  console.log('\n6. A percent already stored out of range is capped, and says so');
  //  The write guard stops new ones. Production carries rows written before it,
  //  and a read path that trusts them prints 483% forever. Written straight to
  //  the table because the endpoint now refuses it, which is the point.
  const legacy = await join('LegacyRow');
  await call('POST', '/api/student/progress',
    { course: CY, unit: U, lesson: '2.4', activity_type: A, score: 90, completed: true }, legacy);
  db.prepare(`UPDATE progress SET score = 483 WHERE lesson = '2.4' AND activity_type = ?`).run(A);
  const lp = await progress();
  const lc = cellOf(lp, 'LegacyRow', U, '2.4', A);
  ok('  the stored 483 is served as 100', lc && lc.score === 100, lc);
  ok('  and the raw value is carried so the cap stays visible',
    lc && lc.score_out_of_range === 483, lc);

  // ── 7. REDERIVE ────────────────────────────────────────────────────────────
  //  A SECOND implementation, from the raw ledger, without reference to the
  //  route's SQL. Per CLAUDE.md: suite plus mutation is only this repo talking
  //  to itself. This reads score_events in JavaScript, applies the carrier rule
  //  by hand, and must agree with every priced cell the route served.
  console.log('\n7. Rederived from the raw ledger by a second implementation');
  const raw = db.prepare(
    `SELECT student_id, unit, lesson, activity_type, item, points, max_points
     FROM score_events WHERE course = ? AND item <> 'lesson-score'`).all(CY);
  const byCell = new Map();
  for (const r of raw) {
    const k = r.student_id + '|' + r.unit + '|' + r.lesson + '|' + r.activity_type;
    if (!byCell.has(k)) byCell.set(k, []);
    byCell.get(k).push(r);
  }
  const rederived = new Map();
  for (const [k, rows] of byCell) {
    const hasNamed = rows.some((r) => r.item !== 'score');
    const kept = rows.filter((r) => r.item !== 'score' || !hasNamed);
    const best = new Map();          // best points per distinct item
    for (const r of kept) {
      const cur = best.get(r.item);
      if (!cur || r.points > cur.points) best.set(r.item, r);
    }
    let e = 0, p = 0;
    for (const r of best.values()) { e += r.points; p += r.max_points; }
    rederived.set(k, { e, p, pct: p > 0 ? Math.round((e / p) * 100) : null });
  }
  const names = new Map(shot.summary.map((s) => [s.student.id, s.student.name]));
  let checked = 0, agreed = 0, drift = [];
  const fresh = await progress();
  for (const s of fresh.summary) {
    for (const [unit, lessons] of Object.entries(s.detail)) {
      for (const [lesson, acts] of Object.entries(lessons)) {
        for (const [act, cell] of Object.entries(acts)) {
          if (cell.points_possible == null) continue;
          const k = s.student.id + '|' + unit + '|' + lesson + '|' + act;
          const mine = rederived.get(k);
          if (!mine) continue;
          checked++;
          if (mine.e === cell.points_earned && mine.p === cell.points_possible
              && mine.pct === cell.score) agreed++;
          else drift.push({ who: names.get(s.student.id), lesson, act, route: cell, rederived: mine });
        }
      }
    }
  }
  ok('  the rederivation covered the priced cells', checked >= 8, checked);
  ok('  every priced cell agrees with the second implementation',
    drift.length === 0, drift.slice(0, 3));

  // ── 7b. A TEACHER'S RESET SURVIVES THE RECONCILIATION ──────────────────────
  //  Deriving the percent from the pair "whenever there is a pair" undoes a
  //  reset, and the first draft of this fix did exactly that. A reset nulls
  //  progress.score and stamps score_reset_at, but the ledger is append-only
  //  and keeps every row, so the pair is still sitting there. Nothing else in
  //  the repo caught it: the pair had always been left populated behind a null
  //  score, and until this change no reader looked at it.
  console.log('\n7b. A reset cell stays reset, with the ledger still full of rows');
  const rs = await join('ResetMe');
  await item(rs, '2.5', A, 'q1', 3, 7);
  const before = cellOf(await progress(), 'ResetMe', U, '2.5', A);
  ok('  the cell has a grade to begin with', before && before.score === 43, before);
  await call('PATCH', '/api/teacher/classes/' + code + '/progress/' + before.progress_id
    + '/unlock', { reset: true }, tt);
  const afterReset = cellOf(await progress(), 'ResetMe', U, '2.5', A);
  ok('  after the reset the percent is gone, not recomputed from the ledger',
    afterReset && afterReset.score == null, afterReset);
  const stillThere = db.prepare(
    `SELECT COUNT(*) n FROM score_events WHERE lesson = '2.5' AND activity_type = ?`).get(A).n;
  ok('  and the ledger rows are all still there, which is what made it a trap',
    stillThere > 0, stillThere);

  // ── 8. THE CSV A TEACHER IMPORTS INTO THEIR REAL GRADEBOOK ─────────────────
  //  The same two faults reach further here than on the screen. A teacher can
  //  disbelieve 483% in a browser; once it is imported into their SIS it is a
  //  grade. This route builds its own progress map and its own ledger sum, so
  //  the dashboard being right says nothing about it.
  console.log('\n8. The CSV export carries neither fault');
  const csv = await fetch(base() + '/api/teacher/classes/' + code + '/export',
    { headers: { Authorization: 'Bearer ' + tt } }).then((r) => r.text());
  const cells = csv.split(/\r?\n/).slice(1)
    .flatMap((line) => line.split(',')) 
    .map((c) => c.replace(/^"|"$/g, '').trim());
  const bigPct = cells.filter((c) => /^\d+(\.\d+)?%$/.test(c) && parseFloat(c) > 100);
  const bigBare = cells.filter((c) => /^\d{3,}$/.test(c) && Number(c) > 100 && Number(c) < 10000);
  ok('  no exported percentage is above 100', bigPct.length === 0, bigPct.slice(0, 5));
  ok('  the raw 483 does not appear anywhere in the file',
    !/\b483\b/.test(csv) && !/\b467\b/.test(csv), bigBare.slice(0, 5));
  //  And the carrier, on this route's own copy of the ledger sum.
  ok('  the doubled pair exports as 7/7, never 14/14',
    csv.includes('7/7') && !csv.includes('14/14'),
    cells.filter((c) => c.indexOf('/') > 0).slice(0, 12));
  ok('  a carrier-only page still exports its grade', csv.includes('12/15'),
    cells.filter((c) => c.indexOf('/') > 0).slice(0, 12));

  console.log('\n──────────────────────────────────────────');
  console.log(pass + ' passed, ' + fail + ' failed');
  server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
