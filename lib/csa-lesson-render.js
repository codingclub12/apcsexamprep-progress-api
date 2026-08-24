'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  AP CSA LESSON PAGE RENDERER (unit-4 recontent).
//
//  WHY THIS EXISTS
//  Six live Unit 4 lesson pages (4.6, 4.7, 4.13, 4.14, 4.15, 4.17) were authored
//  against the wrong AP CSA topic (see docs/runs/2026-08-19-claude-code-csa-unit4-ced-mismatch.md
//  and docs/runs/2026-08-20-claude-code-csa-unit4-ced-fix.md, which fixed the
//  EXERCISE content but explicitly left the live lesson page content and title
//  untouched, since that was flagged as a separate, larger decision). This
//  renders the corrected lesson page bodies, matching the exact template the
//  rest of the course already uses.
//
//  THE TEMPLATE IS COPIED, NOT REINVENTED
//  lib/assets/csa-lesson.css.html is a byte-for-byte extract of the `<style>`
//  block from the live ap-csa-lesson-4-16-recursion page (a lesson confirmed to
//  have the CORRECT CED topic, per the mismatch run note), with only the two
//  unused drag-and-drop game widget rules dropped (#srt-203, #opq-203 and their
//  .apcsa-game-block/.game-pill selectors: present in that page's CSS but never
//  referenced by any element in its body, dead weight this template does not
//  carry forward). Every class name, the MCQ check/feedback script, and the two
//  JSON-LD blocks match that page exactly, so these six pages read as the same
//  product as the other 47, not a different one.
//
//  CONTENT SHAPE
//  A lesson is data: learnObjectives, vocab terms, prose sections built from
//  typed blocks (text/code/callout/list), and two MCQ tiers (5 "Practice
//  Questions", 5 "Mastery"), matching the live template's own 5+5 split.
//
//  HOUSE HAZARDS APPLIED: scoped CSS with all:initial, no &quot; in attributes,
//  no entities inside script blocks, pure ASCII, no em-dashes.
//
//  Zero PII: author content only.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const CSS = fs.readFileSync(path.join(__dirname, 'assets', 'csa-lesson.css.html'), 'utf8');

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Inline code spans inside prose: `like this` becomes <code>like this</code>.
// Only used in short text fields (stems, list items, callout text), never in
// pre-formatted code blocks, which pass through esc() alone.
function inline(s) {
  const parts = String(s == null ? '' : s).split('`');
  let out = '';
  for (let i = 0; i < parts.length; i++) {
    out += i % 2 === 1 ? `<code>${esc(parts[i])}</code>` : esc(parts[i]);
  }
  return out;
}

function renderBlock(b) {
  if (b.type === 'text') return `<p>${inline(b.text)}</p>`;
  if (b.type === 'code') return `<pre><code>${esc(b.src)}</code></pre>`;
  if (b.type === 'list') {
    const tag = b.ordered ? 'ol' : 'ul';
    return `<${tag}>${b.items.map((it) => `<li>${inline(it)}</li>`).join('')}</${tag}>`;
  }
  if (b.type === 'callout') {
    const icon = { concept: '📌', example: '✅', trap: '⚠️', warning: '⚠️' }[b.kind] || '';
    const codeHtml = b.code ? `<pre style="margin:8px 0!important;">${esc(b.code)}</pre>` : '';
    return `<div class="apcsa-callout ${b.kind}">\n<h4>${icon} ${esc(b.title)}</h4>\n<p>${inline(b.text)}</p>${codeHtml}\n</div>`;
  }
  throw new Error(`csa-lesson-render: unknown block type ${b.type}`);
}

function renderSection(sec) {
  const blocks = sec.blocks.map(renderBlock).join('\n');
  return `<h2>${esc(sec.heading)}</h2>\n${blocks}`;
}

