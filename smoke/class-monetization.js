'use strict';
// -----------------------------------------------------------------------------
//  SMOKE: the classroom ad-revenue model says what it knows, and says null for
//  what it does not.
//
//  WHY THIS EXISTS
//  The model in lib/class-monetization.js exists to answer "what is a 28 student
//  class worth in ads per year", and that number is going to be used to price a
//  teacher product. A pricing model that quietly reports 0 where it means "no
//  reading" is worse than no model: it makes an unmeasured class look like a
//  worthless one, and the whole argument for charging money inverts.
//
//  So the rules pinned here are the ones that make the number trustworthy rather
//  than the ones that make it exist:
//
//   - a measured pageview beats an estimated one, and the basis is always stated
//   - a missing RPM reading yields null, NEVER 0
//   - a class too small to anonymise reports nothing about its behaviour
//   - owner / prober / audit classes never set the rate real schools are priced against
//   - annualisation divides by ACTIVE days, so a holiday is not a collapse
//   - the maturity stage is DERIVED from joint coverage; a caller cannot assert it
//
//  Offline and secret-free: throwaway SQLite file, no network, no live server.
//  Zero PII: synthetic classes, numbers only.
//  No em-dashes, per repo convention.
//
//  Run: npm run smoke:classmonetization
// -----------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
process.env.DB_PATH = path.join(__dirname, 'smoke-class-monetization.db');
for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }

//  Admin keys are set BEFORE the router is required, because requireAdmin reads
//  process.env at call time but the router is built at require time.
const FULL_KEY = 'smoke-class-monetization-full-key-long-enough';
const READ_KEY = 'smoke-class-monetization-read-key-long-enough';
process.env.ADMIN_KEY = FULL_KEY;
process.env.ADMIN_READ_KEY = READ_KEY;

const express = require('express');
const db = require('../db');
const cm = require('../lib/class-monetization');

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); }
};
const run = (s, ...a) => db.prepare(s).run(...a);

// -- fixtures -----------------------------------------------------------------
//  Four classes, chosen so each one exercises a different rule:
//    c_meas   instrumented: has real session pageviews, sets the calibration
//    c_est    not instrumented: pageviews must be estimated from graded events
//    c_small  3 active students: must be suppressed
//    c_owner  Tanner's own test class: must never influence a rate or a scenario
const DAYS = [1, 2, 3, 4];                       // four distinct active days
const day = (n) => `datetime('now', '-${n} days')`;
const dateOf = (n) => `date('now', '-${n} days')`;

run(`INSERT INTO teachers (id,name,email,password_hash) VALUES
 ('t_ext','Ext Teacher','ext@school.org','x'),
 ('t_paid','Paid Teacher','paid@school.org','x'),
 ('t_own','Tanner','tannercrow12@gmail.com','x')`);

run(`INSERT INTO classes (id,teacher_id,class_code,class_name,course,active,mastery_threshold,retry_allowed) VALUES
 ('c_meas','t_paid','CSA-MEAS','Measured','ap-csa',1,80,0),
 ('c_est','t_ext','CSA-EST','Estimated','ap-csa',1,80,0),
 ('c_small','t_ext','CSA-SMALL','Small','ap-csa',1,80,0),
 ('c_owner','t_own','CSA-OWNER','Owner Test','ap-csa',1,80,0)`);

// t_paid holds a live entitlement for ap-csa, so c_meas is the premium tier.
run(`INSERT INTO entitlements (id,teacher_id,course,source,status) VALUES
 ('e1','t_paid','ap-csa','shopify_order','active')`);

const addStudents = (cls, n) => {
  for (let i = 1; i <= n; i++) {
    run(`INSERT INTO students (id,class_id,display_name,pin_hash,active) VALUES (?,?,?,'x',1)`,
      `${cls}_s${i}`, cls, `S${i}`);
  }
};
addStudents('c_meas', 10);
addStudents('c_est', 10);
addStudents('c_small', 3);
addStudents('c_owner', 10);

//  Graded events, spread evenly across students and days so that
//  active_students and active_days are both exactly what the fixture says.
const exactEvents = (cls, students, total) => {
  // Spread `total` events evenly across students and DAYS, deterministically.
  let made = 0;
  outer: while (made < total) {
    for (let s = 1; s <= students; s++) {
      for (const d of DAYS) {
        if (made >= total) break outer;
        run(`INSERT INTO score_events (id,student_id,class_id,course,unit,lesson,activity_type,item,points,max_points,created_at)
             VALUES (lower(hex(randomblob(8))),?,?,'ap-csa','unit-1','1.1','cfu',?,1,1,${day(d)})`,
          `${cls}_s${s}`, cls, `q${made}`);
        made++;
      }
    }
  }
};
exactEvents('c_meas', 10, 100);
exactEvents('c_est', 10, 50);
exactEvents('c_small', 3, 12);
exactEvents('c_owner', 10, 1000);

