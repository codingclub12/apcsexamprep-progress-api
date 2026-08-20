'use strict';
// -----------------------------------------------------------------------------
//  Renderer for the CSP coding-practice pages.
//
//  Sixteen of these already exist for Big Idea 3 and were built elsewhere. This
//  reproduces their exact shape for the two that were missing, 3.17 and 3.18, so
//  a student cannot tell which pipeline made the page they are on: same CSS,
//  same markup, same runner script, same behaviour.
//
//  Two deliberate departures from the existing sixteen, both house rules the
//  older pages predate:
//    - no em-dashes anywhere in the prose
//    - the source is pure ASCII, so the arrows and comparison signs in the
//      pseudocode are numeric character references rather than raw characters
//  Both render identically to the existing pages.
//
//  EXPECTED is never authored. It is passed in from expected.json, which is
//  produced by running each reference solution through the live Judge0 proxy in
//  both languages and requiring them to agree. See scripts/verify-csp-code-pages.js.
// -----------------------------------------------------------------------------

const CSS = require('./csp-code-pages-css');

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Pseudocode is author text with arrows and comparison signs. Escape the markup
// characters, then restore the two symbols as numeric references so the source
// stays ASCII and the render does not.
function pseudo(lines) {
  return lines.map((l) => esc(l)
    .replace(/&lt;-/g, '&#8592;')
    .replace(/&gt;=/g, '&#8805;')
    .replace(/&lt;=/g, '&#8804;')
  ).join('\n');
}

// JSON for embedding inside a <script>. The angle brackets become unicode
// escapes so no starter comment containing "</script>" or "->" can close the
// block early. The existing pages do this and it is why they survive prompts
// full of arrows.
function jsonForScript(v) {
  return JSON.stringify(v).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

function problemHtml(p, i, total, expected) {
  const ref = p.pseudo && p.pseudo.length
    ? '<details class="ref"><summary>Show AP pseudocode reference</summary><pre class="ps">'
      + pseudo(p.pseudo) + '</pre></details>\n  '
    : '';
  return '<div class="prob" data-i="' + i + '">\n'
    + '  <p class="pn">Problem ' + (i + 1) + ' of ' + total + '</p>\n'
    + '  <p class="prompt">' + p.prompt + '</p>\n'
    + '  <p class="muted">Expected output: <code>' + esc(expected).replace(/\n/g, '</code><br><code>') + '</code></p>\n  '
    + ref
    + '<div class="toolbar">\n<label>Language</label>\n'
    + '    <select class="lang"><option value="python">Python</option>\n'
    + '<option value="javascript">JavaScript</option></select>\n  </div>\n'
    + '  <textarea class="ed" spellcheck="false">' + esc(p.starter.python) + '</textarea>\n'
    + '  <div>\n<button class="run">&#9654; Run &amp; Check</button><button class="hint">Hint</button>\n</div>\n'
    + '  <div class="hintbox">' + p.hint + '</div>\n'
    + '  <div class="result"></div>\n'
    + '</div>';
}

function render(data, expected) {
  if (!Array.isArray(expected) || expected.length !== data.problems.length) {
    throw new Error(`${data.topic}: expected ${data.problems.length} verified outputs, got ${expected && expected.length}`);
  }
  const total = data.problems.length;
  const starters = data.problems.map((p) => ({ python: p.starter.python, javascript: p.starter.javascript }));

  const body = '<style>\n' + CSS + '\n</style>\n'
    + '<div id="apcsp-code">\n'
    + '<div class="hero">\n'
    + '<p class="eyebrow">Big Idea 3: Algorithms and Programming &middot; Topic ' + data.topic + ' &middot; Coding Practice</p>\n'
    + '<h1>' + esc(data.heading) + '</h1>\n'
    + '<p class="sub">' + esc(data.sub) + '</p>\n'
    + '</div>\n'
    + '<div class="flow">' + esc(data.flow) + '</div>\n'
    + data.problems.map((p, i) => problemHtml(p, i, total, expected[i])).join('\n') + '\n'
    + '<p class="muted">Your code runs on a secure external service. Answers are checked automatically and nothing is stored.</p>\n'
    + '</div>\n'
    + '<script>\n(function(){\n'
    + '  var CFG = ' + jsonForScript({ proxyUrl: 'https://progress.apcsexamprep.com/api/judge0/run', langIds: { python: 71, javascript: 63 } }) + ';\n'
    + '  var STARTERS = ' + jsonForScript(starters) + ';\n'
    + '  var EXPECTED = ' + jsonForScript(expected) + ';\n'
    + RUNNER
    + '})();\n</script>';
  return body;
}

// The runner, character for character what the existing sixteen pages use.
const RUNNER = `  var root = document.getElementById("apcsp-code");
  if(!root) return;
  function norm(s){ return String(s==null?'':s).replace(/\\r/g,'').replace(/[ \\t]+$/gm,'').replace(/\\n+$/,''); }
  function submit(lang, code, cb){
    var body = JSON.stringify({ code: code, language_id: CFG.langIds[lang] });
    var headers = {'Content-Type':'application/json'};
    fetch(CFG.proxyUrl, { method:'POST', headers: headers, body: body })
      .then(function(r){ return r.json(); })
      .then(function(d){ cb(null, d); })
      .catch(function(e){ cb(e); });
  }
  Array.prototype.forEach.call(root.querySelectorAll('.prob'), function(box){
    var i = +box.getAttribute('data-i');
    var ed = box.querySelector('.ed'), lang = box.querySelector('.lang');
    var res = box.querySelector('.result'), runBtn = box.querySelector('.run');
    var hintBtn = box.querySelector('.hint'), hintBox = box.querySelector('.hintbox');
    lang.addEventListener('change', function(){
      var st = STARTERS[i] || {}; ed.value = st[lang.value] || st.python || ed.value;
    });
    if(hintBtn){ hintBtn.addEventListener('click', function(){ hintBox.classList.toggle('show'); }); }
    runBtn.addEventListener('click', function(){
      res.className = 'result wait'; res.textContent = 'Running your code...';
      submit(lang.value, ed.value, function(err, d){
        if(err){ res.className='result fail'; res.textContent='Could not reach the code runner. Check your connection and try again.'; return; }
        var out = (d.stdout!=null)? d.stdout : '';
        var errText = d.stderr || d.compile_output || '';
        var exp = EXPECTED[i];
        if(errText && !out){ res.className='result fail'; res.textContent='Your code hit an error:\\n'+errText; return; }
        if(exp==null){ res.className='result pass'; res.textContent='Output:\\n'+out; return; }
        if(norm(out)===norm(exp)){ res.className='result pass'; res.textContent='Correct! Output:\\n'+out; }
        else { res.className='result fail'; res.textContent='Not quite.\\nExpected:\\n'+exp+'\\nGot:\\n'+(out||'(no output)')+(errText?('\\n'+errText):''); }
      });
    });
  });
`;

module.exports = { render, esc, pseudo, jsonForScript };
