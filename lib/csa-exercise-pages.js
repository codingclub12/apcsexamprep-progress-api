'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CSA EXERCISE PAGES: THE RENDERER.
//
//  WHAT THIS BUILDS
//  53 pages, one per AP CSA lesson of the 2025-2026 four-unit CED:
//
//      ap-csa-lesson-{U}-{L}-{slug}-exercise-1
//
//  Each is a real Java editor: the student writes code, runs it against their own
//  input, and submits it to be graded server side against hidden test cases.
//
//  WHY THESE 53
//  Measured live against the Shopify Admin API on 2026-08-17, not assumed. Every
//  one of the 53 lessons has a live lesson page and NOT ONE has an exercise page:
//  a handle query for ap-csa-lesson* returns 56 pages (53 lessons plus three
//  duplicated handles) and none of them ends in an activity token. Meanwhile
//  seed/csa-course-manifest.js has been seeding an `exercise-1` denominator worth
//  1 point for all 53 lessons since it was written, so every CSA class already
//  carries 53 gradebook columns that nothing could ever fill. The Teacher Bundle
//  promises practice per lesson; these are the pages that make that true.
//
//  THE THREE LESSONS WITH TWO LESSON PAGES
//  2.9, 2.10 and 2.12 each have two live handles. The exercise handle is built
//  from the one the Unit 2 course hub actually links to, checked by reading the
//  hub body, because that is the page students are sent to and therefore the page
//  the Back link has to return them to. Routing is unaffected either way:
//  pageFromHandle keys CSA off ap-csa-lesson-{U}-{L}- and ignores the slug.
//
//  HOW A PAGE GRADES
//  POST /api/student/code-grade with item exercise-1. The test cases live in
//  code_test_cases and never reach the browser. What the page ships is the task,
//  the starter, the visible sample cases and nothing else: no expected output for
//  a hidden case, no reference solution, no answer key of any kind. The three
//  submission shapes (program, driver) are assembled server side by
//  lib/csa-code-modes.js.
//
//  THE RUN BUTTON IS NOT THE GRADE BUTTON, DELIBERATELY
//  Run goes to /api/judge0/run with whatever the student typed and whatever
//  input they typed, and grades nothing. It is the compiler feedback loop, and it
//  works signed out. Submit is the graded path and needs a student token. Keeping
//  them separate means a student can debug for twenty minutes without spending a
//  grade attempt, and it means the rate limit that matters (grading) is not being
//  eaten by ordinary iteration.
//
//  HOUSE HAZARDS APPLIED
//    - All CSS scoped under one wrapper id with `all:initial !important`.
//    - Every colour hardcoded with `!important` and `-webkit-text-fill-color`,
//      because Shopify reverts button and title colours on save.
//    - `repeat(N,1fr)` grids, never `auto-fit`.
//    - Pure ASCII. HTML entities outside script blocks, never inside them, and
//      never `&quot;` in an attribute.
//    - Java source (which is full of double quotes and angle brackets) NEVER goes
//      into an attribute or a script literal. It goes in the text content of a
//      textarea, which is the one place both survive a Shopify save and a CSV
//      round trip intact.
//    - No emojis, no em-dashes.
//
//  Zero PII: author content only.
// ─────────────────────────────────────────────────────────────────────────────

const exercises = require('../seed/csa-exercises');
const { COURSES } = require('../utils');

const COURSE = 'ap-csa';
const ITEM = 'exercise-1';

// Live unit hub handles, confirmed against the Admin API on 2026-08-17. They are
// not derivable from the unit key (Unit 1's hub is titled "Primitive Types" while
// the course config calls the unit "Using Objects and Methods"), so they are
// listed rather than built.
const UNIT_HUBS = {
  'unit-1': 'ap-csa-unit-1-course',
  'unit-2': 'ap-csa-unit-2-course',
  'unit-3': 'ap-csa-unit-3-course',
  'unit-4': 'ap-csa-unit-4-course',
};

