'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SEED INTEGRITY, ON THE ONE ENDPOINT THAT NEEDS NO CREDENTIAL.
//
//  WHY THIS EXISTS
//  course_manifest is seeded on boot. The code test bank is NOT: db.js records
//  that as a deliberate posture, same as the quiz bank, so a fresh volume never
//  comes up holding a half-loaded answer key. The consequence is a gap only a
//  human can close, by running scripts/seed-code-tests.js against production.
//
//  That gap has a specific, silent failure mode. A course_manifest row IS a
//  denominator, so opening one for a `code` item with no seeded cases gives the
//  student a column that counts toward pace and an item that answers "not graded
//  yet" when they submit. Nothing is recorded, no Judge0 run is spent, and no
//  error reaches anyone. The only way to see it was GET /api/admin/code-tests,
//  which needs ADMIN_KEY, which is exactly the credential an agent should not be
//  holding. So the question "did the seed run" went unanswered for four days
//  while ten intro-java denominators were live.
//
//  This puts the answer on /api/health, which is public, already polled every
//  half hour by deploy-drift.yml, and already the endpoint anyone reaches for
//  after a deploy.
//
//  WHY IT IS SAFE TO MAKE PUBLIC
//  Counts of AUTHOR content only: how many manifest items exist and how many
//  have a test bank behind them. No student, no class, no score, no answer, no
//  test case. Nothing here narrows to a person, so the zero-PII posture holds.
//  It also leaks nothing an attacker gains from: "10 of 10 intro-java code
//  items have no hidden cases" tells them the items cannot be graded, not how
//  to pass one.
//
//  COST
//  One grouped LEFT JOIN over course_manifest, which is hundreds of rows, keyed
//  by its own primary key and by idx_code_test_cases. Cached, because /api/health
//  is a liveness probe and Railway gives this service 1 vCPU: an uncached query
//  here would run on every probe forever. TTL is deliberately long; this number
//  changes only when someone runs a seed.
//
//  NEVER THROWS. /api/health answering 200 is load-bearing for the platform's
//  own restart logic, so a failure here returns null and the endpoint simply
//  omits the block. A missing field reads as "could not measure", which is
//  honest; a 500 would read as "the container is down", which would be a lie.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
const db = require('../db');

// Five minutes. The underlying number moves only when a human runs a seed, and
// the endpoint is polled far more often than that.
const TTL_MS = 5 * 60 * 1000;

let cache = null;
let cachedAt = 0;

// Prepared once, at module scope, per the repo's performance rule. Lazily, so
// requiring this module never depends on migration order.
let stmt = null;
function statement() {
  if (!stmt) {
    stmt = db.prepare(`
      SELECT m.course                                   AS course,
             COUNT(*)                                   AS total,
             SUM(CASE WHEN c.course IS NULL THEN 1 ELSE 0 END) AS unseeded
      FROM course_manifest m
      LEFT JOIN (
        SELECT DISTINCT course, lesson, item FROM code_test_cases
      ) c ON c.course = m.course AND c.lesson = m.lesson_id AND c.item = m.item_id
      WHERE m.item_type = 'code'
      GROUP BY m.course
      ORDER BY m.course
    `);
  }
  return stmt;
}

/**
 * Which courses have graded `code` items whose hidden test bank is missing.
 *
 * @param {{force?: boolean}} [opts] force skips the cache, for tests.
 * @returns {object|null} null when it could not be measured, never throws.
 */
