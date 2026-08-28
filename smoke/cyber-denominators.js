'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: page-derived cyber denominators, and the column map the header needs.
//
//  The gradebook printed "Ex 1 /5" above every exercise because the page had no
//  source for a column denominator and fell back to a per-activity constant.
//  The totals actually differ: Unit 1 Exercise 1 has seven red flags and is out
//  of 7, Unit 2 Exercise 1 is out of 6. A constant cannot express that.
//
//  Two things have to hold for a normal gradebook:
//    1. the authored value per lesson+activity is what the page states, and
//       different lessons keep different values
//    2. the teacher endpoint hands the page a COLUMN map, so a header can show
//       the right "out of" before any student has submitted
//
//  And one thing must not: a column with no authored value must be ABSENT from
//  that map, never defaulted, so the page can tell "out of 7" from "unknown"
//  and render no denominator rather than a wrong one.
//
//  Zero PII: author content and synthetic students only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:cyberdenoms
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-cyber-denoms.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const express = require('express');
const db = require('../db');
const { signTeacherToken } = require('../utils');
const {
  seedCyberDenominators, POINTS, MEASURED_UNPRICEABLE, EXAM_UNPRICEABLE,
} = require('../scripts/seed-cyber-denominators');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

console.log('\nCYBER DENOMINATORS (page-derived)\n');