// The palette the live CSA lesson pages paint with.
const C = {
  accent: '#b45309',
  accentDk: '#92400e',
  accentLt: '#fcd34d',
  accentBg: '#fffbeb',
  navy: '#1c1917',
  slate: '#57534e',
  green: '#15803d',
  red: '#b91c1c',
  ink: '#0f172a',
};

// Author content is trusted and still has to survive a CSV round trip and the
// Shopify sanitizer. Deliberately does NOT emit &quot;: an attribute carrying it
// is decoded back to a literal quote on save and breaks the attribute. Java
// source is never placed in an attribute for exactly that reason.
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Lesson ordering, taken from the course config so a page can say where it sits
// without restating the curriculum.
function lessonIndex() {
  const out = new Map();
  for (const [unit, cfg] of Object.entries(COURSES[COURSE].units)) {
    cfg.lessons.forEach((lesson, i) => {
      out.set(lesson, { unit, unitLabel: cfg.label, seq: i, of: cfg.lessons.length });
    });
  }
  return out;
}
const LESSONS = lessonIndex();

function unitNumber(unit) {
  return Number(String(unit).replace('unit-', ''));
}

// ── CSS ──────────────────────────────────────────────────────────────────────
function pageCss(id) {
  const s = `#${id}`;
  return `<style>
.page-title,.article__title,.page__title,.template-page main h1:first-of-type{display:none!important;visibility:hidden!important}
${s}{all:initial!important;display:block!important;box-sizing:border-box!important;max-width:900px!important;margin:0 auto!important;padding:8px 16px 56px!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif!important;color:${C.navy}!important;-webkit-text-fill-color:${C.navy}!important;line-height:1.6!important;font-size:17px!important;background:#fafaf9!important}
${s} *,${s} *::before,${s} *::after{box-sizing:border-box!important}
${s} .hero{background:linear-gradient(135deg,${C.accentDk},${C.accent})!important;color:#fff!important;-webkit-text-fill-color:#fff!important;border-radius:16px!important;padding:26px 24px!important;margin:8px 0 20px!important}
${s} .eyebrow{font-size:13px!important;letter-spacing:.08em!important;text-transform:uppercase!important;color:${C.accentLt}!important;-webkit-text-fill-color:${C.accentLt}!important;margin:0 0 8px!important}
${s} h1{font-size:28px!important;line-height:1.2!important;margin:0!important;color:#fff!important;-webkit-text-fill-color:#fff!important;font-weight:800!important}
${s} .hero .sub{font-size:16px!important;margin:10px 0 0!important;color:#fef3c7!important;-webkit-text-fill-color:#fef3c7!important}
${s} h2{font-size:21px!important;color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important;margin:30px 0 8px!important;font-weight:800!important;border-bottom:3px solid ${C.accentLt}!important;padding-bottom:6px!important}
${s} p{margin:8px 0!important;color:${C.navy}!important;-webkit-text-fill-color:${C.navy}!important}
${s} ol,${s} ul{margin:8px 0!important;padding-left:26px!important}
${s} li{margin:6px 0!important;color:${C.navy}!important;-webkit-text-fill-color:${C.navy}!important}
${s} .navrow{margin:0 0 20px!important}
${s} .btn,${s} .btn:link,${s} .btn:visited{display:inline-block!important;background:${C.accent}!important;color:#fff!important;-webkit-text-fill-color:#fff!important;text-decoration:none!important;font-weight:700!important;border-radius:10px!important;padding:10px 16px!important;border:0!important;cursor:pointer!important;font-size:15px!important;font-family:inherit!important;margin:4px 8px 4px 0!important}
${s} .btn.ghost,${s} .btn.ghost:link,${s} .btn.ghost:visited{background:#fff!important;color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important;border:2px solid ${C.accentLt}!important}
${s} .btn.go{background:${C.green}!important;color:#fff!important;-webkit-text-fill-color:#fff!important}
${s} .btn:disabled{opacity:.55!important;cursor:default!important}
${s} .card{background:#fff!important;border:1px solid #e7e5e4!important;border-radius:14px!important;padding:18px 20px!important;margin:16px 0!important}
${s} .brief{background:#fff!important;border:1px solid #e7e5e4!important;border-left:5px solid ${C.accent}!important;border-radius:0 12px 12px 0!important;padding:16px 18px!important;margin:16px 0 24px!important}
${s} .label{font-size:12px!important;font-weight:800!important;letter-spacing:.05em!important;text-transform:uppercase!important;color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important;margin:0 0 6px!important}
${s} .io{display:grid!important;grid-template-columns:repeat(2,1fr)!important;gap:12px!important;margin:12px 0!important}
${s} .io .box{background:${C.accentBg}!important;border:1px solid #fde68a!important;border-radius:10px!important;padding:12px 14px!important;font-size:15px!important}
@media (max-width:640px){${s} .io{grid-template-columns:repeat(1,1fr)!important}}
${s} pre,${s} code{font-family:"SFMono-Regular",Consolas,Menlo,monospace!important}
${s} pre.api{background:${C.ink}!important;color:#e2e8f0!important;-webkit-text-fill-color:#e2e8f0!important;border-radius:10px!important;padding:12px 14px!important;margin:8px 0!important;font-size:14px!important;line-height:1.6!important;white-space:pre!important;overflow-x:auto!important}
${s} .samples{display:grid!important;grid-template-columns:repeat(2,1fr)!important;gap:12px!important}
@media (max-width:760px){${s} .samples{grid-template-columns:repeat(1,1fr)!important}}
${s} .sample{border:1px solid #e7e5e4!important;border-radius:10px!important;overflow:hidden!important;background:#fff!important}
${s} .sample .head{background:${C.accentBg}!important;padding:6px 12px!important;font-size:12px!important;font-weight:800!important;letter-spacing:.05em!important;text-transform:uppercase!important;color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important}
${s} .sample pre{margin:0!important;padding:10px 12px!important;font-size:14px!important;white-space:pre-wrap!important;word-break:break-word!important;color:${C.ink}!important;-webkit-text-fill-color:${C.ink}!important;background:#fff!important;line-height:1.55!important}
${s} .editorwrap{border:2px solid ${C.accentLt}!important;border-radius:12px!important;overflow:hidden!important;background:${C.ink}!important;margin:10px 0!important}
${s} .editorwrap .bar{background:#1e293b!important;padding:6px 12px!important;font-size:12px!important;color:#cbd5e1!important;-webkit-text-fill-color:#cbd5e1!important;letter-spacing:.05em!important;text-transform:uppercase!important;font-weight:700!important}
${s} textarea.code{display:block!important;width:100%!important;min-height:340px!important;border:0!important;outline:none!important;resize:vertical!important;padding:14px!important;background:${C.ink}!important;color:#e2e8f0!important;-webkit-text-fill-color:#e2e8f0!important;font-family:"SFMono-Regular",Consolas,Menlo,monospace!important;font-size:14px!important;line-height:1.6!important;tab-size:2!important;white-space:pre!important;overflow-wrap:normal!important;overflow-x:auto!important}
${s} textarea.stdin{display:block!important;width:100%!important;min-height:72px!important;border:1px solid #e7e5e4!important;border-radius:10px!important;padding:10px 12px!important;background:#fff!important;color:${C.ink}!important;-webkit-text-fill-color:${C.ink}!important;font-family:"SFMono-Regular",Consolas,Menlo,monospace!important;font-size:14px!important;resize:vertical!important}
${s} .hidden{display:none!important}
${s} pre.console{background:${C.ink}!important;color:#e2e8f0!important;-webkit-text-fill-color:#e2e8f0!important;border-radius:10px!important;padding:12px 14px!important;margin:10px 0 0!important;font-size:14px!important;min-height:56px!important;white-space:pre-wrap!important;word-break:break-word!important;line-height:1.55!important;max-height:340px!important;overflow-y:auto!important}
${s} pre.console .err{color:#fca5a5!important;-webkit-text-fill-color:#fca5a5!important}
${s} .verdict{border-radius:10px!important;padding:14px 16px!important;margin:12px 0 0!important;font-size:15px!important;border:1px solid #e7e5e4!important;background:#fff!important}
${s} .verdict.pass{background:#f0fdf4!important;border-color:#bbf7d0!important;color:#14532d!important;-webkit-text-fill-color:#14532d!important}
${s} .verdict.part{background:${C.accentBg}!important;border-color:#fde68a!important;color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important}
${s} .verdict.fail{background:#fef2f2!important;border-color:#fecaca!important;color:#7f1d1d!important;-webkit-text-fill-color:#7f1d1d!important}
${s} .verdict strong{font-size:17px!important}
${s} details{background:#fff!important;border:1px solid #e7e5e4!important;border-radius:10px!important;padding:10px 14px!important;margin:8px 0!important}
${s} summary{cursor:pointer!important;font-weight:700!important;color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important;font-size:15px!important}
${s} .muted{color:${C.slate}!important;-webkit-text-fill-color:${C.slate}!important;font-size:14px!important}
${s} .nextnav{display:grid!important;grid-template-columns:repeat(2,1fr)!important;gap:12px!important;margin-top:28px!important}
${s} .nextnav a,${s} .nextnav a:link,${s} .nextnav a:visited{display:block!important;background:#fff!important;border:1px solid #e7e5e4!important;border-radius:12px!important;padding:14px 16px!important;text-decoration:none!important;color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important;font-weight:700!important;font-size:15px!important}
@media (max-width:640px){${s} .nextnav{grid-template-columns:repeat(1,1fr)!important}}
</style>`;
}

