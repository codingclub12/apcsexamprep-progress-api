'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SITE ASSISTANT: THE TYPED READ LAYER  (spec section 5, layer 2)
//
//  This is the only module in the assistant tree permitted to touch the
//  database, and it is the reason the assistant can be pointed at a site whose
//  business is assessment without becoming an answer-key exfiltration tool.
//
//  THE RULE: the assistant never issues SQL and never receives a row. It calls
//  the named functions below, whose return shapes have NO FIELD capable of
//  carrying a question, an option, an explanation or a correct index. You cannot
//  prompt your way to a value that the return type has no room for.
//
//  quiz_bank.correct_index and quiz_bank.explanation live in the same SQLite
//  file every route here opens, annotated "NEVER sent before submit". Below,
//  quiz_bank is read for COUNTS AND LOCATIONS ONLY: unit, lesson, activity_type
//  and how many questions exist. Never prompt, never options, never the answer.
//  If you add a function here, that is the line to keep.
//
//  OWNERSHIP: every function takes the caller's own id and every query joins on
//  it. A teacher reads their own classes and nothing else. There is no function
//  here that takes a class id without also taking the teacher it must belong to.
//
//  DRIFT: gate state resolves through lib/activity-gate.resolveGate, the same
//  function the render path and the submit path call. An operator view that
//  reimplements the rule eventually disagrees with what students actually get,
//  and disagrees silently. That ticket has already been paid for once; see
//  docs/runs/2026-08-28-claude-cyber-1-1-quiz-gating.md.
//
//  Named columns only, never SELECT *. No em-dashes.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../../db');
const { resolveGate } = require('../activity-gate');

// ── ownership ────────────────────────────────────────────────────────────────
// One place resolves "does this teacher own this class". Everything else calls
// it, so no read can accidentally answer about somebody else's roster.
const stClassByCodeForTeacher = db.prepare(`
  SELECT id, class_code, class_name, course, active,
         mastery_threshold, retry_allowed, quiz_lock_default
  FROM classes
  WHERE class_code = ? AND teacher_id = ?
`);
const stClassesForTeacher = db.prepare(`
  SELECT id, class_code, class_name, course, active,
         mastery_threshold, retry_allowed, quiz_lock_default
  FROM classes
  WHERE teacher_id = ?
  ORDER BY active DESC, class_code
`);

function ownedClass(teacherId, classCode) {
  if (!teacherId || !classCode) return null;
  return stClassByCodeForTeacher.get(String(classCode).toUpperCase(), teacherId) || null;
}

// ── getClassSettings ─────────────────────────────────────────────────────────
// The four switches that decide what a student sees. Every one of them has
// generated a support email at least once, because each is invisible from the
// student side and produces a symptom that looks like a bug.
function getClassSettings(teacherId, classCode) {
  const cls = ownedClass(teacherId, classCode);
  if (!cls) return null;
  return {
    class_code: cls.class_code,
    class_name: cls.class_name,
    course: cls.course,
    active: cls.active ? 1 : 0,
    mastery_threshold: cls.mastery_threshold,
    retry_allowed: cls.retry_allowed ? 1 : 0,
    quiz_lock_default: cls.quiz_lock_default ? 1 : 0,
  };
}

function listClasses(teacherId) {
  if (!teacherId) return [];
  return stClassesForTeacher.all(teacherId).map((c) => ({
    class_code: c.class_code,
    class_name: c.class_name,
    course: c.course,
    active: c.active ? 1 : 0,
  }));
}

// ── getEntitlementState ──────────────────────────────────────────────────────
// "I paid and my course is not showing" is the largest support cluster. This is
// the first thing to read, before asking them anything: if a grant is already
// here, the problem is a stale view rather than a missing entitlement, and no
// amount of explanation fixes a cached page.
const stEntitlements = db.prepare(`
  SELECT course, status, source, granted_at, expires_at
  FROM entitlements
  WHERE teacher_id = ?
  ORDER BY course
`);
// A purchase parked by email because the buyer had no account yet. Claimed on
// register or login, so a row still sitting here unclaimed is itself the answer.
const stPending = db.prepare(`
  SELECT course, source, created_at
  FROM pending_entitlements
  WHERE email = ? COLLATE NOCASE AND claimed_at IS NULL
  ORDER BY course
`);

function getEntitlementState(teacherId, teacherEmail) {
  if (!teacherId) return null;
  return {
    grants: stEntitlements.all(teacherId).map((e) => ({
      course: e.course,
      status: e.status,
      source: e.source,
      granted_at: e.granted_at,
      expires_at: e.expires_at,
    })),
    // Never an order id or an email back out: just the fact that something is
    // parked and for which course.
    unclaimed_purchases: teacherEmail
      ? stPending.all(teacherEmail).map((p) => ({ course: p.course, source: p.source, created_at: p.created_at }))
      : [],
  };
}

