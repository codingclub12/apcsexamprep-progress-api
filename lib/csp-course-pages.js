'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  CSP COURSE PAGES: THE RENDERER.
//
//  WHAT THIS BUILDS
//  The 53 CSP pages that the Teacher Course Bundle promises per topic and that
//  the site does not have:
//
//      35  exercise-2   ap-csp-course-bi{N}-{slug}-exercise-2   (all 5 Big Ideas)
//      18  guided notes ap-csp-course-bi3-{slug}-notes          (Big Idea 3 only)
//
//  WHY THESE 53
//  Measured live on 2026-08-17, not assumed:
//    - `exercise-2` is declared for every unit in COURSES (utils.js) and ZERO
//      pages carry it. Every CSP class therefore has 35 gradebook columns that
//      can never be filled. The utils.js comment describing exercise-2 as "a
//      practice game" the other Big Ideas "emit" describes something that has
//      never existed.
//    - Guided notes pages exist for Big Ideas 1, 2, 4 and 5 (17 topics) and for
//      none of Big Idea 3's 18 topics, which is 30-35% of the exam and the
//      largest single hole in "lesson resources aligned to every topic".
//
//  HOW A PAGE REPORTS
//  Nothing new is needed on the theme side. The deployed reporter
//  (assets/ap-csp-reporter.js) already resolves an exercise-2 page three ways:
//  the `apcsActivity` event detail, the `.lesson-page` wrapper, then the handle
//  (it strips a trailing `-exercise-2` to recover the lesson). This renderer
//  emits all three consistently, so a page grades the moment it is imported.
//
//  THE ONE TRAP, AND WHY THIS FILE SHIPS ITS OWN checkMCQ
//  The lesson pages' shared `checkMCQ` hardcodes `activity:'quiz'` in the event
//  it dispatches. Reusing it on an exercise-2 page would file every answer under
//  the lesson's QUIZ rollup and corrupt a real grade. The handler below reads
//  `data-activity` off the enclosing `.mcq-item` instead, so the markup is the
//  single source of truth for what an answer counts as.
//
//  GRADING POSTURE
//  exercise-2 is the game/practice slot: lib/gradebook-contract.js resolves
//  `games_graded` to false for ap-csp unless a teacher sets it, so these pages
//  record and display without moving any existing class's grade. A teacher who
//  wants them counted flips one class setting. That default is deliberate and is
//  not changed here.
//
//  HOUSE HAZARDS APPLIED
//    - All CSS scoped under one wrapper id with `all:initial !important`.
//    - Every colour hardcoded with `!important` and `-webkit-text-fill-color`,
//      because Shopify reverts button and title colours on save.
//    - `repeat(N,1fr)` grids, never `auto-fit`.
//    - Pure ASCII. HTML entities outside script blocks, Unicode escapes inside
//      them, and never `&quot;` in an attribute (the sanitizer decodes it back
//      to a literal quote and breaks the attribute).
//    - No emojis, no em-dashes.
//    - No `transform` on any ancestor of a `position:fixed` element.
//
//  Zero PII: author content only.
// ─────────────────────────────────────────────────────────────────────────────

const { COURSES } = require('../utils');
const EXERCISE_2 = require('../seed/csp-exercise-2');
const BI3_NOTES = require('../seed/csp-bi3-notes');

// ── BIG IDEA METADATA ────────────────────────────────────────────────────────
// Hub handles are the LIVE ones, checked against the Admin API on 2026-08-17.
// They are not derivable from the unit key (bi-2 is "-big-idea-2-data", bi-1 is
// bare "-big-idea-1"), so they are listed rather than built.
const BIG_IDEAS = {
  'bi-1': { n: 1, label: 'Big Idea 1: Creative Development', hub: 'ap-csp-course-big-idea-1' },
  'bi-2': { n: 2, label: 'Big Idea 2: Data', hub: 'ap-csp-course-big-idea-2-data' },
  'bi-3': { n: 3, label: 'Big Idea 3: Algorithms and Programming', hub: 'ap-csp-course-big-idea-3-algorithms' },
  'bi-4': { n: 4, label: 'Big Idea 4: Computer Systems and Networks', hub: 'ap-csp-course-big-idea-4-computer-systems' },
  'bi-5': { n: 5, label: 'Big Idea 5: Impact of Computing', hub: 'ap-csp-course-big-idea-5-impact' },
};

