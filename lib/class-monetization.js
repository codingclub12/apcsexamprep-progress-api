'use strict';
// -----------------------------------------------------------------------------
//  CLASS MONETIZATION CONTRACT - the ONLY place a class's ad-revenue shape is
//  interpreted. Everything downstream reads one course-agnostic, tier-agnostic
//  row and never re-derives a denominator of its own.
//
//  THE QUESTION IT ANSWERS
//    "What is a 28 student class worth in ad revenue per year, and how much do I
//     trust that number today?"
//
//  It answers it as a funnel, because every stage of the funnel is a different
//  kind of uncertainty and collapsing them into one figure hides which stage is
//  weak:
//
//      enrolled -> active -> sessions -> pageviews -> estimated ad revenue
//
//  WHY THIS IS NOT A GA4 CUSTOM DIMENSION
//    The obvious build is to stamp class_id onto GA4 events and let Google do
//    the rollup. This repo deliberately does not, for two reasons that are not
//    about convenience.
//
//    First, our students are minors on name + PIN, and the repo-wide posture is
//    zero PII with exactly one named exception. Sending class membership to a
//    third party analytics vendor is a second exception, and a second exception
//    is a decision rather than a patch.
//
//    Second, we do not need it. The progress API already sees every class's
//    activity directly: sessions carries class_id, page_views, active_seconds
//    and a first-touch channel, and score_events and attempts carry class_id
//    with a timestamp. The attribution GA4 would have to be taught is already
//    in our own tables, already bounded, and already never leaves the box.
//
//  WHAT IS DELIBERATELY REFUSED
//    A number this model cannot support is returned as null, never as 0. That
//    is the same rule lib/gradebook-contract.js enforces for an unattempted
//    cell, and it exists for the same reason: "nobody has measured this" and
//    "this earned nothing" are different facts and must never render alike. A
//    class with no RPM reading is not a class worth $0 of ads.
//
//  ZERO PII
//    Output carries class_id, class_code, course, tier and counts. It never
//    carries a student name, a teacher name, or a teacher email, and there is
//    no reveal mode that would add one. A class code is a room code, not a
//    person.
//
//  No em-dashes, per repo convention.
// -----------------------------------------------------------------------------
const db = require('../db');
const { classifyClass, premiumStatus } = require('./admin-metrics');

// -- POLICY CONSTANTS ---------------------------------------------------------

//  K-ANONYMITY FLOOR. Below this many ACTIVE students, a per-class row stops
//  reporting behaviour and reports only that it was suppressed.
//
//  The reason is not regulatory theatre. At one active student a "class page
//  view rate" is one child's browsing habits with a class code attached, and at
//  two it is still trivially attributable by a teacher looking at the roster.
//  The aggregate rows and the scenario table below are unaffected, because they
//  are what the pricing question actually needs; nothing about answering "what
//  is a 28 student class worth" requires reading a 1 student class.
const MIN_CLASS_STUDENTS = 5;

//  THE FLOOR PROTECTS A ROW, NOT A TOTAL, and getting that backwards made the
//  model useless at production scale.
//
//  The first cut also dropped every suppressed class from the POOLED per student
//  rate, which sounds cautious and is not: aggregation across hundreds of
//  classes is exactly what k-anonymity permits, and excluding small classes from
//  a total is how a census would lose its smallest towns. Benchmarked against
//  the live shape (637 active classes, 1826 active students, so 2.9 students a
//  class), every single row fell below the floor and the scenario table came
//  back null. The tool answered nothing on the only data it will ever see.
//
//  So the pool takes every eligible class and a floor is applied to the POOL
//  instead. It has to describe more than one room to be a rate at all.
const MIN_POOL_CLASSES = 3;
const MIN_POOL_STUDENTS = 20;

//  WHOSE BEHAVIOUR SETS A CLASSROOM RATE. Only real teacher classes, which is
//  cohort EXTERNAL.
//
//  Solo ME- accounts are excluded from the POOL and still reported in by_tier,
//  and that is a modelling judgement rather than a privacy one. The scenario
//  table answers "what is a 28 student classroom worth". A self-study student
//  working alone at their own pace is a different population from a class
//  assigned work by a teacher, and averaging the two produces a number that
//  describes neither. Owner, prober and audit classes are excluded as before.
const POOL_COHORTS = new Set(['EXTERNAL']);

//  Annualisation basis. A classroom generates pageviews on school days only, so
//  annualising a daily rate over 365 overstates it by roughly double. 180 is the
//  conventional US instructional year. It is a STATED assumption and it is
//  returned in the report so a reader can re-run the arithmetic with their own.
const SCHOOL_DAYS_PER_YEAR = 180;

//  Confidence band. The point estimate is a product of four measured or
//  estimated terms, and each carries error. Rather than invent a variance model
//  the repo cannot defend, the band is a stated multiplier that WIDENS when the
//  model is leaning on an estimated pageview basis rather than a measured one.
//  Wide and honest beats narrow and fabricated.
const BAND = {
  measured:  { low: 0.75, high: 1.35 },
  estimated: { low: 0.40, high: 2.20 },
};