// ── THE PAGE SCRIPT ──────────────────────────────────────────────────────────
// Inside a script block: no HTML entities, ever, because an entity here is parsed
// as literal text and breaks the block. Java source never appears in this script;
// it is read out of textarea elements at runtime, which is what keeps quotes and
// angle brackets out of both attributes and this literal.
function pageScript() {
  return `<script>
(function(){
  var API = 'https://progress.apcsexamprep.com';
  var root = document.getElementById('csa-x1');
  if (!root) { return; }

  var course = root.getAttribute('data-course');
  var unit = root.getAttribute('data-unit');
  var lesson = root.getAttribute('data-lesson');
  var item = root.getAttribute('data-activity');
  var mode = root.getAttribute('data-mode');

  var codeBox = document.getElementById('x1-code');
  var stdinBox = document.getElementById('x1-stdin');
  var out = document.getElementById('x1-console');
  var verdict = document.getElementById('x1-verdict');
  var runBtn = document.getElementById('x1-run');
  var gradeBtn = document.getElementById('x1-grade');
  var resetBtn = document.getElementById('x1-reset');
  var starter = document.getElementById('x1-starter');
  var runHarness = document.getElementById('x1-runharness');

  function token(){
    try {
      return localStorage.getItem('apcse_token')
        || localStorage.getItem('apcs_student_token')
        || localStorage.getItem('student_token')
        || null;
    } catch (e) { return null; }
  }

  function say(text, isError){
    out.textContent = '';
    var span = document.createElement('span');
    if (isError) { span.className = 'err'; }
    span.textContent = text;
    out.appendChild(span);
  }

  /* Driver exercises submit class definitions with no main, so the Run button
     needs a main to run. It appends the SAMPLE harness printed on the page,
     which is not the harness that grades. The public strip and the import lift
     below mirror what lib/csa-code-modes.js does on the server; Run is not
     graded, so an approximation here is fine, and grading never uses it. */
  function liftImports(text){
    var lines = text.split('\\n');
    var imports = [];
    var rest = [];
    for (var i = 0; i < lines.length; i++) {
      if (/^[ \\t]*import[ \\t]+[A-Za-z_$][\\w$.]*(\\.\\*)?[ \\t]*;[ \\t]*$/.test(lines[i])) {
        var trimmed = lines[i].replace(/^\\s+|\\s+$/g, '');
        if (imports.indexOf(trimmed) === -1) { imports.push(trimmed); }
      } else {
        rest.push(lines[i]);
      }
    }
    return { imports: imports, rest: rest.join('\\n') };
  }

  function assemble(){
    var source = codeBox.value;
    if (mode !== 'driver') { return source; }
    var student = liftImports(source.replace(/(^|\\n)([ \\t]*)public[ \\t]+(?=(final[ \\t]+|abstract[ \\t]+)*(class|interface|enum|record)[ \\t])/g, '$1$2'));
    var harness = liftImports(runHarness.value);
    var all = student.imports.concat(harness.imports);
    var seen = [];
    for (var i = 0; i < all.length; i++) {
      if (seen.indexOf(all[i]) === -1) { seen.push(all[i]); }
    }
    var head = seen.length ? seen.join('\\n') + '\\n\\n' : '';
    return head + student.rest + '\\n\\n' + harness.rest + '\\n';
  }

  function busy(on){
    runBtn.disabled = on;
    gradeBtn.disabled = on;
  }

  runBtn.addEventListener('click', function(){
    busy(true);
    say('Compiling and running...');
    verdict.className = 'verdict hidden';
    fetch(API + '/api/judge0/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: assemble(), language_id: 62, stdin: stdinBox.value })
    }).then(function(r){ return r.json().then(function(d){ return { ok: r.ok, d: d }; }); })
      .then(function(res){
        busy(false);
        var d = res.d || {};
        if (!res.ok) {
          say(d.message || 'The code runner is busy. Wait a moment and try again.', true);
          return;
        }
        if (d.compile_output) { say(d.compile_output, true); return; }
        var text = d.stdout || '';
        if (d.stderr) { text = text + (text ? '\\n' : '') + d.stderr; }
        if (!text) { text = '(the program printed nothing)'; }
        say(text, !!d.stderr);
      })
      .catch(function(){
        busy(false);
        say('Could not reach the code runner. Check your connection and try again.', true);
      });
  });

  resetBtn.addEventListener('click', function(){
    codeBox.value = starter.value;
    say('Starter code restored.');
    verdict.className = 'verdict hidden';
  });

  function show(kind, html){
    verdict.className = 'verdict ' + kind;
    verdict.innerHTML = html;
  }

  gradeBtn.addEventListener('click', function(){
    var t = token();
    if (!t) {
      show('part', '<strong>Sign in to be graded.</strong><br>Run still works while you are signed out, but a grade has to know whose it is. '
        + '<a href="/pages/join">Sign in or join your class</a>, then come back and submit.');
      return;
    }
    busy(true);
    say('Submitting for grading. This runs your code against every test case, so give it a moment...');
    verdict.className = 'verdict hidden';
    fetch(API + '/api/student/code-grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
      body: JSON.stringify({
        course: course, unit: unit, lesson: lesson, item: item,
        language: 'java', source: codeBox.value
      })
    }).then(function(r){ return r.json().then(function(d){ return { status: r.status, d: d }; }); })
      .then(function(res){
        busy(false);
        var d = res.d || {};
        if (res.status === 401) {
          show('part', '<strong>Your sign in has expired.</strong> <a href="/pages/join">Sign in again</a> and resubmit. Nothing was recorded.');
          return;
        }
        if (res.status === 404) {
          show('part', '<strong>This exercise is not graded yet.</strong> Your work is safe in the editor. Run it to check it yourself, and try submitting again later.');
          return;
        }
        if (res.status === 429) {
          show('part', '<strong>Too many submissions.</strong> Wait a minute, then submit again. Nothing was recorded, so your score has not been hurt.');
          return;
        }
        if (res.status >= 500 || res.status === 502 || res.status === 503) {
          show('fail', '<strong>The code runner is unavailable.</strong> Your attempt was NOT graded and no zero was recorded. Try again shortly.');
          return;
        }
        if (!d || typeof d.passed !== 'number') {
          show('fail', '<strong>Not graded.</strong> ' + (d && d.error ? d.error : 'Something went wrong. Nothing was recorded.'));
          return;
        }
        var all = d.passed === d.total;
        var none = d.passed === 0;
        var msg = '<strong>' + d.passed + ' of ' + d.total + ' test cases passed.</strong>';
        msg = msg + '<br>Recorded: ' + d.points_earned + ' out of ' + d.points_possible + ' points.';
        if (d.failing_case_summary && d.failing_case_summary.message) {
          msg = msg + '<br>' + d.failing_case_summary.message;
        }
        if (all) { msg = msg + '<br>Every case, including the hidden ones. Nothing left to fix here.'; }
        show(all ? 'pass' : (none ? 'fail' : 'part'), msg);
      })
      .catch(function(){
        busy(false);
        show('fail', '<strong>Could not reach the grader.</strong> Your attempt was not recorded. Check your connection and submit again.');
      });
  });

  say('Write your answer, then press Run to try it. Submit for grading when you are ready.');
})();
<\/script>`;
}