// The palette the live CSP lesson pages actually paint with. Every page uses the
// same blue regardless of Big Idea, so these pages do too: matching the site
// beats matching a colour theory nobody shipped.
const C = {
  accent: '#1a56db',
  accentDk: '#1e40af',
  accentLt: '#93c5fd',
  accentBg: '#eff6ff',
  navy: '#0f1f3d',
  slate: '#64748b',
  green: '#16a34a',
  red: '#dc2626',
};

// ── TOPIC NUMBERING ──────────────────────────────────────────────────────────
// Topic ids come from position in the COURSES lesson list, which is authored in
// CED order and matches the live page titles (3.10 Lists, 3.11 Binary Search,
// 3.12 Calling Procedures, and so on). Deriving rather than restating means the
// numbering cannot drift away from the course config.
function topicIndex() {
  const out = new Map();
  for (const [unit, cfg] of Object.entries(COURSES['ap-csp'].units)) {
    const bi = BIG_IDEAS[unit];
    cfg.lessons.forEach((slug, i) => {
      out.set(slug, { unit, slug, topic: `${bi.n}.${i + 1}`, bigIdea: bi });
    });
  }
  return out;
}
const TOPICS = topicIndex();

// ── ESCAPING ─────────────────────────────────────────────────────────────────
// Author content is trusted, but it still has to survive a CSV round trip and
// the Shopify sanitizer. `esc` is for text nodes and attribute values alike.
// Note it deliberately does NOT emit &quot;: an attribute carrying &quot; is
// decoded back to a literal quote on save and breaks the attribute, which is a
// documented hazard. Content with a double quote in it is rejected at build
// time instead (see checkPage in scripts/csp-pages-csv.js).
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Pseudocode blocks are painted, not parsed. `code` marks up the AP pseudocode
// tokens the exam uses so a stem reads like the reference sheet.
function code(src) {
  return esc(src)
    .replace(/\b(IF|ELSE|REPEAT|UNTIL|TIMES|FOR EACH|IN|PROCEDURE|RETURN|MOD|NOT|AND|OR|DISPLAY|INPUT|RANDOM|APPEND|INSERT|REMOVE|LENGTH)\b/g,
      '<span class="k">$1</span>')
    .replace(/(^|[^\w&;])(\d+)\b/g, '$1<span class="n">$2</span>');
}

const LETTERS = ['A', 'B', 'C', 'D'];

// ── ANSWER KEY BALANCE ───────────────────────────────────────────────────────
// Authors write the correct option wherever it reads most naturally, and for
// this build that meant 183 of 210 correct answers landed on B. A student could
// have passed every exercise-2 page in the course without reading a question.
// smoke/csp-course-pages.js caught it, and this is the fix.
//
// The options are rotated at RENDER time so the correct answer lands on a
// deterministic target letter. Rotation preserves the authored order of the
// distractors, which matters: several stems order their options numerically or
// from most to least plausible, and a shuffle would destroy that.
//
// The target advances by 3 per question. Since 3 and 4 are coprime it visits
// every letter, and the stride keeps consecutive answers from marching A, B, C,
// D down the page. The per-topic hash offset means two pages do not share a
// pattern. Deterministic, so the same bank always renders the same key and a
// diff of the sheet stays readable.
function slugHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000003;
  return h;
}

// Returns the display order of the authored option indices, plus the letter the
// correct answer ends up on.
function balancedOrder(slug, questionIndex, authoredCorrect) {
  const from = LETTERS.indexOf(authoredCorrect);
  const target = (slugHash(slug) + questionIndex * 3) % 4;
  const shift = ((target - from) % 4 + 4) % 4;
  return {
    order: [0, 1, 2, 3].map((j) => (j - shift + 4) % 4),
    correct: LETTERS[target],
  };
}

