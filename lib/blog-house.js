'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  HOUSE COMPONENTS FOR THE WEEKLY COURSE BLOG.
//
//  WHY COMPONENTS RATHER THAN HAND-WRITTEN HTML
//  Four posts a week publish LIVE with no human between the draft and the
//  student. The thing that makes that safe is not care, it is structure: if a
//  statistic can only be expressed by calling stat(), then every statistic
//  carries a source and an as-of date by construction, and the validator can
//  refuse a post that smuggled one in as prose. Same for the H1, the FAQ
//  schema, and the internal links. Hand-written HTML would make each of those
//  a thing somebody has to remember at 6am.
//
//  THE H1 RULE
//  The Dawn article template DOES emit article.title, as
//  `<h1 class="article-template__title">`. It is written across several lines
//  in the Liquid output, which is exactly why a single-line grep for `<h1...>`
//  finds nothing and suggests the opposite. Measured properly on 2026-08-18
//  against a live rendered article.
//
//  So a post body must contain NO h1 of its own. There is no h1() helper here
//  on purpose: adding one back would reintroduce the duplicate-h1 defect the
//  board already tracks on /pages/. The post title in meta.title IS the h1, and
//  the validator checks the target keyword against it rather than against the
//  body.
//
//  Zero PII. No em-dashes, per repo convention, and the validator enforces it.
// ─────────────────────────────────────────────────────────────────────────────

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);

// Prose is authored with inline markup already in it (links, <strong>, <code>),
// so it is trusted and passed through. Only author-supplied VALUES that land in
// attributes or code blocks get escaped. The validator is what polices prose.
const raw = (s) => String(s == null ? '' : s);

const WRAP = 'apcs-post';

