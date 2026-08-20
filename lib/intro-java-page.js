'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  INTRO TO JAVA LESSON PAGE RENDERER.
//
//  Turns one entry from seed/intro-java-unitN.js into the Body HTML that ships
//  to Shopify, plus the SEO title and description that ride in their own
//  Matrixify columns.
//
//  ── WHY RENDER RATHER THAN HAND-WRITE ───────────────────────────────────────
//  42 hand-written lesson pages drift. One gets a misconceptions block and the
//  next does not; one has alt text and the next does not; one puts the quiz
//  before the recap. Rendering makes the teaching STRUCTURE a property of the
//  course rather than of whoever wrote that page, and it means improving the
//  format is one edit that reaches every lesson at once.
//
//  ── THE ANSWER KEY CANNOT LEAK, BY CONSTRUCTION ─────────────────────────────
//  This module never receives the keys. `publicQuestion()` copies the four
//  fields a page legitimately needs (id, stem, options, and nothing else) into a
//  fresh object, so `answer` and `why` are not dropped from the output, they are
//  never in the output. A future edit that adds a field to the bank cannot
//  accidentally spill it: it would have to be added here on purpose.
//
//  smoke/intro-java-content.js then greps the rendered HTML for every correct
//  answer string and fails the build if one appears. Belt and braces, because
//  "the key is server-side" is the sort of claim that quietly stops being true.
//
//  ── THEME CONSTRAINTS THIS OBEYS ────────────────────────────────────────────
//  From the storefront hazard rules, which exist because each one shipped a bug:
//    - All CSS scoped under one wrapper id, so nothing bleeds sitewide.
//    - HTML entities OUTSIDE script blocks; inside a script block, never an
//      entity (it is parsed as literal text and breaks the script).
//    - No emojis. Pure ASCII source.
//    - Never `&quot;` inside an attribute; the sanitizer decodes it and breaks
//      the attribute.
//
//  Zero PII. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

const { hasShot, sizeOf } = require('../seed/intro-java-shots');

const WRAP = 'ij-lesson';
const SITE = 'https://apcsexamprep.com';

// ── THE COURSE HUB HANDLE, DEFINED ONCE ──────────────────────────────────────
// It looks like a legacy slug because it is one: the hub took over a page that
// had carried a Greenfoot project library since 2025-09-15, to inherit its links
// and its age rather than start from nothing.
//
// It lives HERE, in the lowest module, rather than in the hub renderer, because
// three files link to the course and the hub renderer already imports this one.
// Defining it there and copying it here would be a cycle; copying it by hand is
// what produced 83 pages pointing at a handle that did not exist, which is the
// defect this constant exists to make impossible.
const COURSE_HANDLE = 'greenfoot-basics-beginner-greenfoot-projects-and-tutorials';
const COURSE_URL = `${SITE}/pages/${COURSE_HANDLE}`;

// Unit hub handles. Deliberately NOT derived from COURSE_HANDLE, which is an
// inherited slug: the unit hubs are new pages and get a clean prefix.
//
// This moved down here from the hub renderer for the same reason COURSE_HANDLE
// did. A lesson page needs to link to the hub of its own unit, the hub renderer
// already imports this file, and importing back the other way would be a cycle.
// The alternative was copying the one-line formula into a second file, which is
// exactly the mistake that produced 83 pages pointing at a handle nobody built.
const COURSE_SLUG = 'intro-java';
const unitHandle = (unit) => `${COURSE_SLUG}-${unit}`;

// The anchor on the course hub's project list. A project page links back to the
// list it came from rather than to the top of a long hub page, so "back" lands
// where the student was actually looking. Named here so the id and every link
// to it cannot drift apart.
const PROJECTS_ANCHOR = 'ij-projects';
const PROJECTS_URL = `${COURSE_URL}#${PROJECTS_ANCHOR}`;
// Figures live in Shopify Files, and this is the URL form that store actually
// serves. It was `${SITE}/cdn/shop/files`, which looks plausible and 404s: the
// storefront domain does not proxy that path here, so every figure rendered as a
// broken image with its alt text showing. The two long-standing images on the
// site (the logo and the profile picture) both use the shape below, which is the
// evidence this is written from rather than a guess.
//
// The numeric segment is the shop id. It is stable for the store and appears in
// every URL the Admin API hands back for an uploaded file. No ?v= cache buster:
// it is optional for retrieval, and baking one in would pin every figure to the
// version it had on the day the page was imported.
const SHOT_BASE = 'https://cdn.shopify.com/s/files/1/0778/8403/1191/files';

