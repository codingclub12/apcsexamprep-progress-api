'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CSA EXERCISE 2 PAGES: THE RENDERER.
//
//  WHAT THIS BUILDS
//  One page per lesson in seed/csa-exercise-2/, currently the six lessons whose
//  exercise-1 was just recontented to match the real CED:
//
//      ap-csa-lesson-{U}-{L}-{slug}-exercise-2
//
//  Six applied, scenario-based multiple choice questions per lesson, matching
//  the exercise-2 convention already live for CSP (lib/csp-course-pages.js).
//  See seed/csa-exercise-2.js for why only these six lessons have a bank so far
//  and why exercise-2 is an applied MCQ set rather than a second code exercise.
//
//  GRADING POSTURE
//  Unlike CSP, exercise-2 grades by default for ap-csa: lib/gradebook-contract.js
//  resolves games_graded to true for every course except ap-csp. A page here
//  posts through the same apcsActivity event the exercise-1 pages and the theme
//  reporter already use, with activity exercise-2 read off each item's own
//  data-activity so it never gets filed under the lesson's quiz rollup.
//
//  REUSES lib/csa-exercise-pages.js RATHER THAN RESTATING IT
//  Lesson metadata (unit, sequence, unit label) and the unit hub handles are
//  read from that file's own LESSONS map and UNIT_HUBS table, so this file
//  cannot drift from the lesson numbering the exercise-1 pages already use.
//
//  THE ANSWER KEY SKEW, CAUGHT BEFORE IT SHIPPED
//  Authors write the correct option wherever it reads most naturally, and for
//  this bank that meant 33 of 36 correct answers landed on B (checked against
//  the actual data, not assumed; CSP's own build hit the same thing, 183 of 210
//  on B). Fixed the same way CSP's is: options are rotated at RENDER time so the
//  correct answer lands on a deterministic target letter that advances by 3 (mod
//  4) per question, offset by a hash of the lesson id so two pages do not share
//  a pattern. Rotation preserves the authored order of the distractors. The
//  content itself is untouched; only display order changes.
//
//  HOUSE HAZARDS APPLIED (identical posture to lib/csp-course-pages.js)
//    - All CSS scoped under one wrapper id with `all:initial !important`.
//    - Every colour hardcoded with `!important` and `-webkit-text-fill-color`.
//    - `repeat(N,1fr)` grids, never `auto-fit`.
//    - Pure ASCII. HTML entities outside script blocks, Unicode escapes inside
//      them, never `&quot;` in an attribute.
//    - No emojis, no em-dashes.
//
//  Zero PII: author content only.
// ─────────────────────────────────────────────────────────────────────────────

const { banks } = require('../seed/csa-exercise-2');
const { LESSONS, UNIT_HUBS } = require('./csa-exercise-pages');
const exercises = require('../seed/csa-exercises');

const COURSE = 'ap-csa';
const ITEM = 'exercise-2';

// The palette the live CSA exercise-1 pages paint with (lib/csa-exercise-pages.js),
// reused so an exercise-2 page reads as the same product, not a different one.
const C = {
  accent: '#b45309',
  accentDk: '#92400e',
  accentLt: '#fcd34d',
  accentBg: '#fffbeb',
  navy: '#1c1917',
  slate: '#57534e',
  green: '#15803d',
  red: '#b91c1c',
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function unitNumber(unit) {
  return Number(String(unit).replace('unit-', ''));
}

// Base lesson handle (the -exercise-1 page's own lesson handle, e.g.
// ap-csa-lesson-4-6-using-text-files), read from the exercise-1 bank so this
// file never restates a handle that could drift from it.
function lessonHandleFor(lesson) {
  const x = exercises.byLesson(lesson);
  if (!x) throw new Error(`csa-exercise-2-pages: no exercise-1 entry for lesson ${lesson}`);
  return x.handle;
}

const LETTERS = ['A', 'B', 'C', 'D'];

// ── ANSWER KEY BALANCE ───────────────────────────────────────────────────────
// Same fix as lib/csp-course-pages.js: deterministic per-lesson rotation so the
// correct answer is not clustered on one letter. See the file header.
function slugHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000003;
  return h;
}

function balancedOrder(lesson, questionIndex, authoredCorrect) {
  const from = LETTERS.indexOf(authoredCorrect);
  const target = (slugHash(lesson) + questionIndex * 3) % 4;
  const shift = ((target - from) % 4 + 4) % 4;
  return {
    order: [0, 1, 2, 3].map((j) => (j - shift + 4) % 4),
    correct: LETTERS[target],
  };
}

