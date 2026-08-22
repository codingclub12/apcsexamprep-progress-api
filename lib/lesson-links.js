'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  LESSON LINKS - turning a gradebook cell back into the page it came from.
//
//  My Progress has always been able to say "CSA 1.4 quiz, 4/6" and never able to
//  say where that quiz is. The student reads a number and then goes hunting
//  through the course hub for the page. This module answers the inverse of
//  pageFromHandle: given (course, unit, lesson, activity_type), which page?
//
//  Two sources, in this order, and the order is the point:
//
//    1. LEARNED. page_links records the handle every time /track parses one.
//       This is ground truth: the page exists, because a student was standing on
//       it. It is also the only possible answer for CSA, AP Networking, and
//       Intro to Java, whose handles carry a title slug the lesson id does not
//       contain ('ap-csa-lesson-1-2-{slug}'). No string building recovers a slug
//       nobody stored.
//
//    2. DERIVED. CSP lesson ids ARE the handle slug, and the numbered cyber
//       pages encode unit and lesson as digits, so those two are computable with
//       no row needed. Every derived handle is round-tripped back through
//       pageFromHandle before it is returned, so a rule that drifts from the
//       parser produces no link instead of a wrong one.
//
//  A miss falls back to the unit hub, then the course hub, then nothing. The
//  caller is told which of those it got (kind: 'page' | 'unit' | 'course') so a
//  link to a hub can be labelled as one rather than promising the assignment.
//
//  No PII and nothing per student: a handle is a public URL slug, identical for
//  everyone who opens the page.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');
const { pageFromHandle } = require('../utils');

const STORE_ORIGIN = (process.env.STORE_ORIGIN || 'https://apcsexamprep.com').replace(/\/+$/, '');

function urlFor(handle) {
  return `${STORE_ORIGIN}/pages/${handle}`;
}

// ── LEARNING ─────────────────────────────────────────────────────────────────
//  Upsert rather than insert-if-absent: when a lesson page is renamed the new
//  handle is the live one, and the old row would go on pointing at a 404. The
//  most recently seen handle for a key always wins.
const learnStmt = db.prepare(`
  INSERT INTO page_links (course, unit, lesson, activity_type, handle, seen_count, last_seen)
  VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
  ON CONFLICT(course, unit, lesson, activity_type) DO UPDATE SET
    handle = excluded.handle,
    seen_count = page_links.seen_count + 1,
    last_seen = excluded.last_seen
`);

// The seed path, which must never overwrite. A handle harvested from this repo
// is an authored guess; a handle a student was standing on is a fact, and the
// boot seed runs on every restart, so an upsert here would replace the fact with
// the guess every time the service came back up.
const seedStmt = db.prepare(`
  INSERT OR IGNORE INTO page_links (course, unit, lesson, activity_type, handle, seen_count, last_seen)
  VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
`);

// Records where a parsed page lives. Called from /track, which already has both
// the raw handle and the parsed key, so this costs one upsert on a request that
// was happening anyway. Never allowed to fail a student's request: a missing
// link is a missing convenience, not a lost grade.
//
// onlyIfAbsent leaves an existing row alone; see seedStmt above.
function learn(parsed, rawHandle, opts) {
  try {
    if (!parsed || !rawHandle) return false;
    const handle = String(rawHandle).split('?')[0].split('#')[0].split('/').filter(Boolean).pop() || '';
    if (!handle || handle.length > 120) return false;
    const stmt = (opts && opts.onlyIfAbsent) ? seedStmt : learnStmt;
    const info = stmt.run(parsed.course, parsed.unit, String(parsed.lesson), parsed.activity_type, handle);
    return !(opts && opts.onlyIfAbsent) || info.changes > 0;
  } catch (e) {
    return false;
  }
}

const learnedStmt = db.prepare(
  'SELECT handle FROM page_links WHERE course = ? AND unit = ? AND lesson = ? AND activity_type = ?'
);

// Every learned handle for a course in one read. The student progress view needs
// a link per cell, and a per-cell query would be the N+1 this repo keeps out of
// its read paths.
const learnedForCourseStmt = db.prepare(
  'SELECT unit, lesson, activity_type, handle FROM page_links WHERE course = ?'
);

