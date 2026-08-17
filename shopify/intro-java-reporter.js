/**
 * Intro to Java attempt reporter v2  (intro-java only)
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
 * -- SIGNED OUT (v2) ---------------------------------------------------------
 * v1 told a signed-out student to sign in and marked nothing, which made a free
 * course impossible to try before joining it. There are now anonymous twins of
 * both routes:
 *
 *   POST /api/progress/anon/choice
 *   POST /api/progress/anon/gap
 *
 * They grade and store NOTHING, and return a signed receipt. This file keeps the
 * receipts in localStorage, restores the marks on the next visit, and posts them
 * to /api/progress/import the first time it sees a token. So work done before an
 * account follows the student into one.
 *
 * TWO THINGS THE CACHE IS NOT. It is not a grade: the server holds no record of
 * it until an import, and the page says so in those words rather than implying
 * permanence it does not have. And it is not a copy of anything typed: option
 * indices are cached, gap text never is, matching the server's own posture that
 * student free text is not kept anywhere.
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
 * SESSION: same localStorage token apcs-tracker.js uses. With no token the page
 *   still grades, anonymously, and nothing is recorded.
 *
 * No em-dashes, pure ASCII, per repo convention.
 */

(function () {
  'use strict';

  var API = 'https://progress.apcsexamprep.com';
  var TOKEN_KEYS = ['apcse_token', 'apcs_token', 'apcsToken'];
  var CACHE_KEY = 'ij_anon_v1';
  // Bounded on purpose. The whole course is a few hundred items; a cache that
  // can only ever grow is how a browser tab gets slow and how a bug becomes a
  // support ticket nobody can reproduce.
  var CACHE_MAX = 300;

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

  // -- Device-local cache ------------------------------------------------------
  // Every read is defensive: this is a string another version of this file wrote
  // up to a month ago, in a browser that may have had storage disabled since.
  function readCache() {
    try {
      var raw = window.localStorage.getItem(CACHE_KEY);
      if (!raw) return { v: 1, items: {} };
      var c = JSON.parse(raw);
      if (!c || typeof c !== 'object' || !c.items || typeof c.items !== 'object') {
        return { v: 1, items: {} };
      }
      return c;
    } catch (e) {
      return { v: 1, items: {} };
    }
  }

  function writeCache(c) {
    try {
      var ids = Object.keys(c.items);
      if (ids.length > CACHE_MAX) {
        // Drop the oldest first. `at` is set on every write below, so a missing
        // one is from a build that predates it and is the safest thing to evict.
        ids.sort(function (a, b) { return (c.items[a].at || 0) - (c.items[b].at || 0); });
        for (var i = 0; i < ids.length - CACHE_MAX; i++) delete c.items[ids[i]];
      }
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(c));
    } catch (e) { /* storage full or blocked; the page still works */ }
  }

  function remember(itemId, entry) {
    if (!itemId) return;
    var c = readCache();
    entry.at = Date.now();
    c.items[itemId] = entry;
    writeCache(c);
  }

  function clearCache() {
    try { window.localStorage.removeItem(CACHE_KEY); } catch (e) { /* nothing to do */ }
  }

  function request(path, body, tok) {
    var headers = { 'content-type': 'application/json' };
    if (tok) headers.authorization = 'Bearer ' + tok;
    return fetch(API + path, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().then(function (j) { return { status: r.status, body: j }; })
        .catch(function () { return { status: r.status, body: null }; });
    }).catch(function () {
      return { networkError: true };
    });
  }

  // One call site for both worlds. `kind` is 'choice' or 'gap'; with no token it
  // goes to the anonymous twin, which grades the same way and records nothing.
  function submit(kind, body) {
    var t = token();
    return request((t ? '/api/progress/' : '/api/progress/anon/') + kind, body, t)
      .then(function (res) {
        res.anonymous = !t;
        return res;
      });
  }

  function say(el, text, tone) {
    if (!el) return;
    el.textContent = text;
    el.style.color = tone === 'good' ? '#14603c' : (tone === 'bad' ? '#96261b' : '#3d4b59');
    el.style.webkitTextFillColor = el.style.color;
  }

  // Said once per graded item while signed out, and deliberately not dressed up
  // as a saved grade. An earlier draft of this feature proposed making the marks
  // "seem permanent" so students would not realise clearing storage resets them.
  // That is the same defect as the two false messages v1 shipped: the page would
  // be telling a student something about their record that is not true.
  var LOCAL_NOTE = ' Saved on this device. Make a free account to keep it anywhere.';

  // A submission that could not be recorded must SAY so. Silently swallowing it
  // is how a student does the work twice and a teacher sees an empty gradebook.
  function reportFailure(feedback, res) {
    if (res && res.networkError) {
      say(feedback, 'Could not reach the server. Nothing was saved. Check your connection and try again.', 'bad');
      return true;
    }
    if (!res || res.status !== 200 || !res.body) {
      // NEVER render res.body.error. Those strings are written for a developer
      // reading a wire log and they say things like "course must be
      // 'ap-cybersecurity' for this class" or "detail must be an array of
      // {q, sel, ok}". A student saw the first of those on a live page, which is
      // how this rule got written.
      //
      // The server supplies student_message where a student can genuinely reach
      // the condition. Anything else is a bug on our side rather than something
      // they did, so it gets one honest sentence and no jargon. Showing `error`
      // is deliberately not a fallback: a NEW server error added later must not
      // be able to leak developer text onto a lesson page just because nobody
      // remembered to translate it.
      var msg = (res && res.body && res.body.student_message)
        ? res.body.student_message
        : 'Something went wrong on our end. This was not saved and could not be marked. Try again in a moment.';
      say(feedback, msg, 'bad');
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
      var picked = parseInt(chosen.value, 10);
      say(feedback, 'Checking...', '');
      return submit('choice', {
        course: COURSE,
        item_id: itemId,
        selections: [picked],
        duration_seconds: elapsed()
      }).then(function (res) {
        if (reportFailure(feedback, res)) return null;
        var ok = res.body.questions && res.body.questions[0] && res.body.questions[0].ok;
        say(feedback, ok ? 'Correct.' : 'Not quite. Read the step above again and try another answer.',
          ok ? 'good' : 'bad');
        if (res.anonymous && res.body.receipt) {
          remember(itemId, {
            r: res.body.receipt, s: res.body.score, m: res.body.max_score,
            q: res.body.questions, sel: [picked]
          });
        }
        return res;
      });
    });

    Promise.all(jobs).then(function (results) {
      btn.disabled = false;
      // Only checks that actually came back from the server are counted. A
      // question left blank, or one whose post failed, has already said so in
      // its own slot and must not be silently scored as wrong here.
      var graded = results.filter(Boolean);
      if (!graded.length) return;
      var right = graded.filter(function (res) {
        return res.body.questions && res.body.questions[0] && res.body.questions[0].ok;
      }).length;
      var anon = graded.some(function (res) { return res.anonymous; });
      say(summary, right + ' of ' + graded.length + ' correct.'
        + (right === graded.length ? ' Keep going.' : ' Reread the step above, then try again.')
        + (anon ? LOCAL_NOTE : ''),
        right === graded.length ? 'good' : 'bad');
    });
  }

  // -- Fill in the code --------------------------------------------------------
  // One attempt for the whole exercise. The typed text is sent for grading and
  // is never stored by anything at either end, INCLUDING this cache: the receipt
  // and the score are kept, the words the student typed are not.
  function checkGap(btn) {
    var section = btn.closest('.ij-gap');
    if (!section) return;
    var feedback = summaryOf(section);
    var inputs = [].slice.call(section.querySelectorAll('.ij-hole[data-hole]'));
    if (!inputs.length) return;

    var itemId = section.getAttribute('data-item-id');
    var answers = {};
    inputs.forEach(function (i) { answers[i.getAttribute('data-hole')] = i.value; });

    btn.disabled = true;
    say(feedback, 'Checking...', '');

    submit('gap', {
      course: COURSE,
      item_id: itemId,
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
      say(feedback, (hints.length ? head + ' ' + hints.join(' ') : head)
        + (res.anonymous ? LOCAL_NOTE : ''),
        body.score === body.max_score ? 'good' : 'bad');

      if (res.anonymous && body.receipt) {
        remember(itemId, { r: body.receipt, s: body.score, m: body.max_score, gap: true });
      }
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

    var itemId = section.getAttribute('data-item-id');
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

    submit('choice', {
      course: COURSE,
      item_id: itemId,
      selections: selections,
      duration_seconds: elapsed()
    }).then(function (res) {
      btn.disabled = false;
      if (reportFailure(out, res)) return;

      var body = res.body;
      markQuestions(qs, body.questions);

      say(out, body.score + ' out of ' + body.max_score + '.'
        + (body.passed ? ' Passed.' : '')
        + (body.retry_allowed ? ' You can take it again.' : '')
        + (res.anonymous ? LOCAL_NOTE : ''),
        body.score === body.max_score ? 'good' : 'bad');

      if (res.anonymous && body.receipt) {
        remember(itemId, {
          r: body.receipt, s: body.score, m: body.max_score,
          q: body.questions, sel: selections
        });
      }
    });
  }

  // Mark each question from the server's per-question verdicts. Shared by the
  // live path and the restore path so the two can never drift apart.
  function markQuestions(qs, verdicts) {
    var byId = {};
    (verdicts || []).forEach(function (q) { byId[q.id] = q.ok; });
    qs.forEach(function (q) {
      var ok = byId[q.getAttribute('data-q-id')];
      if (ok === undefined) return;
      say(q.querySelector('.ij-feedback'), ok ? 'Correct.' : 'Not correct.', ok ? 'good' : 'bad');
    });
  }

  // -- Restoring a previous visit ----------------------------------------------
  // Put back what this device already has for the items on THIS page, so a
  // signed-out student who comes back does not face a blank lesson they have
  // already done. The wording says where it lives; it does not pretend to be a
  // grade on a server that has never seen it.
  function restore() {
    var cache = readCache();
    var ids = Object.keys(cache.items);
    if (!ids.length) return;

    // Concept checks: one item per question wrapper.
    [].slice.call(wrap.querySelectorAll('.ij-q[data-item-id]')).forEach(function (q) {
      var e = cache.items[q.getAttribute('data-item-id')];
      if (!e || !e.q) return;
      restoreSelections(q, e.sel);
      var ok = e.q[0] && e.q[0].ok;
      say(q.querySelector('.ij-feedback'), ok ? 'Correct.' : 'Not correct.', ok ? 'good' : 'bad');
    });

    [].slice.call(wrap.querySelectorAll('.ij-cfu')).forEach(function (section) {
      var done = [].slice.call(section.querySelectorAll('.ij-q[data-item-id]'))
        .filter(function (q) { return cache.items[q.getAttribute('data-item-id')]; });
      if (!done.length) return;
      say(summaryOf(section), 'Checked on this device already.' + LOCAL_NOTE, '');
    });

    // Quiz: one item for the whole section.
    [].slice.call(wrap.querySelectorAll('.ij-quiz[data-item-id]')).forEach(function (section) {
      var e = cache.items[section.getAttribute('data-item-id')];
      if (!e) return;
      var qs = [].slice.call(section.querySelectorAll('.ij-q'));
      restoreSelections(section, e.sel);
      markQuestions(qs, e.q);
      say(summaryOf(section), e.s + ' out of ' + e.m + '.' + LOCAL_NOTE, '');
    });

    // Gap: the score line only. Nothing the student typed was cached, so the
    // blanks come back empty and the message has to be honest about that rather
    // than leaving green borders around boxes with nothing in them.
    [].slice.call(wrap.querySelectorAll('.ij-gap[data-item-id]')).forEach(function (section) {
      var e = cache.items[section.getAttribute('data-item-id')];
      if (!e) return;
      say(summaryOf(section), e.s + ' of ' + e.m + ' blanks correct last time on this device. '
        + 'Type your answers again to check them.', '');
    });
  }

  // Selections are option INDICES, which is why they can be cached at all. Radio
  // values are the same indices the page rendered.
  function restoreSelections(root, sel) {
    if (!sel || !sel.length) return;
    var qs = [].slice.call(root.querySelectorAll('.ij-q'));
    var list = root.classList && root.classList.contains('ij-q') ? [root] : qs;
    list.forEach(function (q, i) {
      var v = sel[i];
      if (v === null || v === undefined) return;
      // Matched by reading each radio's value rather than by building a selector
      // string around it. A concatenated selector would be the only place in this
      // file where the markup contract is not a whole literal, which is exactly
      // what smoke/intro-java-reporter.js reads this source for.
      [].slice.call(q.querySelectorAll('input[type="radio"]')).some(function (input) {
        if (parseInt(input.value, 10) !== v) return false;
        input.checked = true;
        return true;
      });
    });
  }

  // -- Carrying it into an account ---------------------------------------------
  // The point of the whole feature. On the first page load after a student has a
  // token, everything this device graded anonymously is offered to the server,
  // which decides what may count (see the import route: it refuses to overwrite
  // live work, and refuses outright where the class counts first attempts).
  function importCached() {
    var t = token();
    if (!t) return;
    var cache = readCache();
    var receipts = Object.keys(cache.items)
      .map(function (id) { return cache.items[id].r; })
      .filter(Boolean);
    if (!receipts.length) return;

    request('/api/progress/import', { receipts: receipts.slice(0, 200) }, t).then(function (res) {
      if (!res || res.status !== 200 || !res.body) return;
      // Cleared whatever the verdict was. A receipt the server has ruled on is
      // finished: keeping it would re-offer it on every page load forever.
      clearCache();
      var note = document.createElement('p');
      note.className = 'ij-feedback ij-import-note';
      note.setAttribute('role', 'status');
      say(note, res.body.student_message || '', res.body.imported ? 'good' : '');
      if (note.textContent) wrap.insertBefore(note, wrap.firstChild);
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

  if (token()) importCached(); else restore();

  // Exposed for the code-editor widgets that arrive with Units 2 to 6, so they
  // have one documented way in rather than each inventing its own.
  window.INTROJAVA_reportGap = function (itemId, answers) {
    return submit('gap', { course: COURSE, item_id: itemId, answers: answers });
  };
  window.INTROJAVA_page = { course: COURSE, lesson: LESSON };
})();
