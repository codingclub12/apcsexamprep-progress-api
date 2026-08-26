/*
 * AP Networking Grade Reporter v2  (ap-networking lesson pages only)
 * Loaded by snippets/apcs-networking-reporter.liquid on ap-networking-lesson-*
 * pages. Self-contained; no dependency on apcs-tracker.js or apcs-reporter.js.
 *
 * WHAT IT DOES
 *   The AP Networking interactive widgets dispatch a bubbling CustomEvent
 *   'apnet:attempt' with detail { item: '1.1-cfu-2', ok: true|false } once per
 *   scenario answered. This reporter accumulates those per-scenario results
 *   into ONE cumulative attempt per completed pass through the widget's
 *   scenario set, then posts it to POST /api/progress/attempt.
 *
 * WHY CUMULATIVE (v1 bug)
 *   v1 posted every scenario as its own 1-point attempt and deduped on
 *   score + '/' + max_score. Because every scenario is worth 1 point, the only
 *   two keys that could ever occur were '1/1' and '0/1', so after a student's
 *   first correct answer every later correct answer was silently dropped. With
 *   retry_allowed = 1 the grade of record is the best ratio, so a single lucky
 *   scenario locked in 100 percent forever and a student who answered one of
 *   five correctly scored the same as one who answered all five. v2 posts
 *   score = correct count and max_score = scenarios in the pass, so the grade
 *   reflects the whole set.
 *
 * PASS DETECTION, in priority order
 *   1. detail.total on the event, if a widget supplies it (preferred contract
 *      for new widgets; none of the current 22 send it yet).
 *   2. The trailing "of N" in the widget's own .apn-case-label element, which
 *      all 22 shipped widgets render ("Scenario 3 of 5", "Round 1 - Protocol
 *      2 of 6: DHCP").
 *   3. Fallback: a quiet-period flush, used only once at least MIN_ANSWERS
 *      scenarios are in hand, so a single answer can never become a 1/1
 *      attempt.
 *
 * SELF-GATING (anonymous SEO traffic is unaffected)
 *   With no [data-course="ap-networking"][data-lesson-id] wrapper on the page,
 *   or no apcse_token in localStorage, it does nothing. course and lesson come
 *   from that wrapper, which every AP Networking lesson page sets.
 *
 * ZERO PII
 *   detail carries a question index, an option index or null, and a boolean.
 *   No student text is ever collected or sent. Pure ASCII, no HTML entities.
 */