// ── CSS ──────────────────────────────────────────────────────────────────────
function exerciseCss(id) {
  const s = `#${id}`;
  return `<style>
.page-title,.article__title,.page__title,.template-page main h1:first-of-type{display:none!important;visibility:hidden!important}
${s}{all:initial!important;display:block!important;box-sizing:border-box!important;max-width:860px!important;margin:0 auto!important;padding:8px 16px 56px!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif!important;color:${C.navy}!important;-webkit-text-fill-color:${C.navy}!important;line-height:1.6!important;font-size:17px!important;background:#fafaf9!important}
${s} *,${s} *::before,${s} *::after{box-sizing:border-box!important}
${s} .hero{background:linear-gradient(135deg,${C.accentDk},${C.accent})!important;color:#fff!important;-webkit-text-fill-color:#fff!important;border-radius:16px!important;padding:26px 24px!important;margin:8px 0 20px!important}
${s} .eyebrow{font-size:13px!important;letter-spacing:.08em!important;text-transform:uppercase!important;color:${C.accentLt}!important;-webkit-text-fill-color:${C.accentLt}!important;margin:0 0 8px!important}
${s} h1{font-size:28px!important;line-height:1.2!important;margin:0!important;color:#fff!important;-webkit-text-fill-color:#fff!important;font-weight:800!important}
${s} .hero .sub{font-size:16px!important;margin:10px 0 0!important;color:#fef3c7!important;-webkit-text-fill-color:#fef3c7!important}
${s} h2{font-size:21px!important;color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important;margin:30px 0 8px!important;font-weight:800!important;border-bottom:3px solid ${C.accentLt}!important;padding-bottom:6px!important}
${s} p{margin:8px 0!important;color:${C.navy}!important;-webkit-text-fill-color:${C.navy}!important}
${s} .navrow{margin:0 0 20px!important}
${s} .btn,${s} .btn:link,${s} .btn:visited{display:inline-block!important;background:${C.accent}!important;color:#fff!important;-webkit-text-fill-color:#fff!important;text-decoration:none!important;font-weight:700!important;border-radius:10px!important;padding:10px 16px!important;border:0!important;cursor:pointer!important;font-size:15px!important;margin:4px 8px 4px 0!important}
${s} .btn.ghost,${s} .btn.ghost:link,${s} .btn.ghost:visited{background:#fff!important;color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important;border:2px solid ${C.accentLt}!important}
${s} .brief{background:#fff!important;border:1px solid #e7e5e4!important;border-left:5px solid ${C.accent}!important;border-radius:0 12px 12px 0!important;padding:16px 18px!important;margin:16px 0 24px!important}
${s} .brief .label{font-size:12px!important;font-weight:800!important;letter-spacing:.05em!important;text-transform:uppercase!important;color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important;margin:0 0 4px!important}
${s} .mcq-section{background:#fff!important;border:1px solid #e7e5e4!important;border-radius:14px!important;padding:24px!important;margin-bottom:28px!important}
${s} .mcq-section-header{margin-bottom:20px!important;padding-bottom:14px!important;border-bottom:2px solid ${C.accentBg}!important}
${s} .mcq-section-title{font-size:20px!important;font-weight:800!important;color:${C.navy}!important;-webkit-text-fill-color:${C.navy}!important;margin:0!important}
${s} .mcq-section-sub{font-size:13px!important;color:${C.slate}!important;-webkit-text-fill-color:${C.slate}!important;margin:4px 0 0!important}
${s} .mcq-item{margin-bottom:28px!important;padding-bottom:28px!important;border-bottom:1px solid #f5f5f4!important}
${s} .mcq-item:last-child{border-bottom:none!important;margin-bottom:0!important;padding-bottom:0!important}
${s} .mcq-q-num{font-size:11px!important;font-weight:700!important;letter-spacing:.08em!important;text-transform:uppercase!important;color:${C.slate}!important;-webkit-text-fill-color:${C.slate}!important;margin-bottom:8px!important}
${s} .diff-tag{display:inline-block!important;font-size:10px!important;font-weight:700!important;letter-spacing:.06em!important;text-transform:uppercase!important;padding:2px 8px!important;border-radius:100px!important;margin-left:8px!important;background:${C.accentBg}!important;color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important}
${s} .scenario{background:${C.accentBg}!important;border-radius:8px!important;padding:12px 14px!important;margin:0 0 12px!important;font-size:14px!important;color:${C.navy}!important;-webkit-text-fill-color:${C.navy}!important}
${s} .mcq-q-text{font-size:15px!important;font-weight:600!important;color:${C.navy}!important;-webkit-text-fill-color:${C.navy}!important;line-height:1.6!important;margin-bottom:12px!important}
${s} .mcq-options{display:flex!important;flex-direction:column!important;gap:8px!important;margin-bottom:12px!important}
${s} .mcq-option{display:flex!important;align-items:flex-start!important;gap:12px!important;width:100%!important;text-align:left!important;padding:11px 14px!important;border:2px solid #e7e5e4!important;border-radius:8px!important;cursor:pointer!important;background:#fff!important;font-size:15px!important;font-family:inherit!important;line-height:1.5!important;color:${C.navy}!important;-webkit-text-fill-color:${C.navy}!important}
${s} .mcq-option:hover{border-color:${C.accentLt}!important;background:${C.accentBg}!important}
${s} .mcq-option.correct{border-color:${C.green}!important;background:#f0fdf4!important;color:#14532d!important;-webkit-text-fill-color:#14532d!important}
${s} .mcq-option.incorrect{border-color:${C.red}!important;background:#fef2f2!important;color:#7f1d1d!important;-webkit-text-fill-color:#7f1d1d!important}
${s} .mcq-option.revealed-correct{border-color:${C.green}!important;background:#f0fdf4!important}
${s} .mcq-option-letter{font-weight:700!important;color:${C.accent}!important;-webkit-text-fill-color:${C.accent}!important;flex-shrink:0!important;min-width:18px!important}
${s} .mcq-option.correct .mcq-option-letter{color:#14532d!important;-webkit-text-fill-color:#14532d!important}
${s} .mcq-option.incorrect .mcq-option-letter{color:#7f1d1d!important;-webkit-text-fill-color:#7f1d1d!important}
${s} .mcq-feedback{display:none!important;padding:12px 16px!important;border-radius:8px!important;font-size:14px!important;line-height:1.6!important;margin-top:8px!important}
${s} .mcq-feedback.show{display:block!important}
${s} .mcq-feedback.correct-fb{background:#f0fdf4!important;color:#14532d!important;-webkit-text-fill-color:#14532d!important;border:1px solid #bbf7d0!important}
${s} .mcq-feedback.incorrect-fb{background:#fef2f2!important;color:#7f1d1d!important;-webkit-text-fill-color:#7f1d1d!important;border:1px solid #fecaca!important}
${s} .scorebar{background:#fff!important;border:1px solid #e7e5e4!important;border-radius:12px!important;padding:14px 18px!important;margin:0 0 20px!important;font-size:14px!important;color:${C.slate}!important;-webkit-text-fill-color:${C.slate}!important}
${s} .scorebar strong{color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important;font-size:17px!important}
${s} .nextnav{display:grid!important;grid-template-columns:repeat(2,1fr)!important;gap:12px!important;margin-top:28px!important}
${s} .nextnav a,${s} .nextnav a:link,${s} .nextnav a:visited{display:block!important;background:#fff!important;border:1px solid #e7e5e4!important;border-radius:12px!important;padding:14px 16px!important;text-decoration:none!important;color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important;font-weight:700!important;font-size:15px!important}
@media (max-width:640px){${s} .nextnav{grid-template-columns:repeat(1,1fr)!important}}
</style>`;
}

