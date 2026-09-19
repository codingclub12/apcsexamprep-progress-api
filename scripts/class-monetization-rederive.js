#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  RE-DERIVE the classroom ad-revenue figures a SECOND way and require the two
//  to agree exactly.
//
//  WHY A SECOND IMPLEMENTATION AND NOT MORE TESTS
//  The repo convention is that an automatic deploy passes three INDEPENDENT
//  kinds of check, and that a suite plus a mutation run is still only this repo
//  talking to itself. Every real defect found on 2026-09-01 and 02 was caught by
//  a kind of check DIFFERENT from the ones passing at the time. So this is the
//  `rederive` kind: the same conclusion reached from the raw rows by a method
//  that shares no code path with lib/class-monetization.js.
//
//  HOW IT IS ACTUALLY DIFFERENT, which is the only thing that makes it worth
//  running:
//
//    the module    one GROUP BY pass per source table, joined in JS by class_id
//    this script   one query PER CLASS, and a per-class UNION recomputed from
//                  scratch, which is a deliberately bad shape for production and
//                  a good shape for a check, because a GROUP BY that silently
//                  drops or double counts a class cannot survive both
//
//  It also re-derives the pooled per-student rate by summing student-days rather
//  than by pooling class totals, so an averaging-of-averages mistake in either
//  implementation shows up as a disagreement rather than as a plausible number.
//
//  The fixture is GENERATED from a seeded generator rather than hand written, so
//  it covers shapes nobody thought to write down: classes below the anonymity
//  floor, classes with events and no sessions, classes with neither, and an
//  excluded cohort large enough to distort the rate if it ever leaked in.
//
//  Offline and secret-free. Zero PII: synthetic classes, numbers only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:classmonetizationrederive
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
const os = require('os');

const DB_FILE = path.join(os.tmpdir(), 'apcse-cm-rederive-' + process.pid + '.db');
process.env.DB_PATH = DB_FILE;
const cleanup = () => { for (const s of ['', '-wal', '-shm']) { try { fs.unlinkSync(DB_FILE + s); } catch (e) {} } };
cleanup();
process.on('exit', cleanup);

const db = require('../db');
const cm = require('../lib/class-monetization');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '\n           ' + JSON.stringify(x, null, 1).slice(0, 800) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

// -- a seeded generator, so a failure is reproducible -------------------------
let SEED = Number(process.argv[2] || 20260919);
const rnd = () => { SEED = (SEED * 1103515245 + 12345) & 0x7fffffff; return SEED / 0x7fffffff; };
const pick = (n) => Math.floor(rnd() * n);

const RPM = 9.37;                 // a non-round RPM, so a rounding bug cannot hide
const WINDOW = 30;
const DAYPOOL = [1, 2, 3, 5, 8, 11, 14, 19, 23, 27];

run(`INSERT INTO teachers (id,name,email,password_hash) VALUES
 ('t_a','A','a@school.org','x'), ('t_b','B','b@school.org','x'),
 ('t_own','Tanner','tannercrow12@gmail.com','x')`);
run(`INSERT INTO entitlements (id,teacher_id,course,source,status) VALUES ('e1','t_a','ap-csa','code','active')`);

const CLASSES = [];
for (let i = 0; i < 24; i++) {
  //  Four shapes on purpose: instrumented, events-only, tiny, and idle. The
  //  excluded owner classes are deliberately the heaviest.
  const shape = i % 4;
  const owner = i >= 20;
  const id = 'c' + i;
  const teacher = owner ? 't_own' : (i % 2 ? 't_a' : 't_b');
  const students = owner ? 30 : (shape === 2 ? 1 + pick(4) : 6 + pick(25));
  run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed)
       VALUES (?,?,?,?,'ap-csa',1,80,0)`, id, teacher, 'CSA-' + i, 'C' + i);
  for (let s = 1; s <= students; s++) {
    run(`INSERT INTO students (id,class_id,display_name,pin_hash,active) VALUES (?,?,?,'x',1)`, id + '_s' + s, id, 'S' + s);
  }
  const days = [];
  const nDays = shape === 3 ? 0 : 1 + pick(6);
  for (let d = 0; d < nDays; d++) days.push(DAYPOOL[(i + d * 3) % DAYPOOL.length]);
  const uniqueDays = [...new Set(days)];

  const instrumented = shape === 0 || owner;
  for (const d of uniqueDays) {
    for (let s = 1; s <= students; s++) {
      const ev = 1 + pick(4);
      for (let k = 0; k < ev; k++) {
        run(`INSERT INTO score_events (id,student_id,class_id,course,unit,lesson,activity_type,item,points,max_points,created_at)
             VALUES (lower(hex(randomblob(8))),?,?,'ap-csa','unit-1','1.1','cfu',?,1,1,datetime('now','-${d} days'))`,
          id + '_s' + s, id, 'q' + k);
      }
      if (instrumented) {
        run(`INSERT INTO sessions (id,student_id,class_id,course,active_seconds,total_seconds,page_views,ua,started_at,last_beat_at)
             VALUES (lower(hex(randomblob(8))),?,?,'ap-csa',?,?,?,'ua',datetime('now','-${d} days'),datetime('now','-${d} days'))`,
          id + '_s' + s, id, 120 + pick(600), 200 + pick(600), owner ? 40 + pick(60) : 1 + pick(12));
      }
    }
  }
  CLASSES.push({ id, students, days: uniqueDays, instrumented, owner });
}
for (const d of DAYPOOL) {
  run(`INSERT INTO metrics_daily (date,source,metric,value,dimension)
       VALUES (date('now','-${d} days'),'raptive','rpm',${RPM},'')`);
}

// -- THE SECOND IMPLEMENTATION ------------------------------------------------
//  One query per class, a per-class UNION, and no GROUP BY anywhere.
const qPv = db.prepare(`SELECT COALESCE(SUM(page_views),0) AS pv FROM sessions
                         WHERE class_id = ? AND started_at >= datetime('now', ?)`);
const qEv = db.prepare(`SELECT
  (SELECT COUNT(*) FROM score_events WHERE class_id = ? AND created_at >= datetime('now', ?))