// ── SHARED CSS ───────────────────────────────────────────────────────────────
// One wrapper id, all:initial, every colour hardcoded twice (colour and
// -webkit-text-fill-color) because Shopify reverts title and button colours on
// save and the text-fill property is what actually survives.
function exerciseCss(id) {
  const s = `#${id}`;
  return `<style>
.page-title,.article__title,.page__title,.template-page main h1:first-of-type{display:none!important;visibility:hidden!important}
${s}{all:initial!important;display:block!important;box-sizing:border-box!important;max-width:860px!important;margin:0 auto!important;padding:8px 16px 56px!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif!important;color:${C.navy}!important;-webkit-text-fill-color:${C.navy}!important;line-height:1.6!important;font-size:17px!important;background:#f8fafc!important}
${s} *,${s} *::before,${s} *::after{box-sizing:border-box!important}
${s} .hero{background:linear-gradient(135deg,${C.accentDk},${C.accent})!important;color:#fff!important;-webkit-text-fill-color:#fff!important;border-radius:16px!important;padding:26px 24px!important;margin:8px 0 20px!important}
${s} .eyebrow{font-size:13px!important;letter-spacing:.08em!important;text-transform:uppercase!important;color:${C.accentLt}!important;-webkit-text-fill-color:${C.accentLt}!important;margin:0 0 8px!important}
${s} h1{font-size:28px!important;line-height:1.2!important;margin:0!important;color:#fff!important;-webkit-text-fill-color:#fff!important;font-weight:800!important}
${s} .hero .sub{font-size:16px!important;margin:10px 0 0!important;color:#dbeafe!important;-webkit-text-fill-color:#dbeafe!important}
${s} h2{font-size:21px!important;color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important;margin:30px 0 8px!important;font-weight:800!important;border-bottom:3px solid ${C.accentLt}!important;padding-bottom:6px!important}
${s} p{margin:8px 0!important;color:${C.navy}!important;-webkit-text-fill-color:${C.navy}!important}
${s} .navrow{margin:0 0 20px!important}
${s} .btn,${s} .btn:link,${s} .btn:visited{display:inline-block!important;background:${C.accent}!important;color:#fff!important;-webkit-text-fill-color:#fff!important;text-decoration:none!important;font-weight:700!important;border-radius:10px!important;padding:10px 16px!important;border:0!important;cursor:pointer!important;font-size:15px!important;margin:4px 8px 4px 0!important}
${s} .btn.ghost,${s} .btn.ghost:link,${s} .btn.ghost:visited{background:#fff!important;color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important;border:2px solid ${C.accentLt}!important}
${s} .brief{background:#fff!important;border:1px solid #e2e8f0!important;border-left:5px solid ${C.accent}!important;border-radius:0 12px 12px 0!important;padding:16px 18px!important;margin:16px 0 24px!important}
${s} .brief .label{font-size:12px!important;font-weight:800!important;letter-spacing:.05em!important;text-transform:uppercase!important;color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important;margin:0 0 4px!important}
${s} .mcq-section{background:#fff!important;border:1px solid #e2e8f0!important;border-radius:14px!important;padding:24px!important;margin-bottom:28px!important}
${s} .mcq-section-header{margin-bottom:20px!important;padding-bottom:14px!important;border-bottom:2px solid ${C.accentBg}!important}
${s} .mcq-section-title{font-size:20px!important;font-weight:800!important;color:${C.navy}!important;-webkit-text-fill-color:${C.navy}!important;margin:0!important}
${s} .mcq-section-sub{font-size:13px!important;color:${C.slate}!important;-webkit-text-fill-color:${C.slate}!important;margin:4px 0 0!important}
${s} .mcq-item{margin-bottom:28px!important;padding-bottom:28px!important;border-bottom:1px solid #f1f5f9!important}
${s} .mcq-item:last-child{border-bottom:none!important;margin-bottom:0!important;padding-bottom:0!important}
${s} .mcq-q-num{font-size:11px!important;font-weight:700!important;letter-spacing:.08em!important;text-transform:uppercase!important;color:${C.slate}!important;-webkit-text-fill-color:${C.slate}!important;margin-bottom:8px!important}
${s} .diff-tag{display:inline-block!important;font-size:10px!important;font-weight:700!important;letter-spacing:.06em!important;text-transform:uppercase!important;padding:2px 8px!important;border-radius:100px!important;margin-left:8px!important;background:${C.accentBg}!important;color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important}
${s} .predict-note{font-size:12px!important;font-style:italic!important;color:${C.slate}!important;-webkit-text-fill-color:${C.slate}!important;margin-bottom:12px!important}
${s} .scenario{background:${C.accentBg}!important;border-radius:8px!important;padding:12px 14px!important;margin:0 0 12px!important;font-size:14px!important;color:#1e293b!important;-webkit-text-fill-color:#1e293b!important}
${s} .mcq-q-text{font-size:15px!important;font-weight:600!important;color:${C.navy}!important;-webkit-text-fill-color:${C.navy}!important;line-height:1.6!important;margin-bottom:12px!important}
${s} .mcq-code{background:#0f172a!important;border-radius:8px!important;padding:12px 14px!important;margin:10px 0 14px!important;font-family:"SFMono-Regular",Consolas,Menlo,monospace!important;font-size:13px!important;line-height:1.75!important;color:#e2e8f0!important;-webkit-text-fill-color:#e2e8f0!important;white-space:pre!important;overflow-x:auto!important}
${s} .mcq-code .k{color:${C.accentLt}!important;-webkit-text-fill-color:${C.accentLt}!important}
${s} .mcq-code .n{color:#fde68a!important;-webkit-text-fill-color:#fde68a!important}
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
${s} .scorebar{background:#fff!important;border:1px solid #e2e8f0!important;border-radius:12px!important;padding:14px 18px!important;margin:0 0 20px!important;font-size:14px!important;color:${C.slate}!important;-webkit-text-fill-color:${C.slate}!important}
${s} .scorebar strong{color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important;font-size:17px!important}
${s} .nextnav{display:grid!important;grid-template-columns:repeat(2,1fr)!important;gap:12px!important;margin-top:28px!important}
${s} .nextnav a,${s} .nextnav a:link,${s} .nextnav a:visited{display:block!important;background:#fff!important;border:1px solid #e2e8f0!important;border-radius:12px!important;padding:14px 16px!important;text-decoration:none!important;color:${C.accentDk}!important;-webkit-text-fill-color:${C.accentDk}!important;font-weight:700!important;font-size:15px!important}
@media (max-width:640px){${s} .nextnav{grid-template-columns:repeat(1,1fr)!important}}
</style>`;
}

