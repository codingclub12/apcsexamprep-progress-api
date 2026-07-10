/**
 * APCSExamPrep Attempt Reporter v1  (ap-csa only)
 * Drop on ap-csa lesson pages AFTER the page's own widget scripts. This reporter
 * is bound to the CSA apcs-ex widget system (.apcs-ex / .apcsa-mastery) and the
 * manifest-gated POST /api/progress/attempt path. CSP and Cyber report graded
 * items through POST /api/student/score with their own reporters instead (see
 * the "Graded reporting: which endpoint per course" table in README.md); do not
 * drop this file on CSP pages.
 * Companion to apcs-tracker.js (which owns visits and the legacy quiz flow);
 * this file owns attempt-level grade reporting to POST /api/progress/attempt.
 *
 * WHAT IT REPORTS, AUTOMATICALLY (no page JS changes needed):
 *   1. CFU widgets: any .apcs-ex with a data-item-id attribute (e.g.
 *      "1.2-cfu-3"). When the student clicks its check button and the page's
 *      own handler grades it (feedback shows fb-correct / fb-incorrect), one
 *      attempt is posted: score 1 or 0 out of 1.
 *   2. Mastery challenge: a .apcsa-mastery section with a data-item-id
 *      (e.g. "1.2-quiz"). When ALL of its .apcs-ex questions have been
 *      checked, one attempt is posted: score = questions correct.
 *   Widgets WITHOUT data-item-id are ignored on purpose. The attributes ship
 *   via Matrixify and must match course_manifest, or the API rejects with 400.
 *
 * WHAT OTHER WIDGETS CALL (code editors, future custom exercises):
 *   window.APCS_reportAttempt({
 *     item_id: '1.2-code-1',        // required, must exist in course_manifest
 *     item_type: 'cfu',             // 'cfu' | 'quiz'
 *     score: 1, max_score: 1,       // for code: test cases passed / total
 *     detail: [{q:1, sel:null, ok:true}],   // indices + booleans ONLY
 *     duration_seconds: 90,         // optional
 *   })
 *   or dispatch the same object as
 *   document.dispatchEvent(new CustomEvent('apcs:item-graded', {detail: ...}))
 *   Judge0 code editors: compare stdout to the exercise's expected output in
 *   the editor's own script, then call APCS_reportAttempt ONCE on the first
 *   passing run. NEVER put source code, stdout, or any free text in detail;
 *   test-case pass booleans only.
 *
 * PAGE CONTEXT: course and lesson come from window.APCS_PAGE (set for
 *   apcs-tracker.js) when present, else from the wrapper's data-course /
 *   data-lesson-id attributes, else parsed from the page URL handle.
 * SESSION: same localStorage token apcs-tracker.js uses. No token, no posts.
 */

