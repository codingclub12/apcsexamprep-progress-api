'use strict';
// -----------------------------------------------------------------------------
//  Renderer for the Create Task bridge page.
//
//  It reuses the eighteen-page coding stylesheet plus a small delta, and the
//  same #apcsp-code wrapper, so a student cannot tell this page came from a
//  different generator. Three things here do not exist on the other eighteen:
//
//    1. stdin. The topic-page runner sends no stdin at all, which is why no
//       problem in Big Idea 3 can involve input. This one sends it.
//    2. a requirement chip row per problem, so the ramp from 2 of 6 to 6 of 6
//       is visible rather than implied.
//    3. a requirement CHECKER on the last problem, which has no expected output
//       because there is no correct answer to "write your own program".
//
//  ── THE CHECKER IS A PORT, NOT AN INVENTION ─────────────────────────────────
//  detectSix() below is the Create Task Builder's own analyze(), narrowed to the
//  two languages this page offers. That is deliberate: a student whose program
//  lights six chips here must light six there, and two independently written
//  detectors would eventually disagree and one of them would be wrong in front
//  of a student. If the Builder's detection changes, this changes with it.
//
//  ── WHY THE JAVASCRIPT PRELUDE IS STRIPPED BEFORE DETECTION ─────────────────
//  Node has no prompt(), so every JavaScript starter opens with four supplied
//  lines that read stdin. Left in, those four lines hand the student two
//  requirements they did not earn: the helper's .split() reads as a list, and
//  the helper being defined and then called reads as "calls a procedure". The
//  checker would then report six on a program with neither. So the supplied
//  lines are removed before detection, and input is instead credited for calling
//  INPUT() in the student's own code. Python needs none of this and gets none.
// -----------------------------------------------------------------------------

const CSS = require('./csp-code-pages-css');
const CSS_DELTA = require('./csp-create-task-bridge-css');
const { esc, pseudo, jsonForScript } = require('./csp-code-pages');

const REQ_LABEL = {
  input: 'Input',
  list: 'List',
  procedure: 'Procedure',
  algorithm: 'Algorithm',
  call: 'Call',
  output: 'Output',
};

function chipRow(p, reqs) {
  const live = p.check === 'six';
  const chips = reqs.map((k) => {
    const on = p.targets.indexOf(k) !== -1;
    // On the checked problem every chip starts neutral and is set by detection.
    // On the other three the chips are a fixed statement about the problem, so
    // an untargeted requirement is simply absent rather than shown as failing.
    if (live) return '<span class="req" data-req="' + k + '">' + REQ_LABEL[k] + '</span>';
    return on ? '<span class="req on">' + REQ_LABEL[k] + '</span>'
      : '<span class="req">' + REQ_LABEL[k] + '</span>';
  }).join('');
  const count = live
    ? 'Requirements detected: <span class="reqnum">0 of 6</span>'
    : 'Requirements in this problem: ' + p.targets.length + ' of ' + reqs.length;
  return '<p class="reqcount">' + count + '</p>\n  <div class="reqrow">' + chips + '</div>';
}

function inputBlock(p) {
  if (p.editableStdin) {
    return '<p class="inlabel">Input sent to your program (edit this)</p>\n  '
      + '<textarea class="in" spellcheck="false">' + esc(p.stdin) + '</textarea>';
  }
  return '<p class="inlabel">Input sent to your program</p>\n  '
    + '<pre class="stdin">' + esc(p.stdin) + '</pre>';
}

function problemHtml(p, i, total, expected, reqs) {
  const ref = p.pseudo && p.pseudo.length
    ? '<details class="ref"><summary>Show AP pseudocode reference</summary><pre class="ps">'
      + pseudo(p.pseudo) + '</pre></details>\n  '
    : '';
  const exp = expected == null
    ? '<p class="muted">No expected output. This one is checked on the six requirements, not on what it prints.</p>'
    : '<p class="muted">Expected output: <code>' + esc(expected).replace(/\n/g, '</code><br><code>') + '</code></p>';
  return '<div class="prob" data-i="' + i + '"' + (p.check === 'six' ? ' data-check="six"' : '') + '>\n'
    + '  <p class="pn">Problem ' + (i + 1) + ' of ' + total + '</p>\n'
    + '  ' + chipRow(p, reqs) + '\n'
    + '  <p class="prompt">' + p.prompt + '</p>\n'
    + '  ' + exp + '\n  '
    + ref
    + '<div class="toolbar">\n<label>Language</label>\n'
    + '    <select class="lang"><option value="python">Python</option>\n'
    + '<option value="javascript">JavaScript</option></select>\n  </div>\n'
    + '  ' + inputBlock(p) + '\n'
    + '  <textarea class="ed" spellcheck="false">' + esc(p.starter.python) + '</textarea>\n'
    + '  <div>\n<button class="run">&#9654; Run &amp; Check</button><button class="hint">Hint</button>\n</div>\n'
    + '  <div class="hintbox">' + p.hint + '</div>\n'
    + '  <div class="result"></div>\n'
    + '</div>';
}