//  Sessions. Only c_meas and c_owner are instrumented. 400 pageviews across the
//  four days for c_meas; a deliberately huge 90000 for the owner class, so that
//  a calibration which failed to exclude it would be off by an order of
//  magnitude and could not pass by luck.
const addSession = (cls, sid, d, pv, activeS) => run(
  `INSERT INTO sessions (id,student_id,class_id,course,active_seconds,total_seconds,page_views,ua,started_at,last_beat_at)
   VALUES (lower(hex(randomblob(8))),?,?,'ap-csa',?,?,?,'ua',${day(d)},${day(d)})`,
  sid, cls, activeS, activeS, pv);

for (const d of DAYS) {
  for (let s = 1; s <= 10; s++) addSession('c_meas', `c_meas_s${s}`, d, 10, 600);  // 4*10*10 = 400 pv
  for (let s = 1; s <= 10; s++) addSession('c_owner', `c_owner_s${s}`, d, 2250, 60); // 90000 pv
}

//  Site revenue: Raptive RPM of $12.00 on the same four days, so joint coverage
//  is exactly four days.
for (const d of DAYS) {
  run(`INSERT INTO metrics_daily (date,source,metric,value,dimension) VALUES (${dateOf(d)},'raptive','rpm',12.0,'')`);
}

// -- 1. the funnel counts what the fixture says -------------------------------
const f = cm.funnel({ days: 30 });
const byId = Object.fromEntries(f.rows.map((r) => [r.class_id, r]));
ok('c_meas: 10 enrolled, 10 active, 4 active days', byId.c_meas.enrolled === 10
  && byId.c_meas.active_students === 10 && byId.c_meas.active_days === 4,
  { enrolled: byId.c_meas.enrolled, active: byId.c_meas.active_students, days: byId.c_meas.active_days });
ok('c_meas: 400 measured pageviews, 100 graded events',
  byId.c_meas.page_views_measured === 400 && byId.c_meas.graded_events === 100,
  { pv: byId.c_meas.page_views_measured, ev: byId.c_meas.graded_events });
ok('c_est: no measured pageviews, 50 graded events',
  byId.c_est.page_views_measured === 0 && byId.c_est.graded_events === 50,
  { pv: byId.c_est.page_views_measured, ev: byId.c_est.graded_events });
ok('tier comes from the entitlement, not the course: c_meas premium, c_est free',
  byId.c_meas.tier === 'premium' && byId.c_est.tier === 'free',
  { meas: byId.c_meas.tier, est: byId.c_est.tier });
ok('the owner class is classified excluded', byId.c_owner.tier === 'excluded', byId.c_owner.tier);

// -- 2. calibration ignores the excluded cohort -------------------------------
const cal = cm.calibration(f);
ok('pageviews_per_event is 4.0, derived from c_meas alone',
  cal.pageviews_per_event === 4 && cal.from_classes === 1, cal);

// -- 3. pricing arithmetic ----------------------------------------------------
const rep = cm.report({ days: 30 });
const pByCode = Object.fromEntries(rep.classes.map((r) => [r.class_code, r]));

ok('site RPM reads 12.00 from metrics_daily', rep.site_revenue.rpm_usd === 12
  && rep.site_revenue.basis === 'reported', rep.site_revenue);

//  measured: 400 pv / 4 active days = 100/day; x180 school days = 18000/yr
//  18000/1000 x $12 = $216.00
ok('c_meas is priced on the MEASURED basis at $216.00/yr',
  pByCode['CSA-MEAS'].pageview_basis === 'measured'
  && pByCode['CSA-MEAS'].est_annual_pageviews === 18000
  && pByCode['CSA-MEAS'].est_annual_revenue_usd === 216,
  { basis: pByCode['CSA-MEAS'].pageview_basis, pv: pByCode['CSA-MEAS'].est_annual_pageviews, usd: pByCode['CSA-MEAS'].est_annual_revenue_usd });

