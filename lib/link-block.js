'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  RELATED-LINKS BLOCK - add internal links to a stored page body, safely.
//
//  Same posture as lib/csa-hub-links.js, and for the same reason: these are live
//  page bodies this repo is not the source of truth for. Nothing here is typed
//  against a live body. The body goes in, a generated block goes in at ONE
//  anchor, the result is checked against the input, and the caller writes a
//  Matrixify sheet. Every refusal is loud and returns the body UNCHANGED.
//
//  ── THE HOUSE PATTERN, MEASURED NOT INVENTED ────────────────────────────────
//  Read off ap-csa-2d-array-cheat-sheet, which is representative:
//
//    <style> ... #wrapper .related { } ... </style>
//    <script type="application/ld+json"> ... </script>
//    <div id="wrapper">
//      <div class="breadcrumb"> ... </div>
//      <div class="spoke-hero"> ... </div>
//      <div class="content"> ... </div>
//      <div class="cta-section"> ... </div>
//      <div class="related"><h3>Related Resources</h3><a ...>...</a></div>
//      <div class="nav-row"> ... </div>
//    </div>
//
//  So a `.related` block is ALREADY the site's convention. This module extends
//  the one that is there rather than adding a second, competing block, because
//  two "Related Resources" headings on one page is worse than none.
//
//  ── WHAT IS NEVER GUESSED ───────────────────────────────────────────────────
//  Whether a target page EXISTS. The caller passes the live handle set, and a
//  link to a handle outside it is dropped, never rendered. A chip pointing at a
//  404 is worse than no chip. This is the rule lib/csa-hub-links.js states and
//  it is the one that matters most here, because the whole point of this pass
//  is adding links.
//
//  ── THE STYLE PROBLEM, AND WHY IT IS NOT SOLVED WITH INLINE STYLES ──────────
//  Every page scopes its CSS to its own wrapper id and uses `all:initial` on it,
//  so an inserted block inherits NOTHING from the theme. A page that has no
//  `.related` rule would render the block as bare unstyled anchors.
//
//  Inline styles would dodge that and are the wrong answer: they cannot express
//  :hover or :last-child, and they put presentation in 1,300 page bodies where
//  no future pass can change it. Instead, when a page's stylesheet has no
//  `.related` rule, scoped rules are appended INTO that page's existing <style>
//  block, written against its own wrapper id. The page keeps one stylesheet and
//  house style survives.
// ─────────────────────────────────────────────────────────────────────────────

// Links per block. Six is what the house pattern uses and it is enough to reach
// a hub, two siblings, a unit guide and a practice page without turning the
// block into a sitemap. More links on a page divides the value of each.
const MAX_LINKS = 8;

// A body that grows by more than this is a bug in the generator, not a link
// block. The largest legitimate block is roughly 1.5 KB of anchors plus 900
// bytes of CSS.
const MAX_GROWTH_BYTES = 4096;

class Refusal extends Error {}
const refuse = (msg) => { throw new Refusal(msg); };

