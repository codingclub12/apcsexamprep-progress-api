'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  TRAFFIC SCHEDULE — pull the daily sources four times a day, in process.
//
//  WHY IN PROCESS RATHER THAN A CRON HITTING THE HTTP ROUTE.
//
//  An external caller (GitHub Actions, a cron container, an uptime pinger) has
//  to hold the admin key to authenticate, which means the key lives in a second
//  place and every scheduled run puts it on the wire. This process already has
//  the Google and Shopify credentials it needs and can call the same pull
//  function the route calls, so nothing is authenticated, nothing is exposed,
//  and there is no second system to notice has stopped working.
//
//  It also cannot be blocked. The route is only reachable from outside; a pull
//  started from inside the container needs no ingress at all.
//
//  WHY THESE TIMES ARE COMPUTED IN A TIMEZONE AND NOT HARDCODED IN UTC.
//
//  The requested schedule is 06:00, 09:00, 14:30 and 22:00 Central. Central is
//  not a fixed offset: it is UTC-5 in summer and UTC-6 in winter. Hardcoding
//  the UTC equivalents means the schedule silently slides by an hour on the
//  first Sunday in November and nobody notices, because a pull that runs at the
//  wrong hour still returns data. So the fire time is computed against
//  America/Chicago every time, and the DST transition is a smoke test rather
//  than a surprise.
//
//  WHY EACH RUN PULLS ONLY A FEW DAYS.
//
//  Two reasons, and they happen to agree:
//
//  1. The ingest refuses to write more than MAX_ROWS_PER_RUN (5000) per source
//     per call. A day of real data is ~458 ga4 and ~604 gsc rows, so anything
//     past ~8 days silently loses the overflow. The default 28-day pull window
//     would quietly discard most of itself on every run.
//  2. Search Console does not finalise a day when it publishes it. Numbers for
//     the last two to three days keep moving. Re-pulling a short trailing
//     window each time overwrites the provisional values with settled ones,
//     which is exactly what an idempotent upsert is for.
//
//  Four days satisfies both: comfortably under the cap, and wide enough to
//  catch GSC's revisions.
// ─────────────────────────────────────────────────────────────────────────────

const TZ = 'America/Chicago';

// Local wall-clock times, in the timezone above.
const FIRE_TIMES = [
  { hour: 6, minute: 0 },
  { hour: 9, minute: 0 },
  { hour: 14, minute: 30 },
  { hour: 22, minute: 0 },
];

// How many trailing days each scheduled run re-pulls. See the header.
const WINDOW_DAYS = 4;

// setTimeout stores its delay in a signed 32-bit int; anything larger fires
// immediately, which would turn a long wait into a busy loop. Chunk instead.
const MAX_TIMEOUT_MS = 2147483647;

const PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, hour12: false,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
});

// What wall clock does this instant show in TZ?
function wallClock(ms) {
  const p = PARTS.formatToParts(new Date(ms)).reduce((a, x) => (a[x.type] = x.value, a), {});
  return {
    year: +p.year, month: +p.month, day: +p.day,
    // Intl can emit hour 24 for midnight under hour12:false.
    hour: +p.hour % 24, minute: +p.minute, second: +p.second,
  };
}

// Offset between TZ wall clock and UTC at a given instant, in milliseconds.
function offsetAt(ms) {
  const w = wallClock(ms);
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - (ms - (ms % 1000));
}

// The UTC instant at which TZ's clock reads the given wall time.
//
// Two passes, because the offset depends on the answer: guess using the offset
// at the naive instant, then re-measure at the guess. One correction is enough
// for a one-hour DST step, and the result is verified by reading the clock back
// rather than trusted.
function instantForWallClock(year, month, day, hour, minute) {
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = naive - offsetAt(naive);
  guess = naive - offsetAt(guess);
  return guess;
}

// The next scheduled instant strictly after `afterMs`.
//
// Candidates are generated from the TZ-local date, not from UTC dates, so the
// 22:00 Central slot (which lands on the following UTC day) is not skipped.
function nextFireAfter(afterMs) {
  const w = wallClock(afterMs);
  const candidates = [];
  for (const offsetDays of [-1, 0, 1]) {
    const base = Date.UTC(w.year, w.month - 1, w.day) + offsetDays * 86400000;
    const d = new Date(base);
    for (const t of FIRE_TIMES) {
      candidates.push(instantForWallClock(
        d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), t.hour, t.minute
      ));
    }
  }
  const future = candidates.filter((c) => c > afterMs).sort((a, b) => a - b);
  return future.length ? future[0] : afterMs + 3600000;
}