function codeSeedIntegrity(opts) {
  const force = !!(opts && opts.force);
  const now = Date.now();
  if (!force && cache && now - cachedAt < TTL_MS) return cache;

  try {
    const rows = statement().all();
    const byCourse = {};
    let unseeded = 0;
    let total = 0;
    for (const r of rows) {
      byCourse[r.course] = { total: r.total, unseeded: r.unseeded };
      unseeded += r.unseeded;
      total += r.total;
    }
    // `ok` is the single number worth alerting on. It is true when every code
    // item that has a denominator also has something to grade against.
    cache = { ok: unseeded === 0, code_items: total, code_items_unseeded: unseeded, by_course: byCourse };
    cachedAt = now;
    return cache;
  } catch (e) {
    // Deliberately quiet on the response, loud in the log. A probe endpoint is
    // the wrong place to surface a stack trace to the public.
    console.error('health-integrity: could not measure code seed coverage:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  THE REPORTER GAP: graded activities that students finish and never score.
//
//  WHY THIS EXISTS, and it is the same story as the block above with a different
//  cast. On 2026-09-01 a teacher reported that his students' AP Cyber work showed
//  Lesson and Exercise 1 and nothing after. Measured against the live pages, the
//  Exercise 2 page carried the completion tracker and NO score reporter: zero
//  occurrences of earned or possible in the whole document. So students finished
//  the work, the page marked it done, and no number was ever sent.
//
//  Nothing detected that. The gradebook rendered a tick, which reads as done and
//  fine. The scores were not hidden, they never existed, and they cannot be
//  recovered, because a read-time fix cannot invent a number that was never
//  transmitted. The only cure is fixing the page and having the student resubmit,
//  which is why the cost of noticing late is measured in student work.
//
//  WHAT COUNTS AS THE GAP
//  An activity somebody AUTHORED A DENOMINATOR for (so it is meant to carry a
//  grade) that has completions and has never received a score by any of the three
//  paths the gradebook reads: attempts, score_events, or the progress percent.
//  Authored-but-never-scored is the precise signature of a page that completes
//  without reporting. An activity with no authored denominator is excluded: a
//  lesson visit legitimately carries no score, and flagging those would bury the
//  real signal in noise, which is the failure mode that makes alarms ignored.
//
//  WHY IT IS SAFE TO MAKE PUBLIC
//  Same test as above. The rows are activities, not people: a course, a unit, a
//  lesson and an activity type, plus how many completions are affected. No
//  student, no class, no score, no name, no answer. "ap-cybersecurity 1.1
//  exercise-2 has 14 completions and no scores" names a broken PAGE. Nothing in
//  it narrows to a person, so the zero-PII posture holds.
//
//  COST
//  One grouped scan of progress with two NOT EXISTS probes, cached like its
//  neighbour. It is not free, so it is deliberately on the LONGER cache: unlike a
//  seed count this does move as students work, but a reporter gap is a property
//  of a page, and a page does not start reporting halfway through an afternoon.
//
//  NEVER THROWS, for the same reason: /api/health answering 200 is load-bearing.
// ─────────────────────────────────────────────────────────────────────────────

// Natives that normalize to the 'lesson' canonical in lib/gradebook-contract.js,
// whose isGradedActivity() is literally `canonical !== 'lesson'`. A lesson is a
// page VISIT, not graded work, so it can never be a reporter gap.
//
// This list is the whole reason the first shipped version of this check was
// noise. It gated on "has an authored denominator", assuming that meant graded.
// It does not: production carries denominators for ap-csa lessons, so the very
// first live read returned 53 activities and 362 completions, and every one of
// the top twenty was a lesson visit. An alarm whose loudest rows are healthy
// work is one people learn to skip, which is the failure this check exists to
// avoid. Gate on the same line the gradebook draws, not on a proxy for it.
const LESSON_NATIVES = ['lesson', 'visit', 'page', 'read'];

// Deliberately longer than the seed TTL. A page either has a reporter or it does
// not, so measuring this every 15 minutes is already far more often than the
// answer can change.
const REPORTER_TTL_MS = 15 * 60 * 1000;

let reporterCache = null;
let reporterCachedAt = 0;
let reporterStmt = null;
function reporterStatement() {
  if (!reporterStmt) {
    reporterStmt = db.prepare(`
      SELECT p.course          AS course,
             p.unit            AS unit,
             p.lesson          AS lesson,
             p.activity_type   AS activity_type,
             COUNT(*)          AS completions
      FROM progress p
      JOIN course_denominators d
        ON d.course = p.course AND d.lesson = p.lesson AND d.activity_type = p.activity_type
      WHERE p.completed = 1
        AND p.activity_type NOT IN ('lesson', 'visit', 'page', 'read')
        AND p.score IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM score_events e
          WHERE e.course = p.course AND e.lesson = p.lesson
            AND e.activity_type = p.activity_type
        )
        AND NOT EXISTS (
          SELECT 1 FROM attempts a
          WHERE a.course = p.course AND a.lesson_id = p.lesson
            AND a.item_type = p.activity_type
        )
      GROUP BY p.course, p.unit, p.lesson, p.activity_type
      ORDER BY completions DESC, p.course, p.lesson, p.activity_type
    `);
  }
  return reporterStmt;
}

/**
 * Graded activities that students complete and that never report a score.
 *
 * @param {{force?: boolean, limit?: number}} [opts] force skips the cache.
 * @returns {object|null} null when it could not be measured, never throws.
 */
function reporterIntegrity(opts) {
  const force = !!(opts && opts.force);
  const limit = (opts && opts.limit) || 20;
  const now = Date.now();
  if (!force && reporterCache && now - reporterCachedAt < REPORTER_TTL_MS) return reporterCache;

  try {
    const rows = reporterStatement().all();
    let completions = 0;
    for (const r of rows) completions += r.completions;
    reporterCache = {
      // The one number worth alerting on: zero activities losing scores.
      ok: rows.length === 0,
      activities: rows.length,
      completions_affected: completions,
      // Capped so a probe response cannot grow without bound. The count above is
      // always the true total; this list is the work queue's head.
      worst: rows.slice(0, limit).map((r) => ({
        course: r.course, unit: r.unit, lesson: r.lesson,
        activity_type: r.activity_type, completions: r.completions,
      })),
    };
    reporterCachedAt = now;
    return reporterCache;
  } catch (e) {
    console.error('health-integrity: could not measure reporter coverage:', e.message);
    return null;
  }
}

// Tests seed a database mid-process, so they need a way to drop the cache.
function resetCache() { cache = null; cachedAt = 0; reporterCache = null; reporterCachedAt = 0; }

module.exports = { codeSeedIntegrity, reporterIntegrity, resetCache, TTL_MS, REPORTER_TTL_MS, LESSON_NATIVES };
