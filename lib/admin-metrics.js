'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN METRICS - the single source of truth for how the admin dashboard
//  buckets classes and computes every headline number.
//
//  WHY THIS MODULE EXISTS: the bucketing rules used to live in analysis chat and
//  got re-derived by hand each time, which once produced a bad number (39
//  external students reported when the truth was ~13, because test classes got
//  counted as external). classifyClass() below is the ONE definition. Every
//  metric calls it, and it is exported so the smoke test and any future script
//  share it. One definition, not five.
//
//  The multi-class identity refactor will change student_count semantics when it
//  lands (students become many-to-many with classes). Keep the counting queries
//  here so that change happens in one place, not scattered across routes.
//
//  Read-only. No writes to any gradebook table. The only write is the nightly
//  snapshot baseline (daily_snapshots), which feeds the delta panel.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');

// Owner addresses. A class owned by one of these is internal (TANNER bucket),
// never counted as external adoption. Add more owner addresses here if needed.
const OWNER_EMAILS = new Set(['tannercrow12@gmail.com']);

// ── THE BUCKETING RULES (encode once) ─────────────────────────────────────────
//  Order matters: the first matching rule wins. Given a class row that carries
//  class_code, teacher_email and teacher_name.
//
//  SOLO     -> class_code starts "ME-" OR teacher_email = solo@system.invalid
//  TANNER   -> teacher_email is an owner address
//  PROBER   -> teacher_email contains "kinws.com" OR is "a@a.comsss"
//  AUDIT    -> teacher_name contains "AUDIT" OR teacher_email contains "apcse-audit-delete"
//  EXTERNAL -> everything else
function classifyClass(row) {
  const code = String((row && row.class_code) || '').toUpperCase();
  const email = String((row && row.teacher_email) || '').toLowerCase();
  const name = String((row && row.teacher_name) || '');

  if (code.startsWith('ME-') || email === 'solo@system.invalid') return 'SOLO';
  if (OWNER_EMAILS.has(email)) return 'TANNER';
  if (email.includes('kinws.com') || email === 'a@a.comsss') return 'PROBER';
  if (name.includes('AUDIT') || email.includes('apcse-audit-delete')) return 'AUDIT';
  return 'EXTERNAL';
}

// Premium (paid) vs free, for a class. The teacher is the paying seat: a class is
// PREMIUM when its (teacher_id, course) is in the live-entitlement set, and its
// students are premium through it. Only real users (SOLO / EXTERNAL) are rated;
// owner / prober / audit return 'excluded'. Solo classes are never entitled, so
// they always come back 'free'. One definition, exported so the smoke test and
// computeSummary agree.
function premiumStatus(cls, entitledSet) {
  const bucket = classifyClass(cls);
  if (bucket !== 'EXTERNAL' && bucket !== 'SOLO') return 'excluded';
  const key = (cls.teacher_id || '') + '|' + (cls.course || '');
  return entitledSet.has(key) ? 'premium' : 'free';
}

// ── FLORIDA COHORT ────────────────────────────────────────────────────────────
//  Districts that start Aug 10-13, 2026. Matched on teacher email domain. Only
//  Hillsborough (Aug 10) is a confirmed date; the rest are approximate and must
//  be verified against each district calendar before anyone treats them as firm.
const FLORIDA_DISTRICTS = [
  { teacher: 'Jim Brockman',       district: 'Hillsborough',    start: 'Aug 10',  confirmed: true,  domain: 'hcps.net' },
  { teacher: 'mark goebel',        district: 'Sarasota',        start: '~Aug 10', confirmed: false, domain: 'sarasotacountyschools.net' },
  { teacher: 'Jacqueline Ficco',   district: 'Volusia',         start: '~Aug 11', confirmed: false, domain: 'volusia.k12.fl.us' },
  { teacher: 'Anthony Bryant',     district: 'Okaloosa',        start: '~Aug 11', confirmed: false, domain: 'okaloosaschools.com' },
  { teacher: 'Teresa Perez',       district: 'Miami-Dade',      start: 'Aug 13',  confirmed: false, domain: 'dadeschools.net' },
  { teacher: 'Jennifer Williams',  district: 'Miami-Dade',      start: 'Aug 13',  confirmed: false, domain: 'dadeschools.net' },
  { teacher: 'Frank Falcon',       district: 'Mater Academy',   start: '~Aug 13', confirmed: false, domain: 'materacademy.com' },
];