function render(data, expected) {
  if (!Array.isArray(expected) || expected.length !== data.problems.length) {
    throw new Error(`bridge: expected ${data.problems.length} verified outputs, got ${expected && expected.length}`);
  }
  // The checked problem must carry no expected output, and every other problem
  // must carry one. Getting this backwards would either grade a free-form
  // program against a fixed string or let a fixed problem pass on anything.
  data.problems.forEach((p, i) => {
    const isCheck = p.check === 'six';
    if (isCheck && expected[i] != null) throw new Error(`problem ${i + 1} is requirement-checked and must have no expected output`);
    if (!isCheck && !expected[i]) throw new Error(`problem ${i + 1} has no verified expected output`);
  });

  const total = data.problems.length;
  const starters = data.problems.map((p) => ({ python: p.starter.python, javascript: p.starter.javascript }));
  const stdins = data.problems.map((p) => p.stdin);
  const targets = data.problems.map((p) => p.targets);

  const body = '<style>\n' + CSS + '\n' + CSS_DELTA + '\n</style>\n'
    + '<div id="apcsp-code">\n'
    + '<div class="hero">\n'
    + '<p class="eyebrow">AP CSP &middot; Create Performance Task &middot; Coding Practice</p>\n'
    + '<h1>' + esc(data.heading) + '</h1>\n'
    + '<p class="sub">' + esc(data.sub) + '</p>\n'
    + '</div>\n'
    + '<div class="flow">' + esc(data.flow) + '</div>\n'
    + data.problems.map((p, i) => problemHtml(p, i, total, expected[i], data.reqs)).join('\n') + '\n'
    + '<div class="handoff">\n'
    + '<h2>Now write the real one</h2>\n'
    + '<p>The Create Task Builder is the same six-requirement check with a proper editor, a Java option, and room for the whole program. Your work here does not carry over, so take your problem 4 code with you.</p>\n'
    + '<a class="cta" href="' + esc(data.builderUrl) + '">Open the Create Task Builder</a>\n'
    + '</div>\n'
    + '<p class="muted">Your code runs on a secure external service. Nothing you write or type here is stored.</p>\n'
    + '</div>\n'
    + '<script>\n(function(){\n'
    + '  var CFG = ' + jsonForScript({ proxyUrl: 'https://progress.apcsexamprep.com/api/judge0/run', langIds: { python: 71, javascript: 63 } }) + ';\n'
    + '  var STARTERS = ' + jsonForScript(starters) + ';\n'
    + '  var EXPECTED = ' + jsonForScript(expected) + ';\n'
    + '  var STDINS = ' + jsonForScript(stdins) + ';\n'
    + '  var TARGETS = ' + jsonForScript(targets) + ';\n'
    + '  var KEYS = ' + jsonForScript(data.reqs) + ';\n'
    + DETECTOR
    + RUNNER
    + '})();\n</script>';
  return body;
}

