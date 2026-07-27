'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SMOKE: pipeline health + teacher inspector.
//  Seeds a DB that DELIBERATELY reproduces each failure mode the health module
//  claims to detect, then asserts the module actually reports it. A check that
//  cannot fire on a broken fixture is worthless, so every finding is proven.
//
//  Run: npm run smoke:health
// ─────────────────────────────────────────────────────────────────────────────
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-health.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

const db = require('../db');
const { computeHealth } = require('../lib/admin-health');
const { listTeachers, teacherDetail } = require('../lib/admin-teacher');

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  [PASS] ' + name); }
  else { fail++; console.log('  [FAIL] ' + name + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); }
};
const run = (sql, ...a) => db.prepare(sql).run(...a);

// ── Fixture ──────────────────────────────────────────────────────────────────
run(`INSERT INTO teachers (id,name,email,password_hash,school) VALUES
  ('t_good','Good Teacher','good@hcps.net','x','Good High'),
  ('t_broken','Broken Teacher','broken@dadeschools.net','x','Broken High'),
  ('t_idle','Idle Teacher','idle@volusia.k12.fl.us','x',NULL),
  ('t_owner','Owner','tannercrow12@gmail.com','x',NULL)`);

run(`INSERT INTO classes (id,class_code,class_name,course,teacher_id,active,mastery_threshold,retry_allowed,created_at) VALUES
  ('c_good','CSA-GOOD','Working','ap-csa','t_good',1,80,0,datetime('now','-20 days')),
  ('c_broken','CSA-BRKN','Scores missing','ap-csa','t_broken',1,70,1,datetime('now','-20 days')),
  ('c_idle','CYBER-IDLE','Roster only','ap-cybersecurity','t_idle',1,80,0,datetime('now','-5 days')),
  ('c_owner','CSA-OWNR','Owner test','ap-csa','t_owner',1,80,0,datetime('now','-5 days'))`);

let sid = 0;
const stu = (cid, n, signedIn) => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const id = 's' + (++sid);
    run(`INSERT INTO students (id,class_id,display_name,pin_hash,active,last_active,created_at)
         VALUES (?,?,?,?,1,${signedIn ? "datetime('now','-1 day')" : 'NULL'},datetime('now','-10 days'))`,
      id, cid, 'Name' + sid, 'x');
    out.push(id);
  }
  return out;
};
const good = stu('c_good', 3, true);
const broken = stu('c_broken', 2, true);
stu('c_idle', 4, false);          // roster only, nobody ever signed in
const owner = stu('c_owner', 1, true);

let pid = 0;
const prog = (s, c, course, unit, lesson, act, completed) =>
  run(`INSERT INTO progress (id,student_id,class_id,course,unit,lesson,activity_type,completed,score,completed_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,NULL,datetime('now','-2 days'),datetime('now','-2 days'))`,
    'p' + (++pid), s, c, course, unit, lesson, act, completed);

let eid = 0;
const ev = (s, c, course, unit, lesson, act, item, pts, max) =>
  run(`INSERT INTO score_events (id,student_id,class_id,course,unit,lesson,activity_type,item,points,max_points,correct,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,1,datetime('now','-2 days'))`,
    'e' + (++eid), s, c, course, unit, lesson, act, item, pts, max);

// GOOD class: visits AND scores, with the progress rollup present.
for (const s of good) {
  prog(s, 'c_good', 'ap-csa', 'unit-1', '1.1', 'lesson', 1);
  ev(s, 'c_good', 'ap-csa', 'unit-1', '1.1', 'cfu', 'cfu-1', 1, 1);
  // matching rollup row so CHECK 4 does not fire for this class
  run(`INSERT INTO progress (id,student_id,class_id,course,unit,lesson,activity_type,completed,score,updated_at)
       VALUES (?,?,?,?,?,?,?,0,100,datetime('now','-2 days'))`,
    'p' + (++pid), s, 'c_good', 'ap-csa', 'unit-1', '1.1', 'cfu');
}
// BROKEN class: students complete lessons, but NO score ever arrives.
for (const s of broken) {
  prog(s, 'c_broken', 'ap-csa', 'unit-1', '1.1', 'lesson', 1);
  prog(s, 'c_broken', 'ap-csa', 'unit-1', '1.2', 'lesson', 1);
}
// Owner class: excluded from health entirely.
prog(owner[0], 'c_owner', 'ap-csa', 'unit-1', '1.1', 'lesson', 1);

// Unrecognized location: unit-99 is not in the COURSES config.
ev(good[0], 'c_good', 'ap-csa', 'unit-99', '99.1', 'cfu', 'cfu-x', 1, 1);
// Rollup gap: an event with NO matching progress row at all.
ev(good[1], 'c_good', 'ap-csa', 'unit-1', '1.7', 'cfu', 'cfu-7', 1, 1);
// Manifest: 1.1 exists, 1.7 does not => manifest-gap finding.
run(`INSERT INTO course_manifest (course,unit,lesson_id,item_id,item_type,points)
     VALUES ('ap-csa','unit-1','1.1','1.1-visit','visit',1)`);

// Teacher feature signal: released an answer key.
run(`INSERT INTO key_releases (class_id,course,unit,lesson,activity_type) VALUES ('c_good','ap-csa','unit-1','1.1','quiz')`);
// Paid entitlement for the good teacher.
run(`INSERT INTO entitlements (id,teacher_id,course,source,status,granted_at)
     VALUES ('ent1','t_good','ap-csa','manual','active',datetime('now','-5 days'))`);

