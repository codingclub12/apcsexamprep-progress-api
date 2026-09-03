/* apcs-report.js - Site assistant Phase 0: "report a problem with this page".
 *
 * Mount from theme.liquid, on lessons, labs, hubs, commerce and the portal:
 *   <script src="https://progress.apcsexamprep.com/apcs-report.js" defer></script>
 *
 * DO NOT mount it on quiz, exam or practice-test templates. The tag must be
 * ABSENT there, not disabled: a page that never loads this has no endpoint to
 * reach from. The guard below is a second line of defence for a mis-templated
 * page, not the control.
 *
 * WHAT IT SENDS: the page URL, the page title, the category the person picked,
 * an optional description, and any errors the browser logged since load.
 * It NEVER reads page content. There is no code path here that touches
 * document body text, form values, or anything a student answered, because on a
 * lesson page that content is the answer key.
 *
 * ASCII ONLY. No emoji, no smart quotes, nothing above 127. This codebase has
 * repeated mojibake incidents from Matrixify imports and this file is served
 * next to those pages.
 *
 * It must never break a lesson page. Every entry point is wrapped, and any
 * failure removes the widget rather than surfacing an error.
 */
(function () {
  'use strict';

  var API = (window.APCS_API || 'https://progress.apcsexamprep.com').replace(/\/+$/, '');
  var MAX_ERRORS = 10;
  var errors = [];

  /* ---- error buffer, installed first so it catches the most ---------------
   * Passive: it records and always returns false, so it never suppresses a
   * handler the page already had. Bounded, because an error inside a render
   * loop can fire thousands of times.
   */
  function note(msg) {
    try {
      if (errors.length >= MAX_ERRORS) return;
      var s = String(msg).slice(0, 500);
      if (errors.indexOf(s) === -1) errors.push(s);
    } catch (e) { /* never let the recorder throw */ }
  }
  window.addEventListener('error', function (e) {
    note((e && e.message ? e.message : 'error') + (e && e.filename ? ' @ ' + e.filename + ':' + (e.lineno || 0) : ''));
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    note('unhandled rejection: ' + ((e && e.reason && e.reason.message) || (e && e.reason) || 'unknown'));
  });

  /* Adopt anything a theme stub buffered BEFORE this file arrived.
   *
   * A script tag cannot catch an error that fired while it was still being
   * downloaded, and on a page that is broken on load that is precisely the
   * error worth having. Verified: a page that throws 10ms after parse reports
   * an empty console to a widget that is still in flight. So theme.liquid puts
   * this in <head>, ahead of everything, and the widget picks up what it
   * collected:
   *
   *   <script>window.APCS_ERRORS=[];addEventListener('error',function(e){
   *   if(window.APCS_ERRORS.length<10)window.APCS_ERRORS.push((e.message||'error')
   *   +' @ '+(e.filename||'')+':'+(e.lineno||0));},true);</script>
   *
   * The stub is optional. Without it the widget still works and still catches
   * everything from its own load onward.
   */
  try {
    var pre = window.APCS_ERRORS;
    if (pre && pre.length) for (var i = 0; i < pre.length; i++) note(pre[i]);
  } catch (e) { /* no stub, or it is not an array */ }

  /* ---- second line of defence on assessment pages -------------------------
   * The server derives scope authoritatively from the same URL; this only stops
   * the widget appearing next to a graded item if the theme mounted it by
   * mistake. Anchored at the end so a slug like "collaboration" never trips it.
   */
  function onAssessmentPage() {
    try {
      var p = (location.pathname || '').toLowerCase().replace(/\/+$/, '');
      return /-(quiz|exam)$/.test(p) || /\/(unit-test|practice-exam)/.test(p);
    } catch (e) { return true; } /* cannot tell: assume yes and stay away */
  }

  /* ---- the caller's own token, if the storefront has one -------------------
   * Student key FIRST. Reading the teacher key first is exactly what broke the
   * quiz mount for every signed-in teacher; see
   * docs/runs/2026-08-28-claude-cyber-1-1-quiz-gating.md.
   */
  var TOKEN_KEYS = ['apcse_token', 'apcs_student_token', 'student_token', 'apcse_teacher_token', 'apcs_teacher_token', 'teacher_token'];
  function token() {
    for (var i = 0; i < TOKEN_KEYS.length; i++) {
      try {
        var v = window.localStorage.getItem(TOKEN_KEYS[i]);
        if (v) return v;
      } catch (e) { /* storage blocked: stay anonymous */ }
    }
    return null;
  }

  function headers(json) {
    var h = {};
    if (json) h['Content-Type'] = 'application/json';
    var t = token();
    if (t) h.Authorization = 'Bearer ' + t;
    return h;
  }

  var LABELS = {
    bug_report: 'Something on this page is broken',
    content_error: 'The content here looks wrong',
    progression_gate: 'Something is locked and I do not know why',
    access_not_showing: 'I paid but my course is not showing',
    student_join_failure: 'My students cannot join or sign in',
    gradebook_missing_scores: 'Scores are missing from my gradebook',
    assessment_visibility: 'Students can see something they should not',
    password_reset: 'I cannot reset my password',
    it_whitelisting: 'Our school network is blocking the site',
    procurement: 'Purchase order, W-9 or invoicing',
    presale: 'A question before buying',
    pacing_selfstudy: 'Pacing or self-study question',
    other: 'Something else'
  };

  var CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}',
    '.fab{position:fixed;right:16px;bottom:16px;z-index:2147483000;background:#2a78d6;color:#fff;',
    'border:0;border-radius:999px;padding:10px 16px;font-size:14px;font-weight:600;cursor:pointer;',
    'box-shadow:0 2px 10px rgba(0,0,0,.25)}',
    '.fab:hover{background:#1f5fab}',
    '.fab:focus-visible{outline:3px solid #ffb703;outline-offset:2px}',
    /* Clear of the Raptive anchor ad, which sits at the very bottom on mobile. */
    '@media (max-width:600px){.fab{bottom:96px;right:12px;padding:9px 13px;font-size:13px}}',
    '.panel{position:fixed;right:16px;bottom:70px;z-index:2147483000;width:340px;max-width:calc(100vw - 24px);',
    'background:#fff;color:#0b0b0b;border:1px solid #d7d7d4;border-radius:12px;padding:14px;',
    'box-shadow:0 8px 30px rgba(0,0,0,.22)}',
    '@media (max-width:600px){.panel{bottom:150px;right:12px}}',
    'h2{margin:0 0 8px;font-size:15px;font-weight:700}',
    'label{display:block;font-size:12px;font-weight:600;margin:10px 0 4px}',
    'select,textarea{width:100%;font-size:14px;padding:7px;border:1px solid #c9c9c6;border-radius:7px;background:#fff;color:#0b0b0b}',
    'textarea{min-height:74px;resize:vertical}',
    '.note{font-size:11px;color:#52514e;margin-top:6px;line-height:1.4}',
    '.row{display:flex;gap:8px;margin-top:12px}',
    'button.go{flex:1;background:#2a78d6;color:#fff;border:0;border-radius:7px;padding:9px;font-size:14px;font-weight:600;cursor:pointer}',
    'button.go[disabled]{background:#9bb8dc;cursor:default}',
    'button.cancel{background:#f2f2ef;color:#0b0b0b;border:1px solid #d7d7d4;border-radius:7px;padding:9px 12px;font-size:14px;cursor:pointer}',
    '.done{font-size:13px;line-height:1.5}',
    '.ref{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:#52514e;word-break:break-all}',
    '@media (prefers-reduced-motion:no-preference){.panel{animation:pop .12s ease-out}}',
    '@keyframes pop{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}'
  ].join('');

  function boot() {
    if (onAssessmentPage()) return;

    var host = document.createElement('div');
    host.setAttribute('data-apcs-report', '');
    var root = host.attachShadow({ mode: 'open' });
    var style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);

    var fab = document.createElement('button');
    fab.className = 'fab';
    fab.type = 'button';
    fab.textContent = 'Report a problem';
    fab.setAttribute('aria-haspopup', 'dialog');
    root.appendChild(fab);
    document.body.appendChild(host);

    var panel = null;
    var ctx = null;

    function close() {
      if (panel) { panel.remove(); panel = null; }
      fab.style.display = '';
      try { fab.focus(); } catch (e) {}
    }

    /* Focus trap: Tab cycles inside the panel while it is open, Escape closes.
     * A dialog a keyboard user can fall out of is a dialog they cannot leave. */
    function trap(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab' || !panel) return;
      var items = panel.querySelectorAll('select,textarea,button');
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      var active = root.activeElement;
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    }

    function open() {
      if (panel) return;
      fab.style.display = 'none';
      panel = document.createElement('div');
      panel.className = 'panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-label', 'Report a problem with this page');
      panel.addEventListener('keydown', trap);

      var opts = (ctx.categories || []).map(function (c) {
        return '<option value="' + c + '">' + (LABELS[c] || c) + '</option>';
      }).join('');

      /* The honest part. Someone whose words will not be kept is told so before
       * they type, not after they submit. */
      var textBlock = ctx.textStored
        ? '<label for="d">What went wrong? (optional)</label>' +
          '<textarea id="d" maxlength="2000"></textarea>'
        : '<p class="note">We do not save typed messages from this page, so there is no' +
          ' message box. Your choice above plus the page address and any browser errors' +
          ' are sent, which is what we need to reproduce it.</p>';

      panel.innerHTML =
        '<h2>Report a problem</h2>' +
        '<label for="c">What is happening?</label>' +
        '<select id="c">' + opts + '</select>' +
        textBlock +
        '<p class="note">We also send this page address and any errors your browser' +
        ' recorded. We never send your answers or anything else on the page.</p>' +
        '<div class="row"><button class="go" type="button">Send report</button>' +
        '<button class="cancel" type="button">Cancel</button></div>' +
        '<div aria-live="polite"></div>';

      root.appendChild(panel);
      var sel = panel.querySelector('#c');
      var desc = panel.querySelector('#d');
      var go = panel.querySelector('.go');
      var live = panel.querySelector('[aria-live]');
      panel.querySelector('.cancel').addEventListener('click', close);
      try { sel.focus(); } catch (e) {}

      go.addEventListener('click', function () {
        go.disabled = true;
        live.textContent = 'Sending...';
        var payload = {
          category: sel.value,
          pageUrl: location.href.slice(0, 500),
          pageTitle: (document.title || '').slice(0, 200),
          consoleErrors: errors.slice(0, MAX_ERRORS)
        };
        if (desc && desc.value) payload.description = desc.value;

        fetch(API + '/api/assistant/report', {
          method: 'POST', headers: headers(true), body: JSON.stringify(payload)
        }).then(function (r) { return r.json().catch(function () { return null; }); })
          .then(function (out) {
            if (!out || !out.ok) {
              live.textContent = (out && out.error) || 'That did not send. Please try again shortly.';
              go.disabled = false;
              return;
            }
            panel.innerHTML = '<h2>Thank you</h2><p class="done">This is logged and someone will' +
              ' look at it. Reference:</p><p class="ref">' + String(out.id).replace(/[^\w-]/g, '') +
              '</p><div class="row"><button class="cancel" type="button">Close</button></div>';
            panel.querySelector('.cancel').addEventListener('click', close);
            panel.querySelector('.cancel').focus();
          })
          .catch(function () {
            live.textContent = 'That did not send. Please try again shortly.';
            go.disabled = false;
          });
      });
    }

    fab.addEventListener('click', function () {
      if (ctx) { open(); return; }
      /* Ask the server what this caller may do before rendering the form. If it
       * cannot be reached, remove the widget entirely: a button that does
       * nothing is worse on a lesson page than no button. */
      fetch(API + '/api/assistant/report/context?pageUrl=' + encodeURIComponent(location.href), { headers: headers(false) })
        .then(function (r) { return r.json(); })
        .then(function (out) {
          if (!out || !out.categories) throw new Error('no context');
          ctx = out;
          open();
        })
        .catch(function () { host.remove(); });
    });
  }

  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { try { boot(); } catch (e) {} });
    } else {
      boot();
    }
  } catch (e) { /* the page is more important than the widget */ }
})();
