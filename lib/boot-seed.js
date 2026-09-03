'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  WHAT THE BOOT SEEDS ACTUALLY DID, VISIBLE FROM OUTSIDE THE CONTAINER.
//
//  ── THE INCIDENT THIS IS FOR, 2026-09-03 ────────────────────────────────────
//  A deploy shipped 24 new course_manifest rows. Production confirmed it was
//  serving the new commit, the railway-deploy check went green, and the manifest
//  count did not move: 908 before, 908 after. Every seed in server.js runs
//  inside runBootSeed, which catches, logs and continues, deliberately, so that
//  a bad seed can never stop the API from serving. The log line naming the cause
//  went to the Railway console, which an agent cannot read, and from outside the
//  container a seed that threw looks EXACTLY like a seed that ran and had
//  nothing to do.
//
//  That is the same shape as every defect this repo keeps paying for: not a
//  crash, a silence that reads as success. The fix is not to stop catching. It
//  is to make the outcome observable.
//
//  ── WHAT IT RECORDS ─────────────────────────────────────────────────────────
//  Per labelled seed: whether it ran, the numeric fields of whatever it
//  returned (rows written, rows considered), and on failure the error's first
//  line. Counts of AUTHOR content only, which is why this is safe to put on the
//  public /api/health beside the integrity block: no student, no class, no
//  score, nothing that narrows to a person. The zero-PII posture holds.
//
//  Error text is truncated and reduced to its first line, because a stack trace
//  on a public endpoint is noise rather than information, and the useful part of
//  a seed failure is always the first line.
//
//  ── WHAT IT DELIBERATELY DOES NOT DO ────────────────────────────────────────
//  Change whether a failure stops the boot. It does not. A seed that throws
//  still leaves the API serving, exactly as before; the only difference is that
//  somebody can now find out that it threw without shell access to the
//  container.
//
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

//  Insertion-ordered, so /api/health lists the seeds in the order they ran and a
//  reader can see where a boot got to.
const results = new Map();

//  A seed's return value is its own shape ({total, changed, mode} for the
//  manifest, other shapes elsewhere), so only the numbers are kept and only a
//  few of them. Numbers are the part that answers "did it do anything".
function numbersOf(value) {
  if (!value || typeof value !== 'object') return {};
  const out = {};
  let n = 0;
  for (const [k, v] of Object.entries(value)) {
    if (typeof v !== 'number') continue;
    out[k] = v;
    if (++n >= 6) break;
  }
  return out;
}

/**
 * Run a boot seed, record what happened, and never throw.
 *
 * @param {string} label  the seed's name, as it appears on /api/health
 * @param {Function} fn   the seed itself
 * @returns {*} whatever the seed returned, or null if it threw
 */
function record(label, fn) {
  const started = Date.now();
  try {
    const value = fn();
    results.set(label, { ok: true, ms: Date.now() - started, ...numbersOf(value) });
    return value;
  } catch (err) {
    const first = String((err && err.message) || err).split('\n')[0].slice(0, 200);
    results.set(label, { ok: false, ms: Date.now() - started, error: first });
    //  Loud in the log as well. The log is still the right place for the stack;
    //  what changed is that the log is no longer the ONLY place.
    console.error(`[boot-seed] ${label} failed, continuing without it:`, err);
    return null;
  }
}

/**
 * Every seed's outcome, plus a single flag worth alerting on.
 * @returns {{ok: boolean, failed: string[], seeds: object}}
 */
function snapshot() {
  const seeds = {};
  const failed = [];
  for (const [label, r] of results) {
    seeds[label] = r;
    if (!r.ok) failed.push(label);
  }
  return { ok: failed.length === 0, failed, seeds };
}

/** Test seam: forget everything recorded so far. */
function reset() { results.clear(); }

module.exports = { record, snapshot, reset, numbersOf };