// ── THE PAGE SCRIPT ──────────────────────────────────────────────────────────
// Inside a script block: Unicode escapes only, never HTML entities, because an
// entity here is parsed as literal text and breaks the block. There are no
// double quotes in this source at all, so nothing can be re-encoded into a
// &quot; by the sanitizer either.
function exerciseScript() {
  return `<script>
(function(){
  var answered = {};
  var total = document.querySelectorAll('.mcq-item[data-item]').length;

  /* Fire one standard event per graded answer. The theme reporter listens for
     apcsActivity and reads course/unit/lesson off the .lesson-page wrapper.
     The activity is read from the item's own data-activity rather than being
     hardcoded, which is the bug that makes the shared lesson-page handler
     unusable here: it always reports 'quiz'. */
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
    var el = document.getElementById('x2-score');
    if(el) el.innerHTML = '<strong>' + right + ' / ' + total + '</strong> correct, ' + done + ' answered';
  }

  window.cspX2 = function(qid, chosen, correct, fbId){
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

    /* The class is applied above, so the reporter can also read correctness off
       the DOM. The explicit flag is sent anyway: it is what the reporter
       prefers, and it removes any dependence on class-name drift. */
    activity({ activity: item.getAttribute('data-activity'), item: qid,
               choice: chosen, correct: (chosen === correct) });
  };

  updateScore();
})();
<\/script>`;
}