//  MATURITY STAGES. The whole point of staging is that a February pricing
//  decision must not be made on October data by accident, so the stage is
//  DERIVED from joint coverage and a caller cannot assert it.
//
//  joint coverage = days on which we hold BOTH a class-side behaviour reading
//  and a site-side revenue reading. Either alone cannot price anything.
const STAGES = [
  { name: 'pricing_grade', min_joint_days: 150, note: 'Close to a full school-year curve. Safe to set a price against.' },
  { name: 'estimate',      min_joint_days: 60,  note: 'Two or more months of real classroom behaviour. Good enough to plan against, not to price.' },
  { name: 'rough',         min_joint_days: 0,   note: 'Order of magnitude only. Too much extrapolation to price against.' },
];

// -- PREPARED STATEMENTS (module scope, reused) -------------------------------
//  Every read below is a single aggregate pass grouped by class. There is no
//  per-class query anywhere in this module: reads are the heavy path and a 637
//  class N+1 on a 1 vCPU box is how the Railway bill moves.

const stmtClasses = db.prepare(`
  SELECT c.id, c.class_code, c.class_name, c.course, c.teacher_id, c.active,
         t.email AS teacher_email, t.name AS teacher_name
    FROM classes c
    LEFT JOIN teachers t ON t.id = c.teacher_id
`);

const stmtActiveEntitlements = db.prepare(
  `SELECT teacher_id, course FROM entitlements
    WHERE status = 'active' AND (expires_at IS NULL OR expires_at > datetime('now'))`
);

const stmtEnrolled = db.prepare(
  `SELECT class_id, COUNT(*) AS enrolled FROM students WHERE active = 1 GROUP BY class_id`
);

const stmtSessions = db.prepare(`
  SELECT class_id,
         COUNT(*)                            AS sessions,
         COALESCE(SUM(page_views), 0)        AS page_views,
         COALESCE(SUM(active_seconds), 0)    AS active_s,
         COUNT(DISTINCT date(started_at))    AS session_days
    FROM sessions
   WHERE started_at >= datetime('now', ?)
   GROUP BY class_id
`);

//  Graded submissions, both ledgers. score_events is the per-question ledger and
//  attempts is the per-submission one; they are different grains on purpose and
//  are counted separately rather than summed into a single "event" that means
//  neither.
const stmtScoreEvents = db.prepare(`
  SELECT class_id, COUNT(*) AS n FROM score_events
   WHERE created_at >= datetime('now', ?) GROUP BY class_id
`);

const stmtAttempts = db.prepare(`
  SELECT class_id, COUNT(*) AS n FROM attempts
   WHERE created_at >= datetime('now', ?) GROUP BY class_id
`);

//  ACTIVE STUDENTS and ACTIVE DAYS, unioned across all three signals in one
//  pass. A student who only reads (a session with no submission) is active, and
//  a student who only submits (no heartbeat on the page) is active too. Counting
//  either signal alone undercounts, and today the heartbeat is the one that is
//  usually missing, so the union is not academic.
const stmtActivity = db.prepare(`
  SELECT class_id,
         COUNT(DISTINCT student_id) AS active_students,
         COUNT(DISTINCT d)          AS active_days
    FROM (
      SELECT class_id, student_id, date(created_at) AS d FROM score_events WHERE created_at >= datetime('now', ?)
      UNION
      SELECT class_id, student_id, date(created_at) AS d FROM attempts     WHERE created_at >= datetime('now', ?)
      UNION
      SELECT class_id, student_id, date(started_at) AS d FROM sessions     WHERE started_at >= datetime('now', ?)
    )
   GROUP BY class_id
`);

//  Site-side revenue. Raptive arrives by CSV import into metrics_daily, so this
//  may legitimately be empty; an empty read is a null RPM, never a zero one.
//  ── metrics_daily IS PREPARED LAZILY, AND THAT IS A BOOT SAFETY RULE ────────
//
//  Every other table this module reads is created by db.js itself, so it is
//  there by the time anything requires this file. metrics_daily is not: it is
//  created by the command-center migration in lib/command-schema.js, which runs
//  later and is explicitly allowed to fail.
//
//  smoke/command.js test 14 pins exactly that: "a thrown exception inside the
//  migration does not prevent boot; /api/health still ok". Preparing against
//  metrics_daily at module scope put this file in the boot path and broke it.
//  routes/admin.js requires this module, better-sqlite3 throws SQLITE_ERROR on
//  prepare against a table that does not exist, and the whole API failed to
//  start. CI caught it; review had not.
//
//  So these prepare on first use and cache, and a missing table is reported the
//  same way a missing reading is: as null. That is not a special case bolted on
//  for a test, it is this module's rule applied one level further down. No
//  metrics_daily means no revenue reading, and no revenue reading means null.
const lazyStmts = new Map();
function metricsRead(key, sql, params, one) {
  try {
    if (!lazyStmts.has(key)) lazyStmts.set(key, db.prepare(sql));
    const st = lazyStmts.get(key);
    return one ? st.get(...params) : st.all(...params);
  } catch (e) {
    if (/no such table/i.test(e && e.message)) {
      //  Do not cache a failed prepare: the migration may create the table
      //  later in the same process, and a sticky null would outlive the fault.
      lazyStmts.delete(key);
      return null;
    }
    throw e;
  }
}

