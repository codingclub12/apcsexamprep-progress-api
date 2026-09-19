#!/usr/bin/env node
'use strict';
// -----------------------------------------------------------------------------
//  MUTATION BATTERY for the classroom ad-revenue model. Break each rule on
//  purpose, one at a time, and require the suite to go red FOR THAT RULE. A
//  green mutation run is a FAILED check, and here that is the exit code.
//
//  WHY PER RULE AND NOT IN AGGREGATE
//  A suite that goes red for a DIFFERENT assertion than the one under test is
//  telling you the rule you meant to test is hollow: something else happened to
//  catch the damage, and the rule itself is unguarded. So every mutation below
//  names the exact assertion it must break, and a run where the suite went red
//  for other reasons counts as a failure here.
//
//  The rules are the ones that make a pricing number trustworthy. Each of them
//  is a way this model could produce a confident, plausible, wrong figure:
//
//    1  a missing RPM reading rendered as $0 rather than as null
//    2  the k-anonymity floor removed, so a 1 student class is readable
//    3  owner and prober classes setting the rate real schools are priced on
//    4  an estimate labelled as a measurement
//    5  annualising over calendar days instead of active days
//    6  the maturity stage promoted early, so October data prices February
//    7  joint coverage counted rather than intersected
//    8  a teacher email reaching the wire
//
//  Run: npm run smoke:classmonetizationmutation
// -----------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const FILES = {
  model: path.join(ROOT, 'lib', 'class-monetization.js'),
};
const ORIGINAL = {};
for (const [k, p] of Object.entries(FILES)) ORIGINAL[k] = fs.readFileSync(p, 'utf8');
const restore = () => { for (const [k, p] of Object.entries(FILES)) fs.writeFileSync(p, ORIGINAL[k]); };
process.on('SIGINT', () => { restore(); process.exit(130); });
process.on('uncaughtException', (e) => { restore(); console.error(e); process.exit(1); });

let pass = 0, fail = 0;
const ok = (n, c, x) => {
  if (c) { pass++; console.log('  [PASS] ' + n); }
  else { fail++; console.log('  [FAIL] ' + n + (x !== undefined ? '\n           ' + JSON.stringify(x, null, 1).slice(0, 700) : '')); }
};