//  estimated: 50 events x 4.0 = 200 pv / 4 days = 50/day; x180 = 9000/yr = $108.00
ok('c_est is priced on the ESTIMATED basis at $108.00/yr',
  pByCode['CSA-EST'].pageview_basis === 'estimated'
  && pByCode['CSA-EST'].est_annual_pageviews === 9000
  && pByCode['CSA-EST'].est_annual_revenue_usd === 108,
  { basis: pByCode['CSA-EST'].pageview_basis, pv: pByCode['CSA-EST'].est_annual_pageviews, usd: pByCode['CSA-EST'].est_annual_revenue_usd });

ok('the estimated row carries a WIDER band than the measured row',
  (pByCode['CSA-EST'].est_annual_revenue_band.high / pByCode['CSA-EST'].est_annual_revenue_usd)
  > (pByCode['CSA-MEAS'].est_annual_revenue_band.high / pByCode['CSA-MEAS'].est_annual_revenue_usd),
  { est: pByCode['CSA-EST'].est_annual_revenue_band, meas: pByCode['CSA-MEAS'].est_annual_revenue_band });

// -- 4. k-anonymity -----------------------------------------------------------
const small = pByCode['CSA-SMALL'];
ok('a 3 student class is suppressed', small.suppressed === true, small.suppressed_reason);
ok('a suppressed class reports NULL behaviour, not zero',
  small.page_views === null && small.est_annual_pageviews === null && small.est_annual_revenue_usd === null,
  { pv: small.page_views, apv: small.est_annual_pageviews, usd: small.est_annual_revenue_usd });

// -- 5. scenarios --------------------------------------------------------------
//  pooled: (18000 + 9000) pv over (10 + 10) active students = 1350 pv/student/yr
//  25 students -> 33750 pv -> $405.00
const sc = rep.scenarios;
const row25 = sc.rows.find((r) => r.students === 25);
ok('pooled rate is 1350 annual pageviews per active student',
  sc.annual_pageviews_per_active_student === 1350, sc.annual_pageviews_per_active_student);
ok('a 25 student class models at $405.00/yr', row25.est_annual_revenue_usd === 405, row25);
ok('scenarios scale linearly with class size',
  sc.rows.find((r) => r.students === 50).est_annual_revenue_usd === 810
  && sc.rows.find((r) => r.students === 100).est_annual_revenue_usd === 1620,
  sc.rows.map((r) => [r.students, r.est_annual_revenue_usd]));
ok('the owner class did not inflate the pooled rate',
  sc.from_active_students === 20 && sc.from_classes === 2,
  { students: sc.from_active_students, classes: sc.from_classes });

//  THE REPORT MUST TIE OUT TO ITSELF. A reader checking the arithmetic by hand
//  takes the pageview figure the row states and multiplies it by the RPM the
//  report states. If that does not land on the money the row states, the report
//  is not checkable, whichever number happens to be 'right'.
//
//  PINNED ON AWKWARD NUMBERS ON PURPOSE. The fixture above is deliberately
//  round (18000 and 9000 annual pageviews at a $12.00 RPM), and at those sizes
//  rounding before or after pricing gives the same cents, so the fixture cannot
//  see this defect at all. It shows up on small classes: 4 pageviews over 7
//  active days annualises to 102.857, and $9.37 RPM prices the unrounded figure
//  at $0.96 and the reported 103 at $0.97. Found by
//  scripts/class-monetization-rederive.js, which disagreed on 2 of 24 generated
//  classes before the module was changed to round first and price second.
const CAL1 = { pageviews_per_event: 4, from_classes: 1, basis: 'measured_classes' };
const awkward = (pv, days) => cm.priceRow(
  { class_id: 'a', class_code: 'A', course: 'ap-csa', cohort: 'EXTERNAL', tier: 'free',
    enrolled: 10, active_students: 10, active_days: days, sessions: days,
    page_views_measured: pv, active_minutes: 10, graded_events: 10 },
  CAL1, 9.37, 30);
const awkwardBad = [[4, 7], [5, 7], [6, 7], [9, 7], [12, 7], [15, 7]]
  .map(([pv, d]) => awkward(pv, d))
  .filter((r) => r.est_annual_revenue_usd
    !== Math.round(((r.est_annual_pageviews / 1000) * 9.37) * 100) / 100);
ok('a small class ties its money to its own stated pageviews', awkwardBad.length === 0,
  awkwardBad.map((r) => ({ pv: r.est_annual_pageviews, usd: r.est_annual_revenue_usd })));

