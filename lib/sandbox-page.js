'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE SANDBOX PAGE. Served by server.js at GET /sandbox.
//
//  A single self-contained document: no build step, no CDN, no framework. That
//  is a deliberate constraint rather than minimalism for its own sake. This page
//  is loaded by students on school networks where a blocked CDN is a page that
//  does not work, during a class period where nobody can debug it, and it is
//  served from the same box that runs the API on 1 vCPU. A textarea that always
//  loads beats a code editor that sometimes does.
//
//  ── WHAT IT TALKS TO ────────────────────────────────────────────────────────
//    POST /api/sandbox/assemble        files -> one Judge0-ready source
//    POST /api/judge0/run              runs it (existing proxy, untouched)
//    POST /api/student/login           only when the student chooses to save
//    GET|POST|PUT|DELETE /api/sandbox/programs[/:id]   their saved work
//
//  Everything is same-origin, so no CORS question arises and the Judge0 proxy
//  still sees the student's own address for rate limiting.
//
//  ── WHY THERE IS A LOGIN FORM HERE ──────────────────────────────────────────
//  The storefront keeps its student token in localStorage on apcsexamprep.com.
//  localStorage is per ORIGIN, so a page served from progress.apcsexamprep.com
//  cannot read it, no matter that both are the same product to a student. So the
//  page signs in on its own origin with the same class code, name and PIN.
//
//  The consequence worth designing around is that a student should never be
//  asked to log in to try something. Running is anonymous. Only SAVING needs an
//  account, and the prompt appears at the moment they press Save, which is the
//  first moment the reason for it is obvious.
//
//  ── WHY WORK SURVIVES A RELOAD EVEN WITHOUT AN ACCOUNT ─────────────────────
//  The current buffer is mirrored into localStorage on every edit (debounced).
//  A student who reloads, or whose Chromebook sleeps through lunch, gets their
//  code back. That draft is browser-only and never leaves the machine; it is not
//  a substitute for Save, and the page says so rather than implying it.
// ─────────────────────────────────────────────────────────────────────────────

const STARTERS = {
  java: [
    {
      name: 'Main.java',
      source: [
        'public class Main {',
        '    public static void main(String[] args) {',
        '        Dog d = new Dog("Rex", 3);',
        '        System.out.println(d.speak());',
        '        System.out.println(d);',
        '    }',
        '}',
        '',
      ].join('\n'),
    },
    {
      name: 'Dog.java',
      source: [
        '// A second file works the way it does in a real project: write the',
        '// class here, use it from Main. The runner combines your files.',
        'public class Dog {',
        '    private String name;',
        '    private int age;',
        '',
        '    public Dog(String name, int age) {',
        '        this.name = name;',
        '        this.age = age;',
        '    }',
        '',
        '    public String speak() {',
        '        return name + " says woof!";',
        '    }',
        '',
        '    public String toString() {',
        '        return name + " (" + age + ")";',
        '    }',
        '}',
        '',
      ].join('\n'),
    },
  ],
  python: [
    {
      name: 'main.py',
      source: [
        '# Anything you type in the Input box below is what input() reads.',
        'name = input("What is your name? ")',
        'print("Hello, " + name + "!")',
        '',
      ].join('\n'),
    },
  ],
  javascript: [
    {
      name: 'main.js',
      source: [
        '// Node has no prompt(). Read the Input box below like this:',
        'const lines = require("fs").readFileSync(0, "utf8").split("\\n");',
        '',
        'const name = lines[0] || "world";',
        'console.log("Hello, " + name + "!");',
        '',
      ].join('\n'),
    },
  ],
};