// ── 1. The values themselves ─────────────────────────────────────────────────
console.log('1. Per-lesson values, as the pages state them');
{
  ok('  1.1 exercise-1 is out of 7 (seven red flags)', POINTS['1.1|exercise-1'] === 7, POINTS['1.1|exercise-1']);
  ok('  2.1 exercise-1 is out of 6, NOT 7', POINTS['2.1|exercise-1'] === 6, POINTS['2.1|exercise-1']);
  ok('  1.1 exercise-2 is out of 8', POINTS['1.1|exercise-2'] === 8, POINTS['1.1|exercise-2']);
  ok('  1.5 exercise-1 is out of 4', POINTS['1.5|exercise-1'] === 4, POINTS['1.5|exercise-1']);

  // Units 4 and 5 are covered by the full scan, and lessons the course config
  // was missing entirely (4.4, 4.5) are authored too.
  ok('  4.5 quiz is authored', POINTS['4.5|quiz'] > 0, POINTS['4.5|quiz']);
  ok('  5.6 exercise-2 is authored', POINTS['5.6|exercise-2'] > 0, POINTS['5.6|exercise-2']);
  ok('  4.4 and 4.5 carry values',
    ['4.4|quiz', '4.5|quiz'].every((k) => POINTS[k] > 0));

  //  Unit 3 was renumbered to the CED on 2026-08-27 and 3.6 is gone: it was
  //  never a CED topic, and its content is now 3.2. This used to assert
  //  '3.6|quiz' carried a value. Keeping the retired key here would have
  //  authored a column for a lesson that no longer exists, which is the same
  //  defect the 2.5 assertion below exists to prevent.
  ok('  3.6 is NOT authored, because the CED has no 3.6',
    !Object.keys(POINTS).some((k) => k.startsWith('3.6|')),
    Object.keys(POINTS).filter((k) => k.startsWith('3.6|')));

  //  The two halves of CED 3.1 carry separate keys. One shared id would
  //  collapse eight gradebook columns into four.
  ok('  3.1a and 3.1b are authored separately',
    POINTS['3.1a|quiz'] > 0 && POINTS['3.1b|quiz'] > 0,
    [POINTS['3.1a|quiz'], POINTS['3.1b|quiz']]);

  //  3.5 is the only Unit 3 activity set with its own totals, and the only one
  //  whose number did not change in the renumbering. If a careless swap had
  //  mis-keyed the block, this is where it would show.
  ok('  3.5 kept its own totals through the renumbering',
    POINTS['3.5|quiz'] === 10 && POINTS['3.5|lab'] === 24,
    [POINTS['3.5|quiz'], POINTS['3.5|lab']]);

  // Cyber Unit 2 is 2.1 through 2.4. A 2.5 page set exists on the storefront
  // but the lesson does not exist in the course, so authoring it would render a
  // column for a lesson no student can take.
  ok('  2.5 is NOT authored, because the lesson does not exist',
    !Object.keys(POINTS).some((k) => k.startsWith('2.5|')),
    Object.keys(POINTS).filter((k) => k.startsWith('2.5|')));

  // The whole point: one constant per activity type could never be right.
  // The full scan does turn up a 5 somewhere, so the claim is not that 5 is
  // never correct. It is that no single value covers the column set, which is
  // what the hardcoded page constant assumed.
  const ex1vals = Object.entries(POINTS)
    .filter(([k]) => k.endsWith('|exercise-1')).map(([, v]) => v);
  const ex1 = new Set(ex1vals);
  ok('  exercise-1 takes several distinct values', ex1.size >= 5, [...ex1].sort((a, b) => a - b));

  const commonest = Math.max(...[...ex1].map((v) => ex1vals.filter((x) => x === v).length));
  ok('  no single value covers even half the exercise-1 columns',
    commonest < ex1vals.length / 2, { commonest, of: ex1vals.length });
  // Stated as wrongness, not rightness: the page's hardcoded 5 produced a wrong
  // denominator on at least three quarters of exercise-1 columns. It happens to
  // be correct on a handful, which is precisely why the bug was easy to miss.
  const wrong = ex1vals.filter((v) => v !== 5).length;
  ok('  the hardcoded 5 was wrong on at least 3 of every 4 columns',
    wrong >= ex1vals.length * 0.75, { wrong, of: ex1vals.length });

  ok('  no value is zero or negative', Object.values(POINTS).every((v) => v > 0));

  // ── Measured but deliberately unpriced ─────────────────────────────────────
  //  A denominator is half of a pair. Authoring one for a column whose page
  //  cannot report a score grows items_total and drags pace down for every
  //  student in the class, for work none of them can submit. That rule still
  //  holds; what changed on 2026-08-25 is that these five columns CAN report.
  //
  //  The table is now empty and stays in the file as the parking bay for the
  //  next column plus a record of how this one went wrong. See the comment on
  //  MEASURED_UNPRICEABLE itself.
  const unpriceable = Object.keys(MEASURED_UNPRICEABLE);
  ok('  the measured-unpriceable table is empty: nothing is parked', unpriceable.length === 0, unpriceable);
  ok('  any entry that IS parked still records value, evidence and blocker',
    unpriceable.every((k) => {
      const e = MEASURED_UNPRICEABLE[k];
      return e && typeof e.possible === 'number' && e.possible > 0
        && typeof e.evidence === 'string' && e.evidence.length > 10
        && typeof e.blocker === 'string' && e.blocker.length > 5;
    }));
  {
    const leaked = unpriceable.filter((k) => POINTS[k] !== undefined);
    ok('  nothing is in both tables at once', leaked.length === 0, leaked);
  }

  //  The five that moved, pinned at the values they were re-read at. If someone
  //  re-reads a page and gets a different number, that is a real change on the
  //  storefront and should surface as a failing test rather than as a silently
  //  edited constant. These were held out of the gradebook for four days on a
  //  blocker that was fixed (1.2's nav anchors, theme PR #64) and one that was
  //  never real (1.3's "no fetch in the page body": apcs-tracker.js reports for
  //  the page).
  ok('  1.2 exercise-1 is priced at 24', POINTS['1.2|exercise-1'] === 24, POINTS['1.2|exercise-1']);
  ok('  1.2 exercise-2 is priced at 30', POINTS['1.2|exercise-2'] === 30, POINTS['1.2|exercise-2']);
  ok('  1.3 exercise-1 is priced at 24', POINTS['1.3|exercise-1'] === 24, POINTS['1.3|exercise-1']);
  ok('  1.3 exercise-2 is priced at 24', POINTS['1.3|exercise-2'] === 24, POINTS['1.3|exercise-2']);
  ok('  1.3 quiz is priced at 5', POINTS['1.3|quiz'] === 5, POINTS['1.3|quiz']);

  //  1.1 lab was in NEITHER table, which is the quietest way for a column to go
  //  missing: not parked with a reason, just absent. 68 students had already
  //  scored it.
  ok('  1.1 lab is priced at 24', POINTS['1.1|lab'] === 24, POINTS['1.1|lab']);

  //  Lesson 1.3 was the one absent entirely rather than parked. Pin the whole
  //  set so a partial move cannot happen.
  {
    const l13 = Object.keys(POINTS).filter((k) => k.startsWith('1.3|'));
    ok('  all three 1.3 columns are priced', l13.length === 3, l13);
  }

  // ── The five per-unit exams ────────────────────────────────────────────────
  //  These cannot be keyed here at all: all five collapse onto lesson 'exam',
  //  which is what course_unit_denominators exists for. They stay unpriced for
  //  the same reason as above, and the count is recorded so that "we never
  //  checked" can never again be confused with "it cannot report".
  {
    const units = Object.keys(EXAM_UNPRICEABLE);
    ok('  all five unit exams are measured', units.length === 5, units);
    ok('  every unit exam is out of 20',
      units.every((u) => EXAM_UNPRICEABLE[u].possible === 20),
      units.map((u) => EXAM_UNPRICEABLE[u].possible));
    ok('  no exam column leaked into POINTS',
      !Object.keys(POINTS).some((k) => k.split('|')[1] === 'exam'),
      Object.keys(POINTS).filter((k) => k.split('|')[1] === 'exam'));
  }

  // Every authored lesson must exist in the course config, or the gradebook
  // builds no column for it and the value is unreachable. 2.5, 3.6, 4.4 and 4.5
  // were exactly that case: real content the config did not list.
  {
    const { COURSES } = require('../utils');
    const cfg = new Set();
    for (const u of Object.values(COURSES['ap-cybersecurity'].units)) {
      for (const l of (u.lessons || [])) cfg.add(l);
    }
    const orphan = [...new Set(Object.keys(POINTS).map((k) => k.split('|')[0]))].filter((l) => !cfg.has(l));
    ok('  every authored lesson has a column in the course config', orphan.length === 0, orphan);
  }
  ok('  no lesson column is authored twice', new Set(Object.keys(POINTS)).size === Object.keys(POINTS).length);
}