// ── EXERCISE 2 PAGE ──────────────────────────────────────────────────────────
function renderExercise2(bank) {
  const t = TOPICS.get(bank.slug);
  if (!t) throw new Error(`unknown CSP lesson slug: ${bank.slug}`);
  const bi = t.bigIdea;
  const id = 'csp-x2';
  const lessonHandle = `ap-csp-course-bi${bi.n}-${bank.slug}`;
  const handle = `${lessonHandle}-exercise-2`;
  const n = bank.questions.length;

  const items = bank.questions.map((q, i) => {
    const qid = `x2-${i + 1}`;
    // The authored option at index order[j] is shown in display position j.
    const { order, correct } = balancedOrder(bank.slug, i, q.correct);

    const opts = order.map((src, j) => {
      const L = LETTERS[j];
      // Single quotes throughout the onclick: a double quote here would be
      // re-encoded to &quot; on save and break the attribute.
      // type="button" is explicit: a bare <button> defaults to type="submit",
      // and if the theme ever wraps page content in a form that default turns
      // every answer click into a page reload.
      return `        <button type="button" class="mcq-option" onclick="cspX2('${qid}','${L}','${correct}','${qid}-fb-${L}')">`
        + `<span class="mcq-option-letter">${L}</span> ${esc(q.options[src])}</button>`;
    }).join('\n');

    // Each rationale travels with its option, so the feedback under display
    // letter C explains whatever option ended up at C.
    const fb = order.map((src, j) => {
      const L = LETTERS[j];
      const right = L === correct;
      return `        <div id="${qid}-fb-${L}" class="mcq-feedback ${right ? 'correct-fb' : 'incorrect-fb'}">`
        + `${right ? 'Correct.' : 'Incorrect.'} ${esc(q.why[LETTERS[src]])}</div>`;
    }).join('\n');

    return `      <div class="mcq-item" data-activity="exercise-2" data-item="${qid}">
        <div class="mcq-q-num">Question ${i + 1} of ${n}<span class="diff-tag">${esc(q.tag)}</span></div>
${q.scenario ? `        <div class="scenario">${esc(q.scenario)}</div>\n` : ''}${q.predict ? `        <div class="predict-note">Predict first: ${esc(q.predict)}</div>\n` : ''}        <div class="mcq-q-text">${esc(q.stem)}</div>
${q.code ? `        <div class="mcq-code">${code(q.code)}</div>\n` : ''}        <div class="mcq-options">
${opts}
        </div>
${fb}
      </div>`;
  }).join('\n');

  const bodyHtml = `${exerciseCss(id)}
<div id="${id}" class="lesson-page" data-course="ap-csp" data-unit="${t.unit}" data-lesson="${bank.slug}">
  <div class="hero">
    <p class="eyebrow">${esc(bi.label)} &middot; Topic ${t.topic} &middot; Exercise 2</p>
    <h1>${esc(bank.title)}: Applied Challenge</h1>
    <p class="sub">${esc(bank.blurb)}</p>
  </div>
  <p class="navrow"><a class="btn" href="/pages/${lessonHandle}">Back to the Topic ${t.topic} lesson</a><a class="btn ghost" href="/pages/${bi.hub}">All ${esc(bi.label.split(':')[0])} topics</a></p>
  <div class="brief">
    <p class="label">How this one is different</p>
    <p>${esc(bank.brief)}</p>
  </div>
  <div class="scorebar" id="x2-score"></div>
  <div class="mcq-section">
    <div class="mcq-section-header">
      <p class="mcq-section-title">Applied Practice</p>
      <p class="mcq-section-sub">${n} questions &middot; scenario driven &middot; every answer is recorded for your teacher</p>
    </div>
${items}
  </div>
  <h2>Where to go next</h2>
  <div class="nextnav">
    <a href="/pages/${lessonHandle}">Rework the Topic ${t.topic} lesson and quiz</a>
    <a href="/pages/ap-csp-course-bi${bi.n}-unit-test">Sit the ${esc(bi.label.split(':')[0])} unit test</a>
  </div>
</div>
${exerciseScript()}`;

  return {
    kind: 'exercise-2',
    unit: t.unit,
    slug: bank.slug,
    topic: t.topic,
    questions: n,
    handle,
    title: `AP CSP ${t.topic} Exercise 2: ${bank.title} Applied Challenge`,
    bodyHtml,
    seoTitle: `AP CSP ${t.topic} Exercise 2: ${bank.title}`.slice(0, 70),
    seoDescription: bank.seo,
  };
}