// ── READING THE BODY ─────────────────────────────────────────────────────────
function wrapperId(body) {
  // The outermost id'd div is the page wrapper every rule is scoped to.
  const m = body.match(/<div\s+id=["']([a-z0-9][a-z0-9_-]*)["']/i);
  return m ? m[1] : null;
}

function existingLinks(fragment) {
  const out = [];
  const re = /<a\b[^>]*href=["'](\/[^"'#?]*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(fragment))) {
    out.push({ href: m[1].replace(/\/+$/, ''), text: m[2].replace(/<[^>]*>/g, '').trim() });
  }
  return out;
}

// The whole <div class="related"> ... </div>, found by brace-matching on divs
// rather than a lazy regex, because the block can contain nested divs.
function findRelated(body) {
  const open = body.search(/<div\s+class=["'][^"']*\brelated\b[^"']*["'][^>]*>/i);
  if (open === -1) return null;
  const tagEnd = body.indexOf('>', open) + 1;
  let depth = 1;
  const re = /<div\b[^>]*>|<\/div>/gi;
  re.lastIndex = tagEnd;
  let m;
  while ((m = re.exec(body))) {
    if (m[0].toLowerCase() === '</div>') {
      depth -= 1;
      if (depth === 0) return { start: open, end: m.index + m[0].length, inner: body.slice(tagEnd, m.index) };
    } else depth += 1;
  }
  return null;
}

// ── ESCAPING ─────────────────────────────────────────────────────────────────
//  Anchor text comes from page titles, which contain ampersands and angle
//  brackets. The audit already recorded double-escaped entities live on this
//  site, so escape exactly once and never an already-escaped entity.
function esc(s) {
  return String(s)
    .replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]{1,8}|#\d{1,6}|#x[0-9a-fA-F]{1,6});)/g, '&amp;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── THE CSS, ONLY IF THE PAGE LACKS IT ───────────────────────────────────────
function relatedCss(id) {
  return `\n#${id} .related{background:#f9fafb!important;border:1px solid #e5e7eb!important;`
    + `border-radius:12px!important;padding:24px!important;margin:32px 0!important;}\n`
    + `#${id} .related h3{margin:0 0 14px!important;font-size:18px!important;font-weight:600!important;`
    + `color:#1f2937!important;-webkit-text-fill-color:#1f2937!important;}\n`
    + `#${id} .related a{display:block!important;color:#3b82f6!important;text-decoration:none!important;`
    + `padding:8px 0!important;border-bottom:1px solid #e5e7eb!important;font-size:15px!important;`
    + `-webkit-text-fill-color:#3b82f6!important;}\n`
    + `#${id} .related a:last-child{border-bottom:none!important;}\n`
    + `#${id} .related a:hover{text-decoration:underline!important;}\n`;
}

function hasRelatedCss(body, id) {
  return new RegExp(`#${id}\\s+\\.related\\b`).test(body);
}

// ── BUILD ────────────────────────────────────────────────────────────────────
//  links: [{ handle, label }]  targets are page handles, never full URLs, so a
//  caller cannot smuggle in an off-site link.
//  liveHandles: Set of handles that exist. A link outside it is DROPPED.
function build(body, links, liveHandles, opts = {}) {
  const heading = opts.heading || 'Related Resources';
  const max = opts.max || MAX_LINKS;
  if (typeof body !== 'string' || !body.trim()) refuse('empty body');
  if (!(liveHandles instanceof Set) || liveHandles.size === 0) {
    refuse('no live handle set was passed, so no link can be shown to exist');
  }

  const id = wrapperId(body);
  if (!id) refuse('no wrapper div with an id, so scoped CSS cannot be written');

  const block = findRelated(body);
  const already = block ? existingLinks(block.inner) : [];
  const have = new Set(already.map((l) => l.href));

  const dropped = [];
  const added = [];
  for (const l of links) {
    // The cap is reported, never silent. A caller that asked for ten links and
    // got six needs to know the other four were not rejected on their merits.
    if (added.length + already.length >= max) { dropped.push({ ...l, why: `capped at ${max}` }); continue; }
    if (!liveHandles.has(l.handle)) { dropped.push({ ...l, why: 'handle not in live set' }); continue; }
    const href = `/pages/${l.handle}`;
    if (have.has(href)) { dropped.push({ ...l, why: 'already linked' }); continue; }
    if (opts.selfHandle && l.handle === opts.selfHandle) { dropped.push({ ...l, why: 'self' }); continue; }
    have.add(href);
    added.push({ href, label: l.label });
  }
  if (!added.length) return { body, added: [], dropped, changed: false, id };

  const anchors = added.map((a) => `\n<a href="${a.href}">${esc(a.label)}</a>`).join('');

  let out;
  if (block) {
    // Extend in place: everything already there is preserved byte for byte and
    // the new anchors go at the end, after the last existing one.
    const inner = block.inner.replace(/\s*$/, '');
    out = body.slice(0, block.start)
      + body.slice(block.start, block.start + body.slice(block.start).indexOf('>') + 1)
      + inner + anchors + '\n</div>'
      + body.slice(block.end);
  } else {
    // Insert a whole block. One anchor only, chosen in this order: before the
    // nav-row if there is one (so prev/next stays last), else at the very end of
    // the wrapper.
    const fresh = `\n<div class="related">\n<h3>${esc(heading)}</h3>${anchors}\n</div>`;
    const navAt = body.search(/<div\s+class=["'][^"']*\bnav-row\b[^"']*["']/i);
    if (navAt !== -1) {
      out = body.slice(0, navAt) + fresh + '\n' + body.slice(navAt);
    } else {
      const lastClose = body.lastIndexOf('</div>');
      if (lastClose === -1) refuse('no closing div, so there is no wrapper to insert inside');
      out = body.slice(0, lastClose) + fresh + '\n' + body.slice(lastClose);
    }
    if (!hasRelatedCss(body, id)) {
      const styleEnd = out.lastIndexOf('</style>');
      if (styleEnd === -1) refuse('no <style> block, so scoped rules have nowhere to go');
      out = out.slice(0, styleEnd) + relatedCss(id) + out.slice(styleEnd);
    }
  }

  check(body, out, added.length);
  return { body: out, added, dropped, changed: true, id, hadBlock: !!block };
}

// ── THE CHECK ────────────────────────────────────────────────────────────────
//  Run against the INPUT, not against an expectation. Anything the generator
//  did that it cannot explain is a refusal.
function check(before, after, addedCount) {
  const div = (s) => ({
    open: (s.match(/<div\b[^>]*>/gi) || []).length,
    close: (s.match(/<\/div>/gi) || []).length,
  });
  const b = div(before);
  const a = div(after);
  if (a.open - a.close !== b.open - b.close) {
    refuse(`div balance changed: ${b.open}/${b.close} in, ${a.open}/${a.close} out`);
  }
  const grew = Buffer.byteLength(after) - Buffer.byteLength(before);
  if (grew <= 0) refuse('body did not grow, so nothing was added');
  if (grew > MAX_GROWTH_BYTES) refuse(`body grew ${grew} bytes, over the ${MAX_GROWTH_BYTES} cap`);
  const anchorsBefore = (before.match(/<a\b/gi) || []).length;
  const anchorsAfter = (after.match(/<a\b/gi) || []).length;
  if (anchorsAfter - anchorsBefore !== addedCount) {
    refuse(`anchor count moved by ${anchorsAfter - anchorsBefore}, expected ${addedCount}`);
  }
  // Nothing that was in the body may leave it.
  if (before.includes('<style>') && !after.includes('<style>')) refuse('style block lost');
  for (const marker of ['<div id=', '</div>']) {
    if (before.includes(marker) && !after.includes(marker)) refuse(`marker lost: ${marker}`);
  }
  // Two Related headings on one page is the failure this module exists to avoid.
  const headings = (after.match(/<div\s+class=["'][^"']*\brelated\b/gi) || []).length;
  if (headings > 1) refuse(`${headings} related blocks after the edit, expected 1`);
}

module.exports = {
  MAX_LINKS, MAX_GROWTH_BYTES, Refusal,
  wrapperId, findRelated, existingLinks, esc, relatedCss, hasRelatedCss, build, check,
};