(function () {
  'use strict';

  // The API's own name, not the hostname it happens to be deployed on. School
  // content filters routinely block *.up.railway.app as an uncategorised cloud
  // host while apcsexamprep.com and its subdomains are allowed, so a page loads
  // normally and only its reporting dies, silently and with nothing on screen.
  // That is what stopped a whole class reaching /pages/join on 2026-08-24.
  // Six other assets in this directory already use this name.
  var API = 'https://progress.apcsexamprep.com';

  var QUIET_MS = 2500;    // fallback flush delay when the set size is unknown
  var MIN_ANSWERS = 3;    // never post a fallback attempt smaller than this
  var MAX_DETAIL = 100;   // hard cap on the detail array, bounded memory

  function getToken() {
    try { return localStorage.getItem('apcse_token') || null; } catch (e) { return null; }
  }

  function getContext() {
    var w = document.querySelector('[data-course="ap-networking"][data-lesson-id]');
    if (!w) return null;
    var course = w.getAttribute('data-course');
    var lesson = w.getAttribute('data-lesson-id');
    return (course && lesson) ? { course: course, lesson: lesson } : null;
  }

  function sanitizeDetail(detail) {
    if (!Array.isArray(detail)) return null;
    var out = [];
    for (var i = 0; i < detail.length && i < MAX_DETAIL; i++) {
      var d = detail[i] || {};
      out.push({
        q: (typeof d.q === 'number' && isFinite(d.q)) ? Math.floor(d.q) : i + 1,
        sel: (typeof d.sel === 'number' && isFinite(d.sel)) ? Math.floor(d.sel) : null,
        ok: !!d.ok
      });
    }
    return out;
  }

  function postAttempt(payload, opts) {
    opts = opts || {};
    var token = getToken();
    var ctx = getContext();
    if (!token || !ctx) return;

    var itemId = String(payload.item_id || '');
    var itemType = payload.item_type === 'quiz' ? 'quiz' : 'cfu';
    var score = Number(payload.score);
    var maxScore = Number(payload.max_score);
    if (!itemId || !isFinite(score) || !isFinite(maxScore) || maxScore <= 0) return;
    if (score < 0) score = 0;
    if (score > maxScore) score = maxScore;

    var body = {
      course: ctx.course,
      lesson_id: String(payload.lesson_id || ctx.lesson),
      item_id: itemId,
      item_type: itemType,
      score: score,
      max_score: maxScore
    };
    var detail = sanitizeDetail(payload.detail);
    if (detail) body.detail = detail;
    var dur = Number(payload.duration_seconds);
    if (isFinite(dur) && dur >= 0) body.duration_seconds = Math.min(Math.floor(dur), 86400);

    var nativeFetch = window.__nativeFetch || fetch;
    var init = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(body)
    };
    if (opts.keepalive) init.keepalive = true;

    nativeFetch(API + '/api/progress/attempt', init).then(function (r) {
      if (r.ok) {
        return r.json().then(function (d) {
          document.dispatchEvent(new CustomEvent('apnet:attempt-recorded', { detail: d }));
        });
      }
      // 4xx means the payload is wrong (unknown item, manifest drift, rate
      // limit). Do not retry; surface for the pilot.
      return r.json().then(function (d) {
        if (window.console) console.warn('[apnet-reporter] rejected:', r.status, d && d.error, itemId);
      }).catch(function () {});
    }).catch(function () {
      if (!opts.isRetry && !opts.keepalive) {
        setTimeout(function () { postAttempt(payload, { isRetry: true }); }, 4000);
      }
    });
  }

  // ---- cumulative pass accumulation -------------------------------------
  // One entry per item_id currently in progress. A page carries at most a
  // couple of gradeable widgets, and every entry is deleted on flush, so this
  // map cannot grow with time on page.
  var passes = {};

  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

  // Read the scenario-set size from the widget's own label, e.g. "Scenario 3
  // of 5" or "Round 1 - Protocol 2 of 6: DHCP". Returns null when absent.
  function readTotal(root) {
    if (!root || !root.querySelector) return null;
    var el = root.querySelector('.apn-case-label');
    if (!el) return null;
    var m = /\bof\s+(\d+)\b/.exec(el.textContent || '');
    if (!m) return null;
    var n = parseInt(m[1], 10);
    return (isFinite(n) && n > 0 && n <= MAX_DETAIL) ? n : null;
  }

  function flush(itemId) {
    var p = passes[itemId];
    if (!p) return;
    delete passes[itemId];               // delete first: a second call is a no-op
    if (p.timer) { clearTimeout(p.timer); p.timer = null; }
    if (!p.detail.length) return;
    postAttempt({
      item_id: itemId,
      item_type: p.itemType,
      score: p.correct,
      max_score: p.detail.length,
      detail: p.detail,
      duration_seconds: Math.round((now() - p.startedAt) / 1000)
    }, { keepalive: !!p.keepalive });
  }

  function flushAll(keepalive) {
    Object.keys(passes).forEach(function (id) {
      var p = passes[id];
      if (!p) return;
      if (p.detail.length < MIN_ANSWERS) { delete passes[id]; return; }
      p.keepalive = !!keepalive;
      flush(id);
    });
  }

  document.addEventListener('apnet:attempt', function (ev) {
    var d = ev.detail || {};
    if (!d.item) return;
    var itemId = String(d.item);
    var isQuiz = itemId.indexOf('-quiz') > -1;

    var p = passes[itemId];
    if (!p) {
      p = passes[itemId] = {
        correct: 0, detail: [], startedAt: now(), timer: null,
        itemType: isQuiz ? 'quiz' : 'cfu', total: null, keepalive: false
      };
    }

    // Set size: explicit from the widget if offered, otherwise read from its
    // label once and keep the first reading for the whole pass.
    if (p.total === null) {
      var explicit = Number(d.total);
      p.total = (isFinite(explicit) && explicit > 0 && explicit <= MAX_DETAIL)
        ? Math.floor(explicit)
        : readTotal(ev.target);
    }

    if (p.detail.length < MAX_DETAIL) {
      p.detail.push({
        q: p.detail.length + 1,
        sel: (typeof d.sel === 'number' && isFinite(d.sel)) ? Math.floor(d.sel) : null,
        ok: !!d.ok
      });
      if (d.ok) p.correct++;
    }

    if (p.timer) { clearTimeout(p.timer); p.timer = null; }

    if (p.total && p.detail.length >= p.total) {
      flush(itemId);                       // completed pass, post it now
      return;
    }
    // Unknown set size, or the student stopped partway: post after a quiet
    // period, but only once the sample is big enough to mean something. A
    // sample that never gets there is discarded rather than left in place, so
    // an abandoned pair of answers can never merge into the student's next
    // pass and be graded as one run.
    p.timer = setTimeout(function () {
      var cur = passes[itemId];
      if (!cur) return;
      if (cur.detail.length >= MIN_ANSWERS) flush(itemId);
      else delete passes[itemId];
    }, QUIET_MS);
  });

  // A student who leaves mid-pass still gets credit for what they finished.
  window.addEventListener('pagehide', function () { flushAll(true); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flushAll(true);
  });

  // Public API for the full-quiz UI or a custom widget. This path already
  // carries a complete score, so it bypasses accumulation entirely.
  window.APNET_reportAttempt = function (payload) { postAttempt(payload || {}); };
})();
