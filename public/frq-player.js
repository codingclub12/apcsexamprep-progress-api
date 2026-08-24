(function (global) {
  'use strict';
  // ───────────────────────────────────────────────────────────────────────────
  //  DEVICE SECURITY ANALYSIS player.
  //
  //  Renders one FRQ spec: the sources, then parts A to E, with a per subpart
  //  reveal for the sample response and its credit points.
  //
  //  ── IT UPLOADS NOTHING. EVER. ─────────────────────────────────────────────
  //  This file makes exactly ONE network call: a GET for the spec, which is
  //  author content. There is no POST, no PUT, no XHR, no sendBeacon and no
  //  form submit, and smoke/frq.js fails the build if one appears. A
  //  free-response answer is free text typed by a student, which is precisely
  //  what this repo does not store (CLAUDE.md, zero PII posture, one named
  //  exception that is not this).
  //
  //  So the student writes wherever they like, reveals the sample, and scores
  //  themselves against the credit points. The self-assessed total stays in the
  //  page. It is never transmitted and never reaches a gradebook, because a
  //  number a student chose for themselves is not evidence and cyber's
  //  denominators are not a place to put one.
  //
  //  The reveal is per subpart on purpose. A single "show all answers" button
  //  turns a 50 minute exam rehearsal into a reading exercise.
  // ───────────────────────────────────────────────────────────────────────────

  var ROMAN = ['i', 'ii', 'iii', 'iv', 'v'];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function injectStyles(doc) {
    if (doc.getElementById('apcs-frq-css')) return;
    var s = doc.createElement('style');
    s.id = 'apcs-frq-css';
    s.textContent = [
      '.apcs-frq{max-width:1000px;margin:0 auto;font-size:16px;line-height:1.6;}',
      '.apcs-frq h2{font-size:21px;margin:26px 0 8px;}',
      '.apcs-frq h3{font-size:17px;margin:18px 0 6px;}',
      '.apcs-frq .frq-meta{background:#eef3f7;border-left:3px solid #2f6f8f;border-radius:0 6px 6px 0;padding:11px 15px;margin:0 0 18px;font-size:14.5px;}',
      '.apcs-frq .frq-src{border:1px solid #dbe3ea;border-radius:8px;margin:0 0 14px;overflow:hidden;}',
      '.apcs-frq .frq-src-h{background:#f4f7fa;border-bottom:1px solid #dbe3ea;padding:9px 13px;font-weight:700;font-size:14.5px;}',
      '.apcs-frq .frq-src-cmd{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;color:#4a5b6b;padding:7px 13px 0;}',
      '.apcs-frq .frq-src-b{padding:11px 13px;overflow-x:auto;}',
      '.apcs-frq pre{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;line-height:1.5;margin:0;white-space:pre;}',
      '.apcs-frq table{border-collapse:collapse;font-size:13.5px;width:100%;}',
      '.apcs-frq th,.apcs-frq td{border:1px solid #dbe3ea;padding:5px 9px;text-align:left;white-space:nowrap;}',
      '.apcs-frq th{background:#f4f7fa;font-size:12px;text-transform:uppercase;letter-spacing:.03em;}',
      '.apcs-frq .frq-part{border:1px solid #dbe3ea;border-radius:8px;padding:14px 16px;margin:0 0 14px;}',
      '.apcs-frq .frq-stem{font-style:italic;color:#42556b;margin:0 0 10px;}',
      '.apcs-frq .frq-sub{margin:0 0 14px;padding:0 0 0 14px;border-left:2px solid #e3e9ef;}',
      '.apcs-frq .frq-verb{display:inline-block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;background:#e8eef4;color:#2f6f8f;border-radius:4px;padding:2px 7px;margin-right:7px;}',
      '.apcs-frq .frq-btn{font:inherit;font-size:14px;background:#2f6f8f;color:#fff;border:0;border-radius:6px;padding:7px 14px;cursor:pointer;margin-top:8px;}',
      '.apcs-frq .frq-btn:hover{background:#255a74;}',
      '.apcs-frq .frq-ans{display:none;margin-top:10px;background:#f7faf7;border:1px solid #cfe0cf;border-radius:6px;padding:12px 14px;}',
      '.apcs-frq .frq-ans.open{display:block;}',
      '.apcs-frq .frq-ans h4{margin:0 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:#3d6b3d;}',
      '.apcs-frq .frq-ans p{margin:0 0 9px;white-space:pre-wrap;}',
      '.apcs-frq .frq-credit{margin:0;padding-left:18px;font-size:14.5px;}',
      '.apcs-frq .frq-credit li{margin:0 0 4px;}',
      '.apcs-frq .frq-self{display:flex;gap:9px;align-items:center;margin-top:10px;font-size:14px;flex-wrap:wrap;}',
      '.apcs-frq .frq-tally{background:#0f1f3d;color:#fff;border-radius:8px;padding:12px 16px;margin:20px 0 0;font-size:15px;}',
      '.apcs-frq .frq-note{font-size:13.5px;color:#5b6b7b;margin-top:8px;}',
    ].join('\n');
    (doc.head || doc.body).appendChild(s);
  }

  function renderTable(columns, rows) {
    var t = el('table');
    var thead = el('thead'); var htr = el('tr');
    columns.forEach(function (c) { htr.appendChild(el('th', null, c)); });
    thead.appendChild(htr); t.appendChild(thead);
    var tb = el('tbody');
    rows.forEach(function (r) {
      var tr = el('tr');
      r.forEach(function (cell) { tr.appendChild(el('td', null, cell)); });
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    return t;
  }

  function renderSource(src) {
    var box = el('div', 'frq-src');
    box.appendChild(el('div', 'frq-src-h', src.label));
    if (src.command) box.appendChild(el('div', 'frq-src-cmd', '$ ' + src.command));
    var body = el('div', 'frq-src-b');

    if (src.kind === 'firewall-rules' || src.kind === 'file-listing') {
      if (src.note) body.appendChild(el('p', null, src.note));
      body.appendChild(renderTable(src.columns, src.rules || src.entries));
    } else if (src.kind === 'policy') {
      Object.keys(src.sections).forEach(function (name) {
        body.appendChild(el('h3', null, name + ' Activities'));
        var ul = el('ul');
        src.sections[name].forEach(function (line) { ul.appendChild(el('li', null, line)); });
        body.appendChild(ul);
      });
    } else {
      body.appendChild(el('pre', null, src.lines.join('\n')));
    }
    box.appendChild(body);
    return box;
  }

  function mount(container, spec, opts) {
    opts = opts || {};
    var doc = container.ownerDocument || global.document;
    injectStyles(doc);

    var root = el('div', 'apcs-frq');
    root.appendChild(el('h2', null, spec.title));

    var meta = el('div', 'frq-meta');
    meta.appendChild(el('div', null, spec.device));
    meta.appendChild(el('div', null,
      'Suggested time ' + (spec.est_minutes || 50) + ' minutes. '
      + 'This is the one free-response question format on the AP Cybersecurity exam. '
      + 'Write your responses on paper or in your own editor, then reveal each sample to score yourself.'));
    meta.appendChild(el('div', 'frq-note',
      'Nothing you write here is collected. This page stores and sends nothing.'));
    root.appendChild(meta);

    (spec.intro || []).forEach(function (p) { root.appendChild(el('p', null, p)); });

    root.appendChild(el('h2', null, 'Sources'));
    (spec.sources || []).forEach(function (s) { root.appendChild(renderSource(s)); });

    root.appendChild(el('h2', null, spec.title.replace(/^Device Security Analysis: /, 'Device Security Analysis: ')));
    root.appendChild(el('p', null,
      'Use the given information to respond to parts A, B, C, D, and E. '
      + 'Label any subparts (for example i and ii) that may be present.'));

    var state = { revealed: 0, earned: 0, possible: 0 };
    var tally = el('div', 'frq-tally');

    function refreshTally() {
      tally.textContent = 'Self-scored ' + state.earned + ' of ' + state.possible
        + ' credit points, across ' + state.revealed + ' revealed subpart'
        + (state.revealed === 1 ? '' : 's') + '. This is your own count and goes nowhere.';
    }

    ['A', 'B', 'C', 'D', 'E'].forEach(function (letter) {
      var part = spec.parts[letter];
      if (!part) return;
      var box = el('div', 'frq-part');
      box.appendChild(el('h3', null, 'Part ' + letter));
      if (part.stem) box.appendChild(el('p', 'frq-stem', part.stem));

      part.subparts.forEach(function (sp, i) {
        var wrap = el('div', 'frq-sub');
        var q = el('p');
        q.appendChild(el('span', 'frq-verb', sp.verb));
        q.appendChild(doc.createTextNode(ROMAN[i] + '. ' + sp.prompt));
        wrap.appendChild(q);

        var ans = el('div', 'frq-ans');
        ans.appendChild(el('h4', null, 'Sample response'));
        ans.appendChild(el('p', null, sp.sample));
        ans.appendChild(el('h4', null, 'What earns credit'));
        var ul = el('ul', 'frq-credit');
        (sp.credit || []).forEach(function (c) { ul.appendChild(el('li', null, c)); });
        ans.appendChild(ul);

        var self = el('div', 'frq-self');
        self.appendChild(el('span', null, 'Credit points you earned:'));
        (sp.credit || []).forEach(function (_, idx) {
          var b = el('button', 'frq-btn');
          b.type = 'button';
          b.textContent = String(idx + 1);
          b.setAttribute('data-pts', String(idx + 1));
          self.appendChild(b);
        });
        var none = el('button', 'frq-btn');
        none.type = 'button';
        none.textContent = '0';
        none.setAttribute('data-pts', '0');
        self.insertBefore(none, self.children[1] || null);
        ans.appendChild(self);

        var chosen = null;
        self.addEventListener('click', function (e) {
          var t = e.target;
          if (!t || !t.getAttribute || t.getAttribute('data-pts') == null) return;
          var pts = parseInt(t.getAttribute('data-pts'), 10);
          if (chosen != null) state.earned -= chosen;
          chosen = pts;
          state.earned += pts;
          refreshTally();
        });

        var btn = el('button', 'frq-btn');
        btn.type = 'button';
        btn.textContent = 'Show sample response';
        btn.addEventListener('click', function () {
          if (ans.className.indexOf('open') !== -1) return;
          ans.className = 'frq-ans open';
          btn.textContent = 'Sample shown';
          btn.disabled = true;
          state.revealed += 1;
          state.possible += (sp.credit || []).length;
          refreshTally();
        });

        wrap.appendChild(btn);
        wrap.appendChild(ans);
        box.appendChild(wrap);
      });

      root.appendChild(box);
    });

    refreshTally();
    root.appendChild(tally);

    container.innerHTML = '';
    container.appendChild(root);
    return { spec: spec, state: state, root: root };
  }

  function mountById(container, course, setId, opts) {
    opts = opts || {};
    var base = (global.APCS_FRQ && global.APCS_FRQ.base) || '';
    var url = base + '/api/frq/' + encodeURIComponent(course) + '/' + encodeURIComponent(setId);
    // The ONLY network call in this file, and it is a GET for author content.
    // Nothing the student produces is ever sent anywhere.
    global.fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (spec) {
      mount(container, spec, opts);
    }).catch(function () {
      container.textContent = 'This practice question could not be loaded.';
    });
  }

  global.APCSFrq = { mount: mount, mountById: mountById };
}(typeof window !== 'undefined' ? window : globalThis));