const SQL_RPM = `
  SELECT metric, AVG(value) AS avg_value, SUM(value) AS sum_value, COUNT(*) AS days
    FROM metrics_daily
   WHERE source = 'raptive' AND dimension = '' AND metric IN ('rpm', 'revenue', 'ad_impressions')
     AND date >= date('now', ?)
   GROUP BY metric`;

const SQL_GA4_PAGEVIEWS = `
  SELECT SUM(value) AS pageviews, COUNT(*) AS days
    FROM metrics_daily
   WHERE source = 'ga4' AND dimension = '' AND metric = 'pageviews'
     AND date >= date('now', ?)`;

//  Joint coverage: days carrying BOTH a revenue reading and class-side
//  behaviour. This is what the maturity stage is derived from.
const SQL_REVENUE_DAYS = `
  SELECT DISTINCT date FROM metrics_daily
   WHERE source = 'raptive' AND dimension = '' AND metric IN ('rpm', 'revenue')
     AND date >= date('now', ?)`;

const stmtBehaviourDays = db.prepare(`
  SELECT DISTINCT d FROM (
    SELECT date(created_at) AS d FROM score_events WHERE created_at >= datetime('now', ?)
    UNION
    SELECT date(created_at) AS d FROM attempts     WHERE created_at >= datetime('now', ?)
    UNION
    SELECT date(started_at) AS d FROM sessions     WHERE started_at >= datetime('now', ?)
  )
`);

//  ENGAGEMENT, and the reason it is called TASK time rather than time on page.
//
//  Three different clocks exist in this database and only one of them is being
//  wound today. Calling any of them "time on page" would be the same mislabel
//  the pageview basis refuses:
//
//    attempts.duration_seconds   time from an item rendering to the student
//                                submitting it. COLLECTED TODAY: the live theme
//                                reporters (apcs-reporter.js, intro-java, and
//                                ap-networking) all send it, and the server
//                                clamps it to 86400.
//    sessions.active_seconds     engaged time across a whole visit. Schema and
//                                endpoint exist; not collected, because
//                                heartbeat-reporter.js is not on the storefront.
//    progress.time_spent_s       per activity, accumulated. The column and the
//                                write path exist and NOTHING SENDS IT, so it
//                                is empty rather than merely thin.
//
//  So we hold time on TASK, not time on PAGE. A student reading a lesson for
//  twenty minutes and answering nothing registers zero task seconds, and no
//  arrangement of the data we have today can say otherwise.
const stmtTaskTime = db.prepare(`
  SELECT class_id,
         COUNT(*)                          AS attempts_total,
         SUM(CASE WHEN duration_seconds IS NOT NULL THEN 1 ELSE 0 END) AS timed,
         COALESCE(SUM(duration_seconds),0) AS task_s
    FROM attempts
   WHERE created_at >= datetime('now', ?)
   GROUP BY class_id
`);

//  MEDIAN, NOT MEAN, and this is not a style preference. duration_seconds is
//  wall clock from render to submit, so a student who opens a quiz and goes to
//  lunch contributes a 3600 second item. Clamping is at 86400, which is a whole
//  day. One such row in a class of thirty drags a mean past every real value;
//  the median does not move at all.
const stmtTaskMedian = db.prepare(`
  SELECT class_id, AVG(duration_seconds) AS median_s FROM (
    SELECT class_id, duration_seconds,
           ROW_NUMBER() OVER (PARTITION BY class_id ORDER BY duration_seconds) AS rn,
           COUNT(*)     OVER (PARTITION BY class_id)                           AS cnt
      FROM attempts
     WHERE created_at >= datetime('now', ?) AND duration_seconds IS NOT NULL
  ) WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2)
  GROUP BY class_id
`);

