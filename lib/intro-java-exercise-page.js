'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  ONE CODE EXERCISE PAGE PER INTRO TO JAVA LESSON THAT HAS ONE.
//
//  A real Java editor, a Run button that ANIMATES what the student wrote, and a
//  Submit button graded server side against hidden cases.
//
//  ── WHAT IS DIFFERENT FROM THE CSA EXERCISE PAGES ───────────────────────────
//  The CSA pages assemble their own Run source in the browser, which works
//  because a CSA submission is already a whole program. An intro-java submission
//  is a bare method that means nothing without the Greenfoot stub, so Run posts
//  to /api/intro-java/trace and the server assembles it through the same code
//  path the grader uses. That is not a convenience: two copies of the assembly
//  rule would drift, and the drift would show up as Run and Submit disagreeing
//  about a student's own code.
//
//  Run comes back with recorded frames rather than text, and the page animates
//  them on a canvas. See docs/greenfoot-trace.md.
//
//  ── THE HANDLE ──────────────────────────────────────────────────────────────
//  `{lessonHandle}-code`, so pageFromHandle reads activity_type 'code', which is
//  the name docs/intro-java-course-spec.md gave this item before it was built.
//  A suffix outside ACTIVITY_TOKENS would have come back as 'lesson' and
//  recorded a VISIT to the lesson from a page nobody opened the lesson on.
//
//  ── HIDDEN CASES APPEAR NOWHERE ─────────────────────────────────────────────
//  Only visible cases are rendered, with the verified output from the generated
//  file. That is the entire reason a hardcoded answer cannot pass.
//
//  Pure ASCII, no em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

const { esc, escAttr, SITE, COURSE_URL, unitHandle, handleFor: lessonHandleOf } = require('./intro-java-page');
const { EXERCISES, itemId, readExpected } = require('../seed/intro-java-exercises');
const { BANKS } = require('../seed/intro-java-banks');

const WRAP = 'ij-code';
const API = 'https://progress.apcsexamprep.com';

/** lesson id -> the authored lesson object plus its unit, from the banks. */
function lessonIndex() {
  const map = new Map();
  for (const bank of BANKS) {
    for (const l of bank.lessons) {
      map.set(l.lesson, { lesson: l, unit: bank.unit, unitLabel: bank.label });
    }
  }
  return map;
}

// The lesson page handle comes from lib/intro-java-page.js, NOT from a slug
// derived here. The first version rebuilt it by slugifying the title, which
// matched today and would have drifted the moment an authored `slug` differed
// from its title, which is the entire reason `slug` is a separate field. A
// drifted handle here means every link back to the lesson 404s.
function lessonHandleFor(lessonObj) { return lessonHandleOf(lessonObj); }

/** The exercise page handle for an authored lesson object. */
function handleFor(lessonObj) { return `${lessonHandleOf(lessonObj)}-code`; }

/**
 * Cut a string to a length without splitting the last word.
 *
 * Parenthesised on purpose, and written as a function for the same reason
 * lib/intro-java-project-page.js has one: an inline `.slice()` after a
 * multi-part template binds to the LAST operand alone and the cap silently does
 * nothing. That is exactly what happened here first, and the descriptions came
 * out at up to 198 characters against a 160 ceiling.
 */
function clamp(str, max) {
  const t = String(str);
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > 40 ? cut.slice(0, space) : cut).replace(/[ ,.]+$/, '')}.`;
}

function renderCss() {
  return `<style>
#${WRAP} { all: initial !important; display: block !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
  color: #16202b !important; line-height: 1.65 !important; max-width: 880px !important;
  margin: 0 auto !important; padding: 8px 16px 64px !important; }
#${WRAP} * { box-sizing: border-box !important; }
#${WRAP} h1 { font-size: 32px !important; line-height: 1.15 !important; margin: 0 0 10px !important;
  color: #10306b !important; -webkit-text-fill-color: #10306b !important; font-weight: 700 !important; }
#${WRAP} h2 { font-size: 21px !important; margin: 32px 0 10px !important; color: #10306b !important;
  -webkit-text-fill-color: #10306b !important; font-weight: 700 !important; }
