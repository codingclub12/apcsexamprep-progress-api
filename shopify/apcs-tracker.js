/**
 * APCSExamPrep Progress Tracker v2
 * Add to every lesson, exercise, and quiz page on APCSExamPrep.com
 *
 * Usage: <script src="/cdn/shop/t/[theme]/assets/apcs-tracker.js"></script>
 *
 * Set BEFORE loading this script:
 *   window.APCS_PAGE = {
 *     course:   'ap-cybersecurity',   // ap-cybersecurity | ap-csa | ap-csp
 *     unit:     'unit-1',
 *     lesson:   '1.1',
 *     activity: 'lesson',             // lesson | exercise-1 | exercise-2 | quiz
 *   };
 */

(function() {
  'use strict';

  const API = 'https://apcsexamprep-progress-api-production.up.railway.app';

  // ── SESSION ──────────────────────────────────────────────────────────────────
  function getSession() {
    try {
      const token    = localStorage.getItem('apcse_token');
      const student  = JSON.parse(localStorage.getItem('apcse_student') || 'null');
      if (!token || !student) return null;
      return { token, student };
    } catch(e) { return null; }
  }

  // ── API HELPERS ───────────────────────────────────────────────────────────────
  async function apiPost(endpoint, data) {
    const session = getSession();
    if (!session) return null;
    try {
      const r = await fetch(API + endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session.token,
        },
        body: JSON.stringify(data),
      });
      return await r.json();
    } catch(e) { return null; }
  }

  async function saveProgress(data) {
    return apiPost('/api/student/progress', data);
  }

  async function saveQuizScore(data) {
    return apiPost('/api/student/quiz', data);
  }

  // ── SESSION BAR ───────────────────────────────────────────────────────────────
  function renderSessionBar(session) {
    const bar = document.createElement('div');
    bar.id = 'apcs-session-bar';
    bar.setAttribute('style', [
      'position:fixed !important',
      'bottom:0 !important',
      'left:0 !important',
      'right:0 !important',
      'z-index:9999 !important',
      'background:#1E1B4B !important',
      'color:#fff !important',
      'padding:8px 16px !important',
      'display:flex !important',
      'align-items:center !important',
      'justify-content:space-between !important',
      'font-family:Georgia,serif !important',
      'font-size:13px !important',
      'gap:12px !important',
      'box-shadow:0 -2px 12px rgba(0,0,0,.2) !important',
    ].join(';'));

    bar.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px !important">' +
        '<span style="background:#6B21A8 !important;padding:3px 8px !important;border-radius:4px !important;font-size:11px !important;font-weight:700 !important;letter-spacing:.5px !important;color:#fff !important">CLASS</span>' +
        '<span style="color:#E8A020 !important;font-weight:700 !important;font-family:monospace !important">' + session.student.classCode + '</span>' +
        '<span style="color:#c4b5fd !important">' + session.student.name + '</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:10px !important">' +
        '<a href="/pages/my-progress" style="color:#c4b5fd !important;text-decoration:none !important;font-size:12px !important">My Progress</a>' +
        '<span style="color:#4c1d95 !important">|</span>' +
        '<span id="apcs-bar-status" style="color:#6EE7B7 !important;font-size:12px !important"></span>' +
      '</div>';

    document.body.appendChild(bar);
    document.body.style.paddingBottom = '48px';
    return bar;
  }

  function setBarStatus(msg, color) {
    const el = document.getElementById('apcs-bar-status');
    if (el) {
      el.textContent = msg;
      if (color) el.style.setProperty('color', color, 'important');
    }
  }

  // ── RETRY UI ──────────────────────────────────────────────────────────────────
  /**
   * Call this to show the retry panel after a failed quiz attempt.
   * @param {number} score       - score the student just got (0-100)
   * @param {number} threshold   - class mastery threshold (from API response)
   * @param {Function} onRetry   - callback when student clicks "Try Again"
   */
  function renderRetryPanel(score, threshold, onRetry) {
    // Remove any existing panel
    const existing = document.getElementById('apcs-retry-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'apcs-retry-panel';
    panel.setAttribute('style', [
      'position:fixed !important',
      'top:50% !important',
      'left:50% !important',
      'transform:translate(-50%,-50%) !important',
      'z-index:10000 !important',
      'background:#1E1B4B !important',
      'border:2px solid #6B21A8 !important',
      'border-radius:12px !important',
      'padding:32px 36px !important',
      'text-align:center !important',
      'max-width:380px !important',
      'width:90vw !important',
      'box-shadow:0 8px 40px rgba(0,0,0,.5) !important',
      'font-family:Georgia,serif !important',
    ].join(';'));

    panel.innerHTML =
      '<div style="font-size:36px !important;margin-bottom:8px !important">&#128202;</div>' +
      '<div style="color:#E8A020 !important;font-size:22px !important;font-weight:700 !important;margin-bottom:6px !important">' +
        'Score: ' + score + '%' +
      '</div>' +
      '<div style="color:#c4b5fd !important;font-size:14px !important;margin-bottom:20px !important">' +
        'Mastery requires <strong style="color:#fff !important">' + threshold + '%</strong>. ' +
        'You\'re ' + (threshold - score) + ' points away.' +
      '</div>' +
      '<div style="display:flex !important;gap:12px !important;justify-content:center !important;flex-wrap:wrap !important">' +
        '<button id="apcs-retry-btn" style="' +
          'background:#6B21A8 !important;color:#fff !important;border:none !important;' +
          'padding:10px 22px !important;border-radius:7px !important;font-size:15px !important;' +
          'font-weight:700 !important;cursor:pointer !important;font-family:Georgia,serif !important">' +
          'Try Again' +
        '</button>' +
        '<button id="apcs-retry-dismiss" style="' +
          'background:transparent !important;color:#9CA3AF !important;border:1px solid #4B5563 !important;' +
          'padding:10px 18px !important;border-radius:7px !important;font-size:14px !important;' +
          'cursor:pointer !important;font-family:Georgia,serif !important">' +
          'Review &amp; Come Back' +
        '</button>' +
      '</div>';

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'apcs-retry-backdrop';
    backdrop.setAttribute('style', [
      'position:fixed !important',
      'inset:0 !important',
      'z-index:9999 !important',
      'background:rgba(0,0,0,.6) !important',
    ].join(';'));

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    function close() {
      panel.remove();
      backdrop.remove();
    }

    document.getElementById('apcs-retry-btn').addEventListener('click', function() {
      close();
      if (typeof onRetry === 'function') onRetry();
    });
    document.getElementById('apcs-retry-dismiss').addEventListener('click', close);
    backdrop.addEventListener('click', close);
  }

  // ── PASS PANEL ────────────────────────────────────────────────────────────────
  function renderPassPanel(score, threshold) {
    const existing = document.getElementById('apcs-pass-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'apcs-pass-panel';
    panel.setAttribute('style', [
      'position:fixed !important',
      'top:50% !important',
      'left:50% !important',
      'transform:translate(-50%,-50%) !important',
      'z-index:10000 !important',
      'background:#1E1B4B !important',
      'border:2px solid #0F766E !important',
      'border-radius:12px !important',
      'padding:32px 36px !important',
      'text-align:center !important',
      'max-width:360px !important',
      'width:90vw !important',
      'box-shadow:0 8px 40px rgba(0,0,0,.5) !important',
      'font-family:Georgia,serif !important',
    ].join(';'));

    panel.innerHTML =
      '<div style="font-size:36px !important;margin-bottom:8px !important">&#10003;</div>' +
      '<div style="color:#6EE7B7 !important;font-size:22px !important;font-weight:700 !important;margin-bottom:6px !important">' +
        'Mastery Achieved!' +
      '</div>' +
      '<div style="color:#c4b5fd !important;font-size:14px !important;margin-bottom:20px !important">' +
        'Score: <strong style="color:#fff !important">' + score + '%</strong> &mdash; above the ' + threshold + '% threshold.' +
      '</div>' +
      '<button id="apcs-pass-dismiss" style="' +
        'background:#0F766E !important;color:#fff !important;border:none !important;' +
        'padding:10px 22px !important;border-radius:7px !important;font-size:15px !important;' +
        'font-weight:700 !important;cursor:pointer !important;font-family:Georgia,serif !important">' +
        'Continue' +
      '</button>';

    const backdrop = document.createElement('div');
    backdrop.id = 'apcs-pass-backdrop';
    backdrop.setAttribute('style', [
      'position:fixed !important',
      'inset:0 !important',
      'z-index:9999 !important',
      'background:rgba(0,0,0,.5) !important',
    ].join(';'));

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    function close() { panel.remove(); backdrop.remove(); }
    document.getElementById('apcs-pass-dismiss').addEventListener('click', close);
    backdrop.addEventListener('click', close);
  }

  // ── JOIN PROMPT ───────────────────────────────────────────────────────────────
  function renderJoinPrompt() {
    const prompt = document.createElement('div');
    prompt.setAttribute('style', [
      'position:fixed !important',
      'bottom:0 !important',
      'left:0 !important',
      'right:0 !important',
      'z-index:9998 !important',
      'background:#EDE9FE !important',
      'padding:10px 16px !important',
      'display:flex !important',
      'align-items:center !important',
      'justify-content:center !important',
      'gap:12px !important',
      'font-family:Georgia,serif !important',
      'font-size:13px !important',
      'box-shadow:0 -2px 8px rgba(107,33,168,.1) !important',
    ].join(';'));

    prompt.innerHTML =
      '<span style="color:#4c1d95 !important;font-weight:600 !important">Track your progress with a class code</span>' +
      '<a href="/pages/join" style="background:#6B21A8 !important;color:#fff !important;-webkit-text-fill-color:#fff !important;' +
        'padding:6px 14px !important;border-radius:5px !important;font-size:12px !important;font-weight:700 !important;text-decoration:none !important">' +
        'Join Class</a>' +
      '<button onclick="this.parentElement.remove()" style="background:none !important;border:none !important;' +
        'color:#9CA3AF !important;cursor:pointer !important;font-size:18px !important;padding:0 !important;line-height:1 !important">' +
        '&times;</button>';

    document.body.appendChild(prompt);
  }

  // ── MAIN INIT ─────────────────────────────────────────────────────────────────
  function init() {
    const session  = getSession();
    const pageInfo = window.APCS_PAGE;

    if (!pageInfo) return;
    if (!session) { renderJoinPrompt(); return; }

    renderSessionBar(session);

    // Non-quiz activities: mark visited on page load
    if (pageInfo.activity !== 'quiz') {
      saveProgress({
        course:        pageInfo.course,
        unit:          pageInfo.unit,
        lesson:        pageInfo.lesson,
        activity_type: pageInfo.activity,
        completed:     true,
      }).then(function() {
        setBarStatus('\u2713 Progress saved', '#6EE7B7');
      });
    }

    // ── GLOBAL: quiz pages call this when the quiz completes ──────────────────
    // onRetry (optional): function to reset/restart the quiz UI
    window.APCS_saveQuizScore = async function(score, answers, onRetry) {
      setBarStatus('Saving score\u2026', '#c4b5fd');
      const result = await saveQuizScore({
        course:  pageInfo.course,
        unit:    pageInfo.unit,
        lesson:  pageInfo.lesson,
        score:   score,
        answers: answers || {},
      });

      if (!result || !result.ok) {
        setBarStatus('Error saving score', '#F87171');
        return result;
      }

      const threshold = result.threshold || 80;
      const passed    = result.passed;

      if (passed) {
        setBarStatus('\u2713 Mastery: ' + score + '%', '#6EE7B7');
        renderPassPanel(score, threshold);
      } else {
        setBarStatus('Score: ' + score + '% (need ' + threshold + '%)', '#F87171');
        renderRetryPanel(score, threshold, onRetry);
      }

      return result;
    };

    // ── GLOBAL: expose retry panel directly (e.g. after manual reset) ─────────
    window.APCS_showRetry = function(score, threshold, onRetry) {
      renderRetryPanel(score, threshold, onRetry);
    };

    // ── GLOBAL: confidence rating ─────────────────────────────────────────────
    window.APCS_saveConfidence = function(rating) {
      saveProgress({
        course:        pageInfo.course,
        unit:          pageInfo.unit,
        lesson:        pageInfo.lesson,
        activity_type: pageInfo.activity,
        confidence:    rating,
      });
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
