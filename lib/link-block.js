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

//  A HUB IS NOT A SPOKE, AND THE CAP SHOULD NOT PRETEND OTHERWISE.
//  Eight links is right for a lesson page: past that the block stops being a
//  recommendation and starts being a sitemap. It is wrong for a hub, whose job
//  is to list its spokes, and the site's own unit hubs already link twelve to
//  seventeen lessons each.
//
//  Measured cost of getting this wrong: with one cap of 8, the course-hub
//  fallback planned 75 links onto ap-cybersecurity-course and 36 onto
//  ap-csp-course, and everything past the eighth was silently dropped. That is
//  how ap-csp-ced-explained, 249 clicks and no internal links, went from
//  "planned" to "not in the sheet".
const MAX_LINKS_HUB = 24;

// A body that grows by more than this is a bug in the generator, not a link
// block. The largest legitimate block is roughly 1.5 KB of anchors plus 900
// bytes of CSS.
const MAX_GROWTH_BYTES = 4096;

// ── MARKERS ──────────────────────────────────────────────────────────────────
//  Everything this module inserts is fenced. Three things depend on it:
//
//    VERIFICATION  scripts/verify-link-sheet.js strips the fenced regions from
//                  a generated row and asserts what is left is the source body
//                  BYTE FOR BYTE. That is the check the generator cannot make
//                  about itself, and it is only possible because the insert is
//                  exactly delimited. Comparing any other way means guessing at
//                  what changed; a character-level subsequence test desynced on
//                  inserted CSS and reported six clean pages as damaged.
//    RE-RUNNING    a later pass finds its own block and replaces it, instead of
//                  appending a second one.
//    REVERSAL      the edit can be undone from the page itself.
//
//  HTML comments and CSS comments, so both survive Shopify and neither renders.
const MARK_OPEN = '<!-- apcs-related-links -->';
const MARK_CLOSE = '<!-- /apcs-related-links -->';
const CSS_OPEN = '/* apcs-related-links */';
const CSS_CLOSE = '/* /apcs-related-links */';

// Remove every fenced region. Given a body this module produced, returns the
// body it was produced FROM.
function unmark(body) {
  return String(body)
    .replace(new RegExp(`\\n?${MARK_OPEN}[\\s\\S]*?${MARK_CLOSE}\\n?`, 'g'), '')
    .replace(new RegExp(`\\n?\\${'/'}\\* apcs-related-links \\*\\${'/'}[\\s\\S]*?\\${'/'}\\* \\${'/'}apcs-related-links \\*\\${'/'}\\n?`, 'g'), '');
}

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
//  EXACT CLASS TOKENS, NOT SUBSTRINGS. /\brelated\b/ matches `related-card`,
//  because \b treats a hyphen as a word boundary. lib/site-crawl.js records the
//  same mistake costing seven false P0s when \bcheck-btn\b matched
//  `sp-check-btn`. Here it made the generator read a page's five
//  <div class="related-card"> tiles as its Related block and refuse the page.
//  Split the class attribute and compare whole tokens.
function hasClass(tag, name) {
  const m = tag.match(/\bclass=["']([^"']*)["']/i);
  return !!m && m[1].split(/\s+/).includes(name);
}

//  ── THE CONTAINERS, AND WHY THE ITEMS ARE NOT AMONG THEM ────────────────────
//  The site builds its related sections under four container class names, all
//  live and all doing the same job. A page carrying any of them already shows
//  the reader a "related" section, so the block is EXTENDED into it rather than
//  a second one being added below it, which would put two related sections on
//  one page.
//
//  related-link, related-card and related-ext are ITEMS inside those containers,
//  never containers themselves. Treating an item as the container would append
//  links inside a single card.
const CONTAINERS = ['related', 'related-links', 'related-grid', 'related-links-grid'];

