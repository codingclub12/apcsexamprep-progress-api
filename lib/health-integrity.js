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

// Tests seed a database mid-process, so they need a way to drop the cache.
function resetCache() { cache = null; cachedAt = 0; }

module.exports = { codeSeedIntegrity, resetCache, TTL_MS };