// ── 1b. The canonical lesson pages are actually tracked ──────────────────────
//  Every ap-cybersecurity-unit-1-<slug> URL used to fall through pageFromHandle
//  to null, so /track silently no-opped. These are the URLs students are sent
//  to, so nothing a student did on a Unit 1 lesson page was ever recorded.
console.log('\n1b. Canonical Unit 1 pages are tracked');
{
  const { pageFromHandle } = require('../utils');
  const at = (h) => pageFromHandle(h);

  ok('  social-engineering is 1.1', at('ap-cybersecurity-unit-1-social-engineering').lesson === '1.1');
  ok('  password-attacks is 1.2', at('ap-cybersecurity-unit-1-password-attacks').lesson === '1.2');
  ok('  wireless-security is 1.3', at('ap-cybersecurity-unit-1-wireless-security').lesson === '1.3');
  ok('  ai-driven-threats is 1.4', at('ap-cybersecurity-unit-1-ai-driven-threats').lesson === '1.4');
  ok('  ai-cyber-defense is 1.5', at('ap-cybersecurity-unit-1-ai-cyber-defense').lesson === '1.5');

  ok('  a lesson page records as a `lesson` visit',
    at('ap-cybersecurity-unit-1-social-engineering').activity_type === 'lesson');
  ok('  a trailing activity is still read',
    at('ap-cybersecurity-unit-1-ai-cyber-defense-quiz').activity_type === 'quiz'
    && at('ap-cybersecurity-unit-1-ai-cyber-defense-quiz').lesson === '1.5');

  // Unit 2's CANONICAL set, confirmed against the lesson page titles.
  ok('  cyber-foundations is 2.1', at('ap-cybersecurity-unit-2-cyber-foundations').lesson === '2.1');
  ok('  physical-vulnerabilities is 2.2', at('ap-cybersecurity-unit-2-physical-vulnerabilities').lesson === '2.2');
  ok('  protecting-physical-spaces is 2.3', at('ap-cybersecurity-unit-2-protecting-physical-spaces').lesson === '2.3');
  ok('  detecting-physical-attacks is 2.4', at('ap-cybersecurity-unit-2-detecting-physical-attacks').lesson === '2.4');

  // The COMPETING Unit 2 set claims the same numbers and stays untracked, so a
  // student on a legacy page never has work filed under the live curriculum.
  ok('  the competing Unit 2 set stays untracked',
    ['cia-triad', 'defense-in-depth', 'physical-security', 'risk-assessment', 'access-controls']
      .every((s) => at('ap-cybersecurity-unit-2-' + s) === null));

  // Hubs and study guides are not lessons and must not become one.
  ok('  hub and study-guide pages stay untracked',
    at('ap-cybersecurity-unit-1-introduction-to-security') === null
    && at('ap-cybersecurity-unit-3-securing-networks') === null);

  // The numbered handles that were already tracked must keep working.
  ok('  the pre-existing numbered handles are unaffected',
    at('ap-cyber-unit-1-lesson-1-exercise-1').lesson === '1.1'
    && at('ap-cyber-unit-4-lesson-4-quiz').lesson === '4.4');

  // Unit 2 stops at 2.4. The numbered rule would happily derive a 2.5 from the
  // leftover page set, filing work under a lesson that has no column and so can
  // never be read back. Untracked is the honest outcome.
  ok('  cyber 2.5 stays untracked, because the lesson does not exist',
    at('ap-cyber-unit-2-lesson-5') === null
    && at('ap-cyber-unit-2-lesson-5-quiz') === null
    && at('ap-cyber-unit-2-lesson-5-exercise-1') === null,
    at('ap-cyber-unit-2-lesson-5-quiz'));
  ok('    but 2.4 next door still is', at('ap-cyber-unit-2-lesson-4-quiz').lesson === '2.4');

  // Other courses must not be captured by the new rule.
  ok('  other courses are untouched',
    at('ap-csa-lesson-2-1-algorithms').course === 'ap-csa'
    && at('ap-networking-lesson-1-2-x').course === 'ap-networking');
}