// ── GUIDED NOTES PAGE (BIG IDEA 3) ───────────────────────────────────────────
// Visually and structurally matched to the 17 notes pages already live for Big
// Ideas 1, 2, 4 and 5, down to the wrapper id, so a teacher printing a Big Idea
// 3 packet gets the same artifact they already print for Big Idea 1. The live
// ones carry curly quotes and em-dashes; these do not, per repo convention.
function notesCss() {
  const s = '#apcsp-notes';
  return `<style>
.page-title,.article__title,.page__title,.template-page main h1:first-of-type{display:none!important;visibility:hidden!important}
${s}{all:initial!important;display:block!important;box-sizing:border-box!important;max-width:860px!important;margin:0 auto!important;padding:8px 16px 56px!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif!important;color:#022C22!important;-webkit-text-fill-color:#022C22!important;line-height:1.6!important;font-size:17px!important;background:#fff!important}
${s} *,${s} *::before,${s} *::after{box-sizing:border-box!important}
${s} .hero{background:linear-gradient(135deg,#065F46,#10B981)!important;color:#fff!important;-webkit-text-fill-color:#fff!important;border-radius:16px!important;padding:26px 24px!important;margin:8px 0 24px!important}
${s} .hero .eyebrow{font-size:13px!important;letter-spacing:.08em!important;text-transform:uppercase!important;color:#D1FAE5!important;-webkit-text-fill-color:#D1FAE5!important;margin:0 0 8px!important}
${s} h1{font-size:28px!important;line-height:1.2!important;margin:0!important;color:#fff!important;-webkit-text-fill-color:#fff!important;font-weight:800!important}
${s} .hero .sub{font-size:16px!important;margin:10px 0 0!important;color:#ECFDF5!important;-webkit-text-fill-color:#ECFDF5!important}
${s} h2{font-size:23px!important;color:#065F46!important;-webkit-text-fill-color:#065F46!important;margin:34px 0 8px!important;font-weight:800!important;border-bottom:3px solid #10B981!important;padding-bottom:6px!important}
${s} h3{font-size:18px!important;color:#022C22!important;-webkit-text-fill-color:#022C22!important;margin:22px 0 6px!important;font-weight:700!important}
${s} p{margin:8px 0!important;color:#022C22!important;-webkit-text-fill-color:#022C22!important}
${s} ul,${s} ol{margin:8px 0!important;padding-left:24px!important}
${s} li{margin:6px 0!important;color:#022C22!important;-webkit-text-fill-color:#022C22!important}
${s} .card{border:1px solid #BBE5D2!important;border-radius:14px!important;padding:16px 18px!important;margin:14px 0!important;background:#ECFDF5!important}
${s} .warn{border-left:5px solid #DC2626!important;background:#FEF2F2!important;border-radius:0 12px 12px 0!important;padding:12px 16px!important;margin:16px 0!important}
${s} .dd{border:1px solid #BFDBFE!important;background:#EFF6FF!important;border-radius:14px!important;padding:16px 18px!important;margin:14px 0!important}
${s} .dd .label{color:#1D4ED8!important;-webkit-text-fill-color:#1D4ED8!important}
${s} .label{font-size:12px!important;font-weight:800!important;letter-spacing:.05em!important;text-transform:uppercase!important;color:#065F46!important;-webkit-text-fill-color:#065F46!important;margin:0 0 4px!important}
${s} table{border-collapse:collapse!important;width:100%!important;margin:12px 0!important;font-size:15px!important}
${s} th{background:#065F46!important;color:#fff!important;-webkit-text-fill-color:#fff!important;border:1px solid #065F46!important;padding:8px 10px!important;text-align:left!important}
${s} td{border:1px solid #BBE5D2!important;padding:8px 10px!important;color:#022C22!important;-webkit-text-fill-color:#022C22!important;vertical-align:top!important}
${s} .wline{display:block!important;border-bottom:1.5px solid #A7C4B8!important;height:30px!important;margin:8px 0!important}
${s} .wcell{display:block!important;border-bottom:1.5px solid #A7C4B8!important;height:26px!important}
${s} .gap{display:inline-block!important;min-width:170px!important;border-bottom:1.5px solid #A7C4B8!important;height:1.1em!important;vertical-align:baseline!important}
${s} pre.code{font-family:"SFMono-Regular",Consolas,Menlo,monospace!important;font-size:14px!important;background:#F0F7F4!important;border:1px solid #BBE5D2!important;border-radius:10px!important;padding:12px 14px!important;margin:6px 0 12px!important;overflow-x:auto!important;white-space:pre!important;color:#022C22!important;-webkit-text-fill-color:#022C22!important;line-height:1.45!important}
${s} .muted{color:#5B7268!important;-webkit-text-fill-color:#5B7268!important;font-size:14px!important}
${s} a,${s} a:link,${s} a:visited{color:#065F46!important;-webkit-text-fill-color:#065F46!important;text-decoration:underline!important}
${s} .btn,${s} .btn:link,${s} .btn:visited{display:inline-block!important;background:#10B981!important;color:#fff!important;-webkit-text-fill-color:#fff!important;text-decoration:none!important;font-weight:700!important;border-radius:10px!important;padding:10px 16px!important;border:0!important;cursor:pointer!important;font-size:15px!important;margin:4px 8px 4px 0!important}
@media print{${s} .noprint{display:none!important} ${s} .hero{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}
</style>`;
}

