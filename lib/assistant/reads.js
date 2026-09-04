'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SITE ASSISTANT: THE TYPED READ LAYER  (spec section 5, layer 2)
//
//  This is the only module that puts ACCOUNT STATE INTO a model's context, and
//  it is the reason the assistant can be pointed at a site whose business is
//  assessment without becoming an answer-key exfiltration tool.
//
//  CORRECTED 2026-09-04, and the correction matters. This header used to say
//  "the only module in the assistant tree permitted to touch the database",
//  which is the spec's own wording (section 5, layer 2) and which was already
//  untrue on the day it was written: lib/assistant/report.js has to insert an
//  escalation row, and Phase 2 adds lib/assistant/store.js, which writes chat
//  sessions. Stating an invariant the code visibly breaks teaches the next
//  session to ignore the header. The property that actually protects the answer
//  keys is about what goes IN to a prompt, not about who holds a handle, so it
//  is stated that way now. Two modules write; ONE reads state for the model.
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
  getPageStatus,
  ownClass, getMyProgress, getMyGates, getMyScoreVisibility,
};

// ── THE STUDENT READS  (spec section 5 tool table, Phase 4) ──────────────────
//  Three functions, and every one of them takes the student's OWN id and reads
//  only rows joined to it. Same ownership rule as the teacher reads: there is no
//  function here that takes a class without also taking who must belong to it.
//
//  getMyProgress IS THE ONE WORTH READING TWICE. The spec's shape is
//  { lesson, item_type, attempted, passed } and there is NO SCORE FIELD, which
//  is not an oversight in the spec and is not an oversight here.
//
//  The obvious implementation returns the score and gates it on key_releases.
//  That is worse in both directions. It makes the return type able to carry a
//  number that then has to be correctly withheld on every future edit, which is
//  the class of guarantee this whole module exists to avoid; and it puts the
//  assistant in the business of deciding what a student may see about their own
//  marks, which is the dashboard's job and the teacher's setting.
//
//  So the assistant can say "you have attempted 1.2 and passed it" and can never
//  say a number, because it was never handed one. A student who wants their
//  score has it on /pages/my-progress, rendered by the route that owns that
//  decision. The division is deliberate: this answers "where am I up to", the
//  dashboard answers "what did I get".
const stStudentClass = db.prepare(`
  SELECT s.id AS student_id, s.class_id, s.active,
         c.class_code, c.course, c.mastery_threshold, c.retry_allowed,
         c.quiz_lock_default, c.active AS class_active
  FROM students s JOIN classes c ON c.id = s.class_id
  WHERE s.id = ?
`);

// One place resolves "which class is this student in". Everything below calls
// it, so no student read can answer about somebody else's class.
function ownClass(studentId) {
  if (!studentId) return null;
  try { return stStudentClass.get(studentId) || null; } catch (_) { return null; }
}

// attempted and passed as BOOLEANS, per item. No score, no max, no percentage.
// passed is recomputed against the class's CURRENT mastery threshold rather
// than read from the stored flag, the same rule the gradebook follows, so a
// teacher lowering the bar is reflected here with no migration.
const stMyAttempts = db.prepare(`
  SELECT lesson_id, item_type,
         COUNT(*) AS tries,
         MAX(CASE WHEN max_score > 0 AND (score * 100.0 / max_score) >= ? THEN 1 ELSE 0 END) AS passed
  FROM attempts
  WHERE student_id = ?
  GROUP BY lesson_id, item_type
  ORDER BY lesson_id, item_type
`);
// The System B ledger, where Cyber and CSP grades actually live. Same treatment:
// a count and a boolean, never a number that means a mark.
const stMyScoreEvents = db.prepare(`
  SELECT lesson, activity_type,
         COUNT(*) AS tries,
         MAX(CASE WHEN max_points > 0 AND (points * 100.0 / max_points) >= ? THEN 1 ELSE 0 END) AS passed
  FROM score_events
  WHERE student_id = ?
  GROUP BY lesson, activity_type
  ORDER BY lesson, activity_type
`);