(function() {
  'use strict';

  var API = 'https://apcsexamprep-progress-api-production.up.railway.app';
  var PAGE_LOADED_AT = Date.now();

  // ── SESSION (same storage as apcs-tracker.js) ───────────────────────────────
  function getToken() {
    try { return localStorage.getItem('apcse_token') || null; } catch (e) { return null; }
  }

  // ── PAGE CONTEXT ─────────────────────────────────────────────────────────────
  function getPageContext() {
    var course = null, lesson = null;

    if (window.APCS_PAGE && window.APCS_PAGE.course) {
      course = window.APCS_PAGE.course;
      lesson = window.APCS_PAGE.lesson || null;
    }

    var wrap = document.querySelector('[data-course][data-lesson-id]') ||
               document.getElementById('apcsa-lesson') ||
               document.querySelector('[data-lesson-id]');
    if (wrap) {
      if (!course) course = wrap.getAttribute('data-course');
      if (!lesson) lesson = wrap.getAttribute('data-lesson-id');
    }

    if (!course) {
      var path = String(location.pathname);
      if (path.indexOf('ap-csa-') !== -1) course = 'ap-csa';
      else if (path.indexOf('ap-csp-') !== -1) course = 'ap-csp';
    }
    if (!lesson && course === 'ap-csa') {
      var m = String(location.pathname).match(/ap-csa-lesson-(\d+)-(\d+)-/);
      if (m) lesson = m[1] + '.' + m[2];
    }

    return (course && lesson) ? { course: course, lesson: lesson } : null;
  }

  // ── POST (dedupes per item per result, single network retry) ─────────────────
  var lastSent = {};   // item_id -> 'score/max' last successfully queued; page-scoped, bounded by page item count

  function setBarStatus(msg, color) {
    var el = document.getElementById('apcs-bar-status');
    if (el) { el.textContent = msg; if (color) el.style.setProperty('color', color, 'important'); }
  }

  function sanitizeDetail(detail) {
    if (!Array.isArray(detail)) return null;
    var out = [];
    for (var i = 0; i < detail.length && i < 100; i++) {
      var d = detail[i] || {};
      out.push({
        q: (typeof d.q === 'number' && isFinite(d.q)) ? Math.floor(d.q) : i + 1,
        sel: (typeof d.sel === 'number' && isFinite(d.sel)) ? Math.floor(d.sel) : null,
        ok: !!d.ok,
      });
    }
    return out;
  }

  function postAttempt(payload, isRetry) {
    var token = getToken();
    var ctx = getPageContext();
    if (!token || !ctx) return;

    var itemId = String(payload.item_id || '');
    var itemType = payload.item_type === 'quiz' ? 'quiz' : 'cfu';
    var score = Number(payload.score);
    var maxScore = Number(payload.max_score);
    if (!itemId || !isFinite(score) || !isFinite(maxScore) || maxScore <= 0) return;

    var resultKey = score + '/' + maxScore;
    if (!isRetry && lastSent[itemId] === resultKey) return;   // same result already reported
    lastSent[itemId] = resultKey;

    var body = {
      course: ctx.course,
      lesson_id: String(payload.lesson_id || ctx.lesson),
      item_id: itemId,
      item_type: itemType,
      score: score,
      max_score: maxScore,
    };
    var detail = sanitizeDetail(payload.detail);
    if (detail) body.detail = detail;
    var dur = Number(payload.duration_seconds);
    if (isFinite(dur) && dur >= 0) body.duration_seconds = Math.min(Math.floor(dur), 86400);

    var nativeFetch = window.__nativeFetch || fetch;
    nativeFetch(API + '/api/progress/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(body),
    }).then(function(r) {
      if (r.ok) return r.json().then(function(d) {
        setBarStatus('✓ Saved: ' + score + '/' + maxScore, '#6EE7B7');
        document.dispatchEvent(new CustomEvent('apcs:attempt-recorded', { detail: d }));
      });
      // 4xx means the payload is wrong (unknown item, manifest drift, rate
      // limit). Do not retry; surface for the pilot.
      return r.json().then(function(d) {
        console.warn('[apcs-reporter] rejected:', r.status, d && d.error, itemId);
      }).catch(function() {});
    }).catch(function() {
      if (!isRetry) setTimeout(function() { postAttempt(payload, true); }, 4000);
    });
  }

  // Public API for code editors and custom widgets.
  window.APCS_reportAttempt = function(payload) { postAttempt(payload || {}); };
  document.addEventListener('apcs:item-graded', function(ev) { postAttempt(ev.detail || {}); });

  // ── CFU + MASTERY ADAPTER for the apcs-ex widget system ─────────────────────
  // The page's own scripts do the grading; this only observes the outcome.
  // A graded widget shows .apcs-ex-feedback.show with fb-correct or
  // fb-incorrect (uniform across mcq, matching, scenario-sort, cloze).

  function widgetResult(ex) {
    var fb = ex.querySelector('.apcs-ex-feedback');
    if (!fb || !fb.classList.contains('show')) return null;
    if (fb.classList.contains('fb-correct')) return { ok: true, sel: optIndex(ex, 'correct') };
    if (fb.classList.contains('fb-incorrect')) return { ok: false, sel: optIndex(ex, 'incorrect') };
    return null;
  }

  function optIndex(ex, cls) {
    var opts = ex.querySelectorAll('.apcs-opt');
    for (var i = 0; i < opts.length; i++) if (opts[i].classList.contains(cls)) return i;
    return null;
  }

  var firstTouch = {};  // item_id -> ms timestamp of first interaction

  function touchKey(el) {
    var owner = el.closest('.apcsa-mastery[data-item-id], .apcs-ex[data-item-id]');
    if (!owner) return;
    var key = owner.getAttribute('data-item-id');
    if (key && !firstTouch[key]) firstTouch[key] = Date.now();
  }

  function durationFor(itemId) {
    var start = firstTouch[itemId] || PAGE_LOADED_AT;
    return Math.round((Date.now() - start) / 1000);
  }

  function reportCfu(ex) {
    var itemId = ex.getAttribute('data-item-id');
    if (!itemId || ex.dataset.apcsReported) return;
    var res = widgetResult(ex);
    if (!res) return;   // page handler has not graded it (e.g. nothing selected)
    ex.dataset.apcsReported = '1';
    postAttempt({
      item_id: itemId,
      item_type: 'cfu',
      score: res.ok ? 1 : 0,
      max_score: 1,
      detail: [{ q: 1, sel: res.sel, ok: res.ok }],
      duration_seconds: durationFor(itemId),
    });
  }

  function reportMastery(section) {
    var itemId = section.getAttribute('data-item-id');
    if (!itemId) return;
    var exs = section.querySelectorAll('.apcs-ex');
    if (!exs.length) return;
    var detail = [];
    for (var i = 0; i < exs.length; i++) {
      var res = widgetResult(exs[i]);
      if (!res) return;   // not all questions checked yet
      detail.push({ q: i + 1, sel: res.sel, ok: res.ok });
    }
    var score = 0;
    for (var j = 0; j < detail.length; j++) if (detail[j].ok) score++;
    var resultKey = itemId + ':' + score;
    if (section.dataset.apcsReported === resultKey) return;
    section.dataset.apcsReported = resultKey;
    postAttempt({
      item_id: itemId,
      item_type: 'quiz',
      score: score,
      max_score: detail.length,
      detail: detail,
      duration_seconds: durationFor(itemId),
    });
  }

  function onCheckClick(ev) {
    var btn = ev.target.closest('.apcs-ex-check');
    if (!btn) return;
    var ex = btn.closest('.apcs-ex');
    if (!ex) return;
    // Let the page's own grading handler run first, then observe the outcome.
    setTimeout(function() {
      var mastery = ex.closest('.apcsa-mastery');
      if (mastery) reportMastery(mastery);
      else reportCfu(ex);
    }, 0);
  }

  function init() {
    if (!getPageContext()) return;   // not a lesson page this script understands
    document.addEventListener('click', function(ev) {
      if (ev.target.closest('.apcs-ex, .apcsa-mastery')) touchKey(ev.target);
      onCheckClick(ev);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
