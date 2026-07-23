'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN ANALYTICS - the "deck": every breakdown the admin dashboard slices the
//  data by. Read-only. Reuses classifyClass (lib/admin-metrics) as the single
//  bucketing rule, so "real users" here means the same EXTERNAL + SOLO population
//  as everywhere else (owner / prober / audit excluded).
//
//  PERFORMANCE: the real-class id list (dozens to ~100) is built once in JS, then
//  every aggregation runs in SQL filtered by `class_id IN (...)`. No raw progress
//  / attempts / sessions rows are pulled into memory, so this stays cheap on the
//  Railway box regardless of how those tables grow.
//
//  PII: nothing new is read or returned beyond counts, durations, structured ids,
//  and a device/browser/OS derived from the User-Agent already stored on sessions.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');
const { classifyClass } = require('./admin-metrics');
const dir = require('./school-directory');

const COURSES = ['ap-csa', 'ap-csp', 'ap-cybersecurity', 'solo'];

// One pass over classes with the counts each breakdown reuses.
const stmtAllClasses = db.prepare(`
  SELECT c.id, c.class_code, c.course, c.active, c.created_at, c.teacher_id,
         t.name AS teacher_name, t.email AS teacher_email,
         (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) AS student_count,
         (SELECT COUNT(*) FROM progress p WHERE p.class_id = c.id AND p.completed = 1) AS completions,
         (SELECT MAX(p.updated_at) FROM progress p WHERE p.class_id = c.id) AS last_activity
  FROM classes c LEFT JOIN teachers t ON c.teacher_id = t.id
`);

// ── User-Agent parsing (the GA-style device dimension) ───────────────────────
function parseUA(ua) {
  ua = ua || '';
  let os = 'Other', browser = 'Other', device = 'Desktop';
  if (/iPhone|iPod/.test(ua)) { os = 'iOS'; device = 'Mobile'; }
  else if (/iPad/.test(ua)) { os = 'iPadOS'; device = 'Tablet'; }
  else if (/Android/.test(ua)) { os = 'Android'; device = /Mobile/.test(ua) ? 'Mobile' : 'Tablet'; }
  else if (/CrOS/.test(ua)) { os = 'Chrome OS'; }
  else if (/Windows/.test(ua)) { os = 'Windows'; }
  else if (/Mac OS X|Macintosh/.test(ua)) { os = 'macOS'; }
  else if (/Linux/.test(ua)) { os = 'Linux'; }
  // Browser order matters: more specific tokens first.
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/SamsungBrowser/.test(ua)) browser = 'Samsung Internet';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Edge\//.test(ua)) browser = 'Edge';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Safari\//.test(ua)) browser = 'Safari';
  return { os, browser, device };
}

function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }
function minutes(s) { return Math.round((s || 0) / 60); }
function round1(n) { return Math.round(n * 10) / 10; }

// Build a "?,?,..." list and run a query whose FIRST bound params are the ids.
function inClause(ids) { return ids.map(() => '?').join(','); }

