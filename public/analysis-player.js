/* eslint-disable */
// ─────────────────────────────────────────────────────────────────────────────
//  ANALYSIS PLAYER: renders a server-held analysis activity into a page.
//
//  The activity it renders used to BE the page. Moving it here is what makes a
//  teacher's lock real, so two rules follow and neither is negotiable:
//
//  1. IT SENDS THE STUDENT TOKEN. A gate cannot be applied to a request the
//     server cannot attribute to a class. The lab player shipped without this
//     once and a closed lab stayed open for everyone; the token is optional, so
//     anonymous practice still works, but it is SENT when it exists.
//
//     SENDING IT MEANS FINDING IT. Supplying the header is only half: the 1.1
//     page named a localStorage key nothing writes, so this player dutifully sent
//     nothing and a signed-in student was served as a passer-by. See token().
//  2. IT NEVER BUILDS MARKUP FROM AUTHOR STRINGS. Paragraphs arrive as token
//     lists and are rendered with createTextNode, so no content file can inject
//     HTML into a student's page.
//
//  It writes the running score into #totalScore and #finalScore, the same ids
//  the page used, because the storefront's existing score reporter reads them.
//  The grade path is therefore untouched by this migration.
//
//  ES5, no build step, loadable cross origin.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';

  var conf = window.APCS_ANALYSIS || {};
  var BASE = conf.base || '';

  //  THE CONFIGURED getToken IS A HINT, NOT THE ONLY SOURCE, and that changed on
  //  2026-09-14 because the page got it wrong and nothing said so.
  //
  //  The 1.1 lab page supplies a getToken reading localStorage 'apcs_student_token'
  //  and nothing else. Nothing WRITES that key: shopify/join.html sets
  //  'apcse_token' at sign-in and every one of the theme's 20 token references
  //  reads that one. So a signed-in student sent no Authorization header, the
  //  server saw an anonymous request, and the teacher's lock could not bind them.
  //
  //  It stayed invisible for a week because the anonymous rule in force until
  //  board 277 refused anonymous callers anyway, so the page LOOKED locked and
  //  the missing token changed nothing anybody could see. Opening the anonymous
  //  case exposed it the same day, reported as "it didn't lock when the teacher
  //  locked it for a student".
  //
  //  So an EMPTY answer from the configured getToken falls through to the same
  //  resolution the lab player has always had. That is what repairs the live page
  //  on a deploy rather than on a Matrixify import, and page bodies are the
  //  expensive half: a key list in a page body costs a live MERGE to change,
  //  while this file costs a push. lib/student-token-keys.js is the authority for
  //  the list and smoke:studenttokenkeys fails if this drifts from it.
  function fallbackToken() {
    try {
      return window.APCS_STUDENT_TOKEN ||
        localStorage.getItem('apcse_token') ||
        localStorage.getItem('apcs_student_token') ||
        localStorage.getItem('student_token') || '';
    } catch (e) { return ''; }
  }

  function token() {
    var configured = '';
    try { configured = (conf.getToken && conf.getToken()) || ''; } catch (e) { configured = ''; }
    return configured || fallbackToken();
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.appendChild(document.createTextNode(String(text)));
    return n;
  }

  //  A paragraph is a token list, never a string of HTML.
  function paragraph(tokens) {
    var p = el('p');
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (t.t === 'br') { p.appendChild(document.createElement('br')); continue; }
      if (t.t === 'link') {
        var s = el('span', 'e-link', t.v);
        //  The hover target is the teaching point: the visible text and the real
        //  destination disagree. It is a title, never an href, so nothing here
        //  is clickable and no student is one mis-tap from a fake domain.
        s.setAttribute('title', 'Hover: ' + t.href);
        p.appendChild(s);
        continue;
      }
      if (t.t === 'bold') { p.appendChild(el('span', 'e-bold', t.v)); continue; }
      if (t.t === 'em') { p.appendChild(el('em', null, t.v)); continue; }
      p.appendChild(document.createTextNode(t.v));
    }
    return p;
  }

  function specimenNode(act, sp, onCheck) {
    var wrap = el('div', 'lab-section');
    wrap.id = 'email' + sp.n + '-section';
    wrap.appendChild(el('h2', null, 'Email Specimen #' + sp.n + ', Difficulty: ' + sp.difficulty));

    var spec = el('div', 'email-specimen');
    var bar = el('div', 'email-bar');
    var dots = ['r', 'y', 'g'];
    for (var d = 0; d < dots.length; d++) bar.appendChild(el('span', 'email-dot ' + dots[d]));
    bar.appendChild(el('span', 'email-bar-title', sp.bar_title));
    spec.appendChild(bar);

    var meta = el('div', 'email-meta');
    for (var m = 0; m < sp.meta.length; m++) {
      if (m) meta.appendChild(document.createElement('br'));
      meta.appendChild(el('strong', null, sp.meta[m].label + ':'));
      meta.appendChild(document.createTextNode(' ' + sp.meta[m].value));
    }
    spec.appendChild(meta);

    var body = el('div', 'email-body');
    for (var b = 0; b < sp.body.length; b++) body.appendChild(paragraph(sp.body[b].tokens));
    spec.appendChild(body);
    wrap.appendChild(spec);

    wrap.appendChild(el('h3', null, 'Your Analysis'));
    var grid = el('div', 'analysis-grid');
    for (var f = 0; f < act.fields.length; f++) {
      var fd = act.fields[f];
      var cell = el('div', 'analysis-field' + (fd.kind === 'text' && fd.rows > 1 && f % 3 === 2 ? ' analysis-full' : ''));
      cell.appendChild(el('label', null, fd.label));
      var id = 'e' + sp.n + '-' + fd.key;
      if (fd.kind === 'select') {
        var sel = document.createElement('select');
        sel.id = id;
        sel.appendChild(new Option('-- Select --', ''));
        for (var o = 0; o < fd.options.length; o++) sel.appendChild(new Option(fd.options[o].label, fd.options[o].value));
        cell.appendChild(sel);
      } else {
        var ta = document.createElement('textarea');
        ta.id = id;
        ta.rows = fd.rows || 2;
        if (fd.placeholder) ta.placeholder = fd.placeholder;
        cell.appendChild(ta);
      }
      grid.appendChild(cell);
    }
    wrap.appendChild(grid);

    var btn = el('button', 'check-btn', 'Check Email #' + sp.n + ' Analysis');
    btn.onclick = function () { onCheck(sp.n, btn); };
    wrap.appendChild(btn);
    wrap.appendChild(el('div', 'feedback'))
      .id = 'e' + sp.n + '-feedback';
    return wrap;
  }

  function mount(container, act) {
    var state = { done: {}, scores: {}, total: 0 };
    container.innerHTML = '';

    //  The PAGE owns the progress bar, not this player. It sits above the mount
    //  point beside the scoring rubric, both of which are prose the page keeps,
    //  and its ids are the ones the storefront's score reporter reads. Creating
    //  a second #totalScore here would put two elements with one id in the
    //  document and leave the reporter reading whichever it found first.
    function setScore(total, done) {
      var t = document.getElementById('totalScore');
      if (t) t.textContent = total;
      var c = document.getElementById('completedCount');
      if (c) c.textContent = done;
    }

    function send(n, btn) {
      if (state.done[n]) return;
      var responses = {};
      for (var i = 0; i < act.fields.length; i++) {
        var node = document.getElementById('e' + n + '-' + act.fields[i].key);
        responses[act.fields[i].key] = node ? node.value : '';
      }
      btn.disabled = true;
      var tk = token();
      var payload = {};
      payload[n] = responses;
      fetch(BASE + '/api/analysis/' + encodeURIComponent(act.course) + '/'
        + encodeURIComponent(act.item_id) + '/grade', {
        method: 'POST',
        headers: tk
          ? { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk }
          : { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: payload }),
      }).then(function (r) { return r.json(); }).then(function (out) {
        if (!out || out.locked) {
          //  Closed between loading and submitting. Say so rather than failing.
          var fbL = document.getElementById('e' + n + '-feedback');
          if (fbL) { fbL.className = 'feedback show incorrect'; fbL.textContent = 'Your teacher has closed this activity.'; }
          return;
        }
        var got = null;
        for (var s = 0; s < out.specimens.length; s++) if (out.specimens[s].n === n) got = out.specimens[s];
        if (!got) return;
        state.done[n] = true;
        state.scores[n] = got.points;

        var fb = document.getElementById('e' + n + '-feedback');
        fb.innerHTML = '';
        fb.className = 'feedback show ' + (got.points >= 5 ? 'correct' : (got.points >= 3 ? 'partial' : 'incorrect'));
        fb.appendChild(el('strong', null, 'Email #' + n + ' Score: ' + got.points + ' / ' + got.max));
        for (var g = 0; g < got.fields.length; g++) {
          fb.appendChild(document.createElement('br'));
          fb.appendChild(el('strong', null, got.fields[g].detail.label + ':'));
          fb.appendChild(document.createTextNode(' ' + got.fields[g].points + (got.fields[g].points === 1 ? ' pt. ' : ' pts. ') + got.fields[g].detail.text));
        }

        var t = 0, done = 0;
        for (var k in state.scores) { t += state.scores[k]; done++; }
        state.total = t;
        setScore(t, done);

        var section = document.getElementById('email' + n + '-section');
        var inputs = section.querySelectorAll('textarea,select');
        for (var q = 0; q < inputs.length; q++) inputs[q].disabled = true;

        if (done === act.specimens.length) finish(t, out.message);
      }).catch(function () {
        btn.disabled = false;
        var fbE = document.getElementById('e' + n + '-feedback');
        if (fbE) { fbE.className = 'feedback show incorrect'; fbE.textContent = 'That could not be graded. Check your connection and try again.'; }
      });
    }

    for (var i = 0; i < act.specimens.length; i++) {
      container.appendChild(specimenNode(act, act.specimens[i], send));
    }

    var panel = el('div', 'results-panel');
    panel.id = 'resultsPanel';
    var score = el('div', 'results-score');
    var fin = el('span', null, '0');
    fin.id = 'finalScore';
    score.appendChild(fin);
    score.appendChild(document.createTextNode(' / ' + act.points));
    panel.appendChild(score);
    panel.appendChild(el('p', null, '')).id = 'resultsMsg';
    container.appendChild(panel);

    function finish(total, message) {
      document.getElementById('finalScore').textContent = total;
      document.getElementById('resultsMsg').textContent = message || '';
      panel.className = 'results-panel show';
      panel.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function mountById(container, course, itemId) {
    var tk = token();
    return fetch(BASE + '/api/analysis/' + encodeURIComponent(course) + '/' + encodeURIComponent(itemId),
      tk ? { headers: { Authorization: 'Bearer ' + tk } } : undefined)
      .then(function (r) { return r.json(); })
      .then(function (out) {
        if (out && out.locked) {
          container.textContent = 'Your teacher has not opened this activity yet.';
          container.setAttribute('data-apcs-analysis-locked', '1');
          return null;
        }
        if (!out || !out.activity) throw new Error('no activity');
        return mount(container, out.activity);
      })
      .catch(function (e) {
        container.textContent = 'This activity could not be loaded. Please refresh the page.';
        throw e;
      });
  }

  window.APCSAnalysis = { mount: mount, mountById: mountById };
})();