function renderVocab(vocab) {
  const rows = vocab.map((v) => `<tr>
<td style="padding:8px 12px!important;border:1px solid #e5e7eb!important;font-weight:700!important;font-family:Consolas,monospace!important;font-size:13px!important;color:#1e1b4b!important;-webkit-text-fill-color:#1e1b4b!important;background:#f9fafb!important;vertical-align:top!important;">${esc(v.term)}</td>
<td style="padding:8px 12px!important;border:1px solid #e5e7eb!important;color:#1f2937!important;-webkit-text-fill-color:#1f2937!important;vertical-align:top!important;">${inline(v.def)}</td>
</tr>`).join('\n');
  return `<div class="apcsa-block" style="margin:28px 0!important;">
  <h3 style="font-size:17px!important;font-weight:700!important;color:#1e1b4b!important;-webkit-text-fill-color:#1e1b4b!important;margin:0 0 10px!important;">Key Vocabulary</h3>
  <table style="width:100%!important;border-collapse:collapse!important;font-size:14px!important;">
    <thead><tr style="background:#1e1b4b!important;">
      <th style="padding:8px 12px!important;border:1px solid #334155!important;text-align:left!important;color:#fff!important;-webkit-text-fill-color:#fff!important;font-size:13px!important;width:28%!important;">Term</th>
      <th style="padding:8px 12px!important;border:1px solid #334155!important;text-align:left!important;color:#fff!important;-webkit-text-fill-color:#fff!important;font-size:13px!important;">Definition</th>
    </tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>
</div>`;
}

const LETTERS = ['A', 'B', 'C', 'D'];

function renderMcq(q, num) {
  const codeHtml = q.code
    ? `\n<pre style="margin:8px 0!important;background:#1e293b!important;color:#e2e8f0!important;padding:12px!important;border-radius:6px!important;font-size:13px!important;">${esc(q.code)}</pre>`
    : '';
  const gateHtml = q.predictGate ? `\n    <div class="apcs-predict-gate"><em>${inline(q.predictGate)}</em></div>` : '';
  const opts = q.options.map((opt, i) => `      <div class="apcs-opt" data-letter="${LETTERS[i]}">
<span class="apcs-opt-letter">${LETTERS[i]}</span> ${inline(opt)}</div>`).join('\n');
  return `  <div class="apcs-ex" data-type="mcq" data-answer="${LETTERS[q.correctIndex]}">
    <span class="apcs-ex-label">MCQ ${num}</span>
    <div class="apcs-ex-stem">${inline(q.stem)}${codeHtml}
</div>${gateHtml}
    <div class="apcs-ex-options">
${opts}
    </div>
    <button class="apcs-btn apcs-ex-check">Check Answer</button>
    <div class="apcs-ex-feedback">✓ <strong>${LETTERS[q.correctIndex]}.</strong> ${inline(q.feedback)}</div>
  </div>`;
}

const SCRIPT = `<script>
(function() {
  document.querySelectorAll('#apcsa-lesson .apcs-ex').forEach(function(ex) {
    if (ex.dataset.mcqInit) return;
    ex.dataset.mcqInit = '1';
    var correct = ex.getAttribute('data-answer');
    var opts = ex.querySelectorAll('.apcs-opt');
    var btn = ex.querySelector('.apcs-ex-check');
    var feedback = ex.querySelector('.apcs-ex-feedback');
    var chosen = null;
    opts.forEach(function(opt) {
      opt.style.cursor = 'pointer';
      opt.addEventListener('click', function() {
        if (ex.dataset.answered) return;
        opts.forEach(function(o) { o.classList.remove('selected'); });
        opt.classList.add('selected');
        chosen = opt.getAttribute('data-letter');
      });
    });
    if (btn) btn.addEventListener('click', function() {
      if (!chosen || ex.dataset.answered) return;
      ex.dataset.answered = '1';
      opts.forEach(function(opt) {
        var letter = opt.getAttribute('data-letter');
        if (letter === correct) opt.classList.add('correct');
        else if (letter === chosen) opt.classList.add('incorrect');
        opt.classList.remove('selected');
      });
      if (feedback) {
        feedback.classList.add('show');
        feedback.classList.add(chosen === correct ? 'fb-correct' : 'fb-incorrect');
      }
      btn.disabled = true;
    });
  });
})();
<\/script>`;