// ── THE PAGE SCRIPT ──────────────────────────────────────────────────────────
// Unicode escapes only inside the script block, never HTML entities, and no
// double quotes anywhere in this source, so nothing here can be re-encoded to
// &quot; by the sanitizer.
function exerciseScript() {
  return `<script>
(function(){
  var answered = {};
  var total = document.querySelectorAll('.mcq-item[data-item]').length;

  function activity(d){
    try{
      var w = document.querySelector('.lesson-page');
      if(w){
        d.course = w.getAttribute('data-course');
        d.unit = w.getAttribute('data-unit');
        d.lesson = w.getAttribute('data-lesson');
      }
      document.dispatchEvent(new CustomEvent('apcsActivity',{detail:d}));
    }catch(e){}
  }

  function updateScore(){
    var right = 0, done = 0, k;
    for(k in answered){ done++; if(answered[k]) right++; }
    var el = document.getElementById('csax2-score');
    if(el) el.innerHTML = '<strong>' + right + ' / ' + total + '</strong> correct, ' + done + ' answered';
  }

  window.csaX2 = function(qid, chosen, correct, fbId){
    var item = null, items = document.querySelectorAll('.mcq-item[data-item]'), i;
    for(i = 0; i < items.length; i++){
      if(items[i].getAttribute('data-item') === qid){ item = items[i]; break; }
    }
    if(!item || answered.hasOwnProperty(qid)) return;

    var opts = item.querySelectorAll('.mcq-option');
    for(i = 0; i < opts.length; i++){ opts[i].disabled = true; opts[i].onclick = null; }

    var letters = ['A','B','C','D'];
    var pick = letters.indexOf(chosen);
    if(opts[pick]) opts[pick].classList.add(chosen === correct ? 'correct' : 'incorrect');
    if(chosen !== correct && opts[letters.indexOf(correct)]){
      opts[letters.indexOf(correct)].classList.add('revealed-correct');
    }
    var fb = document.getElementById(fbId);
    if(fb) fb.classList.add('show');

    answered[qid] = (chosen === correct);
    updateScore();

    activity({ activity: item.getAttribute('data-activity'), item: qid,
               choice: chosen, correct: (chosen === correct) });
  };

  updateScore();
})();
<\/script>`;
}