//  DEVICE MIX, classified IN SQL so the User-Agent string never leaves the
//  database. The output is a share per bucket and nothing else; there is no
//  mode of this endpoint that returns a UA.
//
//  It is here because it is the one thing in this model that changes what a
//  pageview is WORTH. Ad RPM on mobile runs well below desktop, so two classes
//  with identical pageviews are not identical revenue. Nothing here applies a
//  multiplier for it, because our only RPM reading is a site total and inventing
//  a per-device split would be exactly the fabrication this module refuses.
//  It is reported so the gap is visible, and so a per-device Raptive export can
//  be wired in later against a number that was already being tracked.
//
//  The Android rule is the one worth knowing: phones carry "Mobi" and tablets
//  do not, which is the convention Google documents and the only way to tell
//  them apart from the UA alone.
const stmtDeviceMix = db.prepare(`
  SELECT class_id,
         COUNT(*) AS total,
         SUM(CASE WHEN ua IS NULL OR ua = '' THEN 1 ELSE 0 END) AS unknown,
         SUM(CASE WHEN (ua LIKE '%iPad%' OR ua LIKE '%Tablet%'
                        OR (ua LIKE '%Android%' AND ua NOT LIKE '%Mobi%'))
                  THEN 1 ELSE 0 END) AS tablet,
         SUM(CASE WHEN (ua LIKE '%iPhone%' OR ua LIKE '%iPod%' OR ua LIKE '%Mobi%')
                   AND ua NOT LIKE '%iPad%' AND ua NOT LIKE '%Tablet%'
                  THEN 1 ELSE 0 END) AS mobile
    FROM attempts
   WHERE created_at >= datetime('now', ?)
   GROUP BY class_id
`);

// -- HELPERS ------------------------------------------------------------------

//  A window is expressed once, as a SQLite modifier string, so a caller cannot
//  pass '-30 days' to one query and '-30 day' to another and get two windows.
function windowDays(days) {
  const n = Math.floor(Number(days));
  if (!Number.isFinite(n) || n < 1) return 30;
  return Math.min(n, 400); // metrics_daily retention is 400 days
}
function modifier(days) { return '-' + windowDays(days) + ' days'; }

function toMap(rows, key) {
  const m = new Map();
  for (const r of rows) m.set(r[key], r);
  return m;
}

//  Round money to cents and rates to something a human can read back. Returning
//  17 significant figures invites a reader to believe them.
function money(v) { return v == null ? null : Math.round(v * 100) / 100; }
function rate(v)  { return v == null ? null : Math.round(v * 1000) / 1000; }

// -- SITE SIDE ----------------------------------------------------------------

//  The RPM reading. Prefer a directly reported rpm; fall back to deriving it
//  from revenue and pageviews, which is the same arithmetic Raptive does. If
//  neither is available the answer is null and every revenue figure downstream
//  becomes null with it.
function siteRevenue(days) {
  const mod = modifier(days);
  const rpmRows = metricsRead('rpm', SQL_RPM, [mod]);
  if (rpmRows === null) {
    return { rpm_usd: null, basis: 'none', days: 0, reason: 'metrics_daily is not present' };
  }
  const byMetric = toMap(rpmRows, 'metric');
  const rpmRow = byMetric.get('rpm');
  const revRow = byMetric.get('revenue');
  const ga4 = metricsRead('ga4pv', SQL_GA4_PAGEVIEWS, [mod], true) || {};

  if (rpmRow && rpmRow.days > 0) {
    return { rpm_usd: money(rpmRow.avg_value), basis: 'reported', days: rpmRow.days };
  }
  if (revRow && revRow.days > 0 && ga4.pageviews > 0) {
    return {
      rpm_usd: money((revRow.sum_value / ga4.pageviews) * 1000),
      basis: 'derived_from_revenue_and_ga4_pageviews',
      days: revRow.days,
    };
  }
  //  NOT ZERO. See the header: no reading is not the same fact as no money.
  return { rpm_usd: null, basis: 'none', days: 0 };
}

//  Joint coverage in days. Intersection, not the smaller of the two counts: two
//  months of revenue and two months of behaviour that do not overlap price
//  nothing.
function jointCoverageDays(days) {
  const mod = modifier(days);
  const revRows = metricsRead('revdays', SQL_REVENUE_DAYS, [mod]);
  if (revRows === null) return 0;
  const rev = new Set(revRows.map((r) => r.date));
  if (!rev.size) return 0;
  const beh = stmtBehaviourDays.all(mod, mod, mod).map((r) => r.d);
  let n = 0;
  for (const d of beh) if (rev.has(d)) n += 1;
  return n;
}

function stageFor(jointDays) {
  for (const s of STAGES) {
    if (jointDays >= s.min_joint_days) {
      return { name: s.name, joint_days: jointDays, note: s.note };
    }
  }
  // STAGES ends at min_joint_days 0, so this is unreachable by construction.
  return { name: 'rough', joint_days: jointDays, note: STAGES[STAGES.length - 1].note };
}

// -- THE FUNNEL ---------------------------------------------------------------