// Headline metric keys. These are the values snapshotted daily and shown with
// 24h / 7d deltas. Keep this list and the values produced in computeSummary in
// sync; the snapshot writer iterates it.
const SNAPSHOT_METRICS = [
  'external_teachers',
  'external_classes',
  'external_students',
  'external_completions',
  'solo_classes',
  'solo_students',
  'solo_completions',
  'activation_ge1',
  'activation_ge5',
  'activation_ge20',
];

// ── PREPARED STATEMENTS (module scope, reused) ────────────────────────────────
//  One pass over classes with per-class student and completion counts, plus the
//  most recent progress timestamp. Dozens of classes, so the correlated
//  subqueries are cheap and keep the classification in JS where classifyClass
//  can own it, rather than duplicating the rules as SQL filters.
const stmtAllClasses = db.prepare(`
  SELECT
    c.id, c.class_code, c.class_name, c.course, c.active, c.created_at,
    c.teacher_id,
    t.name  AS teacher_name,
    t.email AS teacher_email,
    (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) AS student_count,
    (SELECT COUNT(*) FROM progress p WHERE p.class_id = c.id AND p.completed = 1) AS completions,
    (SELECT MAX(p.updated_at) FROM progress p WHERE p.class_id = c.id) AS last_activity
  FROM classes c
  LEFT JOIN teachers t ON c.teacher_id = t.id
`);

// Classes created in the last 7 days.
const stmtRecentClasses = db.prepare(`
  SELECT c.id, c.class_code, c.class_name, c.course, c.created_at,
         t.name AS teacher_name, t.email AS teacher_email
  FROM classes c
  LEFT JOIN teachers t ON c.teacher_id = t.id
  WHERE c.created_at >= DATETIME('now', '-7 days')
  ORDER BY c.created_at DESC
`);

// Classes whose completions changed in the last 24h: a completed progress row
// touched inside the window. This is the real "live class vs shell" signal.
const stmtCompletionActivity24h = db.prepare(`
  SELECT p.class_id, COUNT(*) AS completions_24h, MAX(p.updated_at) AS last_activity
  FROM progress p
  WHERE p.completed = 1 AND p.updated_at >= DATETIME('now', '-1 day')
  GROUP BY p.class_id
`);

// Snapshot read: a metric's value from N days ago (baseline for a delta).
const stmtSnapshotAt = db.prepare(
  `SELECT value FROM daily_snapshots WHERE date = DATE('now', ?) AND metric = ?`
);
// Snapshot write: today's opening baseline, first-write-wins.
const stmtSnapshotInsert = db.prepare(
  `INSERT OR IGNORE INTO daily_snapshots (date, metric, value) VALUES (DATE('now'), ?, ?)`
);

// Active paid seats: (teacher_id, course) pairs with a live entitlement. This is
// the same "active" definition entitlements.js owns (not revoked, not expired);
// inlined here so the metrics module stays a pure read. A class is PREMIUM when
// its (teacher_id, course) is in this set; a student is premium via their class.
const stmtActiveEntitlements = db.prepare(
  `SELECT teacher_id, course FROM entitlements
    WHERE status = 'active' AND (expires_at IS NULL OR expires_at > datetime('now'))`
);

