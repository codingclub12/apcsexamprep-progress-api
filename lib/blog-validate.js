'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  THE QUALITY GATE FOR AUTO-PUBLISHED POSTS.
//
//  These posts go live without a human in between. That decision is defensible
//  only if the things a human would have caught are checked mechanically, so
//  this file is deliberately the strictest thing in the content pipeline. A
//  post that fails ANY check is not published, and the whole week's batch is
//  refused rather than published half-good: a broken post that is live is worse
//  than a post that is late, because the live one is the one Google indexes and
//  a teacher forwards to a class.
//
//  THE CHECK THAT MATTERS MOST IS THE STATISTIC GUARD.
//  Everything else here is hygiene that a careful writer would get right
//  anyway. The statistic guard is different: it catches the one failure mode
//  that is both likely and expensive, which is a confident wrong number about
//  a College Board exam on a site whose entire value is being right about
//  College Board exams. Numbers may only reach a reader through stat() or
//  sourceNote(), which force a source and an as-of date, or through an explicit
//  allowlist entry in the post's meta. Prose that states a bare percentage
//  fails, even if the number happens to be correct.
//
//  No em-dashes and no 10-unit CSA references are repo conventions from
//  CLAUDE.md, enforced here so a post cannot quietly reintroduce either.
// ─────────────────────────────────────────────────────────────────────────────

const { WRAP, stripTags } = require('./blog-house');

const LIMITS = {
  seoTitleMin: 30, seoTitleMax: 62,
  seoDescMin: 110, seoDescMax: 158,
  titleMax: 100,
  handleMax: 70,
  wordsMin: 1500,
  h2Min: 4,
  internalLinksMin: 3,
  faqMin: 3,
};

// Where an internal link is allowed to point. A typo'd internal link is a dead
// end for a student and a wasted crawl for Google, and the shapes this site
// actually uses are few enough to list.
const INTERNAL_PREFIXES = ['/pages/', '/blogs/', '/products/', '/collections/', '/'];

// Each course publishes into its OWN blog, not into a shared one. The mapping
// lives here rather than in each post so a post cannot be filed in the wrong
// place by a typo, and so moving a course to a different blog is a one line
// change rather than a sweep through content/blog.
//
// Note what is NOT in this map: ap-csa-daily-practice and ap-csp-daily-practice.
// Those hold the daily drip questions, which are a different genre on a
// different cadence. Filing weekly guides in with 429 practice items would bury
// them, so the guide blogs are separate by design.
const COURSE_BLOGS = {
  'ap-csa': 'ap-csa',
  'ap-csp': 'ap-csp',
  'ap-cybersecurity': 'ap-cybersecurity',
  'ap-networking': 'ap-networking',
};

const COURSES = Object.keys(COURSE_BLOGS);

// CLAUDE.md: AP CSA references use the 2025-2026 4-unit structure exclusively.
// The old curriculum had ten units, so any CSA unit number above four, in any
// of the shapes this repo has seen it written, is the old curriculum leaking.
const CSA_LEGACY = [
  /\bunit\s*(?:[5-9]|10)\b/i,
  /\bap-csa-lesson-(?:[5-9]|10)[-.]/i,
  /\b(?:[5-9]|10)\.\d+\s*(?:inheritance|polymorphism|recursion|2d\s*array)/i,
];

// Numbers a reader could act on. Years, times, question counts written as
// words, and anything inside a sourced element are handled separately.
const RISKY_NUMBER = /\b\d[\d,]*(?:\.\d+)?\s*(?:%|percent|million|billion|thousand|x\b)/gi;

function words(html) {
  return stripTags(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' '))
    .split(/\s+/).filter(Boolean).length;
}

// Remove every region where a number is legitimately allowed, so what is left
// is prose making an unsourced factual claim.
function prosePartOnly(body) {
  return body
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    // sourced figures and their citation lines
    .replace(new RegExp(`<span class="${WRAP}-stat">[\\s\\S]*?</span>`, 'gi'), ' ')
    .replace(new RegExp(`<span class="${WRAP}-src">[\\s\\S]*?</span>`, 'gi'), ' ')
    .replace(new RegExp(`<p class="${WRAP}-src">[\\s\\S]*?</p>`, 'gi'), ' ')
    // code samples and worked practice items reason about numbers by design
    .replace(new RegExp(`<div class="${WRAP}-code">[\\s\\S]*?</div>`, 'gi'), ' ')
    .replace(new RegExp(`<div class="${WRAP}-mcq">[\\s\\S]*?</details></div>`, 'gi'), ' ')
    .replace(/<table[\s\S]*?<\/table>/gi, ' ');
}