//  Per-class rows. Every class the store knows about, classified, with its
//  funnel for the window. Excluded cohorts (owner, prober, audit) are carried
//  with tier 'excluded' and are NEVER folded into a rate or a scenario: Tanner's
//  own test classes would otherwise set the pageview rate the pricing model
//  extrapolates from.
function funnel(opts) {
  const o = opts || {};
  const days = windowDays(o.days);
  const mod = modifier(days);

  const entitled = new Set(stmtActiveEntitlements.all().map((r) => r.teacher_id + '|' + r.course));
  const enrolled = toMap(stmtEnrolled.all(), 'class_id');
  const sessions = toMap(stmtSessions.all(mod), 'class_id');
  const scoreEv  = toMap(stmtScoreEvents.all(mod), 'class_id');
  const attempts = toMap(stmtAttempts.all(mod), 'class_id');
  const activity = toMap(stmtActivity.all(mod, mod, mod), 'class_id');
  const taskTime = toMap(stmtTaskTime.all(mod), 'class_id');
  const taskMed  = toMap(stmtTaskMedian.all(mod), 'class_id');
  const devices  = toMap(stmtDeviceMix.all(mod), 'class_id');

  const rows = [];
  for (const c of stmtClasses.all()) {
    const s = sessions.get(c.id) || { sessions: 0, page_views: 0, active_s: 0, session_days: 0 };
    const a = activity.get(c.id) || { active_students: 0, active_days: 0 };
    const events = ((scoreEv.get(c.id) || {}).n || 0) + ((attempts.get(c.id) || {}).n || 0);

    const tt = taskTime.get(c.id) || { attempts_total: 0, timed: 0, task_s: 0 };
    const dv = devices.get(c.id) || null;
    const med = (taskMed.get(c.id) || {}).median_s;

    //  CADENCE, which is the question "does this class log in twice a month or
    //  three times a week" asked directly. active_days over the window, put on
    //  a per week footing so a 30 day and a 90 day window are comparable.
    const daysPerWeek = a.active_days > 0 ? (a.active_days / (days / 7)) : null;

    rows.push({
      class_id: c.id,
      class_code: c.class_code,
      course: c.course,
      cohort: classifyClass(c),
      tier: premiumStatus(c, entitled),
      class_active: !!c.active,
      enrolled: (enrolled.get(c.id) || {}).enrolled || 0,
      active_students: a.active_students,
      active_days: a.active_days,
      active_days_per_week: daysPerWeek == null ? null : Math.round(daysPerWeek * 100) / 100,
      sessions: s.sessions,
      page_views_measured: s.page_views,
      //  Time on SITE, from the heartbeat. Null rather than 0 when no session
      //  row exists, because those are different facts and this column is
      //  empty for nearly every class today.
      site_minutes: s.sessions > 0 ? Math.round(s.active_s / 60) : null,
      graded_events: events,

      //  Time on TASK, from attempts. Collected today.
      //
      //  graded_attempts is the attempts table ALONE, and it exists because
      //  graded_events is attempts PLUS score_events. Dividing timed attempts
      //  by the combined figure understates coverage by roughly half, which is
      //  what the site rollup did until a scale benchmark printed 42.9% for a
      //  fixture that is 85.7% timed by construction.
      graded_attempts: tt.attempts_total,
      task_items_timed: tt.timed,
      task_time_coverage: tt.attempts_total > 0
        ? Math.round((tt.timed / tt.attempts_total) * 1000) / 10
        : null,
      task_minutes: tt.timed > 0 ? Math.round(tt.task_s / 60) : null,
      median_task_seconds: med == null ? null : Math.round(med),
      device_mix: dv && dv.total > 0 ? {
        mobile: Math.round((dv.mobile / dv.total) * 1000) / 10,
        tablet: Math.round((dv.tablet / dv.total) * 1000) / 10,
        desktop: Math.round(((dv.total - dv.mobile - dv.tablet - dv.unknown) / dv.total) * 1000) / 10,
        unknown: Math.round((dv.unknown / dv.total) * 1000) / 10,
        sample: dv.total,
      } : null,
    });
  }
  return { window_days: days, rows };
}

//  THE CALIBRATION, and the reason the model works at all today.
//
//  sessions.page_views is the only MEASURED pageview signal we own, and it is
//  written by public/heartbeat-reporter.js. That reporter is not currently
//  included on storefront lesson pages (verified live 2026-09-19: three AP Cyber
//  Unit 1 lesson pages carry apcs-tracker.js and carry neither the reporter nor
//  the APCS_HEARTBEAT config block), so for most classes page_views is 0 and 0
//  here means "not instrumented", not "read nothing".
//
//  So a class with no measured pageviews has its pageviews ESTIMATED from its
//  graded events, using a ratio derived from the classes that DO carry both
//  signals. The ratio is computed from our own data rather than from GA4, which
//  means it needs no third party, no new dimension, and no PII decision, and it
//  self-corrects the moment more pages are instrumented.
//
//  A caller is always told which basis a row used. An estimate must never be
//  presented as a measurement.
function calibration(f) {
  let pv = 0, ev = 0, classes = 0;
  for (const r of f.rows) {
    //  THE SAME POPULATION THE POOL USES, and deliberately not a second
    //  definition of it. The ratio feeds the number a price gets set from, so
    //  a class that may not set the rate may not set the ratio either. An
    //  earlier cut filtered on the TIER here and on the COHORT in the pool,
    //  which let solo self-study accounts calibrate a classroom estimate.
    if (!POOL_COHORTS.has(r.cohort)) continue;
    if (r.page_views_measured > 0 && r.graded_events > 0) {
      pv += r.page_views_measured;
      ev += r.graded_events;
      classes += 1;
    }
  }
  if (!classes || ev <= 0) {
    return { pageviews_per_event: null, from_classes: 0, basis: 'none' };
  }
  return { pageviews_per_event: rate(pv / ev), from_classes: classes, basis: 'measured_classes' };
}