const CSS = `
:root {
  --bg: #0f172a; --panel: #1e293b; --panel-2: #172033; --line: #334155;
  --ink: #e2e8f0; --dim: #94a3b8; --accent: #38bdf8; --accent-ink: #04263a;
  --ok: #4ade80; --bad: #f87171; --warn: #fbbf24;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--bg); color: var(--ink); font: 15px/1.5 -apple-system, BlinkMacSystemFont,
  "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
a { color: var(--accent); }
button { font: inherit; cursor: pointer; border-radius: 6px; border: 1px solid var(--line);
  background: var(--panel); color: var(--ink); padding: 7px 13px; }
button:hover:not(:disabled) { border-color: var(--accent); }
button:disabled { opacity: .5; cursor: not-allowed; }
button.primary { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); font-weight: 600; }
button.danger:hover { border-color: var(--bad); color: var(--bad); }
input, select, textarea { font: inherit; background: var(--panel-2); color: var(--ink);
  border: 1px solid var(--line); border-radius: 6px; padding: 7px 10px; }
input:focus, select:focus, textarea:focus { outline: 2px solid var(--accent); outline-offset: -1px; }

header.top { display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  padding: 12px 18px; border-bottom: 1px solid var(--line); background: var(--panel-2); }
header.top h1 { font-size: 17px; margin: 0; letter-spacing: .2px; }
header.top .spacer { flex: 1; }
header.top .who { color: var(--dim); font-size: 13px; }

.wrap { display: grid; grid-template-columns: 232px minmax(0, 1fr) minmax(0, 1fr); gap: 14px;
  padding: 14px 18px 28px; align-items: start; }
@media (max-width: 1100px) { .wrap { grid-template-columns: 1fr; } }

.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
.panel h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: var(--dim);
  margin: 0; padding: 10px 12px; border-bottom: 1px solid var(--line); background: var(--panel-2); }
.panel .body { padding: 12px; }

.langrow { display: flex; gap: 6px; padding: 10px 12px; flex-wrap: wrap; }
.langrow button { flex: 1; min-width: 74px; }
.langrow button[aria-pressed="true"] { background: var(--accent); color: var(--accent-ink);
  border-color: var(--accent); font-weight: 600; }

ul.programs { list-style: none; margin: 0; padding: 0; max-height: 340px; overflow-y: auto; }
ul.programs li { border-bottom: 1px solid var(--line); }
ul.programs button.open { width: 100%; text-align: left; border: 0; border-radius: 0; background: none;
  padding: 9px 12px; }
ul.programs button.open:hover { background: var(--panel-2); }
ul.programs .t { display: block; }
ul.programs .m { display: block; color: var(--dim); font-size: 12px; }
.empty { color: var(--dim); font-size: 13px; padding: 12px; margin: 0; }

.tabs { display: flex; gap: 4px; padding: 8px 8px 0; flex-wrap: wrap; align-items: center; }
.tab { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--line);
  border-bottom: 0; border-radius: 6px 6px 0 0; background: var(--panel-2); padding: 6px 10px; font-size: 13px; }
.tab[aria-selected="true"] { background: var(--panel); border-color: var(--accent); color: var(--ink); }
.tab .x { border: 0; background: none; color: var(--dim); padding: 0 2px; font-size: 15px; line-height: 1; }
.tab .x:hover { color: var(--bad); }

textarea.code, textarea.stdin {
  width: 100%; display: block; resize: vertical; border-radius: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 13.5px; line-height: 1.55; tab-size: 4; white-space: pre; overflow-wrap: normal;
  overflow-x: auto; background: #0b1220; border: 0; border-top: 1px solid var(--line); padding: 12px;
}
textarea.code { min-height: 420px; }
textarea.stdin { min-height: 72px; border-radius: 0 0 10px 10px; white-space: pre-wrap; }

.runbar { display: flex; gap: 8px; align-items: center; padding: 10px 12px; flex-wrap: wrap;
  border-top: 1px solid var(--line); }
.runbar .spacer { flex: 1; }
.counter { color: var(--dim); font-size: 12px; }
.counter.over { color: var(--bad); }

pre.out { margin: 0; padding: 12px; min-height: 220px; max-height: 460px; overflow: auto;
  background: #0b1220; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px; white-space: pre-wrap; word-break: break-word; }
pre.out .err { color: var(--bad); }
pre.out .note { color: var(--warn); }
pre.out .meta { color: var(--dim); }
.status { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid var(--line); }
.status.ok { color: var(--ok); } .status.bad { color: var(--bad); } .status.idle { color: var(--dim); }

.msg { margin: 0 0 10px; padding: 9px 11px; border-radius: 6px; font-size: 13px; display: none; }
.msg.show { display: block; }
.msg.err { background: #3f1d1d; color: #fecaca; }
.msg.ok { background: #14352a; color: #bbf7d0; }

form.login label { display: block; font-size: 12px; color: var(--dim); margin: 8px 0 3px; }
form.login input { width: 100%; }
form.login button { width: 100%; margin-top: 12px; }
.hint { color: var(--dim); font-size: 12px; margin: 10px 0 0; }

dialog { background: var(--panel); color: var(--ink); border: 1px solid var(--line);
  border-radius: 10px; padding: 0; max-width: 420px; width: 92%; }
dialog::backdrop { background: rgba(2, 6, 23, .7); }
dialog .body { padding: 16px; }
dialog h3 { margin: 0 0 10px; font-size: 16px; }
dialog input { width: 100%; }
dialog .row { display: flex; gap: 8px; justify-content: flex-end; margin-top: 14px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
`;