// ── 2. Seeding ───────────────────────────────────────────────────────────────
console.log('\n2. Seeding is safe and idempotent');
{
  run(`INSERT INTO course_denominators (course,unit,lesson,activity_type,possible)
       VALUES ('ap-cybersecurity','unit-1','1.1','exercise-1',99)`);
  const first = seedCyberDenominators({});
  ok('  a hand-authored value is never clobbered',
    db.prepare(`SELECT possible p FROM course_denominators
                WHERE course='ap-cybersecurity' AND lesson='1.1' AND activity_type='exercise-1'`).get().p === 99);
  ok('  everything else is written', first.changed === Object.keys(POINTS).length - 1, first.changed);
  ok('  re-running writes nothing', seedCyberDenominators({}).changed === 0);
  ok('  --update is the deliberate override',
    seedCyberDenominators({ update: true }).changed > 0
    && db.prepare(`SELECT possible p FROM course_denominators
                   WHERE course='ap-cybersecurity' AND lesson='1.1' AND activity_type='exercise-1'`).get().p === 7);
}

// ── 3. The column map reaches the page ───────────────────────────────────────
console.log('\n3. The teacher endpoint hands the page a column map');
run(`INSERT INTO teachers (id,name,email,password_hash) VALUES ('t1','T','t@s.org','x')`);
run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold,retry_allowed)
     VALUES ('c1','CYBER-DEN','Cyber','ap-cybersecurity','t1',1,80,1)`);
run(`INSERT INTO students (id,class_id,display_name,pin_hash) VALUES ('s1','c1','A','x')`);

const app = express();
app.use(express.json());
app.use('/api/teacher', require('../routes/teacher'));
const server = app.listen(0);
const tok = signTeacherToken({ id: 't1', email: 't@s.org' });

(async () => {
  const r = await fetch(`http://127.0.0.1:${server.address().port}/api/teacher/classes/CYBER-DEN/progress`,
    { headers: { Authorization: 'Bearer ' + tok } });
  const body = await r.json();
  const d = body.denominators;

  ok('  the response carries a denominators map', !!d && typeof d === 'object');
  ok('  1.1|exercise-1 reads 7', d['1.1|exercise-1'] === 7, d && d['1.1|exercise-1']);
  ok('  2.1|exercise-1 reads 6', d['2.1|exercise-1'] === 6, d && d['2.1|exercise-1']);
  // Both are 5 item web quizzes, per seed/cyber-unit-1-web-quizzes.js. They read
  // 9 and 12 for one day, while the banks were transcribed from the teacher bundle,
  // before the rule landed that bundle instruments stay offline. Existing attempts
  // are NOT regraded by either move; smoke/denominator-safety.js pins that.
  ok('  1.1|quiz reads 5', d['1.1|quiz'] === 5, d && d['1.1|quiz']);
  ok('  1.2|quiz reads 5', d['1.2|quiz'] === 5, d && d['1.2|quiz']);

  // Present BEFORE any student has submitted: a header cannot wait for a cell.
  ok('  present with zero submissions recorded',
    db.prepare('SELECT COUNT(*) n FROM progress').get().n === 0 && d['1.1|exercise-1'] === 7);

  // An unauthored column must be absent, not defaulted.
  //
  // This used to assert on 1.3|exercise-1, which was unauthored until
  // 2026-08-25. Every column the COURSES config names is authored now, so the
  // case is made with the two that are priced in course_unit_denominators
  // instead: all five exams sit at lesson 'exam' and all five case files at
  // lesson 'case-file', so a lesson-keyed map must not carry either. If one
  // ever appears here it means five units' values collapsed onto one row, which
  // is the exact collision the unit-scoped table exists to prevent.
  ok('  a unit-scoped column is absent from the lesson-keyed map, not defaulted',
    !('exam|exam' in d) && !('case-file|case-file' in d),
    [d['exam|exam'], d['case-file|case-file']]);
  ok('  a column that does not exist is absent, not defaulted',
    !('9.9|quiz' in d), d['9.9|quiz']);
  ok('  a lesson visit is never authored', !('1.1|lesson' in d), d['1.1|lesson']);

  server.close();
  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { server.close(); console.error(e); process.exit(1); });