// -- THE MODEL ----------------------------------------------------------------

//  Attach the money to a funnel row. Returns the row enriched, or with nulls and
//  a reason when it cannot be priced. Never returns 0 for an unknown.
function priceRow(r, cal, rpmUsd) {
  const out = Object.assign({}, r);

  //  K-ANONYMITY. Suppress the behaviour, keep the membership. A reader still
  //  learns the class exists and which tier it is in, which is what a rollup
  //  needs, and learns nothing about how one child browses.
  if (r.tier !== 'excluded' && r.active_students > 0 && r.active_students < MIN_CLASS_STUDENTS) {
    out.suppressed = true;
    out.suppressed_reason = 'fewer than ' + MIN_CLASS_STUDENTS + ' active students';
    out.page_views = null;
    out.pageview_basis = 'suppressed';
    out.est_annual_pageviews = null;
    out.est_annual_revenue_usd = null;
    out.est_annual_revenue_band = null;
    //  EVERY BEHAVIOURAL FIELD, not just the money. Membership stays (the class
    //  exists, it has this many students, it is in this tier) because a rollup
    //  needs it and it says nothing about a person. How often they work, how
    //  long an item takes them and what they browse on is exactly what the
    //  floor exists to withhold, and leaving those readable while nulling the
    //  dollar figure would be a floor in name only.
    for (const k of ['active_days', 'active_days_per_week', 'sessions', 'site_minutes',
      'graded_events', 'graded_attempts', 'task_items_timed', 'task_time_coverage', 'task_minutes',
      'median_task_seconds', 'device_mix']) out[k] = null;
    return out;
  }
  out.suppressed = false;

  //  Pageviews: measured where instrumented, estimated where not, null when the
  //  calibration itself is unavailable.
  let pv = null, basis = 'none';
  if (r.page_views_measured > 0) {
    pv = r.page_views_measured;
    basis = 'measured';
  } else if (cal.pageviews_per_event != null && r.graded_events > 0) {
    pv = r.graded_events * cal.pageviews_per_event;
    basis = 'estimated';
  }
  out.page_views = pv == null ? null : Math.round(pv);
  out.pageview_basis = basis;

  //  Annualise. A class's observed rate is per ACTIVE DAY, because a window that
  //  spans a holiday would otherwise read as a collapse in engagement. Zero
  //  active days means nothing observed, which is null rather than zero.
  if (pv == null || r.active_days <= 0) {
    out.est_annual_pageviews = null;
    out.est_annual_revenue_usd = null;
    out.est_annual_revenue_band = null;
    return out;
  }
  //  ROUND FIRST, THEN PRICE. The money must be derivable from the pageview
  //  figure this same object reports, or a reader checking the arithmetic by
  //  hand finds it does not tie out. Pricing off the unrounded value and
  //  reporting the rounded one put two classes a cent apart from their own
  //  stated pageviews, which the re-derivation in scripts/ caught.
  const perActiveDay = pv / r.active_days;
  const annualPv = Math.round(perActiveDay * SCHOOL_DAYS_PER_YEAR);
  out.est_annual_pageviews = annualPv;

  if (rpmUsd == null) {
    //  The single most common reason a figure here is null, and it is a missing
    //  CSV import rather than a defect. Named so a reader knows what to go do.
    out.est_annual_revenue_usd = null;
    out.est_annual_revenue_band = null;
    out.unpriced_reason = 'no Raptive RPM reading in metrics_daily for this window';
    return out;
  }
  const band = BAND[basis] || BAND.estimated;
  const point = (annualPv / 1000) * rpmUsd;
  out.est_annual_revenue_usd = money(point);
  out.est_annual_revenue_band = { low: money(point * band.low), high: money(point * band.high) };
  return out;
}