// One stylesheet, scoped under the wrapper so it cannot leak into the theme.
// Inlined rather than themed because articles are authored through the Admin
// API and never touch the theme repo, which is owned elsewhere.
function styleBlock() {
  return `<style>
.${WRAP}{--ink:#2d3748;--muted:#4a5568;--brand:#5a67d8;--line:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.7;color:var(--ink);max-width:820px;margin:0 auto;padding:8px 0 40px;font-size:19px}
.${WRAP} h1{font-size:2.1em;line-height:1.2;margin:0 0 12px;color:#1a202c;font-weight:750;letter-spacing:-.02em}
.${WRAP} h2{font-size:1.45em;line-height:1.25;margin:44px 0 14px;color:#1a202c;font-weight:700;padding-bottom:10px;border-bottom:2px solid var(--line);scroll-margin-top:80px}
.${WRAP} h3{font-size:1.13em;margin:28px 0 10px;color:#2d3748;font-weight:650}
.${WRAP} p{margin:0 0 18px}
.${WRAP} a{color:var(--brand);text-decoration:underline;text-underline-offset:2px}
.${WRAP} ul,.${WRAP} ol{margin:0 0 18px;padding-left:26px}
.${WRAP} li{margin-bottom:9px}
.${WRAP} code{background:#edf2f7;padding:2px 6px;border-radius:4px;font-family:Consolas,Monaco,'Courier New',monospace;font-size:.87em}
.${WRAP}-dek{font-size:1.1em;color:var(--muted);margin:0 0 22px;line-height:1.55}
.${WRAP}-byline{font-size:.8em;color:#718096;border-bottom:1px solid var(--line);padding-bottom:18px;margin-bottom:26px;text-transform:uppercase;letter-spacing:.4px}
.${WRAP}-toc{background:#f7fafc;border:1px solid var(--line);border-radius:10px;padding:20px 24px;margin:0 0 30px;font-size:.92em}
.${WRAP}-toc strong{display:block;margin-bottom:10px;text-transform:uppercase;font-size:.8em;letter-spacing:.6px;color:#718096}
.${WRAP}-toc ol{margin:0;padding-left:22px}
.${WRAP}-toc li{margin-bottom:5px}
.${WRAP}-box{border-radius:8px;padding:18px 22px;margin:24px 0;font-size:.96em}
.${WRAP}-box p:last-child{margin-bottom:0}
.${WRAP}-box .t{font-weight:700;margin-bottom:8px;display:block;font-size:.85em;text-transform:uppercase;letter-spacing:.5px}
.${WRAP}-tip{background:#ebf8ff;border-left:4px solid #4299e1}.${WRAP}-tip .t{color:#2c5282}
.${WRAP}-warn{background:#fff5f5;border-left:4px solid #f56565}.${WRAP}-warn .t{color:#c53030}
.${WRAP}-key{background:#f0fff4;border-left:4px solid #48bb78}.${WRAP}-key .t{color:#276749}
.${WRAP}-code{background:#2d3748;color:#e2e8f0;padding:18px 20px;border-radius:8px;margin:22px 0;overflow-x:auto;font-size:.8em;line-height:1.6}
.${WRAP}-code pre{margin:0;white-space:pre;font-family:Consolas,Monaco,'Courier New',monospace}
.${WRAP}-tbl{width:100%;border-collapse:collapse;margin:22px 0;font-size:.87em;display:block;overflow-x:auto}
.${WRAP}-tbl th{background:#edf2f7;padding:11px 13px;text-align:left;font-weight:650;border:1px solid var(--line)}
.${WRAP}-tbl td{padding:10px 13px;border:1px solid var(--line);vertical-align:top}
.${WRAP}-tbl tr:nth-child(even) td{background:#f7fafc}
.${WRAP}-stat{display:inline-block;background:#f7fafc;border:1px solid var(--line);border-left:4px solid var(--brand);border-radius:6px;padding:4px 10px;margin:0 2px;font-weight:650;white-space:nowrap}
.${WRAP}-src{font-size:.72em;color:#718096;font-weight:400;display:block;text-transform:none;letter-spacing:0}
.${WRAP}-mcq{border:1px solid var(--line);border-radius:10px;padding:22px;margin:22px 0;background:#fff}
.${WRAP}-mcq .qn{font-size:.78em;text-transform:uppercase;letter-spacing:.6px;color:var(--brand);font-weight:700;margin-bottom:10px}
.${WRAP}-mcq ol{margin:14px 0 0;padding-left:24px}
.${WRAP}-mcq details{margin-top:16px;border-top:1px dashed var(--line);padding-top:14px}
.${WRAP}-mcq summary{cursor:pointer;font-weight:650;color:var(--brand)}
.${WRAP}-mcq details[open] summary{margin-bottom:12px}
.${WRAP}-faq details{border-bottom:1px solid var(--line);padding:14px 0}
.${WRAP}-faq summary{cursor:pointer;font-weight:650;font-size:1.02em}
.${WRAP}-faq details[open] summary{margin-bottom:10px;color:var(--brand)}
.${WRAP}-cta{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:30px;border-radius:12px;margin:38px 0 0;text-align:center}
.${WRAP}-cta h3{color:#fff;margin:0 0 10px;font-size:1.3em}
.${WRAP}-cta p{margin-bottom:18px;font-size:.95em;opacity:.95}
.${WRAP}-cta a{display:inline-block;background:#fff;color:var(--brand);padding:12px 26px;border-radius:8px;font-weight:650;text-decoration:none;margin:6px}
.${WRAP}-cta a.alt{background:rgba(255,255,255,.16);color:#fff;border:2px solid rgba(255,255,255,.8)}
.${WRAP}-bio{display:flex;gap:16px;align-items:flex-start;background:#f7fafc;border-radius:10px;padding:22px;margin:34px 0 0;font-size:.88em;border:1px solid var(--line)}
.${WRAP}-bio .n{font-weight:700;color:#1a202c;font-size:1.05em}
.${WRAP}-updated{font-size:.8em;color:#718096;margin-top:26px;padding-top:16px;border-top:1px solid var(--line)}
@media(max-width:768px){.${WRAP}{font-size:17px;padding:4px 0 30px}.${WRAP} h1{font-size:1.72em}.${WRAP} h2{font-size:1.28em}.${WRAP}-bio{flex-direction:column;gap:10px}}
</style>`;
}

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

function dek(text) { return `<p class="${WRAP}-dek">${raw(text)}</p>`; }

// The byline is an E-E-A-T signal and a freshness signal in one. Both dates are
// real: published never moves, updated is stamped on every republish.
function byline({ author, role, published, updated, readingMinutes }) {
  const bits = [esc(author), esc(role), `Published ${esc(published)}`];
  if (updated && updated !== published) bits.push(`Updated ${esc(updated)}`);
  if (readingMinutes) bits.push(`${readingMinutes} min read`);
  return `<div class="${WRAP}-byline">${bits.join(' &nbsp;·&nbsp; ')}</div>`;
}

function h2(text, id) { return `<h2 id="${esc(id || slugify(text))}">${raw(text)}</h2>`; }
function h3(text) { return `<h3>${raw(text)}</h3>`; }
function p(text) { return `<p>${raw(text)}</p>`; }
function ul(items) { return `<ul>${items.map((i) => `<li>${raw(i)}</li>`).join('')}</ul>`; }
function ol(items) { return `<ol>${items.map((i) => `<li>${raw(i)}</li>`).join('')}</ol>`; }

// Built from the h2 calls so it can never drift out of sync with the headings.
function toc(sections) {
  const links = sections.map((s) => `<li><a href="#${esc(slugify(s))}">${raw(s)}</a></li>`).join('');
  return `<nav class="${WRAP}-toc"><strong>What this covers</strong><ol>${links}</ol></nav>`;
}

