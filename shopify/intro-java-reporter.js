/**
 * Intro to Java attempt reporter v1  (intro-java only)
 *
 * Drop on intro-java lesson pages. Owns every graded interaction on them:
 * concept checks, the fill-in-the-code exercise, and the lesson quiz.
 *
 * -- WHY THIS IS NOT apcs-reporter.js ----------------------------------------
 * apcs-reporter.js binds the CSA widget system (.apcs-ex / .apcsa-mastery) and
 * posts a score the PAGE worked out, because CSA pages carry their own answer
 * key in the markup.
 *
 * intro-java pages deliberately do not ship a key. The renderer copies only id,
 * stem and options into the page, and the smoke suite greps every rendered page
 * to prove the answers never arrive. A browser with no key cannot compute a
 * score, so this reporter SENDS THE SELECTIONS and the server returns the mark:
 *
 *   POST /api/progress/choice   concept checks and the quiz
 *   POST /api/progress/gap      the fill-in-the-code exercise
 *
 * That is a different contract from the CSA reporter, not a variation on it,
 * which is why it is a separate file rather than a branch inside that one.
 *
 * -- WHAT IT HOOKS, WITH NO PAGE JS AT ALL -----------------------------------
 *   [data-role="check-cfu"]   grades every concept check on the page, one
 *                             attempt per check (each is its own manifest item)
 *   [data-role="check-gap"]   grades the gap exercise, one attempt
 *   [data-role="submit-quiz"] grades the quiz, one attempt
 *
 * Markup comes from lib/intro-java-page.js in the progress-api repo. If that
 * renderer changes its class names, this file changes with it; smoke/
 * intro-java-reporter.js asserts the two agree.
 *
 * -- WHAT IT NEVER DOES ------------------------------------------------------
 * It does not know any answer, so it cannot reveal one. It does not grade
 * anything locally. It never posts a score field; the server ignores one
 * anyway. Gap text is sent for grading and never stored by anything.
 *
 * SESSION: same localStorage token apcs-tracker.js uses. No token, no posts,
 *   and the page still works as a readable lesson.
 *
 * No em-dashes, pure ASCII, per repo convention.
 */