//  THE POOLED RATE: annual pageviews per active student, across real teacher
//  classes. Computed from the FUNNEL rows rather than from the priced ones, so
//  that a class too small to report individually still contributes to the
//  total. See MIN_POOL_CLASSES above for why that distinction matters.
function pooledRate(fRows, cal) {
  let pvSum = 0, studentSum = 0, classes = 0, anyMeasured = false;
  for (const r of fRows) {
    if (!POOL_COHORTS.has(r.cohort)) continue;
    if (r.active_students <= 0 || r.active_days <= 0) continue;
    let pv = null, measured = false;
    if (r.page_views_measured > 0) { pv = r.page_views_measured; measured = true; }
    else if (cal.pageviews_per_event != null && r.graded_events > 0) {
      pv = r.graded_events * cal.pageviews_per_event;
    }
    if (pv == null) continue;
    //  Round each class the same way its own row does, so the pool is the sum
    //  of the numbers the report states rather than of numbers behind them.
    pvSum += Math.round((pv / r.active_days) * SCHOOL_DAYS_PER_YEAR);
    studentSum += r.active_students;
    classes += 1;
    if (measured) anyMeasured = true;
  }
  if (classes < MIN_POOL_CLASSES || studentSum < MIN_POOL_STUDENTS) {
    return {
      rate: null,
      from_classes: classes,
      from_active_students: studentSum,
      any_measured: anyMeasured,
      reason: classes === 0
        ? 'no teacher class produced a pageview figure in this window'
        : 'the pool is too small to describe a classroom: '
          + classes + ' class(es), ' + studentSum + ' active student(s); '
          + 'need ' + MIN_POOL_CLASSES + ' and ' + MIN_POOL_STUDENTS,
    };
  }
  return { rate: pvSum / studentSum, from_classes: classes, from_active_students: studentSum, any_measured: anyMeasured };
}

//  SCENARIOS: "a 28 student class is worth $X a year". Pure arithmetic on the
//  pooled rate, so that the table can never be quoting a different rate than the
//  one it prints beside itself.
function scenarios(pool, rpmUsd, sizes) {
  const wanted = Array.isArray(sizes) && sizes.length ? sizes : [25, 28, 50, 55, 100, 110];
  if (pool.rate == null) {
    return {
      basis: 'none',
      reason: pool.reason,
      from_classes: pool.from_classes,
      from_active_students: pool.from_active_students,
      annual_pageviews_per_active_student: null,
      rows: wanted.map((n) => ({ students: n, est_annual_pageviews: null, est_annual_revenue_usd: null, est_annual_revenue_band: null })),
    };
  }
  const band = pool.any_measured ? BAND.measured : BAND.estimated;
  return {
    basis: pool.any_measured ? 'measured_and_estimated' : 'estimated_only',
    from_classes: pool.from_classes,
    from_active_students: pool.from_active_students,
    annual_pageviews_per_active_student: Math.round(pool.rate),
    rows: wanted.map((n) => {
      //  Same rule as a class row: the reported pageview figure is what gets
      //  priced, so the table ties out to itself.
      const pv = Math.round(pool.rate * n);
      if (rpmUsd == null) {
        return {
          students: n,
          est_annual_pageviews: pv,
          est_annual_revenue_usd: null,
          est_annual_revenue_band: null,
          unpriced_reason: 'no Raptive RPM reading in metrics_daily for this window',
        };
      }
      const point = (pv / 1000) * rpmUsd;
      return {
        students: n,
        est_annual_pageviews: pv,
        est_annual_revenue_usd: money(point),
        est_annual_revenue_band: { low: money(point * band.low), high: money(point * band.high) },
      };
    }),
  };
}

//  SITE ENGAGEMENT, over real teacher classes. This is the block that answers
//  "how much are they actually using it", separately from what that is worth.
//
//  It states its own COVERAGE rather than implying it. task_time_coverage is
//  the share of attempts that arrived carrying a duration, and a low number
//  there means the figures above it describe a subset, not the class.
function engagement(fRows) {
  let timed = 0, attemptsTotal = 0, taskMin = 0, classes = 0;
  let siteMin = 0, siteClasses = 0;
  let daysSum = 0, daysClasses = 0;
  const dev = { mobile: 0, tablet: 0, desktop: 0, unknown: 0, sample: 0 };
  const medians = [];

  for (const r of fRows) {
    if (!POOL_COHORTS.has(r.cohort)) continue;
    classes += 1;
    attemptsTotal += r.graded_attempts || 0;
    if (r.task_items_timed) { timed += r.task_items_timed; taskMin += r.task_minutes || 0; }
    if (r.median_task_seconds != null) medians.push(r.median_task_seconds);
    if (r.site_minutes != null) { siteMin += r.site_minutes; siteClasses += 1; }
    if (r.active_days_per_week != null) { daysSum += r.active_days_per_week; daysClasses += 1; }
    if (r.device_mix) {
      const d = r.device_mix;
      dev.sample += d.sample;
      dev.mobile += (d.mobile / 100) * d.sample;
      dev.tablet += (d.tablet / 100) * d.sample;
      dev.desktop += (d.desktop / 100) * d.sample;
      dev.unknown += (d.unknown / 100) * d.sample;
    }
  }

  //  Median of the per-class medians. Not a median of every item, which would
  //  let one enormous class speak for the site.
  medians.sort((a, b) => a - b);
  const medianOfMedians = medians.length
    ? (medians.length % 2
      ? medians[(medians.length - 1) / 2]
      : Math.round((medians[medians.length / 2 - 1] + medians[medians.length / 2]) / 2))
    : null;

  const share = (n) => (dev.sample > 0 ? Math.round((n / dev.sample) * 1000) / 10 : null);

  return {
    classes,
    //  TIME ON TASK. Collected today.
    task_time: {
      items_timed: timed,
      coverage_pct: attemptsTotal > 0 ? Math.round((timed / attemptsTotal) * 1000) / 10 : null,
      total_minutes: timed > 0 ? taskMin : null,
      median_seconds_per_item: medianOfMedians,
      note: 'Time from an item rendering to the student submitting it, sent by the theme reporters. This is time on TASK, not time on page.',
    },
    //  TIME ON SITE. Waiting on the same instrumentation the pageviews are.
    site_time: {
      classes_reporting: siteClasses,
      total_minutes: siteClasses > 0 ? siteMin : null,
      note: siteClasses === 0
        ? 'Nothing reporting. sessions.active_seconds is written by public/heartbeat-reporter.js, which is not on the storefront, so time on site and time on page are both unavailable today.'
        : 'Engaged time across a visit, from the heartbeat.',
    },
    cadence: {
      classes_reporting: daysClasses,
      mean_active_days_per_week: daysClasses > 0 ? Math.round((daysSum / daysClasses) * 100) / 100 : null,
      note: 'Active days per week per class. This is the "twice a month or three times a week" number.',
    },
    //  Reported, never applied. See stmtDeviceMix for why.
    device_mix: dev.sample > 0
      ? { mobile: share(dev.mobile), tablet: share(dev.tablet), desktop: share(dev.desktop), unknown: share(dev.unknown), sample: dev.sample }
      : null,
    device_note: 'Ad RPM differs by device, so an identical pageview is not identical revenue. No multiplier is applied here: the only RPM reading we hold is a site total, and splitting it by device without a per-device export would be a fabrication.',
  };
}