const SUITE = path.join(__dirname, 'class-monetization.js');
function runSuite() {
  const r = spawnSync(process.execPath, [SUITE], { cwd: ROOT, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  return {
    code: r.status,
    failed: [...out.matchAll(/^\s*\[FAIL\] (.+?)(?:  \{|  \[|  "|$)/gm)].map((m) => m[1].trim()),
    out,
  };
}

const MUTATIONS = [
  {
    //  THE RULE THE WHOLE MODULE EXISTS FOR. An unmeasured class rendering as
    //  $0 of ads inverts the argument for charging money for an ad-free room.
    name: 'NULL BECOMES ZERO: a missing RPM reading is reported as $0.00',
    find: "  return { rpm_usd: null, basis: 'none', days: 0 };",
    repl: "  return { rpm_usd: 0, basis: 'none', days: 0 };",
    must: ['with no RPM reading the site rpm_usd is null, not 0'],
  },
  {
    //  The narrower version of the same defect, one layer down. The site RPM
    //  stays null and the ROW quietly prices at zero instead of refusing.
    name: 'NULL BECOMES ZERO, one layer down: an unpriced row prices at 0 instead of refusing',
    find: "    out.est_annual_revenue_usd = null;\n    out.est_annual_revenue_band = null;\n    out.unpriced_reason = 'no Raptive RPM reading in metrics_daily for this window';",
    repl: "    out.est_annual_revenue_usd = 0;\n    out.est_annual_revenue_band = { low: 0, high: 0 };\n    out.unpriced_reason = 'no Raptive RPM reading in metrics_daily for this window';",
    must: ['with no RPM a class revenue is NULL, not 0'],
  },
  {
    //  Remove the floor and a 1 student "class" becomes one child's browsing
    //  habits with a class code on it.
    name: 'K-ANONYMITY REMOVED: a 3 student class reports its behaviour',
    find: 'const MIN_CLASS_STUDENTS = 5;',
    repl: 'const MIN_CLASS_STUDENTS = 0;',
    must: ['a 3 student class is suppressed'],
  },
  {
    //  A suppressed class that zeroes instead of nulling is the null-vs-zero
    //  defect again, wearing the privacy rule as a disguise.
    name: 'SUPPRESSION ZEROES INSTEAD OF NULLING: a suppressed class reads as no traffic',
    find: "    out.page_views = null;\n    out.pageview_basis = 'suppressed';",
    repl: "    out.page_views = 0;\n    out.pageview_basis = 'suppressed';",
    must: ['a suppressed class reports NULL behaviour, not zero'],
  },
  {
    //  The correction that made the model usable at production scale. Dropping
    //  suppressed classes from the POOL as well as from their own row sounds
    //  cautious and is not: at 2.9 students a class, which is the live shape,
    //  it suppresses everything and the scenario table returns null.
    name: 'THE FLOOR IS OVER-APPLIED AGAIN: small classes are dropped from the pooled rate',
    find: '    if (!POOL_COHORTS.has(r.cohort)) continue;\n    if (r.active_students <= 0 || r.active_days <= 0) continue;',
    repl: '    if (!POOL_COHORTS.has(r.cohort)) continue;\n    if (r.active_students < MIN_CLASS_STUDENTS) continue;\n    if (r.active_students <= 0 || r.active_days <= 0) continue;',
    must: ['a class suppressed in its own row STILL counts toward the pooled rate'],
  },
  {
    //  A self-study student is a different population from an assigned class.
    //  Averaging the two produces a number that describes neither.
    name: 'SOLO ACCOUNTS SET THE CLASSROOM RATE',
    find: "const POOL_COHORTS = new Set(['EXTERNAL']);",
    repl: "const POOL_COHORTS = new Set(['EXTERNAL', 'SOLO']);",
    must: ['the solo group did NOT move the classroom rate'],
  },
  {
    //  A rate built from one room is that room's rate wearing a general name.
    name: 'THE POOL FLOOR IS REMOVED: two classes can set the rate for every school',
    find: 'const MIN_POOL_CLASSES = 3;',
    repl: 'const MIN_POOL_CLASSES = 0;',
    must: ['a pool of 2 classes refuses to produce a rate'],
  },
  {
    //  Tanner's own test classes are the heaviest users on the site. Letting
    //  them into the calibration sets every school's price from his browsing.
    name: 'EXCLUDED COHORT LEAKS IN: owner and prober classes set the calibration',
    find: '    if (!POOL_COHORTS.has(r.cohort)) continue;\n    if (r.page_views_measured > 0 && r.graded_events > 0) {',
    repl: '    if (r.page_views_measured > 0 && r.graded_events > 0) {',
    must: ['pageviews_per_event is 4.0, derived from c_meas alone'],
  },
  {
    //  Same leak, one stage later: the pooled per-student rate the scenario
    //  table extrapolates from.
    name: 'EXCLUDED COHORT LEAKS INTO THE SCENARIOS: the pooled per-student rate includes owner classes',
    find: '  for (const r of fRows) {\n    if (!POOL_COHORTS.has(r.cohort)) continue;',
    repl: '  for (const r of fRows) {',
    must: ['the owner class did not inflate the pooled rate'],
  },
  {
    //  An estimate wearing a measurement's label is the failure this repo has
    //  already had twice from a different direction: a number that reads like
    //  proof and is not.
    name: 'AN ESTIMATE IS LABELLED A MEASUREMENT',
    find: "    pv = r.graded_events * cal.pageviews_per_event;\n    basis = 'estimated';",
    repl: "    pv = r.graded_events * cal.pageviews_per_event;\n    basis = 'measured';",
    must: ['c_est is priced on the ESTIMATED basis at $108.00/yr'],
  },
  {
    //  Annualising over the window rather than over days the class actually
    //  worked turns a two week holiday into an engagement collapse, and a one
    //  day pilot into a full year of traffic.
    name: 'ANNUALISED OVER CALENDAR DAYS, NOT ACTIVE DAYS',
    find: '  const perActiveDay = pv / r.active_days;',
    repl: '  const perActiveDay = pv / 30;',
    must: ['c_meas is priced on the MEASURED basis at $216.00/yr'],
  },
  {
    //  The divide-by-zero guard. Without it an idle class reads as Infinity or
    //  NaN, and JSON.stringify turns NaN into null by accident rather than by
    //  rule, which is the kind of correct-by-luck that stops being correct.
    name: 'THE IDLE GUARD IS REMOVED: a class with no activity is annualised anyway',
    find: '  if (pv == null || r.active_days <= 0) {',
    repl: '  if (pv == null) {',
    must: ['priceRow refuses to annualise a row carrying pageviews but zero active days'],
  },
  {
    //  Found by the re-derivation rather than by review: pricing off the
    //  unrounded pageview count while REPORTING the rounded one leaves the two
    //  numbers a cent apart, so a reader checking by hand finds the report does
    //  not reconcile with itself.
    name: 'THE REPORT STOPS TYING OUT: money is priced off a figure the row does not state',
    find: '  const annualPv = Math.round(perActiveDay * SCHOOL_DAYS_PER_YEAR);\n  out.est_annual_pageviews = annualPv;',
    repl: '  const annualPv = perActiveDay * SCHOOL_DAYS_PER_YEAR;\n  out.est_annual_pageviews = Math.round(annualPv);',
    must: ['a small class ties its money to its own stated pageviews'],
  },
  {
    name: 'THE SCENARIO TABLE PRINTS A FRACTIONAL PAGEVIEW COUNT',
    find: '      const pv = Math.round(pool.rate * n);',
    repl: '      const pv = pool.rate * n;',
    must: ['every scenario row reports a WHOLE number of pageviews'],
  },
  {
    //  duration_seconds is wall clock from render to submit, so one student who
    //  opens a quiz and goes to lunch contributes an hour. The mean of
    //  10/20/30/1000 is 265, which is larger than three of the four real values.
    name: 'MEAN INSTEAD OF MEDIAN: one long lunch speaks for the whole class',
    find: '  ) WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2)',
    repl: '  ) WHERE 1 = 1',
    must: ['median task seconds is 25, not the mean of 265'],
  },
  {
    //  graded_events is attempts PLUS the per-question score_events ledger.
    //  Using it as the coverage denominator reports 3% for a population that is
    //  71% timed, and reads as an instrumentation failure that is not there.
    name: 'THE COVERAGE DENOMINATOR REACHES FOR graded_events INSTEAD OF attempts',
    find: '    attemptsTotal += r.graded_attempts || 0;',
    repl: '    attemptsTotal += r.graded_events || 0;',
    must: ['site task coverage is 5 timed of 7 attempts'],
  },
  {
    //  Android phones carry "Mobi" and Android tablets do not. Getting that
    //  backwards silently reclassifies every Android student, which matters
    //  because RPM differs by device.
    name: 'THE ANDROID RULE IS DROPPED: every Android student becomes a tablet',
    find: "                        OR (ua LIKE '%Android%' AND ua NOT LIKE '%Mobi%'))",
    repl: "                        OR ua LIKE '%Android%')",
    must: ['an Android WITHOUT Mobi is a tablet and one WITH it is a phone'],
  },
  {
    //  The null-not-zero rule, on the engagement side. A class nobody timed is
    //  not a class that spent no time.
    name: 'TASK TIME ZEROES INSTEAD OF NULLING',
    find: '      task_minutes: tt.timed > 0 ? Math.round(tt.task_s / 60) : null,',
    repl: '      task_minutes: Math.round(tt.task_s / 60),',
    must: ['a class with no timed attempt reports NULL task minutes, not 0'],
  },
  {
    //  Same rule on the site clock, which is the one that is empty in
    //  production. Reporting 0 minutes there would read as "they never visit".
    name: 'SITE TIME ZEROES INSTEAD OF NULLING, so an uninstrumented class reads as absent',
    find: '      site_minutes: s.sessions > 0 ? Math.round(s.active_s / 60) : null,',
    repl: '      site_minutes: Math.round(s.active_s / 60),',
    must: ['site_minutes is null where no heartbeat ran, not 0'],
  },
  {
    //  A floor that hides the dollar figure and leaves cadence, task time and
    //  device readable is a floor in name only.
    name: 'SUPPRESSION COVERS ONLY THE MONEY, NOT THE BEHAVIOUR',
    find: "    for (const k of ['active_days', 'active_days_per_week', 'sessions', 'site_minutes',\n      'graded_events', 'graded_attempts', 'task_items_timed', 'task_time_coverage', 'task_minutes',\n      'median_task_seconds', 'device_mix']) out[k] = null;",
    repl: '',
    must: ['a suppressed class hides its task time, cadence and device mix too'],
  },
  {
    //  A device bucket is a category. A User-Agent is a fingerprint.
    name: 'THE USER-AGENT IS SELECTED OUT OF SQL, which is how it would reach the wire',
    find: '  SELECT class_id,\n         COUNT(*) AS total,',
    repl: '  SELECT class_id, ua,\n         COUNT(*) AS total,',
    must: ['and every mention of it is a predicate, never a selected column'],
  },
  {
    //  Promote the stage early and a February pricing decision gets made on
    //  October data with nothing saying so.
    name: 'THE MATURITY STAGE IS PROMOTED EARLY',
    find: "  { name: 'estimate',      min_joint_days: 60,  note:",
    repl: "  { name: 'estimate',      min_joint_days: 10,  note:",
    must: ['59 joint days is still "rough"'],
  },
  {
    //  Counting instead of intersecting means two months of revenue and two
    //  months of behaviour that never overlap read as two months of coverage.
    name: 'JOINT COVERAGE IS COUNTED RATHER THAN INTERSECTED',
    find: '  let n = 0;\n  for (const d of beh) if (rev.has(d)) n += 1;\n  return n;',
    repl: '  return Math.min(rev.size, beh.length);',
    must: ['revenue days with no behaviour on them contribute 0 joint days'],
  },
  {
    //  THE CI FAILURE, REPLAYED. Preparing against metrics_daily at module
    //  scope puts this file in the boot path: the command-center migration is
    //  allowed to fail, the table is then absent, prepare() throws, and
    //  requiring routes/admin.js takes the whole API down before it serves
    //  anything. smoke/command.js test 14 caught this on PR 742; nothing in
    //  this suite did.
    name: 'metrics_daily IS PREPARED AT MODULE SCOPE AGAIN, putting this file in the boot path',
    find: "const SQL_RPM = `",
    repl: "const stmtRpmEager = db.prepare(`\n  SELECT 1 FROM metrics_daily LIMIT 1`);\nconst SQL_RPM = `",
    must: ['and NONE of them touches metrics_daily, which may not exist at require time'],
  },
  {
    //  The other half: the read path must treat a missing table as a missing
    //  reading rather than letting the error out.
    name: 'A MISSING metrics_daily THROWS INSTEAD OF READING AS NULL',
    find: "    if (/no such table/i.test(e && e.message)) {",
    repl: "    if (false) {",
    must: ['report() does not throw when metrics_daily is absent'],
  },
  {
    //  The zero-PII posture is not suspended because a report is useful.
    name: 'PII ON THE WIRE: the teacher email rides along on every class row',
    find: '      class_id: c.id,\n      class_code: c.class_code,',
    repl: '      class_id: c.id,\n      class_code: c.class_code,\n      teacher_email: c.teacher_email,',
    must: ['the report carries no display_name, teacher name or email'],
  },
];

// -- THE BASELINE -------------------------------------------------------------
//  A mutation run means nothing if the suite was already red.
console.log('\n  Baseline: the unmutated suite must be GREEN\n');
const base = runSuite();
ok('the suite passes on an unmutated tree', base.code === 0, base.failed.slice(0, 6));
if (base.code !== 0) {
  console.log('\n  Refusing to report on mutations against an already-red suite.\n');
  process.exit(1);
}

// -- THE BATTERY --------------------------------------------------------------
console.log('\n  Each rule, broken on purpose. Red is the pass.\n');
for (const m of MUTATIONS) {
  const p = FILES.model;
  const src = ORIGINAL.model;
  if (!src.includes(m.find)) {
    ok(m.name, false, { error: 'the find text is no longer in the file, so this mutation tests nothing', find: m.find.slice(0, 120) });
    continue;
  }
  fs.writeFileSync(p, src.split(m.find).join(m.repl));
  let r;
  try { r = runSuite(); } finally { restore(); }

  const hit = m.must.filter((name) => r.failed.some((f) => f.startsWith(name.slice(0, 55))));
  const stray = r.failed.filter((f) => !m.must.some((name) => f.startsWith(name.slice(0, 55))));

  //  BOTH halves matter. The suite must go red, AND it must go red for the
  //  assertion this mutation was aimed at. Red for something else means the
  //  rule under test is unguarded and something adjacent caught the damage.
  ok(m.name, r.code !== 0 && hit.length === m.must.length,
    r.code === 0
      ? { error: 'SUITE STAYED GREEN. This rule is not guarded.', expected: m.must }
      : (hit.length !== m.must.length
        ? { error: 'the suite went red, but not for the rule under test', expected: m.must, actually_failed: r.failed.slice(0, 6) }
        : undefined));
  if (r.code !== 0 && hit.length === m.must.length && stray.length) {
    console.log('           (also red, which is fine: ' + stray.slice(0, 3).join('; ') + ')');
  }
}

restore();
const clean = fs.readFileSync(FILES.model, 'utf8') === ORIGINAL.model;
ok('the tree is restored byte for byte', clean);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