// The Create Task Builder's analyze(), narrowed to Python and JavaScript. Kept
// as one string so it is obvious this is transcribed rather than reworked.
const DETECTOR = `  function stripComments(src, lang){
    if (lang === 'python'){ src = src.replace(/'''[\\s\\S]*?'''/g,' ').replace(/"""[\\s\\S]*?"""/g,' ').replace(/#.*$/gm,''); }
    else { src = src.replace(/\\/\\*[\\s\\S]*?\\*\\//g,' ').replace(/(^|[^:])\\/\\/.*$/gm,'$1'); }
    return src;
  }
  function stripPrelude(src){
    return src.split('\\n').filter(function(line){
      if (/readFileSync\\s*\\(\\s*0/.test(line)) return false;
      if (/^\\s*(let|var|const)\\s+_i\\s*=/.test(line)) return false;
      if (/function\\s+INPUT\\s*\\(/.test(line)) return false;
      return true;
    }).join('\\n');
  }
  function detectSix(rawCode, lang){
    var usedHelper = lang !== 'python' && /\\bINPUT\\s*\\(/.test(stripComments(stripPrelude(rawCode), lang));
    var src = stripComments(lang === 'python' ? rawCode : stripPrelude(rawCode), lang);
    var r = { input:false, list:false, procedure:false, algorithm:false, call:false, output:false };
    var hasIf, hasLoop, declNames = [], exprNames = [], i, m, params;
    if (lang === 'python'){
      r.input  = /\\binput\\s*\\(/.test(src) || /\\bsys\\.argv\\b/.test(src) || /\\bopen\\s*\\(/.test(src);
      r.output = /\\bprint\\s*\\(/.test(src);
      r.list   = /=\\s*\\[/.test(src) || /\\[\\s*\\]/.test(src) || /\\.append\\s*\\(/.test(src) || /\\blist\\s*\\(/.test(src) || /\\.split\\s*\\(/.test(src) || /\\[[^\\]\\n]*,[^\\]\\n]*\\]/.test(src);
      var pdef = /def\\s+([A-Za-z_]\\w*)\\s*\\(([^)]*)\\)/g;
      while ((m = pdef.exec(src))){ declNames.push(m[1]); params = m[2].split(',').map(function(s){ return s.trim(); }).filter(Boolean); if (params.length >= 1) { r.procedure = true; } }
      hasIf = /(^|[^\\w])if\\b/.test(src);
      hasLoop = /(^|[^\\w])for\\b/.test(src) || /(^|[^\\w])while\\b/.test(src);
    } else {
      r.input  = usedHelper || /\\bprompt\\s*\\(/.test(src) || /process\\.argv/.test(src) || /process\\.stdin/.test(src) || /readline/.test(src);
      r.output = /console\\s*\\.\\s*log\\s*\\(/.test(src);
      r.list   = /=\\s*\\[/.test(src) || /\\[\\s*\\]/.test(src) || /\\.push\\s*\\(/.test(src) || /new\\s+Array/.test(src) || /\\.split\\s*\\(/.test(src) || /\\.map\\s*\\(/.test(src) || /\\.filter\\s*\\(/.test(src) || /\\[[^\\]\\n]*,[^\\]\\n]*\\]/.test(src);
      var fnDecl = /function\\s+([A-Za-z_$][\\w$]*)\\s*\\(([^)]*)\\)/g;
      while ((m = fnDecl.exec(src))){ declNames.push(m[1]); params = (m[2] || '').split(',').map(function(s){ return s.trim(); }).filter(Boolean); if (params.length >= 1) { r.procedure = true; } }
      var fnExpr = [
        /(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*function\\s*\\(([^)]*)\\)/g,
        /(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*\\(([^)]*)\\)\\s*=>/g
      ];
      for (i = 0; i < fnExpr.length; i++){
        while ((m = fnExpr[i].exec(src))){ exprNames.push(m[1]); params = (m[2] || '').split(',').map(function(s){ return s.trim(); }).filter(Boolean); if (params.length >= 1) { r.procedure = true; } }
      }
      var arrow1 = /(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*([A-Za-z_$][\\w$]*)\\s*=>/g;
      while ((m = arrow1.exec(src))){ exprNames.push(m[1]); r.procedure = true; }
      hasIf = /\\bif\\s*\\(/.test(src);
      hasLoop = /\\bfor\\s*\\(/.test(src) || /\\bwhile\\s*\\(/.test(src);
    }
    r.algorithm = hasIf && hasLoop;
    function escName(n){ return n.replace(/[.*+?^\${}()|[\\]\\\\]/g,'\\\\$&'); }
    function countCalls(name){ var re = new RegExp('\\\\b' + escName(name) + '\\\\s*\\\\(', 'g'); return (src.match(re) || []).length; }
    var declU = declNames.filter(function(v, idx){ return declNames.indexOf(v) === idx; });
    var exprU = exprNames.filter(function(v, idx){ return exprNames.indexOf(v) === idx; });
    r.call = declU.some(function(n){ return countCalls(n) >= 2; }) || exprU.some(function(n){ return countCalls(n) >= 1; });
    return r;
  }
`;