const BOXES = { tip: 'Strategy', warn: 'Common mistake', key: 'Key point' };
function box(kind, title, html) {
  const k = BOXES[kind] ? kind : 'tip';
  return `<div class="${WRAP}-box ${WRAP}-${k}"><span class="t">${esc(title || BOXES[k])}</span>${raw(html)}</div>`;
}

function code(text) { return `<div class="${WRAP}-code"><pre>${esc(text)}</pre></div>`; }

function table(headers, rows) {
  const head = headers.map((h) => `<th>${raw(h)}</th>`).join('');
  const body = rows.map((r) => `<tr>${r.map((c) => `<td>${raw(c)}</td>`).join('')}</tr>`).join('');
  return `<table class="${WRAP}-tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

// ── THE SOURCING RULE, MADE STRUCTURAL ───────────────────────────────────────
// Every number that a reader could act on goes through here. It renders the
// figure with its source and the date it was true, and it registers the claim
// on the post so the validator can compare the rendered prose against the
// declared list. A post that states a statistic in bare prose fails the gate.
function stat(value, { source, url, asOf }) {
  if (!source || !asOf) throw new Error(`stat(${value}) needs a source and an asOf date`);
  const cite = url ? `<a href="${esc(url)}" rel="nofollow">${esc(source)}</a>` : esc(source);
  return `<span class="${WRAP}-stat">${esc(value)}</span><span class="${WRAP}-src">${cite}, as of ${esc(asOf)}</span>`;
}

// A source line for a whole paragraph or table rather than a single figure.
function sourceNote(source, url, asOf) {
  const cite = url ? `<a href="${esc(url)}" rel="nofollow">${esc(source)}</a>` : esc(source);
  return `<p class="${WRAP}-src">Source: ${cite}${asOf ? `, as of ${esc(asOf)}` : ''}</p>`;
}

// Practice item. The answer is behind a details element so the page is useful
// to a student working it rather than a student scrolling it.
function mcq({ n, stem, codeText, options, correct, why }) {
  const idx = typeof correct === 'number' ? correct : options.indexOf(correct);
  if (idx < 0 || idx >= options.length) throw new Error(`mcq ${n}: correct answer is not one of the options`);
  const letter = 'ABCDEFGH'[idx];
  return `<div class="${WRAP}-mcq">`
    + `<div class="qn">Practice question ${esc(n)}</div>`
    + `<p>${raw(stem)}</p>`
    + (codeText ? code(codeText) : '')
    + `<ol type="A">${options.map((o) => `<li>${raw(o)}</li>`).join('')}</ol>`
    + `<details><summary>Show the answer and why</summary>`
    + `<p><strong>Answer: ${letter}.</strong> ${raw(why)}</p></details></div>`;
}

// FAQ renders twice: once for the reader, once as FAQPage JSON-LD. Both come
// from the same array, which is the only way they stay in agreement.
function faq(items) {
  const visible = items.map((i) =>
    `<details><summary>${raw(i.q)}</summary><p>${raw(i.a)}</p></details>`).join('');
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: stripTags(i.q),
      acceptedAnswer: { '@type': 'Answer', text: stripTags(i.a) },
    })),
  };
  return `<div class="${WRAP}-faq">${visible}</div>`
    + `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>`;
}

function stripTags(s) {
  return String(s).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function cta({ heading, body, links }) {
  const a = links.map((l) =>
    `<a href="${esc(l.href)}"${l.alt ? ' class="alt"' : ''}>${raw(l.text)}</a>`).join('');
  return `<div class="${WRAP}-cta"><h3>${raw(heading)}</h3><p>${raw(body)}</p>${a}</div>`;
}

function bio({ name, credential, html }) {
  return `<div class="${WRAP}-bio"><div><div class="n">${esc(name)}</div>`
    + `<div class="${WRAP}-src">${esc(credential)}</div><p style="margin:10px 0 0">${raw(html)}</p></div></div>`;
}

function updatedNote(text) { return `<p class="${WRAP}-updated">${raw(text)}</p>`; }

// Assembles the finished article body. Everything a post file returns is a
// string already; this only wraps and joins so the wrapper class and the
// stylesheet cannot be forgotten.
function article(blocks) {
  return `${styleBlock()}\n<div class="${WRAP}">\n${blocks.filter(Boolean).join('\n')}\n</div>`;
}

module.exports = {
  WRAP, esc, slugify, styleBlock, article,
  h2, h3, p, ul, ol, dek, byline, toc, box, code, table,
  stat, sourceNote, mcq, faq, cta, bio, updatedNote, stripTags,
};
