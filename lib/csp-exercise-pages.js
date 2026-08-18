'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CSP EXERCISE PAGES: the online half of the Teacher Course Bundle handouts.
//
//  WHY THESE EXIST
//  Every student exercise handout in the CSP Teacher Course Bundle prints:
//
//      Also available online (auto-graded): apcsexamprep.com/pages/<handle>
//
//  All 70 of those URLs were 404 as of 2026-08-17, verified one by one. Every
//  CSP teacher who bought the bundle handed students a worksheet pointing at a
//  page that has never existed. The handles below are not a naming choice; they
//  are dictated by 70 documents already in teachers' hands.
//
//  WHAT A PAGE CONTAINS, AND WHY IT IS SPLIT IN TWO
//  The handouts are constructed response end to end: 262 point-bearing written
//  questions and 157 scenarios across the 70, and zero multiple-choice items.
//  Nothing in them can honestly be auto-graded. So a page has two halves that
//  are labelled differently on purpose:
//
//   1. MIRROR. The handout's own items, reproduced verbatim from the source
//      document, each with a writing box. Those boxes are LOCAL ONLY. Nothing
//      typed there is ever transmitted; drafts live in the browser's own
//      storage so a student can close the tab. This is what keeps the zero PII
//      posture intact: students are minors on name plus PIN, and no free text
//      they write reaches the server, ever.
//
//      For Exercise 1 the mirror is PART B specifically, because all 35
//      Exercise 1 handouts say so themselves: "These are the same items
//      available on the site exercise." Part A stays paper work.
//
//   2. CHECK. Author-written multiple choice derived from the teacher answer
//      key, which IS auto-graded and IS what posts to the gradebook. Every
//      question quotes the key sentence it came from, and the build refuses to
//      ship a question whose quote is not actually in that key document.
//
//  The page says which half counts. A student is never told a score for work
//  nobody read.
//
//  HANDLE ROUTING NOTE
//  ap-csp-topic-{U}-{L}-exercise-{N} does not match pageFromHandle in utils.js,
//  so these pages do not register a VISIT yet. Grading is unaffected: the page
//  dispatches course, unit and lesson explicitly in the apcsActivity detail, and
//  the deployed reporter prefers the detail over the handle. Adding the pattern
//  to utils.js is a separate, additive change.
//
//  Hazards applied: one wrapper id with all:initial, every colour hardcoded with
//  !important plus -webkit-text-fill-color, repeat(N,1fr) grids, pure ASCII, no
//  entities inside script blocks, no &quot; in an attribute, no emojis or
//  em dashes.
// ─────────────────────────────────────────────────────────────────────────────

const { COURSES } = require('../utils');
const SOURCE = require('../seed/csp-exercise-source.json');

// topic id ("1.1") -> { unit, slug }. Derived from the COURSES lesson order,
// which is authored in CED order, so the numbering cannot drift from the config.
const BY_TOPIC = new Map();
const BI = { 'bi-1': 1, 'bi-2': 2, 'bi-3': 3, 'bi-4': 4, 'bi-5': 5 };
for (const [unit, cfg] of Object.entries(COURSES['ap-csp'].units)) {
  cfg.lessons.forEach((slug, i) => BY_TOPIC.set(`${BI[unit]}.${i + 1}`, { unit, slug }));
}

const C = {
  accent: '#1a56db', accentDk: '#1e40af', accentLt: '#93c5fd', accentBg: '#eff6ff',
  navy: '#0f1f3d', slate: '#64748b', green: '#16a34a', red: '#dc2626',
  paper: '#fffbeb', paperEdge: '#fde68a',
};
const LETTERS = ['A', 'B', 'C', 'D'];

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Same balance mechanism as lib/csp-course-pages.js and for the same reason: an
// author writes the correct option where it reads naturally, which concentrates
// the key on one letter unless the renderer spreads it.
function slugHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000003;
  return h;
}
function balancedOrder(seed, i, authored) {
  const from = LETTERS.indexOf(authored);
  const target = (slugHash(seed) + i * 3) % 4;
  const shift = ((target - from) % 4 + 4) % 4;
  return { order: [0, 1, 2, 3].map((j) => (j - shift + 4) % 4), correct: LETTERS[target] };
}

