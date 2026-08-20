'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  SNAPSHOT A LIVE PAGE BODY BEFORE AN IMPORT REPLACES IT.
//
//  ── WHY ─────────────────────────────────────────────────────────────────────
//  Shopify keeps no usable version history for a page body. A Matrixify import
//  that replaces one is not undoable, and Matrixify reports the replacement as a
//  success either way. shopify/page-snapshots/ is therefore the only rollback
//  path that exists, and scripts/intro-java-pages-csv.js refuses to write a
//  sheet containing a takeover row until the snapshot is on disk.
//
//  ── WHY IT READS A FILE RATHER THAN CALLING SHOPIFY ─────────────────────────
//  A snapshot that is almost right is worse than none: a rollback would restore
//  something subtly different and nobody would know. So the body is never
//  retyped, pasted or reconstructed. It is copied byte for byte out of a raw
//  Admin API response, which makes fidelity a property of the process rather
//  than of whoever ran it.
//
//  ── THERE IS NOW A SECOND WAY, AND IT IS CHEAPER ────────────────────────────
//  This header used to imply a rendered page could not be trusted as a source,
//  because a scrape was believed to drop the page's own <style> block and its
//  leading HTML comment. That is testable, and it is false for this theme:
//  page.content is dropped verbatim inside
//  <div class="rte scroll-trigger animate--slide-in"> and both survive.
//
//  scripts/extract-live-body.js recovers a body from a rendered page and proves
//  it on the hardest case available. csp-command-center was rebuilt from its
//  rendered HTML and compared against cc3.csv, which holds the byte-exact body
//  imported into it: 138,154 bytes, identical, once three characters of trailing
//  whitespace the theme adds are removed. That page opens with a managed HTML
//  comment, carries its own <style>, and holds a 103 KB minified JSON blob.
//
//  The Admin API is still the authority and still the check before an import.
//  What the extractor removes is the transcription step needed to get a large
//  body onto disk, which is its own source of error.
//
//  Getting the dump is one query. From the Shopify Admin API, or any MCP client
//  pointed at the store:
//
//    query { pages(first: 5, query: "handle:the-handle") {
//      nodes { id handle title updatedAt body } } }
//
//  Save the whole response, including the outer {"data": ...}, then:
//
//    node scripts/snapshot-live-page.js <pages.json> [handle ...]
//
//  With no handles it snapshots every page in the dump. Files are written to
//  shopify/page-snapshots/<handle>.before-intro-java.html
//
//  ── WHAT IT REFUSES ─────────────────────────────────────────────────────────
//  An empty body, a missing body field, or overwriting an existing snapshot
//  whose contents differ (that would discard the older, truer copy). Pass
//  --force only when you mean to replace a snapshot with a fresher read of a
//  page that has legitimately changed since.
//
//  Zero PII: page bodies are author content. No em-dashes, per repo convention.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'shopify', 'page-snapshots');
const SUFFIX = '.before-intro-java.html';

function readDump(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const p = j && j.data && j.data.pages;
  if (!p) throw new Error('not a pages query response: expected {"data":{"pages":...}}');
  return p.nodes || (p.edges || []).map((e) => e.node);
}

function main(argv) {
  const force = argv.includes('--force');
  const args = argv.filter((a) => a !== '--force');
  const file = args[0];
  if (!file) {
    console.error('usage: node scripts/snapshot-live-page.js <pages.json> [handle ...] [--force]');
    process.exit(2);
  }
  const want = new Set(args.slice(1));

  const nodes = readDump(file).filter((n) => n && n.handle && (!want.size || want.has(n.handle)));
  if (!nodes.length) {
    console.error(`no matching pages in ${file}`);
    process.exit(1);
  }

  const problems = [];
  const plan = [];
  for (const n of nodes) {
    if (typeof n.body !== 'string' || n.body.length < 200) {
      problems.push(`${n.handle}: the dump has no usable body. Was 'body' in the query?`);
      continue;
    }
    const out = path.join(DIR, n.handle + SUFFIX);
    if (fs.existsSync(out) && !force) {
      const existing = fs.readFileSync(out, 'utf8');
      if (existing === n.body) { plan.push({ n, out, skip: true }); continue; }
      problems.push(`${n.handle}: a DIFFERENT snapshot already exists at `
        + `${path.relative(ROOT, out)}. Keep the older one unless you mean to replace it; `
        + 'pass --force if you do.');
      continue;
    }
    plan.push({ n, out, skip: false });
  }

  if (problems.length) {
    console.error(`\n  ${problems.length} problem(s). Nothing written:\n`);
    for (const m of problems) console.error('    ' + m);
    console.error('');
    process.exit(1);
  }

  fs.mkdirSync(DIR, { recursive: true });
  console.log('');
  for (const { n, out, skip } of plan) {
    if (skip) {
      console.log(`    unchanged  ${n.handle}`);
      continue;
    }
    // Written byte for byte. No header, no trailing newline, no normalisation:
    // anything added here is something a rollback would publish.
    fs.writeFileSync(out, n.body);
    console.log(`    wrote      ${path.relative(ROOT, out)}`);
    console.log(`               ${(Buffer.byteLength(n.body) / 1024).toFixed(1)} KB`
      + `, live title ${JSON.stringify(n.title || '')}`
      + (n.updatedAt ? `, updatedAt ${n.updatedAt}` : ''));
  }
  console.log('\n  Commit these before running the import. They are the only way back.\n');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { SUFFIX, DIR };