// ── Escaping ─────────────────────────────────────────────────────────────────
// Text destined for markup. Ampersand first or it double-encodes the rest.
function esc(s) {
  return String(s == null ? '' : s)
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;')
    .split("'").join('&#39;');
}

// Text destined for an ATTRIBUTE. Deliberately NOT the same function: the theme
// sanitizer decodes `&quot;` back into a literal quote and breaks the attribute,
// so a double quote is stripped rather than encoded here.
function escAttr(s) {
  return String(s == null ? '' : s)
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('')
    .split("'").join('&#39;');
}

// Text destined for INSIDE a <script> block (JSON-LD). Entities are forbidden
// there, so this escapes with JSON's own rules and then hides the one sequence
// that could close the block early.
function jsonForScript(value) {
  return JSON.stringify(value)
    .split('<').join('\\u003c')
    .split('>').join('\\u003e')
    .split('&').join('\\u0026');
}

// Paragraph breaks in authored notes are written as blank lines.
function paras(text, cls) {
  return String(text || '')
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p${cls ? ` class="${cls}"` : ''}>${esc(p)}</p>`)
    .join('\n');
}

// ── The key barrier ──────────────────────────────────────────────────────────
// Copies ONLY what a page may show. See the header note: this is a whitelist by
// construction, not a blacklist of things to strip.
function publicQuestion(q) {
  return {
    id: String(q.id),
    stem: String(q.stem),
    options: (q.options || []).map((o) => String(o)),
  };
}

// A gap hole may show its hint. It may never show its accepted answers.
function publicHole(h) {
  return { n: Number(h.n), hint: String(h.hint || '') };
}

// ── Section builders ─────────────────────────────────────────────────────────

function renderObjectives(l) {
  const items = l.objectives.map((o) => `<li>${esc(o)}</li>`).join('\n');
  return `<section class="ij-objectives" aria-labelledby="ij-obj-h">
<h2 id="ij-obj-h">What you will be able to do</h2>
<ul>
${items}
</ul>
</section>`;
}

function renderVocab(l) {
  if (!l.vocab || !l.vocab.length) return '';
  const rows = l.vocab.map((v) => `<div class="ij-term">
<dt>${esc(v.term)}</dt>
<dd class="ij-plain"><span class="ij-tag">In plain words</span> ${esc(v.plain)}</dd>
<dd class="ij-formal"><span class="ij-tag">More precisely</span> ${esc(v.formal)}</dd>
</div>`).join('\n');
  return `<section class="ij-vocab" aria-labelledby="ij-vocab-h">
<h2 id="ij-vocab-h">Words you will need</h2>
<dl>
${rows}
</dl>
</section>`;
}

function renderSteps(l) {
  const steps = l.steps.map((s, i) => {
    const n = i + 1;
    // A screenshot that has not been taken yet is NOT rendered as a broken
    // image. Its alt text becomes an instruction to look at the student's own
    // Greenfoot window instead, which is why every alt text was written to
    // describe what actually matters in the frame. See seed/intro-java-shots.js.
    let shot = '';
    if (s.shot && hasShot(s.shot.src)) {
      // Size comes from the shot record, not a constant. Generated figures are
      // all 960x600; a real screenshot is whatever shape the window was, and
      // declaring the wrong one makes the browser reserve a box of the wrong
      // height and then jump when the image lands.
      const dim = sizeOf(s.shot.src);
      shot = `<figure class="ij-shot">
<img src="${escAttr(SHOT_BASE + '/' + s.shot.src.split('/').join('-'))}"
     alt="${escAttr(s.shot.alt)}" loading="lazy" width="${dim.w}" height="${dim.h}">
</figure>`;
    } else if (s.shot) {
      shot = `<p class="ij-look"><span class="ij-tag">On your screen</span> `
        + `${esc(s.shot.alt)}</p>`;
    }
    const code = s.code
      ? `<pre class="ij-code"><code>${esc(s.code)}</code></pre>`
      : '';
    return `<li class="ij-step" id="step-${n}">
<h3><span class="ij-step-n">Step ${n}</span></h3>
${shot}
${code}
${paras(s.note)}
</li>`;
  }).join('\n');

  return `<section class="ij-walkthrough" aria-labelledby="ij-walk-h">
<h2 id="ij-walk-h">Build it step by step</h2>
<p class="ij-note-runnable"><strong>Every step below leaves a scenario that
compiles and runs.</strong> If you stop halfway you will have something that
works, not something broken. Follow along in Greenfoot rather than reading
straight through.</p>
<ol class="ij-steps">
${steps}
</ol>
</section>`;
}

function renderMisconceptions(l) {
  if (!l.misconceptions || !l.misconceptions.length) return '';
  const rows = l.misconceptions.map((m) => `<div class="ij-mis">
<p class="ij-mis-wrong"><span class="ij-tag ij-tag-no">Common wrong idea</span>
${esc(m.wrong)}</p>
<p class="ij-mis-right"><span class="ij-tag ij-tag-yes">What is actually true</span>
${esc(m.right)}</p>
<p class="ij-mis-why"><span class="ij-tag">Why it matters</span> ${esc(m.why)}</p>
</div>`).join('\n');
  return `<section class="ij-misconceptions" aria-labelledby="ij-mis-h">
<h2 id="ij-mis-h">Mistakes almost everyone makes here</h2>
<p>These are the wrong ideas students actually build at this point. Read them
even if you think you understand, because a wrong idea you have not noticed is
the expensive kind.</p>
${rows}
</section>`;
}

// Questions render WITHOUT answers. The widget posts a submission and the server
// grades it; the page never knows which option is correct.
//
// Two DIFFERENT feedback slots, and the distinction matters. Each question owns
// a `.ij-feedback` for its own mark, and the section owns one more carrying the
// `.ij-summary` class for the whole-item result. Without the second one the
// reporter's `section.querySelector('.ij-feedback')` finds question one's
// paragraph, and the total score lands on top of question one's mark and erases
// it. smoke/intro-java-reporter.js pins both.
function renderQuestions(list, kind, lessonId, heading, blurb) {
  if (!list || !list.length) return '';
  const items = list.map((raw, i) => {
    const q = publicQuestion(raw);
    const itemId = `${lessonId}-${kind === 'quiz' ? 'quiz' : q.id}`;
    const opts = q.options.map((o, oi) => `<li class="ij-opt">
<label>
<input type="radio" name="${escAttr(itemId + '-' + q.id)}" value="${oi}">
<span>${esc(o)}</span>
</label>
</li>`).join('\n');
    return `<li class="ij-q" data-q-id="${escAttr(q.id)}"${kind === 'quiz' ? '' : ` data-item-id="${escAttr(itemId)}"`}>
<p class="ij-stem"><span class="ij-qn">${i + 1}.</span> ${esc(q.stem)}</p>
<ul class="ij-opts">
${opts}
</ul>
<p class="ij-feedback" role="status" aria-live="polite"></p>
</li>`;
  }).join('\n');

  const wrapAttrs = kind === 'quiz'
    ? ` data-item-id="${escAttr(lessonId + '-quiz')}" data-item-type="quiz"`
    : ' data-item-type="cfu"';

  return `<section class="ij-${kind}"${wrapAttrs} aria-labelledby="ij-${kind}-h">
<h2 id="ij-${kind}-h">${esc(heading)}</h2>
${blurb ? `<p>${esc(blurb)}</p>` : ''}
<ol class="ij-qs">
${items}
</ol>
<button type="button" class="ij-check" data-role="${kind === 'quiz' ? 'submit-quiz' : 'check-cfu'}">
${kind === 'quiz' ? 'Submit quiz' : 'Check my answers'}
</button>
<p class="ij-feedback ij-summary" role="status" aria-live="polite"></p>
</section>`;
}

function renderGap(l) {
  const g = l.gap;
  if (!g) return '';
  const holes = g.holes.map(publicHole);

  // The code is emitted with each ___N___ marker replaced by an input. Splitting
  // on the marker rather than regex-replacing keeps the surrounding code escaped
  // exactly once.
  let html = '';
  const parts = String(g.code).split(/___(\d+)___/);
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      html += esc(parts[i]);
    } else {
      const n = Number(parts[i]);
      const hole = holes.find((h) => h.n === n);
      html += `<input class="ij-hole" type="text" size="10" spellcheck="false"
 autocapitalize="off" autocomplete="off" data-hole="${n}"
 aria-label="${escAttr('Blank ' + n + '. ' + (hole ? hole.hint : ''))}">`;
    }
  }

  const hints = holes.map((h) => `<li><strong>Blank ${h.n}:</strong> ${esc(h.hint)}</li>`).join('\n');

  return `<section class="ij-gap" data-item-id="${escAttr(l.lesson + '-gap')}" data-item-type="gap"
 aria-labelledby="ij-gap-h">
<h2 id="ij-gap-h">Fill in the code</h2>
${paras(g.intro)}
<pre class="ij-code ij-code-fill"><code>${html}</code></pre>
<details class="ij-hints">
<summary>Stuck? Open a hint for each blank</summary>
<ul>
${hints}
</ul>
</details>
<button type="button" class="ij-check" data-role="check-gap">Check my code</button>
<p class="ij-feedback ij-summary" role="status" aria-live="polite"></p>
</section>`;
}

function renderRecap(l) {
  const items = l.recap.map((r) => `<li>${esc(r)}</li>`).join('\n');
  return `<section class="ij-recap" aria-labelledby="ij-recap-h">
<h2 id="ij-recap-h">The short version</h2>
<ul>
${items}
</ul>
</section>`;
}

function renderStuck(l, helpIndex) {
  if (!l.stuck || !l.stuck.length) return '';
  const links = l.stuck.map((code) => {
    const h = helpIndex[code];
    if (!h) return '';
    return `<li><a href="${escAttr(SITE + '/pages/' + h.handle)}">${esc(h.title)}</a></li>`;
  }).filter(Boolean).join('\n');
  if (!links) return '';
  return `<section class="ij-stuck" aria-labelledby="ij-stuck-h">
<h2 id="ij-stuck-h">If you get stuck</h2>
<p>These pages cover the problems that come up most often in this lesson.
Opening one is not cheating and it is not counted against you.</p>
<ul>
${links}
</ul>
</section>`;
}

// Previous, up, next.
//
// The middle link is the one that was missing. A lesson page had prev and next
// and nothing else, so the only way back to the unit hub was the browser button
// or the site nav: a student who arrived from a search result had no way up at
// all. Unit hubs have carried an "All units" link in this same slot since they
// were built; this is the same idea one level down.
function renderNav(l, prev, next, unitKey, unitLabel) {
  const bits = [];
  if (prev) {
    bits.push(`<a class="ij-prev" rel="prev" href="${escAttr(SITE + '/pages/' + prev.handle)}">
Previous: ${esc(prev.lesson + ' ' + prev.title)}</a>`);
  }
  if (unitKey) {
    // "Unit 4", not "Unit 4: Loops and Collections of Actors". The full label
    // is a heading; between a Previous and a Next that already carry lesson
    // titles it is the longest thing in the row and reads as the destination
    // being far away rather than one level up.
    const short = String(unitLabel || 'this unit').split(':')[0];
    bits.push(`<a class="ij-up" rel="up" href="${escAttr(SITE + '/pages/' + unitHandle(unitKey))}">`
      + `All of ${esc(short)}</a>`);
  }
  if (next) {
    bits.push(`<a class="ij-next" rel="next" href="${escAttr(SITE + '/pages/' + next.handle)}">
Next: ${esc(next.lesson + ' ' + next.title)}</a>`);
  }
  if (!bits.length) return '';
  return `<nav class="ij-nav" aria-label="Lesson navigation">\n${bits.join('\n')}\n</nav>`;
}

// ── Structured data ──────────────────────────────────────────────────────────
// Three graphs, each earning its place:
//   LearningResource - tells search engines this is a lesson, its level, and how
//                      long it takes.
//   FAQPage          - the questions beginners actually type into Google. This
//                      is the block that can win a rich result.
//   BreadcrumbList   - puts the lesson in its course and unit.
function renderJsonLd(l, handle, unitLabel) {
  const url = `${SITE}/pages/${handle}`;

  const learning = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: l.seo.h1,
    description: l.seo.description,
    url,
    learningResourceType: 'Lesson',
    educationalLevel: 'Beginner',
    teaches: l.objectives,
    timeRequired: `PT${Number(l.minutes)}M`,
    inLanguage: 'en',
    isPartOf: {
      '@type': 'Course',
      name: 'Intro to Java with Greenfoot',
      description: 'A beginner Java course taught through Greenfoot game projects, '
        + 'from a first actor to 2D array tile maps.',
      url: COURSE_URL,
      provider: { '@type': 'Organization', name: 'APCSExamPrep', url: SITE },
    },
  };

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (l.seo.faq || []).map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Intro to Java with Greenfoot', item: COURSE_URL },
      // Derived from the lesson number rather than passed in. Every lesson used
      // to point at unit-1 here regardless of its actual unit, so the crumb said
      // "Unit 6" and linked to Unit 1 on all 42 pages.
      { '@type': 'ListItem', position: 2, name: unitLabel,
        item: `${SITE}/pages/intro-java-unit-${String(l.lesson).split('.')[0]}` },
      { '@type': 'ListItem', position: 3, name: `${l.lesson} ${l.title}`, item: url },
    ],
  };

  const graphs = [learning, crumbs];
  if (faq.mainEntity.length) graphs.push(faq);

  return graphs
    .map((g) => `<script type="application/ld+json">${jsonForScript(g)}</script>`)
    .join('\n');
}

// ── CSS ──────────────────────────────────────────────────────────────────────
// Scoped entirely under one id per the theme rule, so it cannot bleed sitewide.
function renderCss() {
  return `<style>
#${WRAP} { all: initial !important; display: block !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
  color: #16202b !important; line-height: 1.65 !important; max-width: 820px !important;
  margin: 0 auto !important; padding: 8px 16px 64px !important; }