function css(id) {
  const s = `#${id}`;
  return `<style>
.page-title,.article__title,.page__title,.template-page main h1:first-of-type{display:none!important;visibility:hidden!important}
${s}{all:initial!important;display:block!important;box-sizing:border-box!important;max-width:880px!important;margin:0 auto!important;padding:8px 16px 56px!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif!important;color:${C.navy}!important;-webkit-text-fill-color:${C.navy}!important;line-height:1.6!important;font-size:17px!important;background:#f8fafc!important}
${s} *,${s} *::before,${s} *::after{box-sizing:border-box!important}
${s} .hero{background:linear-gradient(135deg,${C.accentDk},${C.accent})!important;color:#fff!important;-webkit-text-fill-color:#fff!important;border-radius:16px!important;padding:26px 24px!important;margin:8px 0 18px!important}
${s} .eyebrow{font-size:13px!important;letter-spacing:.08em!important;text-transform:uppercase!important;color:${C.accentLt}!important;-webkit-text-fill-color:${C.accentLt}!important;margin:0 0 8px!important}
${s} h1{font-size:28px!important;line-height:1.2!important;margin:0!important;color:#fff!important;-webkit-text-fill-color:#fff!important;font-weight:800!important}
${s} .hero .sub{font-size:16px!important;margin:10px 0 0!important;color:#dbeafe!important;-webkit-text-fill-color:#dbeafe!important}
${s} h2{font-size:21px!important;color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important;margin:32px 0 6px!important;font-weight:800!important;border-bottom:3px solid ${C.accentLt}!important;padding-bottom:6px!important}
${s} h2 .tag{float:right!important;font-size:11px!important;font-weight:700!important;letter-spacing:.06em!important;text-transform:uppercase!important;padding:3px 10px!important;border-radius:100px!important;margin-top:4px!important}
${s} h2 .tag.local{background:${C.paper}!important;color:#92400e!important;-webkit-text-fill-color:#92400e!important;border:1px solid ${C.paperEdge}!important}
${s} h2 .tag.graded{background:#dcfce7!important;color:#14532d!important;-webkit-text-fill-color:#14532d!important;border:1px solid #86efac!important}
${s} p{margin:8px 0!important;color:${C.navy}!important;-webkit-text-fill-color:${C.navy}!important}
${s} .btn,${s} .btn:link,${s} .btn:visited{display:inline-block!important;background:${C.accent}!important;color:#fff!important;-webkit-text-fill-color:#fff!important;text-decoration:none!important;font-weight:700!important;border-radius:10px!important;padding:10px 16px!important;border:0!important;cursor:pointer!important;font-size:15px!important;margin:4px 8px 4px 0!important}
${s} .btn.ghost,${s} .btn.ghost:link,${s} .btn.ghost:visited{background:#fff!important;color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important;border:2px solid ${C.accentLt}!important}
${s} .note{background:#fff!important;border:1px solid #e2e8f0!important;border-left:5px solid ${C.accent}!important;border-radius:0 12px 12px 0!important;padding:14px 18px!important;margin:16px 0 22px!important;font-size:15px!important}
${s} .note .label{font-size:12px!important;font-weight:800!important;letter-spacing:.05em!important;text-transform:uppercase!important;color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important;margin:0 0 4px!important}
${s} .item{background:#fff!important;border:1px solid #e2e8f0!important;border-radius:12px!important;padding:18px 20px!important;margin:14px 0!important}
${s} .item.paper{background:${C.paper}!important;border-color:${C.paperEdge}!important}
${s} .item-num{font-size:11px!important;font-weight:700!important;letter-spacing:.08em!important;text-transform:uppercase!important;color:${C.slate}!important;-webkit-text-fill-color:${C.slate}!important;margin-bottom:6px!important}
${s} .item-text{font-size:15px!important;color:${C.navy}!important;-webkit-text-fill-color:${C.navy}!important;line-height:1.65!important;margin:0 0 10px!important}
${s} .prompt{font-size:13px!important;font-weight:700!important;color:#92400e!important;-webkit-text-fill-color:#92400e!important;margin:12px 0 4px!important}
${s} .code{background:#0f172a!important;border-radius:8px!important;padding:12px 14px!important;margin:10px 0!important;font-family:"SFMono-Regular",Consolas,Menlo,monospace!important;font-size:13px!important;line-height:1.7!important;color:#e2e8f0!important;-webkit-text-fill-color:#e2e8f0!important;white-space:pre-wrap!important;overflow-x:auto!important}
${s} textarea{display:block!important;width:100%!important;min-height:90px!important;padding:10px 12px!important;border:1px solid #d6d3d1!important;border-radius:8px!important;font-family:inherit!important;font-size:15px!important;line-height:1.55!important;color:${C.navy}!important;-webkit-text-fill-color:${C.navy}!important;background:#fff!important;resize:vertical!important}
${s} .saved{font-size:12px!important;color:${C.slate}!important;-webkit-text-fill-color:${C.slate}!important;margin:4px 0 0!important;min-height:16px!important}
${s} .mcq-item{margin-bottom:26px!important;padding-bottom:26px!important;border-bottom:1px solid #f1f5f9!important}
${s} .mcq-item:last-child{border-bottom:none!important;margin-bottom:0!important;padding-bottom:0!important}
${s} .mcq-q-num{font-size:11px!important;font-weight:700!important;letter-spacing:.08em!important;text-transform:uppercase!important;color:${C.slate}!important;-webkit-text-fill-color:${C.slate}!important;margin-bottom:8px!important}
${s} .ek{display:inline-block!important;font-size:10px!important;font-weight:700!important;letter-spacing:.05em!important;padding:2px 8px!important;border-radius:100px!important;margin-left:8px!important;background:${C.accentBg}!important;color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important}
${s} .mcq-q-text{font-size:15px!important;font-weight:600!important;color:${C.navy}!important;-webkit-text-fill-color:${C.navy}!important;line-height:1.6!important;margin-bottom:12px!important}
${s} .mcq-options{display:flex!important;flex-direction:column!important;gap:8px!important;margin-bottom:12px!important}
${s} .mcq-option{display:flex!important;align-items:flex-start!important;gap:12px!important;width:100%!important;text-align:left!important;padding:11px 14px!important;border:2px solid #e2e8f0!important;border-radius:8px!important;cursor:pointer!important;background:#fff!important;font-size:15px!important;font-family:inherit!important;line-height:1.5!important;color:${C.navy}!important;-webkit-text-fill-color:${C.navy}!important}
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
${s} .scorebar{background:#fff!important;border:1px solid #e2e8f0!important;border-radius:12px!important;padding:14px 18px!important;margin:0 0 18px!important;font-size:14px!important;color:${C.slate}!important;-webkit-text-fill-color:${C.slate}!important}
${s} .scorebar strong{color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important;font-size:17px!important}
${s} .nextnav{display:grid!important;grid-template-columns:repeat(2,1fr)!important;gap:12px!important;margin-top:26px!important}
${s} .nextnav a,${s} .nextnav a:link,${s} .nextnav a:visited{display:block!important;background:#fff!important;border:1px solid #e2e8f0!important;border-radius:12px!important;padding:14px 16px!important;text-decoration:none!important;color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important;font-weight:700!important;font-size:15px!important}
@media (max-width:640px){${s} .nextnav{grid-template-columns:repeat(1,1fr)!important}}
</style>`;
}