// ── ONE PAGE ─────────────────────────────────────────────────────────────────
function renderExercise(x, expected) {
  const meta = LESSONS.get(x.lesson);
  if (!meta) throw new Error(`unknown ap-csa lesson: ${x.lesson}`);
  if (meta.unit !== x.unit) {
    throw new Error(`ap-csa ${x.lesson}: exercise says ${x.unit}, course config says ${meta.unit}`);
  }
  const id = 'csa-x1';
  const handle = `${x.handle}-${ITEM}`;
  const un = unitNumber(x.unit);
  const hub = UNIT_HUBS[x.unit];

  const steps = x.task.map((t) => `      <li>${esc(t)}</li>`).join('\n');
  const hints = x.hints.map((h, i) =>
    `    <details><summary>Hint ${i + 1}</summary><p>${esc(h)}</p></details>`).join('\n');

  // Only the visible cases are rendered, and their expected output is the
  // verified one from the generated key. A hidden case appears nowhere on this
  // page, which is the entire reason a hardcoded answer cannot pass.
  const visible = x.cases
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => !c.hidden);
  const samples = visible.map(({ c, i }, n) => {
    const key = exercises.caseKey(x.lesson, i);
    const shown = expected[key];
    if (shown == null) throw new Error(`ap-csa ${x.lesson}: no verified output for visible case ${i}`);
    const stdin = String(c.stdin || '');
    return `      <div class="sample">
        <div class="head">Example ${n + 1} input</div>
        <pre>${esc(stdin.replace(/\n$/, '')) || '(no input)'}</pre>
        <div class="head">Example ${n + 1} output</div>
        <pre>${esc(String(shown).replace(/\n$/, '')) || '(no output)'}</pre>
      </div>`;
  }).join('\n');

  const apiBlock = x.mode === 'driver' ? `  <h2>The class the grader will call</h2>
  <p>Your answer must declare exactly these, spelled exactly like this. The grader creates the object and calls the methods itself, so a method under a different name is a method it cannot find.</p>
  <pre class="api">${x.api.map(esc).join('\n')}</pre>
  <p class="muted">Do not write a class named Main and do not write a main method. The grader supplies its own.</p>
` : '';

  const runNote = x.mode === 'driver'
    ? `  <p class="muted">Run uses the sample main shown below, which is not the one that grades you. Submitting runs your class against the real cases, including hidden ones.</p>
  <details><summary>The sample main the Run button uses</summary><pre class="api">${esc(x.runHarness)}</pre></details>`
    : '  <p class="muted">Run sends whatever is in the input box below. Submitting runs your program against every test case, including hidden ones with different input.</p>';

  const firstStdin = visible.length ? String(visible[0].c.stdin || '') : '';

  const bodyHtml = `${pageCss(id)}
<div id="${id}" class="lesson-page" data-course="${COURSE}" data-unit="${x.unit}" data-lesson="${x.lesson}" data-lesson-id="${x.lesson}" data-activity="${ITEM}" data-activity-type="${ITEM}" data-mode="${x.mode}">
  <div class="hero">
    <p class="eyebrow">${esc(meta.unitLabel)} &middot; Lesson ${x.lesson} &middot; Exercise 1</p>
    <h1>${esc(x.name)}</h1>
    <p class="sub">${esc(x.title)}. Write real Java, run it, and submit it to be graded against hidden test cases.</p>
  </div>
  <p class="navrow"><a class="btn" href="/pages/${x.handle}">Back to the Lesson ${x.lesson} page</a><a class="btn ghost" href="/pages/${hub}">All Unit ${un} lessons</a></p>
  <div class="brief">
    <p class="label">Why this one is worth doing</p>
    <p>${esc(x.brief)}</p>
  </div>

  <h2>What to write</h2>
  <div class="card">
    <ol>
${steps}
    </ol>
    <div class="io">
      <div class="box"><p class="label">Your program reads</p><p>${esc(x.reads)}</p></div>
      <div class="box"><p class="label">Your program prints</p><p>${esc(x.prints)}</p></div>
    </div>
  </div>

${apiBlock}  <h2>Worked examples</h2>
  <p class="muted">These are the cases you can see. There are more you cannot, and they use different values, so an answer that prints these numbers as constants will fail.</p>
  <div class="samples">
${samples}
  </div>

  <h2>Your answer</h2>
  <div class="editorwrap">
    <div class="bar">Main.java</div>
    <textarea class="code" id="x1-code" spellcheck="false">${esc(x.starter)}</textarea>
  </div>
  <p class="label">Input for the Run button</p>
  <textarea class="stdin" id="x1-stdin" spellcheck="false">${esc(firstStdin.replace(/\n$/, ''))}</textarea>
${runNote}
  <p><button type="button" class="btn" id="x1-run">Run</button><button type="button" class="btn ghost" id="x1-reset">Reset to starter</button><button type="button" class="btn go" id="x1-grade">Submit for grading</button></p>
  <pre class="console" id="x1-console"></pre>
  <div class="verdict hidden" id="x1-verdict"></div>

  <h2>Stuck?</h2>
${hints}

  <h2>Where to go next</h2>
  <div class="nextnav">
    <a href="/pages/${x.handle}">Rework the Lesson ${x.lesson} page</a>
    <a href="/pages/${hub}">Pick another Unit ${un} lesson</a>
  </div>

  <textarea class="hidden" id="x1-starter">${esc(x.starter)}</textarea>
  <textarea class="hidden" id="x1-runharness">${esc(x.mode === 'driver' ? x.runHarness : '')}</textarea>
</div>
${pageScript()}`;

  return {
    kind: ITEM,
    unit: x.unit,
    lesson: x.lesson,
    mode: x.mode,
    lessonHandle: x.handle,
    handle,
    cases: x.cases.length,
    hiddenCases: x.cases.filter((c) => c.hidden).length,
    title: `AP CSA ${x.lesson} Exercise 1: ${x.name}`,
    bodyHtml,
    seoTitle: `AP CSA ${x.lesson} Coding Exercise: ${x.name}`.slice(0, 70),
    seoDescription: x.seo,
  };
}

function allPages() {
  const expected = require(exercises.EXPECTED_FILE).cases;
  return exercises.all().map((x) => renderExercise(x, expected));
}

module.exports = { allPages, renderExercise, esc, UNIT_HUBS, LESSONS, ITEM, COURSE };