// Engagement rollup: one row per class with session counts and summed active /
// total seconds. Joined to the class map in JS so the paid-tier split reuses the
// single classifier rather than re-deriving buckets in SQL.
const stmtSessionsByClass = db.prepare(`
  SELECT class_id,
         COUNT(*)                        AS sessions,
         COUNT(DISTINCT student_id)      AS students,
         COALESCE(SUM(active_seconds),0) AS active_s,
         COALESCE(SUM(total_seconds),0)  AS total_s
  FROM sessions GROUP BY class_id
`);
const stmtSessions7d = db.prepare(`
  SELECT COUNT(*) AS sessions, COALESCE(SUM(active_seconds),0) AS active_s
  FROM sessions WHERE started_at >= datetime('now', '-7 days')
`);

// ── HELPERS ───────────────────────────────────────────────────────────────────
function emailDomain(email) {
  const at = String(email || '').toLowerCase().lastIndexOf('@');
  return at === -1 ? '' : email.toLowerCase().slice(at + 1);
}
function zeroAgg() { return { classes: 0, students: 0, completions: 0 }; }
function addInto(agg, cls) {
  agg.classes += 1;
  agg.students += cls.student_count;
  agg.completions += cls.completions;
}

// Write today's baseline (idempotent) and return { d24h, d7d } deltas for each
// headline metric against the stored baselines. A null delta means no baseline
// exists yet for that day (e.g. the first day the dashboard ever runs), which
// the page renders as a dash rather than a misleading zero.
function snapshotAndDelta(values) {
  const writeMany = db.transaction((pairs) => {
    for (const [metric, value] of pairs) stmtSnapshotInsert.run(metric, value);
  });
  writeMany(SNAPSHOT_METRICS.map((m) => [m, Number(values[m] || 0)]));

  const deltas = {};
  for (const m of SNAPSHOT_METRICS) {
    const current = Number(values[m] || 0);
    const y = stmtSnapshotAt.get('-1 day', m);
    const w = stmtSnapshotAt.get('-7 days', m);
    deltas[m] = {
      current,
      d24h: y ? current - y.value : null,
      d7d: w ? current - w.value : null,
    };
  }
  return deltas;
}