// ── Health ───────────────────────────────────────────────────────────────────
console.log('pipeline health');
const h = computeHealth();
const codes = new Set(h.findings.map((f) => f.code));
const find = (c) => h.findings.find((f) => f.code === c);

ok('pipelines counted', h.pipelines.visits > 0 && h.pipelines.score_events > 0, h.pipelines);
ok('detects students visiting but never scoring', codes.has('students_visit_no_score'), [...codes]);
const vns = find('students_visit_no_score');
ok('  flags the BROKEN class', !!vns && vns.items.some((i) => i.class_code === 'CSA-BRKN'), vns && vns.items);
ok('  does NOT flag the working class', !!vns && !vns.items.some((i) => i.class_code === 'CSA-GOOD'), vns && vns.items);
ok('  is critical severity', !!vns && vns.severity === 'critical', vns && vns.severity);

ok('detects unrecognized course/unit', codes.has('score_events_unrecognized_location'), [...codes]);
const bad = find('score_events_unrecognized_location');
ok('  names unit-99', !!bad && bad.items.some((i) => i.unit === 'unit-99'), bad && bad.items);

ok('detects missing score rollup', codes.has('score_rollup_missing'), [...codes]);
ok('detects lessons missing from manifest', codes.has('lesson_missing_from_manifest'), [...codes]);
const mg = find('lesson_missing_from_manifest');
ok('  flags lesson 1.7', !!mg && mg.items.some((i) => i.lesson === '1.7'), mg && mg.items);

ok('detects rostered students who never signed in', codes.has('students_never_signed_in'), [...codes]);
const never = find('students_never_signed_in');
ok('  flags the idle class (4 students)', !!never && never.items.some((i) => i.class_code === 'CYBER-IDLE' && i.students === 4), never && never.items);

// Owner exclusion: the owner class must not appear in ANY finding.
const allItems = JSON.stringify(h.findings);
ok('owner/test class never appears in findings', !allItems.includes('CSA-OWNR'));
ok('critical findings counted', h.totals.critical >= 2, h.totals);
ok('findings sorted critical-first', h.findings[0].severity === 'critical', h.findings[0] && h.findings[0].severity);

// ── Teacher list ─────────────────────────────────────────────────────────────
console.log('teacher list');
const list = listTeachers();
const byId = new Map(list.teachers.map((t) => [t.id, t]));
ok('lists all teachers', list.teachers.length === 4, list.teachers.length);
ok('good teacher status = reporting', byId.get('t_good').status === 'reporting', byId.get('t_good').status);
ok('broken teacher status = scores_missing', byId.get('t_broken').status === 'scores_missing', byId.get('t_broken').status);
ok('idle teacher status = roster_only', byId.get('t_idle').status === 'roster_only', byId.get('t_idle').status);
ok('owner teacher bucketed TANNER', byId.get('t_owner').bucket === 'TANNER', byId.get('t_owner').bucket);
ok('good teacher shows entitlement', byId.get('t_good').entitlements === 1, byId.get('t_good').entitlements);
ok('good teacher shows key release', byId.get('t_good').key_releases === 1, byId.get('t_good').key_releases);

// ── Teacher detail ───────────────────────────────────────────────────────────
console.log('teacher detail');
const d = teacherDetail('t_broken');
ok('detail resolves by id', !!d && d.teacher.id === 't_broken');
ok('detail resolves by email', !!teacherDetail('broken@dadeschools.net'));
ok('unknown teacher returns null', teacherDetail('nope@nowhere.test') === null);
ok('roster anonymized by default', d.roster.every((r) => /^Student \d+$/.test(r.label)), d.roster.map((r) => r.label));
ok('anonymized flag set', d.anonymized === true);
const revealed = teacherDetail('t_broken', { reveal: true });
ok('reveal returns real names', revealed.roster.some((r) => r.label.startsWith('Name')), revealed.roster.map((r) => r.label));

const bc = d.classes.find((c) => c.class_code === 'CSA-BRKN');
ok('broken class flagged scores_missing', bc.problems.some((p) => p.code === 'scores_missing'), bc.problems);
ok('broken class problem is critical', bc.problems.find((p) => p.code === 'scores_missing').severity === 'critical');
ok('broken class shows lessons but zero scores', bc.lessons_completed === 4 && bc.score_events === 0, { l: bc.lessons_completed, s: bc.score_events });
ok('broken class customized settings detected', bc.customized === true, bc);
ok('per-student syncing=false when visits but no scores', d.roster.every((r) => r.syncing === false), d.roster);

const dg = teacherDetail('t_good');
ok('good teacher roster syncing=true', dg.roster.some((r) => r.syncing === true), dg.roster);
ok('good class has no critical problems', !dg.classes[0].problems.some((p) => p.severity === 'critical'), dg.classes[0].problems);
const fu = new Map(dg.feature_usage.map((f) => [f.key, f.used]));
ok('feature adoption: created class', fu.get('created_class') === true);
ok('feature adoption: cfu used', fu.get('cfu') === true);
ok('feature adoption: key release used', fu.get('key_release') === true);
ok('feature adoption: paid entitlement', fu.get('paid') === true);
ok('feature adoption: attempts NOT used', fu.get('attempts') === false);
ok('activity timeline is 30 days', dg.activity_30d.length === 30, dg.activity_30d.length);

const di = teacherDetail('t_idle');
ok('idle class flagged nobody signed in', di.classes[0].problems.some((p) => p.code === 'nobody_signed_in'), di.classes[0].problems);

console.log('\n' + (fail ? (fail + ' FAILED, ' + pass + ' passed') : ('OK - all ' + pass + ' checks passed')));
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
process.exit(fail ? 1 : 0);