// The page script. Kept as a plain string so this file has no build step, in the
// same shape as the other page generators in lib/.
const JS = String.raw`
(function () {
  'use strict';

  var API = '';                       // same origin
  var TOKEN_KEY = 'apcse_sandbox_token';
  var WHO_KEY = 'apcse_sandbox_who';
  var DRAFT_KEY = 'apcse_sandbox_draft';

  var STARTERS = window.__SANDBOX_STARTERS__;
  var CFG = window.__SANDBOX_CONFIG__;

  // ── STATE ─────────────────────────────────────────────────────────────────
  // One open program at a time. programId is null until it has been saved, and
  // 'dirty' is what the Save button reads, so a student is never told their work
  // is saved when it is not.
  var state = {
    language: 'java',
    files: [],
    active: 0,
    title: '',
    stdin: '',
    programId: null,
    dirty: false,
    token: null,
    who: null,
    running: false,
  };

  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;   // textContent, never innerHTML
    return n;
  }

  // ── HTTP ──────────────────────────────────────────────────────────────────
  // Every call funnels through here so an expired token is handled in ONE place.
  // A student whose token aged out mid-period should see "sign in again", not a
  // silent failure to save.
  function api(method, path, body, auth) {
    var opts = { method: method, headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    if (auth && state.token) opts.headers.Authorization = 'Bearer ' + state.token;
    return fetch(API + path, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.status === 401 && auth) {
          signOut();
          throw new Error('Your session expired. Sign in again to save.');
        }
        if (!res.ok) throw new Error(data.message || data.error || ('Request failed (' + res.status + ')'));
        return data;
      });
    });
  }

  function flash(node, kind, text) {
    node.className = 'msg show ' + kind;
    node.textContent = text;
    if (kind === 'ok') setTimeout(function () { node.className = 'msg'; }, 3500);
  }

  // ── EDITOR ────────────────────────────────────────────────────────────────
  function currentFile() { return state.files[state.active] || state.files[0]; }

  function renderTabs() {
    var bar = $('tabs');
    bar.textContent = '';
    var multi = state.language === 'java';

    state.files.forEach(function (f, i) {
      var tab = el('span', 'tab');
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', i === state.active ? 'true' : 'false');

      var pick = el('button', 'name', f.name);
      pick.style.border = '0';
      pick.style.background = 'none';
      pick.style.padding = '0';
      pick.style.color = 'inherit';
      pick.title = 'Open ' + f.name + ' (double-click to rename)';
      pick.addEventListener('click', function () { selectFile(i); });
      pick.addEventListener('dblclick', function () { renameFile(i); });
      tab.appendChild(pick);

      // A one-file program has nothing to close, and closing the last file would
      // leave the editor with nothing to edit.
      if (multi && state.files.length > 1) {
        var x = el('button', 'x', '×');
        x.title = 'Delete ' + f.name;
        x.setAttribute('aria-label', 'Delete ' + f.name);
        x.addEventListener('click', function () { deleteFile(i); });
        tab.appendChild(x);
      }
      bar.appendChild(tab);
    });

    if (multi && state.files.length < CFG.max_files) {
      var add = el('button', 'tab', '+ New file');
      add.addEventListener('click', addFile);
      bar.appendChild(add);
    }
  }

  function selectFile(i) {
    // Keep what is on screen before switching away from it.
    if (state.files[state.active]) state.files[state.active].source = $('code').value;
    state.active = i;
    renderTabs();
    $('code').value = currentFile().source;
    $('code').focus();
  }

  function addFile() {
    if (state.files.length >= CFG.max_files) return;
    var suggested = 'Helper' + (state.files.length + 1) + '.java';
    var name = window.prompt('New file name', suggested);
    if (name === null) return;
    state.files[state.active].source = $('code').value;
    state.files.push({ name: name.trim() || suggested, source: '' });
    state.active = state.files.length - 1;
    markDirty();
    renderTabs();
    $('code').value = '';
    $('code').focus();
  }

  function renameFile(i) {
    var name = window.prompt('Rename file', state.files[i].name);
    if (name === null) return;
    var t = name.trim();
    if (!t) return;
    state.files[i].name = t;
    markDirty();
    renderTabs();
  }

  function deleteFile(i) {
    if (state.files.length <= 1) return;
    if (!window.confirm('Delete ' + state.files[i].name + '? This cannot be undone.')) return;
    if (state.active === i) state.files[state.active].source = $('code').value;
    state.files.splice(i, 1);
    if (state.active >= state.files.length) state.active = state.files.length - 1;
    markDirty();
    renderTabs();
    $('code').value = currentFile().source;
  }

  // Tab indents instead of leaving the textarea. Without this, Java is unusable
  // in a plain textarea; with it, Tab no longer moves focus, so Escape-then-Tab
  // is the documented way out for keyboard users and is announced under the box.
  function onKeyDown(e) {
    if (e.key === 'Escape') { e.target.blur(); return; }
    if (e.key !== 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    var ta = e.target;
    var start = ta.selectionStart;
    var end = ta.selectionEnd;
    var value = ta.value;

    if (start === end && !e.shiftKey) {
      ta.value = value.slice(0, start) + '    ' + value.slice(end);
      ta.selectionStart = ta.selectionEnd = start + 4;
    } else {
      // Block indent / outdent over the selected lines.
      var from = value.lastIndexOf('\n', start - 1) + 1;
      var to = end;
      var block = value.slice(from, to);
      var out = e.shiftKey
        ? block.replace(/^ {1,4}/gm, '')
        : block.replace(/^/gm, '    ');
      ta.value = value.slice(0, from) + out + value.slice(to);
      ta.selectionStart = from;
      ta.selectionEnd = from + out.length;
    }
    onEdit();
  }

  // Auto-indent on Enter: a new line keeps the previous line's leading spaces,
  // and adds one level after a line ending in { or :.
  function onKeyUp(e) {
    if (e.key !== 'Enter') return;
    var ta = e.target;
    var pos = ta.selectionStart;
    var before = ta.value.slice(0, pos - 1);
    var line = before.slice(before.lastIndexOf('\n') + 1);
    var indent = (line.match(/^[ \t]*/) || [''])[0];
    if (/[{:]\s*$/.test(line)) indent += '    ';
    if (!indent) return;
    ta.value = ta.value.slice(0, pos) + indent + ta.value.slice(pos);
    ta.selectionStart = ta.selectionEnd = pos + indent.length;
  }

  var draftTimer = null;
  function onEdit() {
    if (state.files[state.active]) state.files[state.active].source = $('code').value;
    markDirty();
    updateCounter();
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraft, 400);
  }

  function updateCounter() {
    var total = state.files.reduce(function (n, f) { return n + f.source.length; }, 0);
    var c = $('counter');
    c.textContent = total.toLocaleString() + ' / ' + CFG.max_total_chars.toLocaleString() + ' characters';
    c.className = total > CFG.max_total_chars ? 'counter over' : 'counter';
  }

  function markDirty() {
    state.dirty = true;
    $('savebtn').textContent = state.programId ? 'Save' : 'Save to my account';
  }

  // ── DRAFT (browser only) ──────────────────────────────────────────────────
  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        language: state.language, files: state.files, title: state.title,
        stdin: $('stdin').value, programId: state.programId,
      }));
    } catch (e) { /* private mode or full quota: the page still works */ }
  }

  function loadDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      if (!d || !Array.isArray(d.files) || !d.files.length) return null;
      return d;
    } catch (e) { return null; }
  }

  // ── LANGUAGE ──────────────────────────────────────────────────────────────
  function setLanguage(lang, opts) {
    var reset = !opts || opts.reset !== false;
    state.language = lang;
    document.querySelectorAll('.langrow button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.dataset.lang === lang ? 'true' : 'false');
    });
    if (reset) {
      state.files = JSON.parse(JSON.stringify(STARTERS[lang]));
      state.active = 0;
      state.programId = null;
      state.title = '';
      state.dirty = false;
      $('stdin').value = '';
      $('code').value = state.files[0].source;
      $('savebtn').textContent = 'Save to my account';
      setStatus('idle', 'Ready.');
      $('output').textContent = '';
    }
    $('title').textContent = state.title || 'Untitled program';
    renderTabs();
    updateCounter();
    saveDraft();
  }

  // ── RUN ───────────────────────────────────────────────────────────────────
  function setStatus(kind, text) {
    var s = $('status');
    s.className = 'status ' + kind;
    s.textContent = text;
  }

  function appendOut(cls, text) {
    if (!text) return;
    var span = el('span', cls, text.endsWith('\n') ? text : text + '\n');
    $('output').appendChild(span);
  }

  function run() {
    if (state.running) return;
    if (state.files[state.active]) state.files[state.active].source = $('code').value;
    state.stdin = $('stdin').value;
    saveDraft();

    state.running = true;
    $('runbtn').disabled = true;
    $('runbtn').textContent = 'Running...';
    setStatus('idle', 'Compiling and running...');
    $('output').textContent = '';

    api('POST', '/api/sandbox/assemble', { language: state.language, files: state.files })
      .then(function (built) {
        (built.notes || []).forEach(function (n) { appendOut('note', 'Note: ' + n); });
        return api('POST', '/api/judge0/run', {
          code: built.source,
          language_id: built.language_id,
          stdin: state.stdin,
        });
      })
      .then(function (res) {
        // Judge0 status 3 is Accepted; everything else is a compile error, a
        // runtime error, or a timeout, and each of those is shown as itself.
        var good = res.status_id === 3;
        setStatus(good ? 'ok' : 'bad', res.status + (res.time ? '  ' + res.time + 's' : ''));
        appendOut('', res.stdout);
        appendOut('err', res.compile_output);
        appendOut('err', res.stderr);
        if (!res.stdout && !res.stderr && !res.compile_output) {
          appendOut('meta', '(your program produced no output)');
        }
      })
      .catch(function (err) {
        setStatus('bad', 'Could not run');
        appendOut('err', err.message);
      })
      .then(function () {
        state.running = false;
        $('runbtn').disabled = false;
        $('runbtn').textContent = 'Run';
      });
  }

  // ── ACCOUNT ───────────────────────────────────────────────────────────────
  function signedIn() { return !!state.token; }

  function renderAccount() {
    $('loginpanel').hidden = signedIn();
    $('accountpanel').hidden = !signedIn();
    $('who').textContent = signedIn() ? state.who : '';
    if (signedIn()) loadPrograms();
  }

  // Signing out clears the DRAFT as well as the token, and that is the whole
  // point of it rather than a tidy-up.
  //
  // The draft is how the editor survives a reload, so it is written on every
  // edit and it outlives the session by design. Left alone at sign-out it also
  // outlives the STUDENT: the next person at that machine loads the page and
  // gets the previous student's code restored into the editor, because
  // loadDraft() runs at boot and knows nothing about who is signed in. One
  // shared computer used all day by different classes is the ordinary case in
  // a school, not the edge case.
  //
  // Nothing in a sandbox program is secret, and the server already refuses a
  // save against someone else's program id, so this is not a hole. It is that
  // the sandbox is the ONE place in this system holding student-written free
  // text, and handing it to the next person by default is the wrong posture
  // for that exception to sit behind.
  //
  // Because clearing the draft discards unsaved work, it asks first, using the
  // same confirm that guards opening another program. The editor is reset
  // BEFORE the keys are removed: setLanguage() ends in saveDraft(), so
  // clearing first would immediately write the starters back under the same
  // key and leave a draft behind anyway.
  function signOut() {
    if (!confirmDiscard('Signing out will clear unsaved work on this computer. Sign out anyway?')) return;
    state.token = null;
    state.who = null;
    $('deletebtn').hidden = true;
    setLanguage(state.language, { reset: true });
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(WHO_KEY);
      localStorage.removeItem(DRAFT_KEY);
    } catch (e) { /* private mode: nothing was persisted to clear */ }
    renderAccount();
  }

  function login(e) {
    e.preventDefault();
    var msg = $('loginmsg');
    api('POST', '/api/student/login', {
      class_code: $('classcode').value.trim(),
      display_name: $('name').value.trim(),
      pin: $('pin').value.trim(),
    }).then(function (data) {
      state.token = data.token;
      state.who = data.student.name + '  ' + data.class.code;
      try {
        localStorage.setItem(TOKEN_KEY, state.token);
        localStorage.setItem(WHO_KEY, state.who);
      } catch (err) { /* session lasts the tab instead */ }
      $('pin').value = '';
      msg.className = 'msg';
      renderAccount();
    }).catch(function (err) { flash(msg, 'err', err.message); });
  }

  // ── PROGRAMS ──────────────────────────────────────────────────────────────
  function loadPrograms() {
    api('GET', '/api/sandbox/programs', undefined, true).then(function (data) {
      var list = $('programs');
      list.textContent = '';
      if (!data.programs.length) {
        $('noprograms').hidden = false;
        return;
      }
      $('noprograms').hidden = true;
      data.programs.forEach(function (p) {
        var li = el('li');
        var b = el('button', 'open');
        b.appendChild(el('span', 't', p.title));
        b.appendChild(el('span', 'm', labelFor(p.language) + '  ' + shortDate(p.updated_at)));
        b.addEventListener('click', function () { openProgram(p.id); });
        li.appendChild(b);
        list.appendChild(li);
      });
    }).catch(function (err) { flash($('accountmsg'), 'err', err.message); });
  }

  function labelFor(key) {
    for (var i = 0; i < CFG.languages.length; i++) {
      if (CFG.languages[i].key === key) return CFG.languages[i].label;
    }
    return key;
  }

  // Stored as UTC 'YYYY-MM-DD HH:MM:SS' by SQLite's datetime('now').
  function shortDate(s) {
    if (!s) return '';
    var d = new Date(s.replace(' ', 'T') + 'Z');
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      + ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  function confirmDiscard(question) {
    if (!state.dirty) return true;
    return window.confirm(question
      || 'You have unsaved changes. Open the other program anyway?');
  }

  function openProgram(id) {
    if (!confirmDiscard()) return;
    api('GET', '/api/sandbox/programs/' + encodeURIComponent(id), undefined, true).then(function (data) {
      var p = data.program;
      state.programId = p.id;
      state.title = p.title;
      state.files = p.files.length ? p.files : JSON.parse(JSON.stringify(STARTERS[p.language]));
      state.active = 0;
      state.dirty = false;
      $('stdin').value = p.stdin || '';
      setLanguage(p.language, { reset: false });
      $('code').value = state.files[0].source;
      $('savebtn').textContent = 'Save';
      $('deletebtn').hidden = false;
      setStatus('idle', 'Opened "' + p.title + '".');
      $('output').textContent = '';
      saveDraft();
    }).catch(function (err) { flash($('accountmsg'), 'err', err.message); });
  }

  function save() {
    if (!signedIn()) {
      flash($('loginmsg'), 'err', 'Sign in with your class code, name, and PIN to save.');
      $('classcode').focus();
      return;
    }
    if (state.files[state.active]) state.files[state.active].source = $('code').value;

    var go = state.title
      ? Promise.resolve(state.title)
      : askTitle();

    go.then(function (title) {
      if (title === null) return null;
      state.title = title;
      var body = {
        title: title,
        language: state.language,
        files: state.files,
        stdin: $('stdin').value,
      };
      return state.programId
        ? api('PUT', '/api/sandbox/programs/' + encodeURIComponent(state.programId), body, true)
        : api('POST', '/api/sandbox/programs', body, true);
    }).then(function (data) {
      if (!data) return;
      state.programId = data.program.id;
      state.title = data.program.title;
      state.dirty = false;
      $('title').textContent = state.title;
      $('savebtn').textContent = 'Save';
      $('deletebtn').hidden = false;
      flash($('accountmsg'), 'ok', 'Saved.');
      loadPrograms();
      saveDraft();
    }).catch(function (err) { flash($('accountmsg'), 'err', err.message); });
  }

  function saveAsNew() {
    if (!signedIn()) { save(); return; }
    if (state.files[state.active]) state.files[state.active].source = $('code').value;
    askTitle(state.title ? state.title + ' (copy)' : '').then(function (title) {
      if (title === null) return;
      return api('POST', '/api/sandbox/programs', {
        title: title, language: state.language, files: state.files, stdin: $('stdin').value,
      }, true).then(function (data) {
        state.programId = data.program.id;
        state.title = data.program.title;
        state.dirty = false;
        $('title').textContent = state.title;
        $('deletebtn').hidden = false;
        flash($('accountmsg'), 'ok', 'Saved as a new program.');
        loadPrograms();
      });
    }).catch(function (err) { flash($('accountmsg'), 'err', err.message); });
  }

  function removeProgram() {
    if (!state.programId) return;
    if (!window.confirm('Delete "' + state.title + '"? This cannot be undone.')) return;
    api('DELETE', '/api/sandbox/programs/' + encodeURIComponent(state.programId), undefined, true)
      .then(function () {
        state.programId = null;
        state.title = '';
        state.dirty = true;
        $('title').textContent = 'Untitled program';
        $('savebtn').textContent = 'Save to my account';
        $('deletebtn').hidden = true;
        flash($('accountmsg'), 'ok', 'Deleted. The code is still open here.');
        loadPrograms();
      })
      .catch(function (err) { flash($('accountmsg'), 'err', err.message); });
  }

  // A <dialog> rather than window.prompt, so the title field can enforce the
  // same length the server does and say so.
  function askTitle(initial) {
    return new Promise(function (resolve) {
      var dlg = $('titledlg');
      var input = $('titleinput');
      input.value = initial || state.title || '';
      input.maxLength = CFG.max_title_chars;
      dlg.returnValue = '';
      dlg.showModal();
      input.focus();
      input.select();
      dlg.addEventListener('close', function handler() {
        dlg.removeEventListener('close', handler);
        resolve(dlg.returnValue === 'ok' ? (input.value.trim() || 'Untitled program') : null);
      });
    });
  }

  function newProgram() {
    if (!confirmDiscard()) return;
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
    $('deletebtn').hidden = true;
    setLanguage(state.language, { reset: true });
  }

  // ── BOOT ──────────────────────────────────────────────────────────────────
  function init() {
    document.querySelectorAll('.langrow button').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.lang === state.language) return;
        if (!confirmDiscard()) return;
        $('deletebtn').hidden = true;
        setLanguage(b.dataset.lang, { reset: true });
      });
    });

    $('code').addEventListener('input', onEdit);
    $('code').addEventListener('keydown', onKeyDown);
    $('code').addEventListener('keyup', onKeyUp);
    $('stdin').addEventListener('input', function () { markDirty(); saveDraft(); });
    $('runbtn').addEventListener('click', run);
    $('savebtn').addEventListener('click', save);
    $('saveasbtn').addEventListener('click', saveAsNew);
    $('deletebtn').addEventListener('click', removeProgram);
    $('newbtn').addEventListener('click', newProgram);
    $('loginform').addEventListener('submit', login);
    $('signoutbtn').addEventListener('click', signOut);
    $('titleok').addEventListener('click', function () { $('titledlg').close('ok'); });
    $('titlecancel').addEventListener('click', function () { $('titledlg').close('cancel'); });

    // Ctrl/Cmd+Enter runs from inside the editor, which is where a student's
    // hands already are.
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
    });

    // Losing an hour of work to a stray tab close is worse than an extra click.
    window.addEventListener('beforeunload', function (e) {
      if (!state.dirty) return;
      e.preventDefault();
      e.returnValue = '';
    });

    try {
      state.token = localStorage.getItem(TOKEN_KEY);
      state.who = localStorage.getItem(WHO_KEY);
    } catch (e) { /* storage blocked: sign-in still works for this tab */ }

    var draft = loadDraft();
    if (draft && STARTERS[draft.language]) {
      state.language = draft.language;
      state.files = draft.files;
      state.title = draft.title || '';
      state.programId = draft.programId || null;
      state.active = 0;
      setLanguage(draft.language, { reset: false });
      $('code').value = state.files[0].source;
      $('stdin').value = draft.stdin || '';
      $('deletebtn').hidden = !state.programId;
      $('savebtn').textContent = state.programId ? 'Save' : 'Save to my account';
      setStatus('idle', 'Restored your last session from this browser.');
    } else {
      setLanguage('java', { reset: true });
    }

    renderAccount();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
`;

