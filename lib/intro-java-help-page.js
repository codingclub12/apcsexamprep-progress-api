'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  INTRO TO JAVA HELP PAGE RENDERER.
//
//  Renders the getting-unstuck catalog in seed/intro-java-help.js: compiler
//  errors, runtime errors, the Greenfoot "it compiled and is still wrong" pages,
//  and how-to recipes.
//
//  ── THESE PAGES ARE THE SEO SURFACE ─────────────────────────────────────────
//  A lesson page is found by someone already taking the course. An error page is
//  found by someone typing their error message into a search box at 11pm, and
//  that is a much larger audience who do not know this site exists yet.
//
//  So the error message is rendered VERBATIM, in a code block, near the top,
//  because that is the exact string being searched for. The FAQ block carries
//  the same question in the phrasings people actually type. Both are structured
//  data as well as visible text, which is what makes a rich result possible.
//
//  ── AND THEY ARE DELIBERATELY NOT PROGRESS ──────────────────────────────────
//  No manifest row, no data-item-id, and pageFromHandle does not match their
//  handles. A student reaching for help must never be the student whose
//  dashboard looks busiest, and a teacher must never see "opened 9 error pages"
//  rendered as achievement. The rendered page carries no tracking attributes at
//  all, and the smoke test checks for their absence.
//
//  Theme constraints obeyed here are the same ones lib/intro-java-page.js
//  documents: one scoped wrapper id, entities outside script blocks and never
//  inside them, no emojis, pure ASCII.
//
//  Zero PII. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

const { esc, escAttr, SITE, COURSE_URL } = require('./intro-java-page');

const WRAP = 'ij-help';

function jsonForScript(value) {
  return JSON.stringify(value)
    .split('<').join('\\u003c')
    .split('>').join('\\u003e')
    .split('&').join('\\u0026');
}

function paras(text) {
  return String(text || '').split('\n\n').map((t) => t.trim()).filter(Boolean)
    .map((t) => `<p>${esc(t)}</p>`).join('\n');
}

function renderCss() {
  return `<style>
#${WRAP} { all: initial !important; display: block !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
  color: #16202b !important; line-height: 1.65 !important; max-width: 780px !important;
  margin: 0 auto !important; padding: 8px 16px 64px !important; }
#${WRAP} * { box-sizing: border-box !important; }
#${WRAP} h1 { font-size: 31px !important; line-height: 1.18 !important; margin: 0 0 10px !important;
  color: #10306b !important; -webkit-text-fill-color: #10306b !important; font-weight: 700 !important; }
#${WRAP} h2 { font-size: 21px !important; margin: 34px 0 10px !important; color: #10306b !important;
  -webkit-text-fill-color: #10306b !important; font-weight: 700 !important; }
#${WRAP} p, #${WRAP} li { font-size: 17px !important; color: #16202b !important;
  -webkit-text-fill-color: #16202b !important; }
#${WRAP} a { color: #0b5cd5 !important; -webkit-text-fill-color: #0b5cd5 !important; }
#${WRAP} .ij-kind { font-family: Menlo, Consolas, monospace !important; font-size: 11px !important;
  letter-spacing: 0.1em !important; text-transform: uppercase !important; color: #5a6672 !important;
  -webkit-text-fill-color: #5a6672 !important; margin: 0 0 8px !important; }
#${WRAP} .ij-msg { background: #2b1416 !important; color: #ffd9d4 !important;
  -webkit-text-fill-color: #ffd9d4 !important; padding: 13px 16px !important;
  border-radius: 6px !important; font-family: Menlo, Consolas, monospace !important;
  font-size: 15px !important; overflow-x: auto !important; border-left: 4px solid #d1483a !important; }
#${WRAP} .ij-code { background: #10202f !important; color: #e8f0f7 !important;
  -webkit-text-fill-color: #e8f0f7 !important; padding: 14px 16px !important;
  border-radius: 6px !important; overflow-x: auto !important;
  font-family: Menlo, Consolas, monospace !important; font-size: 14.5px !important;
  line-height: 1.55 !important; }
#${WRAP} .ij-code code { background: none !important; color: inherit !important;
  -webkit-text-fill-color: inherit !important; font-family: inherit !important; }
#${WRAP} ol.ij-causes { padding-left: 0 !important; list-style: none !important;
  counter-reset: c !important; }
#${WRAP} ol.ij-causes li { counter-increment: c !important; position: relative !important;
  padding: 11px 0 11px 44px !important; border-bottom: 1px solid #e7edef !important; }
#${WRAP} ol.ij-causes li:last-child { border-bottom: 0 !important; }
#${WRAP} ol.ij-causes li::before { content: counter(c) !important; position: absolute !important;
  left: 0 !important; top: 12px !important; width: 26px !important; height: 26px !important;
  display: grid !important; place-items: center !important;
  font-family: Menlo, Consolas, monospace !important; font-size: 12px !important;
  background: #e4ecfb !important; color: #10306b !important;
  -webkit-text-fill-color: #10306b !important; border-radius: 3px !important; }
#${WRAP} .ij-ranked { font-size: 14px !important; color: #5a6672 !important;
  -webkit-text-fill-color: #5a6672 !important; }
#${WRAP} .ij-fix { background: #eef7f1 !important; border: 1px solid #c6e3d3 !important;
  border-radius: 6px !important; padding: 4px 18px 14px !important; }
#${WRAP} .ij-more { border-top: 1px solid #e0e6ec !important; margin-top: 40px !important;
  padding-top: 16px !important; }
#${WRAP} .ij-more ul { padding-left: 20px !important; }
#${WRAP} a:focus-visible { outline: 3px solid #ffb020 !important; outline-offset: 2px !important; }
</style>`;
}