function jsonLd(lesson, publishedDate) {
  const article = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: `Lesson ${lesson.lesson}: ${lesson.title}`,
    description: lesson.metaDescription,
    url: `https://apcsexamprep.com/pages/${lesson.handle}`,
    datePublished: publishedDate, dateModified: publishedDate,
    author: { '@type': 'Person', name: 'Tanner Crow' },
    publisher: { '@type': 'Organization', name: 'APCSExamPrep.com' },
  };
  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'AP CSA', item: 'https://apcsexamprep.com/pages/ap-csa-exam-prep-hub' },
      { '@type': 'ListItem', position: 2, name: 'Unit 4', item: 'https://apcsexamprep.com/pages/ap-csa-unit-4-course' },
      { '@type': 'ListItem', position: 3, name: `Lesson ${lesson.lesson}: ${lesson.title}`, item: `https://apcsexamprep.com/pages/${lesson.handle}` },
    ],
  };
  return `<script type="application/ld+json">${JSON.stringify(article)}</script>\n`
    + `<script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>`;
}

// lesson: { lesson, unit, handle, title, metaDescription, minutes, tags,
//   learnObjectives, vocab, sections, practiceQuestions, masteryQuestions,
//   prevHandle, prevLabel, nextHandle, nextLabel }
function renderLessonPage(lesson, publishedDate) {
  const sectionsHtml = lesson.sections.map(renderSection).join('\n\n');
  const vocabHtml = renderVocab(lesson.vocab);
  const practiceHtml = lesson.practiceQuestions.map((q, i) => renderMcq(q, i + 1)).join('\n\n');
  const masteryHtml = lesson.masteryQuestions.map((q, i) => renderMcq(q, lesson.practiceQuestions.length + i + 1)).join('\n\n');
  const learnHtml = lesson.learnObjectives.map((o) => `    <li>${inline(o)}</li>`).join('\n');

  const body = `${CSS}
<div id="apcsa-lesson">

<nav class="apcsa-breadcrumb" aria-label="Breadcrumb">
  <a href="/pages/ap-csa-exam-prep-hub">AP CSA</a><span class="sep">›</span>
  <a href="/pages/ap-csa-course">Course</a><span class="sep">›</span>
  <a href="/pages/ap-csa-unit-4-course">Unit 4: Data Collections</a><span class="sep">›</span>
  <span>Lesson ${lesson.lesson}</span>
</nav>

<header class="apcsa-header">
  <span class="apcsa-eyebrow">Unit 4 &middot; Lesson ${lesson.lesson} &middot; ${esc(lesson.title)}</span>
  <h1>Lesson ${lesson.lesson}: ${esc(lesson.title)}</h1>
  <div class="apcsa-meta-row">
    <span>🕒 ${esc(lesson.minutes)}</span>
    <span>&middot;</span>
    <span>${lesson.practiceQuestions.length + lesson.masteryQuestions.length} Practice Questions</span>
    <span>&middot;</span>
    <span>${esc(lesson.tags)}</span>
  </div>
</header>

<div class="apcsa-learn-box">
  <h3>What You'll Learn</h3>
  <ul>
${learnHtml}
  </ul>
</div>

${vocabHtml}

${sectionsHtml}

<section class="apcsa-practice-tier">
<h2>Practice Questions</h2>

${practiceHtml}

</section>

<section class="apcsa-mastery">
  <span class="mastery-badge">Tier 3 &middot; AP Mastery</span>
  <h2>Mastery: ${esc(lesson.title)}</h2>

${masteryHtml}

</section>

<nav class="apcsa-lesson-nav">
  <a class="nav-prev" href="/pages/${lesson.prevHandle}">← ${esc(lesson.prevLabel)}</a>
  <a class="nav-next" href="/pages/${lesson.nextHandle}">${esc(lesson.nextLabel)} →</a>
</nav>

${SCRIPT}
${jsonLd(lesson, publishedDate)}`;

  return {
    handle: lesson.handle,
    title: `Lesson ${lesson.lesson}: ${esc0(lesson.title)}`,
    bodyHtml: body,
    seoTitle: `Lesson ${lesson.lesson}: ${lesson.title} | AP CSA`.slice(0, 70),
    seoDescription: lesson.metaDescription,
  };
}

// Plain-text title for the Shopify Title field (not HTML-escaped, Shopify
// stores this as plain text and escapes it itself on render).
function esc0(s) { return String(s == null ? '' : s); }

module.exports = { renderLessonPage, esc, inline };