// ── getGateState ─────────────────────────────────────────────────────────────
// Why is the quiz greyed out. Driven by quiz_bank because that is what the
// render path serves: an activity with no bank rows 404s regardless of any
// gate, and calling it "open" sends someone hunting for a lock that was never
// the problem.
//
// `pool` is a COUNT. It is the only number taken from quiz_bank and it is the
// only one that may be.
const stActivities = db.prepare(`
  SELECT unit, lesson, activity_type, COUNT(*) AS pool
  FROM quiz_bank
  WHERE course = ? AND active = 1
  GROUP BY unit, lesson, activity_type
  ORDER BY unit, lesson, activity_type
`);
const stGateRow = db.prepare(`
  SELECT open FROM activity_gates
  WHERE class_id = ? AND course = ? AND unit = ? AND lesson = ? AND activity_type = ?
`);

function getGateState(teacherId, classCode, opts = {}) {
  const cls = ownedClass(teacherId, classCode);
  if (!cls) return null;
  const course = opts.course || cls.course;
  // The gate only bites when the activity's course is the class's own. A class
  // looking at another course is self-study there, exactly as routes/quiz.js
  // treats it, so a hypothetical lock must not be reported.
  const gcls = cls.course === course ? cls : null;

  let rows = stActivities.all(course);
  if (opts.lesson) rows = rows.filter((a) => a.lesson === String(opts.lesson));

  const activities = rows.map((a) => {
    const row = gcls ? stGateRow.get(gcls.id, course, a.unit, a.lesson, a.activity_type) : null;
    const g = resolveGate(row, gcls, a.activity_type);
    return {
      unit: a.unit,
      lesson: a.lesson,
      activity_type: a.activity_type,
      pool: a.pool,
      open: g.open,
      reason: g.reason,
      explicit_row: row ? (row.open ? 'open' : 'closed') : null,
    };
  });

  const closed = activities.filter((a) => !a.open);
  return {
    course_checked: course,
    quiz_lock_default: cls.quiz_lock_default ? 1 : 0,
    counts: { activities: activities.length, open: activities.length - closed.length, closed: closed.length },
    closed,
    activities,
  };
}

// ── getRosterHealth ──────────────────────────────────────────────────────────
// "My students cannot get in" is usually one of three things, and they look
// alike from the teacher's side: nobody joined, they joined and never came
// back, or they are all deactivated. Counts separate them in one read.
const stRoster = db.prepare(`
  SELECT
    COUNT(*)                                                             AS student_count,
    SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END)                          AS active_count,
    SUM(CASE WHEN created_at >= datetime('now','-1 day') THEN 1 ELSE 0 END) AS joined_24h,
    SUM(CASE WHEN last_active IS NULL THEN 1 ELSE 0 END)                 AS never_signed_in
  FROM students WHERE class_id = ?
`);

function getRosterHealth(teacherId, classCode) {
  const cls = ownedClass(teacherId, classCode);
  if (!cls) return null;
  const r = stRoster.get(cls.id) || {};
  // Counts only. No names, no ids, nothing that identifies a minor.
  return {
    student_count: r.student_count || 0,
    active_count: r.active_count || 0,
    joined_24h: r.joined_24h || 0,
    never_signed_in: r.never_signed_in || 0,
  };
}

// ── getScoreVisibility ───────────────────────────────────────────────────────
// "Are my students' scores landing?" The honest answer is a count of what
// arrived and when the last one did. A class that has never recorded anything
// and a class that stopped recording yesterday are different problems and this
// is what tells them apart.
const stAttempts = db.prepare(`
  SELECT
    COUNT(*)                                                              AS total,
    SUM(CASE WHEN created_at >= datetime('now','-1 day') THEN 1 ELSE 0 END)  AS last_24h,
    SUM(CASE WHEN created_at >= datetime('now','-7 day') THEN 1 ELSE 0 END)  AS last_7d,
    MAX(created_at)                                                       AS last_at
  FROM attempts WHERE class_id = ?
`);
const stAttemptsLesson = db.prepare(`
  SELECT item_type, COUNT(*) AS n, MAX(created_at) AS last_at
  FROM attempts WHERE class_id = ? AND lesson_id = ?
  GROUP BY item_type ORDER BY item_type
`);

function getScoreVisibility(teacherId, classCode, opts = {}) {
  const cls = ownedClass(teacherId, classCode);
  if (!cls) return null;
  const a = stAttempts.get(cls.id) || {};
  const out = {
    recorded_total: a.total || 0,
    recorded_24h: a.last_24h || 0,
    recorded_7d: a.last_7d || 0,
    last_recorded_at: a.last_at || null,
  };
  if (opts.lesson) {
    out.lesson = String(opts.lesson);
    // Counts per item type. Never a score, never a student.
    out.by_item_type = stAttemptsLesson.all(cls.id, out.lesson)
      .map((r) => ({ item_type: r.item_type, recorded: r.n, last_at: r.last_at }));
  }
  return out;
}

module.exports = {
  ownedClass,
  listClasses,
  getClassSettings,
  getEntitlementState,
  getGateState,
  getRosterHealth,
  getScoreVisibility,
};