// ── THE SUMMARY ────────────────────────────────────────────────────────────────
function computeSummary() {
  const classes = stmtAllClasses.all();

  // Bucket every class through the single classifier.
  const external = [];
  const solo = zeroAgg();
  const soloClassList = [];
  const excluded = { TANNER: zeroAgg(), PROBER: zeroAgg(), AUDIT: zeroAgg() };
  const bucketCounts = { SOLO: 0, TANNER: 0, PROBER: 0, AUDIT: 0, EXTERNAL: 0 };

  for (const c of classes) {
    const bucket = classifyClass(c);
    bucketCounts[bucket] += 1;
    if (bucket === 'EXTERNAL') {
      external.push(c);
    } else if (bucket === 'SOLO') {
      addInto(solo, c);
      soloClassList.push(c);
    } else {
      addInto(excluded[bucket], c);
    }
  }

  // External headline.
  const extTeachers = new Set();
  const extAgg = zeroAgg();
  let extGe1 = 0, extGe5 = 0, extGe20 = 0;
  for (const c of external) {
    addInto(extAgg, c);
    if (c.teacher_email) extTeachers.add(String(c.teacher_email).toLowerCase());
    if (c.student_count >= 1) extGe1 += 1;
    if (c.student_count >= 5) extGe5 += 1;
    if (c.student_count >= 20) extGe20 += 1;
  }

  const headline = {
    external: {
      teachers: extTeachers.size,
      classes: extAgg.classes,
      students: extAgg.students,
      completions: extAgg.completions,
    },
    solo: { classes: solo.classes, students: solo.students, completions: solo.completions },
    excluded: {
      tanner: excluded.TANNER,
      prober: excluded.PROBER,
      audit: excluded.AUDIT,
    },
  };

  const activation = {
    external_classes: extAgg.classes,
    ge1: extGe1,
    ge5: extGe5,
    ge20: extGe20,
    rate: extAgg.classes > 0 ? Math.round((extGe1 / extAgg.classes) * 100) : 0,
  };

  // Florida cohort, matched by email domain and grouped per district row.
  const florida = FLORIDA_DISTRICTS.map((d) => {
    const matches = classes.filter((c) => emailDomain(c.teacher_email) === d.domain);
    const teacherNames = [...new Set(matches.map((c) => c.teacher_name).filter(Boolean))];
    const agg = zeroAgg();
    let lastActivity = null;
    for (const c of matches) {
      addInto(agg, c);
      if (c.last_activity && (!lastActivity || c.last_activity > lastActivity)) {
        lastActivity = c.last_activity;
      }
    }
    return {
      teacher: d.teacher,
      district: d.district,
      start: d.start,
      confirmed: d.confirmed,
      domain: d.domain,
      matched_teachers: teacherNames,
      classes: agg.classes,
      students: agg.students,
      completions: agg.completions,
      last_activity: lastActivity,
    };
  });

  // Recent activity.
  const classById = new Map(classes.map((c) => [c.id, c]));
  const recentCreated = stmtRecentClasses.all().map((c) => ({
    class_code: c.class_code,
    class_name: c.class_name,
    course: c.course,
    teacher_name: c.teacher_name,
    bucket: classifyClass(c),
    created_at: c.created_at,
  }));
  const completionActivity = stmtCompletionActivity24h.all()
    .map((r) => {
      const c = classById.get(r.class_id);
      if (!c) return null;
      return {
        class_code: c.class_code,
        class_name: c.class_name,
        teacher_name: c.teacher_name,
        bucket: classifyClass(c),
        completions_24h: r.completions_24h,
        last_activity: r.last_activity,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.completions_24h - a.completions_24h);

  // Deltas (also writes today's baseline).
  const deltas = snapshotAndDelta({
    external_teachers: headline.external.teachers,
    external_classes: headline.external.classes,
    external_students: headline.external.students,
    external_completions: headline.external.completions,
    solo_classes: headline.solo.classes,
    solo_students: headline.solo.students,
    solo_completions: headline.solo.completions,
    activation_ge1: activation.ge1,
    activation_ge5: activation.ge5,
    activation_ge20: activation.ge20,
  });

  // Data-quality guards. The bucket sum must equal the total, or a metric is
  // silently dropping rows (the check that would have caught 39-vs-13).
  const totalClasses = classes.length;
  const bucketSum = bucketCounts.SOLO + bucketCounts.TANNER + bucketCounts.PROBER
    + bucketCounts.AUDIT + bucketCounts.EXTERNAL;

  // ME- classes are single-student containers; more than one is an anomaly to
  // surface, not hide.
  const meViolations = soloClassList
    .filter((c) => String(c.class_code || '').toUpperCase().startsWith('ME-') && c.student_count > 1)
    .map((c) => ({ class_code: c.class_code, student_count: c.student_count }));

  // Audit classes still live (active with students) are worth flagging.
  const auditLive = classes
    .filter((c) => classifyClass(c) === 'AUDIT' && c.active && c.student_count > 0)
    .map((c) => ({ class_code: c.class_code, student_count: c.student_count }));

  const knownAnomalies = [];
  for (const v of meViolations) {
    knownAnomalies.push(`${v.class_code} has ${v.student_count} students in a single-student container`);
  }
  for (const a of auditLive) {
    knownAnomalies.push(`${a.class_code} audit class still live with ${a.student_count} student${a.student_count === 1 ? '' : 's'}`);
  }

  const data_quality = {
    total_classes: totalClasses,
    bucket_sum: bucketSum,
    mismatch: totalClasses !== bucketSum,
    bucket_counts: bucketCounts,
    excluded_counts: {
      tanner: { ...excluded.TANNER, classes: bucketCounts.TANNER },
      prober: { ...excluded.PROBER, classes: bucketCounts.PROBER },
      audit: { ...excluded.AUDIT, classes: bucketCounts.AUDIT },
    },
    me_violations: meViolations,
    known_anomalies: knownAnomalies,
  };

  // ── MONETIZATION: premium (paid) vs free among real users ─────────────────
  //  The teacher is the paying seat. A class is premium when its (teacher_id,
  //  course) holds a live entitlement; its students are premium too. "Real users"
  //  = SOLO + EXTERNAL only (owner / prober / audit are excluded noise). Solo
  //  accounts are never entitled, so they always land in free. Free students are
  //  the ad-supported population; premium students sit under a paid seat.
  const entitledSet = new Set(
    stmtActiveEntitlements.all().map((r) => r.teacher_id + '|' + r.course)
  );

  const paidClassIds = new Set();
  const premiumTeachers = new Set();
  const premium = { classes: 0, students: 0 };
  const free = { classes: 0, students: 0 };
  for (const c of classes) {
    const status = premiumStatus(c, entitledSet);
    if (status === 'excluded') continue; // real users only
    if (status === 'premium') {
      paidClassIds.add(c.id);
      premium.classes += 1;
      premium.students += c.student_count;
      if (c.teacher_id) premiumTeachers.add(c.teacher_id);
    } else {
      free.classes += 1;
      free.students += c.student_count;
    }
  }
  const realStudents = premium.students + free.students;
  const monetization = {
    premium: { teachers: premiumTeachers.size, classes: premium.classes, students: premium.students },
    free: { classes: free.classes, students: free.students },
    premium_student_share_pct: realStudents > 0 ? Math.round((premium.students / realStudents) * 100) : 0,
  };

  // ── ENGAGEMENT: time on site + active (engaged) time, split by paid tier ──
  //  Ad impressions track the FREE tier's active time; the split makes that
  //  legible next to the paid tier. Only real (SOLO / EXTERNAL) classes count.
  const minutes = (s) => Math.round(s / 60);
  const avgMin = (s, n) => (n > 0 ? Math.round((s / n / 60) * 10) / 10 : 0);
  const engTier = { premium: { sessions: 0, students: 0, active_s: 0 }, free: { sessions: 0, students: 0, active_s: 0 } };
  let sessTotal = 0, activeTotalS = 0, totalTotalS = 0, studentSessions = 0;
  for (const r of stmtSessionsByClass.all()) {
    const c = classById.get(r.class_id);
    if (!c) continue;
    const bucket = classifyClass(c);
    if (bucket !== 'EXTERNAL' && bucket !== 'SOLO') continue;
    sessTotal += r.sessions; activeTotalS += r.active_s; totalTotalS += r.total_s; studentSessions += r.students;
    const tier = paidClassIds.has(r.class_id) ? engTier.premium : engTier.free;
    tier.sessions += r.sessions; tier.students += r.students; tier.active_s += r.active_s;
  }
  const s7 = stmtSessions7d.get();
  const tierOut = (t) => ({
    sessions: t.sessions, students: t.students,
    active_minutes: minutes(t.active_s), avg_active_min_per_session: avgMin(t.active_s, t.sessions),
  });
  const engagement = {
    sessions_total: sessTotal,
    student_sessions: studentSessions,
    active_minutes_total: minutes(activeTotalS),
    avg_active_min_per_session: avgMin(activeTotalS, sessTotal),
    avg_total_min_per_session: avgMin(totalTotalS, sessTotal),
    active_share_pct: totalTotalS > 0 ? Math.round((activeTotalS / totalTotalS) * 100) : 0,
    by_tier: { premium: tierOut(engTier.premium), free: tierOut(engTier.free) },
    last_7d: { sessions: s7.sessions, active_minutes: minutes(s7.active_s) },
  };

  return {
    generated_at: new Date().toISOString(),
    headline,
    activation,
    monetization,
    engagement,
    florida,
    recent: { classes_created_7d: recentCreated, completion_activity_24h: completionActivity },
    deltas,
    data_quality,
  };
}

module.exports = {
  classifyClass,
  premiumStatus,
  computeSummary,
  FLORIDA_DISTRICTS,
  SNAPSHOT_METRICS,
  OWNER_EMAILS,
};