#${WRAP} p, #${WRAP} li { font-size: 17px !important; color: #16202b !important;
  -webkit-text-fill-color: #16202b !important; }
#${WRAP} a { color: #0b5cd5 !important; -webkit-text-fill-color: #0b5cd5 !important; }
#${WRAP} .ij-meta { font-size: 14px !important; color: #5a6672 !important;
  -webkit-text-fill-color: #5a6672 !important; margin: 0 0 16px !important; }
#${WRAP} .ij-brief { background: #eef4ff !important; border: 1px solid #c5d8fb !important;
  padding: 12px 16px !important; border-radius: 6px !important; margin: 0 0 20px !important; }
#${WRAP} .ij-note { background: #fbf7ec !important; border: 1px solid #ecdfc0 !important;
  padding: 12px 16px !important; border-radius: 6px !important; margin: 16px 0 !important;
  font-size: 16px !important; }
#${WRAP} ol, #${WRAP} ul { padding-left: 24px !important; }
#${WRAP} ol li { margin: 0 0 6px !important; }
#${WRAP} textarea { width: 100% !important; min-height: 260px !important;
  font-family: Menlo, Consolas, monospace !important; font-size: 14.5px !important;
  line-height: 1.55 !important; padding: 12px 14px !important; border: 1px solid #c3ccd6 !important;
  border-radius: 6px !important; background: #ffffff !important; color: #10202f !important;
  -webkit-text-fill-color: #10202f !important; resize: vertical !important; }
#${WRAP} .ij-hidden { display: none !important; }
#${WRAP} .ij-bar { display: flex !important; gap: 10px !important; flex-wrap: wrap !important;
  margin: 12px 0 !important; align-items: center !important; }
#${WRAP} button { font: inherit !important; font-size: 16px !important; padding: 10px 20px !important;
  border-radius: 6px !important; cursor: pointer !important; border: 1px solid #0b5cd5 !important;
  background: #0b5cd5 !important; color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important; font-weight: 600 !important; }
#${WRAP} button.ij-ghost { background: #ffffff !important; color: #0b5cd5 !important;
  -webkit-text-fill-color: #0b5cd5 !important; }
#${WRAP} button[disabled] { opacity: 0.55 !important; cursor: default !important; }
#${WRAP} pre { background: #f2f5f8 !important; border: 1px solid #e0e6ec !important;
  border-radius: 6px !important; padding: 12px 14px !important; overflow-x: auto !important;
  font-family: Menlo, Consolas, monospace !important; font-size: 14px !important;
  color: #10202f !important; -webkit-text-fill-color: #10202f !important; margin: 0 0 12px !important; }
#${WRAP} .ij-console { min-height: 60px !important; white-space: pre-wrap !important; }
#${WRAP} .ij-console .err { color: #96261b !important; -webkit-text-fill-color: #96261b !important; }
#${WRAP} .ij-stage { margin: 14px 0 !important; padding: 12px !important;
  background: #dfe6ed !important; border-radius: 8px !important; overflow-x: auto !important; }
#${WRAP} .ij-verdict { border-radius: 6px !important; padding: 14px 16px !important;
  margin: 14px 0 !important; font-size: 16px !important; border: 1px solid #e0e6ec !important; }
#${WRAP} .ij-verdict.hidden { display: none !important; }
#${WRAP} .ij-verdict.pass { background: #eef7f1 !important; border-color: #c4e0d0 !important; }
#${WRAP} .ij-verdict.part { background: #fbf7ec !important; border-color: #ecdfc0 !important; }
#${WRAP} .ij-verdict.fail { background: #fdf1ef !important; border-color: #f0cdc7 !important; }
#${WRAP} .ij-sample { border: 1px solid #e0e6ec !important; border-radius: 6px !important;
  padding: 12px 14px !important; margin: 0 0 12px !important; }
#${WRAP} .ij-sample .ij-h { font-size: 12px !important; letter-spacing: 0.08em !important;
  text-transform: uppercase !important; color: #5a6672 !important;
  -webkit-text-fill-color: #5a6672 !important; margin: 0 0 6px !important; }
