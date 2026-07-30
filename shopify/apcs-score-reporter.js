'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  APCS SCORE REPORTER - one script for every graded page.
//
//  WHY ONE SCRIPT
//  There are 124 graded cyber pages and they use ELEVEN different scoring
//  structures. Patching each one is a dozen bespoke patterns plus a long tail of
//  one-offs, and every patch is a fresh chance to hardcode the wrong lesson.
//  Unit 1 shows how easy that is: its activity pages are titled 1.4 while
//  sitting on the 1.3 handle.
//
//  What the pages DO agree on is that they show the student a score. 119 of 124
//  expose an element whose id names one (#score-display on 50, #r-score on 40,
//  #score-num, #finalScore, #totalScore), and not one page lacks both that and
//  data-lesson-id. So this watches the score the student can already see, and
//  reports it.
//
//  LOCATION COMES FROM THE URL, NOT FROM THIS SCRIPT
//  The page handle is posted as-is and the server resolves it with
//  pageFromHandle, the same mapping /track uses. This script therefore knows
//  nothing about lessons, and cannot be wrong about one.
//
//  WHAT IT WILL NOT DO
//    - send half a pair: the API rejects it, and a half pair is how a page bug
//      becomes a confident wrong grade
//    - report "0 / 0", which means the page has not computed a total yet
//    - report the same result twice
//    - throw into the page, or block a student on a network failure
//
//  Zero PII: two integers and the page handle. Never answer text, never a name.
//  No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────
(function (root) {
  var API = 'https://progress.apcsexamprep.com';

  // Elements that display a score, in the order they should be trusted. The
  // first one on the page that yields a usable pair wins.
  var SCORE_IDS = [
    'score-display', 'r-score', 'score-num', 'finalScore',
    'totalScore', 'foundCount', 'score-val',
  ];

  // ── PARSING ────────────────────────────────────────────────────────────────
  // A page renders its score as text. Accept the forms actually observed across
  // the course and refuse everything else, because a misread number becomes a
  // grade. Returns {earned, possible} or null.
  //
  // "0 / 24", "4/10", "Score: 7 / 7", "7 of 7" are all the same thing.
  function parseScore(text) {
    if (text == null) return null;
    var s = String(text).replace(/\s+/g, ' ').trim();
    if (!s) return null;

    // The minus is captured deliberately. Without it "-1 / 7" matches the "1"
    // and reports as 1 of 7, turning a page bug into a plausible grade.
    // "out of" is listed before "of" so the longer form wins: the red-flag
    // result panels render "5 out of 7 red flags found".
    var m = s.match(/(-?\d{1,3})\s*(?:\/|\bout\s+of\b|\bof\b)\s*(\d{1,3})/i);
    if (!m) return null;

    var earned = parseInt(m[1], 10);
    var possible = parseInt(m[2], 10);
    if (!isFinite(earned) || !isFinite(possible)) return null;

    // "0 / 0" means the page computes its total at runtime and has not yet.
    // Reporting it would store a real zero out of nothing.
    if (possible <= 0) return null;

    // A score above its own total is a page bug, not a grade. The API would
    // clamp it, which would silently turn a bug into a perfect score.
    if (earned < 0 || earned > possible) return null;

    return { earned: earned, possible: possible };
  }

  // The handle is the last path segment: /pages/ap-cyber-unit-1-lesson-1-quiz
  function handleFromPath(pathname) {
    if (!pathname) return null;
    var parts = String(pathname).split('?')[0].split('#')[0].split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : null;
  }

  // ── REPORTING ──────────────────────────────────────────────────────────────
  function getToken() {
    try {
      return root.localStorage.getItem('apcse_token')
        || root.localStorage.getItem('apcs_student_token')
        || root.localStorage.getItem('student_token')
        || null;
    } catch (e) { return null; }
  }

  var sent = {};   // client_event_id -> true. Bounded by the page's own lifetime.

  function report(score, opts) {
    opts = opts || {};
    if (!score) return false;
    var handle = opts.handle || handleFromPath(root.location && root.location.pathname);
    if (!handle) return false;
    var token = opts.token || getToken();
    if (!token) return false;                     // signed out: nothing to report

    var eventId = [handle, score.earned, score.possible].join(':');
    if (sent[eventId]) return false;              // already reported this exact result
    sent[eventId] = true;

    var body = {
      handle: handle,
      earned: score.earned,
      possible: score.possible,
      client_event_id: eventId,
    };
    if (opts.item) body.item = opts.item;

    try {
      (opts.fetch || root.fetch)(API + '/api/student/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(body),
      }).then(function (r) {
        if (r && !r.ok && r.json) {
          r.json().then(function (e) {
            // Loud in the console, silent to the student. A page that cannot be
            // scored is a bug for us, not an error for them.
            if (root.console) root.console.warn('[apcse] not scored:', (e && e.error) || r.status);
          }).catch(function () {});
        }
      }).catch(function () { /* offline: the student must never notice */ });
    } catch (e) { /* reporting must never break the page */ }
    return true;
  }

  // Read whichever score element this page happens to use.
  function readScore(doc) {
    doc = doc || root.document;
    if (!doc || !doc.getElementById) return null;
    for (var i = 0; i < SCORE_IDS.length; i++) {
      var el = doc.getElementById(SCORE_IDS[i]);
      if (!el) continue;
      // The element may hold "7 / 7", or just "7" with the total beside it.
      var got = parseScore(el.textContent);
      if (got) return got;
      var parentText = el.parentNode && el.parentNode.textContent;
      got = parseScore(parentText);
      if (got) return got;
    }
    return null;
  }

  // ── WIRING ─────────────────────────────────────────────────────────────────
  // Watch the score element rather than hooking each page's grading function.
  // Eleven scoring shapes have eleven different entry points; they all end up
  // writing a number the student can see.
  function start() {
    var doc = root.document;
    if (!doc || !root.MutationObserver) return;

    var check = function () {
      var score = readScore(doc);
      if (score) report(score);
    };

    var observer = new root.MutationObserver(function () { check(); });
    try {
      observer.observe(doc.body, { childList: true, subtree: true, characterData: true });
    } catch (e) { return; }

    check();   // a page that renders its score server-side is already done
  }

  var api = {
    parseScore: parseScore,
    handleFromPath: handleFromPath,
    readScore: readScore,
    report: report,
    start: start,
    SCORE_IDS: SCORE_IDS,
    _reset: function () { sent = {}; },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    root.APCSE = root.APCSE || {};
    root.APCSE.scoreReporter = api;
    if (root.document && root.document.readyState !== 'loading') start();
    else if (root.document) root.document.addEventListener('DOMContentLoaded', start);
  }
})(typeof window !== 'undefined' ? window : globalThis);
