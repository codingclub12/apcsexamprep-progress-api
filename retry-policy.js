'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  RETRY POLICY - the single source of truth for "may this student retry this
//  activity, and which attempt is the grade of record".
//
//  WHY THIS FILE EXISTS
//  The setting used to be one boolean, classes.retry_allowed, and it only ever
//  governed quizzes. Practice work (CFUs, exercises, labs) ignored it entirely:
//  scoring.js rollupScore always kept the best points per item, so practice was
//  best-of-many for every class in the product whatever the teacher had chosen.
//  Teachers asked for the obvious middle setting - "let them redo the practice,
//  but the quiz is one shot" - which a boolean cannot express.
//
//  THE THREE MODES (stored on classes.retry_mode)
//    'all'      retries on everything. Best attempt counts for practice AND
//               assessments.
//    'practice' retries on practice only. Assessments are one shot: the first
//               attempt is the grade of record and the quiz route refuses a
//               retake. This is the default for a new class.
//    'none'     no retries anywhere. First attempt counts on everything.
//
//  PER-STUDENT ESCAPE HATCH
//  students.retry_override is unchanged and still wins outright: when it is not
//  NULL that student's retries follow the override for every activity type,
//  whatever the class mode says. Semantics preserved exactly.
//
//  CLASSIFICATION
//  Exactly one list, here, used by both the server and (through the API) the
//  client, so the two cannot drift. The ASSESSMENT list is the closed one: an
//  activity type nobody has enumerated yet is practice, which is the forgiving
//  side of the line and matches how every non-quiz path already behaved.
//
//  THE retry_allowed INVARIANT
//  retry_allowed is KEPT and kept in sync, as a derived column:
//
//      retry_allowed = (retry_mode === 'all') ? 1 : 0
//
//  It is read by cyber-dashboard.html, public/teachers.html, lib/admin-gradebook.js,
//  lib/admin-exec.js, routes/admin.js, routes/progress.js and a dozen smoke
//  suites. Migrating every reader in one change would be a large blast radius for
//  no behavioral gain, and any of them left behind would silently read a column
//  that had stopped moving. Read it as what it has always actually meant:
//  "may a student retake an ASSESSMENT". That is true only under 'all'.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

const MODE_ALL = 'all';
const MODE_PRACTICE = 'practice';
const MODE_NONE = 'none';
const MODES = [MODE_ALL, MODE_PRACTICE, MODE_NONE];

// The default for a brand new class. Existing classes are NOT defaulted: they
// are mapped from retry_allowed by the boot migration (see db.js) so that no
// live class changes behavior on deploy day.
const DEFAULT_MODE = MODE_PRACTICE;

// Assessments. The closed list. Everything else is practice.
const ASSESSMENT_ACTIVITY_TYPES = ['quiz', 'exam'];

// Practice types actually in use today, listed for documentation and for the
// teacher-facing copy. Membership here is NOT what makes something practice:
// not being an assessment is.
const PRACTICE_ACTIVITY_TYPES = [
  'lesson', 'cfu', 'exercise-1', 'exercise-2', 'exercise-3', 'lab', 'game', 'reading',
];

// Teacher-facing wording. Plain language, never the enum value, because a
// teacher choosing a grading rule should not have to learn our vocabulary.
const MODE_LABELS = {
  [MODE_ALL]: 'Retries: everything',
  [MODE_PRACTICE]: 'Retries: practice only',
  [MODE_NONE]: 'Retries: off',
};
const MODE_DESCRIPTIONS = {
  [MODE_ALL]: 'Students may redo practice and retake quizzes. Their best attempt counts.',
  [MODE_PRACTICE]: 'Students may redo practice work and their best attempt counts, but a quiz or exam is one attempt and that first attempt is the grade.',
  [MODE_NONE]: 'One attempt at everything. The first attempt is the grade of record.',
};

function norm(v) {
  return String(v == null ? '' : v).trim().toLowerCase();
}

function isAssessmentType(activityType) {
  return ASSESSMENT_ACTIVITY_TYPES.includes(norm(activityType));
}

function isPracticeType(activityType) {
  return !isAssessmentType(activityType);
}

function classifyActivity(activityType) {
  return isAssessmentType(activityType) ? 'assessment' : 'practice';
}

// Accept a mode string, or the legacy boolean shape any cached client may still
// be sending. Returns null when the value means nothing, so a caller can tell
// "not supplied" from "supplied as 'all'".
function normalizeMode(value) {
  if (value === null || value === undefined || value === '') return null;
  const s = norm(value);
  if (MODES.includes(s)) return s;
  // Legacy boolean payloads: {retry_allowed: true|false|1|0|'true'|'false'}
  if (value === true || s === 'true' || s === '1' || value === 1) return MODE_ALL;
  if (value === false || s === 'false' || s === '0' || value === 0) return MODE_PRACTICE;
  return null;
}

// The deploy-day mapping, in one place so the migration, the API and the tests
// all state it identically.
//   retry_allowed = 1 -> 'all'      (quizzes retryable AND practice best-of-many)
//   retry_allowed = 0 -> 'practice' (quizzes one shot, practice still best-of-many)
// 'none' is genuinely new. No existing row maps to it.
function modeFromLegacy(retryAllowed) {
  return retryAllowed ? MODE_ALL : MODE_PRACTICE;
}

// The inverse, and the invariant the migration and the PATCH route both enforce.
function legacyFromMode(mode) {
  return normalizeMode(mode) === MODE_ALL ? 1 : 0;
}