// ── ONE PAGE ─────────────────────────────────────────────────────────────────
function renderExercise2(bank) {
  const meta = LESSONS.get(bank.lesson);
  if (!meta) throw new Error(`csa-exercise-2-pages: unknown lesson ${bank.lesson}`);
  if (meta.unit !== bank.unit) {
    throw new Error(`csa-exercise-2-pages: ${bank.lesson} says unit ${bank.unit}, course config says ${meta.unit}`);
  }
  const id = 'csa-x2';
  const un = unitNumber(bank.unit);
  const hub = UNIT_HUBS[bank.unit];
  const lessonHandle = lessonHandleFor(bank.lesson);
  const handle = `${lessonHandle}-${ITEM}`;
  const n = bank.questions.length;

  const items = bank.questions.map((q, i) => {
    const qid = `x2-${i + 1}`;
    const { order, correct } = balancedOrder(bank.lesson, i, q.correct);

    const opts = order.map((src, j) => {
      const L = LETTERS[j];
      // Single quotes throughout the onclick: a double quote here would be
      // re-encoded to &quot; on save and break the attribute. type="button" is
      // explicit so a bare button default (type="submit") cannot turn an
      // answer click into a page reload if the theme ever wraps this in a form.
      return `        <button type="button" class="mcq-option" onclick="csaX2('${qid}','${L}','${correct}','${qid}-fb-${L}')">`
        + `<span class="mcq-option-letter">${L}</span> ${esc(q.options[src])}</button>`;
    }).join('\n');

    const fb = order.map((src, j) => {
      const L = LETTERS[j];
      const right = L === correct;
      return `        <div id="${qid}-fb-${L}" class="mcq-feedback ${right ? 'correct-fb' : 'incorrect-fb'}">`
        + `${right ? 'Correct.' : 'Incorrect.'} ${esc(q.why[LETTERS[src]])}</div>`;
    }).join('\n');

    return `      <div class="mcq-item" data-activity="${ITEM}" data-item="${qid}">
        <div class="mcq-q-num">Question ${i + 1} of ${n}<span class="diff-tag">${esc(q.tag)}</span></div>
        <div class="scenario">${esc(q.scenario)}</div>
        <div class="mcq-q-text">${esc(q.stem)}</div>
        <div class="mcq-options">
${opts}
        </div>
${fb}
      </div>`;
  }).join('\n');

  const bodyHtml = `${exerciseCss(id)}
<div id="${id}" class="lesson-page" data-course="${COURSE}" data-unit="${bank.unit}" data-lesson="${bank.lesson}" data-lesson-id="${bank.lesson}">
  <div class="hero">
    <p class="eyebrow">${esc(meta.unitLabel)} &middot; Lesson ${bank.lesson} &middot; Exercise 2</p>
    <h1>${esc(bank.title)}: Applied Practice</h1>
    <p class="sub">${esc(bank.blurb)}</p>
  </div>
  <p class="navrow"><a class="btn" href="/pages/${lessonHandle}">Back to the Lesson ${bank.lesson} page</a><a class="btn ghost" href="/pages/${hub}">All Unit ${un} lessons</a></p>
  <div class="brief">
    <p class="label">How this one is different</p>
    <p>${esc(bank.brief)}</p>
  </div>
  <div class="scorebar" id="csax2-score"></div>
  <div class="mcq-section">
    <div class="mcq-section-header">
      <p class="mcq-section-title">Applied Practice</p>
      <p class="mcq-section-sub">${n} questions &middot; scenario driven &middot; every answer is recorded for your teacher</p>
    </div>
${items}
  </div>
  <h2>Where to go next</h2>
  <div class="nextnav">
    <a href="/pages/${lessonHandle}-exercise-1">Try the Lesson ${bank.lesson} coding exercise</a>
    <a href="/pages/${hub}">Pick another Unit ${un} lesson</a>
  </div>
</div>
${exerciseScript()}`;

  return {
    kind: ITEM,
    unit: bank.unit,
    lesson: bank.lesson,
    lessonHandle,
    handle,
    questions: n,
    title: `AP CSA ${bank.lesson} Exercise 2: ${bank.title} Applied Practice`,
    bodyHtml,
    seoTitle: `AP CSA ${bank.lesson} Exercise 2: ${bank.title}`.slice(0, 70),
    seoDescription: bank.seo,
  };
}

function allPages() {
  return banks.map(renderExercise2);
}

module.exports = { allPages, renderExercise2, esc, COURSE, ITEM };