const tieOut = rep.classes.filter((r) => r.est_annual_revenue_usd != null)
  .filter((r) => r.est_annual_revenue_usd
    !== Math.round(((r.est_annual_pageviews / 1000) * rep.site_revenue.rpm_usd) * 100) / 100);
ok('every priced class ties its money to its own stated pageviews', tieOut.length === 0,
  tieOut.map((r) => ({ code: r.class_code, pv: r.est_annual_pageviews, usd: r.est_annual_revenue_usd })));

//  A fractional pageview count is not a number a report may print. The scenario
//  table multiplies a pooled rate by a class size, which is fractional far more
//  often than not, so this is the rule that keeps the table readable.
const fractional = cm.scenarios(
  [{ tier: 'free', suppressed: false, est_annual_pageviews: 103, active_students: 7, pageview_basis: 'measured' },
   { tier: 'free', suppressed: false, est_annual_pageviews: 47,  active_students: 5, pageview_basis: 'measured' }],
  9.37, [25, 28, 55]);
ok('every scenario row reports a WHOLE number of pageviews',
  fractional.rows.every((r) => Number.isInteger(r.est_annual_pageviews)),
  fractional.rows.map((r) => r.est_annual_pageviews));
ok('every scenario row ties its money to its own stated pageviews',
  fractional.rows.every((r) => r.est_annual_revenue_usd
    === Math.round(((r.est_annual_pageviews / 1000) * 9.37) * 100) / 100),
  fractional.rows);

// -- 6. THE NULL RULE: no RPM means null, never zero --------------------------
run(`DELETE FROM metrics_daily`);
const noRpm = cm.report({ days: 30 });
const nr = Object.fromEntries(noRpm.classes.map((r) => [r.class_code, r]));
ok('with no RPM reading the site rpm_usd is null, not 0',
  noRpm.site_revenue.rpm_usd === null && noRpm.site_revenue.basis === 'none', noRpm.site_revenue);
ok('with no RPM a class revenue is NULL, not 0',
  nr['CSA-MEAS'].est_annual_revenue_usd === null, nr['CSA-MEAS'].est_annual_revenue_usd);
ok('with no RPM the pageview figure SURVIVES (it does not depend on revenue)',
  nr['CSA-MEAS'].est_annual_pageviews === 18000, nr['CSA-MEAS'].est_annual_pageviews);
ok('an unpriced row says WHY it is unpriced',
  /Raptive RPM/.test(nr['CSA-MEAS'].unpriced_reason || ''), nr['CSA-MEAS'].unpriced_reason);
ok('with no RPM every scenario row is null, not 0',
  noRpm.scenarios.rows.every((r) => r.est_annual_revenue_usd === null),
  noRpm.scenarios.rows.map((r) => r.est_annual_revenue_usd));

// -- 7. the maturity stage is derived, not asserted ---------------------------
ok('0 joint days is "rough"', cm.stageFor(0).name === 'rough');
ok('59 joint days is still "rough"', cm.stageFor(59).name === 'rough');
ok('60 joint days is "estimate"', cm.stageFor(60).name === 'estimate');
ok('149 joint days is still "estimate"', cm.stageFor(149).name === 'estimate');
ok('150 joint days is "pricing_grade"', cm.stageFor(150).name === 'pricing_grade');
ok('report() derives its own stage and ignores any caller-supplied one',
  cm.report({ days: 30, stage: 'pricing_grade' }).stage.name === 'rough',
  cm.report({ days: 30, stage: 'pricing_grade' }).stage);

// -- 8. joint coverage is an INTERSECTION -------------------------------------
//  Revenue on days the class was not working prices nothing, so put the RPM
//  readings 200 days back, where no behaviour exists, and require 0.
run(`INSERT INTO metrics_daily (date,source,metric,value,dimension)
     VALUES (date('now','-200 days'),'raptive','rpm',12.0,''),
            (date('now','-201 days'),'raptive','rpm',12.0,'')`);
ok('revenue days with no behaviour on them contribute 0 joint days',
  cm.jointCoverageDays(365) === 0, cm.jointCoverageDays(365));
for (const d of DAYS) {
  run(`INSERT INTO metrics_daily (date,source,metric,value,dimension) VALUES (${dateOf(d)},'raptive','rpm',12.0,'')`);
}
ok('overlapping days do count', cm.jointCoverageDays(365) === 4, cm.jointCoverageDays(365));

