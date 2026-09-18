'use strict';
// ─────────────────────────────────────────────────────────────────────────────
//  BUILD config/site-architecture.json, or refuse a hand edit.
//
//      node scripts/site-architecture.js            rebuild from the live sitemap
//      node scripts/site-architecture.js --check    refuse drift, hand edits, and
//                                                   any NEW parentless page
//
//  Same contract as npm run cyber:topics: the file is GENERATED, checked in, and
//  --check refuses a hand edit. CLAUDE.md is blunt about why that matters, and
//  the reason is not tidiness: naming an authority that does not exist is worse
//  than naming none, because the check comes back clean.
//
//  ── IT LIVES IN config/ AND NOT data/ ──────────────────────────────────────
//  The Railway volume mounts at /app/data and a mount REPLACES the directory, so
//  a file tracked in git under data/ is invisible to the running container. The
//  cyber taxonomy shipped that way on 2026-09-03 and production answered ENOENT
//  while every repo-side check said the file was there. npm run smoke:volumepaths
//  refuses a tracked file under data/, and this stays beside ced-sources.json.
//
//  ── THE BASELINE ONLY SHRINKS ──────────────────────────────────────────────
//  241 live pages have no declared parent today. A check that goes red on all
//  241 on its first morning is a check somebody turns off by lunchtime, which is
//  the same failure lib/site-crawl.js records for a job that reprints the same
//  fourteen tasks every day. So the recorded list is a RATCHET: a new parentless
//  page fails the check, a fixed one is reported and must be removed from the
//  file. It can never grow silently.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const A = require('../lib/site-architecture');
const sf = require('../lib/storefront-fetch');

const OUT = path.join(__dirname, '..', 'config', 'site-architecture.json');

//  The live handle set, taken from the sitemap rather than inferred from a
//  pattern. docs/internal-linking.md is explicit: building URLs from handle
//  shapes invents pages that do not exist and misses ones that do.
function liveHandles() {
  const idx = sf.raw('/sitemap.xml').body;
  const maps = [...idx.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].replace(/&amp;/g, '&'))
    .filter((u) => /sitemap_pages/.test(u));
  if (!maps.length) throw new Error('no page sitemap found in /sitemap.xml');
  const out = [];
  for (const m of maps) {
    const r = sf.raw(m.replace(/^https?:\/\/[^/]+/, ''));
    if (r.code !== '200') throw new Error(`${m} answered ${r.code}`);
    for (const g of r.body.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      out.push(g[1].replace(/^.*\/pages\//, ''));
    }
  }
  if (out.length < 500) throw new Error(`only ${out.length} handles; the sitemap read is not plausible`);
  return out;
}

function build(handles) {
  const a = A.classify(handles);
  return {
    //  No generated_at. A timestamp makes every rebuild a diff, which trains
    //  everyone to ignore the diff, and the one question worth asking of this
    //  file is what CHANGED.
    source: 'lib/site-architecture.js over the live page sitemap',
    counts: a.counts,
    parentless: a.parentless,
    pages: a.pages,
  };
}

const stable = (o) => JSON.stringify(o, null, 2) + '\n';

function main() {
  const check = process.argv.includes('--check');
  const handles = liveHandles();
  console.log(`live page handles: ${handles.length}`);
  const built = build(handles);
  const c = built.counts;
  console.log(`  site furniture (no course prefix) : ${c.site}`);
  console.log(`  is its own family hub             : ${c.hubs}`);
  console.log(`  has a declared parent             : ${c.parented}`);
  console.log(`  PARENTLESS                        : ${c.parentless}`);

  if (!check) {
    fs.writeFileSync(OUT, stable(built));
    console.log(`\nwrote ${path.relative(path.join(__dirname, '..'), OUT)}`);
    return;
  }

  if (!fs.existsSync(OUT)) {
    console.error('\nconfig/site-architecture.json does not exist. Run without --check.');
    process.exit(1);
  }
  const onDisk = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const problems = [];

  //  A NEW parentless page is the regression this whole task exists to catch.
  const news = A.regressions(built.parentless, onDisk.parentless);
  for (const h of news) {
    problems.push(`${h}: NEW parentless page. Nothing owns it, so nothing is going to link it. `
      + 'Give it a home (add the spoke to its hub) or, if it genuinely has none, '
      + 'record it in config/site-architecture.json deliberately.');
  }
  //  A fixed page must leave the file, or the baseline stops being a ratchet
  //  and quietly becomes a permanent exemption list.
  const gone = A.fixed(built.parentless, onDisk.parentless);
  for (const h of gone) {
    problems.push(`${h}: has a parent now and is still recorded as parentless. `
      + 'Rebuild so the baseline shrinks.');
  }
  //  Hand edits. The file is generated; a hand edit is a second opinion that
  //  will silently disagree with the module the next time anybody rebuilds.
  if (stable(built) !== fs.readFileSync(OUT, 'utf8') && !news.length && !gone.length) {
    problems.push('config/site-architecture.json differs from a fresh build in a way '
      + 'the parentless lists do not explain, so it has been hand edited or the live '
      + 'site moved. Rebuild it rather than editing it.');
  }

  if (problems.length) {
    console.error(`\n${problems.length} PROBLEM(S):\n`);
    problems.slice(0, 20).forEach((p) => console.error('  ' + p));
    if (problems.length > 20) console.error(`  ... and ${problems.length - 20} more`);
    process.exit(1);
  }
  console.log('\nOK - no new parentless pages, and the file matches a fresh build.');
}

if (require.main === module) main();
module.exports = { build, liveHandles, stable, OUT };