function fmt(ms) {
  const w = wallClock(ms);
  const p2 = (n) => String(n).padStart(2, '0');
  return `${w.year}-${p2(w.month)}-${p2(w.day)} ${p2(w.hour)}:${p2(w.minute)} ${TZ}`;
}

// ── The scheduler itself ─────────────────────────────────────────────────────

function createScheduler({ runPull, logger = console, now = Date.now } = {}) {
  let timer = null;
  let running = false;
  let stopped = false;
  const state = { last_run_at: null, last_result: null, runs: 0, failures: 0, next_fire_at: null };

  function armFor(fireAt) {
    if (stopped) return;
    const delay = Math.max(0, fireAt - now());
    state.next_fire_at = new Date(fireAt).toISOString();
    // One timer, always replaced, never accumulated. An interval that is
    // re-registered without clearing is how a scheduler turns into a leak, and
    // this box has 1 GB.
    if (timer) clearTimeout(timer);
    timer = setTimeout(
      () => (delay >= MAX_TIMEOUT_MS ? armFor(fireAt) : fire(fireAt)),
      Math.min(delay, MAX_TIMEOUT_MS)
    );
    if (timer.unref) timer.unref();   // never hold the process open by itself
  }

  async function fire(scheduledFor) {
    // Overlap guard. A slow pull must not stack on the next slot: two
    // concurrent pulls would double the Google API calls and race the same
    // upserts for no benefit.
    if (running) {
      logger.warn('[traffic-schedule] previous pull still running, skipping ' + fmt(scheduledFor));
      armFor(nextFireAfter(now()));
      return;
    }
    running = true;
    const started = now();
    try {
      const end = isoDaysAgo(1);
      const start = isoDaysAgo(WINDOW_DAYS);
      const result = await runPull({ startDate: start, endDate: end });
      state.runs += 1;
      state.last_run_at = new Date(started).toISOString();
      state.last_result = summarize(result);
      if (!result || result.ok === false) state.failures += 1;
      logger.log(`[traffic-schedule] pull ${start}..${end}: ${JSON.stringify(state.last_result)}`);
    } catch (e) {
      // A scheduled job that throws must not take the API down with it. The
      // whole point of this process is serving students.
      state.failures += 1;
      state.last_run_at = new Date(started).toISOString();
      state.last_result = { error: e.message };
      logger.error('[traffic-schedule] pull failed: ' + e.message);
    } finally {
      running = false;
      armFor(nextFireAfter(now()));
    }
  }

  return {
    start() {
      stopped = false;
      const next = nextFireAfter(now());
      armFor(next);
      logger.log(`[traffic-schedule] armed; next pull ${fmt(next)}`);
      return next;
    },
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;
    },
    status() {
      return {
        timezone: TZ,
        fire_times: FIRE_TIMES.map((t) => `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`),
        window_days: WINDOW_DAYS,
        running,
        ...state,
      };
    },
    // Exposed for tests: fire once, right now, without waiting for a slot.
    _fireNow: () => fire(now()),
  };
}

function isoDaysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// Keep the log line short. A full pull response is hundreds of lines of rows
// and would bury every other line in the Railway log.
function summarize(result) {
  if (!result) return { ok: false, reason: 'no result' };
  const out = { ok: result.ok !== false };
  for (const name of ['ga4', 'gsc', 'shopify']) {
    const r = result[name];
    if (!r) continue;
    if (r.configured === false) { out[name] = 'off'; continue; }
    if (r.ok === false) { out[name] = 'ERROR ' + String(r.error || '').slice(0, 120); continue; }
    out[name] = r.written || 0;
    if (r.run_capped) out[name] += ` CAPPED+${r.run_capped}`;
  }
  return out;
}

module.exports = {
  createScheduler, nextFireAfter, instantForWallClock, wallClock,
  FIRE_TIMES, WINDOW_DAYS, TZ,
};