function script(handle) {
  return `<script>
(function(){
  var KEY = 'apcs-draft:' + ${JSON.stringify(handle)};
  var answered = {};
  var total = document.querySelectorAll('.mcq-item[data-item]').length;

  /* Drafts stay in this browser. Nothing typed in a writing box is ever sent
     anywhere: no request carries it, and the reporter only ever sees the
     multiple choice results below. */
  function loadDrafts(){
    var store = {};
    try { store = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(e) { store = {}; }
    var boxes = document.querySelectorAll('textarea[data-draft]');
    for (var i = 0; i < boxes.length; i++){
      var id = boxes[i].getAttribute('data-draft');
      if (store[id]) boxes[i].value = store[id];
      boxes[i].addEventListener('input', saveDrafts);
    }
  }
  function saveDrafts(){
    var store = {};
    var boxes = document.querySelectorAll('textarea[data-draft]');
    for (var i = 0; i < boxes.length; i++){
      store[boxes[i].getAttribute('data-draft')] = boxes[i].value;
    }
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch(e) {}
    var n = document.getElementById('draft-note');
    if (n) n.textContent = 'Saved in this browser only.';
  }

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
    var el = document.getElementById('ex-score');
    if(el) el.innerHTML = '<strong>' + right + ' / ' + total + '</strong> correct on the graded check, ' + done + ' answered';
  }

  window.cspEx = function(qid, chosen, correct, fbId){
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

  loadDrafts();
  updateScore();
})();
<\/script>`;
}