const RUNNER = `  var root = document.getElementById("apcsp-code");
  if(!root) return;
  function norm(s){ return String(s==null?'':s).replace(/\\r/g,'').replace(/[ \\t]+$/gm,'').replace(/\\n+$/,''); }
  function submit(lang, code, stdin, cb){
    var body = JSON.stringify({ code: code, language_id: CFG.langIds[lang], stdin: stdin });
    fetch(CFG.proxyUrl, { method:'POST', headers: {'Content-Type':'application/json'}, body: body })
      .then(function(r){ return r.json(); })
      .then(function(d){ cb(null, d); })
      .catch(function(e){ cb(e); });
  }
  Array.prototype.forEach.call(root.querySelectorAll('.prob'), function(box){
    var i = +box.getAttribute('data-i');
    var checks = box.getAttribute('data-check') === 'six';
    var ed = box.querySelector('.ed'), lang = box.querySelector('.lang');
    var inBox = box.querySelector('.in');
    var res = box.querySelector('.result'), runBtn = box.querySelector('.run');
    var hintBtn = box.querySelector('.hint'), hintBox = box.querySelector('.hintbox');
    var num = box.querySelector('.reqnum');
    function stdinFor(){ return inBox ? inBox.value : STDINS[i]; }
    function paint(){
      if(!checks) return;
      var r = detectSix(ed.value, lang.value), n = 0;
      KEYS.forEach(function(k){
        var chip = box.querySelector('.req[data-req="' + k + '"]');
        if(!chip) return;
        chip.className = 'req ' + (r[k] ? 'on' : 'off');
        if(r[k]) n++;
      });
      if(num){ num.textContent = n + ' of ' + KEYS.length; }
      return n;
    }
    lang.addEventListener('change', function(){
      var st = STARTERS[i] || {}; ed.value = st[lang.value] || st.python || ed.value; paint();
    });
    if(checks){ ed.addEventListener('input', paint); paint(); }
    if(hintBtn){ hintBtn.addEventListener('click', function(){ hintBox.classList.toggle('show'); }); }
    runBtn.addEventListener('click', function(){
      res.className = 'result wait'; res.textContent = 'Running your code...';
      submit(lang.value, ed.value, stdinFor(), function(err, d){
        if(err){ res.className='result fail'; res.textContent='Could not reach the code runner. Check your connection and try again.'; return; }
        var out = (d.stdout!=null)? d.stdout : '';
        var errText = d.stderr || d.compile_output || '';
        if(errText && !out){ res.className='result fail'; res.textContent='Your code hit an error:\\n'+errText; return; }
        if(checks){
          var n = paint();
          var missing = KEYS.filter(function(k){ return box.querySelector('.req[data-req="' + k + '"]').className.indexOf('on') === -1; });
          var head = n === KEYS.length
            ? 'All six requirements detected. This program would satisfy the Create Task checklist.'
            : n + ' of ' + KEYS.length + ' requirements detected. Still missing: ' + missing.join(', ') + '.';
          res.className = 'result ' + (n === KEYS.length ? 'pass' : 'fail');
          res.textContent = head + '\\n\\nYour output:\\n' + (out || '(no output)') + (errText ? ('\\n' + errText) : '');
          return;
        }
        var exp = EXPECTED[i];
        if(norm(out)===norm(exp)){
          var have = detectSix(ed.value, lang.value);
          var lack = (TARGETS[i] || []).filter(function(k){ return !have[k]; });
          if(lack.length){
            res.className='result fail';
            res.textContent='Your output is right, but this problem is about '+lack.join(' and ')
              +', and that is not in your code yet.\\nPrinting the right answer another way does not count here,'
              +' because the Create Task is scored on what your program does, not on what it prints.\\n\\nOutput:\\n'+out;
            return;
          }
          res.className='result pass'; res.textContent='Correct! Output:\\n'+out;
        }
        else { res.className='result fail'; res.textContent='Not quite.\\nExpected:\\n'+exp+'\\nGot:\\n'+(out||'(no output)')+(errText?('\\n'+errText):''); }
      });
    });
  });
`;

module.exports = { render, DETECTOR, RUNNER };