function findRelated(body) {
  const openRe = /<div\b[^>]*>/gi;
  let open = -1;
  let m;
  while ((m = openRe.exec(body))) {
    if (CONTAINERS.some((c) => hasClass(m[0], c))) { open = m.index; break; }
  }
  if (open === -1) return null;
  const tagEnd = body.indexOf('>', open) + 1;
  let depth = 1;
  const scanRe = /<div\b[^>]*>|<\/div>/gi;
  scanRe.lastIndex = tagEnd;
  let s2;
  while ((s2 = scanRe.exec(body))) {
    if (s2[0].toLowerCase() === '</div>') {
      depth -= 1;
      if (depth === 0) return { start: open, end: s2.index + s2[0].length, inner: body.slice(tagEnd, s2.index) };
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
  return `\n${CSS_OPEN}\n#${id} .related{background:#f9fafb!important;border:1px solid #e5e7eb!important;`
    + `border-radius:12px!important;padding:24px!important;margin:32px 0!important;}\n`
    + `#${id} .related h3{margin:0 0 14px!important;font-size:18px!important;font-weight:600!important;`
    + `color:#1f2937!important;-webkit-text-fill-color:#1f2937!important;}\n`
    + `#${id} .related a{display:block!important;color:#3b82f6!important;text-decoration:none!important;`
    + `padding:8px 0!important;border-bottom:1px solid #e5e7eb!important;font-size:15px!important;`
    + `-webkit-text-fill-color:#3b82f6!important;}\n`
    + `#${id} .related a:last-child{border-bottom:none!important;}\n`
    + `#${id} .related a:hover{text-decoration:underline!important;}\n`
    + `${CSS_CLOSE}\n`;
}

function hasRelatedCss(body, id) {
  return new RegExp(`#${id}\\s+\\.related\\b`).test(body);
}

// ── BUILD ────────────────────────────────────────────────────────────────────
//  links: [{ handle, label }]  targets are page handles, never full URLs, so a
//  caller cannot smuggle in an off-site link.
//  liveHandles: Set of handles that exist. A link outside it is DROPPED.

// ─────────────────────────────────────────────────────────────────────────────
//  MARKUP THAT IS NOT MARKUP: <div> INSIDE A JAVASCRIPT STRING.
//
//  ── THE INCIDENT, 2026-09-04 ───────────────────────────────────────────────
//  cyber-command-center has no .related block and no nav-row, so insertion fell
//  through to `body.lastIndexOf('</div>')`. That last </div> is not markup. It
//  is inside a string literal in the page's own 51 KB script, which builds the
//  whole teacher Command Center UI:
//
//        +   '</div>'
//        + '</div>';        <- the fallback landed HERE
//
//  The block went in mid-literal, leaving an unterminated string, and the page
//  script died with "Invalid or unexpected token".
//
//  ── WHY NOTHING CAUGHT IT ──────────────────────────────────────────────────
//  Every existing assertion passed. Div balance held, because the inserted
//  block is balanced and the strings around it look like markup to a regex.
//  Byte growth was positive. The anchor count moved by exactly the number
//  added. The page even round-tripped through CSV byte for byte. The ONLY
//  check that fails is compiling the JavaScript, which nothing here did.
//
//  That is the same shape as every other defect in this repo's history: the
//  check that catches it is a DIFFERENT KIND from the ones already passing.
//
//  ── THE TWO FIXES ──────────────────────────────────────────────────────────
//  1. Never choose an insertion point inside a <script> or <style> element.
//     Their contents are not markup and a </div> found in them is a coincidence.
//  2. check() now compiles every script before and after. A script that
//     compiled going in and does not coming out is a refusal, whatever the
//     structural checks say.
//
//  Fix 1 alone would be a guess that the fallback is the only way in. Fix 2 is
//  the one that holds when a future change finds a new way to break a script.
function elementRanges(body) {
  const out = [];
  const re = /<(script|style)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(body))) out.push([m.index, m.index + m[0].length]);
  return out;
}

const insideAny = (ranges, at) => ranges.some(([a, b]) => at > a && at < b);

//  The last </div> that is really markup. Walks backwards past any that sit
//  inside a script or style body.
function lastMarkupClose(body, ranges) {
  let at = body.lastIndexOf('</div>');
  while (at !== -1 && insideAny(ranges, at)) at = body.lastIndexOf('</div>', at - 1);
  return at;
}