function getMyProgress(studentId, opts = {}) {
  const cls = ownClass(studentId);
  if (!cls) return null;
  const threshold = cls.mastery_threshold != null ? cls.mastery_threshold : 80;

  const items = [];
  const seen = new Set();
  const push = (lesson, itemType, tries, passed) => {
    const key = `${lesson}|${itemType}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({
      lesson: String(lesson),
      item_type: String(itemType),
      attempted: tries > 0,
      passed: !!passed,
    });
  };

  try {
    for (const r of stMyAttempts.all(threshold, studentId)) push(r.lesson_id, r.item_type, r.tries, r.passed);
  } catch (_) { /* one ledger missing is not a failure of the other */ }
  try {
    for (const r of stMyScoreEvents.all(threshold, studentId)) push(r.lesson, r.activity_type, r.tries, r.passed);
  } catch (_) { /* as above */ }

  const filtered = opts.lesson ? items.filter((i) => i.lesson === String(opts.lesson)) : items;
  return {
    course: cls.course,
    mastery_threshold: threshold,
    counts: {
      attempted: filtered.length,
      passed: filtered.filter((i) => i.passed).length,
    },
    items: filtered,
  };
}

// Why is MY quiz locked. Resolves through the same resolveGate the render path
// and the submit path call, exactly as the teacher version does, so a student
// can never be told an activity is open that the server would then refuse.
function getMyGates(studentId, opts = {}) {
  const cls = ownClass(studentId);
  if (!cls) return null;
  const course = cls.course;

  let rows = stActivities.all(course);
  if (opts.lesson) rows = rows.filter((a) => a.lesson === String(opts.lesson));

  // resolveGate wants the class row shape the teacher path passes it.
  const gcls = {
    id: cls.class_id,
    course: cls.course,
    quiz_lock_default: cls.quiz_lock_default,
  };
  const activities = rows.map((a) => {
    const row = stGateRow.get(cls.class_id, course, a.unit, a.lesson, a.activity_type);
    const g = resolveGate(row, gcls, a.activity_type);
    return {
      unit: a.unit,
      lesson: a.lesson,
      activity_type: a.activity_type,
      pool: a.pool,
      open: g.open,
      reason: g.reason,
    };
  });
  const closed = activities.filter((a) => !a.open);
  return {
    course_checked: course,
    counts: { activities: activities.length, open: activities.length - closed.length, closed: closed.length },
    closed,
  };
}

// "I did the quiz and nothing showed up." Counts of what this student's own work
// recorded, and when. Never a mark, and never anybody else's row.
const stMyRecorded = db.prepare(`
  SELECT COUNT(*) AS total, MAX(created_at) AS last_at
  FROM attempts WHERE student_id = ?
`);
const stMyRecordedEvents = db.prepare(`
  SELECT COUNT(*) AS total, MAX(created_at) AS last_at
  FROM score_events WHERE student_id = ?
`);

function getMyScoreVisibility(studentId, opts = {}) {
  const cls = ownClass(studentId);
  if (!cls) return null;
  let a = { total: 0, last_at: null };
  let b = { total: 0, last_at: null };
  try { a = stMyRecorded.get(studentId) || a; } catch (_) {}
  try { b = stMyRecordedEvents.get(studentId) || b; } catch (_) {}
  const last = [a.last_at, b.last_at].filter(Boolean).sort().pop() || null;

  // why_not_counted, per spec. The honest reasons this server can actually
  // observe, rather than a guess dressed as a diagnosis.
  const reasons = [];
  if (!cls.class_active) reasons.push('the class is not active');
  if (!cls.active) reasons.push('this student account is deactivated');
  if ((a.total + b.total) === 0) reasons.push('nothing has recorded for this account yet');

  return {
    recorded: (a.total || 0) + (b.total || 0),
    last_recorded_at: last,
    counted: !!(cls.class_active && cls.active),
    why_not_counted: reasons,
  };
}

// ── getPageStatus ────────────────────────────────────────────────────────────
//  The ONE typed read an anonymous caller gets (spec section 5, layer 2 table,
//  and the role table in section 7). "Where is X" and "is this page a thing"
//  are the navigation questions commerce traffic actually asks, and neither
//  needs an account.
//
//  WHAT IT DELIBERATELY DOES NOT ANSWER, and this is the interesting half. The
//  spec's shape is { exists, published, template, has_widgets }. Two of those
//  four are SHOPIFY state that this server cannot observe: whether a page is
//  published, and which Liquid template it renders through, live in the
//  storefront, and this process has no read of it. Returning a confident
//  `published: true` derived from "we have a row about it" would be exactly the
//  confidently wrong answer about site mechanics that spec section 4 forbids,
//  and it would be wrong in the direction that sends somebody hunting for a
//  page that is not there.
//
//  So it answers what is observable and says the rest is unknown, in the
//  return type rather than in prose: `published: null` means not observable
//  from here, never "no". If a Shopify read is ever added, this is the one
//  function that changes.
//
//  quiz_bank is read for a COUNT, same rule as getGateState. Never a prompt,
//  never an option, never the answer.
const stPageByHandle = db.prepare(`
  SELECT course, unit, lesson, activity_type, handle, last_seen
  FROM page_links WHERE handle = ? LIMIT 1
`);
const stBankCount = db.prepare(`
  SELECT COUNT(*) AS n FROM quiz_bank
  WHERE course = ? AND unit = ? AND lesson = ? AND activity_type = ? AND active = 1
`);

function getPageStatus(rawUrl) {
  // Required lazily, and both for the same reason: scope.js is where URL shape
  // is decided and utils.pageFromHandle is where handle shape is, so neither
  // opinion is duplicated here. Lazy keeps reads.js free of a load-order edge
  // with utils, which several routers pull in first.
  const { pageScope, handleOf, parseUrl } = require('./scope');
  const { pageFromHandle } = require('../../utils');
  const parsed = parseUrl(rawUrl);
  const out = {
    handle: null,
    scope: pageScope(rawUrl),
    known: false,        // this server has a record of the handle
    published: null,     // NOT OBSERVABLE from here. null is not "no".
    template: null,      // same
    course: null,
    unit: null,
    lesson: null,
    activity_type: null,
    graded_items: null,  // a count, when the page is a graded activity
    last_seen: null,
  };
  if (!parsed) return out;

  const handle = handleOf(parsed.pathname);
  if (!handle) return out;
  out.handle = handle;

  // The reporters record which handle served which activity, so a row here is
  // this server's own observation rather than a guess about Shopify.
  let row = null;
  try { row = stPageByHandle.get(handle); } catch (_) { row = null; }
  if (!row) {
    // Not seen by a reporter. The handle parser may still resolve it, which is
    // a weaker but honest signal: the naming says what it should be.
    let parsedPage = null;
    try { parsedPage = pageFromHandle(handle); } catch (_) { parsedPage = null; }
    if (parsedPage) {
      out.course = parsedPage.course || null;
      out.unit = parsedPage.unit || null;
      out.lesson = parsedPage.lesson || null;
      out.activity_type = parsedPage.activity_type || null;
    }
    return out;
  }

  out.known = true;
  out.course = row.course;
  out.unit = row.unit;
  out.lesson = row.lesson;
  out.activity_type = row.activity_type;
  out.last_seen = row.last_seen || null;
  try {
    out.graded_items = stBankCount.get(row.course, row.unit, row.lesson, row.activity_type).n;
  } catch (_) { out.graded_items = null; }
  return out;
}

// ── scanForSecrets: the layer 6 corpus, as a VERDICT ──────────────────────────
//  spec section 5, layer 6. Before a single token reaches a client, the
//  assembled response is scanned for things that must never leave this server:
//  an access code, or verbatim text out of quiz_bank.
//
//  THE RETURN TYPE IS THE CONTROL. This function is handed the candidate text
//  and returns { hit, kind } and nothing else. The secrets are compared inside
//  SQLite and never enter a JavaScript value, so there is no caller, no log line
//  and no error message anywhere in this repo that can end up holding one. A
//  version of this that returned the matched string would be a leak with a
//  tripwire bolted to it.
//
//  It lives in reads.js because reads.js is the only module in the assistant
//  tree with a database handle, and that invariant is worth more than the tidier
//  file layout. lib/assistant/output-filter.js owns the shape rules that need no
//  database and calls through to here for the ones that do.
//
//  Comparison happens in SQL with instr() rather than by loading the corpus into
//  an array. quiz_bank is a table that only grows, and a per-response array of
//  every option string on the site is exactly the unbounded per-request growth
//  that CLAUDE.md's performance section is written against.
//
//  MINIMUM LENGTHS ARE NOT TUNING, THEY ARE THE DIFFERENCE BETWEEN A TRIPWIRE
//  AND A NUISANCE. An option string is often "True", "42" or "Both A and B",
//  and a filter that blocks any response containing "True" blocks the assistant.
//  Verbatim containment only counts above a length where coincidence stops being
//  plausible. Mutation tested per threshold in smoke/assistant-exfiltration.js.
//  The prompt and explanation thresholds were 40 in the first draft and are 30
//  now. 40 was picked by eye and it left a real gap: plenty of stems on this
//  site are shorter than that ("What is a firewall used for?" is 28), so the
//  rule was blind to exactly the short questions a model is most likely to be
//  able to restate. 30 still requires VERBATIM containment of a whole stored
//  field, which is why the false positive risk barely moves: a support reply has
//  to reproduce a question or a rationale character for character to trip it.
const MIN = {
  code: 6,          // access_codes.code, real codes are longer
  option: 16,       // a 16 character option repeated verbatim is not coincidence
  prompt: 30,       // a whole question stem
  explanation: 30,  // a whole rationale
};

const stScanCodes = db.prepare(`
  SELECT COUNT(*) AS n FROM access_codes
  WHERE length(code) >= @minCode AND instr(upper(@text), upper(code)) > 0
`);

const stScanOptions = db.prepare(`
  SELECT COUNT(*) AS n
  FROM quiz_bank q, json_each(q.options) j
  WHERE (@course IS NULL OR q.course = @course)
    AND json_valid(q.options)
    AND length(j.value) >= @minOption
    AND instr(lower(@text), lower(j.value)) > 0
`);

const stScanText = db.prepare(`
  SELECT COUNT(*) AS n FROM quiz_bank q
  WHERE (@course IS NULL OR q.course = @course)
    AND (
      (length(q.prompt) >= @minPrompt AND instr(lower(@text), lower(q.prompt)) > 0)
      OR (q.explanation IS NOT NULL AND length(q.explanation) >= @minExplanation
          AND instr(lower(@text), lower(q.explanation)) > 0)
    )
`);

function scanForSecrets(text, opts = {}) {
  const t = typeof text === 'string' ? text : '';
  if (!t) return { hit: false, kind: null };
  // course narrows the quiz_bank scan when the page scope names one. NULL scans
  // every course, which is the correct default: a response that quotes another
  // course's answer key is still a leak.
  const course = opts.course ? String(opts.course) : null;
  const p = {
    text: t,
    course,
    minCode: MIN.code,
    minOption: MIN.option,
    minPrompt: MIN.prompt,
    minExplanation: MIN.explanation,
  };
  try {
    if (stScanCodes.get(p).n > 0) return { hit: true, kind: 'access_code' };
    if (stScanOptions.get(p).n > 0) return { hit: true, kind: 'quiz_option' };
    if (stScanText.get(p).n > 0) return { hit: true, kind: 'quiz_text' };
  } catch (e) {
    // A scan that cannot run must not let the response through. This is a
    // tripwire on an assessment product: failing closed costs one refusal, and
    // failing open costs the answer key.
    return { hit: true, kind: 'scan_error' };
  }
  return { hit: false, kind: null };
}

module.exports.scanForSecrets = scanForSecrets;
module.exports.SCAN_MIN = MIN;