// -- 9. a class with activity but zero active days cannot be annualised -------
//  Guard against a divide-by-zero reading as $0 of ads.
run(`DELETE FROM sessions WHERE class_id = 'c_meas'`);
run(`DELETE FROM score_events WHERE class_id = 'c_meas'`);
const idle = cm.report({ days: 30 });
const idleRow = idle.classes.find((r) => r.class_code === 'CSA-MEAS');
ok('a class with no activity reports null pageviews, not 0',
  idleRow.est_annual_pageviews === null && idleRow.est_annual_revenue_usd === null,
  { pv: idleRow.est_annual_pageviews, usd: idleRow.est_annual_revenue_usd });
ok('it still reports its enrolment, which is a fact we hold', idleRow.enrolled === 10, idleRow.enrolled);

//  THE GUARD IS PINNED DIRECTLY, and the reason is worth keeping. It is not
//  reachable through the tables today: a measured pageview implies a session
//  inside the window, which implies an active day, and an estimated pageview
//  implies a graded event, which implies one too. So the integration case above
//  passes because pv is null, NOT because the zero-day guard held, and a
//  mutation removing that guard stayed green against it. An unreachable guard
//  still has to hold, because the day a new signal contributes pageviews
//  without contributing a day, this is what stops the model dividing by zero
//  and reporting Infinity as money.
const synthetic = cm.priceRow(
  { class_id: 'x', class_code: 'X', course: 'ap-csa', cohort: 'EXTERNAL', tier: 'free',
    enrolled: 10, active_students: 10, active_days: 0, sessions: 4,
    page_views_measured: 400, active_minutes: 40, graded_events: 100 },
  { pageviews_per_event: 4, from_classes: 1, basis: 'measured_classes' }, 12, 30);
ok('priceRow refuses to annualise a row carrying pageviews but zero active days',
  synthetic.est_annual_pageviews === null && synthetic.est_annual_revenue_usd === null,
  { pv: synthetic.est_annual_pageviews, usd: synthetic.est_annual_revenue_usd });

// -- 10. no PII on the wire ---------------------------------------------------
const blob = JSON.stringify(cm.report({ days: 30 }));
ok('the report carries no display_name, teacher name or email',
  !/display_name|teacher_email|teacher_name|@school\.org|tannercrow12/.test(blob));

// -- 11. the endpoint is fail closed ------------------------------------------
//  The model is read-only and carries no identity, so the read-only admin key
//  reaches it. Nothing reaches it without a key, and that is the assertion that
//  matters: this endpoint describes every class in the business.
const app = express();
app.use(express.json());
app.use('/api/admin', require('../routes/admin'));
const server = app.listen(0);
const call = (p, key) => fetch(`http://127.0.0.1:${server.address().port}${p}`, {
  headers: key ? { 'x-admin-key': key } : {},
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

(async () => {
  const anon = await call('/api/admin/class-monetization');
  ok('no key is refused with 403', anon.status === 403, anon);

  const wrong = await call('/api/admin/class-monetization', 'not-the-key-but-long-enough-to-try');
  ok('a wrong key is refused with 403', wrong.status === 403, wrong);

  const good = await call('/api/admin/class-monetization?days=30', FULL_KEY);
  ok('the full admin key gets the report', good.status === 200 && !!good.body.stage, good.status);

  const ro = await call('/api/admin/class-monetization?days=30', READ_KEY);
  ok('the read-only admin key also gets it (no identity in the payload)',
    ro.status === 200 && !!ro.body.scenarios, ro.status);

  const sized = await call('/api/admin/class-monetization?days=30&sizes=28,55,110', FULL_KEY);
  ok('?sizes drives the scenario table',
    sized.body.scenarios.rows.map((r) => r.students).join(',') === '28,55,110',
    sized.body.scenarios.rows.map((r) => r.students));

  const rollup = await call('/api/admin/class-monetization?days=30&include_classes=false', FULL_KEY);
  ok('?include_classes=false omits the per-class array',
    rollup.body.classes === undefined && Array.isArray(rollup.body.by_tier), Object.keys(rollup.body));

  const junk = await call('/api/admin/class-monetization?days=notanumber&sizes=abc', FULL_KEY);
  ok('junk query params fall back to the defaults rather than 500',
    junk.status === 200 && junk.body.window_days === 30, junk.status);

  server.close();
  console.log(`\n  ${pass} passed, ${fail} failed`);
  for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(process.env.DB_PATH + suf); } catch (e) {} }
  process.exit(fail ? 1 : 0);
})();
