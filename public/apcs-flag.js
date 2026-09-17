/* apcs-flag.js - "Flag this question".
 *
 * Handoff section 4.5. A one-click report attached to a single question, with no
 * widget and no form: the whole point is that a teacher who spots a wrong answer
 * key can say so without leaving the page or describing where they were.
 *
 * It posts category=content_error with the question id and the page URL, which is
 * the same endpoint and the same enum the widget uses. TODO #343 is what this is
 * aimed at: 19 QOTD articles whose correct answer is not among the options.
 *
 * THIS FILE IS SEPARATE FROM apcs-widget.js ON PURPOSE.
 *
 * The widget must not load on a quiz or test page, and that rule is not bent
 * here. But 4.5 asks for the flag link on graded quiz pages too, AFTER
 * submission. Those are two different rules about two different things: the
 * corner button is an affordance next to a graded item and must be absent, while
 * a flag on a question the student has already answered cannot leak anything and
 * is the moment somebody actually notices a bad key. Two files is how both stay
 * true without either condition growing an exception.
 *
 * WHEN IT APPEARS:
 *   ordinary page   immediately, one link per question block
 *   graded quiz     only once the results panel is visible
 *
 * The results panel is detected with the SAME element ids the theme's own
 * assets/apcs-quiz-wiring.js watches. That is deliberate reuse rather than a
 * second opinion about what "submitted" means: a second opinion would eventually
 * disagree, and it would disagree silently and on the wrong side.
 *
 * Question blocks are found with the SAME class names this repo's own parsers
 * read in lib/csa-qotd-items.js. If a page has none, this script does nothing at
 * all rather than guessing where to put a link.
 *
 * No em-dashes, no non-ASCII.
 */
(function () {
  'use strict';

  var API = (window.APCS_API || 'https://progress.apcsexamprep.com').replace(/\/+$/, '');

  /* The markup this site actually uses, read off lib/csa-qotd-items.js rather
   * than guessed:
   *   .qotd-question-box    QOTD articles
   *   .apcs-question-text   practice pages
   *   .mcq-item             CSP exercise pages
   * A page with none of these gets no links. Injecting a "flag this question"
   * link next to something that is not a question is worse than not offering it. */
  var BLOCKS = ['.qotd-question-box', '.apcs-question-text', '.mcq-item'];

  /* Same ids as assets/apcs-quiz-wiring.js in the theme. */
  var RESULT_IDS = ['results-panel', 'resultsPanel', 'quizResults'];

  var TOKEN_KEYS = ['apcse_token', 'apcs_student_token', 'student_token', 'apcse_teacher_token', 'apcs_teacher_token', 'teacher_token'];
  function token() {
    for (var i = 0; i < TOKEN_KEYS.length; i++) {
      try { var v = window.localStorage.getItem(TOKEN_KEYS[i]); if (v) return v; } catch (e) { /* blocked */ }
    }
    return null;
  }

  function onAssessmentPage() {
    try {
      var p = (location.pathname || '').toLowerCase().replace(/\/+$/, '');
      if (/-(quiz|exam)$/.test(p)) return true;
      /* Same widened rule as apcs-widget.js, and the same 62 live pages are why.
       * Here a true answer means "wait for the results panel" rather than "stay
       * away", so getting it wrong the old way meant flag links appearing on a
       * practice test before the student had answered anything. */
      return /(^|[/-])(unit-test|practice-exam|practice-test)([/-]|s?$)/.test(p);
    } catch (e) { return true; }
  }

  function handle() {
    try {
      var parts = (location.pathname || '').replace(/\/+$/, '').split('/');
      return parts[parts.length - 1] || 'page';
    } catch (e) { return 'page'; }
  }

  function visible(n) {
    try {
      if (!n) return false;
      var s = window.getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      return !!(n.offsetWidth || n.offsetHeight || n.getClientRects().length);
    } catch (e) { return false; }
  }

  function resultsPanel() {
    for (var i = 0; i < RESULT_IDS.length; i++) {
      var n = document.getElementById(RESULT_IDS[i]);
      if (n) return n;
    }
    return null;
  }

  function blocks() {
    var out = [];
    for (var i = 0; i < BLOCKS.length; i++) {
      try {
        var found = document.querySelectorAll(BLOCKS[i]);
        for (var j = 0; j < found.length; j++) if (out.indexOf(found[j]) === -1) out.push(found[j]);
      } catch (e) { /* bad selector in an old browser: skip it */ }
    }
    return out;
  }

  function send(questionId, link) {
    var h = { 'Content-Type': 'application/json' };
    var t = token();
    if (t) h.Authorization = 'Bearer ' + t;
    link.textContent = 'Sending';
    fetch(API + '/api/assistant/report', {
      method: 'POST',
      headers: h,
      body: JSON.stringify({
        category: 'content_error',
        /* Enough words to clear the junk filter's too-short rule on its own,
         * because a one-click report carries no typed text by definition and
         * would otherwise be dismissed as junk before anybody read it. */
        description: 'Flagged from the page: this question looks wrong. Reported with one click, no description typed.',
        pageUrl: location.pathname + location.search,
        pageTitle: (document.title || '').slice(0, 200),
        fields: { questionId: questionId }
      })
    })
      .then(function (r) { return r.json().catch(function () { return null; }); })
      .then(function (j) {
        link.textContent = (j && j.ok) ? 'Thanks, flagged' : 'Could not send';
        link.style.color = (j && j.ok) ? '#065f46' : '#991b1b';
      })
      .catch(function () {
        link.textContent = 'Could not send';
        link.style.color = '#991b1b';
      });
  }

  function attach() {
    var found = blocks();
    if (!found.length) return;
    for (var i = 0; i < found.length; i++) {
      (function (node, n) {
        try {
          if (node.getAttribute('data-apcs-flagged') === '1') return;
          node.setAttribute('data-apcs-flagged', '1');

          var link = document.createElement('button');
          link.type = 'button';
          link.textContent = 'Flag this question';
          /* Inline styles rather than a stylesheet: this script writes no CSS
           * into the document, so it cannot bleed into a theme that has already
           * been broken once by sitewide CSS. */
          link.style.cssText = 'display:inline-block;margin:8px 0 0;padding:0;background:none;border:0;'
            + 'font:inherit;font-size:12px;line-height:1.4;color:#6b7280;text-decoration:underline;cursor:pointer;';
          /* The question id is the page handle plus this block's position, which
           * is stable for a given page and needs nothing added to the markup. */
          var qid = handle() + '#q' + (n + 1);
          link.setAttribute('data-question-id', qid);
          link.onclick = function () { link.onclick = null; send(qid, link); };
          node.appendChild(link);
        } catch (e) { /* one block failing must not cost the others */ }
      })(found[i], i);
    }
  }

  function boot() {
    if (!onAssessmentPage()) return attach();

    /* Graded quiz: wait for the results panel, then attach. If the page never
     * shows one, no links are ever added, which is the correct outcome. */
    var panel = resultsPanel();
    if (panel && visible(panel)) return attach();

    var obs;
    try {
      obs = new MutationObserver(function () {
        var p = resultsPanel();
        if (p && visible(p)) { obs.disconnect(); attach(); }
      });
      obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
    } catch (e) { /* no MutationObserver: no flag links on quiz pages */ }

    /* A page that never submits should not hold an observer forever on a box
     * with a memory incident on record. */
    setTimeout(function () { try { if (obs) obs.disconnect(); } catch (e) { /* gone */ } }, 30 * 60 * 1000);
  }

  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  } catch (e) { /* never break the page */ }
})();