function render(config) {
  const json = (v) => JSON.stringify(v).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Code Sandbox | APCSExamPrep</title>
<style>${CSS}</style>
</head>
<body>
<header class="top">
  <h1>Code Sandbox</h1>
  <span id="title" class="who">Untitled program</span>
  <span class="spacer"></span>
  <span id="who" class="who"></span>
  <button id="newbtn" type="button">New program</button>
</header>

<div class="wrap">

  <div>
    <section class="panel">
      <h2>Language</h2>
      <div class="langrow" role="group" aria-label="Language">
        <button type="button" data-lang="java" aria-pressed="true">Java</button>
        <button type="button" data-lang="python" aria-pressed="false">Python</button>
        <button type="button" data-lang="javascript" aria-pressed="false">JavaScript</button>
      </div>
      <p class="hint" style="padding: 0 12px 12px; margin: 0;">
        Java runs several classes at once: add a file per class and call it from Main.
      </p>
    </section>

    <section class="panel" style="margin-top: 14px;">
      <h2>My programs</h2>
      <div id="loginpanel">
        <div class="body">
          <p id="loginmsg" class="msg"></p>
          <p class="hint" style="margin-top: 0;">
            You can write and run code without signing in. Sign in to save it.
          </p>
          <form id="loginform" class="login">
            <label for="classcode">Class code</label>
            <input id="classcode" autocomplete="off" autocapitalize="characters" placeholder="CSA-1234" required>
            <label for="name">Your name</label>
            <input id="name" autocomplete="off" required>
            <label for="pin">PIN</label>
            <input id="pin" type="password" inputmode="numeric" autocomplete="off" required>
            <button class="primary" type="submit">Sign in</button>
          </form>
        </div>
      </div>
      <div id="accountpanel" hidden>
        <div class="body" style="padding-bottom: 0;">
          <p id="accountmsg" class="msg"></p>
        </div>
        <ul id="programs" class="programs"></ul>
        <p id="noprograms" class="empty" hidden>Nothing saved yet. Press Save to keep this program.</p>
        <div class="body">
          <button id="signoutbtn" type="button" style="width: 100%;">Sign out</button>
        </div>
      </div>
    </section>
  </div>

  <section class="panel">
    <h2>Editor</h2>
    <div id="tabs" class="tabs" role="tablist"></div>
    <label class="sr" for="code">Program code</label>
    <textarea id="code" class="code" spellcheck="false" autocapitalize="off" autocorrect="off" wrap="off"></textarea>
    <div class="runbar">
      <button id="runbtn" class="primary" type="button">Run</button>
      <button id="savebtn" type="button">Save to my account</button>
      <button id="saveasbtn" type="button">Save as new</button>
      <button id="deletebtn" class="danger" type="button" hidden>Delete</button>
      <span class="spacer"></span>
      <span id="counter" class="counter"></span>
    </div>
    <p class="hint" style="padding: 0 12px 10px; margin: 0;">
      Tab indents. Press Escape first if you want to Tab out of the editor. Ctrl+Enter runs.
    </p>
  </section>

  <div>
    <section class="panel">
      <h2>Output</h2>
      <div id="status" class="status idle">Ready.</div>
      <pre id="output" class="out" aria-live="polite"></pre>
    </section>

    <section class="panel" style="margin-top: 14px;">
      <h2>Input (stdin)</h2>
      <label class="sr" for="stdin">Standard input</label>
      <textarea id="stdin" class="stdin" spellcheck="false"
        placeholder="Anything typed here is fed to your program, one line per input."></textarea>
    </section>
  </div>
</div>

<dialog id="titledlg">
  <div class="body">
    <h3>Name this program</h3>
    <label class="sr" for="titleinput">Program name</label>
    <input id="titleinput" autocomplete="off">
    <div class="row">
      <button id="titlecancel" type="button">Cancel</button>
      <button id="titleok" class="primary" type="button">Save</button>
    </div>
  </div>
</dialog>

<script>
window.__SANDBOX_STARTERS__ = ${json(STARTERS)};
window.__SANDBOX_CONFIG__ = ${json(config)};
</script>
<script>${JS}</script>
</body>
</html>`;
}

module.exports = { render, STARTERS };