// Resolve the effective mode off a class row. Falls back to the legacy boolean
// when retry_mode has not been backfilled yet (a row inserted by an older code
// path between deploy and the next boot), so there is never a window where the
// column being NULL means "no policy".
function resolveMode(classRow) {
  if (!classRow) return MODE_ALL;
  const explicit = MODES.includes(norm(classRow.retry_mode)) ? norm(classRow.retry_mode) : null;
  if (explicit) return explicit;
  if (classRow.retry_allowed !== undefined) return modeFromLegacy(classRow.retry_allowed);
  return DEFAULT_MODE;
}

// THE decision. Everything in the codebase that asks "may this be retried / does
// the best attempt count" must come through here.
//   override: students.retry_override, or null/undefined for "no override".
function retryAllowedFor(mode, activityType, override) {
  if (override !== null && override !== undefined) return !!override;
  const m = normalizeMode(mode) || DEFAULT_MODE;
  if (m === MODE_ALL) return true;
  if (m === MODE_NONE) return false;
  return isPracticeType(activityType); // MODE_PRACTICE
}

// The same decision as retryAllowedFor(), expressed as a SQL fragment, for the
// aggregate read paths that must resolve the policy for a whole class in one
// pass instead of row by row in JS. Keeping it here is what stops the two
// implementations from drifting apart.
//   modeCol     : the classes.retry_mode column (e.g. 'c.retry_mode')
//   overrideCol : the students.retry_override column (e.g. 's.retry_override')
//   typeCol     : the activity type column (e.g. 'se.activity_type')
//   legacyCol   : the classes.retry_allowed column (e.g. 'c.retry_allowed'),
//                 optional but strongly preferred; see the NULL case below
// Evaluates to 1 when the BEST attempt counts, 0 when the FIRST one does.
//
// THE NULL MODE CASE, AND WHY legacyCol MATTERS
// A row can carry a NULL retry_mode only between an insert by an older code path
// and the next boot. resolveMode() in JS handles that by falling back to the
// legacy boolean through the same deploy mapping the migration uses, so a NULL
// row still resolves to a real mode. This expression must do the SAME THING or
// the two implementations disagree exactly where they are hardest to test, and a
// teacher sees one number in the gradebook (SQL) and another from the API (JS).
// Passing legacyCol reproduces resolveMode() precisely. Without it, the only
// safe answer left is the permissive one (best-of), so a policy gap can never
// silently mark a grade DOWN.
function retrySqlExpr(modeCol, overrideCol, typeCol, legacyCol) {
  const assessments = ASSESSMENT_ACTIVITY_TYPES.map((t) => `'${t}'`).join(', ');
  const practiceIsBest = `(CASE WHEN LOWER(TRIM(COALESCE(${typeCol}, ''))) IN (${assessments}) THEN 0 ELSE 1 END)`;
  // NULL mode: mirror resolveMode(), which maps retry_allowed 1 -> 'all' and
  // 0 -> 'practice'. With no legacy column to read, fall back to permissive.
  const nullCase = legacyCol
    ? `WHEN ${modeCol} IS NULL THEN (CASE WHEN COALESCE(${legacyCol}, 0) != 0 THEN 1 ELSE ${practiceIsBest} END)`
    : `WHEN ${modeCol} IS NULL THEN 1`;
  return `(CASE
    WHEN ${overrideCol} IS NOT NULL THEN (CASE WHEN ${overrideCol} != 0 THEN 1 ELSE 0 END)
    ${nullCase}
    WHEN ${modeCol} = '${MODE_ALL}' THEN 1
    WHEN ${modeCol} = '${MODE_NONE}' THEN 0
    ELSE ${practiceIsBest}
  END)`;
}

// The boot backfill / repair, as data so db.js and the smoke suite run the very
// same statements and a test can never pass against a paraphrase of production.
// Idempotent, safe on every boot. See db.js for the reasoning behind the mapping.
const BACKFILL_SQL = [
  // 1. Map legacy rows. Only rows with no valid mode are touched.
  `UPDATE classes SET retry_mode =
     CASE WHEN COALESCE(retry_allowed, 0) != 0 THEN 'all' ELSE 'practice' END
   WHERE retry_mode IS NULL OR retry_mode NOT IN ('all', 'practice', 'none')`,
  // 2. Solo (ME-) accounts are always best-attempt everywhere.
  `UPDATE classes SET retry_mode = 'all' WHERE course = 'solo' AND retry_mode != 'all'`,
  // 3. The invariant: retry_allowed = (retry_mode = 'all').
  `UPDATE classes SET retry_allowed = CASE WHEN retry_mode = 'all' THEN 1 ELSE 0 END
   WHERE COALESCE(retry_allowed, 0) != CASE WHEN retry_mode = 'all' THEN 1 ELSE 0 END`,
];

module.exports = {
  BACKFILL_SQL, retrySqlExpr,
  MODE_ALL, MODE_PRACTICE, MODE_NONE, MODES, DEFAULT_MODE,
  ASSESSMENT_ACTIVITY_TYPES, PRACTICE_ACTIVITY_TYPES,
  MODE_LABELS, MODE_DESCRIPTIONS,
  isAssessmentType, isPracticeType, classifyActivity,
  normalizeMode, modeFromLegacy, legacyFromMode, resolveMode, retryAllowedFor,
};