#${WRAP} details { margin: 0 0 12px !important; }
#${WRAP} summary { cursor: pointer !important; font-weight: 600 !important; }
#${WRAP} .ij-nav { display: flex !important; justify-content: space-between !important;
  gap: 16px !important; flex-wrap: wrap !important; margin-top: 36px !important;
  border-top: 1px solid #e0e6ec !important; padding-top: 16px !important; }
#${WRAP} button:focus-visible, #${WRAP} a:focus-visible, #${WRAP} textarea:focus-visible {
  outline: 3px solid #ffb020 !important; outline-offset: 2px !important; }
</style>`;
}

function pageScript(hasScene) {
  return `<script src="${API}/api/intro-java/player.js" defer></script>
<script>
(function(){
  var API = ${JSON.stringify(API)};
  var root = document.getElementById(${JSON.stringify(WRAP)});
  if (!root) { return; }

  var course = root.getAttribute('data-course');
  var unit = root.getAttribute('data-unit');
  var lesson = root.getAttribute('data-lesson-id');
  var item = root.getAttribute('data-item-id');

  var code = document.getElementById('ij-editor');
  var starter = document.getElementById('ij-starter');
  var out = document.getElementById('ij-console');
  var stage = document.getElementById('ij-stage');
  var verdict = document.getElementById('ij-verdict');
  var runBtn = document.getElementById('ij-run');
  var gradeBtn = document.getElementById('ij-grade');
  var resetBtn = document.getElementById('ij-reset');
  var player = null;

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

  function busy(on){
    if (runBtn) { runBtn.disabled = on; }
    gradeBtn.disabled = on;
  }

  function clearStage(){
    if (player && player.destroy) { player.destroy(); }
    player = null;
    if (stage) { stage.textContent = ''; stage.style.display = 'none'; }
  }

  function show(kind, html){
    verdict.className = 'ij-verdict ' + kind;
    verdict.innerHTML = html;
  }
${hasScene ? `
  runBtn.addEventListener('click', function(){
    busy(true);
    clearStage();
    verdict.className = 'ij-verdict hidden';
    say('Compiling and running your code...');
    fetch(API + '/api/intro-java/trace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lesson: lesson, source: code.value })
    }).then(function(r){ return r.json().then(function(d){ return { ok: r.ok, d: d }; }); })
      .then(function(res){
        busy(false);
        var d = res.d || {};
        if (!res.ok) { say(d.error || 'The code runner is busy. Wait a moment and press Run again.', true); return; }
        if (d.compile_output) { say(d.compile_output, true); return; }
        if (!d.trace) {
          var t = d.stdout || '';
          if (d.stderr) { t = t + (t ? '\\n' : '') + d.stderr; }
          say(t || 'Your code ran but nothing happened in the world yet.', !!d.stderr);
          return;
        }
        stage.style.display = 'block';
        if (window.GreenfootPlayer) {
          player = window.GreenfootPlayer.mount(stage, d.trace);
        } else {
          say('Your code ran. The animation could not load, so here is the output instead.\\n' + (d.stdout || ''), false);
          return;
        }
        say(d.stdout ? d.stdout : 'Press Play, or Step one frame at a time.');
      })
      .catch(function(){
        busy(false);
        say('Could not reach the code runner. Check your connection and press Run again.', true);
      });
  });
` : ''}
  resetBtn.addEventListener('click', function(){
    code.value = starter.value;
    clearStage();
    verdict.className = 'ij-verdict hidden';
    say('Starter code restored.');
  });

  gradeBtn.addEventListener('click', function(){
    var t = token();
    if (!t) {
      show('part', '<strong>Sign in to be graded.</strong><br>Run still works while you are signed out, '
        + 'but a grade has to know whose it is. <a href="/pages/join">Sign in or join your class</a>, '
        + 'then come back and submit.');
      return;
    }
    busy(true);
    clearStage();
    verdict.className = 'ij-verdict hidden';
    say('Submitting. This runs your code against every case, including the hidden ones...');
    fetch(API + '/api/student/code-grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
      body: JSON.stringify({ course: course, unit: unit, lesson: lesson, item: item,
        language: 'java', source: code.value })
    }).then(function(r){ return r.json().then(function(d){ return { status: r.status, d: d }; }); })
      .then(function(res){
        busy(false);
        var d = res.d || {};
        if (res.status === 401) {
          show('part', '<strong>Your sign in has expired.</strong> <a href="/pages/join">Sign in again</a> '
            + 'and resubmit. Nothing was recorded.');
          return;
        }
        if (res.status === 404) {
          show('part', '<strong>This exercise is not graded yet.</strong> Your work is safe in the editor. '
            + 'Run it to check it yourself and try again later.');
          return;
        }
        if (res.status === 429) {
          show('part', '<strong>Too many submissions.</strong> Wait a minute, then submit again. '
            + 'Nothing was recorded, so your score has not been hurt.');
          return;
        }
        if (res.status >= 500) {
          show('fail', '<strong>The code runner is unavailable.</strong> Your attempt was NOT graded and '
            + 'no zero was recorded. Try again shortly.');
          return;
        }
        if (!d || typeof d.passed !== 'number') {
          show('fail', '<strong>Not graded.</strong> ' + (d && d.error ? d.error : 'Something went wrong. Nothing was recorded.'));
          return;
        }
        var all = d.passed === d.total;
        var msg = '<strong>' + d.passed + ' of ' + d.total + ' cases passed.</strong>';
        msg = msg + '<br>Recorded: ' + d.points_earned + ' out of ' + d.points_possible + ' points.';
        if (d.failing_case_summary && d.failing_case_summary.message) {
          msg = msg + '<br>' + d.failing_case_summary.message;
        }
        if (all) { msg = msg + '<br>Every case, including the hidden ones. Nothing left to fix here.'; }
        show(all ? 'pass' : (d.passed === 0 ? 'fail' : 'part'), msg);
      })
      .catch(function(){
        busy(false);
        show('fail', '<strong>Could not reach the grader.</strong> Your attempt was not recorded. '
          + 'Check your connection and submit again.');
      });
  });

  say(${hasScene
    ? "'Fill in the body, then press Run to watch it. Submit when you are ready to be graded.'"
    : "'Fill in the body, then press Submit to be graded against every case.'"});
})();
<\/script>`;
}

/**
 * Build one exercise page.
 *
 * @param {object} ex an entry from seed/intro-java-exercises.js
 * @param {object} expected the parsed intro-java-expected.generated.json
 */
function renderExercisePage(ex, expected) {
  const lessons = lessonIndex();
  const meta = lessons.get(ex.lesson);
  if (!meta) throw new Error(`intro-java exercise ${ex.lesson}: no such lesson in any bank`);
  if (meta.unit !== ex.unit) {
    throw new Error(`intro-java ${ex.lesson}: exercise says ${ex.unit}, bank says ${meta.unit}`);
  }

  const entry = expected[`${ex.lesson}:${itemId(ex.lesson)}`];
  if (!entry) {
    throw new Error(`intro-java ${ex.lesson}: no verified expected output. `
      + 'Run: node scripts/verify-intro-java-exercises.js --write');
  }

  const lessonHandle = lessonHandleFor(meta.lesson);
  const handle = `${lessonHandle}-code`;
  const hasScene = !!ex.scene;

  const steps = ex.task.map((t) => `  <li>${esc(t)}</li>`).join('\n');

  // Visible cases only. The setup is shown verbatim rather than paraphrased:
  // it is the actual Java that runs, a student can read it by Unit 2, and a
  // paraphrase would be one more thing that can quietly disagree with the code.
  const samples = ex.cases
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => !c.hidden)
    .map(({ c, i }, n) => `<div class="ij-sample">
