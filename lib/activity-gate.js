'use strict';
// -----------------------------------------------------------------------------
//  ACTIVITY GATE - is this quiz open to this student right now?
//
//  WHAT THIS IS, AND WHAT IT IS NOT
//  key_releases answers "may the student SEE THE ANSWERS after submitting?".
//  This answers a different question: "may the student OPEN THE QUIZ AT ALL?".
//  A teacher who wants a quiz used as a graded assessment needs the second one,
//  because a quiz that is readable a week early is not an assessment, it is a
//  study guide. The two are deliberately separate rows: a quiz can be open with
//  its key withheld (the normal exam case), and a quiz can be closed with its
//  key already released (revision after the test).
//
//  THE GATE IS ONLY AS REAL AS THE RENDER PATH
//  This gate is enforced where the SERVER hands out questions, which is
//  routes/quiz.js against quiz_bank. It cannot protect a quiz whose questions
//  are baked into the Shopify page body, because there the browser already has
//  them before any code here runs. Hiding such a page client-side is theatre and
//  View Source defeats it. A page must be migrated onto the server render path
//  before locking it means anything. See docs/quiz-locking.md.
//
//  RESOLVED AT READ TIME, NEVER STORED
//  Same posture as mastery/passed and auto_dispatch capability elsewhere in this
//  repo: the class default is consulted on every read, so flipping a class from
//  open to locked re-gates every activity immediately, with no migration and no
//  stale flags to hunt down.
//
//  FOUR SCOPES IN ONE TABLE (added 2026-09-06)
//  A teacher assigns by unit and by lesson, not one checkbox at a time, so a
//  gate row may carry the literal '*' in its lesson and/or activity_type column
//  to stand for "every one of them". No schema change: the primary key already
//  covers it, and a row written before this existed is an activity-scope row
//  that resolves exactly as it always did.
//
//      unit-3   *       *        every activity in unit 3
//      unit-3   *       quiz     every quiz in unit 3
//      unit-3   3.2     *        everything in lesson 3.2
//      unit-3   3.2     quiz     that one assignment
//
//  PRECEDENCE IS BY NARROWNESS, most specific first, and it has to be stated
//  rather than discovered: a teacher who locks a whole unit and then opens one
//  lesson inside it means the second thing, and a resolver that let the unit row
//  win would silently discard the more deliberate instruction.
//
//      1  the exact activity            (lesson, activity)
//      2  the lesson                    (lesson, *)
//      3  the activity type in the unit (*, activity)
//      4  the unit                      (*, *)
//      5  classes.quiz_lock_default
//
//  2 beats 3 because a lesson is one lesson and an activity type spans every
//  lesson in the unit, so the lesson row is the narrower statement. That tie is
//  the only one a teacher can write by accident, so it is decided here once and
//  asserted in smoke/gate-scope.js rather than left to row order.
// -----------------------------------------------------------------------------

// The literal a gate row carries to mean "all of them" in that column. Chosen
// because no unit, lesson or activity id in any course is a bare asterisk, so a
// wildcard row can never collide with a real one.
const SCOPE_ALL = '*';

// Activity types the CLASS DEFAULT applies to. An explicit activity_gates row can
// open or close ANY activity type; this set only bounds the blanket default, so
// that a teacher switching a class to locked-by-default does not silently lock
// the practice exercises their students use for homework that night.
const DEFAULT_GATED = new Set(['quiz', 'exam']);

// Narrowest first. The number is the sort key and the name is what an operator
// reads, so the two cannot drift apart into two opinions about specificity.
const SCOPES = ['activity', 'lesson', 'unit-activity', 'unit'];

// Which scope a stored row expresses, from its own two columns.
function rowScope(row) {
  const anyLesson = row.lesson === SCOPE_ALL;
  const anyActivity = row.activity_type === SCOPE_ALL;
  if (!anyLesson && !anyActivity) return 'activity';
  if (!anyLesson) return 'lesson';
  if (!anyActivity) return 'unit-activity';
  return 'unit';
}