function computeAnalytics() {
  const generated_at = new Date().toISOString();
  const classes = stmtAllClasses.all();

  // Bucket once; keep the real population and useful per-class lookups.
  const realIds = [];
  const extIds = [];
  const classById = new Map();
  for (const c of classes) {
    const bucket = classifyClass(c);
    c.bucket = bucket;
    classById.set(c.id, c);
    if (bucket === 'EXTERNAL' || bucket === 'SOLO') realIds.push(c.id);
    if (bucket === 'EXTERNAL') extIds.push(c.id);
  }

  // Empty DB (or nothing real yet): everything is zero, no invalid IN ().
  if (!realIds.length) {
    return {
      generated_at, empty: true,
      recency: { active_1d: 0, active_7d: 0, active_30d: 0, total: 0 },
      funnel: [], by_course: [], by_teacher: [], completions_by_unit: [],
      geography: { by_state: [], by_country: [], by_school: [], unmapped_domains: [] },
      devices: { browser: [], os: [], device: [] }, trends: [], hardest_items: [],
    };
  }

  const inReal = inClause(realIds);

  // ── Recency cohorts (real students) ────────────────────────────────────────
  const recency = db.prepare(`
    SELECT
      SUM(CASE WHEN last_active >= datetime('now','-1 day')  THEN 1 ELSE 0 END) AS active_1d,
      SUM(CASE WHEN last_active >= datetime('now','-7 days')  THEN 1 ELSE 0 END) AS active_7d,
      SUM(CASE WHEN last_active >= datetime('now','-30 days') THEN 1 ELSE 0 END) AS active_30d,
      COUNT(*) AS total
    FROM students WHERE class_id IN (${inReal})
  `).get(...realIds);

  // ── Active students per class (7d) and sessions per class ───────────────────
  const active7ByClass = new Map(db.prepare(
    `SELECT class_id, SUM(CASE WHEN last_active >= datetime('now','-7 days') THEN 1 ELSE 0 END) AS a7
       FROM students WHERE class_id IN (${inReal}) GROUP BY class_id`
  ).all(...realIds).map((r) => [r.class_id, r.a7]));

  const sessByClass = new Map(db.prepare(
    `SELECT class_id, COUNT(*) AS sessions, COALESCE(SUM(active_seconds),0) AS act
       FROM sessions WHERE class_id IN (${inReal}) GROUP BY class_id`
  ).all(...realIds).map((r) => [r.class_id, r]));

  // ── by_course ───────────────────────────────────────────────────────────────
  const courseAgg = {};
  const ensureCourse = (course) => (courseAgg[course] || (courseAgg[course] = {
    course, classes: 0, teachers: new Set(), students: 0, active_7d: 0,
    completions: 0, sessions: 0, active_minutes: 0,
  }));
  for (const c of classes) {
    if (c.bucket !== 'EXTERNAL' && c.bucket !== 'SOLO') continue;
    const a = ensureCourse(c.course);
    a.classes += 1;
    if (c.teacher_id) a.teachers.add(c.teacher_id);
    a.students += c.student_count;
    a.active_7d += active7ByClass.get(c.id) || 0;
    a.completions += c.completions;
    const s = sessByClass.get(c.id);
    if (s) { a.sessions += s.sessions; a.active_minutes += minutes(s.act); }
  }
  const by_course = COURSES.filter((k) => courseAgg[k]).map((k) => {
    const a = courseAgg[k];
    return {
      course: a.course, classes: a.classes, teachers: a.teachers.size,
      students: a.students, active_7d: a.active_7d, completions: a.completions,
      completions_per_student: a.students ? round1(a.completions / a.students) : 0,
      sessions: a.sessions, active_minutes: a.active_minutes,
    };
  });

  // ── by_teacher (external teachers only; solo system account is not a teacher) ─
  const teacherAgg = {};
  for (const c of classes) {
    if (c.bucket !== 'EXTERNAL' || !c.teacher_id) continue;
    const a = teacherAgg[c.teacher_id] || (teacherAgg[c.teacher_id] = {
      teacher_id: c.teacher_id, teacher_name: c.teacher_name, teacher_email: c.teacher_email,
      courses: new Set(), classes: 0, students: 0, active_7d: 0, completions: 0,
      sessions: 0, active_minutes: 0, last_activity: null,
    });
    a.courses.add(c.course);
    a.classes += 1;
    a.students += c.student_count;
    a.active_7d += active7ByClass.get(c.id) || 0;
    a.completions += c.completions;
    const s = sessByClass.get(c.id);
    if (s) { a.sessions += s.sessions; a.active_minutes += minutes(s.act); }
    if (c.last_activity && (!a.last_activity || c.last_activity > a.last_activity)) a.last_activity = c.last_activity;
  }
  const by_teacher = Object.values(teacherAgg).map((a) => ({
    teacher: a.teacher_name, email: a.teacher_email,
    courses: [...a.courses].sort(), classes: a.classes, students: a.students,
    active_7d: a.active_7d, completions: a.completions,
    completions_per_student: a.students ? round1(a.completions / a.students) : 0,
    sessions: a.sessions, active_minutes: a.active_minutes, last_activity: a.last_activity,
  })).sort((x, y) => y.students - x.students || y.completions - x.completions);

  // ── geography (from teacher email domain: directory + auto-parse) ──────────
  //  Aggregated per external teacher (the institution). by_school covers domains
  //  in the curated directory; unmapped_domains lists institutional domains not
  //  yet mapped, with counts, so the directory can be extended where it matters.
  const geoAdd = (map, key, base) => {
    const o = map[key] || (map[key] = Object.assign({ teachers: 0, classes: 0, students: 0, completions: 0 }, base));
    return o;
  };
  const stateAgg = {}, countryAgg = {}, schoolAgg = {}, domainAgg = {};
  for (const a of Object.values(teacherAgg)) {
    const g = dir.lookup(a.teacher_email);
    const bump = (o) => { o.teachers += 1; o.classes += a.classes; o.students += a.students; o.completions += a.completions; };
    const stateKey = g.state || (g.source === 'personal' ? 'Personal email'
      : (g.country && g.country !== 'US' ? g.country : 'Unknown'));
    bump(geoAdd(stateAgg, stateKey, { region: stateKey, state: g.state || null, country: g.country || null }));
    const countryKey = g.country || (g.source === 'personal' ? 'Personal email' : 'Unknown');
    bump(geoAdd(countryAgg, countryKey, { country: countryKey }));
    if (g.source === 'directory') bump(geoAdd(schoolAgg, g.label, { name: g.label, city: g.city, state: g.state, country: g.country }));
    if (g.source === 'parsed') bump(geoAdd(domainAgg, g.domain, { domain: g.domain, state: g.state, country: g.country }));
  }
  const byStudents = (arr) => arr.sort((x, y) => y.students - x.students || y.teachers - x.teachers);
  const geography = {
    by_state: byStudents(Object.values(stateAgg)),
    by_country: byStudents(Object.values(countryAgg)),
    by_school: byStudents(Object.values(schoolAgg)),
    unmapped_domains: Object.values(domainAgg).sort((x, y) => y.teachers - x.teachers || y.students - x.students),
  };

  // ── completions_by_unit (per course) ───────────────────────────────────────
  const unitRows = db.prepare(`
    SELECT course, unit, COUNT(*) AS completions
    FROM progress WHERE completed = 1 AND class_id IN (${inReal})
    GROUP BY course, unit ORDER BY course, unit
  `).all(...realIds);
  const completions_by_unit = unitRows.map((r) => ({ course: r.course, unit: r.unit, completions: r.completions }));

  // ── funnel: enrolled -> visited -> attempted -> passed (distinct students) ──
  const enrolled = by_course.reduce((n, c) => n + c.students, 0);
  const one = (sql) => db.prepare(sql).get(...realIds).n;
  const visited = one(`SELECT COUNT(DISTINCT student_id) n FROM progress WHERE completed = 1 AND class_id IN (${inReal})`);
  const attempted = one(`SELECT COUNT(DISTINCT student_id) n FROM attempts WHERE class_id IN (${inReal})`);
  const passed = one(`SELECT COUNT(DISTINCT student_id) n FROM attempts WHERE passed = 1 AND class_id IN (${inReal})`);
  const funnel = [
    { stage: 'Enrolled', students: enrolled, pct_of_top: 100 },
    { stage: 'Completed a lesson', students: visited, pct_of_top: pct(visited, enrolled) },
    { stage: 'Attempted a graded item', students: attempted, pct_of_top: pct(attempted, enrolled) },
    { stage: 'Passed an item', students: passed, pct_of_top: pct(passed, enrolled) },
  ];

  // ── devices (browser / os / device from UA) ────────────────────────────────
  const uaRows = db.prepare(
    `SELECT ua, COUNT(*) AS sessions, COALESCE(SUM(active_seconds),0) AS act
       FROM sessions WHERE class_id IN (${inReal}) GROUP BY ua`
  ).all(...realIds);
  const dim = { browser: {}, os: {}, device: {} };
  let uaSessions = 0;
  for (const r of uaRows) {
    const p = parseUA(r.ua);
    uaSessions += r.sessions;
    for (const key of ['browser', 'os', 'device']) {
      const bucket = dim[key][p[key]] || (dim[key][p[key]] = { name: p[key], sessions: 0, active_minutes: 0 });
      bucket.sessions += r.sessions;
      bucket.active_minutes += minutes(r.act);
    }
  }
  const dimOut = (obj) => Object.values(obj)
    .map((d) => ({ ...d, share_pct: pct(d.sessions, uaSessions) }))
    .sort((a, b) => b.sessions - a.sessions);
  const devices = { browser: dimOut(dim.browser), os: dimOut(dim.os), device: dimOut(dim.device) };

  // ── trends: last 30 days, one point per day ────────────────────────────────
  const days = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    days.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
  }
  const seriesMap = (rows) => { const m = {}; for (const r of rows) m[r.d] = r.n; return m; };
  const newStudents = seriesMap(db.prepare(
    `SELECT DATE(created_at) d, COUNT(*) n FROM students
      WHERE created_at >= DATE('now','-30 days') AND class_id IN (${inReal}) GROUP BY DATE(created_at)`
  ).all(...realIds));
  const compsPerDay = seriesMap(db.prepare(
    `SELECT DATE(COALESCE(completed_at, updated_at)) d, COUNT(*) n FROM progress
      WHERE completed = 1 AND COALESCE(completed_at, updated_at) >= DATE('now','-30 days')
        AND class_id IN (${inReal}) GROUP BY DATE(COALESCE(completed_at, updated_at))`
  ).all(...realIds));
  const sessPerDay = seriesMap(db.prepare(
    `SELECT DATE(started_at) d, COUNT(*) n FROM sessions
      WHERE started_at >= DATE('now','-30 days') AND class_id IN (${inReal}) GROUP BY DATE(started_at)`
  ).all(...realIds));
  const activeMinPerDay = seriesMap(db.prepare(
    `SELECT DATE(started_at) d, COALESCE(SUM(active_seconds),0) n FROM sessions
      WHERE started_at >= DATE('now','-30 days') AND class_id IN (${inReal}) GROUP BY DATE(started_at)`
  ).all(...realIds));
  const trends = days.map((d) => ({
    date: d,
    new_students: newStudents[d] || 0,
    completions: compsPerDay[d] || 0,
    sessions: sessPerDay[d] || 0,
    active_minutes: minutes(activeMinPerDay[d] || 0),
  }));

  // ── hardest items (lowest pass rate, min attempts) ─────────────────────────
  const hardest_items = db.prepare(`
    SELECT course, item_id, item_type,
           COUNT(*) AS attempts,
           SUM(passed) AS passed,
           AVG(score * 1.0 / NULLIF(max_score, 0)) AS avg_ratio,
           AVG(duration_seconds) AS avg_dur
    FROM attempts WHERE class_id IN (${inReal})
    GROUP BY course, item_id
    HAVING COUNT(*) >= 3
    ORDER BY (SUM(passed) * 1.0 / COUNT(*)) ASC, attempts DESC
    LIMIT 20
  `).all(...realIds).map((r) => ({
    course: r.course, item_id: r.item_id, item_type: r.item_type,
    attempts: r.attempts, pass_rate_pct: pct(r.passed, r.attempts),
    avg_score_pct: Math.round((r.avg_ratio || 0) * 100),
    avg_duration_s: r.avg_dur == null ? null : Math.round(r.avg_dur),
  }));

  return {
    generated_at,
    recency,
    funnel,
    by_course,
    by_teacher,
    geography,
    completions_by_unit,
    devices,
    trends,
    hardest_items,
  };
}

module.exports = { computeAnalytics, parseUA };