#${WRAP} * { box-sizing: border-box !important; }
#${WRAP} h1 { font-size: 34px !important; line-height: 1.15 !important; margin: 0 0 12px !important;
  color: #10306b !important; -webkit-text-fill-color: #10306b !important; font-weight: 700 !important; }
#${WRAP} h2 { font-size: 23px !important; margin: 40px 0 12px !important; color: #10306b !important;
  -webkit-text-fill-color: #10306b !important; font-weight: 700 !important; }
#${WRAP} h3 { font-size: 17px !important; margin: 26px 0 8px !important; color: #16202b !important;
  -webkit-text-fill-color: #16202b !important; font-weight: 700 !important; }
#${WRAP} p, #${WRAP} li { font-size: 17px !important; color: #16202b !important;
  -webkit-text-fill-color: #16202b !important; }
#${WRAP} a { color: #0b5cd5 !important; -webkit-text-fill-color: #0b5cd5 !important; }
#${WRAP} .ij-hook { font-size: 19px !important; color: #33414f !important;
  -webkit-text-fill-color: #33414f !important; }
#${WRAP} .ij-meta { font-size: 14px !important; color: #5a6672 !important;
  -webkit-text-fill-color: #5a6672 !important; margin: 0 0 20px !important; }
#${WRAP} .ij-code { background: #10202f !important; color: #e8f0f7 !important;
  -webkit-text-fill-color: #e8f0f7 !important; padding: 14px 16px !important; border-radius: 6px !important;
  overflow-x: auto !important; font-family: Menlo, Consolas, monospace !important;
  font-size: 14.5px !important; line-height: 1.55 !important; }