// The narrowest row that covers (lesson, activity_type), or null. Rows that
// cover neither are ignored rather than trusted, so a caller may hand this the
// whole class's gate list without pre-filtering.
function pickGateRow(rows, lesson, activity_type) {
  let best = null;
  let bestRank = Infinity;
  for (const row of (rows || [])) {
    if (!row) continue;
    if (row.lesson !== SCOPE_ALL && row.lesson !== lesson) continue;
    if (row.activity_type !== SCOPE_ALL && row.activity_type !== activity_type) continue;
    const rank = SCOPES.indexOf(rowScope(row));
    if (rank < bestRank) { best = row; bestRank = rank; }
  }
  return best;
}

// cls is the student's class row, or null/undefined for public self-study.
// Returns { open, reason, scope }. reason and scope are for operator display and
// logs, never a gate input.
//
// row is ONE row, already narrowed by pickGateRow when the caller has more than
// one candidate. The single-row form is kept because the great majority of
// callers have exactly one, and because every gate row written before scopes
// existed is an activity-scope row that must resolve unchanged.
function resolveGate(row, cls, activity_type) {
  // Public self-study and solo (ME-) accounts have no teacher to open anything,
  // so a gate would lock them out of their own practice forever.
  if (!cls || !cls.id) return { open: true, reason: 'self-study', scope: null };

  if (row && row.open !== null && row.open !== undefined) {
    const scope = (row.lesson === undefined && row.activity_type === undefined)
      ? 'activity'          // a bare { open } row, which is what the old callers pass
      : rowScope(row);
    // The activity-scope reasons are the strings this repo has always emitted
    // and other suites assert on them. The wider scopes get their own so that
    // "why is this locked" answers with the row a teacher would go and edit.
    const suffix = row.open ? 'open' : 'closed';
    const reason = scope === 'activity' ? `explicit-${suffix}` : `${scope}-${suffix}`;
    return { open: !!row.open, reason, scope };
  }

  const lockDefault = !!(cls.quiz_lock_default);
  if (!lockDefault) return { open: true, reason: 'class-default-open', scope: null };
  if (!DEFAULT_GATED.has(activity_type)) {
    return { open: true, reason: 'class-default-not-gated-type', scope: null };
  }
  return { open: false, reason: 'class-default-locked', scope: null };
}

// The whole resolution in one call, for a caller holding a set of candidate
// rows. This is the entry point every new caller should use; resolveGate stays
// exported because the render and submit paths fetch a single row and because
// one implementation of the LADDER matters more than one implementation of the
// lookup.
function resolveScopedGate(rows, cls, lesson, activity_type) {
  return resolveGate(pickGateRow(rows, lesson, activity_type), cls, activity_type);
}