function keyOf(course, unit, lesson, activity) {
  return `${course}|${unit}|${lesson}|${activity}`;
}

// ── DERIVING ─────────────────────────────────────────────────────────────────
//  The inverse of the rules in pageFromHandle, for the two courses where the
//  inverse exists. Anything returned here is verified against the parser below.
function derive(course, unit, lesson, activity) {
  const L = String(lesson);

  if (course === 'ap-csp') {
    const m = /^bi-?(\d+)$/.exec(unit);
    if (!m) return null;
    // The Big Idea unit tests carry no activity suffix: the lesson id already IS
    // 'unit-test' or 'unit-test-part-a', and appending '-exam' would build a
    // handle that exists on no store.
    if (/^unit-test/.test(L)) return `ap-csp-course-bi${m[1]}-${L}`;
    const suffix = activity && activity !== 'lesson' ? `-${activity}` : '';
    return `ap-csp-course-bi${m[1]}-${L}${suffix}`;
  }

  if (course === 'ap-cybersecurity') {
    const m = /^unit-(\d+)$/.exec(unit);
    if (!m) return null;
    if (L === 'exam') return `ap-cyber-unit-${m[1]}-exam`;
    const dot = /^(\d+)\.(\d+)$/.exec(L);
    if (!dot) return null;
    const suffix = activity && activity !== 'lesson' ? `-${activity}` : '';
    return `ap-cyber-unit-${dot[1]}-lesson-${dot[2]}${suffix}`;
  }

  return null;
}

// A derived handle is only trusted if parsing it returns the key it was built
// from. That makes pageFromHandle the single authority in both directions: if
// someone changes a rule there and not here, links stop appearing rather than
// quietly pointing at the wrong lesson.
function deriveVerified(course, unit, lesson, activity) {
  const handle = derive(course, unit, lesson, activity);
  if (!handle) return null;
  const back = pageFromHandle(handle);
  if (!back) return null;
  if (back.course !== course || back.unit !== unit) return null;
  if (String(back.lesson) !== String(lesson) || back.activity_type !== activity) return null;
  return handle;
}

// ── HUB FALLBACKS ────────────────────────────────────────────────────────────
//  Only handles this repo already builds pages against. Cyber has no hub listed
//  here on purpose: no evidence of one in this codebase, and a guessed hub is a
//  404 with a confident link on it.
function unitHub(course, unit) {
  let m;
  if (course === 'ap-csa' && (m = /^unit-(\d+)$/.exec(unit))) return `ap-csa-unit-${m[1]}-course`;
  if (course === 'ap-csp' && (m = /^bi-?(\d+)$/.exec(unit))) return `ap-csp-course-big-idea-${m[1]}`;
  return null;
}

function courseHub(course) {
  if (course === 'ap-csa') return 'ap-csa-course';
  if (course === 'ap-csp') return 'ap-csp-course';
  return null;
}

// ── RESOLVING ────────────────────────────────────────────────────────────────
//  learnedMap is optional: pass the result of learnedMapFor() to resolve a whole
//  grid without going back to SQLite per cell.
function resolve(course, unit, lesson, activity, learnedMap) {
  const key = keyOf(course, unit, String(lesson), activity);
  let handle = learnedMap
    ? learnedMap.get(key)
    : (learnedStmt.get(course, unit, String(lesson), activity) || {}).handle;

  if (handle) return { url: urlFor(handle), handle, kind: 'page' };

  handle = deriveVerified(course, unit, lesson, activity);
  if (handle) return { url: urlFor(handle), handle, kind: 'page' };

  handle = unitHub(course, unit);
  if (handle) return { url: urlFor(handle), handle, kind: 'unit' };

  handle = courseHub(course);
  if (handle) return { url: urlFor(handle), handle, kind: 'course' };

  return null;
}

function learnedMapFor(courses) {
  const map = new Map();
  for (const course of new Set(courses || [])) {
    for (const r of learnedForCourseStmt.all(course)) {
      map.set(keyOf(course, r.unit, String(r.lesson), r.activity_type), r.handle);
    }
  }
  return map;
}

module.exports = { learn, resolve, learnedMapFor, urlFor, STORE_ORIGIN };