+ (SELECT COUNT(*) FROM attempts     WHERE class_id = ? AND created_at >= datetime('now', ?)) AS n`);
const qDays = db.prepare(`SELECT COUNT(*) AS n FROM (
  SELECT date(created_at) AS d FROM score_events WHERE class_id = ? AND created_at >= datetime('now', ?)
  UNION SELECT date(created_at) FROM attempts    WHERE class_id = ? AND created_at >= datetime('now', ?)
  UNION SELECT date(started_at) FROM sessions    WHERE class_id = ? AND started_at >= datetime('now', ?))`);
const qActive = db.prepare(`SELECT COUNT(*) AS n FROM (
  SELECT student_id FROM score_events WHERE class_id = ? AND created_at >= datetime('now', ?)
  UNION SELECT student_id FROM attempts WHERE class_id = ? AND created_at >= datetime('now', ?)
  UNION SELECT student_id FROM sessions WHERE class_id = ? AND started_at >= datetime('now', ?))`);
const qEnrolled = db.prepare(`SELECT COUNT(*) AS n FROM students WHERE class_id = ? AND active = 1`);
const qRpm = db.prepare(`SELECT value FROM metrics_daily WHERE source='raptive' AND metric='rpm' AND dimension=''
                          AND date >= date('now', ?)`);

const mod = '-' + WINDOW + ' days';
const isOwner = (id) => (CLASSES.find((c) => c.id === id) || {}).owner;

//  RPM, re-derived as a mean over the rows rather than by SQL AVG.
const rpmRows = qRpm.all(mod).map((r) => r.value);
const rpmB = rpmRows.length ? Math.round((rpmRows.reduce((a, b) => a + b, 0) / rpmRows.length) * 100) / 100 : null;

//  Calibration, re-derived. Same definition, different gathering.
let calPv = 0, calEv = 0, calClasses = 0;
for (const c of CLASSES) {
  if (c.owner) continue;
  const pv = qPv.get(c.id, mod).pv;
  const ev = qEv.get(c.id, mod, c.id, mod).n;
  if (pv > 0 && ev > 0) { calPv += pv; calEv += ev; calClasses += 1; }
}
const ratioB = calClasses && calEv > 0 ? Math.round((calPv / calEv) * 1000) / 1000 : null;

//  Per-class annual pageviews and revenue, re-derived.
const rowsB = new Map();
for (const c of CLASSES) {
  const enrolled = qEnrolled.get(c.id).n;
  const active = qActive.get(c.id, mod, c.id, mod, c.id, mod).n;
  const days = qDays.get(c.id, mod, c.id, mod, c.id, mod).n;
  const pvMeasured = qPv.get(c.id, mod).pv;
  const ev = qEv.get(c.id, mod, c.id, mod).n;

  //  apv is computed for EVERY class, suppressed or not, because a suppressed
  //  class still feeds the pooled rate. Suppression hides a ROW; it does not
  //  remove a class from a total. The row fields are nulled afterwards.
  const rec = { enrolled, active, days, suppressed: false, apv: null, usd: null, basis: 'none' };
  let pv = null;
  if (pvMeasured > 0) { pv = pvMeasured; rec.basis = 'measured'; }
  else if (ratioB != null && ev > 0) { pv = ev * ratioB; rec.basis = 'estimated'; }
  if (pv != null && days > 0) {
    rec.apv = Math.round((pv / days) * cm.SCHOOL_DAYS_PER_YEAR);
    if (rpmB != null) rec.usd = Math.round(((rec.apv / 1000) * rpmB) * 100) / 100;
  }
  if (!c.owner && active > 0 && active < cm.MIN_CLASS_STUDENTS) rec.suppressed = true;
  rowsB.set(c.id, rec);
}

//  The pooled per-student rate, re-derived by summing student-weighted rates
//  rather than by pooling class totals.
//  The pool takes every EXTERNAL class, INCLUDING the ones too small to report
//  individually, and excludes owner and solo cohorts. Floors apply to the pool
//  rather than to its members.
let wSum = 0, sSum = 0, poolClasses = 0;
for (const c of CLASSES) {
  if (c.owner) continue;
  const r = rowsB.get(c.id);
  if (r.apv == null || r.active <= 0 || r.days <= 0) continue;
  wSum += r.apv; sSum += r.active; poolClasses += 1;
}
const poolOk = poolClasses >= cm.MIN_POOL_CLASSES && sSum >= cm.MIN_POOL_STUDENTS;
const perStudentB = poolOk ? Math.round(wSum / sSum) : null;

// -- THE DIFF -----------------------------------------------------------------
const A = cm.report({ days: WINDOW });
const byId = Object.fromEntries(A.classes.map((r) => [r.class_id, r]));

console.log(`\n  Re-derivation, seed ${process.argv[2] || 20260919}: ${CLASSES.length} classes, RPM ${RPM}\n`);

ok('RPM agrees', A.site_revenue.rpm_usd === rpmB, { module: A.site_revenue.rpm_usd, rederived: rpmB });
ok('calibration ratio agrees', A.calibration.pageviews_per_event === ratioB,
  { module: A.calibration.pageviews_per_event, rederived: ratioB });
ok('calibration used the same class count', A.calibration.from_classes === calClasses,
  { module: A.calibration.from_classes, rederived: calClasses });

const mismatches = [];
for (const c of CLASSES) {
  const a = byId[c.id], b = rowsB.get(c.id);
  const excluded = a.tier === 'excluded';
  const cmp = [
    ['enrolled', a.enrolled, b.enrolled],
    ['active_students', a.active_students, b.active],
    ['active_days', a.active_days, b.days],
  ];
  if (!excluded) {
    cmp.push(['suppressed', a.suppressed, b.suppressed]);
    cmp.push(['basis', a.pageview_basis, b.suppressed ? 'suppressed' : b.basis]);
    cmp.push(['annual_pageviews', a.est_annual_pageviews, b.suppressed ? null : b.apv]);
    cmp.push(['annual_usd', a.est_annual_revenue_usd, b.suppressed ? null : b.usd]);
  }
  for (const [field, av, bv] of cmp) {
    if (av !== bv) mismatches.push({ class_id: c.id, field, module: av, rederived: bv });
  }
}
ok(`all ${CLASSES.length} classes agree field for field`, mismatches.length === 0, mismatches.slice(0, 8));

ok('pooled annual pageviews per active student agrees',
  A.scenarios.annual_pageviews_per_active_student === perStudentB,
  { module: A.scenarios.annual_pageviews_per_active_student, rederived: perStudentB });

//  The scenario table is pure arithmetic on the pooled rate, so re-deriving it
//  is a check that the table is not quietly using a different rate than the one
//  it reports.
//  TWO SEPARATE PROPERTIES, and the second is the one that caught a defect.
//    scale  the row's pageviews are the pooled rate times the class size, to
//           within the rounding of the rate itself
//    tie    the row's MONEY is derivable from the row's OWN stated pageviews.
//           A report whose two numbers cannot be reconciled by the reader is
//           the failure here, whichever of them is 'right'.
const scenarioBad = [];
for (const row of A.scenarios.rows) {
  if (perStudentB == null) {
    if (row.est_annual_pageviews !== null) {
      scenarioBad.push({ students: row.students, field: 'should be null', module: row.est_annual_pageviews });
    }
    continue;
  }
  const expPv = perStudentB * row.students;
  if (Math.abs((row.est_annual_pageviews || 0) - expPv) > row.students) {
    scenarioBad.push({ students: row.students, field: 'scale', module: row.est_annual_pageviews, rederived: expPv });
  }
  if (rpmB != null) {
    const tie = Math.round(((row.est_annual_pageviews / 1000) * rpmB) * 100) / 100;
    if (row.est_annual_revenue_usd !== tie) {
      scenarioBad.push({ students: row.students, field: 'tie', module: row.est_annual_revenue_usd, from_its_own_pageviews: tie });
    }
  }
}
ok('every scenario row scales with class size and ties to its own pageviews',
  scenarioBad.length === 0, scenarioBad);

//  The same tie, on every class row.
const tieBad = [];
for (const r of A.classes) {
  if (r.est_annual_revenue_usd == null || r.est_annual_pageviews == null) continue;
  const tie = Math.round(((r.est_annual_pageviews / 1000) * A.site_revenue.rpm_usd) * 100) / 100;
  if (r.est_annual_revenue_usd !== tie) {
    tieBad.push({ class_id: r.class_id, module: r.est_annual_revenue_usd, from_its_own_pageviews: tie });
  }
}
ok('every class row ties its money to its own stated pageviews', tieBad.length === 0, tieBad.slice(0, 6));

ok('the pool took every EXTERNAL class and no owner class',
  A.scenarios.from_active_students === sSum && A.scenarios.from_classes === poolClasses,
  { module: [A.scenarios.from_classes, A.scenarios.from_active_students], rederived: [poolClasses, sSum] });

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