//  THE ANONYMOUS CASE, added 2026-09-07 after a teacher checked her own lock.
//
//  Every function above answers "is this open for MY class". An anonymous
//  request has no class, so resolveGate returns self-study and the item is
//  served. That is deliberate for public practice and it was also, until this
//  function existed, a complete bypass: a student who signed out, or opened the
//  same page in incognito, was handed a lab their teacher had closed. The lock
//  was real and one click stepped around it.
//
//  The rule chosen is the narrow one. An item nobody has locked stays open to
//  anonymous requests and stays indexable, because gating the public practice
//  layer would be a strategic loss and not a security win. An item that carries
//  an explicit CLOSING row for at least one class is refused to anyone with no
//  token, on the reasoning that the public copy and the assigned copy are the
//  same bytes, so leaving one open leaves both open.
//
//  It reads ROWS ONLY and never a class default. A class switched to
//  locked-by-default has expressed a posture about its own students, not a
//  judgement that this item should leave the public site, and letting a default
//  reach in here would quietly de-index every quiz on the site the first time
//  one teacher flipped that switch.
//
//  rows is every gate row for (course, unit) across ALL classes, so it carries a
//  class_id per row where the per-class helpers above do not need one.
//  activityTypes may be one name or several. Labs pass two, because a spec calls
//  itself 'terminal-lab' while the column a teacher clicks is 'lab', and BOTH
//  have to be resolved together rather than one after the other. Asking about
//  each name in turn and refusing on the first close was the first version of
//  this function and it was wrong: a class holding a closing UNIT row plus an
//  opening 'lab' row would refuse, because 'terminal-lab' matched only the unit
//  row. The suite caught it. Narrowest wins ACROSS the names, which is the same
//  ladder the per-class path in routes/labs.js runs.
function lockedForAnyClass(rows, lesson, activityTypes) {
  const acts = Array.isArray(activityTypes) ? activityTypes : [activityTypes];
  const byClass = new Map();
  for (const row of (rows || [])) {
    if (!row) continue;
    const key = row.class_id;
    if (!byClass.has(key)) byClass.set(key, []);
    byClass.get(key).push(row);
  }
  //  Resolve per class rather than scanning for any open=0 row. A class can hold
  //  a closing UNIT row and an opening LESSON row at once, and for that class
  //  the item is OPEN. Trusting the closing row alone would refuse the public a
  //  lab that no class has actually closed.
  for (const [, classRows] of byClass) {
    let best = null;
    let bestRank = Infinity;
    for (const act of acts) {
      const row = pickGateRow(classRows, lesson, act);
      if (!row) continue;
      const rank = SCOPES.indexOf(rowScope(row));
      //  Narrower always wins. On a TIE, the CLOSING row wins, and that is a
      //  decision rather than an accident. Two rows at the same scope differing
      //  only in which alias they name is a contradiction a teacher can create
      //  by closing the Lab column while a stale 'terminal-lab' row is still
      //  open, and letting the open one win would mean their click did nothing.
      //  That is the exact complaint that started this whole thread. A generated
      //  rederive found the tie; before that, alias order decided it silently.
      const closes = (row.open === 0 || row.open === false);
      const bestCloses = best && (best.open === 0 || best.open === false);
      if (rank < bestRank || (rank === bestRank && closes && !bestCloses)) {
        best = row; bestRank = rank;
      }
    }
    if (best && (best.open === 0 || best.open === false)) {
      return { locked: true, reason: `closed-for-${rowScope(best)}`, scope: rowScope(best) };
    }
  }
  return { locked: false, reason: null, scope: null };
}

//  ONE LADDER FOR AN ACTIVITY WITH SEVERAL NAMES.
//
//  A lab spec calls itself 'terminal-lab' while the gradebook column a teacher
//  clicks is 'lab', so both names have to be resolved TOGETHER and the narrowest
//  answer wins. Asking about each in turn and taking the first close ignores an
//  explicit reopen on the other name, which is exactly what a teacher means when
//  they reopen one lab inside a closed unit.
//
//  On a TIE the closing answer wins, matching lockedForAnyClass above, so a
//  teacher closing the Lab column while a stale 'terminal-lab' row sits open
//  does not watch their click do nothing. routes/labs.js and routes/analysis.js
//  both call this rather than keeping two copies that agree by luck.
const SCOPE_RANK = { activity: 0, lesson: 1, 'unit-activity': 2, unit: 3 };
const rankOf = (g) => (g.scope ? SCOPE_RANK[g.scope] : 9);   // no scope = class default, widest

function resolveAliasGate(rows, cls, lesson, activityTypes) {
  const acts = Array.isArray(activityTypes) ? activityTypes : [activityTypes];
  let best = null;
  for (const act of acts) {
    const g = resolveScopedGate(rows, cls, lesson, act);
    if (!best || rankOf(g) < rankOf(best) || (rankOf(g) === rankOf(best) && !g.open && best.open)) best = g;
  }
  return best;
}

module.exports = {
  resolveGate,
  resolveScopedGate,
  resolveAliasGate,
  lockedForAnyClass,
  pickGateRow,
  rowScope,
  SCOPE_ALL,
  SCOPES,
  DEFAULT_GATED,
};