//  Tier rollup: the ad-supported population against the paid one. This is the
//  opportunity-cost half of the question: turning ads off for a premium class
//  costs whatever that class was generating.
function byTier(priced) {
  const acc = {};
  for (const r of priced) {
    const t = r.tier;
    if (!acc[t]) acc[t] = { tier: t, classes: 0, enrolled: 0, active_students: 0, sessions: 0, graded_events: 0, task_minutes: 0, est_annual_revenue_usd: null, priced_classes: 0 };
    const a = acc[t];
    a.classes += 1;
    a.enrolled += r.enrolled;
    a.active_students += r.active_students;
    a.sessions += r.sessions || 0;
    a.graded_events += r.graded_events || 0;
    a.task_minutes += r.task_minutes || 0;
    if (r.est_annual_revenue_usd != null) {
      a.est_annual_revenue_usd = money((a.est_annual_revenue_usd || 0) + r.est_annual_revenue_usd);
      a.priced_classes += 1;
    }
  }
  return Object.values(acc);
}

//  The whole report, which is what the route returns. One call, one object, and
//  every number carries the basis it was computed on.
function report(opts) {
  const o = opts || {};
  const days = windowDays(o.days);
  const f = funnel({ days });
  const cal = calibration(f);
  const rev = siteRevenue(days);
  const joint = jointCoverageDays(days);

  const priced = f.rows.map((r) => priceRow(r, cal, rev.rpm_usd));
  const pool = pooledRate(f.rows, cal);
  const real = priced.filter((r) => r.tier !== 'excluded');

  //  Instrumentation coverage, surfaced rather than buried, because it is the
  //  single lever that moves this model from 'rough' to 'estimate'.
  const instrumented = real.filter((r) => r.page_views_measured > 0).length;

  return {
    generated_at: new Date().toISOString(),
    window_days: days,
    stage: stageFor(joint),
    assumptions: {
      school_days_per_year: SCHOOL_DAYS_PER_YEAR,
      min_class_students_for_per_class_detail: MIN_CLASS_STUDENTS,
      band_multipliers: BAND,
      note: 'Revenue figures are modelled, not observed. A null is a missing reading, never a zero.',
    },
    site_revenue: rev,
    calibration: cal,
    instrumentation: {
      classes_total: real.length,
      classes_with_measured_pageviews: instrumented,
      coverage_pct: real.length ? Math.round((instrumented / real.length) * 1000) / 10 : 0,
      note: instrumented === 0
        ? 'No class has a measured pageview. sessions.page_views is written by public/heartbeat-reporter.js, which is not included on storefront lesson pages; until it is, every pageview figure here is estimated from graded events.'
        : 'Measured pageviews are available for some classes and are preferred over the estimate wherever present.',
    },
    engagement: engagement(f.rows),
    by_tier: byTier(priced),
    scenarios: scenarios(pool, rev.rpm_usd, o.sizes),
    classes: o.include_classes === false ? undefined : priced,
  };
}

module.exports = {
  MIN_CLASS_STUDENTS,
  MIN_POOL_CLASSES,
  MIN_POOL_STUDENTS,
  POOL_COHORTS,
  SCHOOL_DAYS_PER_YEAR,
  BAND,
  STAGES,
  windowDays,
  funnel,
  calibration,
  siteRevenue,
  jointCoverageDays,
  stageFor,
  priceRow,
  engagement,
  pooledRate,
  scenarios,
  byTier,
  report,
};