#${WRAP} .ij-code code { background: none !important; color: inherit !important;
  -webkit-text-fill-color: inherit !important; font-family: inherit !important; }
#${WRAP} .ij-shot img { max-width: 100% !important; height: auto !important;
  border: 1px solid #d3dbe3 !important; border-radius: 6px !important; display: block !important; }
#${WRAP} figure { margin: 0 0 14px !important; }
#${WRAP} .ij-steps { list-style: none !important; padding: 0 !important; margin: 0 !important; }
#${WRAP} .ij-step { border-left: 3px solid #0b5cd5 !important; padding: 2px 0 2px 20px !important;
  margin: 0 0 34px !important; }
#${WRAP} .ij-step-n { font-size: 12px !important; letter-spacing: 0.09em !important;
  text-transform: uppercase !important; color: #0b5cd5 !important;
  -webkit-text-fill-color: #0b5cd5 !important; }
#${WRAP} .ij-look { background: #fbfaf5 !important; border: 1px dashed #d8cfae !important;
  border-radius: 6px !important; padding: 11px 14px !important; color: #4a4432 !important;
  -webkit-text-fill-color: #4a4432 !important; }
#${WRAP} .ij-note-runnable { background: #eef4ff !important; border: 1px solid #c5d8fb !important;
  padding: 12px 14px !important; border-radius: 6px !important; }