const KIND_LABEL = {
  error: 'Error reference',
  gotcha: 'It compiled and it is still wrong',
  recipe: 'How-to recipe',
};

function kindOf(entry) {
  if (entry.code.startsWith('E-')) return 'error';
  if (entry.code.startsWith('G-')) return 'gotcha';
  return 'recipe';
}

function renderJsonLd(entry, kind) {
  const url = `${SITE}/pages/${entry.handle}`;
  const article = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: entry.title,
    description: entry.seo.description,
    url,
    inLanguage: 'en',
    proficiencyLevel: 'Beginner',
    about: { '@type': 'Thing', name: 'Java programming with Greenfoot' },
    publisher: { '@type': 'Organization', name: 'APCSExamPrep', url: SITE },
  };

  // The FAQ is built from what the page actually answers. For an error page the
  // first question is the one people literally type: the message itself.
  const qa = [];
  if (entry.message) {
    qa.push({
      q: `What does "${entry.message}" mean in Java?`,
      a: entry.means,
    });
  }
  if (entry.means && !entry.message) {
    qa.push({ q: `Why is this happening in Greenfoot?`, a: entry.means });
  }
  if (entry.causes && entry.causes.length) {
    qa.push({
      q: `What usually causes ${entry.title.replace(/^Java error: /, '')}?`,
      a: `Most often: ${entry.causes[0]} Other common causes are listed on the page, ranked by how `
        + 'often they turn out to be the answer.',
    });
  }
  if (entry.fix) qa.push({ q: 'How do I fix it?', a: entry.fix });
  if (entry.snippet) {
    qa.push({
      q: `How do I ${entry.title.replace(/^How to /, '').replace(/^How /, '')}?`,
      a: entry.seo.description,
    });
  }

  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Intro to Java with Greenfoot', item: COURSE_URL },
      // No middle crumb. This used to name the help category and link to
      // /pages/intro-java-help, an index page that was never built, so all 41
      // help pages carried structured data pointing at a 404. Help pages are
      // reached from the unit hubs and from the lesson that needs them, so the
      // honest breadcrumb is two levels. Add the crumb back only alongside a
      // real index page.
      { '@type': 'ListItem', position: 2, name: entry.title, item: url },
    ],
  };

  const graphs = [article, crumbs];
  if (qa.length) {
    graphs.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: qa.map((x) => ({
        '@type': 'Question',
        name: x.q,
        acceptedAnswer: { '@type': 'Answer', text: x.a },
      })),
    });
  }
  return graphs.map((g) => `<script type="application/ld+json">${jsonForScript(g)}</script>`).join('\n');
}

/**
 * Render one help page.
 * @param {object} entry an entry from seed/intro-java-help.js
 * @param {object} opts  { related: [entry], lessonHandle: string|null }
 */
function renderHelp(entry, opts) {
  const o = opts || {};
  const kind = kindOf(entry);

  const message = entry.message
    ? `<h2>The message</h2>\n<pre class="ij-msg"><code>${esc(entry.message)}</code></pre>`
    : '';

  const means = entry.means
    ? `<h2>What it actually means</h2>\n${paras(entry.means)}`
    : '';

  const causes = entry.causes && entry.causes.length
    ? `<h2>The usual causes</h2>
<p class="ij-ranked">Ranked by how often each one turns out to be the answer. Work down the list.</p>
<ol class="ij-causes">
${entry.causes.map((c) => `<li>${esc(c)}</li>`).join('\n')}
</ol>`
    : '';

  const fix = entry.fix
    ? `<div class="ij-fix">\n<h2>How to fix it</h2>\n${paras(entry.fix)}\n</div>`
    : '';

  const snippet = entry.snippet
    ? `<h2>The code</h2>\n<pre class="ij-code"><code>${esc(entry.snippet)}</code></pre>`
    : '';

  const backToLesson = o.lessonHandle
    ? `<p><a href="${escAttr(`${SITE}/pages/${o.lessonHandle}`)}">Back to lesson ${esc(entry.after)}</a></p>`
    : '';

  const related = (o.related || []).length
    ? `<div class="ij-more">
<h2>Related help</h2>
<ul>
${o.related.map((r) => `<li><a href="${escAttr(`${SITE}/pages/${r.handle}`)}">${esc(r.title)}</a></li>`).join('\n')}
</ul>
${backToLesson}
</div>`
    : (backToLesson ? `<div class="ij-more">${backToLesson}</div>` : '');

  const body = [
    `<div id="${WRAP}" data-help-code="${escAttr(entry.code)}">`,
    renderCss(),
    `<p class="ij-kind">${esc(KIND_LABEL[kind])}</p>`,
    `<h1>${esc(entry.title)}</h1>`,
    `<p>This page is part of <a href="${escAttr(COURSE_URL)}">Intro to Java with `
      + `Greenfoot</a>. It assumes you have reached lesson ${esc(entry.after)}. Opening it is not `
      + 'counted against you and is not tracked as progress.</p>',
    message,
    means,
    causes,
    fix,
    snippet,
    related,
    renderJsonLd(entry, kind),
    '</div>',
  ].filter(Boolean).join('\n');

  return {
    handle: entry.handle,
    code: entry.code,
    kind,
    title: entry.title,
    seoTitle: entry.title.length <= 60 ? entry.title : entry.title.slice(0, 57) + '...',
    seoDescription: entry.seo.description,
    bodyHtml: body,
  };
}

module.exports = { renderHelp, kindOf, KIND_LABEL, WRAP };