// Write lines for a student to fill in. Kept as a helper so a section says how
// much room it wants rather than repeating markup.
const wlines = (k) => new Array(k).fill('<span class="wline"></span>').join('');
const wcells = (k) => new Array(k).fill('<span class="wcell"></span>').join('');

function renderNotes(note) {
  const t = TOPICS.get(note.slug);
  if (!t) throw new Error(`unknown CSP lesson slug: ${note.slug}`);
  const bi = t.bigIdea;
  const lessonHandle = `ap-csp-course-bi${bi.n}-${note.slug}`;

  const vocab = note.vocab.map((term) =>
    `<tr><td style="width:30%!important"><strong>${esc(term)}</strong></td><td>${wcells(2)}</td></tr>`).join('\n');

  const sections = note.sections.map((sec, i) => {
    const num = String(i + 1).padStart(2, '0');
    const blocks = sec.blocks.map((b) => {
      if (b.type === 'text') return `<p>${esc(b.text)}</p>`;
      if (b.type === 'muted') return `<p class="muted">${esc(b.text)}</p>`;
      if (b.type === 'code') return `<pre class="code">${esc(b.src)}</pre>`;
      if (b.type === 'list') return `<ul>${b.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
      if (b.type === 'write') return `<p class="label">${esc(b.prompt)}</p>${wlines(b.lines || 3)}`;
      if (b.type === 'warn') {
        return `<div class="warn"><p class="label">${esc(b.label || 'Common mistake')}</p><p>${esc(b.text)}</p></div>`;
      }
      if (b.type === 'dd') {
        return `<div class="dd"><p class="label">${esc(b.label || 'Exam tip')}</p><p>${esc(b.text)}</p></div>`;
      }
      if (b.type === 'table') {
        const head = `<tr>${b.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>`;
        const rows = b.rows.map((r) =>
          `<tr>${r.map((cellText) => `<td>${cellText === null ? '<span class="wcell"></span>' : esc(cellText)}</td>`).join('')}</tr>`).join('\n');
        return `<table>\n${head}\n${rows}\n</table>`;
      }
      throw new Error(`unknown notes block type: ${b.type}`);
    }).join('\n');
    return `<h2>${num}. ${esc(sec.heading)}</h2>\n${blocks}`;
  }).join('\n');

  const bodyHtml = `${notesCss()}
<div id="apcsp-notes">
<div class="hero">
<p class="eyebrow">${esc(bi.label)} &middot; Topic ${t.topic} &middot; Guided Notes (Student)</p>
<h1>${esc(note.title)}: Guided Notes</h1>
<p class="sub">Fill these in during class, or catch up here if you were absent. Print this page or work on paper, then check yourself against the quiz on the Topic ${t.topic} page.</p>
</div>
<p class="noprint"><a class="btn" href="javascript:window.print()">Print these notes</a><a class="btn" href="/pages/${lessonHandle}">Topic ${t.topic} lesson page</a><a class="btn" href="/pages/${lessonHandle}-exercise-2">Applied challenge</a><a class="btn" href="/pages/ap-csp-course">All CSP topics</a></p>
<div class="card">
<p class="label">Today's objectives</p>
<ul>${note.objectives.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
</div>
<div class="card">
<p class="label">Bell ringer</p>
<p>${esc(note.bellRinger)}</p>
${wlines(3)}
</div>
<h2>00. Key Vocabulary</h2>
<p class="muted">Write the definition in your own words. The wording you would use to explain it to someone in the class is the wording that sticks.</p>
<table>
<tr><th>Term</th><th>Definition (write it)</th></tr>
${vocab}
</table>
${sections}
<h2>${String(note.sections.length + 1).padStart(2, '0')}. Exit Ticket</h2>
<p>${esc(note.exitTicket)}</p>
${wlines(4)}
</div>`;

  return {
    kind: 'notes',
    unit: t.unit,
    slug: note.slug,
    topic: t.topic,
    handle: `${lessonHandle}-notes`,
    title: `AP CSP Topic ${t.topic} Guided Notes - ${note.title}`,
    bodyHtml,
    seoTitle: `AP CSP ${t.topic} Guided Notes: ${note.title}`.slice(0, 70),
    seoDescription: note.seo,
  };
}

function allPages() {
  return [
    ...EXERCISE_2.map(renderExercise2),
    ...BI3_NOTES.map(renderNotes),
  ];
}

module.exports = { allPages, renderExercise2, renderNotes, TOPICS, BIG_IDEAS, esc };