(function () {
  'use strict';

  var API = 'https://progress.apcsexamprep.com';
  var TOKEN_KEYS = ['apcse_token', 'apcs_token', 'apcsToken'];

  function token() {
    for (var i = 0; i < TOKEN_KEYS.length; i++) {
      try {
        var t = window.localStorage.getItem(TOKEN_KEYS[i]);
        if (t) return t;
      } catch (e) { /* storage blocked; behave as logged out */ }
    }
    return null;
  }

  var wrap = document.getElementById('ij-lesson');
  if (!wrap) return;

  var COURSE = wrap.getAttribute('data-course') || 'intro-java';
  var LESSON = wrap.getAttribute('data-lesson-id') || '';

  // Time on the item, from first render to submit. Client-computed and clamped
  // server side; telemetry, never grade data.
  var started = Date.now();
  function elapsed() {
    return Math.max(0, Math.min(86400, Math.round((Date.now() - started) / 1000)));
  }

  function post(path, body) {
    var t = token();
    if (!t) return Promise.resolve({ noSession: true });
    return fetch(API + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().then(function (j) { return { status: r.status, body: j }; })
        .catch(function () { return { status: r.status, body: null }; });
    }).catch(function () {
      return { networkError: true };
    });
  }

  function say(el, text, tone) {
    if (!el) return;
    el.textContent = text;
    el.style.color = tone === 'good' ? '#14603c' : (tone === 'bad' ? '#96261b' : '#3d4b59');
    el.style.webkitTextFillColor = el.style.color;
  }

  // A submission that could not be recorded must SAY so. Silently swallowing it
  // is how a student does the work twice and a teacher sees an empty gradebook.
  function reportFailure(feedback, res) {
    if (res && res.noSession) {
      say(feedback, 'Not signed in, so this was not saved. Your answers are still marked below.', '');
      return true;
    }
    if (res && res.networkError) {
      say(feedback, 'Could not reach the server. Nothing was saved. Check your connection and try again.', 'bad');
      return true;
    }
    if (!res || res.status !== 200 || !res.body) {
      var msg = (res && res.body && res.body.error) ? res.body.error : 'Something went wrong.';
      say(feedback, 'Not saved: ' + msg, 'bad');
      return true;
    }
    return false;
  }

  // Two feedback slots per section, and picking the wrong one is a real bug:
  // `.ij-feedback` alone matches question one's paragraph, so a whole-item
  // message written there erases that question's own mark. The section-level
  // slot carries `.ij-summary` and is the ONLY one a whole-item message goes to.
  function summaryOf(section) { return section.querySelector('.ij-summary'); }

  // -- Concept checks ----------------------------------------------------------
  // Each check is its own manifest item worth one point, so each posts its own
  // attempt. They are sent in parallel and the button re-enables when all settle.
  function checkCfus(btn) {
    var section = btn.closest('.ij-cfu');
    if (!section) return;
    var qs = [].slice.call(section.querySelectorAll('.ij-q[data-item-id]'));
    if (!qs.length) return;

    var summary = summaryOf(section);
    btn.disabled = true;
    var jobs = qs.map(function (q) {
      var itemId = q.getAttribute('data-item-id');
      var chosen = q.querySelector('input[type="radio"]:checked');
      var feedback = q.querySelector('.ij-feedback');
      if (!chosen) {
        say(feedback, 'Pick an answer first.', '');
        return Promise.resolve(null);
      }
      say(feedback, 'Checking...', '');
      return post('/api/progress/choice', {
        course: COURSE,
        item_id: itemId,
        selections: [parseInt(chosen.value, 10)],
        duration_seconds: elapsed()
      }).then(function (res) {
        if (reportFailure(feedback, res)) return null;
        var ok = res.body.questions && res.body.questions[0] && res.body.questions[0].ok;
        say(feedback, ok ? 'Correct.' : 'Not quite. Read the step above again and try another answer.',
          ok ? 'good' : 'bad');
        return res.body;
      });
    });

    Promise.all(jobs).then(function (results) {
      btn.disabled = false;
      // Only checks that actually came back from the server are counted. A
      // question left blank, or one whose post failed, has already said so in
      // its own slot and must not be silently scored as wrong here.
      var graded = results.filter(Boolean);
      if (!graded.length) return;
      var right = 0;
      graded.forEach(function (b) {
        if (b.questions && b.questions[0] && b.questions[0].ok) right++;
      });
      say(summary, right + ' of ' + graded.length + ' correct.'
        + (right === graded.length ? ' Keep going.' : ' Reread the step above, then try again.'),
        right === graded.length ? 'good' : 'bad');
    });
  }

  // -- Fill in the code --------------------------------------------------------
  // One attempt for the whole exercise. The typed text is sent for grading and
  // is never stored by anything at either end.
  function checkGap(btn) {
    var section = btn.closest('.ij-gap');
    if (!section) return;
    var feedback = summaryOf(section);
    var inputs = [].slice.call(section.querySelectorAll('.ij-hole[data-hole]'));
    if (!inputs.length) return;

    var answers = {};
    inputs.forEach(function (i) { answers[i.getAttribute('data-hole')] = i.value; });

    btn.disabled = true;
    say(feedback, 'Checking...', '');

    post('/api/progress/gap', {
      course: COURSE,
      item_id: section.getAttribute('data-item-id'),
      answers: answers,
      duration_seconds: elapsed()
    }).then(function (res) {
      btn.disabled = false;
      if (reportFailure(feedback, res)) return;

      var body = res.body;
      var byHole = {};
      (body.holes || []).forEach(function (h) { byHole[h.n] = h; });

      // Mark each blank, and pass the server's near-miss message straight
      // through. Those messages name the KIND of mistake and never the answer.
      inputs.forEach(function (input) {
        var h = byHole[parseInt(input.getAttribute('data-hole'), 10)];
        if (!h) return;
        input.style.borderColor = h.ok ? '#14603c' : '#d1483a';
        input.title = h.ok ? 'Correct' : (h.message || 'Not correct yet');
      });

      var hints = (body.holes || []).filter(function (h) { return !h.ok && h.message; })
        .map(function (h) { return 'Blank ' + h.n + ': ' + h.message; });

      var head = body.score + ' of ' + body.max_score + ' blanks correct.';
      say(feedback, hints.length ? head + ' ' + hints.join(' ') : head,
        body.score === body.max_score ? 'good' : 'bad');
    });
  }

  // -- Quiz --------------------------------------------------------------------
  // One attempt for the whole quiz, one point per question.
  function submitQuiz(btn) {
    var section = btn.closest('.ij-quiz');
    if (!section) return;
    var out = summaryOf(section);
    var qs = [].slice.call(section.querySelectorAll('.ij-q'));
    if (!qs.length) return;

    var selections = [];
    var unanswered = 0;
    qs.forEach(function (q) {
      var chosen = q.querySelector('input[type="radio"]:checked');
      if (!chosen) unanswered++;
      selections.push(chosen ? parseInt(chosen.value, 10) : null);
    });

    if (unanswered > 0) {
      say(out, unanswered + (unanswered === 1 ? ' question is' : ' questions are')
        + ' unanswered. Answer them all before submitting.', '');
      return;
    }

    btn.disabled = true;
    say(out, 'Submitting...', '');

    post('/api/progress/choice', {
      course: COURSE,
      item_id: section.getAttribute('data-item-id'),
      selections: selections,
      duration_seconds: elapsed()
    }).then(function (res) {
      btn.disabled = false;
      if (reportFailure(out, res)) return;

      var body = res.body;
      var byId = {};
      (body.questions || []).forEach(function (q) { byId[q.id] = q.ok; });
      qs.forEach(function (q) {
        var ok = byId[q.getAttribute('data-q-id')];
        if (ok === undefined) return;
        var fb = q.querySelector('.ij-feedback');
        say(fb, ok ? 'Correct.' : 'Not correct.', ok ? 'good' : 'bad');
      });

      say(out, body.score + ' out of ' + body.max_score + '.'
        + (body.passed ? ' Passed.' : '')
        + (body.retry_allowed ? ' You can take it again.' : ''),
        body.passed ? 'good' : 'bad');
    });
  }

  // One delegated listener for the whole page, so nothing has to be re-bound if
  // the theme re-renders a section.
  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest ? ev.target.closest('.ij-check[data-role]') : null;
    if (!btn || !wrap.contains(btn)) return;
    var role = btn.getAttribute('data-role');
    if (role === 'check-cfu') checkCfus(btn);
    else if (role === 'check-gap') checkGap(btn);
    else if (role === 'submit-quiz') submitQuiz(btn);
  });

  // Exposed for the code-editor widgets that arrive with Units 2 to 6, so they
  // have one documented way in rather than each inventing its own.
  window.INTROJAVA_reportGap = function (itemId, answers) {
    return post('/api/progress/gap', { course: COURSE, item_id: itemId, answers: answers });
  };
  window.INTROJAVA_page = { course: COURSE, lesson: LESSON };
})();
