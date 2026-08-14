'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  DISPATCH QUEUE. The consumer for `auto_dispatch`, which has existed in the
//  schema since Phase 1 and which nothing has ever read.
//
//  Two separate facts have to line up before a task runs with no human in front
//  of it, and conflating them is how a queue starts dispatching things nobody
//  meant it to:
//
//    1. CAPABILITY - the router says this KIND of task could be dispatched.
//       Repo-reachable, open, unblocked, off the never-auto list, small enough.
//    2. CONSENT    - the `auto_dispatch` column says 'eligible', which is Tanner
//       ticking the box on this PARTICULAR task.
//
//  Capability without consent is a task that merely could run. Consent without
//  capability is a stale tick from before the task grew. Both, or it waits.
//
//  ── ELIGIBILITY IS RECOMPUTED AT READ TIME ──────────────────────────────────
//
//  The stored `auto_dispatch` value is a snapshot of consent, never of policy.
//  Policy is re-derived from the router on every read, exactly as the gradebook
//  recomputes passed and grade-of-record against the class's CURRENT
//  mastery_threshold rather than trusting the stored flag. So narrowing
//  AUTO_DISPATCH_MAX_SIZES, adding a NEVER_AUTO rule, or blocking a task takes
//  effect on the next run for every already-ticked task, with no migration and
//  no stale ticks to hunt down.
//
//  Read-only. This module selects and explains; it never writes, never claims,
//  and never marks anything verified.
// ─────────────────────────────────────────────────────────────────────────────

const store = require('./command-store');
const router = require('./command-router');

// How many tasks one run may hand out. Small on purpose: this is a 1 vCPU box
// with a prior $169 cost leak behind it, and a queue that dispatches twelve
// things at 2am is a queue nobody can read the next morning.
const DEFAULT_MAX_PER_RUN = 3;

// Consent values. Only 'eligible' means "you may take this". 'dispatched' means
// a run already picked it up and it has not come back, which is the guard
// against a second run grabbing the same task while the first is still working.
const CONSENT_READY = 'eligible';

function dispatchQueue(opts = {}) {
  const max = Number.isFinite(opts.max) ? opts.max : DEFAULT_MAX_PER_RUN;
  const themeCiExists = opts.themeCiExists !== undefined
    ? !!opts.themeCiExists
    : store.themeCiExists();

  const tasks = store.listTasks({ status: 'open' });

  const ready = [];
  const skipped = [];

  for (const task of tasks) {
    const consent = String(task.auto_dispatch || 'off').trim().toLowerCase();

    // No tick, no dispatch. Reported quietly: most of the board is in this
    // state and it is not interesting.
    if (consent !== CONSENT_READY) {
      if (consent === 'dispatched') {
        skipped.push({ id: task.id, title: task.title, reason: 'Already dispatched and not yet returned.' });
      }
      continue;
    }

    // Policy re-derived now, not trusted from when the box was ticked.
    const verdict = router.autoDispatchEligibility(task, { themeCiExists });
    if (!verdict.eligible) {
      skipped.push({
        id: task.id,
        title: task.title,
        reason: `Ticked for dispatch, but no longer eligible: ${verdict.reason}`,
        stale_consent: true,
      });
      continue;
    }

    ready.push({
      id: task.id,
      title: task.title,
      surface: task.surface,
      size: task.size,
      bucket: task.effective_bucket || task.bucket,
      routed_surface: task.routed_surface,
      routed_model: task.routed_model,
      reason: verdict.reason,
      prompt_path: `/api/command/task/${task.id}/prompt`,
    });
  }

  // A task already ticked and still eligible is taken in board order, which
  // listTasks has already applied: bleeding first, then bucket rank.
  const dispatch = ready.slice(0, max);
  const deferred = ready.slice(max).map((t) => ({
    id: t.id,
    title: t.title,
    reason: `Over the per-run cap of ${max}. Eligible, and first in line next run.`,
  }));

  return {
    generated_at: new Date().toISOString(),
    max_per_run: max,
    eligible_count: ready.length,
    dispatch,
    deferred,
    skipped,
    // Stated rather than implied: a caller reading this should be able to see
    // the policy that produced it without opening the router.
    policy: {
      dispatchable_sizes: router.AUTO_DISPATCH_MAX_SIZES,
      never_auto: router.NEVER_AUTO.map((r) => r.why),
      theme_ci_exists: themeCiExists,
      note: 'Consent is stored; capability is recomputed on every read.',
    },
  };
}

module.exports = { dispatchQueue, DEFAULT_MAX_PER_RUN, CONSENT_READY };
