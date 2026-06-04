/**
 * APCSExamPrep Progress Tracker v3
 * Drop on every lesson, exercise, and quiz page.
 *
 * Before loading, set:
 *   window.APCS_PAGE = {
 *     course:   'ap-cybersecurity',
 *     unit:     'unit-1',
 *     lesson:   '1.1',
 *     activity: 'lesson',   // lesson | exercise-1 | exercise-2 | quiz
 *   };
 *
 * Quiz pages additionally call:
 *   APCS_saveQuizScore(score, answers, onRetry)  — after each attempt
 *   APCS_finalizeQuiz()                          — when student hits Submit Final Grade
 *
 * Hub pages call:
 *   APCS_renderHubProgress(lessonMap)
 *   lessonMap = { '1.1': { lesson:'/pages/1-1-lesson', quiz:'/pages/1-1-quiz', ... }, ... }
 */

(function() {
  'use strict';

  const API = 'https://apcsexamprep-progress-api-production.up.railway.app';

  // ── SESSION ──────────────────────────────────────────────────────────────────
  function getSession() {
    try {
      const token   = localStorage.getItem('apcse_token');
      const student = JSON.parse(localStorage.getItem('apcse_student') || 'null');
      if (!token || !student) return null;
      return { token, student };
    } catch(e) { return null; }
  }

  // ── API HELPERS ───────────────────────────────────────────────────────────────
  // window.__nativeFetch is captured in quiz-tracker-wiring.liquid BEFORE
  // Appointo/ad scripts patch window.fetch. This is the only reliable way
  // to make requests without scrlybrkr injection.

  function apiCall(method, endpoint, data, token) {
    return new Promise(function(resolve) {
      try {
        // Use pre-captured native fetch; fall back to current window.fetch
        var nativeFetch = window.__nativeFetch || fetch;
        var opts = {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
          },
        };
        if (data) opts.body = JSON.stringify(data);
        nativeFetch(API + endpoint, opts)
          .then(function(r) { return r.json(); })
          .then(function(d) { resolve(d); })
          .catch(function() { resolve(null); });
      } catch(e) { resolve(null); }
    });
  }

  async function apiPost(endpoint, data) {
    const session = getSession();
    if (!session) return null;
    return apiCall('POST', endpoint, data, session.token);
  }

  async function apiGet(endpoint) {
    const session = getSession();
    if (!session) return null;
    return apiCall('GET', endpoint, null, session.token);
  }

  // ── SESSION BAR ───────────────────────────────────────────────────────────────
  function renderSessionBar(session) {
    const bar = document.createElement('div');
    bar.id = 'apcs-session-bar';
    bar.setAttribute('style', [
      'position:fixed !important', 'bottom:0 !important', 'left:0 !important',
      'right:0 !important', 'z-index:9999 !important',
      'background:#1E1B4B !important', 'color:#fff !important',
      'padding:8px 16px !important', 'display:flex !important',
      'align-items:center !important', 'justify-content:space-between !important',
      'font-family:Georgia,serif !important', 'font-size:13px !important',
      'gap:12px !important', 'box-shadow:0 -2px 12px rgba(0,0,0,.2) !important',
    ].join(';'));

    bar.innerHTML =
      '<div style="display:flex !important;align-items:center !important;gap:10px !important">' +
        '<span style="background:#6B21A8 !important;padding:3px 8px !important;border-radius:4px !important;' +
          'font-size:11px !important;font-weight:700 !important;letter-spacing:.5px !important;color:#fff !important;' +
          '-webkit-text-fill-color:#fff !important">CLASS</span>' +
        '<span style="color:#E8A020 !important;-webkit-text-fill-color:#E8A020 !important;font-weight:700 !important;font-family:monospace !important">' +
          session.student.classCode + '</span>' +
        '<span style="color:#c4b5fd !important;-webkit-text-fill-color:#c4b5fd !important">' + session.student.name + '</span>' +
      '</div>' +
      '<div style="display:flex !important;align-items:center !important;gap:10px !important">' +
        '<span id="apcs-bar-unit-progress" style="color:#E8A020 !important;-webkit-text-fill-color:#E8A020 !important;font-size:12px !important"></span>' +
        '<span style="color:#4c1d95 !important">|</span>' +
        '<a href="/pages/my-progress" style="color:#c4b5fd !important;-webkit-text-fill-color:#c4b5fd !important;' +
          'text-decoration:none !important;font-size:12px !important">My Progress</a>' +
        '<span style="color:#4c1d95 !important">|</span>' +
        '<span id="apcs-bar-status" style="color:#6EE7B7 !important;-webkit-text-fill-color:#6EE7B7 !important;font-size:12px !important"></span>' +
      '</div>';

    document.body.appendChild(bar);
    document.body.style.paddingBottom = '48px';
    return bar;
  }

  function setBarStatus(msg, color) {
    const el = document.getElementById('apcs-bar-status');
    if (el) { el.textContent = msg; if (color) el.style.setProperty('color', color, 'important'); }
  }

  function setBarUnitProgress(completed, total) {
    const el = document.getElementById('apcs-bar-unit-progress');
    if (el) el.textContent = completed + '/' + total + ' complete';
  }

  // ── LOAD UNIT PROGRESS FOR BAR ────────────────────────────────────────────────
  async function loadUnitProgress(pageInfo) {
    const data = await apiGet('/api/student/progress');
    if (!data || !data.progress) return;
    const unitRecords = data.progress.filter(function(r) {
      return r.course === pageInfo.course && r.unit === pageInfo.unit && r.completed;
    });
    // Count unique lesson+activity pairs that are completed
    const completed = unitRecords.length;
    // Total is defined by how many records exist at all for this unit (complete or not)
    const total = data.progress.filter(function(r) {
      return r.course === pageInfo.course && r.unit === pageInfo.unit;
    }).length;
    if (total > 0) setBarUnitProgress(completed, total);
  }

  // ── MODALS ────────────────────────────────────────────────────────────────────
  function makeBackdrop(id, zIndex, onClick) {
    const bd = document.createElement('div');
    bd.id = id;
    bd.setAttribute('style', [
      'position:fixed !important', 'inset:0 !important',
      'z-index:' + zIndex + ' !important', 'background:rgba(0,0,0,.6) !important',
    ].join(';'));
    if (onClick) bd.addEventListener('click', onClick);
    document.body.appendChild(bd);
    return bd;
  }

  function makeModal(id) {
    const m = document.createElement('div');
    m.id = id;
    m.setAttribute('style', [
      'position:fixed !important', 'top:50% !important', 'left:50% !important',
      'transform:translate(-50%,-50%) !important', 'z-index:10001 !important',
      'background:#1E1B4B !important', 'border-radius:12px !important',
      'padding:32px 36px !important', 'max-width:400px !important',
      'width:90vw !important', 'box-shadow:0 8px 40px rgba(0,0,0,.5) !important',
      'font-family:Georgia,serif !important', 'text-align:center !important',
    ].join(';'));
    document.body.appendChild(m);
    return m;
  }

  function removeModal(backdropId, modalId) {
    const bd = document.getElementById(backdropId);
    const m  = document.getElementById(modalId);
    if (bd) bd.remove();
    if (m) m.remove();
  }

  // ── RETRY PANEL ───────────────────────────────────────────────────────────────
  function renderRetryPanel(score, threshold, retryAllowed, onRetry) {
    removeModal('apcs-retry-bd', 'apcs-retry-modal');
    const close = function() { removeModal('apcs-retry-bd', 'apcs-retry-modal'); };
    makeBackdrop('apcs-retry-bd', 10000, close);
    const m = makeModal('apcs-retry-modal');
    m.setAttribute('style', m.getAttribute('style') + ';border:2px solid #6B21A8 !important');

    const gap = threshold - score;
    m.innerHTML =
      '<div style="font-size:36px !important;margin-bottom:8px !important">&#128202;</div>' +
      '<div style="color:#E8A020 !important;-webkit-text-fill-color:#E8A020 !important;font-size:22px !important;font-weight:700 !important;margin-bottom:6px !important">' +
        'Score: ' + score + '%' +
      '</div>' +
      '<div style="color:#c4b5fd !important;-webkit-text-fill-color:#c4b5fd !important;font-size:14px !important;margin-bottom:24px !important">' +
        'Mastery requires <strong style="color:#fff !important;-webkit-text-fill-color:#fff !important">' + threshold + '%</strong>.' +
        (gap > 0 ? ' You are ' + gap + ' points away.' : '') +
      '</div>' +
      '<div style="display:flex !important;gap:10px !important;justify-content:center !important;flex-wrap:wrap !important">' +
        (retryAllowed
          ? '<button id="apcs-do-retry" style="background:#6B21A8 !important;color:#fff !important;-webkit-text-fill-color:#fff !important;' +
              'border:none !important;padding:10px 22px !important;border-radius:7px !important;font-size:15px !important;' +
              'font-weight:700 !important;cursor:pointer !important;font-family:Georgia,serif !important">Try Again</button>'
          : '<div style="color:#F87171 !important;-webkit-text-fill-color:#F87171 !important;font-size:13px !important;padding:8px 0 !important">' +
              'Retries are not allowed for this class.</div>'
        ) +
        '<button id="apcs-do-finalize-from-retry" style="background:#0F766E !important;color:#fff !important;-webkit-text-fill-color:#fff !important;' +
          'border:none !important;padding:10px 18px !important;border-radius:7px !important;font-size:14px !important;' +
          'font-weight:700 !important;cursor:pointer !important;font-family:Georgia,serif !important">Submit Final Grade</button>' +
        '<button id="apcs-retry-dismiss" style="background:transparent !important;color:#9CA3AF !important;-webkit-text-fill-color:#9CA3AF !important;' +
          'border:1px solid #4B5563 !important;padding:10px 16px !important;border-radius:7px !important;font-size:13px !important;' +
          'cursor:pointer !important;font-family:Georgia,serif !important">Review &amp; Come Back</button>' +
      '</div>';

    if (retryAllowed) {
      document.getElementById('apcs-do-retry').addEventListener('click', function() {
        close();
        if (typeof onRetry === 'function') onRetry();
      });
    }
    document.getElementById('apcs-do-finalize-from-retry').addEventListener('click', function() {
      close();
      window.APCS_finalizeQuiz();
    });
    document.getElementById('apcs-retry-dismiss').addEventListener('click', close);
  }

  // ── PASS PANEL ────────────────────────────────────────────────────────────────
  function renderPassPanel(score, threshold, onRetry, retryAllowed) {
    removeModal('apcs-pass-bd', 'apcs-pass-modal');
    const close = function() { removeModal('apcs-pass-bd', 'apcs-pass-modal'); };
    makeBackdrop('apcs-pass-bd', 10000, close);
    const m = makeModal('apcs-pass-modal');
    m.setAttribute('style', m.getAttribute('style') + ';border:2px solid #0F766E !important');

    m.innerHTML =
      '<div style="font-size:36px !important;margin-bottom:8px !important">&#10003;</div>' +
      '<div style="color:#6EE7B7 !important;-webkit-text-fill-color:#6EE7B7 !important;font-size:22px !important;font-weight:700 !important;margin-bottom:6px !important">' +
        'Mastery Achieved!' +
      '</div>' +
      '<div style="color:#c4b5fd !important;-webkit-text-fill-color:#c4b5fd !important;font-size:14px !important;margin-bottom:24px !important">' +
        'Score: <strong style="color:#fff !important;-webkit-text-fill-color:#fff !important">' + score + '%</strong>' +
        ' &mdash; above the ' + threshold + '% threshold.' +
      '</div>' +
      '<div style="display:flex !important;gap:10px !important;justify-content:center !important;flex-wrap:wrap !important">' +
        '<button id="apcs-do-finalize-pass" style="background:#0F766E !important;color:#fff !important;-webkit-text-fill-color:#fff !important;' +
          'border:none !important;padding:10px 22px !important;border-radius:7px !important;font-size:15px !important;' +
          'font-weight:700 !important;cursor:pointer !important;font-family:Georgia,serif !important">Submit Final Grade</button>' +
        (retryAllowed
          ? '<button id="apcs-do-retry-from-pass" style="background:transparent !important;color:#c4b5fd !important;-webkit-text-fill-color:#c4b5fd !important;' +
              'border:1px solid #6B21A8 !important;padding:10px 16px !important;border-radius:7px !important;font-size:13px !important;' +
              'cursor:pointer !important;font-family:Georgia,serif !important">Try to Improve Score</button>'
          : ''
        ) +
      '</div>';

    document.getElementById('apcs-do-finalize-pass').addEventListener('click', function() {
      close();
      window.APCS_finalizeQuiz();
    });
    if (retryAllowed) {
      document.getElementById('apcs-do-retry-from-pass').addEventListener('click', function() {
        close();
        if (typeof onRetry === 'function') onRetry();
      });
    }
  }

  // ── LOCKED PANEL ─────────────────────────────────────────────────────────────
  function renderLockedPanel(score) {
    removeModal('apcs-locked-bd', 'apcs-locked-modal');
    const close = function() { removeModal('apcs-locked-bd', 'apcs-locked-modal'); };
    makeBackdrop('apcs-locked-bd', 10000, close);
    const m = makeModal('apcs-locked-modal');
    m.setAttribute('style', m.getAttribute('style') + ';border:2px solid #E8A020 !important');

    m.innerHTML =
      '<div style="font-size:36px !important;margin-bottom:8px !important">&#128274;</div>' +
      '<div style="color:#E8A020 !important;-webkit-text-fill-color:#E8A020 !important;font-size:20px !important;font-weight:700 !important;margin-bottom:6px !important">' +
        'Final Grade Submitted' +
      '</div>' +
      '<div style="color:#c4b5fd !important;-webkit-text-fill-color:#c4b5fd !important;font-size:14px !important;margin-bottom:24px !important">' +
        'Your final score of <strong style="color:#fff !important;-webkit-text-fill-color:#fff !important">' + (score !== null && score !== undefined ? score + '%' : 'N/A') + '</strong> has been recorded.' +
        '<br>Contact your teacher to unlock this quiz.' +
      '</div>' +
      '<button id="apcs-locked-close" style="background:#6B21A8 !important;color:#fff !important;-webkit-text-fill-color:#fff !important;' +
        'border:none !important;padding:10px 22px !important;border-radius:7px !important;font-size:15px !important;' +
        'font-weight:700 !important;cursor:pointer !important;font-family:Georgia,serif !important">OK</button>';

    document.getElementById('apcs-locked-close').addEventListener('click', close);
  }

  // ── JOIN PROMPT ───────────────────────────────────────────────────────────────
  function renderJoinPrompt() {
    const prompt = document.createElement('div');
    prompt.setAttribute('style', [
      'position:fixed !important', 'bottom:0 !important', 'left:0 !important',
      'right:0 !important', 'z-index:9998 !important',
      'background:#EDE9FE !important', 'padding:10px 16px !important',
      'display:flex !important', 'align-items:center !important',
      'justify-content:center !important', 'gap:12px !important',
      'font-family:Georgia,serif !important', 'font-size:13px !important',
      'box-shadow:0 -2px 8px rgba(107,33,168,.1) !important',
    ].join(';'));
    prompt.innerHTML =
      '<span style="color:#4c1d95 !important;-webkit-text-fill-color:#4c1d95 !important;font-weight:600 !important">Track your progress with a class code</span>' +
      '<a href="/pages/join" style="background:#6B21A8 !important;color:#fff !important;-webkit-text-fill-color:#fff !important;' +
        'padding:6px 14px !important;border-radius:5px !important;font-size:12px !important;font-weight:700 !important;text-decoration:none !important">Join Class</a>' +
      '<button onclick="this.parentElement.remove()" style="background:none !important;border:none !important;' +
        'color:#9CA3AF !important;cursor:pointer !important;font-size:18px !important;padding:0 !important">&#215;</button>';
    document.body.appendChild(prompt);
  }

  // ── HUB PROGRESS RINGS ────────────────────────────────────────────────────────
  /**
   * Call on hub pages to decorate lesson cards with live progress.
   * @param {Object} lessonMap  e.g. { '1.1': { el: DOMElement, activities: ['lesson','exercise-1','exercise-2','quiz'] } }
   *   OR pass a CSS selector string and we'll find cards by data-lesson-id attribute.
   */
  window.APCS_renderHubProgress = async function(pageInfo) {
    const session = getSession();
    if (!session) return;

    const data = await apiGet('/api/student/progress');
    if (!data || !data.progress) return;

    // Build a lookup: "course|unit|lesson|activity" → record
    const lookup = {};
    for (const r of data.progress) {
      lookup[r.course + '|' + r.unit + '|' + r.lesson + '|' + r.activity_type] = r;
    }

    // Find all lesson cards on this hub page (they must have data-lesson-id attribute)
    const cards = document.querySelectorAll('[data-lesson-id]');
    cards.forEach(function(card) {
      const lessonId  = card.getAttribute('data-lesson-id');
      const unitId    = card.getAttribute('data-unit-id') || pageInfo.unit;
      const courseId  = card.getAttribute('data-course-id') || pageInfo.course;
      const activities = (card.getAttribute('data-activities') || 'lesson,exercise-1,exercise-2,quiz').split(',');

      let completed = 0;
      let hasLocked = false;
      for (const act of activities) {
        const rec = lookup[courseId + '|' + unitId + '|' + lessonId + '|' + act];
        if (rec && rec.completed) completed++;
        if (rec && rec.locked) hasLocked = true;
      }
      const total = activities.length;
      const pct   = Math.round(completed / total * 100);

      // Inject progress badge into card
      var existing = card.querySelector('.apcs-progress-badge');
      if (existing) existing.remove();

      const badge = document.createElement('div');
      badge.className = 'apcs-progress-badge';
      const color = pct === 100 ? '#6EE7B7' : pct > 0 ? '#E8A020' : '#6B7280';
      badge.setAttribute('style', [
        'display:inline-flex !important', 'align-items:center !important', 'gap:6px !important',
        'margin-top:6px !important', 'font-size:11px !important', 'font-weight:700 !important',
        'font-family:Georgia,serif !important',
        'color:' + color + ' !important', '-webkit-text-fill-color:' + color + ' !important',
      ].join(';'));

      const icon = pct === 100 ? (hasLocked ? '&#128274;' : '&#10003;') : pct > 0 ? '&#9654;' : '&#9675;';
      badge.innerHTML = icon + ' ' + completed + '/' + total +
        (pct === 100 ? ' Complete' : pct > 0 ? ' In Progress' : ' Not Started');

      card.appendChild(badge);
    });
  };

  // ── MAIN INIT ─────────────────────────────────────────────────────────────────
  function init() {
    const session  = getSession();
    const pageInfo = window.APCS_PAGE;

    if (!pageInfo) return;
    if (!session) { renderJoinPrompt(); return; }

    renderSessionBar(session);

    // ── NON-QUIZ PAGES ────────────────────────────────────────────────────────
    if (pageInfo.activity !== 'quiz') {
      apiPost('/api/student/progress', {
        course: pageInfo.course, unit: pageInfo.unit,
        lesson: pageInfo.lesson, activity_type: pageInfo.activity,
        completed: true,
      }).then(function() {
        setBarStatus('\u2713 Progress saved', '#6EE7B7');
        loadUnitProgress(pageInfo);
      });
    } else {
      // ── QUIZ PAGE INIT ──────────────────────────────────────────────────────
      // Check lock/retry status before doing anything
      apiGet('/api/student/quiz/status?course=' + encodeURIComponent(pageInfo.course) +
             '&unit=' + encodeURIComponent(pageInfo.unit) +
             '&lesson=' + encodeURIComponent(pageInfo.lesson)
      ).then(function(status) {
        if (!status) return;

        window._APCS_quizStatus = status;

        if (status.locked) {
          // Already finalized — show locked panel and disable quiz
          setBarStatus('\u{1F512} Final grade: ' + status.score + '%', '#E8A020');
          renderLockedPanel(status.score);
          // Dispatch event so quiz page JS can disable its UI
          document.dispatchEvent(new CustomEvent('apcs:quiz:locked', { detail: status }));
          return;
        }

        if (status.attempts > 0) {
          setBarStatus('Best score: ' + status.score + '% \u2022 ' + status.attempts + ' attempt' + (status.attempts !== 1 ? 's' : ''), '#c4b5fd');
        }

        loadUnitProgress(pageInfo);
      });
    }

    // ── GLOBAL: called by quiz page after each scored attempt ─────────────────
    var _lastScore = null;
    window.APCS_saveQuizScore = async function(score, answers, onRetry) {
      _lastScore = score;
      setBarStatus('Saving score\u2026', '#c4b5fd');
      const result = await apiPost('/api/student/quiz', {
        course: pageInfo.course, unit: pageInfo.unit,
        lesson: pageInfo.lesson, score: score, answers: answers || {},
      });

      if (!result || !result.ok) {
        if (result && result.locked) {
          setBarStatus('\u{1F512} Final grade already submitted', '#E8A020');
          renderLockedPanel(result.score || score);
        } else {
          setBarStatus('Error saving score', '#F87171');
        }
        return result;
      }

      const threshold    = result.threshold || 80;
      const retryAllowed = result.retry_allowed !== false;

      if (result.passed) {
        setBarStatus('\u2713 ' + score + '% \u2014 above threshold', '#6EE7B7');
        renderPassPanel(score, threshold, onRetry, retryAllowed);
      } else {
        setBarStatus(score + '% \u2014 need ' + threshold + '%', '#F87171');
        renderRetryPanel(score, threshold, retryAllowed, onRetry);
      }

      loadUnitProgress(pageInfo);
      return result;
    };

    // ── GLOBAL: Submit Final Grade ────────────────────────────────────────────
    window.APCS_finalizeQuiz = async function() {
      setBarStatus('Submitting final grade\u2026', '#c4b5fd');
      const result = await apiPost('/api/student/quiz/finalize', {
        course: pageInfo.course, unit: pageInfo.unit, lesson: pageInfo.lesson,
      });

      if (!result || !result.ok) {
        if (result && result.locked) {
          setBarStatus('\u{1F512} Already submitted', '#E8A020');
        } else {
          setBarStatus('Error submitting. Try again.', '#F87171');
        }
        return result;
      }

      setBarStatus('\u{1F512} Final grade: ' + result.score + '%', '#E8A020');
      renderLockedPanel(result.score);
      document.dispatchEvent(new CustomEvent('apcs:quiz:finalized', { detail: result }));
      loadUnitProgress(pageInfo);
      return result;
    };

    // ── GLOBAL: confidence rating ─────────────────────────────────────────────
    window.APCS_saveConfidence = function(rating) {
      apiPost('/api/student/progress', {
        course: pageInfo.course, unit: pageInfo.unit,
        lesson: pageInfo.lesson, activity_type: pageInfo.activity,
        confidence: rating,
      });
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
