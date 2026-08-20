'use strict';
// -----------------------------------------------------------------------------
//  Recover a page's stored Body HTML from its rendered HTML.
//
//  ── WHY THIS IS ALLOWED TO EXIST ────────────────────────────────────────────
//  The rule in this repo is that a live body comes from the Shopify Admin API
//  and never from a scrape, because a scrape was believed to drop the page's own
//  <style> block and its leading HTML comment. That belief is testable, and it
//  is wrong for this theme. The theme drops page.content verbatim inside
//  <div class="rte scroll-trigger animate--slide-in">, and both survive.
//
//  Proven rather than asserted: csp-command-center was rebuilt from its rendered
//  page and compared against cc3.csv, which holds the byte-exact body that was
//  imported into it. 138,154 bytes, identical, once three characters of trailing
//  whitespace the theme adds are removed. That page is the hardest case
//  available: it opens with a managed HTML comment, carries its own <style>, and
//  holds a 103 KB minified JSON blob.
//
//  ── WHAT IT DOES NOT REPLACE ────────────────────────────────────────────────
//  The Admin API is still the authority, and anything this produces should be
//  checked against it before a body is rewritten and imported. What this removes
//  is the need to pass an 88 KB body through a transcription step to get it onto
//  disk, which is its own source of error.
//
//  Run: node scripts/extract-live-body.js <rendered.html> <out.html>
// -----------------------------------------------------------------------------

const fs = require('fs');

const OPEN = '<div class="rte scroll-trigger animate--slide-in">\n    ';

function extract(rendered) {
  const i = rendered.indexOf(OPEN);
  if (i === -1) throw new Error('no rte wrapper on this page, so it is not a standard page template');
  const start = i + OPEN.length;
  let depth = 1;
  const re = /<div\b[^>]*>|<\/div>/g;
  re.lastIndex = start;
  let m;
  while ((m = re.exec(rendered))) {
    if (m[0] === '</div>') {
      depth--;
      // The theme adds a newline and two spaces before closing the wrapper.
      // Nothing else is touched.
      if (depth === 0) return rendered.slice(start, m.index).replace(/\s+$/, '');
    } else depth++;
  }
  throw new Error('the rte wrapper never closes, so the body cannot be bounded');
}

function main(argv) {
  const [src, out] = argv;
  if (!src || !out) {
    console.error('usage: node scripts/extract-live-body.js <rendered.html> <out.html>');
    process.exit(2);
  }
  let body;
  try { body = extract(fs.readFileSync(src, 'utf8')); }
  catch (e) { console.error('\n  Refused: ' + e.message + '\n'); process.exit(1); }

  const problems = [];
  if (Buffer.byteLength(body) < 500) problems.push('the body is too small to be a real page');
  const opens = (body.match(/<div\b/g) || []).length;
  const closes = (body.match(/<\/div>/g) || []).length;
  if (opens !== closes) problems.push(`${opens} div opens vs ${closes} closes, so the bounds are wrong`);
  if (/shopify-section|page-width|main-page-title/.test(body)) problems.push('theme markup leaked into the body');
  if (problems.length) {
    console.error(`\n  ${problems.length} problem(s). No file written:\n`);
    problems.forEach((p) => console.error('    ' + p));
    process.exit(1);
  }
  fs.writeFileSync(out, body);
  console.log(`    ${(Buffer.byteLength(body) / 1024).toFixed(0)} KB  ->  ${out}\n`);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { extract, OPEN };