#${WRAP} .ij-tag { display: inline-block !important; font-size: 11px !important;
  letter-spacing: 0.07em !important; text-transform: uppercase !important; font-weight: 700 !important;
  background: #e7edf3 !important; color: #3d4b59 !important; -webkit-text-fill-color: #3d4b59 !important;
  padding: 2px 7px !important; border-radius: 3px !important; margin-right: 6px !important; }
#${WRAP} .ij-tag-no { background: #fde8e6 !important; color: #96261b !important;
  -webkit-text-fill-color: #96261b !important; }
#${WRAP} .ij-tag-yes { background: #e2f4ea !important; color: #14603c !important;
  -webkit-text-fill-color: #14603c !important; }
#${WRAP} .ij-mis { border: 1px solid #e0e6ec !important; border-radius: 6px !important;
  padding: 14px 16px !important; margin: 0 0 14px !important; }
#${WRAP} .ij-mis p { margin: 0 0 8px !important; }
#${WRAP} .ij-mis p:last-child { margin: 0 !important; }
#${WRAP} .ij-term dt { font-weight: 700 !important; margin: 16px 0 4px !important; }
#${WRAP} .ij-term dd { margin: 0 0 4px !important; }
#${WRAP} .ij-qs { padding-left: 0 !important; list-style: none !important; }
#${WRAP} .ij-q { border: 1px solid #e0e6ec !important; border-radius: 6px !important;
  padding: 14px 16px !important; margin: 0 0 12px !important; }