//  Compile every script element and report which ones parse. Returns an array of
//  booleans, positionally stable, so before and after can be compared directly.
//  A <script> with a non-JS type (application/ld+json, text/template) is not
//  JavaScript and is reported as null rather than as a failure.
function scriptHealth(body) {
  const vm = require('vm');
  const out = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(body))) {
    const attrs = m[1] || '';
    const type = /type\s*=\s*["']([^"']+)["']/i.exec(attrs);
    const t = type ? type[1].toLowerCase() : 'text/javascript';
    if (!/javascript|^module$|^$/.test(t) && t !== 'text/javascript') { out.push(null); continue; }
    try { new vm.Script(m[2]); out.push(true); } catch (e) { out.push(false); }
  }
  return out;
}

function build(body, links, liveHandles, opts = {}) {
  const heading = opts.heading || 'Related Resources';
  const max = opts.max || MAX_LINKS;
  if (typeof body !== 'string' || !body.trim()) refuse('empty body');
  if (!(liveHandles instanceof Set) || liveHandles.size === 0) {
    refuse('no live handle set was passed, so no link can be shown to exist');
  }

  //  IDEMPOTENT. If this module has run on the page before, its own additions
  //  come off first and the page is rebuilt from the body it started as. A
  //  second pass otherwise nests one marked region inside another and appends
  //  links after its own closing comment, which is how a re-run turns into a
  //  slow corruption nobody sees until the page renders twice as long.
  const original = body;
  if (body.includes(MARK_OPEN) || body.includes(CSS_OPEN)) body = unmark(body);
  const rerun = body !== original;

  //  A page wrapper id is a convenience, not a requirement. 160 of 1,251 pages
  //  have no single outer id: the FRQ solutions open with JSON-LD, the
  //  vocabulary list styles itself off :root. Refusing them left 13% of the site
  //  unlinkable for a reason that has nothing to do with linking.
  //
  //  So when there is no wrapper to scope to, the block brings its own: a div
  //  with an id derived from the page handle, wrapping the Related block, with
  //  the CSS scoped to it. Self-contained, structure-independent, and it cannot
  //  collide with the page's own rules.
  const pageId = wrapperId(body);
  const ownId = `apcs-links-${String(opts.selfHandle || 'page').replace(/[^a-z0-9-]/gi, '').slice(0, 60)}`;
  const id = pageId || ownId;
  const selfScoped = !pageId;

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
  if (!added.length) return { body: original, added: [], dropped, changed: false, id, rerun };

  const anchors = added.map((a) => `\n<a href="${a.href}">${esc(a.label)}</a>`).join('');

  let out;
  if (block) {
    // Extend in place. The existing inner is copied BYTE FOR BYTE, including its
    // trailing whitespace: stripping it made the edit non-additive and broke the
    // byte-exact verification for no gain.
    const closeAt = body.lastIndexOf('</div>', block.end);
    out = body.slice(0, closeAt)
      + `\n${MARK_OPEN}${anchors}\n${MARK_CLOSE}\n`
      + body.slice(closeAt);
  } else {
    // Insert a whole block. One anchor only, chosen in this order: before the
    // nav-row if there is one (so prev/next stays last), else at the very end of
    // the wrapper.
    const inner = `<div class="related">\n<h3>${esc(heading)}</h3>${anchors}\n</div>`;
    const fresh = selfScoped
      ? `\n${MARK_OPEN}\n<div id="${id}">\n${inner}\n</div>\n${MARK_CLOSE}`
      : `\n${MARK_OPEN}\n${inner}\n${MARK_CLOSE}`;
    const ranges = elementRanges(body);
    let navAt = body.search(/<div\s+class=["'][^"']*\bnav-row\b[^"']*["']/i);
    if (navAt !== -1 && insideAny(ranges, navAt)) navAt = -1;
    //  Script- and style-aware: a </div> inside either is text, not markup.
    const lastClose = lastMarkupClose(body, ranges);
    if (navAt !== -1) {
      // Before the prev/next row, so that row stays last.
      out = body.slice(0, navAt) + fresh + '\n' + body.slice(navAt);
    } else if (!selfScoped && lastClose !== -1) {
      // Inside the page's own wrapper, just before it closes.
      out = body.slice(0, lastClose) + fresh + '\n' + body.slice(lastClose);
    } else {
      // Self-scoped: the block carries its own wrapper, so it does not need to
      // sit inside anything. A page with no divs at all (JSON-LD then prose)
      // takes it at the end, which is where a Related block belongs anyway.
      out = body.replace(/\s*$/, '') + fresh;
    }
    if (!hasRelatedCss(body, id)) {
      const styleEnd = out.lastIndexOf('</style>');
      if (styleEnd !== -1) {
        out = out.slice(0, styleEnd) + relatedCss(id) + out.slice(styleEnd);
      } else {
        // No stylesheet to extend. Carry one, inside the fence so it still
        // reverses cleanly.
        out = out.replace(MARK_OPEN, `${MARK_OPEN}\n<style>${relatedCss(id)}</style>`);
      }
    }
  }

  check(body, out, added.length, !!block);
  return { body: out, added, dropped, changed: true, id, hadBlock: !!block, rerun };
}

// ── THE CHECK ────────────────────────────────────────────────────────────────
//  Run against the INPUT, not against an expectation. Anything the generator
//  did that it cannot explain is a refusal.
function check(before, after, addedCount, extending) {
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
  //  A SCRIPT THAT COMPILED GOING IN MUST COMPILE COMING OUT.
  //  This is the check that catches an insertion landing inside a JavaScript
  //  string literal, which every structural assertion above reports as fine.
  //  Only scripts that were healthy before are judged: a page that shipped with
  //  a broken script is not this module's to fix, and failing on it would block
  //  every edit to that page forever.
  const hBefore = scriptHealth(before);
  const hAfter = scriptHealth(after);
  if (hBefore.length === hAfter.length) {
    for (let i = 0; i < hBefore.length; i += 1) {
      if (hBefore[i] === true && hAfter[i] === false) {
        refuse(`script block ${i + 1} compiled before this edit and does not after it.`
          + ' The insertion point was almost certainly inside a JavaScript string.');
      }
    }
  } else {
    refuse(`script element count changed: ${hBefore.length} in, ${hAfter.length} out`);
  }

  // Nothing that was in the body may leave it.
  if (before.includes('<style>') && !after.includes('<style>')) refuse('style block lost');
  for (const marker of ['<div id=', '</div>']) {
    if (before.includes(marker) && !after.includes(marker)) refuse(`marker lost: ${marker}`);
  }
  //  Two related SECTIONS on one page is the failure this module exists to
  //  avoid. Counting containers absolutely cannot detect that, because the site
  //  nests them: 35 CSP lesson pages wrap a related-links-grid inside a
  //  related-links, which is ONE section built from two containers, and an
  //  absolute count refused every one of them.
  //
  //  What matters is whether this edit ADDED a section. Extending an existing
  //  one must leave the count alone; creating one must raise it by exactly one.
  //  That holds however deeply the page nests its own markup.
  const containers = (t) => (t.match(/<div\b[^>]*>/gi) || [])
    .filter((tag) => CONTAINERS.some((c) => hasClass(tag, c))).length;
  const delta = containers(after) - containers(before);
  const want = extending ? 0 : 1;
  if (delta !== want) {
    refuse(`related containers moved by ${delta}, expected ${want} when ${extending ? 'extending' : 'creating'}`);
  }
}

module.exports = {
  hasClass, CONTAINERS,
  MAX_LINKS, MAX_LINKS_HUB, MAX_GROWTH_BYTES, Refusal,
  MARK_OPEN, MARK_CLOSE, CSS_OPEN, CSS_CLOSE, unmark,
  wrapperId, findRelated, existingLinks, esc, relatedCss, hasRelatedCss, build, check,
  scriptHealth, elementRanges, lastMarkupClose, insideAny,
};
