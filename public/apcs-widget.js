/* apcs-widget.js - the Site Assistant corner button.
 *
 * Mounted by the theme, ONE line, in theme.liquid:
 *   <script src="https://progress.apcsexamprep.com/apcs-widget.js?v=..." defer></script>
 *
 * The ?v= is not decoration. TODO #241: Cloudflare returns every JS asset this
 * server sends with max-age=14400 no matter what the route asks for, so a fix
 * shipped here takes up to four hours to reach a browser and looks like a failed
 * deploy. The version token is how a fix jumps that queue, and the snippet gets
 * it from GET /api/assistant/widget-version.
 *
 * DO NOT MOUNT ON QUIZ, EXAM OR PRACTICE-TEST PAGES. The theme excludes those
 * templates, and onAssessmentPage() below refuses a second time in case the tag
 * lands there anyway. Two locks, because one of them is a Liquid condition
 * somebody can edit without knowing why it is there.
 *
 * IT MUST NEVER BREAK A LESSON PAGE. Every entry point is wrapped, and any
 * failure removes the widget rather than surfacing an error. A support affordance
 * that takes the page down with it is worse than no support affordance.
 *
 * ALL UI IS IN A SHADOW ROOT. The theme reverts colors globally, aggressively,
 * and has done since before this file existed; a shadow root is the only thing
 * that has reliably survived it. Nothing here writes a style into the document.
 *
 * Handoff sections 4.1 to 4.4. No em-dashes, no non-ASCII: this file is served
 * to browsers and mirrored into a repo that requires pure ASCII.
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

  /* Adopt anything the theme stub buffered BEFORE this file arrived. A script
   * tag cannot catch an error that fired while it was still downloading, and on
   * a page that is broken on load that is precisely the error worth having. */
  try {
    var pre = window.APCS_ERRORS;
    if (pre && pre.length) for (var i = 0; i < pre.length; i++) note(pre[i]);
  } catch (e) { /* no stub, or it is not an array */ }

  /* ---- second line of defence on assessment pages ------------------------
   * The server derives scope authoritatively from the same URL; this only stops
   * the widget appearing next to a graded item if the theme mounted it by
   * mistake. Anchored at the end so a slug like "collaboration" never trips it.
   */
  function onAssessmentPage() {
    try {
      var p = (location.pathname || '').toLowerCase().replace(/\/+$/, '');
      /* Ends in -quiz or -exam. */
      if (/-(quiz|exam)$/.test(p)) return true;
      /* Names a test ANYWHERE in the handle, after a slash OR a hyphen.
       *
       * The second delimiter is the fix. apcs-report.js has carried
       * /\/(unit-test|practice-exam|practice-test)/ since Phase 0, which requires
       * a SLASH before the term, and the storefront does not name pages that way:
       * measured against the live sitemap on 2026-09-17, 62 pages carry one of
       * these three words after a HYPHEN, including
       * /pages/ap-csa-practice-test-2d-arrays and /pages/ap-csp-unit-test-1.
       * Every one of them is a page the widget was mounting on.
       *
       * Deliberately over-broad at the edges: this also catches a hub page like
       * /pages/ap-csa-practice-exams. A missing corner button on an index page
       * costs nothing; a support widget beside a graded item is the thing the
       * rule exists to prevent. */
      return /(^|[/-])(unit-test|practice-exam|practice-test)([/-]|s?$)/.test(p);
    } catch (e) { return true; } /* cannot tell: assume yes and stay away */
  }

  /* ---- the caller's own token, if the storefront has one ------------------
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

  /* The five user-facing choices from handoff 4.2, in its words, mapped onto
   * the server's enum. The server is the authority on the enum and refuses
   * anything not in it, so a drift here is a 400 rather than a bad row. */
  var PROBLEMS = [
    ['bug_report', "Something's broken"],
    ['content_error', 'A question or answer looks wrong'],
    ['access_not_showing', "I can't get into what I bought"],
    ['student_join_failure', "My students can't join"],
    ['gradebook_missing_scores', 'Scores look wrong']
  ];

  /* Extra fields per category, 4.2. Only access_not_showing has any today. */
  var EXTRA = {
    access_not_showing: [
      ['purchaseChannel', 'Where did you buy it? (school PO, card, TpT, other)'],
      ['orderRef', 'Order number or PO number, if you have it']
    ],
    student_join_failure: [['classCode', 'Class code']],
    gradebook_missing_scores: [['classCode', 'Class code'], ['lesson', 'Which lesson']]
  };

  /* ---- DOM helpers. textContent only, never innerHTML with a value that came
   * from anywhere but this file. CONVENTIONS.md: a live XSS is why. */
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) n.setAttribute(k, attrs[k]);
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  var CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}',
    '.btn{position:fixed;left:18px;bottom:18px;z-index:2147483000;background:#1d4ed8;color:#fff;border:0;',
    'border-radius:999px;padding:11px 17px;font-size:14px;font-weight:600;cursor:pointer;',
    'box-shadow:0 2px 10px rgba(0,0,0,.28)}',
    '.btn:hover{background:#1e40af}',
    '.panel{position:fixed;left:18px;bottom:70px;z-index:2147483000;width:340px;max-width:calc(100vw - 36px);',
    'max-height:min(78vh,620px);overflow:auto;background:#fff;color:#111827;border:1px solid #d1d5db;',
    'border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.22);padding:16px}',
    '.hd{display:flex;align-items:center;justify-content:space-between;margin:0 0 10px}',
    '.hd h2{margin:0;font-size:15px;font-weight:700;color:#111827}',
    '.x{background:none;border:0;font-size:20px;line-height:1;cursor:pointer;color:#6b7280;padding:0 2px}',
    '.choice{display:block;width:100%;text-align:left;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;',
    'padding:11px 12px;margin:0 0 8px;font-size:14px;cursor:pointer;color:#111827}',
    '.choice:hover{background:#eff6ff;border-color:#bfdbfe}',
    'label{display:block;font-size:12px;font-weight:600;margin:10px 0 4px;color:#374151}',
    'textarea,input[type=text],input[type=email],select{width:100%;padding:8px;font-size:14px;color:#111827;',
    'background:#fff;border:1px solid #d1d5db;border-radius:6px}',
    'textarea{min-height:82px;resize:vertical}',
    '.send{margin-top:12px;width:100%;background:#1d4ed8;color:#fff;border:0;border-radius:8px;padding:10px;',
    'font-size:14px;font-weight:600;cursor:pointer}',
    '.send:disabled{background:#9ca3af;cursor:default}',
    '.back{background:none;border:0;color:#2563eb;font-size:12px;cursor:pointer;padding:0;margin-bottom:6px}',
    '.note{font-size:12px;color:#6b7280;margin:8px 0 0;line-height:1.45}',
    '.ok{font-size:14px;color:#065f46;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:11px}',
    '.err{font-size:13px;color:#991b1b;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:9px;margin-top:8px}',
    '.hit{display:block;padding:9px 10px;border:1px solid #e5e7eb;border-radius:8px;margin:0 0 7px;',
    'text-decoration:none;color:#1d4ed8;font-size:14px}',
    '.hit:hover{background:#eff6ff}',
    '.hit small{display:block;color:#6b7280;font-size:11px;margin-top:2px}'
  ].join('');

  //  STAYING OUT OF THE WAY OF THE AD STACK
  //
  //  Measured on a live lesson page 2026-09-18, viewport 1365x911:
  //
  //      AdThrive_Footer_1_desktop   [0, 811, 1350, 100]   z 1000001
  //      celtraCloseButton           [1318, 820, 42, 42]   z 2147483647
  //      raptive-sales               [0, 0, 1350, 911]     z 2147483645
  //
  //  The footer banner is FULL WIDTH and 100px tall, so the old bottom:18px sat
  //  under it on both sides. The ad's own close button sat exactly where the
  //  pill was. Hence the move to the left, and hence a lift.
  //
  //  The lift is PROBED, not hardcoded, and that is the part worth keeping. A
  //  fixed 120px is right for this banner on this viewport and wrong on a phone,
  //  where the same banner eats a far bigger share of a short screen, and wrong
  //  again the next time the ad layout changes. So instead of measuring
  //  rectangles and doing geometry, ask the browser the question we actually
  //  care about: if somebody clicked here, would the click reach us? Step up
  //  until the answer is yes.
  //
  //  Probing also sidesteps a trap that geometry walks straight into.
  //  raptive-sales is a FULL VIEWPORT fixed div with pointer-events auto and a
  //  z-index above ours, so a rectangle check calls every point on the page
  //  obstructed and the pill climbs to the ceiling. It does not intercept in
  //  practice, because z-index only orders siblings within a stacking context
  //  and that number is not comparable to ours. elementFromPoint knows this and
  //  arithmetic does not.
  //
  //  Never fight for z-index here. We sit BELOW the ad close button on purpose:
  //  covering the control somebody needs to dismiss an ad would be a worse bug
  //  than the one this fixes.
  var BASE_BOTTOM = 18, STEP = 22, MAX_STEPS = 12;

  function placeWidget(host, btn, panel) {
    if (!btn) return;
    var ceiling = Math.max(120, Math.round(window.innerHeight * 0.55));
    var bottom = BASE_BOTTOM;
    for (var i = 0; i < MAX_STEPS; i += 1) {
      var candidate = BASE_BOTTOM + i * STEP;
      if (candidate > ceiling) break;
      btn.style.setProperty('bottom', candidate + 'px', 'important');
      var r = btn.getBoundingClientRect();
      if (!r.width || !r.height) return;   /* hidden: nothing to place */
      var hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      bottom = candidate;
      if (hit === host || (hit && host.contains(hit))) break;
    }
    btn.style.setProperty('bottom', bottom + 'px', 'important');
    if (panel) {
      var h = btn.getBoundingClientRect().height || 38;
      panel.style.setProperty('bottom', (bottom + h + 12) + 'px', 'important');
    }
  }

  function boot() {
    if (onAssessmentPage()) return;
    if (document.getElementById('apcs-assistant-root')) return;

    var host = el('div', { id: 'apcs-assistant-root' });

    /*  THE SHADOW ROOT PROTECTS WHAT IS INSIDE IT. NOTHING PROTECTED THE HOST.
     *
     *  Measured on a live page 2026-09-18, the day this shipped: the script
     *  loaded, boot() ran clean, window.APCS_ERRORS was empty, the host was in
     *  the DOM and the .btn inside the shadow root computed as display:block,
     *  visibility:visible, opacity:1, z-index 2147483000. The pill still did
     *  not paint, because the HOST computed display:none, so the whole subtree
     *  collapsed to a 0x0 rect.
     *
     *  It was not our CSS. Walking every readable stylesheet for a rule
     *  matching the host returned nothing, and the host carried no inline
     *  style. Forcing display back put the pill in the corner instantly. So
     *  the source was something the page cannot see: an extension cosmetic
     *  filter, an adopted stylesheet, an ad stack. All three are outside this
     *  repo and none of them is going to stop.
     *
     *  ':host { all: initial }' cannot defend this. It sets the host's INITIAL
     *  values, and any author rule beats an initial value. The host's own box
     *  therefore has to be stated the one way that outranks an author rule,
     *  which is inline and !important.
     *
     *  Only the three properties that HIDE a box are pinned. Position, size and
     *  stacking stay in the shadow CSS where they belong: this is armour, not a
     *  second opinion about layout.  */
    host.style.setProperty('display', 'block', 'important');
    host.style.setProperty('visibility', 'visible', 'important');
    host.style.setProperty('opacity', '1', 'important');

    document.body.appendChild(host);
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : null;
    if (!root) { host.remove(); return; }   /* no shadow DOM: no widget, no mess */

    var style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);

    var panel = null;
    var ctx = { textStored: true, suggestionsAllowed: true };

    var btn = el('button', { class: 'btn', type: 'button', 'aria-haspopup': 'dialog' }, 'Help / report');
    root.appendChild(btn);

    /* What the form may offer THIS caller. The server decides, because scope
     * decides whether typed text is kept and a client-asserted scope would be a
     * client-asserted privacy posture. */
    function loadContext(done) {
      try {
        fetch(API + '/api/assistant/report/context?pageUrl=' + encodeURIComponent(location.pathname), { headers: headers(false) })
          .then(function (r) { return r.json(); })
          .then(function (j) { if (j) ctx = j; done(); })
          .catch(function () { done(); });
      } catch (e) { done(); }
    }

    function close() { if (panel) { panel.remove(); panel = null; } }

    function open(render) {
      close();
      panel = el('div', { class: 'panel', role: 'dialog', 'aria-label': 'Help and reporting' });
      root.appendChild(panel);
      placeWidget(host, btn, panel);
      render();
    }

    function head(title, onBack) {
      panel.textContent = '';
      if (onBack) {
        var b = el('button', { class: 'back', type: 'button' }, 'Back');
        b.onclick = onBack;
        panel.appendChild(b);
      }
      var hd = el('div', { class: 'hd' });
      hd.appendChild(el('h2', null, title));
      var x = el('button', { class: 'x', type: 'button', 'aria-label': 'Close' }, '\u00d7');
      x.onclick = close;
      hd.appendChild(x);
      panel.appendChild(hd);
    }

    /* ---- the three choices, handoff 4.1 --------------------------------- */
    function menu() {
      head('How can we help?');
      var items = [['Report a problem', problemMenu], ['Suggest something', suggest], ['Help me find a page', finder]];
      for (var i = 0; i < items.length; i++) {
        (function (item) {
          if (item[0] === 'Suggest something' && ctx.suggestionsAllowed === false) return;
          var b = el('button', { class: 'choice', type: 'button' }, item[0]);
          b.onclick = item[1];
          panel.appendChild(b);
        })(items[i]);
      }
    }

    /* ---- 4.2 report a problem ------------------------------------------- */
    function problemMenu() {
      head('What went wrong?', menu);
      for (var i = 0; i < PROBLEMS.length; i++) {
        (function (p) {
          var b = el('button', { class: 'choice', type: 'button' }, p[1]);
          b.onclick = function () { reportForm(p[0], p[1]); };
          panel.appendChild(b);
        })(PROBLEMS[i]);
      }
    }

    function reportForm(category, label, prefill) {
      head(label, problemMenu);

      panel.appendChild(el('label', { for: 'd' }, 'What happened?'));
      var ta = el('textarea', { id: 'd' });
      if (prefill) ta.value = prefill;
      panel.appendChild(ta);

      var extras = EXTRA[category] || [];
      var inputs = {};
      for (var i = 0; i < extras.length; i++) {
        panel.appendChild(el('label', null, extras[i][1]));
        var inp = el('input', { type: 'text' });
        inputs[extras[i][0]] = inp;
        panel.appendChild(inp);
      }

      panel.appendChild(el('label', null, 'Want to know when it is fixed?'));
      var email = el('input', { type: 'email', placeholder: 'Your email (optional)' });
      panel.appendChild(email);

      var send = el('button', { class: 'send', type: 'button' }, 'Send');
      panel.appendChild(send);

      /* Honest BEFORE they type, not after. Inviting somebody to describe a
       * problem and then discarding the description is worse behaviour than not
       * offering the box, even though the privacy outcome is identical. */
      if (ctx.textStored === false) {
        panel.appendChild(el('p', { class: 'note' },
          'On lesson and quiz pages we keep the page address and what your browser reported, not what you type. Send it anyway if it helps you explain.'));
      }

      send.onclick = function () {
        send.disabled = true;
        send.textContent = 'Sending';
        var fields = {};
        for (var k in inputs) if (inputs[k].value.trim()) fields[k] = inputs[k].value.trim();
        post({
          category: category,
          description: ta.value,
          reporterEmail: email.value.trim() || undefined,
          fields: fields
        }, function (res) {
          if (!res || !res.ok) return fail(send, 'Send');
          /* Handoff 4.2: ONE follow-up question when the model called it vague,
           * and never more than one. */
          if (res.followUp) return followUp(category, ta.value, email.value.trim());
          thanks();
        });
      };
    }

    function followUp(category, first, email) {
      head('One more thing', menu);
      panel.appendChild(el('p', { class: 'note' },
        'That was sent. One question so somebody can find it: what did you click, and what happened instead of what you expected?'));
      var ta = el('textarea', null);
      panel.appendChild(ta);
      var send = el('button', { class: 'send', type: 'button' }, 'Add this');
      panel.appendChild(send);
      send.onclick = function () {
        send.disabled = true;
        send.textContent = 'Sending';
        post({
          category: category,
          description: first + '\n\nFollow-up: ' + ta.value,
          reporterEmail: email || undefined
        }, function () { thanks(); });   /* whatever they give, submit it, then stop */
      };
    }

    /* ---- 4.3 suggest something ------------------------------------------ */
    function suggest() {
      head('Suggest something', menu);
      panel.appendChild(el('label', null, 'What would you change?'));
      var ta = el('textarea', null);
      panel.appendChild(ta);
      panel.appendChild(el('label', null, 'Email, if you want a reply'));
      var email = el('input', { type: 'email', placeholder: 'Optional' });
      panel.appendChild(email);
      var send = el('button', { class: 'send', type: 'button' }, 'Send');
      panel.appendChild(send);
      send.onclick = function () {
        send.disabled = true;
        send.textContent = 'Sending';
        post({ category: 'suggestion', description: ta.value, reporterEmail: email.value.trim() || undefined },
          function (res) { if (!res || !res.ok) return fail(send, 'Send'); thanks(); });
      };
    }

    /* ---- 4.4 help me find a page ----------------------------------------
     * Renders LINKS AND NOTHING ELSE. Every href comes from the response, which
     * the server has already checked against the page index; this side adds no
     * URL of its own and builds none by string concatenation. */
    function finder() {
      head('Find a page', menu);
      panel.appendChild(el('label', null, 'What are you looking for?'));
      var q = el('input', { type: 'text', placeholder: 'the CSA loops lesson' });
      panel.appendChild(q);
      var go = el('button', { class: 'send', type: 'button' }, 'Search');
      panel.appendChild(go);
      var out = el('div', null);
      panel.appendChild(out);

      function run() {
        out.textContent = '';
        var term = q.value.trim();
        if (!term) return;
        go.disabled = true;
        go.textContent = 'Searching';
        fetch(API + '/api/assistant/find?q=' + encodeURIComponent(term), { headers: headers(false) })
          .then(function (r) { return r.json(); })
          .then(function (j) {
            go.disabled = false;
            go.textContent = 'Search';
            var hits = (j && j.results) || [];
            if (!hits.length) {
              out.appendChild(el('p', { class: 'note' }, "Couldn't find it. Want to report that?"));
              var b = el('button', { class: 'choice', type: 'button' }, 'Report a missing page');
              b.onclick = function () { reportForm('bug_report', 'Report a missing page', 'I was looking for: ' + term); };
              out.appendChild(b);
              return;
            }
            for (var i = 0; i < hits.length; i++) {
              var a = el('a', { class: 'hit', href: hits[i].url || hits[i].path }, hits[i].title);
              a.appendChild(el('small', null, (hits[i].course || 'site') + ' ' + (hits[i].type || '')));
              out.appendChild(a);
            }
          })
          .catch(function () {
            go.disabled = false;
            go.textContent = 'Search';
            out.appendChild(el('p', { class: 'err' }, 'Search is not available right now.'));
          });
      }
      go.onclick = run;
      q.onkeydown = function (e) { if (e && e.key === 'Enter') run(); };
    }

    /* ---- shared ---------------------------------------------------------- */
    function post(body, done) {
      var payload = {
        category: body.category,
        description: body.description,
        pageUrl: location.pathname + location.search,
        pageTitle: (document.title || '').slice(0, 200),
        consoleErrors: errors.slice(0, MAX_ERRORS)
      };
      if (body.reporterEmail) payload.reporterEmail = body.reporterEmail;
      if (body.fields) payload.fields = body.fields;
      fetch(API + '/api/assistant/report', { method: 'POST', headers: headers(true), body: JSON.stringify(payload) })
        .then(function (r) { return r.json().catch(function () { return null; }); })
        .then(function (j) { done(j); })
        .catch(function () { done(null); });
    }

    function fail(send, label) {
      send.disabled = false;
      send.textContent = label;
      if (!panel.querySelector('.err')) {
        panel.appendChild(el('p', { class: 'err' }, 'That did not send. Please try again in a moment.'));
      }
    }

    function thanks() {
      head('Thanks');
      panel.appendChild(el('p', { class: 'ok' }, 'Sent. Somebody will look at this.'));
    }

    btn.onclick = function () {
      if (panel) return close();
      loadContext(function () { open(menu); });
    };

    //  Place it now, and again as the ad stack fills in. The footer banner and
    //  the sticky player arrive well after load, so a single pass at boot would
    //  measure an empty corner and park the pill straight back underneath them.
    //  Three delayed passes rather than a standing observer or a timer: the ads
    //  settle within a few seconds, and a widget that re-measures forever on a
    //  1 vCPU box is the kind of thing that turns into a bill.
    function replace() { try { placeWidget(host, btn, panel); } catch (e) { /* never break the page */ } }
    replace();
    setTimeout(replace, 1200);
    setTimeout(replace, 4000);
    setTimeout(replace, 9000);
    addEventListener('resize', replace);
  }

  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  } catch (e) {
    try { var h = document.getElementById('apcs-assistant-root'); if (h) h.remove(); } catch (e2) { /* nothing left to do */ }
  }
})();