<p class="ij-h">Example ${n + 1}: what we set up</p>
<pre>${esc(c.setup.replace(/^\s+/gm, '').trim())}</pre>
<p class="ij-h">What it should print</p>
<pre>${esc(entry.expected[i]) || '(nothing)'}</pre>
</div>`).join('\n');

  const hiddenCount = ex.cases.filter((c) => c.hidden).length;

  const stage = hasScene
    ? `<div class="ij-stage" id="ij-stage" style="display:none"></div>`
    : '';
  const runButton = hasScene
    ? '<button type="button" id="ij-run">Run</button>'
    : '';
  const runLine = hasScene
    ? '<p>Press <strong>Run</strong> to watch your code on the grid. Nothing is recorded by Run, so press it as often as you like. '
      + 'Step goes one frame at a time, which is the view that actually explains what act() does.</p>'
    : '<p>This one prints numbers rather than moving anything, so there is nothing to animate. Press <strong>Submit</strong> to check it.</p>';

  const body = [
    `<div id="${WRAP}" data-course="intro-java" data-unit="${escAttr(ex.unit)}"`
      + ` data-lesson-id="${escAttr(ex.lesson)}" data-item-id="${escAttr(itemId(ex.lesson))}"`
      + ` data-activity-type="code">`,
    renderCss(),
    `<h1>${esc(ex.name)}</h1>`,
    `<p class="ij-meta"><a href="${escAttr(`${SITE}/pages/${unitHandle(ex.unit)}`)}">${esc(meta.unitLabel)}</a>`
      + ` &middot; <a href="${escAttr(`${SITE}/pages/${lessonHandle}`)}">Lesson ${esc(ex.lesson)} ${esc(meta.lesson.title)}</a>`
      + ' &middot; code exercise, graded</p>',
    `<div class="ij-brief"><p>${esc(ex.brief)}</p></div>`,
    '<h2>What to write</h2>',
    `<ol>\n${steps}\n</ol>`,
    ex.note ? `<div class="ij-note"><p>${esc(ex.note)}</p></div>` : '',
    '<h2>Your code</h2>',
    runLine,
    `<textarea id="ij-editor" spellcheck="false" autocapitalize="off" autocomplete="off"`
      + ` aria-label="Java editor for this exercise">${esc(ex.starter)}</textarea>`,
    `<div class="ij-bar">${runButton}`
      + '<button type="button" id="ij-grade">Submit for grading</button>'
      + '<button type="button" class="ij-ghost" id="ij-reset">Reset</button></div>',
    stage,
    '<pre class="ij-console" id="ij-console"></pre>',
    '<div class="ij-verdict hidden" id="ij-verdict"></div>',
    '<h2>What it is checked against</h2>',
    `<p>These are the examples you can see. There ${hiddenCount === 1 ? 'is' : 'are'} also `
      + `<strong>${hiddenCount} hidden ${hiddenCount === 1 ? 'case' : 'cases'}</strong> with different `
      + 'setups, so printing the answers below as text passes nothing.</p>',
    samples,
    `<nav class="ij-nav">`
      + `<a href="${escAttr(`${SITE}/pages/${lessonHandle}`)}">Back to lesson ${esc(ex.lesson)}</a>`
      + `<a href="${escAttr(`${SITE}/pages/${unitHandle(ex.unit)}`)}">All of ${esc(meta.unitLabel.split(':')[0])}</a>`
      + `<a href="${escAttr(COURSE_URL)}">Course home</a>`
      + `</nav>`,
    `<textarea class="ij-hidden" id="ij-starter" aria-hidden="true">${esc(ex.starter)}</textarea>`,
    '</div>',
    pageScript(hasScene),
  ].filter(Boolean).join('\n');

  const title = `${ex.lesson} ${ex.name}`;
  return {
    kind: 'code',
    unit: ex.unit,
    lesson: ex.lesson,
    lessonHandle,
    handle,
    cases: ex.cases.length,
    hiddenCases: hiddenCount,
    title,
    bodyHtml: body,
    seoTitle: clamp(`Greenfoot Java exercise ${ex.lesson}: ${ex.name}`, 64),
    seoDescription: clamp(
      `Write and run real Java for Greenfoot lesson ${ex.lesson}. ${ex.brief}`, 158),
  };
}

function allPages() {
  const expected = readExpected();
  return EXERCISES.map((ex) => renderExercisePage(ex, expected));
}

module.exports = { allPages, renderExercisePage, handleFor, lessonHandleFor, WRAP };