// A scenario body that is a pseudocode line rather than prose. Big Idea 3's
// loop and expression exercises put code where other topics put a paragraph.
function looksLikeCode(t) {
  return /<-|DISPLAY\(|REPEAT|IF\s*\(|\bMOD\b/.test(t) && t.length < 220;
}

function renderExercise(handle, check) {
  const src = SOURCE[handle];
  if (!src) throw new Error('no source document for ' + handle);
  const t = BY_TOPIC.get(src.topic);
  if (!t) throw new Error('topic not in COURSES: ' + src.topic);
  const bi = BI[t.unit];
  const id = 'csp-ex';
  const lessonHandle = `ap-csp-course-bi${bi}-${t.slug}`;
  const act = 'exercise-' + src.exercise;

  // ── the mirror ────────────────────────────────────────────────────────────
  let mirror = '';
  if (src.exercise === 1) {
    mirror = src.partB.map((q, i) => `      <div class="item paper">
        <div class="item-num">${esc(q.id)} &middot; ${q.pts} points on the handout</div>
        <p class="item-text">${esc(q.text)}</p>
        <textarea data-draft="b${i + 1}" rows="4" spellcheck="true" aria-label="Your answer to ${esc(q.id)}"></textarea>
      </div>`).join('\n');
  } else {
    mirror = src.scenarios.map((sc) => {
      const body = looksLikeCode(sc.text)
        ? `        <div class="code">${esc(sc.text)}</div>`
        : `        <p class="item-text">${esc(sc.text)}</p>`;
      const prompts = sc.prompts.map((p, j) => `        <p class="prompt">${esc(p)}</p>
        <textarea data-draft="s${sc.n}p${j + 1}" rows="3" spellcheck="true" aria-label="${esc(p)}"></textarea>`).join('\n');
      return `      <div class="item paper">
        <div class="item-num">Scenario ${sc.n} &middot; ${esc(sc.level)}</div>
${body}
${prompts}
      </div>`;
    }).join('\n');
  }

  // ── the graded check ──────────────────────────────────────────────────────
  const n = check.questions.length;
  const items = check.questions.map((q, i) => {
    const qid = `chk-${i + 1}`;
    const { order, correct } = balancedOrder(handle, i, q.correct);
    const opts = order.map((srcIdx, j) => {
      const L = LETTERS[j];
      return `          <button type="button" class="mcq-option" onclick="cspEx('${qid}','${L}','${correct}','${qid}-fb-${L}')">`
        + `<span class="mcq-option-letter">${L}</span> ${esc(q.options[srcIdx])}</button>`;
    }).join('\n');
    const fb = order.map((srcIdx, j) => {
      const L = LETTERS[j];
      const right = L === correct;
      return `          <div id="${qid}-fb-${L}" class="mcq-feedback ${right ? 'correct-fb' : 'incorrect-fb'}">`
        + `${right ? 'Correct.' : 'Incorrect.'} ${esc(q.why[LETTERS[srcIdx]])}</div>`;
    }).join('\n');
    return `        <div class="mcq-item" data-activity="${act}" data-item="${qid}">
          <div class="mcq-q-num">Question ${i + 1} of ${n}<span class="ek">EK ${esc(q.ek)}</span></div>
          <div class="mcq-q-text">${esc(q.stem)}</div>
          <div class="mcq-options">
${opts}
          </div>
${fb}
        </div>`;
  }).join('\n');

  const mirrorHeading = src.exercise === 1
    ? 'Part B, from your handout'
    : 'The cases, from your handout';
  const mirrorNote = src.exercise === 1
    ? 'Your handout says these are the same items available here. Part A stays on paper.'
    : 'The same cases as your handout, in the same order.';

  const bodyHtml = `${css(id)}
<div id="${id}" class="lesson-page" data-course="ap-csp" data-unit="${t.unit}" data-lesson="${t.slug}">
  <div class="hero">
    <p class="eyebrow">Big Idea ${bi} &middot; Topic ${src.topic} &middot; Exercise ${src.exercise}</p>
    <h1>${esc(src.title)}</h1>
    <p class="sub">${esc(src.timing || '')}</p>
  </div>
  <p><a class="btn" href="/pages/${lessonHandle}">Back to the Topic ${src.topic} lesson</a><a class="btn ghost" href="/pages/ap-csp-course">All CSP topics</a></p>
  <div class="note">
    <p class="label">How this page works</p>
    <p>The writing boxes below are yours. What you type stays in this browser, is saved here as you go, and is never sent to us or to your teacher. Hand the written work in the way your teacher asked for it.</p>
    <p>The graded check at the bottom is the part that records to your teacher's gradebook.</p>
  </div>
  <h2>${esc(mirrorHeading)}<span class="tag local">Not recorded</span></h2>
  <p>${esc(mirrorNote)} <span class="saved" id="draft-note"></span></p>
${mirror}
  <h2>Graded check<span class="tag graded">Recorded</span></h2>
  <p>${n} questions on the same ideas, drawn from this exercise's answer key. These are auto-graded and reported.</p>
  <div class="scorebar" id="ex-score"></div>
  <div class="item">
${items}
  </div>
  <div class="nextnav">
    <a href="/pages/${lessonHandle}">Rework the Topic ${src.topic} lesson</a>
    <a href="/pages/ap-csp-course-bi${bi}-unit-test">Big Idea ${bi} unit test</a>
  </div>
</div>
${script(handle)}`;

  return {
    handle,
    kind: 'exercise-' + src.exercise,
    topic: src.topic,
    unit: t.unit,
    slug: t.slug,
    questions: n,
    mirrored: src.exercise === 1 ? src.partB.length : src.scenarios.length,
    title: `AP CSP ${src.topic} Exercise ${src.exercise}: ${src.title}`,
    bodyHtml,
    seoTitle: `AP CSP ${src.topic} Exercise ${src.exercise}: ${src.title}`.slice(0, 70),
    seoDescription: `Online companion to the AP CSP Topic ${src.topic} Exercise ${src.exercise} handout, ${src.title}. Work the cases, then take the auto-graded check.`.slice(0, 160),
  };
}

function allPages() {
  const checks = require('../seed/csp-exercise-checks/1-1');
  return Object.keys(checks).map((h) => renderExercise(h, checks[h]));
}

module.exports = { allPages, renderExercise, BY_TOPIC, SOURCE, esc };