#${WRAP} .ij-stem { font-weight: 600 !important; margin: 0 0 10px !important; }
#${WRAP} .ij-qn { color: #0b5cd5 !important; -webkit-text-fill-color: #0b5cd5 !important; }
#${WRAP} .ij-opts { list-style: none !important; padding: 0 !important; margin: 0 !important; }
#${WRAP} .ij-opt label { display: flex !important; gap: 9px !important; align-items: flex-start !important;
  padding: 6px 0 !important; cursor: pointer !important; }
#${WRAP} .ij-hole { font-family: Menlo, Consolas, monospace !important; font-size: 14px !important;
  padding: 2px 6px !important; border: 2px solid #ffd24d !important; border-radius: 4px !important;
  background: #fffbee !important; color: #10202f !important; -webkit-text-fill-color: #10202f !important; }
#${WRAP} .ij-check { background: #0b5cd5 !important; color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important; border: 0 !important; border-radius: 6px !important;
  padding: 11px 20px !important; font-size: 16px !important; font-weight: 600 !important;
  cursor: pointer !important; margin-top: 8px !important; }
#${WRAP} .ij-check:focus-visible, #${WRAP} a:focus-visible, #${WRAP} .ij-hole:focus-visible {
  outline: 3px solid #ffb020 !important; outline-offset: 2px !important; }