function validatePost(post, seenHandles) {
  const problems = [];
  const m = post.meta || {};
  const body = post.body || '';
  const bad = (s) => problems.push(s);

  // ── metadata ───────────────────────────────────────────────────────────────
  for (const f of ['title', 'handle', 'blogHandle', 'seoTitle', 'seoDescription', 'course', 'targetKeyword', 'publishOn', 'summary']) {
    if (!m[f] || !String(m[f]).trim()) bad(`meta.${f} is missing`);
  }
  if (!Array.isArray(m.tags) || m.tags.length < 3) bad('meta.tags needs at least 3 tags');
  if (m.course && !COURSES.includes(m.course)) bad(`meta.course "${m.course}" is not one of ${COURSES.join(', ')}`);
  if (m.course && COURSE_BLOGS[m.course] && m.blogHandle !== COURSE_BLOGS[m.course]) {
    bad(`meta.blogHandle is "${m.blogHandle}" but course ${m.course} publishes into "${COURSE_BLOGS[m.course]}"`);
  }
  if (m.title && m.title.length > LIMITS.titleMax) bad(`title is ${m.title.length} chars, max ${LIMITS.titleMax}`);

  if (m.handle) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(m.handle)) bad(`handle "${m.handle}" must be lowercase kebab-case`);
    if (m.handle.length > LIMITS.handleMax) bad(`handle is ${m.handle.length} chars, max ${LIMITS.handleMax}`);
    if (seenHandles && seenHandles.has(m.handle)) bad(`handle "${m.handle}" is used by more than one post in this batch`);
    if (seenHandles) seenHandles.add(m.handle);
  }

  if (m.seoTitle) {
    const n = m.seoTitle.length;
    if (n < LIMITS.seoTitleMin || n > LIMITS.seoTitleMax) {
      bad(`seoTitle is ${n} chars, want ${LIMITS.seoTitleMin}-${LIMITS.seoTitleMax} so it does not truncate in the SERP`);
    }
  }
  if (m.seoDescription) {
    const n = m.seoDescription.length;
    if (n < LIMITS.seoDescMin || n > LIMITS.seoDescMax) {
      bad(`seoDescription is ${n} chars, want ${LIMITS.seoDescMin}-${LIMITS.seoDescMax}`);
    }
  }
  if (m.publishOn && !/^\d{4}-\d{2}-\d{2}$/.test(m.publishOn)) bad('meta.publishOn must be YYYY-MM-DD');

  // ── structure ──────────────────────────────────────────────────────────────
  // The theme renders article.title as the page h1 already, so an h1 in the
  // body is a SECOND one. That is the duplicate-h1 defect the board tracks on
  // /pages/, and it is easy to reintroduce because the theme's h1 is emitted
  // across several lines and does not show up in a naive grep.
  const h1s = body.match(/<h1[\s>]/gi) || [];
  if (h1s.length !== 0) {
    bad(`body has ${h1s.length} h1 tag(s), needs 0: the theme already renders meta.title as the page h1`);
  }
  const h2s = body.match(/<h2[\s>]/gi) || [];
  if (h2s.length < LIMITS.h2Min) bad(`body has ${h2s.length} h2 sections, want at least ${LIMITS.h2Min}`);

  const wc = words(body);
  if (wc < LIMITS.wordsMin) bad(`body is ${wc} words, want at least ${LIMITS.wordsMin}`);

  if (!body.includes(`${WRAP}-cta`)) bad('no call to action block');
  if (!body.includes(`${WRAP}-bio`)) bad('no author bio block, which is the E-E-A-T signal');

  // ── keyword placement ──────────────────────────────────────────────────────
  if (m.targetKeyword) {
    const kw = m.targetKeyword.toLowerCase();
    // meta.title is what the theme renders as the h1, so that is where the
    // keyword has to be.
    const h1Text = String(m.title || '').toLowerCase();
    const plain = stripTags(prosePartOnly(body)).toLowerCase();
    const opening = plain.slice(0, 900);
    if (!h1Text.includes(kw)) bad(`target keyword "${m.targetKeyword}" is not in meta.title, which the theme renders as the h1`);
    if (!(m.seoTitle || '').toLowerCase().includes(kw)) bad(`target keyword "${m.targetKeyword}" is not in the seoTitle`);
    if (!opening.includes(kw)) bad(`target keyword "${m.targetKeyword}" is not in the opening ~150 words`);
    const inH2 = (body.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || []).some((h) => h.toLowerCase().includes(kw));
    if (!inH2) bad(`target keyword "${m.targetKeyword}" does not appear in any h2`);
  }

  // ── links ──────────────────────────────────────────────────────────────────
  const hrefs = [...body.matchAll(/href="([^"]+)"/gi)].map((x) => x[1]);
  const internal = hrefs.filter((h) => h.startsWith('/'));
  const external = hrefs.filter((h) => /^https?:\/\//i.test(h));
  if (internal.length < LIMITS.internalLinksMin) {
    bad(`only ${internal.length} internal links, want at least ${LIMITS.internalLinksMin}`);
  }
  for (const h of internal) {
    if (!INTERNAL_PREFIXES.some((p) => h.startsWith(p))) bad(`internal link "${h}" is not a recognised site path`);
    if (/\s/.test(h)) bad(`internal link "${h}" contains whitespace`);
  }
  for (const h of external) {
    if (h.includes('apcsexamprep.com')) bad(`link "${h}" points at our own domain absolutely, use a site-relative path`);
  }

  // ── schema ─────────────────────────────────────────────────────────────────
  const ld = [...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map((x) => x[1]);
  if (!ld.length) bad('no JSON-LD block, so no FAQ rich result is possible');
  for (const block of ld) {
    let parsed;
    try { parsed = JSON.parse(block); } catch (e) { bad(`JSON-LD does not parse: ${e.message}`); continue; }
    if (parsed['@type'] === 'FAQPage') {
      const n = (parsed.mainEntity || []).length;
      if (n < LIMITS.faqMin) bad(`FAQPage has ${n} questions, want at least ${LIMITS.faqMin}`);
      for (const q of parsed.mainEntity || []) {
        if (!q.name || !q.name.trim()) bad('an FAQ question is empty');
        if (!((q.acceptedAnswer || {}).text || '').trim()) bad(`FAQ answer for "${q.name}" is empty`);
      }
    }
  }

  // ── repo conventions ───────────────────────────────────────────────────────
  const everything = [m.title, m.seoTitle, m.seoDescription, m.summary, body].join(' ');
  if (everything.includes('—') || everything.includes('–')) {
    bad('contains an em-dash or en-dash, which this repo does not use');
  }
  if (m.course === 'ap-csa') {
    for (const re of CSA_LEGACY) {
      const hit = prosePartOnly(body).match(re);
      if (hit) bad(`looks like the retired 10-unit CSA curriculum: "${hit[0]}"`);
    }
  }

  // ── zero PII posture ───────────────────────────────────────────────────────
  const emails = stripTags(body).match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
  for (const e of emails) bad(`body contains what looks like an email address: ${e}`);

  // ── the statistic guard ────────────────────────────────────────────────────
  const allowed = (m.allowedInlineNumbers || []).map((s) => String(s).toLowerCase());
  const prose = stripTags(prosePartOnly(body));
  const found = prose.match(RISKY_NUMBER) || [];
  for (const hit of found) {
    const norm = hit.toLowerCase().replace(/\s+/g, ' ').trim();
    if (allowed.some((a) => norm.includes(a) || a.includes(norm))) continue;
    bad(`unsourced figure in prose: "${hit.trim()}". Render it with stat() or sourceNote(), `
      + 'or add it to meta.allowedInlineNumbers if it is not a factual claim.');
  }

  return problems;
}

function validateBatch(posts) {
  const seen = new Set();
  const out = [];
  for (const post of posts) {
    for (const problem of validatePost(post, seen)) {
      out.push(`${(post.meta && post.meta.handle) || '(no handle)'}: ${problem}`);
    }
  }
  return out;
}

module.exports = { validatePost, validateBatch, LIMITS, words, COURSE_BLOGS, COURSES };