#${WRAP} .ij-feedback { min-height: 22px !important; font-weight: 600 !important; margin: 8px 0 0 !important; }
#${WRAP} .ij-summary { font-size: 16px !important; margin-top: 10px !important; }
#${WRAP} .ij-nav { display: flex !important; justify-content: space-between !important;
  gap: 16px !important; flex-wrap: wrap !important; margin-top: 44px !important;
  border-top: 1px solid #e0e6ec !important; padding-top: 18px !important; }
#${WRAP} .ij-stuck { background: #fbf7ec !important; border: 1px solid #ecdfc0 !important;
  border-radius: 6px !important; padding: 4px 18px 18px !important; }
#${WRAP} details.ij-hints { margin: 12px 0 !important; }
#${WRAP} details.ij-hints summary { cursor: pointer !important; font-weight: 600 !important;
  color: #0b5cd5 !important; -webkit-text-fill-color: #0b5cd5 !important; }
</style>`;
}

// ── Public API ───────────────────────────────────────────────────────────────

function handleFor(lesson) {
  const [u, n] = String(lesson.lesson).split('.');
  return `intro-java-lesson-${u}-${n}-${lesson.slug}`;
}

/**
 * Render one lesson.
 *
 * @param {object} lesson  an entry from seed/intro-java-unitN.js
 * @param {object} opts    { prev, next, unitLabel, helpIndex }
 * @returns {{handle,title,seoTitle,seoDescription,bodyHtml}}
 */
function renderLesson(lesson, opts) {
  const o = opts || {};
  const handle = handleFor(lesson);
  const unitLabel = o.unitLabel || 'Unit 1: Meet Greenfoot';
  const helpIndex = o.helpIndex || {};

  // Exactly ONE h1 on the page. verify-artifact.js flags anything else as P1,
  // and more than one h1 is the most common on-page SEO defect there is.
  const body = [
    `<div id="${WRAP}" data-course="intro-java" data-lesson-id="${escAttr(lesson.lesson)}"`
      + ` data-unit="${escAttr(o.unitKey || 'unit-1')}">`,
    renderCss(),
    `<h1>${esc(lesson.seo.h1)}</h1>`,
    `<p class="ij-meta">`
      + `<a href="${escAttr(SITE + '/pages/' + unitHandle(o.unitKey || 'unit-1'))}">`
      + `${esc(unitLabel)}</a> &middot; Lesson ${esc(lesson.lesson)}`
      + ` &middot; about ${esc(String(lesson.minutes))} minutes &middot; no coding experience needed</p>`,
    paras(lesson.hook, 'ij-hook'),
    renderObjectives(lesson),
    renderVocab(lesson),
    renderSteps(lesson),
    renderMisconceptions(lesson),
    renderQuestions(lesson.cfus, 'cfu', lesson.lesson, 'Check your understanding',
      'Answer these before moving on. They are graded instantly and you can retry.'),
    renderGap(lesson),
    renderQuestions(lesson.quiz, 'quiz', lesson.lesson, 'Lesson quiz',
      'This one counts toward your progress. Take it when the section above makes sense.'),
    renderRecap(lesson),
    renderStuck(lesson, helpIndex),
    renderNav(lesson, o.prev, o.next, o.unitKey, unitLabel),
    renderJsonLd(lesson, handle, unitLabel),
    '</div>',
  ].filter(Boolean).join('\n');

  return {
    handle,
    lesson: lesson.lesson,
    title: `${lesson.lesson} ${lesson.title}`,
    seoTitle: lesson.seo.title,
    seoDescription: lesson.seo.description,
    bodyHtml: body,
  };
}

module.exports = { renderLesson, handleFor, publicQuestion, publicHole, esc, escAttr,
  WRAP, SITE, COURSE_HANDLE, COURSE_URL, COURSE_SLUG, unitHandle,
  PROJECTS_ANCHOR, PROJECTS_URL };
